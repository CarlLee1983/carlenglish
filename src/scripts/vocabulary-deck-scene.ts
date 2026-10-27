import {
  AmbientLight, CanvasTexture, Color, DirectionalLight, ExtrudeGeometry, Group,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, NoToneMapping, PerspectiveCamera,
  PlaneGeometry, Scene, Shape, SRGBColorSpace, WebGLRenderer,
} from 'three';

export interface VocabularyDeckScene {
  flip(face: HTMLElement, show: boolean, animate: boolean): void;
  pause(): void;
  resume(): void;
  dispose(): void;
}

interface MotionValue { value: number; from: number; to: number; animation: Animation | null }
interface Card { face: HTMLElement; rotor: HTMLElement; slide: HTMLElement; angle: MotionValue }
const gutter = 28;
// Tilts the top edge back while edge-on, which adds depth without bringing that edge toward the viewer.
const flipLean = .06;

// CSS minifiers may rewrite `560ms` as `.56s`.
function milliseconds(value: string) {
  const time = value.trim();
  return time.endsWith('ms') ? parseFloat(time) : parseFloat(time) * 1000;
}

/** WebGL owns paper and light. DOM owns content, focus and native gestures. */
export function createVocabularyDeckScene(main: HTMLElement, track: HTMLElement, enter: boolean, failed: () => void): VocabularyDeckScene {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.autoClear = false;
  const canvas = renderer.domElement;
  canvas.className = 'vocabulary-deck-canvas';
  canvas.dataset.vocabularyDeck = '';
  canvas.setAttribute('aria-hidden', 'true');
  const tokens = getComputedStyle(main);
  // Shared with CSS so the WebGL camera and the DOM text use one perspective and one flip timing.
  const distance = parseFloat(tokens.getPropertyValue('--deck-distance'));
  const flipDuration = milliseconds(tokens.getPropertyValue('--flip-duration'));
  const flipEasing = tokens.getPropertyValue('--flip-easing').trim();
  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 1, 4000);
  camera.position.z = distance;
  const top = new Group();
  top.rotation.order = 'ZXY';
  scene.add(top);
  scene.add(new AmbientLight(0xffffff, 1.6));
  const light = new DirectionalLight(0xffffff, 2.8);
  light.position.set(-400, 600, 900);
  scene.add(light);
  const rim = new DirectionalLight(0xffffff, .6);
  rim.position.set(400, -150, 200);
  scene.add(rim);
  const easing = tokens.getPropertyValue('--ease-spring').trim();
  const paper = new MeshStandardMaterial({ color: new Color(tokens.getPropertyValue('--surface-raised').trim()), roughness: .8, metalness: 0 });
  const edge = new MeshStandardMaterial({ color: new Color(tokens.getPropertyValue('--control-border').trim()), roughness: .6 });
  const backing = new MeshStandardMaterial({ color: new Color(tokens.getPropertyValue('--line').trim()), roughness: 1 });
  let geometry: ExtrudeGeometry | null = null;
  const faceMesh = new Mesh<ExtrudeGeometry, MeshStandardMaterial[]>();
  faceMesh.material = [paper, edge];
  top.add(faceMesh);
  const backs = [new Mesh<ExtrudeGeometry, MeshStandardMaterial[]>(), new Mesh<ExtrudeGeometry, MeshStandardMaterial[]>()];
  for (const back of backs) { back.material = [backing, edge]; scene.add(back); }
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 256;
  const ink = shadowCanvas.getContext('2d')!;
  ink.shadowColor = '#000';
  ink.shadowBlur = 16;
  ink.shadowOffsetY = 6;
  ink.fillStyle = '#000';
  ink.beginPath();
  ink.roundRect(28, 28, 200, 192, 12);
  ink.fill();
  const shadowTexture = new CanvasTexture(shadowCanvas);
  const shadowMaterial = new MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: .22, depthWrite: false });
  const shadowGeometry = new PlaneGeometry(1, 1);
  const shadow = new Mesh(shadowGeometry, shadowMaterial);
  shadow.position.set(0, -10, -48);
  scene.add(shadow);
  const cards: Card[] = [...track.querySelectorAll<HTMLElement>('[data-card-face]')].map((face) => {
    const value = face.dataset.revealed === 'true' ? Math.PI : 0;
    return { face, rotor: face.querySelector<HTMLElement>('[data-card-rotor]')!, slide: face.parentElement!,
      angle: { value, from: value, to: value, animation: null } };
  });
  const entrance: MotionValue = { value: enter ? 0 : 1, from: 0, to: 1, animation: null };
  let frame = 0;
  let paused = false;
  let disposed = false;
  let mounted = false;
  let cardWidth = 0;
  let cardHeight = 0;
  let canvasWidth = 0;
  let canvasHeight = 0;

  function sample(motion: MotionValue) {
    if (!motion.animation) return motion.value;
    const progress = motion.animation.effect?.getComputedTiming().progress ?? 0;
    motion.value = motion.from + (motion.to - motion.from) * progress;
    if (motion.animation.playState === 'finished') {
      motion.value = motion.to;
      motion.animation.cancel();
      motion.animation = null;
    }
    return motion.value;
  }

  function finish(motion: MotionValue) {
    motion.animation?.cancel();
    motion.animation = null;
    motion.value = motion.from = motion.to;
  }

  function tween(motion: MotionValue, target: number, animate: boolean, duration = 240, curve = easing) {
    sample(motion);
    motion.animation?.cancel();
    motion.animation = null;
    motion.from = motion.value;
    motion.to = target;
    if (animate && Math.abs(target - motion.value) > .001) {
      // One browser timeline supplies the exact same angle to DOM text and WebGL paper.
      motion.animation = new Animation(new KeyframeEffect(null, [], { duration, easing: curve, fill: 'both' }), document.timeline);
      motion.animation.play();
    } else motion.value = target;
    invalidate();
  }

  function resizeGeometry(width: number, height: number) {
    if (width === cardWidth && height === cardHeight) return;
    cardWidth = width;
    cardHeight = height;
    const radius = Math.min(parseFloat(tokens.getPropertyValue('--radius-lg')), width / 2, height / 2);
    const x = -width / 2, y = -height / 2;
    const shape = new Shape();
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    geometry?.dispose();
    geometry = new ExtrudeGeometry(shape, { depth: 6, bevelEnabled: true, bevelSize: .6, bevelThickness: .6, bevelSegments: 2, curveSegments: 6, steps: 1 });
    geometry.translate(0, 0, -3);
    faceMesh.geometry = geometry;
    backs.forEach((back) => { back.geometry = geometry!; });
    shadow.scale.set(width + 64, height + 64, 1);
  }

  function draw() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (paused || disposed) return;
    try {
      const bounds = main.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      if (canvasWidth !== bounds.width || canvasHeight !== bounds.height) {
        canvasWidth = bounds.width;
        canvasHeight = bounds.height;
        renderer.setSize(canvasWidth, canvasHeight, false);
      }
      const trackBounds = track.getBoundingClientRect();
      // Batch untouched layout reads before changing any presentation transforms.
      const nearest = Math.floor(track.scrollLeft / track.clientWidth);
      cards.forEach((card) => sample(card.angle));
      const visible = cards.slice(Math.max(0, nearest - 1), nearest + 3).map((card) => ({ card, rect: card.face.getBoundingClientRect(), slide: card.slide.getBoundingClientRect() }))
        .filter(({ slide }) => slide.right > trackBounds.left && slide.left < trackBounds.right);
      const entry = sample(entrance);
      renderer.setScissorTest(false);
      renderer.clear();
      renderer.setScissorTest(true);
      for (const { card, rect, slide } of visible) {
        if (!rect.width || !rect.height) continue;
        resizeGeometry(rect.width, rect.height);
        const relative = Math.max(-1, Math.min(1, (slide.left - trackBounds.left) / trackBounds.width));
        const angle = sample(card.angle);
        const arc = Math.abs(Math.sin(angle));
        const turn = angle + relative * .16;
        const tilt = arc * flipLean;
        const lean = (1 - entry) * .15 + tilt;
        const roll = relative * .035 - (1 - entry) * .07;
        const lift = -Math.abs(relative) * 8 + (1 - entry) * 20;
        // Sinking by the near edge's travel keeps every corner behind the resting plane, so the stage never clips it.
        const depth = -Math.abs(relative) * 60 + (1 - entry) * 16 - arc * rect.width / 2 - Math.sin(tilt) * rect.height / 2;
        const scale = .94 + entry * .06;
        card.rotor.style.transform = `translate3d(0, ${lift}px, ${depth}px) rotateZ(${roll}rad) rotateX(${lean}rad) rotateY(${turn}rad) scale(${scale})`;
        card.face.dataset.deckSide = Math.cos(turn) >= 0 ? 'front' : 'back';
        top.position.set(0, -lift, depth);
        top.rotation.set(-lean, turn, -roll, 'ZXY');
        top.scale.setScalar(scale);
        backs.forEach((back, n) => {
          back.position.set((n + 1) * 3, -(n + 1) * 7, -(n + 1) * 14);
          back.rotation.z = (n + 1) * .025;
          back.scale.setScalar(1 - (n + 1) * .012);
        });
        const viewportWidth = rect.width + gutter * 2;
        const viewportHeight = rect.height + gutter * 2;
        camera.fov = 2 * Math.atan(viewportHeight / (2 * distance)) * 180 / Math.PI;
        camera.aspect = viewportWidth / viewportHeight;
        camera.updateProjectionMatrix();
        renderer.setViewport(rect.left - bounds.left - gutter, bounds.bottom - rect.bottom - gutter, viewportWidth, viewportHeight);
        const left = Math.max(bounds.left, trackBounds.left, slide.left);
        const right = Math.min(bounds.right, trackBounds.right, slide.right);
        renderer.setScissor(left - bounds.left, 0, Math.max(0, right - left), canvasHeight);
        // The stack stays put; drawing the card in a second pass keeps a sunken card above it.
        renderer.clearDepth();
        top.visible = false;
        renderer.render(scene, camera);
        renderer.clearDepth();
        top.visible = true;
        setStackVisible(false);
        renderer.render(scene, camera);
        setStackVisible(true);
        // Keep the back content during a return flip, then remove its visual exposure.
        card.face.dataset.deckTurning = card.angle.animation ? 'true' : 'false';
      }
      if (entrance.animation || cards.some((card) => card.angle.animation)) invalidate();
    } catch (error) { if (!mounted) throw error; failed(); }
  }

  function setStackVisible(visible: boolean) {
    shadow.visible = visible;
    backs.forEach((back) => { back.visible = visible; });
  }

  function invalidate() { if (!frame && !paused && !disposed) frame = requestAnimationFrame(draw); }
  function interruptEntrance() { finish(entrance); invalidate(); }
  function lost() { if (!disposed) failed(); }
  const observer = new ResizeObserver(invalidate);
  const theme = window.matchMedia('(prefers-color-scheme: dark)');
  function updateTheme() {
    const current = getComputedStyle(main);
    paper.color.set(current.getPropertyValue('--surface-raised').trim());
    edge.color.set(current.getPropertyValue('--control-border').trim());
    backing.color.set(current.getPropertyValue('--line').trim());
    invalidate();
  }

  function pause() {
    paused = true;
    cancelAnimationFrame(frame);
    frame = 0;
    finish(entrance);
    cards.forEach((card) => finish(card.angle));
    canvas.hidden = true;
  }

  function dispose() {
    if (disposed) return;
    pause();
    disposed = true;
    observer.disconnect();
    track.removeEventListener('scroll', invalidate);
    track.removeEventListener('pointerdown', interruptEntrance);
    track.removeEventListener('wheel', interruptEntrance);
    theme.removeEventListener('change', updateTheme);
    canvas.removeEventListener('webglcontextlost', lost);
    delete main.dataset.deckScene;
    for (const card of cards) {
      card.rotor.style.removeProperty('transform');
      delete card.face.dataset.deckTurning;
      delete card.face.dataset.deckSide;
      card.face.dataset.motion = 'instant';
    }
    geometry?.dispose();
    paper.dispose(); edge.dispose(); backing.dispose();
    shadowGeometry.dispose(); shadowMaterial.dispose(); shadowTexture.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }

  try {
    main.prepend(canvas);
    main.dataset.deckScene = 'ready';
    observer.observe(main);
    if (cards[0]) observer.observe(cards[0].face);
    track.addEventListener('scroll', invalidate, { passive: true });
    track.addEventListener('pointerdown', interruptEntrance, { passive: true });
    track.addEventListener('wheel', interruptEntrance, { passive: true });
    theme.addEventListener('change', updateTheme);
    canvas.addEventListener('webglcontextlost', lost);
    if (enter) tween(entrance, 1, true, 420);
    draw();
    mounted = true;
  } catch (error) { dispose(); throw error; }

  return {
    flip(face, show, animate) {
      const card = cards.find((card) => card.face === face);
      if (!card) return;
      finish(entrance);
      const target = show ? Math.PI : 0;
      // A reversal mid-flip covers less angle, so it takes proportionally less time.
      const remaining = Math.abs(target - sample(card.angle)) / Math.PI;
      tween(card.angle, target, animate, flipDuration * Math.max(.4, remaining), flipEasing);
      if (!animate) draw();
    },
    pause,
    resume() {
      if (disposed) return;
      paused = false;
      canvas.hidden = false;
      draw();
    },
    dispose,
  };
}
