import { reduce } from '../lib/review-deck';
import { effectiveDailyNewLimit, isDailyNewLimit, nextDue, reviewChangedEvent, reviewCounts, todayQueue, type Grade, type ReviewChangeSource, type ReviewState, type StoredCard } from '../lib/review-state';
import { loadReviewState, saveReviewState } from '../lib/review-storage';
import { parseWordListData, type WordListData } from '../lib/wordlist-data';

const saveFailureMessage = '這次的紀錄沒有存進瀏覽器（可能是私密瀏覽或儲存空間已滿），離開本頁後會遺失。';
const loadFailureMessages = {
  unavailable: '無法讀取複習紀錄：這個瀏覽器不允許本站儲存資料（可能是私密瀏覽或設定封鎖）。',
  corrupt: '無法讀取複習紀錄：儲存的資料已損壞。為了避免覆蓋，本頁不會修改它。',
};

const wordListFailureMessage = (names: string[]) => `無法載入詞表「${names.join('」「')}」，暫時不會發出這${names.length > 1 ? '些' : '份'}詞表的新字卡。請確認網路連線後重新整理本頁。`;

function describeWait(target: Date, now: Date): string {
  const minutes = Math.max(1, Math.round((target.getTime() - now.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} 分鐘後`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小時後`;
  return `${Math.round(hours / 24)} 天後`;
}

function initializeReview(root: HTMLElement) {
  const $ = <T extends HTMLElement>(name: string) => root.querySelector<T>(`[data-review-${name}]`)!;
  const summary = $('summary');
  const errorBox = $('error');
  const warning = $('warning');
  const empty = $('empty');
  const done = $('done');
  const doneTitle = $('done-title');
  const doneDetail = $('done-detail');
  const laterNote = $('later');
  const card = $('card');
  const front = $('front');
  const flipButton = $<HTMLButtonElement>('flip');
  const back = $('back');
  const meaning = $('meaning');
  const example = $('example');
  const audioButton = $<HTMLButtonElement>('audio');
  const audioError = $('audio-error');
  const sources = $('sources');
  const result = $('result');
  const settings = $('settings');
  const limitInput = $<HTMLInputElement>('limit');
  const wordListSection = $('wordlists');
  const wordListError = $('wordlist-error');
  const wordListItems = [...wordListSection.querySelectorAll<HTMLElement>('[data-wordlist]')];
  const wordListItem = (id: string) => wordListItems.find((item) => item.dataset.wordlistId === id);

  let state: ReviewState | null = null;
  let current: StoredCard | null = null;
  let flipped = false;
  let timer: number | undefined;
  /** 已載入的詞表內容；只有訂閱了的詞表才會被載入。 */
  const wordLists = new Map<string, WordListData>();
  const loadingLists = new Set<string>();
  const failedLists = new Set<string>();

  function sourceLine(source: StoredCard['sources'][number]): HTMLElement {
    const item = document.createElement('li');
    if (source.kind === 'wordlist') {
      const attribution = wordListItem(source.id)?.dataset.wordlistAttribution;
      item.textContent = attribution ? `詞表：${source.title}，出處：${attribution}` : `詞表：${source.title}`;
      return item;
    }
    const link = document.createElement('a');
    link.href = source.href;
    link.textContent = `回到來源：${source.title}`;
    item.append(link);
    return item;
  }

  function showCard(next: StoredCard) {
    if (current?.key !== next.key) {
      current = next;
      flipped = false;
    }
    front.textContent = next.content.english;
    meaning.textContent = next.content.meaning;
    example.textContent = next.content.example ?? '';
    example.hidden = !next.content.example;
    audioButton.hidden = !next.content.audioSrc;
    audioError.hidden = true;
    sources.replaceChildren(...next.sources.map(sourceLine));
    flipButton.hidden = flipped;
    back.hidden = !flipped;
  }

  /** 從儲存重讀最新狀態；其他分頁可能已經加入或取消字卡。失敗時顯示說明並停用複習。 */
  function reload(): ReviewState | null {
    const loaded = loadReviewState();
    if (loaded.ok) {
      state = loaded.state;
      errorBox.hidden = true;
      return state;
    }
    console.error('Failed to load review state', loaded.reason, loaded.error);
    state = null;
    errorBox.textContent = loadFailureMessages[loaded.reason];
    errorBox.hidden = false;
    return null;
  }

  function reportSaveResult(saved: ReturnType<typeof saveReviewState>) {
    if (!saved.ok) console.error('Failed to save review state', saved.error);
    warning.textContent = saved.ok ? '' : saveFailureMessage;
    warning.hidden = saved.ok;
  }

  /** 把已載入詞表的新卡發出來（見 ISSUE_NEW_CARDS）；有新卡才寫回儲存並通知導覽列。 */
  function issueFromLists(current: ReviewState): ReviewState {
    if (current.subscriptions.length === 0) return current;
    const next = reduce(current, { type: 'ISSUE_NEW_CARDS', wordLists: [...wordLists.values()], now: new Date() });
    if (next === current) return current;
    reportSaveResult(saveReviewState(next));
    document.dispatchEvent(new CustomEvent<ReviewChangeSource>(reviewChangedEvent, { detail: 'review-page' }));
    return next;
  }

  async function fetchWordList(id: string) {
    loadingLists.add(id);
    try {
      const response = await fetch(wordListItem(id)!.dataset.wordlistUrl!);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = parseWordListData(await response.json(), id);
      if (!data) throw new Error('The word list data has an unexpected shape.');
      wordLists.set(id, data);
    } catch (error) {
      console.error(`Failed to load word list "${id}"`, error);
      failedLists.add(id);
    } finally {
      loadingLists.delete(id);
    }
  }

  /** 只載入有訂閱、還沒載入、也還沒失敗過的詞表；全部處理完再同步一次，這時不會再有待載入的。 */
  async function loadMissingLists() {
    if (!state) return;
    const missing = state.subscriptions.map((subscription) => subscription.wordListId)
      .filter((id) => wordListItem(id) && !wordLists.has(id) && !loadingLists.has(id) && !failedLists.has(id));
    if (missing.length === 0) return;
    await Promise.all(missing.map(fetchWordList));
    sync();
  }

  /** 重讀儲存、發出詞表新卡、重畫，並補載入缺少的詞表。 */
  function sync() {
    const latest = reload();
    if (latest) state = issueFromLists(latest);
    render();
    void loadMissingLists();
  }

  /** 這份訂閱還沒處理到的詞數；詞頻序號可能因排除清單而跳號，所以數頁面上的靜態排名，不必先載入詞表。 */
  function unissuedIn(subscription: ReviewState['subscriptions'][number]): number {
    const ranks = wordListItem(subscription.wordListId)?.dataset.wordlistRanks ?? '';
    return ranks.split(',').filter((rank) => rank !== '' && Number(rank) > subscription.issuedThrough).length;
  }

  const unissuedFromLists = (current: ReviewState): number => current.subscriptions.reduce((total, subscription) => total + unissuedIn(subscription), 0);

  function renderWordLists() {
    wordListSection.hidden = !state;
    if (!state) return;
    for (const item of wordListItems) {
      const subscription = state.subscriptions.find((candidate) => candidate.wordListId === item.dataset.wordlistId);
      const name = item.dataset.wordlistName ?? '';
      const toggle = item.querySelector<HTMLButtonElement>('[data-wordlist-toggle]')!;
      toggle.textContent = subscription ? '取消訂閱' : '訂閱';
      toggle.setAttribute('aria-label', `${subscription ? '取消訂閱' : '訂閱'} ${name}`);
      const progress = item.querySelector<HTMLElement>('[data-wordlist-progress]')!;
      const remaining = subscription ? unissuedIn(subscription) : 0;
      progress.hidden = !subscription;
      progress.textContent = subscription ? `已發出 ${subscription.issuedCount} 張，剩餘 ${remaining} 張` : '';
    }
    const failed = state.subscriptions.filter((subscription) => failedLists.has(subscription.wordListId))
      .map((subscription) => wordListItem(subscription.wordListId)?.dataset.wordlistName ?? subscription.wordListId);
    wordListError.hidden = failed.length === 0;
    wordListError.textContent = failed.length === 0 ? '' : wordListFailureMessage(failed);
  }

  function render() {
    window.clearTimeout(timer);
    settings.hidden = !state;
    renderWordLists();
    if (state && document.activeElement !== limitInput) limitInput.value = String(effectiveDailyNewLimit(state));
    if (!state) {
      summary.textContent = '';
      for (const element of [empty, done, card]) element.hidden = true;
      return;
    }
    const now = new Date();
    const counts = reviewCounts(state, now, unissuedFromLists(state));
    summary.textContent = state.cards.length === 0 ? '' : `今天到期 ${counts.due} 張，其中新卡 ${counts.newCards} 張`;
    empty.hidden = state.cards.length > 0;
    const queue = todayQueue(state, now);
    const next = queue[0];
    card.hidden = !next;
    done.hidden = !!next || state.cards.length === 0;
    if (next) {
      showCard(next);
      return;
    }
    current = null;
    if (state.cards.length === 0) return;
    doneTitle.textContent = counts.laterToday > 0 ? '現在沒有到期的字卡' : '今天的複習完成了';
    doneDetail.textContent = `明天預計有 ${counts.tomorrow} 張到期。`;
    laterNote.hidden = counts.laterToday === 0 || !counts.nextLaterToday;
    if (counts.nextLaterToday) {
      laterNote.textContent = `稍後還有 ${counts.laterToday} 張，約 ${describeWait(counts.nextLaterToday, now)}到期，到期後會自動出現在這裡。`;
      timer = window.setTimeout(render, Math.max(0, counts.nextLaterToday.getTime() - now.getTime()) + 50);
    }
  }

  function flip() {
    if (!current || flipped) return;
    flipped = true;
    flipButton.hidden = true;
    back.hidden = false;
    back.focus({ preventScroll: true });
  }

  function grade(kind: Grade) {
    if (!current || !flipped) return;
    const now = new Date();
    const latest = reload();
    if (!latest) return render();
    state = reduce(issueFromLists(latest), { type: 'GRADE', cardKey: current.key, grade: kind, now });
    const due = nextDue(state, current.key);
    result.textContent = due ? `下次：${describeWait(due, now)}` : '';
    reportSaveResult(saveReviewState(state));
    current = null;
    render();
    // 通知導覽列徽章重算；本頁自己發出的事件由下方監聽器忽略，不從儲存重讀。
    document.dispatchEvent(new CustomEvent<ReviewChangeSource>(reviewChangedEvent, { detail: 'review-page' }));
    if (!card.hidden) flipButton.focus({ preventScroll: true });
  }

  function changeLimit() {
    const limit = limitInput.value.trim() === '' ? NaN : Number(limitInput.value);
    const latest = reload();
    if (!latest) return render();
    if (!isDailyNewLimit(limit) || limit === null) {
      // 不合法的輸入（空白、小數、超出 1–50）不寫入，輸入框退回目前的設定。
      limitInput.value = String(effectiveDailyNewLimit(latest));
      return;
    }
    state = reduce(latest, { type: 'SET_DAILY_NEW_LIMIT', limit });
    reportSaveResult(saveReviewState(state));
    render();
    document.dispatchEvent(new CustomEvent<ReviewChangeSource>(reviewChangedEvent, { detail: 'review-page' }));
  }

  function toggleSubscription(id: string) {
    const latest = reload();
    if (!latest) return render();
    const subscribed = latest.subscriptions.some((subscription) => subscription.wordListId === id);
    state = reduce(latest, subscribed ? { type: 'UNSUBSCRIBE', wordListId: id } : { type: 'SUBSCRIBE', wordListId: id, now: new Date() });
    reportSaveResult(saveReviewState(state));
    document.dispatchEvent(new CustomEvent<ReviewChangeSource>(reviewChangedEvent, { detail: 'review-page' }));
    // 重新訂閱時給載入失敗過的詞表再一次機會。
    failedLists.delete(id);
    sync();
  }

  flipButton.addEventListener('click', flip);
  limitInput.addEventListener('change', changeLimit);
  for (const item of wordListItems) {
    item.querySelector<HTMLButtonElement>('[data-wordlist-toggle]')!.addEventListener('click', () => toggleSubscription(item.dataset.wordlistId!));
  }
  for (const kind of ['again', 'good'] as const) {
    root.querySelector<HTMLButtonElement>(`[data-review-grade="${kind}"]`)!.addEventListener('click', () => grade(kind));
  }
  audioButton.addEventListener('click', () => {
    const src = current?.content.audioSrc;
    if (!src) return;
    if (typeof window.Audio !== 'function') {
      audioError.hidden = false;
      return;
    }
    const player = new Audio(src);
    player.play().catch(() => { audioError.hidden = false; });
  });
  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing || card.hidden) return;
    const target = event.target as HTMLElement | null;
    const onControl = !!target?.closest('a, button, input, select, textarea, summary');
    if ((event.key === ' ' || event.key === 'Enter') && !onControl && !flipped) {
      event.preventDefault();
      flip();
    } else if (event.key === '1' && flipped) {
      grade('again');
    } else if (event.key === '2' && flipped) {
      grade('good');
    }
  });
  // 分頁回到前景時，過了到期時間的字卡要馬上出現。
  const refresh = () => { failedLists.clear(); sync(); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('storage', refresh);
  document.addEventListener(reviewChangedEvent, (event) => {
    // 儲存失敗時，剛評的記憶體狀態比儲存裡的舊資料新；重讀會把它蓋掉。
    if ((event as CustomEvent<ReviewChangeSource>).detail !== 'review-page') refresh();
  });
  refresh();
}

document.querySelectorAll<HTMLElement>('[data-review-root]').forEach(initializeReview);
