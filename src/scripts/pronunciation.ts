import {
  loadReadingState, readingRates, saveReadingPreferences, saveReadingProgress,
  type ReadingMode, type ReadingRate,
} from '../lib/reading-storage';

type AudioKind = 'word' | 'phrase' | 'story';
type Playback = {
  button: HTMLButtonElement;
  audio: HTMLAudioElement;
  label: string;
  kind: AudioKind;
  index?: number;
  phase: 'preparing' | 'playing' | 'paused';
  started: boolean;
  playAttempt: number;
  lastTime: number;
  cleanup: () => void;
  startupTimer?: number;
  stallTimer?: number;
};

function initializePronunciation(root: HTMLElement) {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-pronounce]')];
  const rows = [...root.querySelectorAll<HTMLElement>('[data-story-sentence]')];
  const story = root.querySelector<HTMLButtonElement>('[data-audio-kind="story"]');
  const stop = root.querySelector<HTMLButtonElement>('[data-pronounce-stop]');
  const restart = root.querySelector<HTMLButtonElement>('[data-story-restart]');
  const previous = root.querySelector<HTMLButtonElement>('[data-story-previous]');
  const repeat = root.querySelector<HTMLButtonElement>('[data-story-repeat]');
  const rateControl = root.querySelector<HTMLSelectElement>('[data-reading-rate]');
  const modeControl = root.querySelector<HTMLSelectElement>('[data-reading-mode]');
  const status = root.querySelector<HTMLElement>('[data-pronounce-status]');
  const positionLabel = root.querySelector<HTMLElement>('[data-reading-position]');
  const storageStatuses = [...root.querySelectorAll<HTMLElement>('[data-reading-storage-status]')];
  const dialog = root.querySelector<HTMLDialogElement>('[data-follow-dialog]');
  const entry = root.querySelector<HTMLButtonElement>('[data-follow-open]');
  const focusStatus = root.querySelector<HTMLElement>('[data-follow-status]');
  const content = root.querySelector<HTMLElement>('[data-follow-content]');
  const translation = root.querySelector<HTMLElement>('[data-follow-translation-text]');
  const translationToggle = root.querySelector<HTMLButtonElement>('[data-follow-translation]');
  const selection = root.querySelector<HTMLSelectElement>('[data-follow-sentence]');
  const practice = root.querySelector<HTMLElement>('[data-follow-practice]');
  const summary = root.querySelector<HTMLElement>('[data-follow-completion]');
  const summaryTitle = root.querySelector<HTMLElement>('[data-follow-completion-title]');
  const replay = root.querySelector<HTMLButtonElement>('[data-follow-replay]');
  const sceneId = root.dataset.sceneId;
  const version = root.dataset.readingVersion;
  if (!story || !stop || !restart || !previous || !repeat || !rateControl || !modeControl
    || !status || !positionLabel || !sceneId || !version || !rows.length || !dialog || !entry || !focusStatus
    || !content || !translation || !translationToggle || !selection || !practice || !summary || !summaryTitle || !replay) return;
  const idleLabels = new Map(buttons.map((button) => [button, button.textContent]));
  if (typeof window.Audio !== 'function') {
    status.textContent = '此瀏覽器不支援頁內音訊播放，閱讀內容仍可使用。';
    return;
  }
  const loaded = loadReadingState(sceneId, version, rows.length);
  const preferences = loaded.preferences;
  let rate: ReadingRate = preferences.rate ?? (root.dataset.readingLevel === 'beginner' ? 0.8 : 1);
  let mode: ReadingMode = preferences.mode ?? (root.dataset.readingLevel === 'beginner' ? 'guided' : 'continuous');
  let position = loaded.progress?.index ?? 0;
  let completed = loaded.progress?.completed ?? false;
  let hasPosition = loaded.progress !== null;
  let invalidProgress = loaded.invalidProgress;
  let cannotSave = loaded.unavailable;
  let current: Playback | null = null;
  let sentenceEnded = false;
  let roundSummary = false;
  let translated = false;
  let renderedPosition = -1;
  let progressDirty = false;
  rateControl.value = String(rate);
  modeControl.value = mode;

  function setStatus(text: string) {
    status!.textContent = text;
    focusStatus!.textContent = text;
  }

  function showStorageStatus() {
    const text = [
      cannotSave ? '本次無法保存朗讀進度與偏好，仍可正常播放。' : '',
      invalidProgress ? '教材或進度已更新，請從頭開始。' : '',
    ].filter(Boolean).join(' ');
    for (const node of storageStatuses) {
      node.textContent = text;
      node.hidden = !text;
    }
  }

  function persist() {
    // Merely closing an old reader must not replace progress saved by a newer tab.
    if (hasPosition && progressDirty) {
      if (saveReadingProgress(sceneId!, { schema: 1, version: version!, index: position, completed })) progressDirty = false;
      else cannotSave = true;
    }
    showStorageStatus();
  }

  function updateControls() {
    stop!.disabled = !current;
    previous!.disabled = position === 0;
    positionLabel!.textContent = `${position + 1} / ${rows.length} 句`;
    story!.textContent = current?.kind === 'story'
      ? current.phase === 'paused' ? '繼續播放' : '暫停'
      : sentenceEnded ? position === rows.length - 1 ? '完成本輪' : '下一句' : '播放本句';
    story!.setAttribute('aria-label', story!.textContent);
    entry!.textContent = completed ? '再練一次' : hasPosition ? `接續第 ${position + 1} 句跟讀` : '開始跟讀';
    selection!.value = String(position);
    practice!.hidden = roundSummary;
    summary!.hidden = !roundSummary;
    const hint = root.querySelector<HTMLElement>('.follow-hint');
    if (hint) hint.textContent = mode === 'guided'
      ? '每句播完會停下來，換你開口跟讀。' : '連續播放本篇，可隨時暫停或重聽。';
    translation!.hidden = !translated;
    translationToggle!.textContent = translated ? '隱藏中文' : '顯示中文';
    translationToggle!.setAttribute('aria-pressed', String(translated));
    status!.setAttribute('aria-live', dialog!.open ? 'off' : 'polite');
    focusStatus!.setAttribute('aria-live', dialog!.open ? 'polite' : 'off');
    if (renderedPosition !== position) {
      const paragraph = rows[position].querySelector('p');
      content!.replaceChildren(...[...(paragraph?.childNodes ?? [])].map((node) => node.cloneNode(true)));
      translation!.textContent = rows[position].dataset.translation ?? '';
      const region = content!.closest<HTMLElement>('[data-follow-text-region]');
      if (region) region.scrollTop = 0;
      renderedPosition = position;
    }
    if (current?.kind === 'story') story!.dataset.state = current.phase === 'preparing' ? 'starting' : current.phase;
    else delete story!.dataset.state;
    rows.forEach((row, index) => {
      if (hasPosition && index === position) row.setAttribute('aria-current', 'true');
      else row.removeAttribute('aria-current');
    });
  }

  function openFocus() {
    if (dialog!.open) return;
    cancelPlayback();
    if (completed) selectSentence(0);
    sentenceEnded = false;
    roundSummary = false;
    try { dialog!.showModal(); }
    catch { setStatus('無法開啟跟讀，請重新整理後再試一次。'); return; }
    document.documentElement.dataset.followOpen = 'true';
    updateControls();
    setStatus(hasPosition ? `從第 ${position + 1} 句開始，點播放本句。` : '先聽本句，再自己開口說一次。');
    story!.focus();
  }

  function closeFocus(restoreFocus = true) {
    if (!dialog!.open) return;
    persist();
    cancelPlayback('已停止播放，已保留朗讀位置。');
    sentenceEnded = false;
    roundSummary = false;
    dialog!.close();
    delete document.documentElement.dataset.followOpen;
    updateControls();
    if (restoreFocus) {
      const paragraph = rows[position].querySelector<HTMLElement>('p');
      if (paragraph) {
        paragraph.tabIndex = -1;
        paragraph.focus({ preventScroll: true });
        paragraph.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    }
  }

  function clearTimers(request: Playback) {
    window.clearTimeout(request.startupTimer);
    window.clearTimeout(request.stallTimer);
  }

  function cancelPlayback(message?: string) {
    const old = current;
    // Invalidate before pause(): events and play() promises may settle after a switch.
    current = null;
    if (old) {
      clearTimers(old);
      old.cleanup();
      old.audio.pause();
      try { old.audio.currentTime = 0; } catch { /* Unloaded clips may not be seekable. */ }
      delete old.button.dataset.state;
      old.button.textContent = idleLabels.get(old.button) ?? '';
    }
    updateControls();
    if (message) setStatus(message);
  }

  function message(request: Playback, stage: 'preparing' | 'playing' | 'ended') {
    if (request.kind === 'story') return {
      preparing: `正在準備第 ${position + 1} 句。`, playing: `正在朗讀第 ${position + 1} 句。`,
      ended: `第 ${position + 1} 句已聽完，可以跟讀或前往下一句。`,
    }[stage];
    const verb = { preparing: '正在準備', playing: '正在播放', ended: '已播放' }[stage];
    return request.kind === 'phrase' ? `${verb}短句：${request.label}` : `${verb} ${request.label} 的發音。`;
  }

  function watchProgress(request: Playback) {
    window.clearTimeout(request.stallTimer);
    request.stallTimer = window.setTimeout(() => {
      if (current === request && request.phase === 'playing') cancelPlayback('播放暫時停住了，請再試一次。');
    }, 15_000);
  }

  function startAttempt(request: Playback) {
    const attempt = ++request.playAttempt;
    request.startupTimer = window.setTimeout(() => {
      if (current === request && request.playAttempt === attempt && request.phase === 'preparing') {
        cancelPlayback('播放沒有開始，請再試一次。');
      }
    }, 8_000);
    try {
      // Start and resume stay in the original click for mobile user-gesture rules.
      request.audio.play().catch((error: unknown) => {
        if (current !== request || request.playAttempt !== attempt) return;
        const blocked = error instanceof DOMException && error.name === 'NotAllowedError';
        cancelPlayback(blocked ? '瀏覽器未允許播放，請再點一次播放按鈕。' : '音檔暫時無法播放，請再試一次。');
      });
    } catch {
      if (current === request && request.playAttempt === attempt) cancelPlayback('音檔暫時無法播放，請再試一次。');
    }
  }

  function pauseStory(request: Playback, callPause = true) {
    request.phase = 'paused';
    ++request.playAttempt;
    clearTimers(request);
    if (callPause) request.audio.pause();
    persist();
    updateControls();
    setStatus(`已暫停第 ${position + 1} 句。`);
  }

  function resumeStory(request: Playback) {
    request.phase = 'preparing';
    updateControls();
    setStatus(`正在準備繼續第 ${position + 1} 句。`);
    startAttempt(request);
  }

  function play(button: HTMLButtonElement, src: string, index?: number, reusableAudio?: HTMLAudioElement) {
    cancelPlayback();
    const kind = button.dataset.audioKind;
    const label = button.dataset.label?.trim();
    if (!src || !label || !['word', 'phrase', 'story'].includes(kind ?? '')) {
      setStatus('音檔暫時無法播放，請再試一次。');
      return;
    }
    try {
      const audio = reusableAudio ?? new Audio(src);
      if (reusableAudio) audio.src = src;
      audio.preload = 'none';
      audio.playbackRate = rate;
      audio.preservesPitch = true;
      const request: Playback = {
        button, audio, label, kind: kind as AudioKind, index, phase: 'preparing', started: false,
        playAttempt: 0, lastTime: 0, cleanup: () => {},
      };
      current = request;
      button.dataset.state = 'starting';
      button.textContent = '準備中';
      setStatus(message(request, 'preparing'));
      updateControls();
      const onPlaying = () => {
        if (current !== request || request.phase === 'paused' || audio.paused) return;
        const wasPlaying = request.phase === 'playing';
        request.phase = 'playing';
        request.started = true;
        window.clearTimeout(request.startupTimer);
        button.dataset.state = 'playing';
        if (request.kind !== 'story') button.textContent = '再聽一次';
        setStatus(message(request, 'playing'));
        updateControls();
        if (!wasPlaying) {
          request.lastTime = audio.currentTime;
          watchProgress(request);
        }
      };
      const onTime = () => {
        if (current !== request || request.phase !== 'playing') return;
        if (audio.currentTime > request.lastTime) {
          request.lastTime = audio.currentTime;
          watchProgress(request);
        }
      };
      const onPause = () => {
        if (current !== request || request.phase === 'paused' || !audio.paused || audio.ended) return;
        if (request.kind === 'story') pauseStory(request, false);
        else cancelPlayback('已停止播放。');
      };
      const onEnded = () => {
        if (current !== request || request.phase === 'paused' || !audio.ended) return;
        if (!request.started) { cancelPlayback('播放沒有開始，請再試一次。'); return; }
        if (request.kind !== 'story') { cancelPlayback(message(request, 'ended')); return; }
        sentenceEnded = true;
        if (position === rows.length - 1) {
          completed = true;
          progressDirty = true;
          persist();
          cancelPlayback('本篇已聽完。');
        } else if (mode === 'continuous' && !document.hidden) {
          // Reuse the user-started media element so mobile browsers can continue the queue.
          playSentence(position + 1, audio);
        } else {
          persist();
          cancelPlayback(message(request, 'ended'));
        }
      };
      const onError = () => { if (current === request) cancelPlayback('音檔暫時無法播放，請再試一次。'); };
      const listeners = { playing: onPlaying, timeupdate: onTime, pause: onPause, ended: onEnded, error: onError };
      for (const [name, handler] of Object.entries(listeners)) audio.addEventListener(name, handler);
      request.cleanup = () => {
        for (const [name, handler] of Object.entries(listeners)) audio.removeEventListener(name, handler);
      };
      startAttempt(request);
    } catch { cancelPlayback('音檔暫時無法播放，請再試一次。'); }
  }

  function selectSentence(index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= rows.length) return;
    cancelPlayback();
    position = index;
    hasPosition = true;
    completed = false;
    sentenceEnded = false;
    roundSummary = false;
    invalidProgress = false;
    progressDirty = true;
    persist();
    updateControls();
    setStatus(`第 ${position + 1} 句，點播放本句後跟著讀。`);
  }

  function playSentence(index: number, reusableAudio?: HTMLAudioElement) {
    if (!Number.isInteger(index) || index < 0 || index >= rows.length) return;
    selectSentence(index);
    play(story!, rows[index].dataset.audioSrc ?? '', index, reusableAudio);
  }

  for (const button of buttons) {
    button.disabled = false;
    button.addEventListener('click', () => {
      if (button !== story) { play(button, button.dataset.audioSrc ?? ''); return; }
      if (current?.kind === 'story') {
        if (current.phase === 'paused') resumeStory(current);
        else pauseStory(current);
      } else if (sentenceEnded) {
        if (position === rows.length - 1) {
          roundSummary = true;
          updateControls();
          summaryTitle!.focus();
        } else playSentence(position + 1);
      } else playSentence(position);
    });
  }
  for (const control of [restart, repeat, previous, rateControl, modeControl, selection, translationToggle, replay]) control.disabled = false;
  entry.disabled = typeof dialog.showModal !== 'function';
  entry.addEventListener('click', openFocus);
  for (const close of root.querySelectorAll<HTMLButtonElement>('[data-follow-close]')) {
    close.disabled = false;
    close.addEventListener('click', () => closeFocus());
  }
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeFocus(); });
  dialog.addEventListener('close', () => {
    // A close event can arrive after the user already reopened the dialog.
    if (dialog.open) return;
    delete document.documentElement.dataset.followOpen;
    if (current?.kind === 'story') { persist(); cancelPlayback('已停止播放，已保留朗讀位置。'); }
  });
  const resetPractice = () => {
    selectSentence(0);
    const settings = restart.closest('details');
    if (settings) settings.open = false;
    story!.focus();
  };
  restart.addEventListener('click', resetPractice);
  replay.addEventListener('click', resetPractice);
  repeat.addEventListener('click', () => playSentence(position));
  previous.addEventListener('click', () => {
    selectSentence(position - 1);
    if (previous.disabled) story!.focus();
  });
  selection.addEventListener('change', () => {
    selectSentence(Number(selection.value));
    const settings = selection.closest('details');
    if (settings) settings.open = false;
    story!.focus();
  });
  translationToggle.addEventListener('click', () => { translated = !translated; updateControls(); });
  stop.addEventListener('click', () => { persist(); cancelPlayback('已停止播放，已保留朗讀位置。'); });
  rateControl.addEventListener('change', () => {
    const value = Number(rateControl.value);
    if (!readingRates.some((rate) => rate === value)) return;
    rate = value as ReadingRate;
    if (current) current.audio.playbackRate = rate;
    preferences.rate = rate;
    if (!saveReadingPreferences(preferences)) cannotSave = true;
    showStorageStatus();
  });
  modeControl.addEventListener('change', () => {
    if (modeControl.value !== 'guided' && modeControl.value !== 'continuous') return;
    mode = modeControl.value;
    preferences.mode = mode;
    if (!saveReadingPreferences(preferences)) cannotSave = true;
    showStorageStatus();
    updateControls();
  });
  const leave = () => {
    persist();
    if (dialog.open) closeFocus(false);
    else if (current) cancelPlayback('已停止播放，已保留朗讀位置。');
  };
  window.addEventListener('pagehide', leave);
  document.addEventListener('visibilitychange', () => { if (document.hidden) leave(); });
  showStorageStatus();
  updateControls();
  if (completed) setStatus('本篇已聽完，可再練一次。');
  else if (hasPosition) setStatus(`上次聽到第 ${position + 1} 句，點選接續跟讀。`);
}

const root = document.querySelector<HTMLElement>('[data-pronunciation-player]');
if (root) initializePronunciation(root);
