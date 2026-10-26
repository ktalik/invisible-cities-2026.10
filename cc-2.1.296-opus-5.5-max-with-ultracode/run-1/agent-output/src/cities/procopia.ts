// PROCOPIA - Continuous Cities 3.
// A cutaway room at the inn, its window open on the same late-summer view: a
// ditch, a little stone bridge, a field of corn, a hill, a farmhouse. Every year
// the traveller returns, and every year the view holds more faces: in the corn,
// along the ditch, on the hill and the roofs, at the inn door, then in the room
// itself, until there is no landscape left. Toggle: the years pass (the calendar
// on the wall counts them).

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const FLOOR = 1.5; // the room's floor height
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const Y0 = 3, Y1 = 15;

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  // ---- ground
  const isl = K.island({ radius: 21, flat: 19.5, depth: 10, top: '#a3a456', edge: '#8f8a4c', cliff: '#8a7458', under: '#4a3d33', strata: '#a48a62', seed: 23, hills: 0.3 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -9, color: '#f6d7a8', shadow: '#8a7066', opacity: 0.7, coverage: 0.5 }));
  const b = new K.Batch();

  // the hill behind the field
  const HX = -8, HZ = -13, HR = 7.5, HH = 3.4;
  const hillY = (x: number, z: number) => {
    const d2 = ((x - HX) ** 2 + (z - HZ) ** 2) / (HR * HR);
    return d2 >= 1 ? 0 : HH * Math.sqrt(1 - d2);
  };
  b.add(K.paintBy(K.at(K.sphere(1, 40, 20), HX, 0, HZ, { s: [HR, HH, HR] }), (x, y, z, out) => {
    out.set('#8fa04c').lerp(new THREE.Color('#b9b062'), K.clamp(y / HH) * 0.7 + 0.15 * K.noise2(x * 0.5, z * 0.5));
  }), null, 'matte');
  K.forest(b, { n: 12, cx: HX, cz: HZ, r0: 2, r1: 6, rng, kinds: ['cypress', 'poplar', 'round'], h: [1.0, 1.8], y: hillY });
  K.forest(b, { n: 30, r0: 16, r1: 19, rng, kinds: ['poplar', 'round', 'cypress'], h: [1.0, 2.0], avoid: (x, z) => z > 4 });

  // the ditch with its banks, and the little bridge
  const DZ = -5;
  for (const s of [-1, 1]) b.add(K.at(K.box(36, 0.12, 0.35), 0, 0, DZ + s * 0.62), '#6e5a3c', 'matte');
  b.add(K.at(K.box(36, 0.02, 0.9), 0, 0, DZ), '#3e3324', 'matte');
  root.add(K.waterRect(36, 0.9, 0, 0.06, DZ, 0, { color: '#4e6f6a', amp: 0.4, speed: 0.5 }));
  const BX = 1.6;
  b.add(K.at(K.archWall(1.8, 0.42, 0.7, 0.7, 0.32), BX, 0, DZ, { ry: Math.PI / 2 }), '#b9a58a', 'stone');
  for (const s of [-1, 1]) b.add(K.at(K.box(0.07, 0.14, 1.8), BX + s * 0.33, 0.42, DZ), '#a8957a', 'stone');
  // dirt path: inn door -> bridge -> farmhouse
  b.add(K.at(K.box(0.6, 0.015, 2.8), BX, 0, -2.6), '#b59a6c', 'matte');
  b.add(K.at(K.box(0.6, 0.015, 9.5), BX + 1.5, 0, -10.6, { ry: -0.33 }), '#b59a6c', 'matte');

  // the field of corn (instanced, swaying)
  const cornGeo = K.merge([
    K.paint(K.cyl(0.012, 0.016, 0.42, 4), '#8d8e3e'),
    K.paint(K.at(K.box(0.2, 0.006, 0.035), 0.08, 0.2, 0, { rz: 0.4 }), '#9da148'),
    K.paint(K.at(K.box(0.2, 0.006, 0.035), -0.08, 0.27, 0, { rz: -0.4, ry: 0.8 }), '#a9a24e'),
    K.paint(K.at(K.box(0.18, 0.006, 0.035), 0.06, 0.33, 0.03, { rz: 0.5, ry: 2 }), '#9da148'),
    K.paint(K.at(K.cone(0.024, 0.1, 5), 0.03, 0.22, 0, { rz: -0.3 }), '#e2c25a'),
    K.paint(K.at(K.cone(0.02, 0.09, 4), 0, 0.42, 0), '#d9b860'),
  ]);
  const cornMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
  cornMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = K.U.time;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
      float ph = instanceMatrix[3].x * 0.55 + instanceMatrix[3].z * 0.35;
      #else
      float ph = 0.0;
      #endif
      float sw = (sin(uTime * 1.4 + ph) * 0.7 + sin(uTime * 2.3 + ph * 1.7) * 0.3) * 0.07 * position.y / 0.42;
      transformed.x += sw; transformed.z += sw * 0.4;`);
  };
  const FX0 = -3.5, FX1 = 9.5, FZ0 = -12.5, FZ1 = -6.2;
  const corn: [number, number][] = [];
  for (let z = FZ0; z < FZ1; z += 0.3) for (let x = FX0; x < FX1; x += 0.24) if (Math.abs(x - (BX + 1.5 - (z + 10.6) * 0.33)) > 0.45) corn.push([x + rng.float(-0.05, 0.05), z + rng.float(-0.04, 0.04)]);
  root.add(K.instanced(cornGeo, cornMat, corn.length, (i, o) => {
    o.position.set(corn[i][0], 0, corn[i][1]);
    o.rotation.y = rng.angle();
    o.scale.setScalar(rng.float(0.85, 1.15));
  }, { colors: false }));

  // the farmhouse across the field
  const FHX = 7, FHZ = -15, FW = 2.2, FD = 1.5, FH = 1.0, FR = 0.7;
  K.house(b, { x: FHX, z: FHZ, w: FW, d: FD, h: FH, roof: 'gable', roofH: FR, wall: '#e6d2ac', roofColor: '#a65a3a', rng, lit: 0 });
  K.chimney(b, { x: FHX + 0.6, z: FHZ - 0.3, y: FH + 0.3, h: 0.6, color: '#c9b08a' });
  K.forest(b, { n: 5, cx: FHX, cz: FHZ, r0: 1.8, r1: 3, rng, kinds: ['round', 'poplar'], h: [1.1, 1.6] });

  // ---- the inn: stone ground floor, the cutaway room above
  const IW = 3.2, ID = 2.6, WALL = 1.05, WT = 0.1;
  const BACK = -ID / 2;
  b.add(K.at(K.box(IW + 0.2, FLOOR, ID + 0.2), 0, 0, 0), '#bfae8f', 'stone');
  for (let y = 0.3; y < FLOOR; y += 0.3) b.add(K.at(K.box(IW + 0.22, 0.02, ID + 0.22), 0, y, 0), '#a8987a', 'stone');
  b.add(K.at(K.box(0.4, 0.62, 0.04), BX - 0.05, 0, BACK - 0.1), '#5a3b26', 'wood');
  b.add(K.at(K.box(0.6, 0.04, 0.3), BX - 0.05, 0.7, BACK - 0.22), '#7a5636', 'wood');
  b.add(K.at(K.box(0.36, 0.22, 0.03), BX + 0.45, 0.85, BACK - 0.12), '#2d4f3a', 'wood');
  b.add(K.at(K.box(2.4, 0.02, 1.4), 0.8, 0, BACK - 0.8), '#a89a82', 'stone');
  // room floor and walls (window in the back wall, looking at the field)
  b.add(K.at(K.box(IW, 0.06, ID), 0, FLOOR, 0), '#8b5e3a', 'wood');
  for (let x = -IW / 2 + 0.2; x < IW / 2; x += 0.2) b.add(K.at(K.box(0.008, 0.005, ID - 0.02), x, FLOOR + 0.06, 0), '#6f4a2d', 'wood');
  const F = FLOOR + 0.06;
  const WX = 0.2, WW = 0.8, WY0 = 0.36, WY1 = 0.86;
  const wallC = '#ead9b8';
  b.add(K.at(K.box(IW / 2 + WX - WW / 2, WALL, WT), (-IW / 2 + WX - WW / 2) / 2, F, BACK), wallC, 'plaster');
  b.add(K.at(K.box(IW / 2 - WX - WW / 2, WALL, WT), (IW / 2 + WX + WW / 2) / 2, F, BACK), wallC, 'plaster');
  b.add(K.at(K.box(WW, WY0, WT), WX, F, BACK), wallC, 'plaster');
  b.add(K.at(K.box(WW, WALL - WY1, WT), WX, F + WY1, BACK), wallC, 'plaster');
  b.add(K.at(K.box(WT, WALL, ID), -IW / 2, F, 0), wallC, 'plaster');
  b.add(K.at(K.box(WT, 0.32, ID), IW / 2, F, 0), wallC, 'plaster');
  b.add(K.at(K.box(IW, 0.18, 0.012), 0, F, BACK + 0.056), '#9c6e4a', 'wood');
  b.add(K.at(K.box(0.012, 0.18, ID), -IW / 2 + 0.056, F, 0), '#9c6e4a', 'wood');
  // window frame, sill, open casements and shutters
  for (const s of [-1, 1]) b.add(K.at(K.box(0.05, WY1 - WY0 + 0.05, WT + 0.04), WX + s * (WW / 2 + 0.02), F + WY0 - 0.02, BACK), '#5a3b26', 'wood');
  b.add(K.at(K.box(WW + 0.12, 0.04, WT + 0.16), WX, F + WY0 - 0.04, BACK), '#6f4a2d', 'wood');
  b.add(K.at(K.box(WW + 0.1, 0.05, WT + 0.04), WX, F + WY1, BACK), '#5a3b26', 'wood');
  for (const s of [-1, 1]) {
    const pane = K.box(WW / 2 - 0.02, WY1 - WY0 - 0.04, 0.02).translate(-s * (WW / 4 - 0.01), 0, 0).rotateY(s * 1.15);
    b.add(pane.translate(WX + s * WW / 2, F + WY0 + 0.02, BACK + WT / 2 + 0.01), '#cfe4ea', 'glass');
    const fr = K.box(WW / 2 - 0.02, 0.025, 0.03).translate(-s * (WW / 4 - 0.01), 0, 0).rotateY(s * 1.15);
    b.add(fr.translate(WX + s * WW / 2, F + WY1 - 0.04, BACK + WT / 2 + 0.01), '#5a3b26', 'wood');
    b.add(K.at(K.box(WW / 2 - 0.02, WY1 - WY0, 0.03), WX + s * (WW * 0.75 + 0.05), F + WY0, BACK - WT / 2 - 0.04, { ry: s * 0.2 }), '#3f6a4e', 'wood');
  }
  // furniture: bed, table and chair, washstand with jug, a lamp
  b.add(K.at(K.box(0.62, 0.14, 1.0), -1.1, F, 0.45), '#6a4428', 'wood');
  b.add(K.at(K.box(0.58, 0.07, 0.86), -1.1, F + 0.14, 0.52), '#a33a2e', 'cloth');
  b.add(K.at(K.box(0.5, 0.06, 0.16), -1.1, F + 0.14, 0.0), '#f2ece0', 'cloth');
  b.add(K.at(K.box(0.62, 0.34, 0.05), -1.1, F, -0.08), '#5a3b26', 'wood');
  b.add(K.at(K.box(0.5, 0.03, 0.36), 0.95, F + 0.24, -0.55), '#7a5232', 'wood');
  for (const sx of [-0.21, 0.21]) for (const sz of [-0.14, 0.14]) b.add(K.at(K.box(0.03, 0.24, 0.03), 0.95 + sx, F, -0.55 + sz), '#5a3b26', 'wood');
  b.add(K.at(K.lathe([[0.04, 0], [0.055, 0.04], [0.035, 0.1], [0.045, 0.13]], 10), 0.85, F + 0.27, -0.55), '#e9e2d2', 'ceramic');
  b.add(K.at(K.box(0.2, 0.04, 0.2), 0.95, F + 0.13, -0.15), '#7a5232', 'wood');
  b.add(K.at(K.box(0.2, 0.22, 0.03), 0.95, F + 0.13, -0.05), '#7a5232', 'wood');
  for (const sx of [-0.08, 0.08]) for (const sz of [-0.08, 0.08]) b.add(K.at(K.box(0.02, 0.13, 0.02), 0.95 + sx, F, -0.15 + sz), '#5a3b26', 'wood');
  b.add(K.at(K.cyl(0.015, 0.02, 0.06, 6), 1.08, F + 0.27, -0.6), '#c49a52', 'bronze');
  b.add(K.at(K.sphere(0.035, 8, 6), 1.08, F + 0.35, -0.6), '#ffd08a', 'glow', 3);
  // in front of the inn: a vineyard, a well and the lane the traveller arrives by
  for (let r = 0; r < 7; r++) {
    const z = 3.4 + r * 0.9;
    const L = 9 - r * 0.4;
    b.add(K.at(K.box(L, 0.012, 0.42), -1 + r * 0.2, 0, z), '#8c7550', 'matte');
    for (let x = -1 + r * 0.2 - L / 2; x < -1 + r * 0.2 + L / 2; x += 0.42) {
      b.add(K.at(K.cyl(0.015, 0.02, 0.36, 4), x, 0, z), '#5a4430', 'wood');
      b.add(K.wobble(K.at(K.sphere(0.17, 7, 5), x + 0.2, 0.28, z, { s: [1.4, 0.9, 0.9] }), 0.04, 3, r + x), K.jitter('#5f7d36', rng, 0.03, 0.08, 0.08), 'matte');
    }
  }
  b.add(K.at(K.box(1.0, 0.015, 9), 4.6, 0, 6.4), '#b59a6c', 'matte');
  b.add(K.at(K.box(1.6, 0.015, 0.9), 3.4, 0, 1.75), '#b59a6c', 'matte');
  K.well(b, { x: -2.6, z: 2.1, r: 0.32, color: '#c2b293', roofColor: '#8a4a32' });
  b.add(K.at(K.cyl(0.03, 0.03, 1.2, 5), 2.1, 0, 1.6), '#5a3b26', 'wood');
  b.add(K.at(K.box(0.7, 0.04, 0.04), 2.4, 1.1, 1.6), '#5a3b26', 'wood');
  b.add(K.at(K.box(0.42, 0.3, 0.03), 2.5, 0.75, 1.6), '#8a4a32', 'wood');
  root.add(b.build({ name: 'procopia' }));

  // the calendar on the wall counts the years
  const calTex = ROMAN.map((r) => K.canvasTexture(160, 200, (g, w, h) => {
    g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#a3352a'; g.fillRect(0, 0, w, 46);
    g.fillStyle = '#f4ecd8'; g.font = 'bold 26px Georgia, serif'; g.textAlign = 'center'; g.fillText('ANNO', w / 2, 33);
    g.fillStyle = '#2a2420'; g.font = 'bold 80px Georgia, serif'; g.fillText(r, w / 2, 140);
    g.strokeStyle = '#c9b892'; g.lineWidth = 2;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(24, 166 + i * 10); g.lineTo(w - 24, 166 + i * 10); g.stroke(); }
  }));
  const calMat = new THREE.MeshStandardMaterial({ map: calTex[Y0 - 1], roughness: 0.9 });
  const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.32), calMat);
  cal.position.set(-IW / 2 + WT / 2 + 0.01, F + 0.62, -0.55);
  cal.rotation.y = Math.PI / 2;
  root.add(cal);

  // ---- the faces: each person has a year of arrival
  type P = { x: number; y: number; z: number; ry: number; yr: number; s: number };
  const people: P[] = [];
  const prng = rng.fork('people');
  const zone = (n: number, y0: number, y1: number, place: () => [number, number, number] | null) => {
    const list: P[] = [];
    let tries = 0;
    while (list.length < n && tries++ < n * 30) {
      const p = place();
      if (!p) continue;
      if (people.some((q) => Math.abs(q.x - p[0]) < 0.16 && Math.abs(q.z - p[2]) < 0.16 && Math.abs(q.y - p[1]) < 0.3)) continue;
      list.push({ x: p[0], y: p[1], z: p[2], ry: prng.float(-0.6, 0.6), yr: 0, s: prng.float(0.9, 1.08) });
      people.push(list[list.length - 1]);
    }
    prng.shuffle(list).forEach((p, i) => { p.yr = K.lerp(y0, y1, Math.pow(i / Math.max(1, list.length - 1), 0.85)); });
  };
  // the first, single face in the corn
  people.push({ x: 2.6, y: 0, z: -8.6, ry: 0.2, yr: 1, s: 1 });
  zone(300, 2, 9, () => [prng.float(FX0, FX1), 0, prng.float(FZ0, FZ1)]);
  zone(70, 3, 8, () => { const s = prng.sign(); return [prng.float(-14, 14), 0.12, DZ + s * 0.62]; });
  zone(8, 4, 7, () => [BX + prng.float(-0.2, 0.2), 0.48, DZ + prng.float(-0.8, 0.8)]);
  zone(170, 4, 11, () => { const [dx, dz] = prng.inDisc(HR * 0.88); const x = HX + dx, z = HZ + dz; return [x, hillY(x, z), z]; });
  zone(26, 5, 9.5, () => { const x = FHX + prng.float(-FW / 2 + 0.1, FW / 2 - 0.1), dz = prng.float(-FD / 2, FD / 2); return [x, FH + FR * (1 - Math.abs(dz) / (FD / 2 + 0.08)) - 0.04, FHZ + dz]; });
  zone(60, 6, 10.5, () => [prng.float(-2, 4.5), 0, prng.float(-4.15, BACK - 0.35)]);
  zone(60, 7, 11, () => { const x = prng.float(-12, 12); return Math.abs(x) < 2.6 ? null : [x, 0, prng.float(-4.15, -2.0)]; });
  zone(4, 10, 11, () => [WX + prng.float(-0.3, 0.3), F + WY0, BACK]);
  zone(170, 11, 14.6, () => [prng.float(-IW / 2 + 0.12, IW / 2 - 0.12), F + 0.01, prng.float(BACK + 0.15, ID / 2 - 0.1)]);
  zone(8, 13.5, 14.8, () => [-1.1 + prng.float(-0.2, 0.2), F + 0.21, 0.5 + prng.float(-0.3, 0.4)]);

  const N = people.length;
  const bodyGeo = K.merge([K.cyl(0.055, 0.1, 0.36, 7), K.at(K.sphere(0.075, 7, 5), 0, 0.33, 0, { s: [1.15, 0.6, 0.9] })]);
  const headGeo = K.at(K.sphere(0.07, 10, 8), 0, 0.45, 0, { s: [1, 1.08, 0.95] });
  const clothes = ['#7a3b2e', '#2f4b6e', '#c9a35a', '#e8e0d0', '#4a5d3a', '#6d3d5e', '#3b3631', '#a65a3a', '#5c6f8a'];
  const skins = ['#f1d3b6', '#e3b994', '#c99872', '#f4dcc4', '#d5a982'];
  const bodies = K.instanced(bodyGeo, new THREE.MeshStandardMaterial({ roughness: 0.9 }), N, (_i, _o, c) => { c.copy(K.pickJitter(clothes, prng)); });
  const heads = K.instanced(headGeo, new THREE.MeshStandardMaterial({ roughness: 0.6 }), N, (_i, _o, c) => { c.copy(K.pickJitter(skins, prng, 0.01, 0.04, 0.04)); });
  root.add(bodies, heads);
  const setB = K.instanceSetter(bodies), setH = K.instanceSetter(heads);
  // everyone looks towards the window (they are politely looking at the traveller)
  const winPos = new THREE.Vector3(WX, F + 0.6, BACK);
  const yaw = people.map((p) => Math.atan2(winPos.x - p.x, winPos.z - p.z) + (p.y > F - 0.1 && p.z > BACK ? Math.PI + p.ry : p.ry * 0.4));

  // ---- life: crows over the field, dust motes, smoke from the farm chimney
  const crows = new K.Flock({ count: 14, center: [2, 0, -10], radius: 6, height: 5.5, color: '#2a2622', span: 0.3, speed: 0.3, rng: rng.fork('crows') });
  root.add(crows.mesh);
  root.add(K.smoke({ sources: [[FHX + 0.6, FH + 0.95, FHZ - 0.3]], perSource: 24, height: 2.5, color: '#e9e2d6', opacity: 0.35, size: [0.2, 0.6], wind: [0.25, 0.05], rng: rng.fork('smoke') }));
  root.add(K.particles({ count: 160, radius: 14, center: [1, 0, -7], y0: 0.3, y1: 4, color: '#ffe6a8', size: 0.05, opacity: 0.6, swirl: 0.5, twinkle: 0.8, rng: rng.fork('motes') }));

  const tog = new K.Toggle(0.17);
  let lastYear = -1, lastCal = -1;
  const pop = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : (1 + 0.3 * Math.sin(Math.PI * k)) * K.smoothstep(0, 0.5, k));

  return {
    root,
    env: {
      skyTop: '#5b86b8', skyHorizon: '#f4cf9a', skyBottom: '#c7a27e', skyCurve: 0.5,
      fog: '#eccb9c', fogNear: 60, fogFar: 170,
      sunDir: [0.75, 0.42, 0.6], sunColor: '#ffd29a', sunIntensity: 3.0, sunDisc: 0.8, sunGlow: 1.0,
      hemiSky: '#a8bedb', hemiGround: '#7c6a48', hemiIntensity: 0.7, envIntensity: 0.75,
      clouds: 0.4, cloudColor: '#fff0dc', stars: 0,
      bloomStrength: 0.45, bloomThreshold: 0.85, tiltShift: 0.45, shadowRadius: 20, vignette: 0.35, saturation: 1.08,
    },
    camera: {
      position: [6.2, 6.6, 9.4], target: [0.4, 1.3, -5.2], minDistance: 3, maxDistance: 55, maxPolar: 1.5, autoRotate: 0.2,
      views: [
        { position: [0.25, F + 0.62, 0.3], target: [0.18, F - 0.1, -8] },
        { position: [-14, 13, 4], target: [1, 0.5, -7] },
      ],
    },
    interaction: {
      label: 'Let the years pass',
      activeLabel: 'Go back to the third year',
      hint: 'Every year the same window, and more faces in it.',
      set: (on) => tog.set(on),
      camera: { position: [2.6, 4.2, 6.2], target: [-0.2, 1.3, -6] },
    },
    update(t, dt) {
      tog.update(dt);
      const year = Y0 + (Y1 - Y0) * tog.raw;
      if (Math.abs(year - lastYear) > 1e-4) {
        lastYear = year;
        for (let i = 0; i < N; i++) {
          const p = people[i];
          const s = pop((year - p.yr) / 0.6) * p.s;
          setB(i, p.x, p.y, p.z, yaw[i], s);
          setH(i, p.x, p.y, p.z, yaw[i], s);
        }
        setB.done();
        setH.done();
        const ci = Math.min(ROMAN.length - 1, Math.max(0, Math.floor(year + 1e-3) - 1));
        if (ci !== lastCal) {
          lastCal = ci;
          calMat.map = calTex[ci];
        }
      }
      crows.update(t);
    },
  };
};

export default build;
