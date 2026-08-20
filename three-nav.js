// ---- Shared Three.js scaffolding for the site's rotating navigators (cube,
// pyramid, hexagon). Each navigator gets its own small scene/camera/renderer
// inside its existing DOM container — see the migration plan for why this is
// three small canvases rather than one shared scene. This module only builds
// geometry and drives the shared scroll-lerp pose logic; all of the 2D
// crossfade/morph choreography (fold proxies, panel reveals) stays in
// script.js, untouched, driving these containers exactly as it always has. ----

import * as THREE from 'three';

function readCssColor(varName, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || fallback;
}

// rgba(r,g,b,a) / #rrggbb -> { color: THREE.Color }. Alpha is intentionally
// ignored: these navigator shapes are meant to render fully opaque (the
// --panel-bg var carries alpha for glassy 2D panels elsewhere, but applying
// that same alpha to a mesh material made faces see-through, letting the
// DOM label overlay layer bleed through as ghost text).
function parseCssColor(str) {
  const m = str.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map((s) => parseFloat(s));
    return { color: new THREE.Color(r / 255, g / 255, b / 255) };
  }
  return { color: new THREE.Color(str) };
}

// ---- Scene rig: canvas + renderer + camera + resize handling, shared by
// every shape. Mirrors FBMBackground's resize()/DPR-cap pattern (script.js)
// since that's the site's one existing precedent for a canvas with its own
// render loop. ----
export function createSceneRig(container, { fov = 28, cameraDistance = 4.2 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'shape-canvas';
  // Inserted as the FIRST child, not appended: each container (.scene,
  // .tri-wrap) already has its label-overlay div in the static HTML, and an
  // opaque mesh would otherwise paint on top of — and hide — that DOM text,
  // since later DOM siblings stack above earlier ones by default.
  container.insertBefore(canvas, container.firstChild);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
  camera.position.set(0, 0, cameraDistance);
  camera.lookAt(0, 0, 0);

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  return {
    canvas,
    renderer,
    scene,
    camera,
    resize,
    dispose() { ro.disconnect(); renderer.dispose(); },
  };
}

// ---- Shared rAF-lerp navigator: replaces the currentP/targetP spring-lerp
// block that used to be duplicated across initCubeNavigation/initTriangleNav/
// initSkillsSection, and replaces the paused-GSAP-timeline-as-interpolation-
// reference trick (tl.progress(p)) with a direct linear interpolation between
// each pair of `states` — the same math GSAP's ease:'none' was already doing,
// just computed by hand now that there's a mesh rotation to drive instead of
// a CSS transform. ----
export function createShapeNavigator({
  scene, camera, renderer, spinGroup, states,
  lerpFactor, sensitivityBoost = 1,
  onFaceChange, onFrame,
}) {
  let currentP = 0;
  let targetP = 0;
  let activeIndex = 0;
  let settleTimer = null;
  const totalDuration = states.length - 1;

  function rotationAt(p) {
    const t = Math.max(0, Math.min(1, p)) * totalDuration;
    const segIndex = Math.min(states.length - 2, Math.floor(t));
    const segT = t - segIndex;
    const a = states[segIndex].rotation;
    const b = states[segIndex + 1].rotation;
    return {
      x: (a.x || 0) + ((b.x || 0) - (a.x || 0)) * segT,
      y: (a.y || 0) + ((b.y || 0) - (a.y || 0)) * segT,
      z: (a.z || 0) + ((b.z || 0) - (a.z || 0)) * segT,
    };
  }

  function applyProgress(p) {
    const rot = rotationAt(p);
    spinGroup.rotation.x = rot.x;
    spinGroup.rotation.y = rot.y;
    spinGroup.rotation.z = rot.z;
    const idx = Math.round(Math.max(0, Math.min(1, p)) * totalDuration);
    if (idx !== activeIndex) {
      activeIndex = idx;
      if (onFaceChange) onFaceChange(activeIndex, states[activeIndex].key);
    }
  }

  function renderLoop() {
    currentP += (targetP - currentP) * lerpFactor;
    if (Math.abs(targetP - currentP) < 0.0004) currentP = targetP;
    applyProgress(currentP);
    renderer.render(scene, camera);
    if (onFrame) onFrame(currentP, activeIndex);
    requestAnimationFrame(renderLoop);
  }
  applyProgress(0);
  requestAnimationFrame(renderLoop);

  function snapToNearest() {
    targetP = Math.round(targetP * totalDuration) / totalDuration;
  }

  function nudge(deltaProgress) {
    targetP = Math.max(0, Math.min(1, targetP + deltaProgress * sensitivityBoost));
    clearTimeout(settleTimer);
    settleTimer = setTimeout(snapToNearest, 140);
  }

  function goToIndex(index) {
    const clamped = Math.max(0, Math.min(states.length - 1, index));
    clearTimeout(settleTimer);
    targetP = clamped / totalDuration;
  }

  // Escape hatch for the cube's one-time "nudge demo" peek, which sets a
  // progress value that isn't a face threshold and bypasses the settle timer
  // entirely (script.js:569-580) — not part of the shared nudge/goToIndex API.
  function setProgressRaw(p) { targetP = Math.max(0, Math.min(1, p)); }

  return {
    nudge,
    goToIndex,
    setProgressRaw,
    markInteracted() {},
    get activeIndex() { return activeIndex; },
    get activeKey() { return states[activeIndex].key; },
  };
}

// ---- Discover each non-degenerate triangular face of a geometry (centroid +
// outward normal), skipping the zero-area triangles ConeGeometry's apex row
// produces. This lets face placement be verified from the actual geometry
// Three.js built rather than re-derived by hand — the hand-derivation route
// is exactly what caused repeated angle/orientation bugs in the old CSS
// version. ----
function discoverFaces(geometry) {
  const pos = geometry.attributes.position;
  const index = geometry.index;
  const faces = [];
  for (let i = 0; i < index.count; i += 3) {
    const ia = index.getX(i);
    const ib = index.getX(i + 1);
    const ic = index.getX(i + 2);
    const a = new THREE.Vector3().fromBufferAttribute(pos, ia);
    const b = new THREE.Vector3().fromBufferAttribute(pos, ib);
    const c = new THREE.Vector3().fromBufferAttribute(pos, ic);
    const ab = b.clone().sub(a);
    const ac = c.clone().sub(a);
    const cross = ab.clone().cross(ac);
    const area = cross.length() / 2;
    if (area < 1e-6) continue; // degenerate triangle from the cone's collapsed apex row
    const centroid = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    const normal = cross.normalize();
    faces.push({ centroid, normal });
  }
  return faces;
}

// ConeGeometry's cap isn't a single triangle for radialSegments:3 — it's a
// fan of 3 coplanar wedges meeting at the cap's center. discoverFaces()
// reports all 3 separately (same normal, different centroids), which broke
// two things: the cap's "true" centroid (needed for centering its label)
// isn't any one wedge's centroid, and code that tried to pick "the" cap face
// by identity (`!== base`) only excluded ONE wedge, leaving the other two to
// contaminate azimuth-based sorting of the side faces. Merging same-normal
// entries into one — averaging their centroids, which is exactly equal to
// the true polygon centroid when (as here) the fan's hub sits at that
// centroid already — fixes both.
function mergeCoplanarFaces(faces) {
  const groups = [];
  for (const f of faces) {
    const group = groups.find((g) => g.normal.dot(f.normal) > 0.999);
    if (group) group.members.push(f);
    else groups.push({ normal: f.normal, members: [f] });
  }
  return groups.map((g) => ({
    normal: g.normal,
    centroid: g.members.reduce((sum, f) => sum.add(f.centroid), new THREE.Vector3()).multiplyScalar(1 / g.members.length),
  }));
}

function makeOutline(geometry, phosphorColor) {
  const edges = new THREE.EdgesGeometry(geometry);
  return new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: phosphorColor }));
}

// ---- Pyramid: a real welded tetrahedron via ConeGeometry(radius, height, 3)
// — radialSegments:3 gives exactly 3 side faces + 1 base cap, all sharing
// vertices, which is the structural fix for the seam problem CSS couldn't
// solve. radius/height are chosen so it's a REGULAR tetrahedron (radius =
// height/sqrt(2)), which lets theta = asin(1/3) ≈ 19.4712deg — already
// verified correct for a regular tetrahedron earlier this session — be
// reused as the known-good side-face tilt, rather than re-derived. ----
export function buildPyramidMesh({ container, states }) {
  const rig = createSceneRig(container, { fov: 37, cameraDistance: 4.2 });

  const RADIUS = 1;
  const HEIGHT = RADIUS * Math.SQRT2;
  const geometry = new THREE.ConeGeometry(RADIUS, HEIGHT, 3);
  // ConeGeometry(r,h,3) places its first rib (a vertical edge, not a face
  // center) at azimuth 0 — verified via discoverFaces() output: raw side-face
  // azimuths land at 60/180/-60deg, not 0/-120/-240 like the rotation states
  // below assume. Without this offset, yaw 0 points the camera straight down
  // the seam between two faces (a visible vertical seam, not a flat face).
  // Rotating -60deg bakes a face center onto azimuth 0, matching the 'web'
  // state's yaw:0 assumption (see ELEVATION's derivation in script.js).
  geometry.rotateY(-Math.PI / 3);
  // ConeGeometry's pivot is the axis midpoint (0,0,0), not the tetrahedron's
  // true centroid — for a regular tetrahedron the centroid sits HEIGHT/4
  // below that midpoint (apex and 3 base verts don't average to the axis
  // midpoint). Rotating around the wrong pivot puts each face's plane at a
  // different distance from the pivot, so bringing different faces flat-on
  // to the camera landed them at different distances from it — same true
  // 3D triangle, different on-screen size. Shifting the geometry so the true
  // centroid sits at the pivot fixes this: verified numerically (see the
  // pyramid migration notes) that every face then lands at the exact same
  // camera distance when rotated flat-on.
  geometry.translate(0, HEIGHT / 4, 0);

  const { color: fillColor } = parseCssColor(readCssColor('--panel-bg', 'rgba(4,10,7,0.85)'));
  const phosphor = readCssColor('--phosphor', '#39ff88');

  const material = new THREE.MeshBasicMaterial({ color: fillColor, side: THREE.FrontSide });
  const mesh = new THREE.Mesh(geometry, material);
  const outline = makeOutline(geometry, phosphor);

  const spinGroup = new THREE.Group();
  spinGroup.add(mesh);
  spinGroup.add(outline);
  rig.scene.add(spinGroup);

  // Resolve which physical face is actually flat-on to the camera for each
  // state, by directly applying that state's rotation and checking real dot
  // products — rather than hand-deriving a yaw/azimuth relationship (tried
  // first, and wrong: with X and Y rotation both nonzero, Three.js's Euler
  // composition doesn't make a face's screen azimuth simply "yaw + its rest
  // azimuth", so a static ahead-of-time sort silently mismatched graphics
  // and games to the wrong faces even though the RENDERED shape still looked
  // like a clean triangle each time — 3-fold symmetry means any side face
  // looks identical, so only the label position gave the mismatch away).
  // This also sidesteps needing to identify "the" base face by exclusion.
  const merged = mergeCoplanarFaces(discoverFaces(geometry));
  const camDir = new THREE.Vector3(0, 0, 1);
  const facesByKey = {};
  for (const state of states) {
    spinGroup.rotation.set(state.rotation.x || 0, state.rotation.y || 0, state.rotation.z || 0);
    spinGroup.updateMatrixWorld(true);
    let best = null;
    let bestDot = -Infinity;
    for (const f of merged) {
      const dot = f.normal.clone().transformDirection(spinGroup.matrixWorld).dot(camDir);
      if (dot > bestDot) { bestDot = dot; best = f; }
    }
    facesByKey[state.key] = best;
  }
  spinGroup.rotation.set(0, 0, 0);

  return { ...rig, spinGroup, mesh, outline, facesByKey };
}

// ---- Cube: BoxGeometry, one welded mesh instead of 6 independently-stroked
// divs — same seam fix as the pyramid. Face order matches BoxGeometry's
// default material-group order (+x,-x,+y,-y,+z,-z), mapped onto the existing
// physical-face-to-data-face assignment from the CSS version so the existing
// `states` rotation values keep producing the same on-screen motion. ----
export function buildCubeMesh({ container, faceKeysByBoxOrder }) {
  // fov widened from 30 to 48: a cube's worst-case on-screen radius (corner
  // pointed toward the camera, as happens mid-roll) is its circumradius —
  // SIZE*sqrt(3)/2 ~= 1.386 — which exceeds what a 30deg fov shows at this
  // distance (0.965), so corners were clipping by the canvas/frustum edge
  // during rotation. 48deg leaves ~15% headroom against the full circumsphere.
  const rig = createSceneRig(container, { fov: 48, cameraDistance: 3.6 });

  const SIZE = 1.6;
  const geometry = new THREE.BoxGeometry(SIZE, SIZE, SIZE);

  const { color: fillColor } = parseCssColor(readCssColor('--panel-bg', 'rgba(4,10,7,0.85)'));
  const phosphor = readCssColor('--phosphor', '#39ff88');

  const materials = faceKeysByBoxOrder.map(() => new THREE.MeshBasicMaterial({
    color: fillColor, side: THREE.FrontSide,
  }));
  const mesh = new THREE.Mesh(geometry, materials);
  const outline = makeOutline(geometry, phosphor);

  const spinGroup = new THREE.Group();
  spinGroup.add(mesh);
  spinGroup.add(outline);
  rig.scene.add(spinGroup);

  // BoxGeometry's 6 faces (2 triangles each) come in this fixed group order:
  // 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z. Local face-center + outward normal for
  // each, used by the label overlay (see updateCubeLabels).
  const half = SIZE / 2;
  const boxFaces = [
    { normal: new THREE.Vector3(1, 0, 0), center: new THREE.Vector3(half, 0, 0) },
    { normal: new THREE.Vector3(-1, 0, 0), center: new THREE.Vector3(-half, 0, 0) },
    { normal: new THREE.Vector3(0, 1, 0), center: new THREE.Vector3(0, half, 0) },
    { normal: new THREE.Vector3(0, -1, 0), center: new THREE.Vector3(0, -half, 0) },
    { normal: new THREE.Vector3(0, 0, 1), center: new THREE.Vector3(0, 0, half) },
    { normal: new THREE.Vector3(0, 0, -1), center: new THREE.Vector3(0, 0, -half) },
  ];
  const facesByKey = {};
  faceKeysByBoxOrder.forEach((key, i) => { facesByKey[key] = boxFaces[i]; });

  return { ...rig, spinGroup, mesh, outline, facesByKey, materials };
}

// ---- Hexagon: a shallow CylinderGeometry instead of a flat SVG polygon —
// gives it real depth for the first time, matching the now-genuinely-3D
// cube/pyramid instead of being the one flat outlier. ----
export function buildHexagonMesh({ container }) {
  const rig = createSceneRig(container, { fov: 30, cameraDistance: 4 });

  const RADIUS = 1;
  const DEPTH = RADIUS * 0.12;
  const geometry = new THREE.CylinderGeometry(RADIUS, RADIUS, DEPTH, 6);
  // CylinderGeometry stands with its axis along Y by default (flat hex caps
  // facing up/down) — rotate it so the caps face the camera (+Z) at rest
  // instead, matching the old flat SVG hexagon's orientation. The rotor
  // still spins around Z afterward (see initSkillsSection's states), same
  // "coin spinning in the screen plane" motion the CSS rotate() gave it.
  geometry.rotateX(Math.PI / 2);

  const { color: fillColor } = parseCssColor(readCssColor('--panel-bg', 'rgba(4,10,7,0.85)'));
  const phosphor = readCssColor('--phosphor', '#39ff88');

  const material = new THREE.MeshBasicMaterial({ color: fillColor, side: THREE.FrontSide });
  const mesh = new THREE.Mesh(geometry, material);
  const outline = makeOutline(geometry, phosphor);

  const spinGroup = new THREE.Group();
  spinGroup.add(mesh);
  spinGroup.add(outline);
  rig.scene.add(spinGroup);

  return { ...rig, spinGroup, mesh, outline };
}

// ---- Project a local-space point (on a spinning mesh) to CSS pixel
// coordinates relative to its own canvas, for positioning a DOM label over
// it. Returns null if the point is behind the camera. ----
export function projectToCanvasPx(localPoint, spinGroup, camera, canvas) {
  const world = spinGroup.localToWorld(localPoint.clone());
  const ndc = world.project(camera);
  if (ndc.z > 1) return null;
  const rect = canvas.getBoundingClientRect();
  return {
    x: (ndc.x * 0.5 + 0.5) * rect.width,
    y: (1 - (ndc.y * 0.5 + 0.5)) * rect.height,
  };
}

// Outward-normal-vs-camera dot product, for front-facing checks. Unlike CSS
// backface-visibility:hidden (a hard >0 cutoff that never misfires, since a
// perfectly edge-on face has zero screen area anyway so there's nothing to
// see or not-see), a DOM label's visibility isn't tied to how much of the
// actual mesh face is visible — so a naive >0 cutoff lets an adjacent face
// that's only barely, technically front-facing (e.g. exactly edge-on at a
// "pole" rotation) show a full-opacity label that reads as a rendering
// glitch. A real margin avoids that borderline flicker.
export function isFrontFacing(localNormal, spinGroup, camera, threshold = 0.35) {
  const worldNormal = localNormal.clone().transformDirection(spinGroup.matrixWorld);
  const worldPoint = spinGroup.localToWorld(new THREE.Vector3());
  const toCamera = camera.position.clone().sub(worldPoint).normalize();
  return worldNormal.dot(toCamera) > threshold;
}

const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();

// Resolves a click/pointer event on a canvas to whichever material group
// (i.e. cube face) was actually hit, via a real raycast rather than
// assuming the click landed on whatever's currently "active" — needed
// because during a roll two faces can be simultaneously front-facing and
// clickable. Returns the material index, or null if the click missed the
// mesh entirely (e.g. hit the canvas's transparent background).
export function raycastFaceIndex(event, canvas, camera, mesh) {
  const rect = canvas.getBoundingClientRect();
  _ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  _ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  _raycaster.setFromCamera(_ndc, camera);
  const hits = _raycaster.intersectObject(mesh);
  if (!hits.length) return null;
  const face = hits[0].face;
  return Array.isArray(mesh.material) ? face.materialIndex : 0;
}
