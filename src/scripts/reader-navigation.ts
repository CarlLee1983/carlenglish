// Carry catalog filters through reading and related scenes without browser storage.
const params = new URL(window.location.href).searchParams;
for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-catalog-context]')) {
  const url = new URL(link.href);
  for (const key of ['q', 'category']) {
    const value = params.get(key)?.trim();
    if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
  }
  link.href = `${url.pathname}${url.search}`;
}
