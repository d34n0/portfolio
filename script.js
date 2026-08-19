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
  }
}

function enterSite() {
  sceneEl.classList.add('hidden');
  setTimeout(() => {
    sceneEl.remove();
    siteEl.hidden = false;
    siteEl.setAttribute('tabindex', '-1');
    siteEl.focus();
    initRamWidget();
    initMatrixWidget();
    initTaskbarClock();
  }, 1000);
}

// ---- Desktop widgets: only start once the portfolio is actually visible ----
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initRamWidget() {
  const canvas = document.getElementById('ram-canvas');
  const percentEl = document.getElementById('ram-percent');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const values = new Array(50).fill(35);
  let current = 35;

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(57,255,136,0.15)';
    ctx.lineWidth = 1;
    for (let gy = h / 4; gy < h; gy += h / 4) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.strokeStyle = '#39ff88';
    ctx.lineWidth = 1.5;
    values.forEach((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - (v / 100) * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(57,255,136,0.08)';
    ctx.fill();
  }

  function step() {
    current += (Math.random() - 0.5) * 9;
    current = Math.max(18, Math.min(90, current));
    values.push(current);
    values.shift();
    draw();
    if (percentEl) percentEl.textContent = Math.round(current) + '%';
  }

  draw();
  if (percentEl) percentEl.textContent = Math.round(current) + '%';
  if (!prefersReducedMotion) setInterval(step, 500);
}

function initMatrixWidget() {
  const canvas = document.getElementById('matrix-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const chars = 'ｱｲｳｴｵABCDEF0123456789$+-*/=%"\'#&_(),.;:?!|{}<>[]^~';
  const fontSize = 13;
  const columns = Math.floor(canvas.width / fontSize);
  const drops = new Array(columns).fill(0).map(() => Math.random() * -20);

  ctx.fillStyle = '#030805';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  function frame() {
    ctx.fillStyle = 'rgba(3,8,5,0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#39ff88';
    ctx.font = fontSize + 'px monospace';
    drops.forEach((y, i) => {
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(char, i * fontSize, y * fontSize);
      if (y * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      } else {
        drops[i] = y + 1;
      }
    });
  }

  if (prefersReducedMotion) {
    frame(); // one static frame instead of continuous animation
  } else {
    setInterval(frame, 65);
  }
}

function initTaskbarClock() {
  const clockEl = document.getElementById('taskbar-clock');
  if (!clockEl) return;
  function tickClock() {
    clockEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  tickClock();
  setInterval(tickClock, 1000);
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