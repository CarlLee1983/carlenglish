const catalog = document.querySelector<HTMLElement>('[data-catalog]');
const form = catalog?.querySelector<HTMLFormElement>('[data-catalog-form]');

if (catalog && form) {
  const search = form.querySelector<HTMLInputElement>('input[name="q"]')!;
  const category = form.querySelector<HTMLSelectElement>('select[name="category"]')!;
  const clear = form.querySelector<HTMLButtonElement>('[data-clear-filters]')!;
  const cards = [...catalog.querySelectorAll<HTMLElement>('[data-scene-card]')];
  const count = catalog.querySelector<HTMLElement>('[data-result-count]')!;
  const empty = catalog.querySelector<HTMLElement>('[data-no-results]')!;
  const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().trim();

  function filter() {
    const terms = normalize(search.value).split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const card of cards) {
      const matches = (!category.value || card.dataset.category === category.value)
        && terms.every((term) => normalize(card.dataset.search ?? '').includes(term));
      card.hidden = !matches;
      if (matches) visible++;
      const link = card.querySelector<HTMLAnchorElement>('a')!;
      const url = new URL(link.href);
      if (search.value.trim()) url.searchParams.set('q', search.value.trim()); else url.searchParams.delete('q');
      if (category.value) url.searchParams.set('category', category.value); else url.searchParams.delete('category');
      link.href = `${url.pathname}${url.search}`;
    }
    count.textContent = terms.length || category.value ? `找到 ${visible} 篇讀本，共 ${cards.length} 篇` : `共 ${cards.length} 篇讀本`;
    empty.hidden = visible !== 0;
    clear.hidden = !search.value && !category.value;
  }

  function restore() {
    const params = new URL(window.location.href).searchParams;
    search.value = params.get('q') ?? '';
    const selected = params.get('category') ?? '';
    category.value = [...category.options].some((option) => option.value === selected) ? selected : '';
    filter();
  }

  function update(mode: 'replace' | 'push') {
    const url = new URL(window.location.href);
    const query = search.value.trim();
    if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
    if (category.value) url.searchParams.set('category', category.value); else url.searchParams.delete('category');
    if (url.href !== window.location.href) {
      if (mode === 'push') window.history.pushState(null, '', url);
      else window.history.replaceState(null, '', url);
    }
    filter();
  }

  search.addEventListener('input', () => update('replace'));
  category.addEventListener('change', () => update('push'));
  form.addEventListener('submit', (event) => { event.preventDefault(); update('replace'); });
  clear.addEventListener('click', () => {
    search.value = '';
    category.value = '';
    update('push');
    search.focus();
  });
  window.addEventListener('popstate', restore);
  window.addEventListener('pageshow', restore);
  restore();
  form.hidden = false;
}
