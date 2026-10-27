import { createVocabularyPractice } from './vocabulary-practice';

const root = document.querySelector<HTMLElement>('[data-vocabulary]');
const form = root?.querySelector<HTMLFormElement>('[data-vocabulary-form]');

function initializeVocabulary(root: HTMLElement, form: HTMLFormElement) {
  const search = form.querySelector<HTMLInputElement>('input[name="q"]')!;
  const clear = form.querySelector<HTMLButtonElement>('[data-vocabulary-clear]')!;
  const rows = [...root.querySelectorAll<HTMLTableRowElement>('[data-vocabulary-row]')];
  const start = root.querySelector<HTMLButtonElement>('[data-vocabulary-start]')!;
  const print = root.querySelector<HTMLButtonElement>('[data-vocabulary-print]')!;
  const dialog = root.querySelector<HTMLDialogElement>('[data-vocabulary-practice]')!;
  const attribution = root.querySelector<HTMLElement>('.vocabulary-attribution')!;
  const normalize = (text: string) => text.normalize('NFKC').toLocaleLowerCase().trim();
  let visible = rows;
  let cards = false;
  let entryTarget: HTMLButtonElement | null = null;
  const practice = createVocabularyPractice(dialog, attribution, {
    back() {
      if (practice.infoOpen) {
        if (history.state?.vocabularyInfo) history.back();
        else { const url = new URL(location.href); url.hash = ''; history.replaceState(null, '', url); practice.showInfo(false, true); }
      } else { setView(false); writeUrl(true); }
    },
    info() {
      const url = new URL(location.href);
      url.hash = practice.sourceHash;
      if (url.href !== location.href) history.pushState({ vocabularyInfo: true }, '', url);
      practice.showInfo(true, true);
    },
    closed() { if (cards) { setView(false); writeUrl(true); } },
  });

  function writeUrl(push: boolean) {
    const url = new URL(location.href);
    if (search.value.trim()) url.searchParams.set('q', search.value.trim()); else url.searchParams.delete('q');
    if (cards) url.searchParams.set('view', 'cards'); else url.searchParams.delete('view');
    url.hash = '';
    if (url.href !== location.href) history[push ? 'pushState' : 'replaceState'](null, '', url);
  }

  function setView(value: boolean, focus = true, index = 0, animate = true) {
    cards = value && visible.length > 0;
    root.dataset.view = cards ? 'cards' : 'list';
    if (cards) practice.open(visible, index, focus, animate);
    else {
      practice.close();
      if (focus) {
        const target = entryTarget && !entryTarget.closest<HTMLTableRowElement>('tr')?.hidden ? entryTarget : start.disabled ? search : start;
        target.focus({ preventScroll: true });
      }
    }
  }

  function filter() {
    practice.stopAudio();
    const terms = normalize(search.value).split(/\s+/).filter(Boolean);
    for (const row of rows) row.hidden = !terms.every((term) => normalize(row.dataset.search!).includes(term));
    visible = rows.filter((row) => !row.hidden);
    start.disabled = print.disabled = visible.length === 0;
    clear.hidden = !search.value;
    root.querySelector<HTMLElement>('[data-vocabulary-empty]')!.hidden = visible.length > 0;
    root.querySelector<HTMLElement>('[data-vocabulary-count]')!.textContent = terms.length
      ? `找到 ${visible.length} 筆詞彙，共 ${rows.length} 筆 · 搜尋：${search.value.trim()}`
      : `共 ${rows.length} 筆詞彙 · 依英文字母排序`;
  }

  function restore(force = false) {
    const params = new URL(location.href).searchParams;
    const query = params.get('q') ?? '';
    const changedQuery = query.trim() !== search.value.trim();
    if (force || changedQuery) { search.value = query; filter(); }
    const targetCards = params.get('view') === 'cards' && visible.length > 0;
    if (force || changedQuery || targetCards !== cards) setView(targetCards, false);
    if (cards) {
      const target = /^#source-[a-z0-9-]+$/.test(location.hash) ? document.getElementById(location.hash.slice(1)) : null;
      const showInfo = !!target && attribution.contains(target);
      if (showInfo !== practice.infoOpen) practice.showInfo(showInfo, true);
    }
  }

  search.addEventListener('input', () => { filter(); writeUrl(false); });
  form.addEventListener('submit', (event) => { event.preventDefault(); filter(); writeUrl(false); });
  clear.addEventListener('click', () => { search.value = ''; filter(); writeUrl(false); search.focus(); });
  start.addEventListener('click', (event) => { entryTarget = start; setView(true, true, 0, event.detail > 0); writeUrl(true); });
  for (const row of rows) {
    const button = row.querySelector<HTMLButtonElement>('[data-vocabulary-row-start]')!;
    button.hidden = false;
    button.setAttribute('aria-label', `練習字卡：${row.dataset.english}（${row.dataset.meaning}）`);
    button.addEventListener('click', (event) => { entryTarget = button; setView(true, true, visible.indexOf(row), event.detail > 0); writeUrl(true); });
  }
  print.addEventListener('click', () => { practice.stopAudio(); window.print(); });
  window.addEventListener('popstate', () => restore());
  window.addEventListener('pageshow', (event) => { if (event.persisted) restore(); });
  restore(true);
  root.querySelector<HTMLElement>('[data-vocabulary-tools]')!.hidden = false;
}

if (root && form) initializeVocabulary(root, form);
