// ZORA - Cities & Memory 4.
// Beyond six rivers and three mountain ranges, a city nobody forgets, though nothing
// in it is rare: streets, houses, doors and windows follow each other like a score in
// which no note may move. The sleepless walk it in their minds, landmark after
// landmark, and file what they must remember in the cells of its armature. Held
// still to be remembered, the real Zora crumbled away. Toggle: seek it on earth.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const STREETS = [-8, -4, 0, 4, 8];
  const ALLEYS = [-13.75, -8.25, -2.75, 2.75, 8.25, 13.75];
  const RHYTHM = [1.0, 1.4, 1.8, 1.4, 1.0, 2.2, 1.4, 1.0];
  const PALE = '#e3ddcf';

  // ---- plinth (with the harbour basin cut into its south-east corner), plain, rivers, mountains
  const b = new K.Batch();
  b.add(K.at(K.box(40, 1, 22.6), 0, -1, -1.7), '#cfc8b8', 'stone');
  b.add(K.at(K.box(34, 1, 3.4), -3, -1, 11.3), '#cfc8b8', 'stone');
  b.add(K.at(K.box(6, 0.4, 3.4), 17, -1, 11.3), '#8b8577', 'stone');
  for (const z of STREETS) b.add(K.at(K.box(36, 0.02, 1.4), 0, 0, z), '#bdb6a6', 'stone');
  for (const x of ALLEYS) b.add(K.at(K.box(0.8, 0.015, 17.4), x, 0, 0), '#c6bfaf', 'stone');
  root.add(b.build({ name: 'zora' }));
  const plain = new THREE.Mesh(K.disc(260, 64), new THREE.MeshStandardMaterial({ color: '#30364f', roughness: 1 }));
  plain.position.y = -14;
  root.add(plain);
  const riverMat = new THREE.MeshBasicMaterial({ color: '#9fb4d8', transparent: true, opacity: 0.55 });
  for (let k = 0; k < 6; k++) {
    const pos: number[] = [], z0 = 22 + k * 9, w = 0.3 + (k % 3) * 0.15 + k * 0.08;
    for (let i = 0; i <= 80; i++) {
      const x = -140 + i * 3.5, z = z0 + Math.sin(i * 0.23 + k * 1.7) * (2 + k * 0.6);
      pos.push(x, -13.95, z - w, x, -13.95, z + w);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const idx: number[] = [];
    for (let i = 0; i < 80; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    g.setIndex(idx);
    root.add(new THREE.Mesh(g, riverMat));
  }
  [['#1f2848', 120, 26], ['#25305a', 160, 36], ['#2b3866', 200, 46]].forEach(([c, d, h], k) => {
    const pts: THREE.Vector2[] = [new THREE.Vector2(-300, -20)];
    for (let i = 0; i <= 60; i++) pts.push(new THREE.Vector2(-300 + i * 10, (h as number) * (0.45 + 0.4 * Math.abs(K.noise2(i * 0.21 + k * 7, k)) + 0.25 * K.ridged2(i * 0.1, k * 3))));
    pts.push(new THREE.Vector2(300, -20));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts)), new THREE.MeshBasicMaterial({ color: c as string }));
    m.position.set(0, -14, -(d as number));
    root.add(m);
  });

  // ---- landmarks: the fixed itinerary
  const clears: [number, number, number, number][] = []; // x0, x1, z0, z1 kept free of houses
  type LM = { stop: [number, number]; top: THREE.Vector3; group: THREE.Group; glow: THREE.MeshBasicMaterial };
  const lms: LM[] = [];
  const landmark = (stop: [number, number], top: [number, number, number], fill: (lb: K.Batch, glow: (g: THREE.BufferGeometry) => void) => void) => {
    const lb = new K.Batch();
    const glowGeos: THREE.BufferGeometry[] = [];
    fill(lb, (g) => glowGeos.push(g));
    const group = lb.build({ name: 'landmark' });
    const glow = new THREE.MeshBasicMaterial({ color: '#f3cd6c' });
    if (glowGeos.length) group.add(new THREE.Mesh(K.merge(glowGeos), glow));
    root.add(group);
    lms.push({ stop, top: new THREE.Vector3(...top), group, glow });
  };
  // 1 copper clock tower
  const clockHands = new THREE.Group();
  landmark([-15, -8], [-15, 4.6, -9.6], (lb, glow) => {
    clears.push([-15.9, -14.1, -11, -8.6]);
    K.tower(lb, { x: -15, z: -9.6, r: 0.75, h: 4.5, sides: 4, top: 'pyramid', topH: 1.0, color: PALE, topColor: '#b9743e', topFinish: 'bronze', bands: 1.5 });
    lb.add(K.at(K.cyl(0.5, 0.5, 0.06, 24), -15, 3.6, -8.82, { rx: Math.PI / 2 }), '#b9743e', 'bronze');
    glow(K.at(K.cyl(0.4, 0.4, 0.02, 24), -15, 3.6, -8.78, { rx: Math.PI / 2 }));
  });
  clockHands.position.set(-15, 3.6, -8.74);
  for (const [l, w] of [[0.32, 0.04], [0.22, 0.06]]) clockHands.add(new THREE.Mesh(K.at(K.box(w, l, 0.02), 0, 0, 0), K.std('#3a2a1a')));
  root.add(clockHands);
  // 2 barber's striped awning
  const awnTex = K.canvasTexture(64, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f4efe6' : '#c2362f'; g.fillRect(i * 8, 0, 8, 64); } });
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.7), new THREE.MeshStandardMaterial({ map: awnTex, side: THREE.DoubleSide }));
  awning.position.set(-4, 1.05, -8.75);
  awning.rotation.x = -0.9;
  root.add(awning);
  landmark([-4, -8], [-4, 1.9, -9.4], (lb, glow) => {
    clears.push([-5, -3, -11, -8.6]);
    K.house(lb, { x: -4, z: -9.35, w: 1.8, d: 1.2, h: 1.8, roof: 'gable', wall: PALE, roofColor: '#9a6a4a', windows: false });
    lb.add(K.at(K.cyl(0.06, 0.06, 0.8, 10), -4.7, 0.2, -8.7), '#ffffff', 'ceramic');
    glow(K.at(K.box(1.2, 0.5, 0.02), -4, 0.1, -8.74));
  });
  // 3 fountain with nine jets
  const jets = K.instanced(K.cyl(0.03, 0.05, 1, 6), new THREE.MeshBasicMaterial({ color: '#cfeaf2', transparent: true, opacity: 0.75 }), 9, undefined, { castShadow: false, colors: false });
  root.add(jets);
  const setJet = K.instanceSetter(jets);
  landmark([7, -8], [7, 1.2, -9.6], (lb, glow) => {
    clears.push([5.2, 8.8, -11, -5.2]);
    lb.add(K.lathe([[1.2, 0], [1.2, 0.35], [1.08, 0.35], [1.08, 0.12], [0.01, 0.12]], 32).translate(7, 0, -9.6), '#d7d0c0', 'stone');
    glow(K.at(K.ring(1.08, 1.18, 32), 7, 0.36, -9.6));
  });
  const waterF = K.waterDisc(1.06, 0.27, { color: '#5f87a0' });
  waterF.position.set(7, 0, -9.6);
  root.add(waterF);
  // 4 astronomer's octagonal glass tower
  landmark([16, -4], [16, 7.6, -6], (lb, glow) => {
    clears.push([14.6, 18, -7.2, -4.8]);
    lb.add(K.at(K.ngon(0.75, 7, 8), 16, 0, -6), '#a7dce6', 'glass');
    lb.add(K.at(K.spiralStair(0.6, 6.8, 40, 4, 0.4), 16, 0.1, -6), '#d8cfbf', 'stone');
    for (let y = 0; y <= 7; y += 1.75) lb.add(K.at(K.ngon(0.8, 0.08, 8), 16, y, -6), '#b9743e', 'bronze');
    lb.add(K.at(K.cyl(0.08, 0.12, 1.2, 10), 16, 7.2, -6, { rx: -0.8 }), '#b9743e', 'bronze');
    glow(K.at(K.ngon(0.2, 6.6, 8), 16, 0.2, -6));
  });
  // 5 melon kiosk
  landmark([1, -4], [1, 1.5, -2.7], (lb, glow) => {
    clears.push([0, 2, -3.4, -2]);
    K.stall(lb, { x: 1, z: -2.7, w: 1.4, d: 0.9, h: 0.9, cloth: '#3f6a3a', stripes: '#7a5a3a' });
    for (let i = 0; i < 20; i++) {
      const a = i * 2.4, r = 0.12 + (i % 7) * 0.05;
      lb.add(K.at(K.sphere(0.11, 10, 8), 1 + Math.cos(a) * r * 1.6, 0.42 + (i > 13 ? 0.15 : 0), -2.7 + Math.sin(a) * r * 0.7, { s: [1, 0.85, 1.2] }), i % 2 ? '#2f6b2a' : '#4c8a3a', 'ceramic');
    }
    glow(K.at(K.sphere(0.08, 8, 6), 1, 0.85, -2.7));
  });
  // 6 statue of the hermit and the lion
  landmark([-12, 0], [-12, 2.4, -1.3], (lb, glow) => {
    clears.push([-13, -11, -2, -0.7]);
    lb.add(K.at(K.box(0.9, 1.0, 0.9), -12, 0, -1.3), '#d7d0c0', 'stone');
    lb.add(K.at(K.cone(0.22, 0.85, 10), -12.1, 1.0, -1.35), '#a5a090', 'stone');
    lb.add(K.at(K.sphere(0.1, 8, 6), -12.1, 0.95 + 0.85, -1.35), '#a5a090', 'stone');
    lb.add(K.strut([-12.1, 1.55, -1.35], [-11.95, 2.05, -1.3], 0.02, 4), '#a5a090', 'stone');
    lb.add(K.at(K.quadruped({ len: 0.55, h: 0.22, tail: 0.15, ears: true }), -11.9, 1.0, -1.15, { ry: Math.PI / 2, s: [1, 0.6, 1] }), '#b3a78a', 'stone');
    glow(K.at(K.box(1.0, 0.04, 1.0), -12, 0.0, -1.3));
  });
  // 7 Turkish bath: one large dome with star skylights and four small domes
  landmark([4, 0], [4, 2.6, 2], (lb, glow) => {
    clears.push([1.5, 6.5, 0.7, 3.3]);
    lb.add(K.at(K.box(4.4, 1.0, 2.5), 4, 0, 2), PALE, 'plaster');
    lb.add(K.at(K.dome(1.2, 28), 4, 1.0, 2), '#d9d2c2', 'plaster');
    for (const [dx, dz] of [[-1.7, -0.8], [1.7, -0.8], [-1.7, 0.8], [1.7, 0.8]]) lb.add(K.at(K.dome(0.38, 14), 4 + dx, 1.0, 2 + dz), '#d9d2c2', 'plaster');
    for (let i = 0; i < 14; i++) {
      const a = i * 2.39, el = 0.35 + (i % 5) * 0.22;
      glow(K.at(K.sphere(0.05, 5, 4), 4 + Math.cos(a) * Math.cos(el) * 1.21, 1.0 + Math.sin(el) * 1.21, 2 + Math.sin(a) * Math.cos(el) * 1.21));
    }
  });
  // 8 corner cafe
  landmark([-6, 4], [-6, 1.8, 5.3], (lb, glow) => {
    clears.push([-7.5, -4.5, 4.7, 6]);
    K.house(lb, { x: -6, z: 5.6, w: 3, d: 1.2, h: 1.4, roof: 'hip', wall: '#e8d9bf', roofColor: '#9a6a4a', windows: false });
    for (let i = 0; i < 6; i++) {
      const x = -7.2 + (i % 3) * 1.2, z = 4.55 + Math.floor(i / 3) * 0.0 - (i > 2 ? 0.0 : 0);
      if (i > 2) continue;
      lb.add(K.at(K.cyl(0.18, 0.18, 0.03, 12), x, 0.3, z), '#e9e4da', 'stone');
      lb.add(K.at(K.cyl(0.02, 0.02, 0.3, 4), x, 0, z), '#3a3330', 'metal');
      for (const s of [-1, 1]) lb.add(K.at(K.box(0.12, 0.18, 0.12), x + s * 0.28, 0, z), '#6a4a32', 'wood');
    }
    for (let i = 0; i < 3; i++) {
      const x = -7.2 + i * 1.2;
      lb.add(K.at(K.cyl(0.18, 0.18, 0.03, 12), x, 0.3, 3.5), '#e9e4da', 'stone');
      lb.add(K.at(K.cyl(0.02, 0.02, 0.3, 4), x, 0, 3.5), '#3a3330', 'metal');
    }
    for (let i = 0; i < 3; i++) glow(K.at(K.sphere(0.07, 8, 6), -7.2 + i * 1.2, 1.15, 5.0));
    glow(K.at(K.box(2.4, 0.5, 0.02), -6, 0.2, 4.99));
  });
  // 9 the alley down to the harbour, three moored boats
  landmark([15, 8], [15.2, 1.4, 9.4], (lb, glow) => {
    clears.push([13.8, 20, 8.6, 13]);
    for (const x of [14.55, 15.85]) lb.add(K.at(K.box(0.5, 1.6, 0.9), x, 0, 9.2), PALE, 'plaster');
    for (let i = 0; i < 4; i++) K.lamp(lb, { x: 15 + i * 1.5, z: 9.75, h: 0.9 });
    for (let i = 0; i < 4; i++) glow(K.at(K.sphere(0.08, 8, 6), 15 + i * 1.5, 0.95, 9.75));
  });
  const harbour = K.waterRect(5.9, 3.3, 17, -0.4, 11.35, 0, { color: '#2c3e5c' });
  root.add(harbour);
  const boats = K.instanced(K.boatGeometry(1.1, '#5a3e2b'), K.std('#ffffff', { vertexColors: true }), 3, (i, o) => { o.position.set(15.6 + i * 1.6, -0.4, 11.6); o.rotation.y = 0.1 * i; });
  root.add(boats);

  // ---- the houses: rows of identical modules in one fixed rhythm (instanced)
  type H = { x: number; z: number; h: number; face: number; e: number };
  const houses: H[] = [];
  const rows: [number, number][] = [];
  for (const s of STREETS) rows.push([s - 1.3, 1], [s + 1.3, -1]);
  rows.push([-10.7, -1], [10.7, 1]);
  let beat = 0;
  for (const [z, face] of rows) {
    for (let x = -16.55; x < 17; x += 0.9) {
      const blockedAlley = ALLEYS.some((a) => Math.abs(x - a) < 0.85);
      const blockedLm = clears.some(([x0, x1, z0, z1]) => x > x0 - 0.45 && x < x1 + 0.45 && z > z0 - 0.6 && z < z1 + 0.6);
      if (blockedAlley || blockedLm) { beat++; continue; }
      const e = Math.min(1, Math.min(17 - Math.abs(x), 11.5 - Math.abs(z)) / 8);
      houses.push({ x, z, h: RHYTHM[beat++ % RHYTHM.length], face, e });
    }
  }
  const NH = houses.length;
  const houseMat = new THREE.MeshStandardMaterial({ color: PALE, roughness: 0.92 });
  const bodies = K.instanced(K.box(0.9, 1, 1.2), houseMat, NH, undefined, { colors: false });
  const roofMesh = K.instanced(K.gableRoof(0.9, 1.2, 0.4, 0.04), new THREE.MeshStandardMaterial({ color: '#8f6a52', roughness: 0.8 }), NH, undefined, { colors: false });
  root.add(bodies, roofMesh);
  const setBody = K.instanceSetter(bodies), setRoof = K.instanceSetter(roofMesh);
  type W = { h: number; x: number; y: number; z: number; ry: number; door: boolean; flash: boolean };
  const wins: W[] = [];
  houses.forEach((hs, hi) => {
    const fz = hs.z + hs.face * 0.605, ry = hs.face > 0 ? 0 : Math.PI;
    wins.push({ h: hi, x: hs.x, y: 0, z: fz, ry, door: true, flash: false });
    const rowsN = Math.floor((hs.h - 0.55) / 0.4);
    for (let r = 0; r < rowsN; r++) for (const dx of [-0.22, 0.22]) wins.push({ h: hi, x: hs.x + dx, y: 0.5 + r * 0.4, z: fz, ry, door: false, flash: ((hi * 7 + r * 3 + (dx > 0 ? 1 : 0)) % 5) < 2 });
  });
  const winMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const winGeo = K.wallPlane(0.18, 0.24);
  const doorGeo = K.wallPlane(0.24, 0.42);
  const winMesh = K.instanced(winGeo, winMat, wins.length, undefined, { castShadow: false });
  const doors = wins.filter((w) => w.door);
  const doorMesh = K.instanced(doorGeo, new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 0.9 }), doors.length, undefined, { castShadow: false, colors: false });
  root.add(winMesh, doorMesh);
  const setWin = K.instanceSetter(winMesh), setDoor = K.instanceSetter(doorMesh);
  const DARK = new THREE.Color('#1c2236'), FLASH = new THREE.Color('#f3cd6c').multiplyScalar(2.6), WARM = new THREE.Color('#e0a95a').multiplyScalar(0.9);
  const tc = new THREE.Color();
  const placeHouses = (v: number) => {
    const col = (hi: number) => {
      const hs = houses[hi];
      const t0 = hs.e * 0.55;
      return K.smoothstep(t0, t0 + 0.4, v);
    };
    const hc = houses.map((_, i) => 1 - col(i));
    houses.forEach((hs, i) => {
      const k = hc[i];
      setBody(i, hs.x, 0, hs.z, 0, k > 0.01 ? [1, hs.h * k, 1] : 0);
      setRoof(i, hs.x, hs.h * k, hs.z, 0, k > 0.01 ? [1, k, 1] : 0);
    });
    let di = 0;
    wins.forEach((w, i) => {
      const k = hc[w.h], vis = k > 0.01 && w.y + 0.24 < houses[w.h].h * k;
      if (w.door) setDoor(di++, w.x, 0, w.z, w.ry, vis ? 1 : 0);
      setWin(i, w.x, w.y, w.z, w.ry, vis && !w.door ? 1 : 0);
    });
    setBody.done(); setRoof.done(); setWin.done(); setDoor.done();
  };
  placeHouses(0);
  const foundations = K.lines(houses.flatMap((hs) => {
    const x0 = hs.x - 0.45, x1 = hs.x + 0.45, z0 = hs.z - 0.6, z1 = hs.z + 0.6;
    return [[[x0, 0.02, z0], [x1, 0.02, z0]], [[x0, 0.02, z1], [x1, 0.02, z1]], [[x0, 0.02, z0], [x0, 0.02, z1]]] as [K.V3, K.V3][];
  }), '#9fb4d8', 0.0);
  (foundations.material as THREE.LineBasicMaterial).transparent = true;
  root.add(foundations);

  // ---- the honeycomb armature of memory floating above
  const lattice = new THREE.Group();
  lattice.position.set(0, 15.5, -5);
  lattice.rotation.x = (5 * Math.PI) / 180;
  root.add(lattice);
  const RC = 1.6;
  const cells: THREE.Vector3[] = [];
  for (let q = -7; q <= 7; q++) for (let r = -8; r <= 8; r++) {
    const x = RC * 1.5 * q, z = RC * Math.sqrt(3) * (r + q / 2);
    if (Math.abs(x) < 17 && Math.abs(z) < 9) cells.push(new THREE.Vector3(x, 0, z));
  }
  const lb = new K.Batch();
  const seen = new Set<string>();
  for (const c of cells) for (let k = 0; k < 6; k++) {
    const a0 = (k / 6) * Math.PI * 2, a1 = ((k + 1) / 6) * Math.PI * 2;
    const p0 = new THREE.Vector3(c.x + Math.cos(a0) * RC, 0, c.z + Math.sin(a0) * RC), p1 = new THREE.Vector3(c.x + Math.cos(a1) * RC, 0, c.z + Math.sin(a1) * RC);
    const key = [p0, p1].map((p) => `${p.x.toFixed(1)},${p.z.toFixed(1)}`).sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    lb.add(K.strut(p0, p1, 0.035, 4), '#d7a94a', 'gold');
  }
  lattice.add(lb.build({ castShadow: false }));
  const floorMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const floors = K.instanced(new THREE.CircleGeometry(RC * 0.97, 6).rotateX(-Math.PI / 2), floorMat, cells.length, (i, o, c) => { o.position.copy(cells[i]); c.set('#24465a'); }, { castShadow: false, receiveShadow: false });
  lattice.add(floors);
  // emblems drawn in lines (constellations, numerals, leaf, crystal, laurel, swords, bust, glyph)
  const emblem = (kind: number, c: THREE.Vector3, s: number): [K.V3, K.V3][] => {
    const P = (x: number, z: number): K.V3 => [c.x + x * s, 0.03, c.z + z * s];
    const seg: [K.V3, K.V3][] = [];
    const poly = (pts: [number, number][], close = false) => { for (let i = 0; i < pts.length - (close ? 0 : 1); i++) seg.push([P(...pts[i]), P(...pts[(i + 1) % pts.length])]); };
    const circ = (cx: number, cz: number, r: number, n = 10, a0 = 0, a1 = Math.PI * 2) => poly(Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos(a0 + (a1 - a0) * i / n) * r, cz + Math.sin(a0 + (a1 - a0) * i / n) * r] as [number, number]));
    switch (kind) {
      case 0: poly(Array.from({ length: 5 + (c.x > 0 ? 1 : 0) }, () => [rng.float(-0.4, 0.4), rng.float(-0.4, 0.4)] as [number, number])); break;
      case 1: { const d = (Math.abs(Math.round(c.x * 3 + c.z)) % 9) + 1; poly([[-0.2, -0.4], [0.2, -0.4], [0.2, 0], [-0.2, 0], [-0.2, 0.4], [0.2, 0.4]].slice(0, 2 + (d % 5)) as [number, number][]); break; }
      case 2: circ(0, 0, 0.35, 8, -0.4, Math.PI - 0.4); circ(0, 0, 0.35, 8, Math.PI - 0.4, Math.PI * 2 - 0.4); poly([[0.33, -0.15], [-0.33, 0.15]]); break;
      case 3: poly([[0, -0.45], [0.3, -0.1], [0.2, 0.4], [-0.2, 0.4], [-0.3, -0.1]], true); poly([[0, -0.45], [0, 0.4]]); break;
      case 4: circ(0, 0.05, 0.4, 10, 0.3, Math.PI - 0.3); for (let i = 1; i < 6; i++) { const a = 0.3 + i * 0.43; poly([[Math.cos(a) * 0.4, 0.05 + Math.sin(a) * 0.4], [Math.cos(a) * 0.55, Math.sin(a) * 0.5]]); } break;
      case 5: poly([[-0.4, -0.4], [0.4, 0.4]]); poly([[0.4, -0.4], [-0.4, 0.4]]); poly([[-0.25, 0.1], [-0.1, 0.25]]); poly([[0.25, 0.1], [0.1, 0.25]]); break;
      case 6: circ(0, -0.15, 0.18, 10); circ(0, 0.4, 0.35, 10, Math.PI, Math.PI * 2); break;
      default: poly([[-0.3, 0.4], [-0.1, -0.4], [0.1, 0.2], [0.3, -0.4]]); break;
    }
    return seg;
  };
  const lmCell = lms.map((l) => {
    let best = 0, bd = 1e9;
    cells.forEach((c, i) => { const d = Math.hypot(c.x - l.top.x, c.z - (l.top.z + 1)); if (d < bd) { bd = d; best = i; } });
    return best;
  });
  const linked = new Set(lmCell);
  const restSegs: [K.V3, K.V3][] = [];
  cells.forEach((c, i) => { if (!linked.has(i) && i % 2 === 0) restSegs.push(...emblem(i % 8, c, 0.9)); });
  const restEmb = K.lines(restSegs, '#f3cd6c', 0.55);
  lattice.add(restEmb);
  const lmEmb = lmCell.map((ci, k) => { const l = K.lines(emblem(k % 8, cells[ci], 1.1), '#ffe6a0', 0.3); (l.material as THREE.LineBasicMaterial).transparent = true; lattice.add(l); return l; });
  root.updateMatrixWorld(true);
  const cellWorld = lmCell.map((ci) => lattice.localToWorld(cells[ci].clone()));
  const threadMats = lms.map(() => new THREE.MeshBasicMaterial({ color: '#f3cd6c', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  lms.forEach((l, i) => root.add(new THREE.Mesh(K.strut(l.top, cellWorld[i], 0.025, 4), threadMats[i])));
  const bead = K.glowSprite('#ffe6a0', 0.9, 0);
  root.add(bead);

  // ---- the sleepless lantern-bearer walking the fixed itinerary (54 s loop)
  const route: THREE.Vector3[] = [[-18, -8], [18, -8], [18, -4], [-18, -4], [-18, 0], [18, 0], [18, 4], [-18, 4], [-18, 8], [15, 8], [15, 9.7]].map(([x, z]) => new THREE.Vector3(x, 0.02, z));
  const acc = [0];
  for (let i = 1; i < route.length; i++) acc.push(acc[i - 1] + route[i].distanceTo(route[i - 1]));
  const sOf = (p: [number, number], from: number) => {
    for (let i = 1; i < route.length; i++) {
      if (acc[i] < from) continue;
      const a = route[i - 1], c = route[i];
      const ab = new THREE.Vector3().subVectors(c, a), ap = new THREE.Vector3(p[0] - a.x, 0, p[1] - a.z);
      const u = K.clamp(ap.dot(ab) / ab.lengthSq());
      if (a.clone().addScaledVector(ab, u).distanceTo(new THREE.Vector3(p[0], 0.02, p[1])) < 0.05 && acc[i - 1] + u * ab.length() >= from) return acc[i - 1] + u * ab.length();
    }
    return from;
  };
  const stopS: number[] = [];
  lms.forEach((l, i) => stopS.push(sOf(l.stop, i ? stopS[i - 1] : 0)));
  const keyT = [0, ...lms.map((_, i) => 6 * i + 4.5), 54];
  const keyS = [0, ...stopS, acc[acc.length - 1]];
  const walker = new THREE.Mesh(K.personGeometry(0.32), K.std('#3a3f5a', { vertexColors: true }));
  walker.castShadow = true;
  root.add(walker);
  const lantern = K.glowSprite('#ffd27a', 1.1, 0.9);
  root.add(lantern);
  const lanternLight = new THREE.PointLight('#ffc070', 6, 6, 1.6);
  root.add(lanternLight);
  const posAt = (s: number, out: THREE.Vector3) => {
    let k = 1;
    while (k < acc.length - 1 && acc[k] < s) k++;
    const u = K.clamp((s - acc[k - 1]) / Math.max(1e-6, acc[k] - acc[k - 1]));
    out.lerpVectors(route[k - 1], route[k], u);
    return Math.atan2(route[k].x - route[k - 1].x, route[k].z - route[k - 1].z);
  };

  // ---- the playhead bar, the decaying edges, the collapse dust
  const playMat = new THREE.MeshBasicMaterial({ color: '#f3cd6c', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const playhead = new THREE.Mesh(K.box(0.25, 3.2, 23), playMat);
  root.add(playhead);
  root.add(K.particles({ count: 220, center: [0, -5, 0], radius: 20, y0: -12, y1: 0, color: '#d9d2c2', size: 0.07, opacity: 0.45, velocity: [0, -0.35, 0], swirl: 0.3, rng: rng.fork('decay') }));
  const crumble = K.particles({ count: 900, center: [0, 0, 0], radius: 18, y0: -3, y1: 2.5, color: '#e3ddcf', colors: ['#cfc8b8', '#b8b0a0'], size: 0.09, opacity: 0, velocity: [0.15, -0.45, 0], swirl: 0.6, rng: rng.fork('crumble') });
  root.add(crumble);
  const crumbleU = (crumble.material as THREE.ShaderMaterial).uniforms.uOpacity;

  const seek = new K.Toggle(0.13);
  const tmp = new THREE.Vector3();
  let lastV = -1;

  return {
    root,
    env: {
      skyTop: '#0b1029',
      skyHorizon: '#2c3864',
      skyBottom: '#141a33',
      skyCurve: 0.5,
      fog: '#1c2445',
      fogNear: 70,
      fogFar: 320,
      sunDir: [-0.6, 0.75, 0.4],
      sunColor: '#c6d4ff',
      sunIntensity: 1.5,
      sunDisc: 0,
      sunGlow: 0.2,
      moon: { dir: [-0.5, 0.45, -0.75], size: 1.4, color: '#f1f0ff' },
      hemiSky: '#5a6aa8',
      hemiGround: '#2a2a3a',
      hemiIntensity: 1.1,
      envIntensity: 1.0,
      stars: 1,
      clouds: 0,
      bloomStrength: 0.85,
      bloomThreshold: 0.75,
      bloomRadius: 0.5,
      tiltShift: 0.35,
      shadowRadius: 24,
      vignette: 0.45,
      saturation: 1.0,
    },
    camera: {
      position: [0, 30, 40],
      target: [0, 5.5, -1],
      minDistance: 8,
      maxDistance: 90,
      autoRotate: 0.15,
      views: [
        { position: [-30, 26, 18], target: [0, 5, -1] },
        { position: [3.5, 3.2, -3.2], target: [8, 1.2, -9] },
      ],
    },
    interaction: {
      label: 'Seek it on earth',
      activeLabel: 'Recall it from memory',
      hint: 'Kept still to be remembered, the city has crumbled away.',
      set: (on) => seek.set(on),
    },
    update(t, dt) {
      seek.update(dt);
      const v = seek.value;
      if (Math.abs(v - lastV) > 1e-4) { placeHouses(v); lastV = v; }
      const present = 1 - v;
      crumbleU.value = Math.sin(Math.PI * K.clamp(v)) * 0.8;
      (foundations.material as THREE.LineBasicMaterial).opacity = v * 0.35;
      // landmarks collapse last and are rebuilt first
      const lk = 1 - K.smoothstep(0.6, 0.98, v);
      lms.forEach((l) => { l.group.scale.y = Math.max(0.001, lk); l.group.visible = lk > 0.01; });
      clockHands.visible = awning.visible = waterF.visible = jets.visible = boats.visible = lk > 0.3;
      lattice.visible = present > 0.02;
      floorMat.opacity = 0.12 * present;
      (restEmb.material as THREE.LineBasicMaterial).opacity = 0.55 * present;
      // the walk
      const lt = t % 54;
      let k = 1;
      while (k < keyT.length - 1 && keyT[k] < lt) k++;
      const u = K.clamp((lt - keyT[k - 1]) / (keyT[k] - keyT[k - 1]));
      const ry = posAt(K.lerp(keyS[k - 1], keyS[k], K.smoothstep(0, 1, u) * 0.3 + u * 0.7), tmp);
      walker.position.copy(tmp).setY(tmp.y + Math.abs(Math.sin(t * 6)) * 0.015);
      walker.rotation.y = ry;
      walker.visible = present > 0.5;
      lantern.position.set(tmp.x + 0.12, 0.42, tmp.z);
      (lantern.material as THREE.SpriteMaterial).opacity = 0.9 * present;
      lanternLight.position.set(tmp.x, 0.8, tmp.z);
      lanternLight.intensity = 6 * present;
      lms.forEach((l, i) => {
        const since = lt - keyT[i + 1];
        const lit = since > 0 && lt < 53.2 ? 1 : 0;
        l.glow.color.set('#f3cd6c').multiplyScalar((0.15 + lit * 2.6) * present + 0.02);
        threadMats[i].opacity = lit * K.smoothstep(0, 1.5, since) * 0.55 * present;
        (lmEmb[i].material as THREE.LineBasicMaterial).opacity = (0.25 + 0.75 * lit) * present;
        floors.setColorAt(lmCell[i], tc.set(lit ? '#c89a3a' : '#24465a'));
        if (since > 0 && since < 1.5) {
          bead.position.lerpVectors(l.top, cellWorld[i], since / 1.5);
          (bead.material as THREE.SpriteMaterial).opacity = Math.sin(Math.PI * since / 1.5) * present;
        }
      });
      if (floors.instanceColor) floors.instanceColor.needsUpdate = true;
      // landmark motions
      clockHands.children[0].rotation.z = -Math.floor(t) * (Math.PI / 30);
      clockHands.children[1].rotation.z = -t * 0.01;
      awning.rotation.x = -0.9 + Math.sin(t * 1.7) * 0.03 * (lt > keyT[2] ? 1 : 0.2);
      const jetOn = lt > keyT[3] && lt < 53.2 ? 1 : 0.15;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        setJet(i, 7 + Math.cos(a) * 0.7, 0.27, -9.6 + Math.sin(a) * 0.7, 0, [1, (0.5 + 0.12 * Math.sin(t * 5 + i)) * jetOn, 1], Math.sin(a) * 0.35, -Math.cos(a) * 0.35);
      }
      setJet.done();
      // the score playhead: windows flash in a fixed pattern as it passes
      const pp = (t % 12) / 12, px = -20 + pp * 40;
      playhead.position.set(px, 0, 0);
      playMat.opacity = Math.sin(Math.PI * pp) * 0.18 * present;
      wins.forEach((w, i) => {
        const f = w.flash ? Math.exp(-(((w.x - px) / 0.7) ** 2)) * present : 0;
        tc.copy(DARK).lerp(FLASH, f);
        if (!w.flash && (i % 23) === 0) tc.copy(WARM);
        winMesh.setColorAt(i, tc);
      });
      if (winMesh.instanceColor) winMesh.instanceColor.needsUpdate = true;
    },
  };
};

export default build;
