import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/cormorant-sc/400.css';
import '@fontsource/cormorant-sc/500.css';
import './style.css';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { makeComposer, makeEnvironment, makeLights, makeOcean, makeSky, SKY, updateShadowFrustum } from './engine/world';
import { buildAtlasAsync, type CityNode } from './engine/atlas';
import { LAYOUTS, structPos, STRUCT, type LayoutMode } from './engine/layout';
import { CATEGORIES, CITIES, ROMAN } from './data/cities';
import { EPILOGUE, INTERLUDES, type Interlude } from './data/interludes';
import { Ambience } from './audio';
import { makeBoat, makeLightPool, makeMotes } from './engine/ambience3d';
import { getDotTexture, VIEW } from './engine/kit';

const params = new URLSearchParams(location.search);
const NO_UI = params.has('noui');
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;

// ------------------------------------------------------------------ renderer
const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.info.autoReset = false;
stage.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.className = 'labels';
stage.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(SKY.fog, 0.0016);
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.3, 9000);
camera.position.set(80, 420, 620);

const sky = makeSky();
scene.add(sky);
const ocean = makeOcean();
scene.add(ocean);
const { sun } = makeLights(scene);
scene.environment = makeEnvironment(renderer);
scene.environmentIntensity = 0.55;

const { composer, bloom, grade } = makeComposer(renderer, scene, camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 4;
controls.maxDistance = 900;
controls.maxPolarAngle = Math.PI * 0.495;
controls.target.set(0, 0, 0);
controls.autoRotateSpeed = 0.35;
controls.zoomSpeed = 0.9;

const ambience = new Ambience();

// ------------------------------------------------------------------ state
let nodes: CityNode[] = [];
let mode: LayoutMode = 'journey';
let selected = -1; // -1 overview, 0 garden, 1..55 cities
let filterCat = -1;
let layoutT = 1; // 0..1 transition progress
const clock = new THREE.Clock();

// ------------------------------------------------------------------ the route: dotted line of the journey
const ROUTE_N = 1600;
const routeGeo = new THREE.BufferGeometry();
const routePos = new Float32Array(ROUTE_N * 3);
const routeT = new Float32Array(ROUTE_N);
const routeVis = new Float32Array(ROUTE_N);
for (let i = 0; i < ROUTE_N; i++) routeT[i] = i / (ROUTE_N - 1);
routeGeo.setAttribute('position', new THREE.BufferAttribute(routePos, 3));
routeGeo.setAttribute('aT', new THREE.BufferAttribute(routeT, 1));
routeGeo.setAttribute('aVis', new THREE.BufferAttribute(routeVis, 1));
const routeMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#ffcf8a') },
    uMap: { value: getDotTexture() },
    uHead: { value: -1 },
    uScale: { value: window.innerHeight / 2 },
    uOpacity: { value: 1 },
  },
  vertexShader: /* glsl */ `
    attribute float aT; attribute float aVis;
    uniform float uTime; uniform float uHead; uniform float uScale;
    varying float vA;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      float pulse = pow(0.5 + 0.5 * sin(aT * 260.0 - uTime * 2.2), 6.0);
      float head = uHead >= 0.0 ? exp(-pow((aT - uHead) * 140.0, 2.0)) : 0.0;
      vA = aVis * (0.22 + 0.5 * pulse + head * 2.0);
      gl_PointSize = (1.3 + head * 3.0) * uScale / -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor; uniform sampler2D uMap; uniform float uOpacity;
    varying float vA;
    void main(){
      float a = texture2D(uMap, gl_PointCoord).a;
      gl_FragColor = vec4(uColor * 1.6, a * vA * uOpacity);
    }`,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const route = new THREE.Points(routeGeo, routeMat);
route.frustumCulled = false;
scene.add(route);
const boat = makeBoat();
scene.add(boat);
const motes = makeMotes();
scene.add(motes);
const boatState = { u: 0.43 / 55, scale: 1, pending: -1 };
const routeCurvePts: THREE.Vector3[] = [];
let routeCurve: THREE.CatmullRomCurve3 | null = null;

function rebuildRoute() {
  if (!nodes.length) return;
  routeCurvePts.length = 0;
  for (const n of nodes) routeCurvePts.push(new THREE.Vector3(n.root.position.x, 0.2, n.root.position.z));
  routeCurve = new THREE.CatmullRomCurve3(routeCurvePts, false, 'centripetal');
  const p = new THREE.Vector3();
  for (let i = 0; i < ROUTE_N; i++) {
    routeCurve.getPoint(i / (ROUTE_N - 1), p);
    routePos[i * 3] = p.x;
    routePos[i * 3 + 1] = p.y;
    routePos[i * 3 + 2] = p.z;
    let vis = 1;
    for (const n of nodes) {
      const dx = p.x - n.root.position.x;
      const dz = p.z - n.root.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      vis = Math.min(vis, THREE.MathUtils.smoothstep(d, 13.2, 15.5));
    }
    routeVis[i] = vis;
  }
  routeGeo.attributes.position.needsUpdate = true;
  routeGeo.attributes.aVis.needsUpdate = true;
}

// ------------------------------------------------------------------ axis labels for the atlas and structure arrangements
interface AxisLabel {
  obj: CSS2DObject;
  el: HTMLDivElement;
  modes: LayoutMode[];
}
const axisLabels: AxisLabel[] = [];
function axisLabel(text: string, sub: string, color: string, pos: THREE.Vector3, modes: LayoutMode[]) {
  const el = document.createElement('div');
  el.className = 'axis-label';
  el.style.setProperty('--accent', color);
  el.innerHTML = `<span class="t">${text}</span>${sub ? `<span class="s">${sub}</span>` : ''}`;
  const obj = new CSS2DObject(el);
  obj.position.copy(pos);
  scene.add(obj);
  axisLabels.push({ obj, el, modes });
}
function buildAxisLabels() {
  CATEGORIES.forEach((c, i) => {
    axisLabel(c.title, '', c.color, new THREE.Vector3((i - 5) * 34, 0.5, 2 * 34 - 20 + 22), ['atlas']);
    // at the head of each diagonal in the structure
    axisLabel(c.title, '', c.color, structPos(i, 0).add(new THREE.Vector3(-4, 0.5, -4)), ['structure']);
  });
  // chapters: the rows of the turned grid
  ROMAN.forEach((r, i) => {
    const ch = i + 1;
    const list = CITIES.filter((c) => c.chapter === ch);
    const zs = list.map((c) => structPos(c.cat, c.num).z);
    const xs = list.map((c) => structPos(c.cat, c.num).x);
    const z = zs.reduce((a, b) => a + b, 0) / zs.length;
    const x = Math.min(...xs) - 26;
    axisLabel(`Chapter ${r}`, '', '#f1e6d2', new THREE.Vector3(x, 0.5, z), ['structure']);
  });
  void STRUCT;
}

// ------------------------------------------------------------------ camera flights
const fly = {
  active: false,
  t: 0,
  dur: 2.5,
  p0: new THREE.Vector3(),
  p1: new THREE.Vector3(),
  t0: new THREE.Vector3(),
  t1: new THREE.Vector3(),
  arc: 0,
  done: null as null | (() => void),
};
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function flyTo(pos: THREE.Vector3, target: THREE.Vector3, dur?: number, done?: () => void) {
  fly.p0.copy(camera.position);
  fly.t0.copy(controls.target);
  fly.p1.copy(pos);
  fly.t1.copy(target);
  const d = fly.p0.distanceTo(fly.p1) + fly.t0.distanceTo(fly.t1);
  fly.dur = dur ?? THREE.MathUtils.clamp(1.4 + d / 160, 1.8, 4.2);
  fly.arc = Math.min(d * 0.18, 90) * (Math.max(fly.p0.y, fly.p1.y) > 120 ? 0.3 : 1);
  fly.t = 0;
  fly.active = true;
  fly.done = done ?? null;
  controls.enabled = false;
  controls.autoRotate = false;
}

function updateFly(dt: number) {
  if (!fly.active) return;
  fly.t = Math.min(1, fly.t + dt / fly.dur);
  const e = ease(fly.t);
  controls.target.lerpVectors(fly.t0, fly.t1, e);
  camera.position.lerpVectors(fly.p0, fly.p1, e);
  camera.position.y += Math.sin(e * Math.PI) * fly.arc;
  camera.lookAt(controls.target);
  if (fly.t >= 1) {
    fly.active = false;
    controls.enabled = true;
    const d = fly.done;
    fly.done = null;
    d?.();
  }
}

function viewFor(i: number) {
  const n = nodes[i];
  const v = n.view;
  const target = n.root.position.clone();
  target.y = v.ty ?? Math.min(n.height * 0.32 + 1.2, 9);
  let dist = v.dist ?? THREE.MathUtils.clamp(25 + n.height * 0.55, 27, 52);
  if (camera.aspect < 0.9) {
    // portrait: step back, and lift the city above the card
    dist *= 1.55;
    target.y -= 5;
  }
  const elev = v.elev ?? 0.5;
  let yaw: number;
  if (v.yaw !== undefined) yaw = v.yaw;
  else {
    // keep roughly the current heading, but prefer facing the sunset
    const dx = camera.position.x - target.x;
    const dz = camera.position.z - target.z;
    const cur = Math.atan2(dx, dz);
    yaw = cur * 0.5 + 0.35 * 0.5;
    if (Math.abs(cur) > 1.4) yaw = cur * 0.7;
  }
  const pos = new THREE.Vector3(
    target.x + Math.sin(yaw) * Math.cos(elev) * dist,
    target.y + Math.sin(elev) * dist,
    target.z + Math.cos(yaw) * Math.cos(elev) * dist,
  );
  return { pos, target };
}

function overviewView() {
  const o = LAYOUTS[mode].overview;
  return { pos: o.pos.clone(), target: o.target.clone() };
}

// ------------------------------------------------------------------ UI: index, card, interlude
const card = $('#card');
const indexPanel = $('#index');
const interludeEl = $('#interlude');
const hintEl = $('#hint');

function buildIndex() {
  const legend = $('#legend');
  CATEGORIES.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.innerHTML = `<i></i>${c.title}`;
    btn.style.setProperty('--c', c.color);
    btn.onclick = () => setFilter(filterCat === i ? -1 : i);
    legend.appendChild(btn);
  });
  const chapters = $('#chapters');
  for (let ch = 1; ch <= 9; ch++) {
    const wrap = document.createElement('div');
    wrap.className = 'ch';
    const head = document.createElement('div');
    head.className = 'ch-head';
    head.textContent = `Chapter ${ROMAN[ch - 1]}  ·  ${INTERLUDES[ch - 1].title}`;
    head.onclick = () => showInterlude(INTERLUDES[ch - 1], false);
    wrap.appendChild(head);
    const list = document.createElement('div');
    list.className = 'ch-list';
    for (const c of CITIES.filter((c) => c.chapter === ch)) {
      const btn = document.createElement('button');
      btn.textContent = c.name;
      btn.dataset.order = String(c.order);
      btn.dataset.cat = String(c.cat);
      btn.style.setProperty('--c', CATEGORIES[c.cat].color);
      btn.title = `${CATEGORIES[c.cat].title} ${c.num}`;
      btn.onclick = () => {
        stopTour();
        select(c.order + 1);
        if (window.innerWidth < 760) toggleIndex(false);
      };
      list.appendChild(btn);
    }
    wrap.appendChild(list);
    chapters.appendChild(wrap);
  }
}

function toggleIndex(force?: boolean) {
  const show = force ?? !indexPanel.classList.contains('show');
  if (show) $('#help').classList.remove('show');
  indexPanel.classList.toggle('show', show);
  $('#btn-index').classList.toggle('on', show);
}

function setFilter(cat: number) {
  filterCat = cat;
  const legend = $('#legend');
  legend.classList.toggle('filtering', cat >= 0);
  [...legend.children].forEach((b, i) => b.classList.toggle('on', i === cat));
  document.querySelectorAll<HTMLButtonElement>('.ch-list button').forEach((b) => {
    b.classList.toggle('dim', cat >= 0 && Number(b.dataset.cat) !== cat);
  });
  for (const n of nodes) {
    const on = cat < 0 || (n.city && n.city.cat === cat);
    n.liftTarget = cat >= 0 && on ? 1 : 0;
    n.labelEl.classList.toggle('dim', !on);
    n.ringMat.opacity = on ? 0.9 : 0.15;
  }
  if (cat >= 0) showHint(`${CATEGORIES[cat].title}: five cities raised from the water`);
}

let hintTimer = 0;
function showHint(text: string, ms = 3200) {
  hintEl.textContent = text;
  hintEl.classList.add('show');
  clearTimeout(hintTimer);
  hintTimer = window.setTimeout(() => hintEl.classList.remove('show'), ms);
}

function fillCard(i: number) {
  const n = nodes[i];
  const nav = card.querySelector('.card-nav') as HTMLElement;
  const prev = card.querySelector('.prev') as HTMLButtonElement;
  const next = card.querySelector('.next') as HTMLButtonElement;
  if (!n.city) {
    card.style.setProperty('--accent', '#f3d9a4');
    $('.card-cat').textContent = 'Kublai Khan & Marco Polo';
    $('.card-name').textContent = "The Khan's Garden";
    $('.card-meta').textContent = 'the frame of the book';
    $('.card-text').textContent =
      'In a garden of the summer palace, the emperor of the Tartars listens to the Venetian. Between the cities they talk, play chess and smoke, and wonder whether any of it exists outside the garden. Choose a conversation:';
    const g = $('.card-glimpse');
    g.innerHTML = '';
    [...INTERLUDES, EPILOGUE].forEach((il) => {
      const b = document.createElement('button');
      b.className = 'il-link';
      b.textContent = il.chapter <= 9 ? `${ROMAN[il.chapter - 1]}.  ${il.title}` : il.title;
      b.onclick = () => showInterlude(il, false);
      g.appendChild(b);
    });
    prev.textContent = '';
    next.textContent = `Begin with ${CITIES[0].name}  ›`;
    next.onclick = () => select(1);
    prev.onclick = null;
    nav.style.display = '';
    return;
  }
  const c = n.city;
  const cat = CATEGORIES[c.cat];
  card.style.setProperty('--accent', cat.color);
  $('.card-cat').textContent = `${cat.title}  ·  ${c.num}`;
  $('.card-name').textContent = c.name;
  $('.card-meta').textContent = `Chapter ${ROMAN[c.chapter - 1]}  ·  city ${c.order + 1} of 55`;
  $('.card-text').textContent = c.text;
  $('.card-glimpse').textContent = c.glimpse;
  const pc = CITIES[c.order - 1];
  const nc = CITIES[c.order + 1];
  prev.textContent = pc ? `‹  ${pc.name}` : "‹  The Khan's garden";
  prev.onclick = () => {
    stopTour();
    select(i - 1);
  };
  next.textContent = nc ? `${nc.name}  ›` : 'The atlas  ›';
  next.onclick = () => {
    stopTour();
    if (nc) select(i + 1);
    else showInterlude(EPILOGUE, false);
  };
}

function select(i: number, opts: { fromTour?: boolean } = {}) {
  if (!nodes.length) return;
  if (i < 0) return goOverview();
  i = THREE.MathUtils.clamp(i, 0, nodes.length - 1);
  if (!opts.fromTour) hideInterlude();
  selected = i;
  const { pos, target } = viewFor(i);
  card.classList.remove('show');
  flyTo(pos, target, undefined, () => {
    controls.autoRotate = tour.playing;
    if (selected === i) {
      fillCard(i);
      card.classList.add('show');
    }
  });
  if (fly.dur < 2.2) {
    fillCard(i);
  }
  document.querySelectorAll<HTMLButtonElement>('.ch-list button').forEach((b) => b.classList.toggle('cur', Number(b.dataset.order) === i - 1));
  const id = nodes[i].city?.id ?? 'garden';
  history.replaceState(null, '', `${location.search}#${id}`);
  document.title = `${nodes[i].city?.name ?? "The Khan's Garden"} · Invisible Cities`;
  ambience.setMood(i);
  for (const n of nodes) n.focus.value = 0;
}

function goOverview() {
  selected = -1;
  card.classList.remove('show');
  const { pos, target } = overviewView();
  flyTo(pos, target);
  history.replaceState(null, '', location.search || location.pathname);
  document.title = 'Invisible Cities';
  document.querySelectorAll('.ch-list button.cur').forEach((b) => b.classList.remove('cur'));
}

let interludeTimer = 0;
let interludeDone: null | (() => void) = null;
function showInterlude(il: Interlude, auto: boolean, done?: () => void) {
  card.classList.remove('show');
  $('.il-kicker').textContent = il.chapter <= 9 ? `Chapter ${ROMAN[il.chapter - 1]}` : 'Epilogue';
  $('.il-title').textContent = il.title;
  $('.il-text').textContent = il.text;
  interludeEl.classList.add('show');
  document.body.classList.add('telling');
  interludeDone = done ?? null;
  clearTimeout(interludeTimer);
  if (auto) {
    const words = il.text.split(/\s+/).length;
    interludeTimer = window.setTimeout(() => finishInterlude(), (words / 3.1 + 3) * 1000);
  }
  // drift to the garden while the story is told
  if (!tour.playing || il.chapter > 9) {
    if (il.chapter > 9) {
      selected = -1;
      document.querySelectorAll('.ch-list button.cur').forEach((b) => b.classList.remove('cur'));
      const o = overviewView();
      flyTo(o.pos, o.target, 4);
    }
  }
}
function finishInterlude() {
  clearTimeout(interludeTimer);
  interludeEl.classList.remove('show');
  document.body.classList.remove('telling');
  const d = interludeDone;
  interludeDone = null;
  d?.();
}
function hideInterlude() {
  clearTimeout(interludeTimer);
  interludeDone = null;
  interludeEl.classList.remove('show');
  document.body.classList.remove('telling');
}
$('.il-go').addEventListener('click', () => finishInterlude());

// ------------------------------------------------------------------ the guided journey
type Step = { kind: 'interlude'; il: Interlude } | { kind: 'city'; i: number } | { kind: 'end' };
const steps: Step[] = [];
for (let ch = 1; ch <= 9; ch++) {
  steps.push({ kind: 'interlude', il: INTERLUDES[ch - 1] });
  for (const c of CITIES.filter((c) => c.chapter === ch)) steps.push({ kind: 'city', i: c.order + 1 });
}
steps.push({ kind: 'interlude', il: EPILOGUE });
steps.push({ kind: 'end' });

const tour = { playing: false, step: -1, timer: 0, dwell: 0 };
const CITY_DWELL = 19;

function setPlayButton() {
  const b = $('#btn-play');
  b.querySelector('.pi')!.innerHTML = tour.playing ? '&#10073;&#10073;' : '&#9654;';
  b.querySelector('.pt')!.textContent = tour.playing ? 'Pause' : 'Journey';
}

function startTour(fromStep?: number) {
  tour.playing = true;
  if (fromStep !== undefined) tour.step = fromStep - 1;
  else if (selected > 0) {
    // continue from the current city
    tour.step = steps.findIndex((s) => s.kind === 'city' && s.i === selected) - 1;
  } else if (tour.step >= steps.length - 2) tour.step = -1;
  setPlayButton();
  nextStep();
}

function stopTour() {
  if (!tour.playing) return;
  tour.playing = false;
  controls.autoRotate = false;
  clearTimeout(tour.timer);
  setPlayButton();
}

function nextStep() {
  if (!tour.playing) return;
  clearTimeout(tour.timer);
  tour.step++;
  const s = steps[tour.step];
  $('#progress .bar').style.width = `${(tour.step / (steps.length - 1)) * 100}%`;
  if (!s || s.kind === 'end') {
    stopTour();
    tour.step = -1;
    return;
  }
  if (s.kind === 'interlude') {
    if (s.il.chapter <= 9) {
      // tell it from the garden
      selected = 0;
      const v = viewFor(0);
      card.classList.remove('show');
      flyTo(v.pos, v.target, undefined, () => {
        controls.autoRotate = tour.playing;
      });
    }
    showInterlude(s.il, true, () => nextStep());
  } else {
    hideInterlude();
    select(s.i, { fromTour: true });
    tour.timer = window.setTimeout(() => nextStep(), (CITY_DWELL + fly.dur) * 1000);
  }
}

// ------------------------------------------------------------------ layouts
function setLayout(m: LayoutMode, instant = false) {
  mode = m;
  document.querySelectorAll<HTMLButtonElement>('#layouts button').forEach((b) => b.classList.toggle('on', b.dataset.layout === m));
  const L = LAYOUTS[m];
  nodes.forEach((n, i) => {
    n.from.copy(n.root.position);
    n.target.copy(L.positions[i]);
    if (instant) n.root.position.copy(n.target);
  });
  layoutT = instant ? 1 : 0;
  if (instant) rebuildRoute();
  for (const a of axisLabels) a.el.classList.toggle('on', a.modes.includes(m));
  if (!instant) {
    if (selected >= 0) {
      // follow the selected city as it moves
      followSelected = true;
    } else {
      const o = overviewView();
      flyTo(o.pos, o.target, 3.2);
    }
    const names: Record<LayoutMode, string> = {
      journey: 'the order of the telling, spiralling out from the garden',
      atlas: 'eleven themes, five cities each',
      structure: 'theme against chapter: the shape of the book',
    };
    showHint(names[m]);
  }
}
let followSelected = false;

// ------------------------------------------------------------------ picking
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered: CityNode | null = null;
let downAt = { x: 0, y: 0, t: 0 };

function pick(ev: PointerEvent): CityNode | null {
  pointer.set((ev.clientX / window.innerWidth) * 2 - 1, -(ev.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(
    nodes.map((n) => n.hit),
    false,
  );
  if (!hits.length) return null;
  return nodes.find((n) => n.hit === hits[0].object) ?? null;
}

renderer.domElement.addEventListener('pointermove', (ev) => {
  if (!nodes.length || ev.buttons) return;
  const n = pick(ev);
  if (n !== hovered) {
    hovered?.labelEl.classList.remove('hover');
    if (hovered) hovered.ring.scale.setScalar(1);
    hovered = n;
    hovered?.labelEl.classList.add('hover');
    if (hovered) hovered.ring.scale.set(1.012, 6, 1.012);
    renderer.domElement.style.cursor = n && nodes.indexOf(n) !== selected ? 'pointer' : '';
  }
});
renderer.domElement.addEventListener('pointerdown', (ev) => {
  downAt = { x: ev.clientX, y: ev.clientY, t: performance.now() };
});
renderer.domElement.addEventListener('pointerup', (ev) => {
  const moved = Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y);
  if (moved > 6 || performance.now() - downAt.t > 500) return;
  const n = pick(ev);
  if (n) {
    const i = nodes.indexOf(n);
    if (i !== selected) {
      stopTour();
      select(i);
    }
  }
});
controls.addEventListener('start', () => {
  if (tour.playing && !fly.active) {
    stopTour();
    showHint('journey paused: press space to continue');
  }
  controls.autoRotate = false;
});

// ------------------------------------------------------------------ dock and keyboard
$('#btn-prev').onclick = () => {
  stopTour();
  select(selected <= 0 ? nodes.length - 1 : selected - 1);
};
$('#btn-next').onclick = () => {
  stopTour();
  select(selected >= nodes.length - 1 ? 0 : selected + 1);
};
$('#btn-play').onclick = () => (tour.playing ? stopTour() : startTour());
$('#btn-overview').onclick = () => {
  stopTour();
  hideInterlude();
  goOverview();
};
$('#btn-index').onclick = () => toggleIndex();
function toggleHelp(force?: boolean) {
  const el = $('#help');
  const show = force ?? !el.classList.contains('show');
  el.classList.toggle('show', show);
  $('#btn-help').classList.toggle('on', show);
}
$('#btn-help').onclick = () => {
  toggleIndex(false);
  toggleHelp();
};
$('#help-close').onclick = () => toggleHelp(false);
$('#index-close').onclick = () => toggleIndex(false);
$('#card-close').onclick = () => {
  stopTour();
  goOverview();
};
const soundBtn = $('#btn-sound');
async function toggleSound(force?: boolean) {
  await ambience.toggle(force);
  soundBtn.textContent = ambience.on ? 'Sound on' : 'Sound off';
  soundBtn.classList.toggle('on', ambience.on);
}
soundBtn.onclick = () => toggleSound();
document.querySelectorAll<HTMLButtonElement>('#layouts button').forEach((b) => {
  b.onclick = () => setLayout(b.dataset.layout as LayoutMode);
});

window.addEventListener('keydown', (e) => {
  if (document.body.classList.contains('intro')) {
    if (e.key === 'Enter' && $('#intro').classList.contains('ready')) begin(true);
    return;
  }
  if (e.key === 'ArrowRight') {
    stopTour();
    select(selected >= nodes.length - 1 ? 0 : selected + 1);
  } else if (e.key === 'ArrowLeft') {
    stopTour();
    select(selected <= 0 ? nodes.length - 1 : selected - 1);
  } else if (e.key === ' ') {
    e.preventDefault();
    if (interludeEl.classList.contains('show') && !tour.playing) finishInterlude();
    else tour.playing ? stopTour() : startTour();
  } else if (e.key === 'Escape') {
    stopTour();
    if (interludeEl.classList.contains('show')) hideInterlude();
    else goOverview();
  } else if (e.key === '1') setLayout('journey');
  else if (e.key === '2') setLayout('atlas');
  else if (e.key === '3') setLayout('structure');
  else if (e.key.toLowerCase() === 'i') toggleIndex();
  else if (e.key.toLowerCase() === 'm') toggleSound();
  else if (e.key.toLowerCase() === 'h' || e.key === '?') toggleHelp();
  else if (e.key === 'Enter' && interludeEl.classList.contains('show')) finishInterlude();
});

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.resolution.set(w, h);
  labelRenderer.setSize(w, h);
  routeMat.uniforms.uScale.value = h / 2;
  (motes.material as THREE.ShaderMaterial).uniforms.uScale.value = h / 2;
}
window.addEventListener('resize', onResize);
window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  const i = nodes.findIndex((n) => (n.city?.id ?? 'garden') === id);
  if (i >= 0 && i !== selected) {
    stopTour();
    select(i);
  }
});

// ------------------------------------------------------------------ intro
function hideIntro() {
  document.body.classList.remove('intro');
  $('#intro').classList.add('gone');
  setTimeout(() => ($('#intro').style.display = 'none'), 1800);
}
function begin(journey: boolean) {
  hideIntro();
  toggleSound(true).catch(() => {});
  if (journey) startTour(0);
  else {
    const o = overviewView();
    flyTo(o.pos, o.target, 3.5);
    showHint('click any city to visit it, or open the index', 5000);
  }
}
$('#start-journey').onclick = () => begin(true);
$('#start-free').onclick = () => begin(false);

// ------------------------------------------------------------------ Marco's boat, sailing the route and skirting the islands
const _bp = new THREE.Vector3();
const _bq = new THREE.Vector3();
function boatPoint(u: number, out: THREE.Vector3) {
  if (!routeCurve) return out.set(0, 0, 0);
  routeCurve.getPoint(THREE.MathUtils.clamp(u, 0, 1), out);
  const T = routeCurve.getTangent(THREE.MathUtils.clamp(u, 0.0001, 0.9999));
  T.y = 0;
  T.normalize();
  const R = 14.6;
  for (const n of nodes) {
    const vx = out.x - n.root.position.x;
    const vz = out.z - n.root.position.z;
    if (vx * vx + vz * vz > R * R) continue;
    const along = vx * T.x + vz * T.z;
    // go around the island on its left side
    const side = Math.sqrt(Math.max(0, R * R - along * along));
    out.x = n.root.position.x + T.x * along - T.z * side;
    out.z = n.root.position.z + T.z * along + T.x * side;
  }
  out.y = 0;
  return out;
}
function boatTarget() {
  const n = nodes.length - 1;
  if (selected > 0) return (selected - 0.43) / n;
  if (selected === 0) return 0.43 / n;
  return boatState.u;
}
function updateBoat(dt: number, t: number) {
  if (!routeCurve) return;
  const n = nodes.length - 1;
  const target = boatTarget();
  const diff = target - boatState.u;
  if (Math.abs(diff) > 2.2 / n && boatState.pending < 0) boatState.pending = target;
  if (boatState.pending >= 0) {
    // too far to sail: the boat sinks into the mist and reappears
    boatState.scale = Math.max(0, boatState.scale - dt * 1.5);
    if (boatState.scale <= 0) {
      boatState.u = boatState.pending;
      boatState.pending = -1;
    }
  } else {
    boatState.scale = Math.min(1, boatState.scale + dt * 1.2);
    const maxStep = (0.42 / n) * dt;
    boatState.u += THREE.MathUtils.clamp(diff * dt * 1.4, -maxStep, maxStep);
  }
  boatPoint(boatState.u, _bp);
  boatPoint(boatState.u + 0.0015, _bq);
  boat.position.set(_bp.x, Math.sin(t * 1.3) * 0.08, _bp.z);
  if (_bq.distanceToSquared(_bp) > 1e-6) {
    const yaw = Math.atan2(_bq.x - _bp.x, _bq.z - _bp.z);
    let d = yaw - boat.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    boat.rotation.y += d * Math.min(1, dt * 3);
  }
  boat.rotation.z = Math.sin(t * 1.1) * 0.05;
  boat.rotation.x = Math.sin(t * 0.8) * 0.03;
  boat.scale.setScalar(Math.max(0.001, boatState.scale));
}

// ------------------------------------------------------------------ main loop
const tmpV = new THREE.Vector3();
let introSpin = 0;
let frame = 0;

function update() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  frame++;

  // layout transition
  if (layoutT < 1 && nodes.length) {
    layoutT = Math.min(1, layoutT + dt / 2.6);
    const e = ease(layoutT);
    nodes.forEach((n, i) => {
      n.root.position.lerpVectors(n.from, n.target, e);
      // a gentle hop so cities pass over one another
      n.root.position.y = Math.sin(e * Math.PI) * (6 + (i % 7) * 1.5);
    });
    rebuildRoute();
    if (followSelected && selected >= 0) {
      const v = viewFor(selected);
      controls.target.lerp(v.target, 0.12);
      camera.position.lerp(v.pos, 0.08);
    }
    if (layoutT >= 1) followSelected = false;
  }

  // highlight lift
  for (const n of nodes) {
    n.lift += (n.liftTarget - n.lift) * Math.min(1, dt * 3);
    if (layoutT >= 1) n.root.position.y = n.lift * 2.2;
  }

  // intro: slow drift above the lagoon
  if (document.body.classList.contains('intro')) {
    introSpin += dt * 0.022;
    camera.position.set(Math.sin(introSpin) * 360, 120, Math.cos(introSpin) * 360);
    controls.target.set(0, 30, 0);
    camera.lookAt(controls.target);
  } else {
    updateFly(dt);
    if (!fly.active) controls.update();
  }

  // animate the cities near the camera
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const d = tmpV.copy(n.root.position).distanceTo(camera.position);
    if (i === selected) n.focus.value = Math.min(1, n.focus.value + dt * 0.5);
    if (d < 260 || i === selected) for (const u of n.updaters) u(t, dt);
    // labels
    const el = n.labelEl;
    const hide = i === selected && card.classList.contains('show');
    if (hide !== el.classList.contains('hidden')) el.classList.toggle('hidden', hide);
    const far = d > 300 || (selected >= 0 && i !== selected);
    if (far !== el.classList.contains('far')) el.classList.toggle('far', far);
    const peer = selected >= 0 && i !== selected && !fly.active;
    if (peer !== el.classList.contains('peer')) el.classList.toggle('peer', peer);
  }

  // shadows follow the gaze
  const camDist = camera.position.distanceTo(controls.target);
  updateShadowFrustum(sun, controls.target, THREE.MathUtils.clamp(camDist * 0.75, 22, 260));

  VIEW.cam.copy(camera.position);
  VIEW.target.copy(controls.target);
  const holes = (ocean.material as THREE.ShaderMaterial).uniforms.uHoles.value as THREE.Vector3[];
  let hi = 0;
  for (const n of nodes) if (n.below > 0 && hi < 8) holes[hi++].set(n.root.position.x, n.root.position.z, 12.45);
  sky.position.copy(camera.position);
  (sky.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
  (ocean.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
  routeMat.uniforms.uTime.value = t;
  updateBoat(dt, t);
  (motes.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
  (motes.material as THREE.ShaderMaterial).uniforms.uCenter.value.copy(controls.target);
  routeMat.uniforms.uHead.value = tour.playing && selected > 0 ? (selected) / (nodes.length - 1) : -1;
  grade.uniforms.uTime.value = t % 10;

  renderer.info.reset();
  composer.render();
  labelRenderer.render(scene, camera);
  requestAnimationFrame(update);
}

// ------------------------------------------------------------------ boot
async function boot() {
  document.body.classList.add('intro');
  if (NO_UI) document.body.classList.add('noui');
  buildIndex();
  buildAxisLabels();
  requestAnimationFrame(update);
  const bar = $('.intro-bar i');
  const status = $('.intro-status');
  nodes = await buildAtlasAsync((i, n, name) => {
    bar.style.width = `${(i / n) * 100}%`;
    status.textContent = name ? `building ${name}` : 'the lagoon is ready';
  });
  for (const n of nodes) {
    scene.add(n.root);
    if (n.below === 0) n.root.add(makeLightPool(n.ringMat.color));
    n.labelEl.addEventListener('click', () => {
      stopTour();
      select(nodes.indexOf(n));
    });
  }
  setLayout('journey', true);
  // compile everything once to avoid hitches during flights
  renderer.compile(scene, camera);
  $('#intro').classList.add('ready');

  const hash = location.hash.slice(1);
  if (hash) {
    const i = nodes.findIndex((n) => (n.city?.id ?? 'garden') === hash);
    if (i >= 0) {
      hideIntro();
      const v = viewFor(i);
      camera.position.copy(v.pos);
      controls.target.copy(v.target);
      selected = i;
      fillCard(i);
      card.classList.add('show');
      if (params.has('layout')) setLayout(params.get('layout') as LayoutMode, true);
    }
  } else if (params.has('overview')) {
    hideIntro();
    if (params.has('layout')) setLayout(params.get('layout') as LayoutMode, true);
    const o = overviewView();
    camera.position.copy(o.pos);
    controls.target.copy(o.target);
  }
  (window as any).__goto = (id: string) => {
    const i = nodes.findIndex((n) => (n.city?.id ?? 'garden') === id);
    if (i < 0) return;
    const v = viewFor(i);
    camera.position.copy(v.pos);
    controls.target.copy(v.target);
    selected = i;
    fillCard(i);
    card.classList.add('show');
  };
  (window as any).__info = () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, progs: renderer.info.programs?.length });
  (window as any).__ready = true;
}
boot();
