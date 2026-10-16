import { lastOpenedPart, rememberOpenedPart } from '../lib/classic-resume';

function refreshResume() {
  const partPage = document.querySelector<HTMLElement>('[data-classic-resume-part]');
  if (partPage) {
    const { classicId, part, partCount } = partPage.dataset;
    if (classicId && part && partCount) rememberOpenedPart(classicId, Number(part), Number(partCount));
  }

  const hint = document.querySelector<HTMLElement>('[data-classic-resume-hint]');
  if (hint) {
    const { classicId, partCount } = hint.dataset;
    const part = classicId && partCount ? lastOpenedPart(classicId, Number(partCount)) : null;
    const link = hint.querySelector<HTMLAnchorElement>('a');
    hint.hidden = part === null || !link;
    if (part !== null && classicId && link) {
      link.href = `/classics/${classicId}/${part}/`;
      link.textContent = `繼續讀第 ${part} 節`;
    }
  }
}

refreshResume();
window.addEventListener('pageshow', (event) => {
  if (event.persisted) refreshResume();
});
