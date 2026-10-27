import type { VocabularyDeckScene } from './vocabulary-deck-scene';

interface PracticeActions { back: () => void; info: () => void; closed: () => void }
interface Slide {
  node: HTMLElement; face: HTMLButtonElement; answer: HTMLElement;
  word: HTMLElement; meaning: HTMLElement; example: HTMLElement; label: HTMLElement; hint: HTMLElement;
  front: HTMLElement; back: HTMLElement; backWord: HTMLElement; backHint: HTMLElement;
}

/** Native scrolling owns gesture physics; this controller only reconciles the selected word and its controls. */
export function createVocabularyPractice(dialog: HTMLDialogElement, attribution: HTMLElement, actions: PracticeActions) {
  const track = dialog.querySelector<HTMLElement>('[data-vocabulary-track]')!;
  const template = dialog.querySelector<HTMLTemplateElement>('[data-vocabulary-card-template]')!;
  const main = dialog.querySelector<HTMLElement>('[data-vocabulary-practice-main]')!;
  const footer = dialog.querySelector<HTMLElement>('[data-vocabulary-practice-footer]')!;
  const panel = dialog.querySelector<HTMLElement>('[data-vocabulary-info-panel]')!;
  const host = dialog.querySelector<HTMLElement>('[data-vocabulary-attribution-host]')!;
  const previous = dialog.querySelector<HTMLButtonElement>('[data-vocabulary-previous]')!;
  const next = dialog.querySelector<HTMLButtonElement>('[data-vocabulary-next]')!;
  const play = dialog.querySelector<HTMLButtonElement>('[data-vocabulary-play]')!;
  const playLabel = dialog.querySelector<HTMLElement>('[data-vocabulary-play-label]')!;
  const audioStatus = dialog.querySelector<HTMLElement>('[data-vocabulary-audio-status]')!;
  const source = dialog.querySelector<HTMLAnchorElement>('[data-vocabulary-source]')!;
  const position = dialog.querySelector<HTMLElement>('[data-vocabulary-position]')!;
  const progress = dialog.querySelector<HTMLProgressElement>('[data-vocabulary-progress]')!;
  const end = dialog.querySelector<HTMLElement>('[data-vocabulary-end]')!;
  const info = dialog.querySelector<HTMLButtonElement>('[data-vocabulary-info]')!;
  const back = dialog.querySelector<HTMLButtonElement>('[data-vocabulary-return]')!;
  const backLabel = dialog.querySelector<HTMLElement>('[data-vocabulary-return-label]')!;
  const placeholder = document.createComment('vocabulary attribution');
  attribution.before(placeholder);
  const announcement = document.createElement('p');
  announcement.className = 'vocabulary-sr-only';
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  dialog.append(announcement);
  position.setAttribute('aria-live', 'off');
  let audio = dialog.querySelector<HTMLAudioElement>('[data-vocabulary-audio]')!;
  let rows: HTMLTableRowElement[] = [];
  let slides: Slide[] = [];
  let index = -1;
  let requestedIndex: number | null = null;
  let deck: VocabularyDeckScene | null = null;
  let deckAttempt = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let revealed = false;
  let infoOpen = false;
  let frame = 0;
  let alignmentFrame = 0;
  let announceTimer = 0;
  let audioTimer = 0;
  let audioAttempt = 0;
  let audioFailed = false;
  let audioPhase: 'idle' | 'loading' | 'playing' = 'idle';
  let suppressClick = false;
  let pointer: { x: number; y: number } | null = null;
  let width = 0;
  let printing = false;
  let active = false;
  let backgroundPosition = { x: 0, y: 0 };

  function disposeDeck() {
    deckAttempt++;
    deck?.dispose();
    deck = null;
  }

  async function showDeck(enter = false) {
    if (!active || !dialog.open || infoOpen || printing || document.hidden || reducedMotion.matches) return;
    if (deck) { deck.resume(); return; }
    const attempt = ++deckAttempt;
    try {
      const { createVocabularyDeckScene } = await import('./vocabulary-deck-scene');
      if (attempt !== deckAttempt || !active || !dialog.open || infoOpen || printing || document.hidden || reducedMotion.matches) return;
      deck = createVocabularyDeckScene(main, track, enter, disposeDeck);
    } catch { /* Native cards remain usable when WebGL or its lazy chunk is unavailable. */ }
  }

  function audioState(phase: typeof audioPhase, text = '') {
    audioPhase = phase;
    play.dataset.state = phase;
    playLabel.textContent = phase === 'idle' ? '聽發音' : phase === 'loading' ? '取消載入' : '停止發音';
    play.setAttribute('aria-label', phase === 'idle' ? '聽單字發音' : playLabel.textContent);
    audioStatus.textContent = text;
  }

  function stopAudio() {
    audioAttempt++;
    window.clearTimeout(audioTimer);
    audio.pause();
    audio.currentTime = 0;
    if (audioPhase !== 'idle' || audioStatus.textContent) audioState('idle');
  }

  function setAudio(row: HTMLTableRowElement) {
    stopAudio();
    // A fresh element isolates queued media events and play promises from the previous card.
    const clip = document.createElement('audio');
    clip.hidden = true;
    clip.preload = 'none';
    clip.dataset.vocabularyAudio = '';
    clip.src = row.dataset.audioSrc!;
    clip.setAttribute('aria-label', `聽 ${row.dataset.english} 的發音`);
    audio.replaceWith(clip);
    audio = clip;
    audioFailed = false;
    clip.addEventListener('playing', () => { if (audio === clip && audioPhase !== 'idle') { window.clearTimeout(audioTimer); audioState('playing', `正在播放 ${row.dataset.english}`); } });
    clip.addEventListener('ended', () => { if (audio === clip && audioPhase !== 'idle') { window.clearTimeout(audioTimer); audioState('idle', `已播放 ${row.dataset.english}`); } });
    clip.addEventListener('error', () => { if (audio === clip && audioPhase !== 'idle') { stopAudio(); audioFailed = true; audioState('idle', '無法播放發音，請點聽發音重試。'); } });
  }

  function mark(slide: Slide, active: boolean) {
    slide.node.inert = !active;
    slide.node.setAttribute('aria-hidden', String(!active));
    for (const [element, marker] of [[slide.face, 'vocabularyFlip'], [slide.answer, 'vocabularyAnswer'],
      [slide.word, 'vocabularyWord'], [slide.meaning, 'vocabularyMeaning'], [slide.example, 'vocabularyExample']] as const) {
      if (active) element.dataset[marker] = ''; else delete element.dataset[marker];
    }
  }

  function revealSlide(slide: Slide, show: boolean, animate = false) {
    slide.face.dataset.motion = animate && !reducedMotion.matches ? 'animate' : 'instant';
    slide.face.dataset.revealed = String(show);
    deck?.flip(slide.face, show, animate && !reducedMotion.matches);
    slide.front.setAttribute('aria-hidden', String(show));
    slide.back.setAttribute('aria-hidden', String(!show));
    slide.face.setAttribute('aria-expanded', String(show));
    slide.face.setAttribute('aria-labelledby', show ? `${slide.backWord.id} ${slide.backHint.id}` : `${slide.word.id} ${slide.hint.id}`);
    if (show) slide.face.setAttribute('aria-describedby', slide.answer.id); else slide.face.removeAttribute('aria-describedby');
    slide.front.scrollTop = slide.back.scrollTop = 0;
  }

  function showAnswer(show: boolean, animate = false) {
    const slide = slides[index];
    if (!slide) return;
    revealed = show;
    revealSlide(slide, show, animate);
  }

  function announce() {
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(() => {
      if (requestedIndex !== null && Math.abs(track.scrollLeft - requestedIndex * track.clientWidth) < .5) requestedIndex = null;
      if (dialog.open && !infoOpen) announcement.textContent = `第 ${index + 1} 張，共 ${rows.length} 張。${rows[index].dataset.english}`;
    }, 120);
  }

  function select(target: number, reset = false) {
    if (!slides.length || (index === target && !reset)) return;
    const old = slides[index];
    const moveFocus = !!old?.node.contains(document.activeElement);
    if (old) mark(old, false);
    index = Math.max(0, Math.min(rows.length - 1, target));
    mark(slides[index], true);
    showAnswer(false);
    setAudio(rows[index]);
    position.textContent = `${index + 1} / ${rows.length}`;
    progress.max = rows.length;
    progress.value = index + 1;
    const original = rows[index].querySelector<HTMLAnchorElement>('[data-vocabulary-primary-source]')!;
    source.textContent = original.textContent;
    source.setAttribute('href', original.getAttribute('href')!);
    previous.disabled = index === 0;
    next.disabled = index === rows.length - 1;
    end.hidden = !next.disabled;
    if (moveFocus || (requestedIndex === index && (previous.disabled || next.disabled))) slides[index].face.focus({ preventScroll: true });
    announce();
  }

  function cancelAlignment() {
    cancelAnimationFrame(alignmentFrame);
    alignmentFrame = 0;
  }

  function align() {
    cancelAlignment();
    const interrupted = requestedIndex !== null;
    requestedIndex = null;
    if (!dialog.open || !slides.length || !track.clientWidth) return;
    width = track.clientWidth;
    const destination = index;
    track.scrollTo({ left: destination * width, behavior: 'instant' });
    if (interrupted) {
      // Chromium can apply one queued compositor delta after cancelling a smooth scroll.
      // Reconcile at the next rendering boundary; fresh input cancels this correction.
      alignmentFrame = requestAnimationFrame(() => {
        alignmentFrame = 0;
        if (dialog.open && index === destination) track.scrollTo({ left: destination * track.clientWidth, behavior: 'instant' });
      });
    }
  }

  function move(offset: number, animate = false) {
    if (infoOpen) return;
    cancelAlignment();
    const base = requestedIndex ?? index;
    const target = Math.max(0, Math.min(rows.length - 1, base + offset));
    if (target === index && requestedIndex === null) return;
    stopAudio();
    if (animate && !reducedMotion.matches) {
      if (target !== index) revealSlide(slides[target], false);
      // Repeated presses retarget the pending destination; they do not queue page transitions.
      requestedIndex = target;
      track.scrollTo({ left: target * track.clientWidth, behavior: 'smooth' });
      return;
    }
    select(target);
    align();
    if (previous.disabled || next.disabled) slides[index].face.focus({ preventScroll: true });
  }

  function build(nextRows: HTMLTableRowElement[]) {
    rows = nextRows;
    index = -1;
    slides = rows.map((row, number) => {
      const node = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
      const find = <T extends HTMLElement = HTMLElement>(name: string) => node.querySelector<T>(`[data-card-${name}]`)!;
      const slide: Slide = { node, face: find<HTMLButtonElement>('face'), answer: find('answer'), word: find('word'),
        meaning: find('meaning'), example: find('example'), label: find('label'), hint: find('hint'),
        front: find('front'), back: find('back'), backWord: find('back-word'), backHint: find('back-hint') };
      slide.word.textContent = row.dataset.english!;
      slide.meaning.textContent = row.dataset.meaning!;
      slide.example.textContent = row.dataset.example!;
      slide.backWord.textContent = row.dataset.english!;
      slide.answer.hidden = false;
      slide.word.id = `vocabulary-word-${number}`;
      slide.hint.id = `vocabulary-hint-${number}`;
      slide.answer.id = `vocabulary-answer-${number}`;
      slide.backWord.id = `vocabulary-back-word-${number}`;
      slide.backHint.id = `vocabulary-back-hint-${number}`;
      slide.face.setAttribute('aria-labelledby', `${slide.word.id} ${slide.hint.id}`);
      slide.face.setAttribute('aria-controls', slide.answer.id);
      slide.face.setAttribute('aria-expanded', 'false');
      revealSlide(slide, false);
      node.setAttribute('role', 'group');
      node.setAttribute('aria-label', `第 ${number + 1} 張，共 ${rows.length} 張`);
      mark(slide, false);
      slide.face.addEventListener('click', (event) => {
        if (number === index && (!suppressClick || event.detail === 0) && (event.detail === 0 || window.getSelection()?.isCollapsed !== false)) showAnswer(!revealed, event.detail > 0);
        suppressClick = false;
      });
      return slide;
    });
    track.replaceChildren(...slides.map(({ node }) => node));
  }

  function restoreAttribution() { placeholder.after(attribution); }

  function showInfo(show: boolean, focus = false) {
    stopAudio();
    const wasOpen = infoOpen;
    infoOpen = show;
    if (show) { deckAttempt++; deck?.pause(); }
    else if (wasOpen) void showDeck();
    main.dataset.panel = show ? 'info' : 'cards';
    track.inert = show;
    panel.hidden = !show;
    footer.hidden = show;
    info.hidden = show;
    backLabel.textContent = show ? '返回字卡' : '返回';
    back.setAttribute('aria-label', show ? '返回字卡' : '返回詞彙表');
    if (show) {
      align();
      host.append(attribution);
      panel.scrollTop = 0;
      if (focus) panel.focus({ preventScroll: true });
    } else {
      restoreAttribution();
      align();
      if (focus) slides[index]?.face.focus({ preventScroll: true });
    }
  }

  function open(nextRows: HTMLTableRowElement[], startIndex = 0, focus = true, animate = true) {
    disposeDeck();
    active = true;
    if (!dialog.open) {
      backgroundPosition = { x: scrollX, y: scrollY };
      dialog.showModal();
      document.documentElement.dataset.vocabularyOpen = '';
    }
    if (rows !== nextRows) build(nextRows);
    showInfo(false);
    select(startIndex, true);
    align();
    if (focus) slides[index]?.face.focus({ preventScroll: true });
    void showDeck(animate);
  }

  function close() {
    active = false;
    disposeDeck();
    cancelAlignment();
    stopAudio();
    window.clearTimeout(announceTimer);
    cancelAnimationFrame(frame);
    frame = 0;
    showInfo(false);
    delete document.documentElement.dataset.vocabularyOpen;
    if (dialog.open) dialog.close();
    window.scrollTo({ left: backgroundPosition.x, top: backgroundPosition.y, behavior: 'instant' });
  }

  track.addEventListener('scroll', () => {
    // Residual animation frames are not new user gestures. Input and card selection own audio cancellation.
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!dialog.open || infoOpen || !track.clientWidth) return;
      select(Math.max(0, Math.min(rows.length - 1, Math.round(track.scrollLeft / track.clientWidth))));
      announce();
    });
  }, { passive: true });
  track.addEventListener('pointerdown', (event) => {
    cancelAlignment();
    requestedIndex = null;
    for (const neighbor of [index - 1, index + 1]) if (slides[neighbor]) revealSlide(slides[neighbor], false);
    pointer = { x: event.clientX, y: event.clientY };
    suppressClick = false;
    stopAudio();
  }, { passive: true });
  track.addEventListener('pointermove', (event) => {
    if (pointer && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 8) suppressClick = true;
  }, { passive: true });
  track.addEventListener('pointercancel', () => { pointer = null; suppressClick = true; }, { passive: true });
  track.addEventListener('pointerup', () => { pointer = null; }, { passive: true });
  track.addEventListener('wheel', () => { cancelAlignment(); requestedIndex = null; stopAudio(); }, { passive: true });
  previous.addEventListener('click', (event) => move(-1, event.detail > 0));
  next.addEventListener('click', (event) => move(1, event.detail > 0));
  dialog.querySelector('[data-vocabulary-restart]')!.addEventListener('click', () => { select(0, true); align(); slides[0].face.focus({ preventScroll: true }); });
  back.addEventListener('click', actions.back);
  info.addEventListener('click', actions.info);
  source.addEventListener('click', (event) => { event.preventDefault(); actions.info(); });
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); actions.back(); });
  dialog.addEventListener('close', () => {
    if (printing || dialog.open) return;
    disposeDeck();
    active = false;
    stopAudio();
    restoreAttribution();
    delete document.documentElement.dataset.vocabularyOpen;
    actions.closed();
  });
  dialog.addEventListener('keydown', (event) => {
    if (infoOpen || (event.target as HTMLElement).closest('input, select, textarea, [contenteditable]')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); }
  });
  play.addEventListener('click', () => {
    if (requestedIndex !== null) {
      const destination = requestedIndex;
      select(destination);
      align();
    }
    if (audioPhase !== 'idle') { stopAudio(); return; }
    if (audioFailed || audio.error) setAudio(rows[index]);
    const clip = audio;
    const attempt = ++audioAttempt;
    audioState('loading', '正在載入發音…');
    audioTimer = window.setTimeout(() => {
      if (audio === clip && attempt === audioAttempt) { stopAudio(); audioFailed = true; audioState('idle', '載入發音逾時，請點聽發音重試。'); }
    }, 8000);
    try {
      clip.currentTime = 0;
      void clip.play().catch(() => {
        if (audio === clip && attempt === audioAttempt) { stopAudio(); audioFailed = true; audioState('idle', '無法播放發音，請點聽發音重試。'); }
      });
    } catch { stopAudio(); audioFailed = true; audioState('idle', '無法播放發音，請點聽發音重試。'); }
  });
  new ResizeObserver(() => { if (dialog.open && track.clientWidth !== width) align(); }).observe(track);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) disposeDeck(); else void showDeck();
    if (slides[index]) revealSlide(slides[index], revealed);
    if (reducedMotion.matches) align();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopAudio(); deckAttempt++; deck?.pause(); }
    else void showDeck();
  });
  window.addEventListener('pagehide', () => { stopAudio(); disposeDeck(); });
  window.addEventListener('pageshow', (event) => { if (event.persisted) void showDeck(); });
  window.addEventListener('beforeprint', () => {
    stopAudio();
    deckAttempt++;
    deck?.pause();
    if (printing) return;
    printing = dialog.open;
    restoreAttribution();
    if (printing) { delete document.documentElement.dataset.vocabularyOpen; dialog.close(); }
  });
  window.addEventListener('afterprint', () => {
    if (!printing) return;
    printing = false;
    if (!active) return;
    dialog.showModal();
    document.documentElement.dataset.vocabularyOpen = '';
    if (infoOpen) host.append(attribution);
    align();
    void showDeck();
  });

  return { open, close, showInfo, stopAudio, get index() { return Math.max(0, index); },
    get infoOpen() { return infoOpen; }, get sourceHash() { return source.getAttribute('href') ?? ''; } };
}
