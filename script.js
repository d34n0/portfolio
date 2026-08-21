import * as THREE from 'three';
import {
  buildPyramidMesh, buildCubeMesh, buildFlatPolygonMesh, createShapeNavigator,
  projectToCanvasPx, raycastFaceIndex,
} from './three-nav.js';

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
    if (i >= lines.length) { setTimeout(onDone, 400); return; }
    const { text, cls, tick: doTick, chime: doChime } = lines[i];
    const span = document.createElement('div');
    if (cls) span.className = cls;
    span.textContent = text || '\u00A0';
    bootLog.appendChild(span);
    if (doTick) tick();
    if (doChime) chime();
    i++;
    setTimeout(next, text ? 110 + Math.random() * 60 : 50);
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
    if (i >= lines.length) { setTimeout(onDone, 300); return; }
    const { text, cls } = lines[i];
    const span = document.createElement('div');
    if (cls) span.className = cls;
    span.textContent = text || '\u00A0';
    bootLog.appendChild(span);
    i++;
    setTimeout(next, text ? 90 + Math.random() * 60 : 40);
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
        setTimeout(() => runPost(POST_LINES, enterSite), 250);
      }, 400);
    }, 550);
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
    }, 500);
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
    const skillsNav = initSkillsSection(cubeNav);
    initSceneInput(cubeNav, triangleNav, skillsNav);
    initWorkMorph(workGrid, triangleNav);
    initStaticSection('about', 28, 0, 47, 'images/profile.jpg');
    initStaticSection('experience', 4, 45, 66);
    initStaticSection('contact', 28, 0);
    initSectionBackControl();
    initFbmBackground();
  }, 500); // matches #scene's opacity transition duration in style.css
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

// How far a section's shape moves to dock beside (desktop) or above
// (mobile) its content panel — used both by Work's docked-grid shift and by
// About/Experience/Contact's entry/exit shape animation.
function sectionShiftVector() {
  return isMobileLayout() ? { x: 0, y: '-20vh' } : { x: '-27vw', y: 0 };
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
// the cube (or, in triangle mode, the work-category selector) rotates. Now a
// real Three.js BoxGeometry (see buildCubeMesh, three-nav.js) instead of 6
// separately-stroked CSS-3D divs — a welded mesh has no seam between faces.
// The 6 original .face divs stay in the DOM as invisible placeholders purely
// so initWorkMorph/initStaticSection/initSkillsSection's existing
// getBoundingClientRect()/click() wiring keeps working completely
// unchanged; this function dispatches a synthetic .click() to the right one
// after resolving a raycast hit, rather than those modules raycasting
// themselves. ----
function initCubeNavigation() {
  const container = document.querySelector('.scene');
  const stage = document.getElementById('cube-stage');
  const panels = document.querySelectorAll('.face-panel');
  const dots = document.querySelectorAll('.progress button');
  const labelWrap = document.querySelector('.cube-labels');
  if (!container || !stage || !labelWrap) return null;

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

  const deg = THREE.MathUtils.degToRad;
  // Same "roll it like a die" states as before — home → work and skills →
  // experience pitch and yaw at once for a diagonal roll instead of a flat
  // single-axis turn. These numeric values are unchanged from the CSS
  // version (just degrees→radians), so the roll feels identical.
  const states = [
    { key: 'home',       rotation: { x: deg(-90), y: 0 } },
    { key: 'work',       rotation: { x: 0, y: deg(-90) } },
    { key: 'about',      rotation: { x: 0, y: deg(-180) } },
    { key: 'skills',     rotation: { x: 0, y: deg(-270) } },
    { key: 'experience', rotation: { x: deg(90), y: deg(-360) } },
    { key: 'contact',    rotation: { x: 0, y: deg(-360) } },
  ];

  // Which BoxGeometry material group (Three.js's fixed +x,-x,+y,-y,+z,-z
  // order) each key lands on — derived by solving, for each state above,
  // which local box direction ends up facing the camera once that exact
  // rotation is applied (rather than guessed and then reverse-fitted), so
  // the states array above can stay numerically identical to the old CSS
  // version's tuned values.
  const BOX_ORDER_KEYS = ['work', 'skills', 'experience', 'home', 'contact', 'about'];

  const built = buildCubeMesh({ container, faceKeysByBoxOrder: BOX_ORDER_KEYS });
  const canvas = built.canvas;
  canvas.setAttribute('role', 'button');
  canvas.setAttribute('tabindex', '0');

  const labelEls = {};
  labelWrap.querySelectorAll('.face-label-group').forEach((el) => { labelEls[el.dataset.face] = el; });

  let activeIndexRef = 0;

  function showFace(index, key) {
    activeIndexRef = index;
    currentFaceKey = key;
    panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === key));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
    canvas.setAttribute('aria-label', key === 'home' ? 'Dean Edwards — Web Design & Development' : `${key} face`);
  }
  showFace(0, FACE_KEYS[0]);

  // Flat 2D text can't foreshorten the way the rotating 3D face under it
  // does, so continuously re-projecting a label mid-roll made it visibly
  // detach from the face's shrinking/skewing silhouette. Instead: hide every
  // label during transit, and once the roll settles on a face, decode its
  // text into place (same terminal-decrypt effect as the About Me panel —
  // see decodeReveal/prepareDecodeTargets/playDecode) rather than just
  // snapping opacity to 1.
  // shownKey tracks the last face that finished a full decode-reveal, kept
  // separate from "currently hidden for transit" — a brief unsettle that
  // lands back on the SAME face (e.g. the nudge demo below rocking partway
  // toward "work" and back) should just re-show the already-decoded text,
  // not replay the scramble from scratch. Re-scrambling only makes sense
  // when the active face has genuinely changed.
  let shownKey = null;
  let hiddenForTransit = false;
  function playFaceDecode(key) {
    const el = labelEls[key];
    if (!el) return;
    playDecode(prepareDecodeTargets(el, '.face-label, .face-subtitle'), { stagger: 0.04 });
  }

  function updateLabels(_currentP, activeIndex, settled) {
    if (!settled) {
      if (!hiddenForTransit) {
        Object.values(labelEls).forEach((el) => { el.style.opacity = '0'; });
        hiddenForTransit = true;
      }
      return;
    }
    hiddenForTransit = false;
    const activeKey = states[activeIndex].key;
    const face = built.facesByKey[activeKey];
    const el = labelEls[activeKey];
    if (!face || !el) return;
    const px = projectToCanvasPx(face.center, built.spinGroup, built.camera, canvas);
    if (px) { el.style.left = `${px.x}px`; el.style.top = `${px.y}px`; }
    if (shownKey !== activeKey) {
      Object.values(labelEls).forEach((other) => { if (other !== el) other.style.opacity = '0'; });
      el.style.opacity = '1';
      playFaceDecode(activeKey);
      shownKey = activeKey;
    } else {
      el.style.opacity = '1';
    }
  }

  const nav = createShapeNavigator({
    scene: built.scene,
    camera: built.camera,
    renderer: built.renderer,
    spinGroup: built.spinGroup,
    states,
    lerpFactor: prefersReducedMotion ? 1 : 0.14,
    onFaceChange: showFace,
    onFrame: updateLabels,
  });
  updateLabels(0, 0, true);

  // A click anywhere on the cube canvas raycasts to find which physical
  // face was actually hit (two faces can be simultaneously clickable
  // during a roll), then dispatches a real .click() to the matching
  // invisible placeholder div — every existing per-section click handler
  // (initWorkMorph, initStaticSection, initSkillsSection) keeps listening
  // on those exact elements, completely unchanged.
  canvas.addEventListener('click', (e) => {
    // While tilted into the skills hexagon, the cube isn't showing any of
    // its 6 named faces — a raycast hit here wouldn't resolve to a
    // meaningful key. Route straight to the skills section's own exit
    // instead (same "click the shape to go back" gesture every other
    // section uses).
    if (interactionMode === 'skills') {
      if (sectionGoBack.skills) sectionGoBack.skills();
      return;
    }
    const idx = raycastFaceIndex(e, canvas, built.camera, built.mesh);
    if (idx === null) return;
    const key = BOX_ORDER_KEYS[idx];
    const placeholder = document.querySelector(`#cube .face[data-face="${key}"]`);
    if (placeholder) placeholder.click();
  });

  // Tracks whether the visitor has driven the cube themselves yet — used to
  // cancel the one-time nudge demo below the moment real input arrives.
  let userInteracted = false;
  function markInteracted() { userInteracted = true; }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      interactionMode = 'cube';
      markInteracted();
      nav.goToIndex(i);
    });
  });

  // One-time nudge demo: rock the cube part-way toward "Work" and back, so
  // scrolling reads as the obvious next move before anyone has to be told.
  if (!prefersReducedMotion) {
    setTimeout(() => {
      if (userInteracted || interactionMode !== 'cube') return;
      const peek = (1 / (states.length - 1)) * 0.4;
      nav.setProgressRaw(peek);
      setTimeout(() => {
        if (!userInteracted) nav.setProgressRaw(0);
      }, 650);
    }, 1600);
  }

  return {
    nudge: nav.nudge,
    goToIndex: nav.goToIndex,
    markInteracted,
    get activeIndex() { return activeIndexRef; },
    // Exposed for the skills section, which drives this same cube mesh
    // (tilting it to a hexagon-look pose in place, then docking it left)
    // instead of building a separate shape — see initSkillsSection.
    built,
    nav,
    canvas,
    cubeScene: document.querySelector('.cube-slot'),
    skillsFaceRotation: states.find((s) => s.key === 'skills').rotation,
    skillsIndex: states.findIndex((s) => s.key === 'skills'),
    hideLabelsForTilt() {
      Object.values(labelEls).forEach((el) => { el.style.opacity = '0'; });
      shownKey = null;
      hiddenForTransit = true;
    },
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

// ---- Triangle navigation (the "Work" drill-down): a real Three.js
// tetrahedron (see buildPyramidMesh in three-nav.js) rolled through 4 states
// — Web/Graphics/Games/Back — via the same lerp-driven scroll/touch pattern
// as the cube, now scrubbing a mesh rotation directly instead of a paused
// GSAP timeline. Each state's elevation cancels the side faces' own outward
// tilt so they land flat on the camera; "Back" is the odd one out — the base
// doesn't sit on that same yaw carousel, so reaching it needs its own X
// tilt too. ----
function initTriangleNav(onCategoryChange) {
  const container = document.querySelector('#triangle-stage .tri-wrap');
  const labelWrap = document.querySelector('.pyramid-labels');
  if (!container || !labelWrap || typeof gsap === 'undefined') return null;

  const CATEGORY_KEYS = ['web', 'graphics', 'games', 'back'];
  const labelEls = {};
  labelWrap.querySelectorAll('.pyramid-face-label').forEach((el) => { labelEls[el.dataset.face] = el; });

  const deg = THREE.MathUtils.degToRad;
  // A side face's local normal (post rotateY fix in buildPyramidMesh) is
  // (0, sin(19.4712deg), cos(19.4712deg)) — tilted up by that amount from
  // dead-on. Rx(theta) couples y/z rather than simply cancelling the y
  // component, so the angle that actually zeroes it out is theta itself
  // (POSITIVE, not the negated angle it looks like you'd want): solving
  // y*cos(theta) - z*sin(theta) = 0 for this normal gives theta = +19.4712deg.
  // Verified numerically (not hand-derived) via a discoverFaces + matrixWorld
  // dot-product check: at this angle the front face reaches dot=1.0 exactly
  // against the camera, and all 3 other faces land at dot=-1/3, the true
  // regular-tetrahedron dihedral value — confirming a clean single-face-on
  // view with no other geometry peeking into the silhouette.
  const ELEVATION = deg(19.4712);
  // "Back" (the base cap) needs the base's local normal (0,-1,0) rotated to
  // (0,0,1). Solving the same Rx equations for that normal gives exactly
  // -90deg, independent of ELEVATION — confirmed numerically the same way:
  // dot=1.0 for the base, dot=-1/3 for all 3 side faces.
  const BACK_TILT = deg(-90);
  // The base cap has no single "apex" vertex the way a side face does (it's
  // just the 3 rim corners, symmetric under 120deg yaw) — so which of its 3
  // corners ends up pointing "up" on screen is a free choice, set entirely by
  // the yaw used before applying BACK_TILT. yaw=-360 (matching 'web') put a
  // rim EDGE on top and a corner pointing down — upside-down relative to the
  // other 3 faces' apex-up look. Verified numerically by projecting the base
  // cap's 3 corners to NDC across a yaw sweep: -300deg is the one value in
  // that sweep whose vertex pattern exactly matches 'web' face's own
  // (single vertex at NDC (0,+0.777), the other two at (+-0.673,-0.389)).
  const states = [
    { key: 'web',      rotation: { x: ELEVATION, y: 0 } },
    { key: 'graphics', rotation: { x: ELEVATION, y: deg(-120) } },
    { key: 'games',    rotation: { x: ELEVATION, y: deg(-240) } },
    { key: 'back',     rotation: { x: BACK_TILT,  y: deg(-300) } },
  ];

  // states must exist before this call — buildPyramidMesh resolves each
  // state's actual front-facing mesh face by applying its rotation and
  // checking real dot products, not by a static ahead-of-time sort.
  const built = buildPyramidMesh({ container, states });
  const pyramid = built.canvas;
  pyramid.id = 'pyramid';
  pyramid.setAttribute('role', 'button');
  pyramid.setAttribute('tabindex', '-1');
  pyramid.setAttribute('aria-label', 'Web');

  function showCategory(index, key) {
    pyramid.setAttribute('aria-label', key === 'back' ? 'Back to cube' : `View ${key} category`);
    if (key !== 'back' && onCategoryChange) onCategoryChange(key);
  }

  // Same reasoning as the cube's labels: flat 2D text can't foreshorten with
  // the rotating 3D face under it, so keep it hidden during transit and
  // decode it into place (see decodeReveal/prepareDecodeTargets/playDecode,
  // same effect as the About Me panel) once a face settles as active.
  // See the cube's identical shownKey/hiddenForTransit split — a brief
  // unsettle that lands back on the same face shouldn't replay the scramble.
  let shownKey = null;
  let hiddenForTransit = false;
  function playFaceDecode(key) {
    const el = labelEls[key];
    if (!el) return;
    // Unlike the cube's .face-label-group wrapper (which holds separate
    // .face-label/.face-subtitle children), each pyramid label is a single
    // leaf span — decode it directly rather than hunting for children.
    decodeReveal(el, el.textContent);
  }

  function updateLabels(_currentP, activeIndex, settled) {
    if (!settled) {
      if (!hiddenForTransit) {
        Object.values(labelEls).forEach((el) => { el.style.opacity = '0'; });
        hiddenForTransit = true;
      }
      return;
    }
    hiddenForTransit = false;
    const key = CATEGORY_KEYS[activeIndex];
    const face = built.facesByKey[key];
    const el = labelEls[key];
    if (!face || !el) return;
    const px = projectToCanvasPx(face.centroid, built.spinGroup, built.camera, pyramid);
    if (px) { el.style.left = `${px.x}px`; el.style.top = `${px.y}px`; }
    if (shownKey !== key) {
      Object.values(labelEls).forEach((other) => { if (other !== el) other.style.opacity = '0'; });
      el.style.opacity = '1';
      playFaceDecode(key);
      shownKey = key;
    } else {
      el.style.opacity = '1';
    }
  }

  const nav = createShapeNavigator({
    scene: built.scene,
    camera: built.camera,
    renderer: built.renderer,
    spinGroup: built.spinGroup,
    states,
    lerpFactor: prefersReducedMotion ? 1 : 0.16,
    // 3 gaps between the pyramid's 4 states (vs. the cube's 5 between 6
    // faces), so the same wheel delta covers proportionally less ground —
    // boost it so a category change takes noticeably less scrolling.
    sensitivityBoost: 2,
    onFaceChange: showCategory,
    onFrame: updateLabels,
  });
  updateLabels(0, 0, true);

  return {
    nudge: nav.nudge,
    goToIndex: nav.goToIndex,
    markInteracted() {},
    get activeIndex() { return nav.activeIndex; },
    get activeKey() { return nav.activeKey; },
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
// it left, shrinks it away, and cross-fades in the 3D pyramid category
// selector plus its docked preview grid. From there, clicking the grid's
// header expands that category to fill the screen. Three states deep
// (cube -> pyramid -> grid), stepped back one at a time via #section-back,
// Escape, or clicking the pyramid — except landing on its "Back" face, which
// clicks straight through to the cube, no separate button needed. ----
function initWorkMorph(workGrid, triangleNav) {
  const workFace = document.querySelector('.face[data-face="work"]');
  const cubeScene = document.querySelector('.cube-slot');
  const triangleStage = document.getElementById('triangle-stage');
  const pyramid = document.getElementById('pyramid');
  const dotsWrap = document.querySelector('.progress');
  const gridHeader = document.getElementById('work-grid-header');
  const gridPanel = workGrid ? workGrid.panelEl : null;
  if (!workFace || !cubeScene || !triangleStage || !pyramid || typeof gsap === 'undefined') return;

  // ---- Real-3D handoff: no flat 2D stand-in shape. #cube-stage and
  // #triangle-stage are both position:absolute;inset:0 flex-centered panes
  // (style.css), so they already sit at the exact same screen center —
  // nothing needs to slide into place. The cube (still a live, spinning
  // WebGL mesh) shrinks/spins/fades away while the real pyramid mesh grows/
  // spins/fades in on top of it, both running at once, so the shape stays
  // dimensional for the entire transition instead of collapsing through a
  // flat SVG triangle for most of it (the previous fold-proxy's actual
  // on-screen behavior, confirmed via frame-by-frame screenshots). ----
  gsap.set(triangleStage, { opacity: 0, scale: 0.2, rotation: -420, x: 0, y: 0 });

  function morphToTriangle() {
    if (interactionMode !== 'cube') return;
    interactionMode = 'work-triangle';
    activeSection = 'work';
    // Always re-enter on "Web", not wherever a previous visit left it
    // rotated to.
    if (triangleNav) triangleNav.goToIndex(0);
    // No visible back button while just browsing the pyramid — landing on
    // its "Back" face and clicking does the same job. It reappears once a
    // category is selected (see selectCategory()), since the pyramid's own
    // rotation no longer doubles as an exit from that point.
    gsap.set(triangleStage, { scale: 0.2, rotation: -420, opacity: 0 });
    gsap.timeline()
      .to(cubeScene, { scale: 0.15, rotation: 420, opacity: 0, duration: 0.7, ease: 'power2.inOut' }, 0)
      .set(triangleStage, { pointerEvents: 'auto' }, 0)
      .to(triangleStage, { scale: 1, rotation: 0, opacity: 1, duration: 0.7, ease: 'power2.inOut' }, 0.08)
      .to(dotsWrap, { opacity: 0, duration: 0.25, ease: 'power1.out' }, 0)
      .set(dotsWrap, { visibility: 'hidden' });
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
    setSectionBackVisible(true);
    const shift = sectionShiftVector();
    gsap.to(triangleStage, { x: shift.x, y: shift.y, duration: 0.6, ease: 'power2.inOut' });
    gridPanel.classList.add('visible');
  }

  function deselectCategory() {
    if (interactionMode !== 'work-selected' || !gridPanel) return;
    interactionMode = 'work-triangle';
    setSectionBackVisible(false);
    gsap.to(triangleStage, { x: 0, y: 0, duration: 0.6, ease: 'power2.inOut' });
    gridPanel.classList.remove('visible');
  }

  function morphToCube() {
    if (interactionMode !== 'work-triangle') return;
    interactionMode = 'cube';
    activeSection = null;
    setSectionBackVisible(false);
    // Exact mirror of morphToTriangle: the pyramid now plays the "exit"
    // role (shrink/spin/fade away) and the cube plays the "entrance" role
    // (grow/spin/fade in) — same real-3D handoff, no flat proxy shape.
    gsap.set(cubeScene, { scale: 0.15, rotation: -420, opacity: 0 });
    gsap.timeline()
      .set(triangleStage, { pointerEvents: 'none' }, 0)
      .to(triangleStage, { scale: 0.15, rotation: 420, opacity: 0, duration: 0.7, ease: 'power2.inOut' }, 0)
      .to(cubeScene, { scale: 1, rotation: 0, opacity: 1, duration: 0.7, ease: 'power2.inOut' }, 0.08)
      .set(dotsWrap, { visibility: 'visible' }, 0.65)
      .to(dotsWrap, { opacity: 1, duration: 0.3, ease: 'power1.out' }, 0.7);
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

  pyramid.addEventListener('click', () => {
    if (interactionMode === 'work-triangle') {
      if (triangleNav && triangleNav.activeKey === 'back') morphToCube();
      else selectCategory();
    } else if (interactionMode === 'work-selected') {
      deselectCategory();
    }
  });
  if (gridHeader) gridHeader.addEventListener('click', enterGrid);

  sectionGoBack.work = goBack;
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

// ---- About / Experience / Contact: single-tier sections with no rotation,
// each with its own real WebGL flat shape (a many-sided polygon reads as a
// circle, a 4-sided one as a square — see buildFlatPolygonMesh) that docks
// beside its content panel. Real-3D handoff, same as Work: the cube shrinks/
// spins/fades away while the section's shape grows/spins/fades in already
// heading toward its docked spot, both live meshes the whole time rather
// than a flat SVG standing in permanently as the resting decoration (the
// previous approach — see morph history for why that read as flat/mismatched
// next to the cube/pyramid/hexagon, and for the fill color drifting from a
// separately-maintained CSS var instead of sharing the meshes' own color
// path). `photoSrc` (only used for "about") overlays a circular photo crop
// on top of the shape once it settles. ----
function initStaticSection(key, sides, rotationDeg, radius, photoSrc) {
  const face = document.querySelector(`.face[data-face="${key}"]`);
  const cubeScene = document.querySelector('.cube-slot');
  const stage = document.getElementById(`${key}-stage`);
  const stageWrap = stage ? stage.querySelector('.tri-wrap') : null;
  const panel = document.getElementById(`${key}-panel`);
  const dotsWrap = document.querySelector('.progress');
  if (!face || !cubeScene || !stage || !stageWrap || !panel || typeof gsap === 'undefined') return;

  buildFlatPolygonMesh({ container: stageWrap, sides, rotationDeg, radius: (radius || 47) / 47 });
  stage.style.cursor = 'pointer';

  let photoSlot = null;
  if (photoSrc) {
    photoSlot = document.createElement('div');
    photoSlot.className = 'proxy-photo-slot';
    photoSlot.innerHTML = `<img src="${photoSrc}" alt="Dean Edwards">`;
    stageWrap.appendChild(photoSlot);
    gsap.set(photoSlot, { opacity: 0 });
  }

  const decodeTargets = prepareDecodeTargets(panel, 'h2, p, li, .date, .title, .contact-link');

  gsap.set(stage, { opacity: 0, scale: 0.2, rotation: -420, x: 0, y: 0 });

  function morphIn() {
    if (interactionMode !== 'cube') return;
    interactionMode = key;
    activeSection = key;
    setSectionBackVisible(true);

    const shift = sectionShiftVector();
    gsap.set(stage, { scale: 0.2, rotation: -420, opacity: 0, x: 0, y: 0, pointerEvents: 'auto' });
    gsap.set(cubeScene, { scale: 1, rotation: 0, opacity: 1 });
    const tl = gsap.timeline()
      .to(cubeScene, { x: shift.x, y: shift.y, scale: 0.15, rotation: 420, opacity: 0, duration: 0.7, ease: 'power2.inOut' }, 0)
      .to(stage, { scale: 1, rotation: 0, opacity: 1, x: shift.x, y: shift.y, duration: 0.7, ease: 'power2.inOut' }, 0.08)
      .to(dotsWrap, { opacity: 0, duration: 0.25, ease: 'power1.out' }, 0)
      .set(dotsWrap, { visibility: 'hidden' });
    if (photoSlot) tl.to(photoSlot, { opacity: 1, duration: 0.3, ease: 'power1.out' }, '-=0.2');

    panel.classList.add('visible');
    playDecode(decodeTargets, { delay: 0.35 });
  }

  function morphOut() {
    if (interactionMode !== key) return;
    interactionMode = 'cube';
    activeSection = null;
    setSectionBackVisible(false);
    panel.classList.remove('visible');
    gsap.set(stage, { pointerEvents: 'none' });
    if (photoSlot) gsap.set(photoSlot, { opacity: 0 });

    const shift = sectionShiftVector();
    gsap.set(cubeScene, { x: shift.x, y: shift.y, scale: 0.15, rotation: -420, opacity: 0 });
    gsap.timeline()
      .to(stage, { scale: 0.2, rotation: 420, opacity: 0, x: 0, y: 0, duration: 0.7, ease: 'power2.inOut' }, 0)
      .to(cubeScene, { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, duration: 0.7, ease: 'power2.inOut' }, 0.08)
      .set(dotsWrap, { visibility: 'visible' }, 0.65)
      .to(dotsWrap, { opacity: 1, duration: 0.3, ease: 'power1.out' }, 0.7);
  }

  face.addEventListener('click', () => {
    if (currentFaceKey === key && interactionMode === 'cube') morphIn();
  });

  stage.addEventListener('click', () => {
    if (interactionMode === key) morphOut();
  });

  sectionGoBack[key] = morphOut;
}

// ---- Skills: a persistent, scroll-rotatable hexagon (like the triangle),
// paired with a content panel that pages through grouped skill text as you
// rotate. Reuses the fold-proxy for the one-time entry/exit morph, then
// hands off to its own real, interactive hexagon rotor. ----
// One page per hexagon side (6). The first 3 are real; the last 3 are
// placeholders — swap in real titles/items whenever there's a 4th, 5th,
// 6th skill group to show, no code changes needed beyond editing this array.
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
  {
    title: 'Placeholder Skill 1',
    items: ['Add a skill here', 'Add a skill here'],
  },
  {
    title: 'Placeholder Skill 2',
    items: ['Add a skill here', 'Add a skill here'],
  },
  {
    title: 'Placeholder Skill 3',
    items: ['Add a skill here', 'Add a skill here'],
  },
];

// Aligns the cube's body diagonal with the camera, so 3 faces read as one
// flat regular hexagon — verified numerically (see three-nav.js's
// buildHexOutline notes): at this exact tilt all 3 visible faces land at an
// identical dot product (1/sqrt(3)) against the camera. Expressed directly
// as the Euler x/y/z the main cube's spinGroup needs (not composed relative
// to any face state), since GSAP tweens the spinGroup's rotation to this
// absolute target regardless of which face it's coming from.
const HEX_TILT = {
  x: THREE.MathUtils.degToRad(45),
  y: THREE.MathUtils.degToRad(-35.2644),
  z: THREE.MathUtils.degToRad(15),
};

// The cube's normal camera (fov 48, needed for corner-rotation clipping
// headroom during ordinary face-to-face rolls — see buildCubeMesh) is far
// too wide-angle to project a REGULAR hexagon down the body diagonal: the 6
// vertices split into two rings at noticeably different depths from camera,
// and a wide/close perspective camera exaggerates that into very unequal
// projected radii — a hexagon whose vertices don't all sit the same distance
// from its own center reads as visibly irregular/"perspective-y", even
// though its 6 edges happen to stay equal-length throughout (verified
// numerically). Pushed to a near-orthographic dolly (fov 48/dist 3.6 ->
// ~29% min/max vertex-radius mismatch; the previous fov 9.16/dist 20 only
// got to ~4.5%, still visibly off; fov 2/dist 90 gets to ~1%, effectively a
// regular hexagon) rather than swapping in a real THREE.OrthographicCamera,
// since a genuine 0%-distortion camera isn't worth the complexity of a
// second camera instance fighting the paused base navigator's own render
// calls for this render target. So the camera itself zooms during the tilt
// — animated together with the rotation, not swapped abruptly, since a
// sudden fov/distance change alone would pop the cube to a visibly
// different size.
const HEX_FOV = 2;
const HEX_DISTANCE = 90;

// Euler angles wrap at 2*PI, and a straight lerp from e.g. -270deg to
// -35deg would spin the long way around (234deg) instead of the short way
// (125deg) — this finds the representation of `target` (mod 2*PI) nearest
// to `current`, so GSAP always takes the short path regardless of which
// face the cube is coming from.
function nearestEquivalentAngle(current, target) {
  const twoPi = Math.PI * 2;
  const diff = (((target - current) % twoPi) + twoPi + Math.PI) % twoPi - Math.PI;
  return current + diff;
}

// Paging between skill pages needs to spin the ALREADY-TILTED cube around
// the CAMERA's view axis (world Z) — a pure on-screen roll, keeping the
// same 3 faces toward the camera. Naively adding degrees to the tilted
// spinGroup's rotation.z does NOT do this: Three.js's Euler XYZ order
// applies rotation.z around the object's OWN local Z axis, which — once
// X/Y have tilted the object — no longer points at the camera at all
// (verified numerically: after this tilt, local Z world-points to
// (-0.577,-0.577,0.577), nowhere near (0,0,1)). Composing the extra spin
// as a proper world-space quaternion multiplication (applied outside/after
// the tilt) and converting the result back to Euler gives the angles that
// actually produce a screen-plane roll — verified numerically that all 3
// pages still land on the same "3 faces at dot=1/sqrt(3)" hexagon view.
function hexPageEuler(baseEuler, pageDeg) {
  const qTilt = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(baseEuler.x, baseEuler.y, baseEuler.z, 'XYZ'),
  );
  const qSpin = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(pageDeg),
  );
  const qTotal = qSpin.multiply(qTilt);
  return new THREE.Euler().setFromQuaternion(qTotal, 'XYZ');
}

// ---- Skills: the persistent cube itself tilts to the hexagon pose above
// (in place, full size — never a separate shape to size/position, which is
// what let past-me end up with a scaled-down proxy that read as "bigger
// than the cube" while both were visible mid-fade), then docks left once
// it's already hexagon-shaped. Exiting reverses the exact same two steps in
// the opposite order: undock first, then untilt — "as if it was a cube all
// along." Paging through skill pages while docked spins the SAME spinGroup
// around the camera's view axis (see hexPageEuler), via a second navigator
// built fresh each visit; the main cube's own navigator is paused (not stopped —
// it still renders every frame) for the duration and resumed once the
// reverse tilt finishes. ----
function initSkillsSection(cubeNav) {
  const face = document.querySelector('.face[data-face="skills"]');
  const dotsWrap = document.querySelector('.progress');
  const panel = document.getElementById('skills-panel');
  const panelTitle = document.getElementById('skills-panel-title');
  const panelList = document.getElementById('skills-panel-list');
  const panelDots = document.getElementById('skills-panel-dots');
  if (!cubeNav || !face || !panel || typeof gsap === 'undefined') return null;

  const { built, nav: cubeInternalNav, canvas, cubeScene, skillsFaceRotation, skillsIndex } = cubeNav;

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

  // The Z-paging navigator, live only while docked in hexagon mode — see
  // pageNav.stop() in morphOut (createShapeNavigator's rAF loop runs forever
  // once started, so a fresh one each visit needs the old one actually
  // stopped, not just discarded, or they'd pile up rendering forever).
  let pageNav = null;
  // Captured each entry so morphOut can restore the exact values, rather
  // than assuming buildCubeMesh's constants (avoids the two files drifting
  // out of sync if the cube's normal fov/distance ever changes).
  let savedFov = null;
  let savedCameraZ = null;

  function morphIn() {
    if (interactionMode !== 'cube') return;
    interactionMode = 'skills';
    activeSection = 'skills';
    setSectionBackVisible(true);

    cubeInternalNav.pause();
    cubeNav.hideLabelsForTilt();

    const rot = built.spinGroup.rotation;
    const targetX = nearestEquivalentAngle(rot.x, HEX_TILT.x);
    const targetY = nearestEquivalentAngle(rot.y, HEX_TILT.y);
    const targetZ = nearestEquivalentAngle(rot.z, HEX_TILT.z);
    savedFov = built.camera.fov;
    savedCameraZ = built.camera.position.z;
    const camState = { fov: savedFov, z: savedCameraZ };

    gsap.timeline()
      .to(dotsWrap, { opacity: 0, duration: 0.25, ease: 'power1.out' }, 0)
      .set(dotsWrap, { visibility: 'hidden' })
      // Tilt first, in place — the normal (depth-tested) outline stays on
      // throughout, since the hex-only outline is only geometrically valid
      // exactly at the target tilt; showing it mid-rotation would float
      // free of the actual mesh edges.
      .to(rot, { x: targetX, y: targetY, z: targetZ, duration: 0.5, ease: 'power2.inOut' }, 0)
      // Dolly out + narrow the fov together, in step with the tilt — see
      // HEX_FOV's derivation above for why the wide, close normal camera
      // can't project a regular hexagon.
      .to(camState, {
        fov: HEX_FOV, z: HEX_DISTANCE, duration: 0.5, ease: 'power2.inOut',
        onUpdate: () => {
          built.camera.fov = camState.fov;
          built.camera.position.z = camState.z;
          built.camera.updateProjectionMatrix();
        },
      }, 0)
      .call(() => {
        built.outline.visible = false;
        built.hexOutline.visible = true;
      })
      // Then dock left, already hexagon-shaped.
      .to(cubeScene, { x: sectionShiftX(), duration: 0.4, ease: 'power2.inOut' })
      .call(() => {
        const tiltEuler = { x: targetX, y: targetY, z: targetZ };
        pageNav = createShapeNavigator({
          scene: built.scene,
          camera: built.camera,
          renderer: built.renderer,
          spinGroup: built.spinGroup,
          // Same "coin spin in the screen plane" motion the old flat hexagon
          // had — see hexPageEuler for why this needs actual quaternion
          // composition rather than just adding degrees to rotation.z.
          states: SKILLS_PAGES.map((_, i) => {
            const e = hexPageEuler(tiltEuler, i * 60);
            return { key: i, rotation: { x: e.x, y: e.y, z: e.z } };
          }),
          lerpFactor: prefersReducedMotion ? 1 : 0.16,
          // Kept at 3 even though there are now 5 gaps (6 pages) instead of
          // 2 (3 pages): tried dropping this to match the cube's un-boosted
          // default (reasoning that 5 gaps here now equals the cube's 5),
          // but that made a single scroll gesture unable to reliably cross
          // even one gap (verified: 10 consecutive wheel batches, 0 page
          // advances). Keeping it at 3 reliably moves 1-2 pages per gesture.
          sensitivityBoost: 3,
          onFaceChange(index) { showPage(index); },
        });
        canvas.setAttribute('aria-label', 'Back to cube');
        panel.classList.add('visible');
        showPage(0, { delay: 0.1 });
      });
  }

  function morphOut() {
    if (interactionMode !== 'skills') return;
    interactionMode = 'cube';
    activeSection = null;
    setSectionBackVisible(false);
    panel.classList.remove('visible');
    if (pageNav) { pageNav.stop(); pageNav = null; }

    const rot = built.spinGroup.rotation;
    const targetX = nearestEquivalentAngle(rot.x, skillsFaceRotation.x || 0);
    const targetY = nearestEquivalentAngle(rot.y, skillsFaceRotation.y || 0);
    const targetZ = nearestEquivalentAngle(rot.z, skillsFaceRotation.z || 0);
    const camState = { fov: built.camera.fov, z: built.camera.position.z };
    const restoreFov = savedFov != null ? savedFov : camState.fov;
    const restoreZ = savedCameraZ != null ? savedCameraZ : camState.z;

    gsap.timeline()
      // Undock first, still hexagon-shaped.
      .to(cubeScene, { x: 0, duration: 0.4, ease: 'power2.inOut' }, 0)
      .call(() => {
        built.outline.visible = true;
        built.hexOutline.visible = false;
      }, null, 0.4)
      // Then untilt back to a normal cube face, as if it was a cube all along
      // — camera zooms back in over the same span, reversing the dolly-out.
      .to(rot, { x: targetX, y: targetY, z: targetZ, duration: 0.5, ease: 'power2.inOut' }, 0.4)
      .to(camState, {
        fov: restoreFov, z: restoreZ, duration: 0.5, ease: 'power2.inOut',
        onUpdate: () => {
          built.camera.fov = camState.fov;
          built.camera.position.z = camState.z;
          built.camera.updateProjectionMatrix();
        },
      }, 0.4)
      .call(() => {
        // resume() deliberately doesn't replay onFaceChange (it would
        // re-trigger a label decode for a face that was never really left),
        // so the aria-label update showFace() normally does needs restoring
        // here explicitly.
        cubeInternalNav.resume(skillsIndex);
        canvas.setAttribute('aria-label', 'skills face');
      })
      .set(dotsWrap, { visibility: 'visible' }, '<')
      .to(dotsWrap, { opacity: 1, duration: 0.3, ease: 'power1.out' }, '<');
  }

  // Exit click is already handled by initCubeNavigation's own canvas click
  // listener (it routes to sectionGoBack.skills whenever interactionMode is
  // 'skills'), since there's no separate rotor element anymore — this is
  // the entry trigger only, same pattern every other section uses.
  face.addEventListener('click', () => {
    if (currentFaceKey === 'skills' && interactionMode === 'cube') morphIn();
  });

  sectionGoBack.skills = morphOut;

  return {
    nudge(delta) { if (pageNav) pageNav.nudge(delta); },
    goToIndex(i) { if (pageNav) pageNav.goToIndex(i); },
    markInteracted() {},
    get activeIndex() { return pageNav ? pageNav.activeIndex : 0; },
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
    setTimeout(() => typeLines(BOOT_LINES, revealPrompt), 1200);
  }, 350);
});