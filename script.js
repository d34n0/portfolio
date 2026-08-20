// ---- Boot log content: this doubles as Dean's profile, rendered as system state ----
const BOOT_LINES = [
  { text: 'BOOTING DE-OS v2.6 ...',                                     cls: 'dim2' },
  { text: 'MOUNTING /home/dean ...',                                    cls: 'dim2' },
  { text: '' },
  { text: '> USER: DEAN EDWARDS',                                       cls: '' },
  { text: '> ROLE: IT ENGINEER / FIELD ENGINEER',                       cls: '' },
  { text: '> LOCATION: WIGAN, UK',                                      cls: '' },
  { text: '> CLEARANCE: ACTIVE (UK SC)',                                cls: 'amber' },
  { text: '> EXPERIENCE: 8+ YEARS — SYSTEMS BUILD / ENDPOINT DEPLOY',   cls: '' },
  { text: '> LAST DEPLOYMENT: FUJITSU SERVICES — HMRC / HOME OFFICE',   cls: 'cyan' },
  { text: '' },
  { text: '[OK] BUILD REFERENCE LOADED: DE-EDW-0847',                   cls: 'amber' },
  { text: '[OK] AWAITING AUTHORIZATION ...',                            cls: 'dim2' },
];

const DECRYPTION_KEY = 'DE-EDW-0847';

// ---- Sound: synthesized, no audio files ----
let audioCtx = null;
let soundEnabled = false;

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function beep(freq, duration, type, vol) {
  if (!soundEnabled) return;
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type || 'square';
  osc.frequency.value = freq;
  gain.gain.value = vol || 0.05;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.stop(audioCtx.currentTime + duration);
}

const tick = () => beep(1200, 0.035, 'square', 0.04);
const chime = () => {
  beep(660, 0.14, 'sine', 0.06);
  setTimeout(() => beep(880, 0.16, 'sine', 0.06), 130);
};

const soundToggle = document.getElementById('sound-toggle');
soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  ensureAudio(); // must happen inside a user gesture — this click qualifies
  soundToggle.setAttribute('aria-pressed', String(soundEnabled));
  soundToggle.textContent = soundEnabled ? '🔊 SOUND' : '🔇 SOUND';
});

// ---- POST (power-on self test) sequence, played after a correct key ----
const POST_LINES = [
  { text: 'PORTFOLIO_OS v1.0 — POWER-ON SELF TEST', cls: 'amber' },
  { text: '' },
  { text: 'CPU ...................... PASS',              cls: 'ok', tick: true },
  { text: 'MEMORY (64GB) ............ PASS',              cls: 'ok', tick: true },
  { text: 'STORAGE ................... PASS',             cls: 'ok', tick: true },
  { text: 'NETWORK ADAPTER ........... PASS',              cls: 'ok', tick: true },
  { text: 'SECURITY MODULE ........... PASS (SC CLEARED)', cls: 'ok', tick: true },
  { text: '' },
  { text: 'LOADING PORTFOLIO_OS ...', cls: 'dim2' },
  { text: 'SYSTEM READY', cls: 'ready', chime: true },
];

function runPost(lines, onDone) {
  let i = 0;
  function next() {
    if (i >= lines.length) { setTimeout(onDone, 900); return; }
    const { text, cls, tick: doTick, chime: doChime } = lines[i];
    const span = document.createElement('div');
    if (cls) span.className = cls;
    span.textContent = text || '\u00A0';
    bootLog.appendChild(span);
    if (doTick) tick();
    if (doChime) chime();
    i++;
    setTimeout(next, text ? 260 + Math.random() * 120 : 120);
  }
  next();
}

const monitor   = document.getElementById('monitor');
const screen    = document.getElementById('screen');
const bootLog   = document.getElementById('boot-log');
const promptRow = document.getElementById('prompt-row');
const keyInput  = document.getElementById('key-input');
const feedback  = document.getElementById('feedback');
const accessGranted = document.getElementById('access-granted');
const accessDenied = document.getElementById('access-denied');
const sceneEl   = document.getElementById('scene');
const siteEl    = document.getElementById('site');

function typeLines(lines, onDone) {
  let i = 0;
  function next() {
    if (i >= lines.length) { setTimeout(onDone, 700); return; }
    const { text, cls } = lines[i];
    const span = document.createElement('div');
    if (cls) span.className = cls;
    span.textContent = text || '\u00A0';
    bootLog.appendChild(span);
    i++;
    setTimeout(next, text ? 220 + Math.random() * 140 : 90);
  }
  next();
}

function revealPrompt() {
  promptRow.hidden = false;
  keyInput.focus();
}

function checkKey() {
  const value = keyInput.value.trim().toUpperCase();
  if (value === DECRYPTION_KEY) {
    keyInput.disabled = true;
    promptRow.hidden = true;
    feedback.textContent = '';
    beep(520, 0.1, 'square', 0.05);

    accessGranted.classList.remove('fade-out');
    accessGranted.hidden = false;

    setTimeout(() => {
      accessGranted.classList.add('fade-out');
      setTimeout(() => {
        accessGranted.hidden = true;
        bootLog.innerHTML = '';
        screen.classList.remove('degauss');
        void screen.offsetWidth; // restart animation
        screen.classList.add('degauss');
        setTimeout(() => runPost(POST_LINES, enterSite), 500);
      }, 400);
    }, 1100);
  } else {
    feedback.textContent = 'ACCESS DENIED — KEY DOES NOT MATCH BUILD REFERENCE';
    feedback.className = 'deny';
    screen.classList.remove('shake');
    void screen.offsetWidth; // restart animation
    screen.classList.add('shake');
    keyInput.value = '';
    beep(160, 0.2, 'sawtooth', 0.05);

    accessDenied.classList.remove('fade-out');
    accessDenied.hidden = false;
    setTimeout(() => {
      accessDenied.classList.add('fade-out');
      setTimeout(() => { accessDenied.hidden = true; }, 400);
    }, 900);
  }
}

function enterSite() {
  sceneEl.classList.add('hidden');
  setTimeout(() => {
    sceneEl.remove();
    siteEl.hidden = false;
    siteEl.setAttribute('tabindex', '-1');
    siteEl.focus();
    const cubeNav = initCubeNavigation();
    const workGrid = initWorkGrid();
    const triangleNav = initTriangleNav((key) => workGrid && workGrid.show(key));
    const skillsNav = initSkillsSection();
    initSceneInput(cubeNav, triangleNav, skillsNav);
    initWorkMorph(workGrid);
    initStaticSection('about', 28, 0, 47, 'images/profile.jpg');
    initStaticSection('experience', 4, 45, 66);
    initStaticSection('contact', 28, 0);
    initSectionBackControl();
    initFbmBackground();
  }, 1000);
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Below this width there's no room for the cube/shape beside a text panel
// (see the matching `max-width: 760px` stacked-layout rules in style.css),
// so sections stack vertically instead of shifting left. Every section's
// "where does the shape/cube go while a panel is open" math reads this
// rather than hardcoding the desktop side-by-side layout.
const MOBILE_LAYOUT_BREAKPOINT = 760;
function isMobileLayout() { return window.innerWidth <= MOBILE_LAYOUT_BREAKPOINT; }

// Desktop shifts the cube/shape 27vw left to sit beside the docked panel;
// on mobile the panel docks below instead, so nothing needs to shift sideways.
function sectionShiftX() { return isMobileLayout() ? 0 : '-27vw'; }

// Where a section's resting shape (circle/hexagon/triangle/square) settles:
// beside the docked panel on desktop, or up near the top of the stacked
// panel on mobile.
function computeSectionRect() {
  if (isMobileLayout()) {
    const size = Math.min(0.5 * window.innerWidth, 220);
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight * 0.3;
    return { left: centerX - size / 2, top: centerY - size / 2, width: size, height: size };
  }
  const size = Math.min(0.46 * Math.min(window.innerWidth, window.innerHeight), 300);
  const centerX = window.innerWidth / 2 - 0.27 * window.innerWidth;
  const centerY = window.innerHeight / 2;
  return { left: centerX - size / 2, top: centerY - size / 2, width: size, height: size };
}

// Only one navigator drives scroll/touch/key input at a time; the section
// morphs flip this between them: 'cube' | 'work-triangle' | 'work-grid' |
// 'skills' | 'about' | 'experience' | 'contact'. currentFaceKey tracks the
// cube's front face so a morph knows when it's legal to trigger (only when
// its own face is the one currently showing).
let interactionMode = 'cube';

// Coarser than interactionMode — which top-level section (if any) owns the
// back button / Escape right now, regardless of how deep into it you are
// (e.g. still 'work' whether showing the triangle or the expanded grid).
let activeSection = null;

// Each section registers its own "step back one level" function here, keyed
// by its activeSection name, so the shared back button/Escape can dispatch
// without needing to know each section's internals.
const sectionGoBack = {};

function setSectionBackVisible(visible) {
  const btn = document.getElementById('section-back');
  if (btn) btn.classList.toggle('visible', visible);
}

function goBackOneLevel() {
  if (activeSection && sectionGoBack[activeSection]) sectionGoBack[activeSection]();
}

function initSectionBackControl() {
  const btn = document.getElementById('section-back');
  if (btn) btn.addEventListener('click', goBackOneLevel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeSection) goBackOneLevel();
  });
}

let currentFaceKey = 'home';

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// ---- Grayscale FBM (fractal brownian motion) backdrop: a WebGL shader that
// paints a slow-drifting, warped noise field behind everything else on the
// site. Ported in from fbm-background.js so the whole site is one script. ----
var VERT_FBM = 'attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }';

var FRAG_FBM = [
  'precision highp float;',
  'uniform vec2 uRes;',
  'uniform float uTime, uScale, uContrast, uWarp, uGrain, uVignette, uLight, uOctaves;',
  'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
  'float noise(vec2 p){',
  '  vec2 i = floor(p), f = fract(p);',
  '  vec2 u = f * f * (3.0 - 2.0 * f);',
  '  float a = hash(i), b = hash(i + vec2(1.0, 0.0));',
  '  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));',
  '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
  '}',
  'float fbm(vec2 p){',
  '  float v = 0.0, a = 0.5;',
  '  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);',
  '  for (int i = 0; i < 8; i++){',
  '    if (float(i) >= uOctaves) break;',
  '    v += a * noise(p);',
  '    p = rot * p * 2.02;',
  '    a *= 0.5;',
  '  }',
  '  return v;',
  '}',
  'void main(){',
  '  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y * uScale;',
  '  float t = uTime;',
  '  vec2 q = vec2(fbm(uv + vec2(0.0, 0.12 * t)), fbm(uv + vec2(5.2, 1.3) - 0.09 * t));',
  '  vec2 r = vec2(fbm(uv + uWarp * q + vec2(1.7, 9.2) + 0.14 * t),',
  '                fbm(uv + uWarp * q + vec2(8.3, 2.8) - 0.11 * t));',
  '  float f = fbm(uv + uWarp * r);',
  '  float v = clamp((f - 0.5) * uContrast + 0.5, 0.0, 1.0);',
  '  v = smoothstep(0.02, 0.98, v);',
  '  float detail = clamp(length(r) * 0.35, 0.0, 1.0);',
  '  v = mix(v, v * 0.82 + detail * 0.22, 0.5);',
  '  vec3 dark = mix(vec3(0.035), vec3(0.62), v);',
  '  vec3 light = mix(vec3(0.965), vec3(0.42), v);',
  '  vec3 col = mix(dark, light, uLight);',
  '  vec2 sv = (gl_FragCoord.xy - 0.5 * uRes) / uRes;',
  '  col *= clamp(1.0 - uVignette * dot(sv, sv) * 1.6, 0.0, 1.0);',
  '  col += (hash(gl_FragCoord.xy + fract(t) * 137.0) - 0.5) * uGrain;',
  '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
  '}'
].join('\n');

function FBMBackground(canvas, opts) {
  opts = opts || {};
  var o = {
    speed: opts.speed != null ? opts.speed : 0.35,
    warp: opts.warp != null ? opts.warp : 3.2,
    scale: opts.scale != null ? opts.scale : 2.6,
    octaves: opts.octaves != null ? opts.octaves : 5,
    contrast: opts.contrast != null ? opts.contrast : 1.5,
    grain: opts.grain != null ? opts.grain : 0.045,
    vignette: opts.vignette != null ? opts.vignette : 0.55,
    lightMode: !!opts.lightMode,
    resolution: opts.resolution != null ? opts.resolution : 1,
    pauseWhenHidden: opts.pauseWhenHidden !== false
  };

  var gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return null; // CSS background colour shows through

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s));
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT_FBM));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG_FBM));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var u = {};
  ['uRes', 'uTime', 'uScale', 'uContrast', 'uWarp', 'uGrain', 'uVignette', 'uLight', 'uOctaves']
    .forEach(function (n) { u[n] = gl.getUniformLocation(prog, n); });

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2) * o.resolution;
    var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  window.addEventListener('resize', resize);
  resize();

  var reduced = prefersReducedMotion;
  var clock = 0, last = performance.now(), raf = 0, running = true;

  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    clock += dt * (reduced ? 0 : o.speed);
    resize();
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uTime, clock);
    gl.uniform1f(u.uScale, o.scale);
    gl.uniform1f(u.uContrast, o.contrast);
    gl.uniform1f(u.uWarp, o.warp);
    gl.uniform1f(u.uGrain, o.grain);
    gl.uniform1f(u.uVignette, o.vignette);
    gl.uniform1f(u.uLight, o.lightMode ? 1 : 0);
    gl.uniform1f(u.uOctaves, o.octaves);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  function stop() { if (running) { cancelAnimationFrame(raf); running = false; } }
  function start() { if (!running) { last = performance.now(); raf = requestAnimationFrame(frame); running = true; } }

  if (o.pauseWhenHidden) {
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });
  }

  return {
    options: o, // mutate live, e.g. bg.options.speed = 0.8
    start: start,
    stop: stop,
    destroy: function () { stop(); window.removeEventListener('resize', resize); }
  };
}

function initFbmBackground() {
  const canvas = document.getElementById('fbm-bg');
  if (!canvas) return null;
  return FBMBackground(canvas, {
    speed: 0.35, warp: 3.2, scale: 2.6, contrast: 1.5,
    grain: 0.045, vignette: 0.55, lightMode: false
  });
}

// ---- Cube navigation: driven by wheel/touch/keyboard input routed in from
// initSceneInput, not real page scroll — the page itself never scrolls, only
// the cube (or, in triangle mode, the work-category selector) rotates. ----
function initCubeNavigation() {
  const cubeEl = document.getElementById('cube');
  const stage = document.getElementById('cube-stage');
  const panels = document.querySelectorAll('.face-panel');
  const dots = document.querySelectorAll('.progress button');
  if (!cubeEl || !stage) return null;

  const FACE_KEYS = ['home', 'work', 'about', 'skills', 'experience', 'contact'];

  if (typeof gsap === 'undefined') {
    // GSAP failed to load (e.g. offline) — fall back to click-only navigation,
    // no rotation, so the site still works rather than showing a dead cube.
    console.warn('GSAP unavailable — cube navigation falling back to click-only mode.');
    function showFaceFallback(i) {
      panels.forEach((p) => p.classList.toggle('active', p.dataset.panel === FACE_KEYS[i]));
      dots.forEach((d, di) => d.classList.toggle('active', di === i));
      currentFaceKey = FACE_KEYS[i];
    }
    dots.forEach((dot, i) => dot.addEventListener('click', () => showFaceFallback(i)));
    return null;
  }

  // Same "roll it like a die" approach as the reference cube: each segment only
  // touches one axis relative to the last, so every in-between orientation is a
  // real, undistorted cube pose — except left → bottom, which pitches and yaws
  // at once for a diagonal roll instead of two separate turns.
  const states = [
    { key: 'home',       rotateX: -90, rotateY: 0    }, // top
    { key: 'work',       rotateX: 0,   rotateY: 0    }, // front
    { key: 'about',      rotateX: 0,   rotateY: -90  }, // right
    { key: 'skills',     rotateX: 0,   rotateY: -180 }, // back
    { key: 'experience', rotateX: 0,   rotateY: -270 }, // left
    { key: 'contact',    rotateX: 90,  rotateY: -360 }, // bottom (diagonal from left)
  ];

  gsap.set(cubeEl, { rotateX: states[0].rotateX, rotateY: states[0].rotateY });

  // A paused timeline used purely as an interpolation reference — we scrub its
  // progress manually instead of tying it to ScrollTrigger and real scroll.
  const tl = gsap.timeline({ paused: true });
  for (let i = 1; i < states.length; i++) {
    tl.to(cubeEl, {
      rotateX: states[i].rotateX,
      rotateY: states[i].rotateY,
      duration: 1,
      ease: 'none',
    });
  }

  const segmentDurations = tl.getChildren().map((t) => t.duration());
  const totalDuration = segmentDurations.reduce((a, b) => a + b, 0);
  let cumulative = 0;
  const visibleThresholds = [0];
  segmentDurations.forEach((d) => { cumulative += d; visibleThresholds.push(cumulative); });

  let activeIndex = 0;

  function showFace(index) {
    const key = FACE_KEYS[index];
    currentFaceKey = key;
    panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === key));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
  }

  function applyProgress(p) {
    tl.progress(p);
    const t = p * totalDuration;
    let active = 0;
    visibleThresholds.forEach((threshold, i) => {
      if (t >= threshold - 0.001) active = i;
    });
    if (active !== activeIndex) {
      activeIndex = active;
      showFace(active);
    }
  }

  // Continuous spring-lerp: wheel/touch/keys only ever move `targetP`, and a
  // running rAF loop eases `currentP` toward it every frame. That's what makes
  // the rotation feel smooth and inertial instead of jumping straight to each
  // new value — input and motion are decoupled.
  let currentP = 0;
  let targetP = 0;
  const LERP_FACTOR = prefersReducedMotion ? 1 : 0.14;

  applyProgress(0);

  function renderLoop() {
    currentP += (targetP - currentP) * LERP_FACTOR;
    if (Math.abs(targetP - currentP) < 0.0004) currentP = targetP;
    applyProgress(currentP);
    requestAnimationFrame(renderLoop);
  }
  requestAnimationFrame(renderLoop);

  function nearestThreshold(p) {
    const t = p * totalDuration;
    let nearest = visibleThresholds[0];
    let minDist = Infinity;
    visibleThresholds.forEach((threshold) => {
      const d = Math.abs(t - threshold);
      if (d < minDist) { minDist = d; nearest = threshold; }
    });
    return nearest;
  }

  let settleTimer;
  function snapToNearest() {
    targetP = nearestThreshold(targetP) / totalDuration;
  }

  function nudge(deltaProgress) {
    targetP = Math.max(0, Math.min(1, targetP + deltaProgress));
    clearTimeout(settleTimer);
    settleTimer = setTimeout(snapToNearest, 140);
  }

  function goToIndex(index) {
    const clamped = Math.max(0, Math.min(visibleThresholds.length - 1, index));
    clearTimeout(settleTimer);
    targetP = visibleThresholds[clamped] / totalDuration;
  }

  // Tracks whether the visitor has driven the cube themselves yet — used to
  // cancel the one-time nudge demo below the moment real input arrives.
  let userInteracted = false;
  function markInteracted() { userInteracted = true; }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      interactionMode = 'cube';
      markInteracted();
      goToIndex(i);
    });
  });

  // One-time nudge demo: rock the cube part-way toward "Work" and back, so
  // scrolling reads as the obvious next move before anyone has to be told.
  if (!prefersReducedMotion) {
    setTimeout(() => {
      if (userInteracted || interactionMode !== 'cube') return;
      const peek = (visibleThresholds[1] / totalDuration) * 0.4;
      targetP = peek;
      setTimeout(() => {
        if (!userInteracted) targetP = 0;
      }, 650);
    }, 1600);
  }

  return {
    nudge,
    goToIndex,
    markInteracted,
    get activeIndex() { return activeIndex; },
  };
}

// ---- Work preview grid: per-category thumbnails shown docked beside the
// triangle, expanding to fill the screen once its header is clicked. Real
// media (images) open in the existing lightbox; stub items are placeholders
// for content that hasn't been added yet. ----
const WORK_CATEGORIES = {
  web: {
    label: 'Web',
    items: [
      { title: 'This portfolio', note: 'CRT boot sequence, cube nav, GSAP + WebGL backdrop.' },
      { title: 'Next web project', stub: true },
      { title: 'Next web project', stub: true },
      { title: 'Next web project', stub: true },
    ],
  },
  graphics: {
    label: 'Graphics',
    items: [
      { title: 'Two dogs — digital painting', image: 'images/1.jpg', alt: 'Digital painting of two white fluffy dogs sitting side by side' },
      { title: 'Portrait study', image: 'images/2.jpg', alt: 'Grayscale digital portrait of a young person wearing a patterned bandana' },
      { title: '3D wordmark render', image: 'images/3.png', alt: 'Stylized 3D-rendered graffiti lettering in a studio-lit scene' },
    ],
  },
  games: {
    label: 'Games',
    items: [
      { title: 'Unity project', stub: true },
      { title: 'Unity project', stub: true },
      { title: 'Unity project', stub: true },
      { title: 'Unity project', stub: true },
    ],
  },
};

function initWorkGrid() {
  const panel = document.getElementById('work-grid-panel');
  const titleEl = document.getElementById('work-grid-title');
  const gridEl = document.getElementById('work-grid');
  if (!panel || !titleEl || !gridEl) return null;

  function buildTile(item) {
    if (item.image) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'work-tile is-media';
      tile.innerHTML = `<img src="${item.image}" alt="${item.alt || item.title}" loading="lazy"><span class="work-tile-label">${item.title}</span>`;
      tile.addEventListener('click', () => openLightbox(item.image, item.alt || item.title, tile));
      return tile;
    }
    const tile = document.createElement('div');
    tile.className = item.stub ? 'work-tile stub' : 'work-tile info';
    tile.textContent = item.stub ? `// stub — ${item.title}` : item.title;
    return tile;
  }

  function show(key) {
    const category = WORK_CATEGORIES[key];
    if (!category) return;
    titleEl.textContent = category.label;
    gridEl.innerHTML = '';
    category.items.forEach((item) => gridEl.appendChild(buildTile(item)));
  }

  show('web');

  return { panelEl: panel, show };
}

// ---- Triangle navigation (the "Work" drill-down): a flat 2D selector that
// rotates 120° per step between three categories. Reuses the same
// target/current lerp pattern as the cube, but needs none of GSAP's timeline
// scrubbing since it's a single CSS rotate() rather than a multi-axis roll. ----
function initTriangleNav(onCategoryChange) {
  const rotor = document.getElementById('triangle-rotor');
  const labels = document.querySelectorAll('.tri-label');
  if (!rotor || typeof gsap === 'undefined') return null;

  const CATEGORY_KEYS = ['web', 'graphics', 'games'];
  const STEP_DEG = 120;
  const totalDuration = CATEGORY_KEYS.length - 1;

  let activeIndex = 0;
  let currentP = 0;
  let targetP = 0;
  const LERP_FACTOR = prefersReducedMotion ? 1 : 0.16;

  function showCategory(index) {
    if (index === activeIndex) return;
    activeIndex = index;
    labels.forEach((label) => label.classList.toggle('active', Number(label.dataset.index) === index));
    if (onCategoryChange) onCategoryChange(CATEGORY_KEYS[index]);
  }

  function applyProgress(p) {
    const t = p * totalDuration;
    rotor.style.transform = `rotate(${t * STEP_DEG}deg)`;
    showCategory(Math.round(t));
  }

  function renderLoop() {
    currentP += (targetP - currentP) * LERP_FACTOR;
    if (Math.abs(targetP - currentP) < 0.0004) currentP = targetP;
    applyProgress(currentP);
    requestAnimationFrame(renderLoop);
  }
  applyProgress(0);
  requestAnimationFrame(renderLoop);

  let settleTimer;
  function snapToNearest() {
    targetP = Math.round(targetP * totalDuration) / totalDuration;
  }

  // The triangle only has 2 gaps between its 3 states (vs. the cube's 5
  // between 6 faces), so the same wheel delta covers proportionally less
  // ground — boost it so a category change takes noticeably less scrolling.
  const SENSITIVITY_BOOST = 3;

  function nudge(deltaProgress) {
    targetP = Math.max(0, Math.min(1, targetP + deltaProgress * SENSITIVITY_BOOST));
    clearTimeout(settleTimer);
    settleTimer = setTimeout(snapToNearest, 140);
  }

  function goToIndex(index) {
    const clamped = Math.max(0, Math.min(CATEGORY_KEYS.length - 1, index));
    clearTimeout(settleTimer);
    targetP = clamped / totalDuration;
  }

  labels.forEach((label) => {
    label.addEventListener('click', () => goToIndex(Number(label.dataset.index)));
  });

  return {
    nudge,
    goToIndex,
    markInteracted() {},
    get activeIndex() { return activeIndex; },
  };
}

// ---- Shared input pipeline: wheel/touch/keys only ever talk to whichever
// navigator (cube, work-triangle, or skills-hexagon) currently owns
// `interactionMode`, so none of them fight over the same scroll gesture.
// Every other state ('work-grid', 'about', 'experience', 'contact') has no
// nav here — scroll just falls through to whatever's natively scrollable. ----
function initSceneInput(cubeNav, triangleNav, skillsNav) {
  const stage = document.getElementById('cube-stage');
  if (!stage) return;

  // Lower divisor = more sensitive: less scroll distance needed to flip a face.
  const WHEEL_SENSITIVITY = 1 / 1800;

  function activeNav() {
    if (interactionMode === 'work-triangle') return triangleNav;
    if (interactionMode === 'skills') return skillsNav;
    if (interactionMode === 'cube') return cubeNav;
    return null;
  }

  stage.addEventListener('wheel', (e) => {
    const nav = activeNav();
    if (!nav) return; // e.g. 'grid' mode — let native scroll work inside the expanded panel
    e.preventDefault();
    nav.markInteracted();
    nav.nudge(e.deltaY * WHEEL_SENSITIVITY);
  }, { passive: false });

  let touchStartY = null;
  stage.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  stage.addEventListener('touchmove', (e) => {
    if (touchStartY === null) return;
    const nav = activeNav();
    if (!nav) return; // e.g. 'grid' mode — let native scroll work inside the expanded panel
    e.preventDefault();
    nav.markInteracted();
    const currentY = e.touches[0].clientY;
    const deltaY = touchStartY - currentY;
    touchStartY = currentY;
    nav.nudge(deltaY * WHEEL_SENSITIVITY * 2.2); // touch drags need a bit more weight than wheel ticks
  }, { passive: false });

  stage.addEventListener('touchend', () => { touchStartY = null; });

  document.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
      const nav = activeNav();
      if (!nav) return;
      e.preventDefault();
      nav.markInteracted();
      nav.goToIndex(nav.activeIndex + 1);
    } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
      const nav = activeNav();
      if (!nav) return;
      e.preventDefault();
      nav.markInteracted();
      nav.goToIndex(nav.activeIndex - 1);
    }
  });
}

// ---- Work-face morph: clicking the cube's front-facing "Work" face slides
// it left, shrinks it away, and cross-fades in the flat triangle category
// selector plus its docked preview grid. From there, clicking the grid's
// header expands that category to fill the screen. Three states deep
// (cube -> triangle -> grid), stepped back one at a time via #section-back,
// Escape, or clicking the triangle. ----
function initWorkMorph(workGrid) {
  const workFace = document.querySelector('.face[data-face="work"]');
  const cubeScene = document.querySelector('.cube-slot');
  const triangleStage = document.getElementById('triangle-stage');
  const rotor = document.getElementById('triangle-rotor');
  const dotsWrap = document.querySelector('.progress');
  const gridHeader = document.getElementById('work-grid-header');
  const gridPanel = workGrid ? workGrid.panelEl : null;
  if (!workFace || !cubeScene || !triangleStage || !rotor || typeof gsap === 'undefined') return;

  gsap.set(triangleStage, { opacity: 0, scale: 1, x: sectionShiftX() });

  // ---- Fold proxy: a standalone SVG that stands in for the "Work" face
  // during the morph. It starts exactly over the real face, folds its square
  // silhouette in half into a right triangle (points collapse onto the
  // diagonal), then reshapes that into the equilateral triangle's
  // proportions while its container slides/shrinks to the final spot —
  // sliding left the whole time — before crossfading into the real,
  // interactive triangle. ----
  const proxy = document.createElement('div');
  proxy.className = 'work-morph-proxy';
  proxy.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><polygon></polygon></svg>';
  document.body.appendChild(proxy);
  const proxyPolygon = proxy.querySelector('polygon');

  const POINTS_RECT   = [[0, 0], [100, 0], [100, 100], [0, 100]];
  const POINTS_FOLDED = [[0, 0], [100, 100], [100, 100], [0, 100]];
  const POINTS_TRI    = [[50, 2], [98, 98], [98, 98], [2, 98]];

  function setPolygonPoints(points) {
    proxyPolygon.setAttribute('points', points.map((p) => p.join(',')).join(' '));
  }

  function lerpPoints(a, b, t) {
    return a.map((p, i) => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t]);
  }

  // Cached so the reverse (unfold) morph knows where the face rests at full
  // cube size — by the time you click back, the cube is shrunk/hidden, so
  // workFace.getBoundingClientRect() would return the wrong (tiny) rect.
  let cachedFaceRect = null;

  function runFoldMorph() {
    const from = workFace.getBoundingClientRect();
    cachedFaceRect = from;
    const to = computeSectionRect();

    gsap.set(proxy, {
      position: 'fixed', left: from.left, top: from.top, width: from.width, height: from.height,
      opacity: 1,
    });
    setPolygonPoints(POINTS_RECT);

    const fold = { t: 0 };
    const reshape = { t: 0 };

    gsap.timeline()
      .to(proxy, {
        left: to.left, top: to.top, width: to.width, height: to.height,
        duration: 0.8, ease: 'power2.inOut',
      }, 0)
      .to(fold, {
        t: 1, duration: 0.4, ease: 'power1.inOut',
        onUpdate: () => setPolygonPoints(lerpPoints(POINTS_RECT, POINTS_FOLDED, fold.t)),
      }, 0)
      .to(reshape, {
        t: 1, duration: 0.4, ease: 'power2.out',
        onUpdate: () => setPolygonPoints(lerpPoints(POINTS_FOLDED, POINTS_TRI, reshape.t)),
      }, 0.4)
      .to(proxy, { opacity: 0, duration: 0.15, ease: 'power1.out' }, 0.75);
  }

  function runUnfoldMorph() {
    const from = computeSectionRect();
    const to = cachedFaceRect || workFace.getBoundingClientRect();

    gsap.set(proxy, {
      position: 'fixed', left: from.left, top: from.top, width: from.width, height: from.height,
      opacity: 1,
    });
    setPolygonPoints(POINTS_TRI);

    const reshape = { t: 0 };
    const unfold = { t: 0 };

    gsap.timeline()
      .to(proxy, {
        left: to.left, top: to.top, width: to.width, height: to.height,
        duration: 0.8, ease: 'power2.inOut',
      }, 0)
      .to(reshape, {
        t: 1, duration: 0.4, ease: 'power1.inOut',
        onUpdate: () => setPolygonPoints(lerpPoints(POINTS_TRI, POINTS_FOLDED, reshape.t)),
      }, 0)
      .to(unfold, {
        t: 1, duration: 0.4, ease: 'power2.out',
        onUpdate: () => setPolygonPoints(lerpPoints(POINTS_FOLDED, POINTS_RECT, unfold.t)),
      }, 0.4)
      .to(proxy, { opacity: 0, duration: 0.15, ease: 'power1.out' }, 0.75);
  }

  function morphToTriangle() {
    if (interactionMode !== 'cube') return;
    interactionMode = 'work-triangle';
    activeSection = 'work';
    setSectionBackVisible(true);
    runFoldMorph();
    gsap.timeline()
      .set(triangleStage, { scale: 1 }, 0)
      .to(cubeScene, { x: sectionShiftX(), scale: 0.2, opacity: 0, duration: 0.7, ease: 'power2.inOut' }, 0)
      .to(dotsWrap, { opacity: 0, duration: 0.25, ease: 'power1.out' }, 0)
      .set(dotsWrap, { visibility: 'hidden' })
      .set(triangleStage, { pointerEvents: 'auto' }, 0.72)
      .fromTo(triangleStage,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: 'power1.out' },
        0.72);
    if (rotor) rotor.setAttribute('aria-label', 'View this category');
  }

  // ---- Selecting a category: the triangle alone owns scroll/touch while
  // browsing (see initSceneInput's activeNav — it only claims the wheel for
  // 'work-triangle'). Revealing the docked grid here, in a separate
  // 'work-selected' mode, means the wheel handler stops matching once it's
  // showing, so the gesture falls through to the grid's own native scroll
  // instead of also spinning the triangle underneath it. ----
  function selectCategory() {
    if (interactionMode !== 'work-triangle' || !gridPanel) return;
    interactionMode = 'work-selected';
    gridPanel.classList.add('visible');
    if (rotor) rotor.setAttribute('aria-label', 'Back to categories');
  }

  function deselectCategory() {
    if (interactionMode !== 'work-selected' || !gridPanel) return;
    interactionMode = 'work-triangle';
    gridPanel.classList.remove('visible');
    if (rotor) rotor.setAttribute('aria-label', 'View this category');
  }

  function morphToCube() {
    if (interactionMode !== 'work-triangle') return;
    interactionMode = 'cube';
    activeSection = null;
    setSectionBackVisible(false);
    runUnfoldMorph();
    gsap.timeline()
      .set(triangleStage, { pointerEvents: 'none' }, 0)
      .to(triangleStage, { opacity: 0, duration: 0.25, ease: 'power1.out' }, 0)
      .set(dotsWrap, { visibility: 'visible' }, 0.65)
      .to(dotsWrap, { opacity: 1, duration: 0.3, ease: 'power1.out' }, 0.7)
      .set(cubeScene, { x: 0, scale: 1 }, 0.72)
      .fromTo(cubeScene,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: 'power1.out' },
        0.72);
  }

  function enterGrid() {
    if (interactionMode !== 'work-selected' || !gridPanel) return;
    interactionMode = 'work-grid';
    gridPanel.classList.add('expanded');
    gsap.timeline()
      .to(triangleStage, { opacity: 0, scale: 0.7, duration: 0.4, ease: 'power2.inOut' }, 0)
      .set(triangleStage, { pointerEvents: 'none' });
  }

  function collapseGrid() {
    if (interactionMode !== 'work-grid' || !gridPanel) return;
    interactionMode = 'work-selected';
    gridPanel.classList.remove('expanded');
    gsap.timeline()
      .set(triangleStage, { pointerEvents: 'auto' })
      .to(triangleStage, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, 0.15);
  }

  function goBack() {
    if (interactionMode === 'work-grid') collapseGrid();
    else if (interactionMode === 'work-selected') deselectCategory();
    else if (interactionMode === 'work-triangle') morphToCube();
  }

  workFace.addEventListener('click', () => {
    if (currentFaceKey === 'work' && interactionMode === 'cube') morphToTriangle();
  });

  rotor.addEventListener('click', () => {
    if (interactionMode === 'work-triangle') selectCategory();
    else if (interactionMode === 'work-selected') deselectCategory();
  });
  if (gridHeader) gridHeader.addEventListener('click', enterGrid);

  sectionGoBack.work = goBack;
}

// ---- Shared geometry + fold-morph engine for the remaining cube faces
// (about/skills/experience/contact). Each face folds from a square into a
// shape — a circle (approximated with a many-sided polygon), a hexagon, or
// a square — while sliding left, using the same independent-per-point lerp
// trick as the Work triangle, generalized to any point count. ----

function regularPolygonPoints(sides, radius, rotationDeg) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI / 180) * (rotationDeg + (360 / sides) * i);
    pts.push([50 + radius * Math.cos(angle), 50 + radius * Math.sin(angle)]);
  }
  return pts;
}

// n points evenly spaced around a 0-100 square's perimeter, so they can be
// lerped point-for-point against an n-sided target shape.
function rectPerimeterPoints(n) {
  function pointAt(d) {
    if (d < 100) return [d, 0];
    if (d < 200) return [100, d - 100];
    if (d < 300) return [100 - (d - 200), 100];
    return [0, 100 - (d - 300)];
  }
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(pointAt((400 / n) * i));
  return pts;
}

function lerpShapePoints(a, b, t) {
  return a.map((p, i) => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t]);
}

// A standalone SVG proxy — independent of the Work triangle's own proxy —
// that stands in for whichever face is mid-morph. `stayVisible` lets it stay
// put afterward as the section's resting decorative shape: about/experience/
// contact don't need a separate persistent element, the proxy just becomes it.
function createSectionProxy() {
  const proxy = document.createElement('div');
  proxy.className = 'work-morph-proxy';
  proxy.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><polygon></polygon></svg>';
  document.body.appendChild(proxy);
  const polygon = proxy.querySelector('polygon');

  function setPoints(points) {
    polygon.setAttribute('points', points.map((p) => p.join(',')).join(' '));
  }

  function morph(fromRect, toRect, fromPoints, toPoints, opts) {
    opts = opts || {};
    const duration = opts.duration || 0.7;
    gsap.set(proxy, {
      position: 'fixed', left: fromRect.left, top: fromRect.top,
      width: fromRect.width, height: fromRect.height, opacity: 1,
    });
    setPoints(fromPoints);
    const p = { t: 0 };
    const tl = gsap.timeline()
      .to(proxy, {
        left: toRect.left, top: toRect.top, width: toRect.width, height: toRect.height,
        duration, ease: 'power2.inOut',
      }, 0)
      .to(p, {
        t: 1, duration, ease: 'power2.inOut',
        onUpdate: () => setPoints(lerpShapePoints(fromPoints, toPoints, p.t)),
      }, 0);
    if (!opts.stayVisible) {
      tl.to(proxy, { opacity: 0, duration: 0.15, ease: 'power1.out' }, Math.max(0, duration - 0.05));
    }
    return tl;
  }

  return { el: proxy, morph };
}

// ---- Decode-in text effect: reveals a string left-to-right, showing random
// glyphs in place of characters not yet "resolved". Used whenever a section
// panel's copy appears or changes, for a terminal-decrypt feel. ----
const DECODE_GLYPHS = '#$%&*+/<=>?@[]^_{|}~01';

function decodeReveal(el, text, opts = {}) {
  if (!el) return;
  if (typeof gsap === 'undefined' || prefersReducedMotion) {
    el.textContent = text;
    return;
  }
  const chars = text.split('');
  const len = chars.length;
  if (!len) { el.textContent = ''; return; }

  const msPerChar = opts.msPerChar ?? 16;
  const duration = Math.min(opts.maxDuration ?? 0.7, Math.max(opts.minDuration ?? 0.18, (len * msPerChar) / 1000));

  const state = { p: 0 };
  gsap.killTweensOf(state);
  gsap.fromTo(state, { p: 0 }, {
    p: 1,
    duration,
    delay: opts.delay || 0,
    ease: 'none',
    onUpdate: () => {
      const revealCount = Math.floor(state.p * len);
      let out = '';
      for (let i = 0; i < len; i++) {
        const c = chars[i];
        out += (i < revealCount || c === ' ' || c === '\n')
          ? c
          : DECODE_GLYPHS[(Math.random() * DECODE_GLYPHS.length) | 0];
      }
      el.textContent = out;
    },
    onComplete: () => { el.textContent = text; },
  });
}

// Snapshots the current text of each matched element (before anything is
// scrambled) so the reveal always has the real string to animate towards,
// then plays the decode with a small per-element stagger, top-to-bottom.
function prepareDecodeTargets(container, selector) {
  if (!container) return [];
  return [...container.querySelectorAll(selector)].map((el) => ({ el, text: el.textContent }));
}

function playDecode(targets, opts = {}) {
  const stagger = opts.stagger ?? 0.05;
  targets.forEach(({ el, text }, i) => {
    decodeReveal(el, text, { ...opts, delay: (opts.delay || 0) + i * stagger });
  });
}

// ---- About / Experience / Contact: single-tier sections with no rotation.
// The fold proxy morphs the face into the target shape and just stays there
// (stayVisible) as the resting decorative shape while its content panel
// shows on the center-right. Clicking the shape itself — or #section-back,
// or Escape — reverses the same morph back into the cube. `photoSrc` (only
// used for "about") turns the shape into a circular photo frame once settled. ----
function initStaticSection(key, sides, rotationDeg, radius, photoSrc) {
  const face = document.querySelector(`.face[data-face="${key}"]`);
  const cubeScene = document.querySelector('.cube-slot');
  const panel = document.getElementById(`${key}-panel`);
  const dotsWrap = document.querySelector('.progress');
  if (!face || !cubeScene || !panel || typeof gsap === 'undefined') return;

  const proxy = createSectionProxy();
  const shapePoints = regularPolygonPoints(sides, radius || 47, rotationDeg);
  const restPoints = rectPerimeterPoints(sides);
  proxy.el.style.cursor = 'pointer';

  let photoSlot = null;
  if (photoSrc) {
    photoSlot = document.createElement('div');
    photoSlot.className = 'proxy-photo-slot';
    photoSlot.innerHTML = `<img src="${photoSrc}" alt="Dean Edwards">`;
    proxy.el.appendChild(photoSlot);
  }

  const decodeTargets = prepareDecodeTargets(panel, 'h2, p, li, .date, .title, .contact-link');
  let cachedFaceRect = null;

  function morphIn() {
    if (interactionMode !== 'cube') return;
    interactionMode = key;
    activeSection = key;
    setSectionBackVisible(true);

    const from = face.getBoundingClientRect();
    cachedFaceRect = from;
    const to = computeSectionRect();
    const tl = proxy.morph(from, to, restPoints, shapePoints, { duration: 0.75, stayVisible: true });
    tl.set(proxy.el, { pointerEvents: 'auto' });
    if (photoSlot) tl.to(photoSlot, { opacity: 1, duration: 0.3, ease: 'power1.out' }, '-=0.15');

    gsap.timeline()
      .to(cubeScene, { x: sectionShiftX(), scale: 0.2, opacity: 0, duration: 0.7, ease: 'power2.inOut' }, 0)
      .to(dotsWrap, { opacity: 0, duration: 0.25, ease: 'power1.out' }, 0)
      .set(dotsWrap, { visibility: 'hidden' });

    panel.classList.add('visible');
    playDecode(decodeTargets, { delay: 0.35 });
  }

  function morphOut() {
    if (interactionMode !== key) return;
    interactionMode = 'cube';
    activeSection = null;
    setSectionBackVisible(false);
    panel.classList.remove('visible');
    gsap.set(proxy.el, { pointerEvents: 'none' });
    if (photoSlot) gsap.set(photoSlot, { opacity: 0 });

    const from = computeSectionRect();
    const to = cachedFaceRect || face.getBoundingClientRect();
    proxy.morph(from, to, shapePoints, restPoints, { duration: 0.75, stayVisible: false });

    gsap.timeline()
      .set(dotsWrap, { visibility: 'visible' }, 0.55)
      .to(dotsWrap, { opacity: 1, duration: 0.3, ease: 'power1.out' }, 0.6)
      .set(cubeScene, { x: 0, scale: 1 }, 0.6)
      .fromTo(cubeScene,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power1.out' },
        0.6);
  }

  face.addEventListener('click', () => {
    if (currentFaceKey === key && interactionMode === 'cube') morphIn();
  });

  proxy.el.addEventListener('click', () => {
    if (interactionMode === key) morphOut();
  });

  sectionGoBack[key] = morphOut;
}

// ---- Skills: a persistent, scroll-rotatable hexagon (like the triangle),
// paired with a content panel that pages through grouped skill text as you
// rotate. Reuses the fold-proxy for the one-time entry/exit morph, then
// hands off to its own real, interactive hexagon rotor. ----
const SKILLS_PAGES = [
  {
    title: 'Systems & Security',
    items: ['Active UK Security Clearance', 'Windows & Linux systems administration', 'Secure endpoint deployment & build'],
  },
  {
    title: 'Hardware & Support',
    items: ['Hardware testing, QA & fault diagnosis', 'Server & MFP maintenance (HP, IBM, Sun)', 'ServiceNow ticketing & SLA delivery'],
  },
  {
    title: 'Development',
    items: ['Scripting — Python, C#', 'Unity development'],
  },
];

function initSkillsSection() {
  const face = document.querySelector('.face[data-face="skills"]');
  const cubeScene = document.querySelector('.cube-slot');
  const dotsWrap = document.querySelector('.progress');
  const stage = document.getElementById('skills-stage');
  const rotor = document.getElementById('skills-rotor');
  const polygon = document.getElementById('skills-polygon');
  const panel = document.getElementById('skills-panel');
  const panelTitle = document.getElementById('skills-panel-title');
  const panelList = document.getElementById('skills-panel-list');
  const panelDots = document.getElementById('skills-panel-dots');
  if (!face || !cubeScene || !stage || !rotor || !polygon || !panel || typeof gsap === 'undefined') return null;

  const SIDES = 6;
  const STEP_DEG = 360 / SIDES;
  const totalDuration = SKILLS_PAGES.length - 1;
  const restPoints = regularPolygonPoints(SIDES, 47, -90);
  polygon.setAttribute('points', restPoints.map((p) => p.join(',')).join(' '));
  gsap.set(stage, { opacity: 0, x: sectionShiftX(), pointerEvents: 'none' });

  if (panelDots) {
    SKILLS_PAGES.forEach(() => {
      const dot = document.createElement('span');
      dot.className = 'dot';
      panelDots.appendChild(dot);
    });
  }

  function showPage(index, opts = {}) {
    const page = SKILLS_PAGES[index];
    panelTitle.textContent = page.title;
    panelList.innerHTML = '';
    page.items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      panelList.appendChild(li);
    });
    if (panelDots) {
      [...panelDots.children].forEach((dot, i) => dot.classList.toggle('active', i === index));
    }
    playDecode(
      [{ el: panelTitle, text: page.title }, ...page.items.map((item, i) => ({ el: panelList.children[i], text: item }))],
      opts,
    );
  }
  showPage(0);

  let activeIndex = 0;
  let currentP = 0;
  let targetP = 0;
  const LERP_FACTOR = prefersReducedMotion ? 1 : 0.16;

  function applyProgress(p) {
    const t = p * totalDuration;
    rotor.style.transform = `rotate(${t * STEP_DEG}deg)`;
    const idx = Math.round(t);
    if (idx !== activeIndex) {
      activeIndex = idx;
      showPage(idx);
    }
  }

  function renderLoop() {
    currentP += (targetP - currentP) * LERP_FACTOR;
    if (Math.abs(targetP - currentP) < 0.0004) currentP = targetP;
    applyProgress(currentP);
    requestAnimationFrame(renderLoop);
  }
  applyProgress(0);
  requestAnimationFrame(renderLoop);

  let settleTimer;
  function snapToNearest() {
    targetP = Math.round(targetP * totalDuration) / totalDuration;
  }
  function nudge(deltaProgress) {
    // Same sensitivity boost as the triangle — fewer sides in the rotation
    // range (2 gaps across 3 pages) means the same wheel delta needs a lift.
    targetP = Math.max(0, Math.min(1, targetP + deltaProgress * 3));
    clearTimeout(settleTimer);
    settleTimer = setTimeout(snapToNearest, 140);
  }
  function goToIndex(index) {
    const clamped = Math.max(0, Math.min(SKILLS_PAGES.length - 1, index));
    clearTimeout(settleTimer);
    targetP = clamped / totalDuration;
  }

  const proxy = createSectionProxy();
  const rectPoints = rectPerimeterPoints(SIDES);
  let cachedFaceRect = null;

  function morphIn() {
    if (interactionMode !== 'cube') return;
    interactionMode = 'skills';
    activeSection = 'skills';
    setSectionBackVisible(true);

    const from = face.getBoundingClientRect();
    cachedFaceRect = from;
    const to = computeSectionRect();
    proxy.morph(from, to, rectPoints, restPoints, { duration: 0.75, stayVisible: false });

    gsap.timeline()
      .to(cubeScene, { x: sectionShiftX(), scale: 0.2, opacity: 0, duration: 0.7, ease: 'power2.inOut' }, 0)
      .to(dotsWrap, { opacity: 0, duration: 0.25, ease: 'power1.out' }, 0)
      .set(dotsWrap, { visibility: 'hidden' })
      .set(stage, { pointerEvents: 'auto' }, 0.68)
      .fromTo(stage, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.out' }, 0.68);

    panel.classList.add('visible');
    showPage(activeIndex, { delay: 0.35 });
  }

  function morphOut() {
    if (interactionMode !== 'skills') return;
    interactionMode = 'cube';
    activeSection = null;
    setSectionBackVisible(false);
    panel.classList.remove('visible');

    const from = computeSectionRect();
    const to = cachedFaceRect || face.getBoundingClientRect();
    proxy.morph(from, to, restPoints, rectPoints, { duration: 0.75, stayVisible: false });

    gsap.timeline()
      .set(stage, { pointerEvents: 'none' }, 0)
      .to(stage, { opacity: 0, duration: 0.25, ease: 'power1.out' }, 0)
      .set(dotsWrap, { visibility: 'visible' }, 0.6)
      .to(dotsWrap, { opacity: 1, duration: 0.3, ease: 'power1.out' }, 0.65)
      .set(cubeScene, { x: 0, scale: 1 }, 0.68)
      .fromTo(cubeScene, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.out' }, 0.68);
  }

  face.addEventListener('click', () => {
    if (currentFaceKey === 'skills' && interactionMode === 'cube') morphIn();
  });
  rotor.addEventListener('click', morphOut);

  sectionGoBack.skills = morphOut;

  return {
    nudge,
    goToIndex,
    markInteracted() {},
    get activeIndex() { return activeIndex; },
  };
}

keyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') checkKey();
});

// ---- Lightbox: click a project image to view it enlarged over a dimmed backdrop ----
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxClose = document.getElementById('lightbox-close');
let lastFocused = null;

function openLightbox(src, alt, triggerEl) {
  lastFocused = triggerEl || document.activeElement;
  lightboxImg.src = src;
  lightboxImg.alt = alt || '';
  lightboxCaption.textContent = alt || '';
  lightbox.hidden = false;
  lightboxClose.focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImg.src = '';
  if (lastFocused) lastFocused.focus();
}

document.querySelectorAll('.project-image').forEach((img) => {
  img.setAttribute('role', 'button');
  img.setAttribute('tabindex', '0');
  if (!img.hasAttribute('aria-label')) {
    img.setAttribute('aria-label', 'View larger: ' + (img.alt || 'image'));
  }
  img.addEventListener('click', () => openLightbox(img.src, img.alt, img));
  img.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openLightbox(img.src, img.alt, img);
    }
  });
});

lightboxClose.addEventListener('click', closeLightbox);

// Clicking the dimmed backdrop (not the image itself) closes it
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
});
const filterButtons = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;

    filterButtons.forEach((b) => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', String(b === btn));
    });

    projectCards.forEach((card) => {
      const match = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('hidden-by-filter', !match);
    });
  });
});

// ---- Sequence: pause -> zoom into monitor -> type boot log -> reveal prompt ----
window.addEventListener('load', () => {
  setTimeout(() => {
    monitor.classList.add('zoomed');
    setTimeout(() => typeLines(BOOT_LINES, revealPrompt), 2500);
  }, 700);
});