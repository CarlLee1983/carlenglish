import { reduce } from '../lib/review-deck';
import { effectiveDailyNewLimit, isDailyNewLimit, nextDue, reviewCounts, todayQueue, type Grade, type ReviewState, type StoredCard } from '../lib/review-state';
import { loadReviewState, saveReviewState } from '../lib/review-storage';
import { unissuedFromLists } from '../lib/wordlist-data';
import { announceReviewChange, onReviewStateMayChange } from './review-change';
import { createWordListPanel } from './review-wordlists';
import { readWordListSummaries } from './wordlist-summaries';

const saveFailureMessage = '這次的紀錄沒有存進瀏覽器（可能是私密瀏覽或儲存空間已滿），離開本頁後會遺失。';
const loadFailureMessages = {
  unavailable: '無法讀取複習紀錄：這個瀏覽器不允許本站儲存資料（可能是私密瀏覽或設定封鎖）。',
  corrupt: '無法讀取複習紀錄：儲存的資料已損壞。為了避免覆蓋，本頁不會修改它。',
};

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
  const wordListPanel = createWordListPanel($('wordlists'));
  const summaries = readWordListSummaries();

  let state: ReviewState | null = null;
  let current: StoredCard | null = null;
  let flipped = false;
  let timer: number | undefined;

  function sourceLine(source: StoredCard['sources'][number]): HTMLElement {
    const item = document.createElement('li');
    if (source.kind === 'wordlist') {
      const attribution = wordListPanel.attribution(source.id);
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

  /** 通知導覽列徽章等其他監聽者重算；本頁自己的監聽器看到 'review-page' 會忽略，不從儲存重讀。 */
  function announceChange() {
    announceReviewChange('review-page');
  }

  function reportSaveResult(saved: ReturnType<typeof saveReviewState>) {
    if (!saved.ok) console.error('Failed to save review state', saved.error);
    warning.textContent = saved.ok ? '' : saveFailureMessage;
    warning.hidden = saved.ok;
  }

  /** 把已載入詞表的新卡發出來（見 ISSUE_NEW_CARDS）；有新卡才寫回儲存並通知導覽列。 */
  function issueFromLists(current: ReviewState): ReviewState {
    if (current.subscriptions.length === 0) return current;
    const next = reduce(current, { type: 'ISSUE_NEW_CARDS', wordLists: wordListPanel.loadedLists(), now: new Date() });
    if (next === current) return current;
    reportSaveResult(saveReviewState(next));
    announceChange();
    return next;
  }

  /** 重讀儲存、發出詞表新卡、重畫，並補載入缺少的詞表。 */
  function sync() {
    const latest = reload();
    if (latest) state = issueFromLists(latest);
    render();
    // 全部載入完再同步一次，這時不會再有待載入的。
    void wordListPanel.loadMissing(state).then((attempted) => { if (attempted) sync(); });
  }

  function render() {
    window.clearTimeout(timer);
    settings.hidden = !state;
    wordListPanel.render(state);
    if (state && document.activeElement !== limitInput) limitInput.value = String(effectiveDailyNewLimit(state));
    if (!state) {
      summary.textContent = '';
      for (const element of [empty, done, card]) element.hidden = true;
      return;
    }
    const now = new Date();
    // 即使沒有稍後到期的卡片，跨日也要重新發卡並更新每日額度。
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    timer = window.setTimeout(() => {
      // 保留儲存失敗後仍有效的記憶體狀態；跨分頁更新另由 change 事件同步。
      if (state) state = issueFromLists(state);
      render();
      announceChange();
    }, tomorrow.getTime() - now.getTime() + 50);
    const counts = reviewCounts(state, now, unissuedFromLists(state.subscriptions, summaries));
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
      window.clearTimeout(timer);
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
    announceChange();
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
    state = issueFromLists(reduce(latest, { type: 'SET_DAILY_NEW_LIMIT', limit }));
    reportSaveResult(saveReviewState(state));
    render();
    announceChange();
  }

  function toggleSubscription(id: string) {
    const latest = reload();
    if (!latest) return render();
    const subscribed = latest.subscriptions.some((subscription) => subscription.wordListId === id);
    state = reduce(latest, subscribed ? { type: 'UNSUBSCRIBE', wordListId: id } : { type: 'SUBSCRIBE', wordListId: id, now: new Date() });
    reportSaveResult(saveReviewState(state));
    announceChange();
    // 重新訂閱時給載入失敗過的詞表再一次機會。
    wordListPanel.retry(id);
    sync();
  }

  flipButton.addEventListener('click', flip);
  limitInput.addEventListener('change', changeLimit);
  wordListPanel.onToggle(toggleSubscription);
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
    const onControl = !!target?.closest('a, button, input, select, textarea, summary') || !!target?.isContentEditable;
    if (onControl) return;
    if ((event.key === ' ' || event.key === 'Enter') && !flipped) {
      event.preventDefault();
      flip();
    } else if (event.key === '1' && flipped) {
      grade('again');
    } else if (event.key === '2' && flipped) {
      grade('good');
    }
  });
  // 分頁回到前景時，過了到期時間的字卡要馬上出現。
  // 儲存失敗時，剛評的記憶體狀態比儲存裡的舊資料新；重讀會把它蓋掉，所以忽略自己的事件。
  const refresh = () => { wordListPanel.retry(); sync(); };
  onReviewStateMayChange(refresh, 'review-page');
  refresh();
}

document.querySelectorAll<HTMLElement>('[data-review-root]').forEach(initializeReview);
