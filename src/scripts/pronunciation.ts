type AudioKind = 'word' | 'phrase' | 'story';
type Playback = {
  button: HTMLButtonElement;
  audio: HTMLAudioElement;
  label: string;
  kind: AudioKind;
  phase: 'preparing' | 'playing' | 'paused';
  started: boolean;
  playAttempt: number;
  lastTime: number;
  startupTimer?: number;
  stallTimer?: number;
};

function initializePronunciation(root: HTMLElement) {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-pronounce]')];
  const stop = root.querySelector<HTMLButtonElement>('[data-pronounce-stop]');
  const pause = root.querySelector<HTMLButtonElement>('[data-story-pause]');
  const restart = root.querySelector<HTMLButtonElement>('[data-story-restart]');
  const status = root.querySelector<HTMLElement>('[data-pronounce-status]');
  if (!stop || !pause || !restart || !status) return;
  const idleLabels = new Map(buttons.map((button) => [button, button.textContent]));
  if (typeof window.Audio !== 'function') {
    status.textContent = '此瀏覽器不支援頁內音訊播放，閱讀內容仍可使用。';
    return;
  }
  let current: Playback | null = null;

  function clearTimers(request: Playback) {
    window.clearTimeout(request.startupTimer);
    window.clearTimeout(request.stallTimer);
  }

  function updateControls() {
    stop!.disabled = !current;
    pause!.disabled = current?.kind !== 'story';
    restart!.disabled = current?.kind !== 'story';
    const paused = current?.phase === 'paused';
    pause!.textContent = paused ? '繼續' : '暫停';
    pause!.setAttribute('aria-label', paused ? '繼續朗讀' : '暫停朗讀');
  }

  function cancelPlayback(message?: string) {
    const previous = current;
    // Invalidate before pause(): old events and play() promises can settle later.
    current = null;
    if (previous) {
      clearTimers(previous);
      previous.audio.pause();
      try { previous.audio.currentTime = 0; } catch { /* A clip that has not loaded may not be seekable. */ }
      delete previous.button.dataset.state;
      previous.button.textContent = idleLabels.get(previous.button) ?? '';
    }
    updateControls();
    if (message) status!.textContent = message;
  }

  function playbackMessage(request: Playback, stage: 'preparing' | 'playing' | 'ended') {
    if (request.kind === 'story') return {
      preparing: '正在準備整篇朗讀。', playing: '正在朗讀整篇短文。', ended: '已完成整篇朗讀。',
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
      // Keep play() in the original click, including resume, for mobile user-gesture rules.
      request.audio.play().catch((error: unknown) => {
        if (current !== request || request.playAttempt !== attempt) return;
        const blocked = error instanceof DOMException && error.name === 'NotAllowedError';
        cancelPlayback(blocked
          ? '瀏覽器未允許播放，請再點一次播放按鈕。'
          : '音檔暫時無法播放，請再試一次。');
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
    request.button.dataset.state = 'paused';
    request.button.textContent = '重新朗讀';
    status!.textContent = '已暫停整篇朗讀。';
    updateControls();
  }

  function play(button: HTMLButtonElement) {
    cancelPlayback();
    const label = button.dataset.label?.trim();
    const kind = button.dataset.audioKind;
    const src = button.dataset.audioSrc;
    if (!label || !src || !['word', 'phrase', 'story'].includes(kind ?? '')) {
      status!.textContent = '音檔暫時無法播放，請再試一次。';
      return;
    }
    try {
      const audio = new Audio(src);
      audio.preload = 'none';
      const request: Playback = {
        button, audio, label, kind: kind as AudioKind, phase: 'preparing', started: false,
        playAttempt: 0, lastTime: 0,
      };
      current = request;
      button.dataset.state = 'starting';
      button.textContent = '準備中';
      status!.textContent = playbackMessage(request, 'preparing');
      updateControls();
      audio.addEventListener('playing', () => {
        if (current !== request || request.phase === 'paused' || audio.paused) return;
        const wasPlaying = request.phase === 'playing';
        request.phase = 'playing';
        request.started = true;
        window.clearTimeout(request.startupTimer);
        button.dataset.state = 'playing';
        button.textContent = request.kind === 'story' ? '重新朗讀' : '再聽一次';
        status!.textContent = playbackMessage(request, 'playing');
        if (!wasPlaying) {
          request.lastTime = audio.currentTime;
          watchProgress(request);
        }
      });
      audio.addEventListener('timeupdate', () => {
        if (current !== request || request.phase !== 'playing') return;
        if (audio.currentTime > request.lastTime) {
          request.lastTime = audio.currentTime;
          watchProgress(request);
        }
      });
      audio.addEventListener('pause', () => {
        if (current !== request || request.phase === 'paused' || !audio.paused || audio.ended) return;
        if (request.kind === 'story') pauseStory(request, false);
        else cancelPlayback('已停止播放。');
      });
      audio.addEventListener('ended', () => {
        // A queued end event from before pause/resume must reflect the current media state.
        if (current !== request || request.phase === 'paused' || !audio.ended) return;
        const message = request.started ? playbackMessage(request, 'ended') : '播放沒有開始，請再試一次。';
        cancelPlayback(message);
      });
      audio.addEventListener('error', () => {
        if (current === request) cancelPlayback('音檔暫時無法播放，請再試一次。');
      });
      startAttempt(request);
    } catch {
      cancelPlayback('音檔暫時無法播放，請再試一次。');
    }
  }

  for (const button of buttons) {
    button.disabled = false;
    button.addEventListener('click', () => play(button));
  }
  pause.addEventListener('click', () => {
    const request = current;
    if (request?.kind !== 'story') return;
    if (request.phase !== 'paused') pauseStory(request);
    else {
      request.phase = 'preparing';
      request.button.dataset.state = 'starting';
      request.button.textContent = '準備中';
      status.textContent = '正在準備繼續朗讀。';
      updateControls();
      startAttempt(request);
    }
  });
  restart.addEventListener('click', () => {
    if (current?.kind === 'story') play(current.button);
  });
  stop.addEventListener('click', () => cancelPlayback('已停止播放。'));
  window.addEventListener('pagehide', () => {
    if (current) cancelPlayback('已停止播放。');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && current) cancelPlayback('已停止播放。');
  });
}

const root = document.querySelector<HTMLElement>('[data-pronunciation-player]');
if (root) initializePronunciation(root);
