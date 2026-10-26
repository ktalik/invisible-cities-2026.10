// MAURILIA - Cities & Memory 5.
// Visitors are shown old postcards: a hen where the bus station stands, a bandstand
// where the overpass runs, two young ladies with white parasols where the munitions
// factory smokes. One must praise the lost grace, within limits. But the postcard
// town was never this city's past: only another city that happened to bear the
// same name. Toggle: the old postcard city replaces the metropolis, discontinuously;
// only the name board, the outline of the square and the inhabitants remain.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  // ---- the card-like plinth, shared square, name board, inhabitants (common to both)
  const shape = new THREE.Shape();
  const H = 18, C = 6;
  shape.moveTo(-H + C, -H);
  shape.lineTo(H - C, -H); shape.absarc(H - C, -H + C, C, -Math.PI / 2, 0, false);
  shape.lineTo(H, H - C); shape.absarc(H - C, H - C, C, 0, Math.PI / 2, false);
  shape.lineTo(-H + C, H); shape.absarc(-H + C, H - C, C, Math.PI / 2, Math.PI, false);
  shape.lineTo(-H, -H + C); shape.absarc(-H + C, -H + C, C, Math.PI, Math.PI * 1.5, false);
  const base = new K.Batch();
  base.add(K.at(K.extrudeUp(shape, 1, 16), 0, -1.0, 0), '#f1e4c8', 'matte');
  base.add(K.at(K.extrudeUp(shape, 0.02, 16), 0, -0.01, 0, { s: [0.985, 1, 0.985] }), '#6f6e72', 'stone');
  base.add(K.at(K.box(14, 0.03, 10), 0, 0, 0), '#a49d90', 'stone');
  for (const [w, d, x, z] of [[14.4, 0.2, 0, -5.1], [14.4, 0.2, 0, 5.1], [0.2, 10.4, -7.1, 0], [0.2, 10.4, 7.1, 0]]) base.add(K.at(K.box(w, 0.05, d), x, 0, z), '#d8cdb4', 'stone');
  // name board: same spot in both cities
  const NB = new THREE.Vector3(-7.6, 0, -5.8);
  for (const s of [-1.3, 1.3]) base.add(K.at(K.cyl(0.05, 0.05, 1.5, 6), NB.x + s, 0, NB.z), '#3a3632', 'metal');
  root.add(base.build({ name: 'base' }));
  const nameTex = K.canvasTexture(768, 128, (g, w, h) => {
    g.fillStyle = '#efe6d2'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#6b4a32'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#4a3324'; g.font = `600 84px ${K.DISPLAY_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('M A U R I L I A', w / 2, h / 2 + 4);
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 0.06), [0, 0, 0, 0, 1, 1].map((k) => (k ? new THREE.MeshStandardMaterial({ map: nameTex, roughness: 0.8 }) : K.std('#4a3324'))));
  board.position.set(NB.x, 1.25, NB.z);
  board.rotation.y = -0.35;
  board.castShadow = true;
  root.add(board);
  const PEOPLE: [number, number][] = [[-8.0, 0.6], [-8.6, -0.4], [-8.9, 0.5], [-3, -2], [-1.2, 2.6], [2.4, -1.4], [4.6, 3.1], [-5.2, 3.6], [0.4, 0.2], [5.8, -3.8], [-4.1, -3.9], [3.3, 1.2], [-2.2, 4.3], [1.6, -4.2]];
  const people = K.crowd({ count: PEOPLE.length, place: (i) => [PEOPLE[i][0], 0.02, PEOPLE[i][1]], colors: ['#5a3b3b', '#2f4b6e', '#8a6a3a', '#3b3b3b', '#6d4a6a', '#a05a3a'], h: 0.3, rng: rng.fork('people') });
  root.add(people);
  const heldCard = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.11), K.std('#f4ecdc', { side: THREE.DoubleSide }));
  heldCard.position.set(-8.0 + 0.12, 0.22, 0.6);
  root.add(heldCard);

  // ---- the present metropolis
  const metro = new THREE.Group();
  root.add(metro);
  const mb = new K.Batch();
  const over = new THREE.CatmullRomCurve3([[5, -17], [9.5, -9], [11, 0], [10, 9], [5.5, 16.5]].map(([x, z]) => new THREE.Vector3(x, 1.6, z)));
  const overPts = over.getSpacedPoints(80);
  const nearOver = (x: number, z: number, d: number) => overPts.some((p) => Math.hypot(p.x - x, p.z - z) < d);
  const insidePlinth = (x: number, z: number, m: number) => {
    const ax = Math.abs(x), az = Math.abs(z), lim = H - m;
    if (ax > lim || az > lim) return false;
    if (ax > H - C && az > H - C) return Math.hypot(ax - (H - C), az - (H - C)) < C - m;
    return true;
  };
  const GREYS = ['#8d8e92', '#a2a2a4', '#7c7f86', '#b3b0aa', '#94918b', '#6f737a'];
  for (let gx = -15; gx <= 15; gx += 3.4) for (let gz = -15; gz <= 15; gz += 3.4) {
    const x = gx + rng.float(-0.3, 0.3), z = gz + rng.float(-0.3, 0.3);
    if (Math.abs(x) < 9 && Math.abs(z) < 7) continue;
    if (Math.abs(x) < 4.5 && z < -4 && z > -11) continue;
    if (x < -6 && z > 5.5 && x > -16.5) continue;
    if (nearOver(x, z, 2.6) || !insidePlinth(x, z, 1.8)) continue;
    const w = rng.float(2, 2.9), d = rng.float(2, 2.9);
    K.house(mb, { x, z, w, d, h: rng.float(2, 5.5), roof: 'flat', wall: rng.pick(GREYS), wallFinish: 'stone', roofColor: '#5d5f63', windowColor: '#3d4a55', lit: 0.12, litColor: '#ffd9a0', glow: 1.6, rng });
  }
  // bus station canopy and bays
  for (const sx of [-2.8, 0, 2.8]) for (const sz of [-5.9, -8.1]) mb.add(K.at(K.cyl(0.06, 0.06, 1.0, 6), sx, 0, sz), '#5a5d62', 'metal');
  mb.add(K.at(K.box(6.4, 0.12, 3.2), 0, 1.0, -7), '#c9ccd0', 'metal');
  mb.add(K.at(K.box(6.4, 0.02, 3.4), 0, 0.005, -7), '#55575b', 'stone');
  // overpass: deck, parapets, piers
  for (let i = 1; i < overPts.length; i++) {
    const a = overPts[i - 1], c = overPts[i];
    const ry = Math.atan2(c.x - a.x, c.z - a.z), len = a.distanceTo(c) + 0.05;
    mb.add(K.at(K.box(1.6, 0.25, len), (a.x + c.x) / 2, 1.45, (a.z + c.z) / 2, { ry }), '#a5a39d', 'stone');
    for (const s of [-0.75, 0.75]) mb.add(K.at(K.box(0.08, 0.22, len), (a.x + c.x) / 2 + Math.cos(ry) * s, 1.7, (a.z + c.z) / 2 - Math.sin(ry) * s, { ry }), '#8c8a85', 'stone');
  }
  for (let i = 0; i < 8; i++) {
    const p = overPts[Math.round(5 + i * 10)];
    mb.add(K.at(K.box(0.5, 1.45, 0.7), p.x, 0, p.z), '#8f8d88', 'stone');
  }
  // munitions factory: sawtooth shed, chimneys, fence
  const FX = -11, FZ = 9.5;
  mb.add(K.at(K.box(8, 0.9, 5), FX, 0, FZ), '#8a7f74', 'stone');
  for (let k = 0; k < 4; k++) {
    mb.add(K.at(K.shedRoof(5, 2, 0.05, 0.6), FX - 3 + k * 2, 0.9, FZ, { ry: Math.PI / 2 }), '#6b6a68', 'metal');
    mb.add(K.at(K.wallPlane(4.6, 0.45), FX - 3.95 + k * 2, 0.95, FZ, { ry: Math.PI / 2 }), '#cfe3e8', 'glass');
  }
  const chim: THREE.Vector3[] = [];
  for (const [cx, cz] of [[-13.6, 7.4], [-12.2, 12.2]]) {
    mb.add(K.at(K.cyl(0.3, 0.42, 6, 12), cx, 0, cz), '#7a5446', 'stone');
    mb.add(K.at(K.cyl(0.34, 0.34, 0.18, 12), cx, 4.8, cz), '#c9c4bc', 'stone');
    chim.push(new THREE.Vector3(cx, 6, cz));
  }
  for (let i = 0; i < 26; i++) {
    const f = i / 26;
    const [x, z] = f < 0.35 ? [-15.5 + f / 0.35 * 9, 6.2] : f < 0.65 ? [-6.5, 6.2 + (f - 0.35) / 0.3 * 7] : [-6.5 - (f - 0.65) / 0.35 * 6, 13.2];
    mb.add(K.at(K.box(0.05, 0.6, 0.05), x, 0, z), '#4a4c50', 'metal');
  }
  mb.add(K.at(K.box(9, 0.03, 0.03), -11, 0.55, 6.2), '#4a4c50', 'metal');
  mb.add(K.at(K.box(0.03, 0.03, 7), -6.5, 0.55, 9.7), '#4a4c50', 'metal');
  // sodium lamps around the square, a kiosk of postcards on the west side
  const lampPos: THREE.Vector3[] = [];
  for (let i = 0; i < 16; i++) {
    const f = i / 16, per = (f * 48) % 48;
    const [x, z] = per < 14 ? [-7 + per, -5.6] : per < 24 ? [7.6, -5 + (per - 14)] : per < 38 ? [7 - (per - 24), 5.6] : [-7.6, 5 - (per - 38)];
    if (Math.abs(x + 8) < 1.2 && Math.abs(z) < 1.5) continue;
    K.lamp(mb, { x, z, h: 1.3, glow: '#ffb35c', intensity: 3 });
    lampPos.push(new THREE.Vector3(x, 1.35, z));
  }
  K.stall(mb, { x: -8.4, z: 0, ry: Math.PI / 2, w: 1.2, d: 0.7, h: 0.8, cloth: '#d58a77' });
  for (let i = 0; i < 8; i++) mb.add(K.at(K.wallPlane(0.14, 0.1), -8.05, 0.42 + (i % 2) * 0.13, -0.45 + Math.floor(i / 2) * 0.28, { ry: Math.PI / 2 }), rng.pick(['#e8c9a0', '#d8b48a', '#f1e4c8', '#c9a27a']), 'matte');
  metro.add(mb.build({ name: 'metro' }));
  metro.add(K.glowPoints(lampPos, '#ffb35c', 1.2, 0.6));
  const smoke = K.smoke({ sources: chim, perSource: 40, height: 7, color: '#b3aca2', opacity: 0.45, size: [0.6, 2.2], life: 9, wind: [0.25, 0.1], rng: rng.fork('smoke') });
  metro.add(smoke);
  // buses and overpass traffic
  const busGeo = K.merge([K.paint(K.box(0.5, 0.45, 1.2), '#ffffff'), K.paint(K.at(K.box(0.52, 0.12, 1.0), 0, 0.25, 0), '#2a3540')]);
  const buses = K.instanced(busGeo, K.std('#ffffff', { vertexColors: true, roughness: 0.6 }), 4, (i, _o, c) => { c.set(['#c8553d', '#e0b040', '#3f7a9a', '#c8553d'][i]); });
  metro.add(buses);
  const setBus = K.instanceSetter(buses);
  const NCAR = 36;
  const cars = K.instanced(K.box(0.22, 0.14, 0.42), K.std('#ffffff', { roughness: 0.5 }), NCAR, (_i, _o, c) => { c.set(rng.pick(['#d8d8d8', '#3b3f45', '#9a2f2f', '#2f4f7a', '#c8b070'])); });
  const carLightMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const carLights = K.instanced(K.box(0.2, 0.05, 0.03), carLightMat, NCAR, (i, _o, c) => { c.set(i % 2 ? '#ff3a2a' : '#fff1c8').multiplyScalar(2.5); }, { castShadow: false });
  metro.add(cars, carLights);
  const setCar = K.instanceSetter(cars), setCL = K.instanceSetter(carLights);
  const carU = Array.from({ length: NCAR }, () => rng.float(0, 1));
  const coldLights: THREE.Sprite[] = [];

  // ---- the postcard city (another city that bore the same name)
  const post = new THREE.Group();
  const pb = new K.Batch();
  pb.add(K.at(K.extrudeUp(shape, 0.01, 16), 0, 0.012, 0, { s: [0.975, 1, 0.975] }), '#c8b58f', 'matte');
  const WALLS = ['#f1e4c8', '#ead2b8', '#f3dccb', '#e6d6b0', '#efe0c0'];
  let n = 0;
  for (let gx = -15.5; gx <= 15.5 && n < 72; gx += 2.1) for (let gz = -15.5; gz <= 15.5; gz += 2.1) {
    const x = gx + rng.float(-0.35, 0.35), z = gz + rng.float(-0.35, 0.35);
    if (Math.abs(x) < 8.5 && Math.abs(z) < 6.5) continue;
    if (Math.hypot(x - 10.5, z - 1) < 3 || Math.hypot(x, z + 7.5) < 2.5 || Math.hypot(x + 10.5, z - 9.5) < 2.6 || !insidePlinth(x, z, 2)) continue;
    if (rng.chance(0.42)) continue;
    const w = rng.float(1.0, 1.5);
    K.house(pb, { x, z, ry: rng.float(-0.08, 0.08), w, d: rng.float(0.9, 1.3), h: rng.float(0.5, 1.0), roof: 'hip', wall: rng.pick(WALLS), roofColor: rng.pick(['#b8654a', '#a85a3e', '#c47a58']), windowColor: '#6b5a4a', rng });
    n++;
  }
  K.forest(pb, { n: 24, r0: 7, r1: 16, rng: rng.fork('trees'), kinds: ['round', 'round', 'poplar'], h: [1.0, 1.8], color: '#8a9a5a', avoid: (x, z) => (Math.abs(x) < 8 && Math.abs(z) < 6) || !insidePlinth(x, z, 2) });
  // bandstand on the overpass site
  const BS = new THREE.Vector3(10.5, 0, 1);
  pb.add(K.at(K.ngon(1.2, 0.3, 8), BS.x, 0, BS.z), '#e8dcc4', 'stone');
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; pb.add(K.at(K.cyl(0.04, 0.04, 1.1, 6), BS.x + Math.cos(a) * 1.05, 0.3, BS.z + Math.sin(a) * 1.05), '#f4efe6', 'plaster'); }
  pb.add(K.at(K.lathe([[1.4, 0], [0.9, 0.3], [0.5, 0.45], [0.06, 0.8], [0.01, 0.9]], 8), BS.x, 1.4, BS.z), '#3f6a5a', 'ceramic');
  K.flag(pb, { x: BS.x, y: 2.2, z: BS.z, h: 0.5, w: 0.25, color: '#c25a4a' });
  for (let i = 0; i < 4; i++) K.lamp(pb, { x: [-7.6, 7.6][i % 2], z: [-5.6, 5.6][i >> 1], h: 1.1, glow: '#ffe2b0', intensity: 1.5 });
  // two young ladies with white parasols on the factory site, and a hen on the bus station site
  const LADY = [new THREE.Vector3(-10.8, 0, 9.3), new THREE.Vector3(-10.2, 0, 9.7)];
  for (const [i, L] of LADY.entries()) {
    pb.add(K.at(K.cone(0.16, 0.26, 10), L.x, 0, L.z), i ? '#f2d6d6' : '#f4f0e6', 'cloth');
    pb.add(K.at(K.cyl(0.05, 0.07, 0.12, 8), L.x, 0.2, L.z), i ? '#f2d6d6' : '#f4f0e6', 'cloth');
    pb.add(K.at(K.sphere(0.05, 8, 6), L.x, 0.36, L.z), '#f0d9c4', 'matte');
    pb.add(K.at(K.cyl(0.006, 0.006, 0.32, 4), L.x + 0.06, 0.2, L.z), '#5a4632', 'wood');
    pb.add(K.at(K.dome(0.16, 12, 1, 0.45), L.x + 0.06, 0.52, L.z), '#ffffff', 'cloth');
  }
  const HEN = new THREE.Vector3(0, 0, -7.5);
  post.add(pb.build({ name: 'postcard' }));
  const hen = new THREE.Mesh(K.merge([
    K.paint(K.at(K.sphere(0.07, 10, 8), 0, 0.08, 0, { s: [0.8, 0.8, 1.15] }), '#f2ead8'),
    K.paint(K.at(K.sphere(0.035, 8, 6), 0, 0.15, 0.07), '#f2ead8'),
    K.paint(K.at(K.box(0.012, 0.03, 0.03), 0, 0.18, 0.07), '#c8352a'),
    K.paint(K.at(K.cone(0.012, 0.03, 4), 0, 0.15, 0.115, { rx: Math.PI / 2 }), '#e0a030'),
    K.paint(K.at(K.cone(0.05, 0.08, 5), 0, 0.09, -0.09, { rx: -0.9 }), '#f2ead8'),
    K.paint(K.at(K.box(0.01, 0.05, 0.01), 0.02, 0, 0), '#e0a030'), K.paint(K.at(K.box(0.01, 0.05, 0.01), -0.02, 0, 0), '#e0a030'),
  ]), K.std('#ffffff', { vertexColors: true }));
  hen.position.copy(HEN);
  hen.scale.setScalar(1.6);
  post.add(hen);
  // the gods under names and over places
  const GODS = Array.from({ length: 6 }, (_, i) => new THREE.Vector3(NB.x + 0.8 + i * 0.9, 1.9 + (i % 3) * 0.55, NB.z + 0.5 + i * 0.35));
  const gods = GODS.map((p) => { const s = K.glowSprite('#ffd890', 0.7, 0.85); s.position.copy(p); root.add(s); return s; });
  GODS.forEach((p) => { const s = K.glowSprite('#9fd0ff', 0.45, 0.6); s.position.copy(p).add(new THREE.Vector3(0.3, -0.25, 0)); metro.add(s); coldLights.push(s); });
  const warmSun = new THREE.DirectionalLight('#ffe0b0', 0);
  warmSun.position.set(-15, 20, 12);
  root.add(warmSun);

  // ---- render the three postcard views once, from the postcard city itself
  const tmpScene = new THREE.Scene();
  tmpScene.background = new THREE.Color('#e9d9b8');
  tmpScene.fog = new THREE.Fog('#e9d9b8', 8, 30);
  tmpScene.add(new THREE.HemisphereLight('#fff2dc', '#8a7a5a', 1.6));
  const tsun = new THREE.DirectionalLight('#fff0d0', 2.4);
  tsun.position.set(-6, 10, 8);
  tmpScene.add(tsun);
  tmpScene.add(post);
  const camDir = new THREE.Vector3(-0.92, 0, 0.38).normalize();
  const shoot = (site: THREE.Vector3, dist: number, lift: number, look: number) => {
    const rt = new THREE.WebGLRenderTarget(512, 336, { samples: 4 });
    const cam = new THREE.PerspectiveCamera(32, 512 / 336, 0.05, 100);
    cam.position.copy(site).addScaledVector(camDir, dist).setY(lift);
    cam.lookAt(site.x, look, site.z);
    const r = ctx.renderer;
    const prev = r.getRenderTarget();
    const sm = r.shadowMap.enabled;
    r.shadowMap.enabled = false;
    r.setRenderTarget(rt);
    r.render(tmpScene, cam);
    r.setRenderTarget(prev);
    r.shadowMap.enabled = sm;
    return rt;
  };
  const shots = [shoot(HEN, 2.2, 0.75, 0.15), shoot(BS, 6.5, 2.4, 1.0), shoot(new THREE.Vector3(-10.5, 0, 9.5), 2.6, 0.8, 0.35)];
  tmpScene.remove(post);
  root.add(post);
  post.visible = false;

  // ---- postcard material: sepia, hand tint, deckled paper border, film flicker
  const cardMat = (tex: THREE.Texture, glow: number) => new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uTime: K.U.time, uGlow: { value: glow }, uOpacity: { value: 1 } },
    side: THREE.DoubleSide, transparent: true,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `${K.GLSL_NOISE}
      uniform sampler2D map; uniform float uTime, uGlow, uOpacity; varying vec2 vUv;
      void main(){
        vec2 e = min(vUv, 1.0 - vUv);
        float deckle = 0.012 + 0.008 * hash12(floor(vUv * 90.0));
        if (min(e.x, e.y * 1.5) < deckle) discard;
        vec3 paper = vec3(0.93, 0.88, 0.78);
        float inner = step(0.06, e.x) * step(0.08, e.y);
        if (!gl_FrontFacing) { gl_FragColor = vec4(paper * 0.8, uOpacity); return; }
        vec2 uv = (vUv - 0.06) / 0.88;
        vec3 c = texture2D(map, clamp(uv, 0.0, 1.0)).rgb;
        float l = dot(c, vec3(0.3, 0.59, 0.11));
        vec3 sep = vec3(l * 1.08, l * 0.86, l * 0.62);
        vec3 tint = mix(sep, c * vec3(1.05, 0.92, 0.78), 0.4);
        float grain = hash12(vUv * 400.0 + floor(uTime * 12.0)) * 0.08;
        float flick = 1.0 + 0.04 * sin(uTime * 23.0) * sin(uTime * 7.0);
        float vig = smoothstep(0.0, 0.25, min(uv.x, 1.0 - uv.x)) * smoothstep(0.0, 0.25, min(uv.y, 1.0 - uv.y));
        vec3 img = (tint * (0.75 + 0.25 * vig) - grain) * flick;
        gl_FragColor = vec4(mix(paper, img, inner) * uGlow, uOpacity);
      }`,
  });
  const cardGeo = new THREE.PlaneGeometry(5.4, 3.55);
  const heroSites = [new THREE.Vector3(0, 4.6, -7.5), new THREE.Vector3(11, 5.6, 0.5), new THREE.Vector3(-11, 8.6, 9.5)];
  const heroMats = shots.map((rt) => cardMat(rt.texture, 1.12));
  const heroCards = heroSites.map((p, i) => { const m = new THREE.Mesh(cardGeo, heroMats[i]); m.position.copy(p); root.add(m); return m; });
  const smallGeo = new THREE.PlaneGeometry(0.8, 0.55);
  const smallMats = shots.map((rt) => cardMat(rt.texture, 1.15));
  const small = Array.from({ length: 12 }, (_, i) => {
    const m = new THREE.Mesh(smallGeo, smallMats[i % 3]);
    root.add(m);
    return { m, r: rng.float(5, 13), a: rng.angle(), y: rng.float(3, 8), sp: rng.float(0.03, 0.07) * rng.sign(), ph: rng.angle() };
  });

  const dust = K.particles({ count: 700, radius: 16, y0: 0, y1: 4, color: '#cfc6b4', colors: ['#b8ad98', '#e0d6c0'], size: 0.12, opacity: 0, velocity: [0.1, 0.25, 0], swirl: 0.8, rng: rng.fork('dust') });
  root.add(dust);
  const dustU = (dust.material as THREE.ShaderMaterial).uniforms.uOpacity;

  const tog = new K.Toggle(1 / 6);
  const v3 = new THREE.Vector3();
  const lightsMat = carLightMat;

  return {
    root,
    env: {
      skyTop: '#5f6f7e',
      skyHorizon: '#d8c7aa',
      skyBottom: '#8a8478',
      skyCurve: 0.6,
      fog: '#a9a294',
      fogNear: 55,
      fogFar: 170,
      sunDir: [-0.5, 0.55, 0.45],
      sunColor: '#f2e6d2',
      sunIntensity: 1.7,
      sunDisc: 0.6,
      sunGlow: 0.8,
      hemiSky: '#c9c6c0',
      hemiGround: '#6a6660',
      hemiIntensity: 1.0,
      envIntensity: 0.9,
      clouds: 0.5,
      cloudColor: '#d9d2c4',
      bloomStrength: 0.5,
      bloomThreshold: 0.85,
      tiltShift: 0.4,
      shadowRadius: 24,
      vignette: 0.4,
      saturation: 0.95,
    },
    camera: {
      position: [-31.5, 22, 13.5],
      target: [0, 2, 0],
      minDistance: 3,
      maxDistance: 80,
      autoRotate: 0.2,
      views: [
        { position: [6, 36, 26], target: [0, 0, 0] },
        { position: [-6.2, 1.7, 3.8], target: [-8.2, 0.5, 0.2] },
      ],
    },
    interaction: {
      label: 'Old postcard',
      activeLabel: 'Back to the metropolis',
      hint: 'Not its past: another city that happened to bear the same name.',
      set: (on) => tog.set(on),
    },
    update(t, dt) {
      tog.update(dt);
      const r = tog.raw;
      // total discontinuity: one city sinks away, a beat of emptiness, the other rises
      const mk = 1 - K.easeInOut(K.clamp(r / 0.42));
      const pk = K.easeInOut(K.clamp((r - 0.58) / 0.42));
      metro.visible = mk > 0.005;
      metro.scale.set(1, Math.max(0.005, mk), 1);
      metro.position.y = -(1 - mk) * 0.6;
      post.visible = pk > 0.005;
      post.scale.set(1, Math.max(0.005, pk), 1);
      post.position.y = -(1 - pk) * 0.6;
      dustU.value = (Math.sin(Math.PI * K.clamp(r / 0.42)) + Math.sin(Math.PI * K.clamp((r - 0.58) / 0.42))) * 0.55;
      warmSun.intensity = pk * 1.4;
      // the gods: present only in the postcard city; they drift up and away when it goes
      const leave = tog.target === 0 ? 1 - pk : 0;
      gods.forEach((g, i) => {
        g.visible = pk > 0.01 || (leave > 0 && leave < 1);
        g.position.copy(GODS[i]).add(v3.set(Math.sin(t * 0.5 + i) * 0.15, Math.sin(t * 0.7 + i * 2) * 0.1 + leave * 9, 0));
        (g.material as THREE.SpriteMaterial).opacity = 0.85 * Math.max(pk, (1 - leave) * (tog.target === 0 ? 1 : 0)) * (pk > 0.01 ? 1 : 1 - leave);
      });
      coldLights.forEach((s, i) => { s.position.y = GODS[i].y - 0.25 + Math.sin(t * 1.3 + i) * 0.03; });
      // cards face the viewer, drift like leaves, fade while the postcard city stands
      const cam = ctx.camera.position;
      heroCards.forEach((m, i) => {
        m.position.y = heroSites[i].y + Math.sin(t * 0.6 + i * 2) * 0.12;
        m.rotation.set(0, Math.atan2(cam.x - m.position.x, cam.z - m.position.z), Math.sin(t * 0.4 + i) * 0.04);
        heroMats[i].uniforms.uOpacity.value = mk;
        m.visible = mk > 0.01;
      });
      small.forEach((s, i) => {
        const a = s.a + t * s.sp;
        s.m.position.set(Math.cos(a) * s.r, s.y + Math.sin(t * 0.5 + s.ph) * 0.6, Math.sin(a) * s.r);
        s.m.rotation.set(Math.sin(t * 0.7 + s.ph) * 0.6, a * 2 + t * 0.2, Math.cos(t * 0.5 + i) * 0.4);
        s.m.visible = mk > 0.01;
      });
      heldCard.rotation.set(-0.4, Math.sin(t * 0.8) * 1.4, 0);
      // present-day traffic
      for (let i = 0; i < 4; i++) {
        const f = K.fract(t / 18 + i * 0.25);
        const z = -5.9 - 1.1 - K.smoothstep(0.6, 1, f) * 6 + (1 - K.smoothstep(0, 0.3, f)) * -6;
        setBus(i, -2.1 + i * 1.4, 0.02, z, 0);
      }
      setBus.done();
      for (let i = 0; i < NCAR; i++) {
        const dir = i % 2 ? 1 : -1;
        const u = K.fract(carU[i] + dir * t * 0.018);
        const p = over.getPointAt(u), q = over.getPointAt(Math.min(0.999, u + 0.001));
        const ry = Math.atan2(q.x - p.x, q.z - p.z);
        const off = dir * 0.38;
        const x = p.x + Math.cos(ry) * off, z = p.z - Math.sin(ry) * off;
        setCar(i, x, 1.72, z, ry);
        setCL(i, x + Math.sin(ry) * 0.21 * dir, 1.79, z + Math.cos(ry) * 0.21 * dir, ry);
      }
      setCar.done(); setCL.done();
      lightsMat.color.setScalar(1);
      // postcard city: time almost stopped
      hen.rotation.x = K.smoothstep(0.9, 1, Math.sin(t * 0.7) * 0.5 + 0.5) * 0.6;
      hen.rotation.y = Math.floor(t / 4) * 0.9;
    },
    dispose() {
      shots.forEach((rt) => rt.dispose());
    },
  };
};

export default build;
