// SOPHRONIA - Thin Cities 2.
// Two half-cities on one coin: on the left a fairground that never leaves (roller
// coaster, wheel of spinning cages, chain carousel, well of death, big top with
// trapezes, shooting galleries), on the right a city of marble and cement built
// like a kit, waiting by a road where flatbed trailers stand ready. Toggle: the
// caravan departs, the serious half is packed and driven into the fog, the coaster
// halts at the lip of its plunge and the gate sign starts counting the days.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const R = 23;
const ROAD_Z = 5;
const MARBLE = '#e7e1d4', CEMENT = '#a6a198', RED = '#d6344a', CREAM = '#efe2c8', MINT = '#8fd8bf', BULB = '#ffc25a';

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const uT = { value: 0 };
  const b = new K.Batch();

  // ---------------------------------------------------------------- plinth, boulevard, road into the fog
  root.add(K.plinth({ radius: R, height: 1.5, color: '#2e2a36', rim: '#c9a24c' }));
  const top = new THREE.CircleGeometry(R, 96).rotateX(-Math.PI / 2);
  K.paintBy(top, (x, _y, z, out) => {
    const n = K.fbm2(x * 0.3, z * 0.3, 3);
    if (Math.abs(x) < 1.25) out.set('#8b8579');
    else if (x < 0) out.set('#4a4048').lerp(K.col('#6a5a4a'), K.clamp(0.4 + n));
    else out.set('#6e6b68').lerp(K.col('#5d5b5c'), K.clamp(0.5 + n));
  });
  b.add(K.at(top, 0, 0.005, 0), null, 'matte');
  b.add(K.at(K.box(60, 0.12, 2.2), 21 + 30, -0.1, ROAD_Z), '#55525a', 'stone');
  for (let x = 24; x < 80; x += 4) { K.lamp(b, { x, z: ROAD_Z - 1.25, h: 1.1, glow: '#ffd9a0', intensity: 3 }); }
  for (let i = 0; i < 14; i++) for (const s of [-1, 1]) K.lamp(b, { x: 1.4 * s, z: -17 + i * 2.6, h: 1.3, glow: s > 0 ? '#e8f0ff' : '#ffcf8a', intensity: s > 0 ? 2.2 : 3.5 });

  // ---------------------------------------------------------------- the stone half: a kit of solemn buildings
  type Item = { g: THREE.Group; x: number; z: number; c: [number, number, number]; delay: number };
  const items: Item[] = [];
  const outlines: [number, number][][] = [];
  const rect = (x: number, z: number, w: number, d: number, ry: number) => {
    const c = Math.cos(ry), s = Math.sin(ry);
    outlines.push([[-w, -d], [w, -d], [w, d], [-w, d]].map(([lx, lz]) => [x + (lx / 2) * c + (lz / 2) * s, z - (lx / 2) * s + (lz / 2) * c]));
  };
  const seams = (bb: K.Batch, w: number, d: number, h: number, y0 = 0) => {
    for (let x = -w / 2 + 0.6; x < w / 2 - 0.3; x += 0.6) for (const sz of [-1, 1]) bb.add(K.at(K.box(0.015, h, 0.01), x, y0, sz * (d / 2 + 0.006)), '#7d7870', 'matte');
  };
  const eyes = (bb: K.Batch, w: number, d: number, y: number) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bb.add(K.at(K.torus(0.07, 0.015, 4, 10), sx * w * 0.35, y + 0.07, sz * d * 0.35), '#9a9a9a', 'metal');
  };
  const item = (x: number, z: number, ry: number, fw: number, fd: number, crate: [number, number, number], make: (bb: K.Batch) => void) => {
    const bb = new K.Batch();
    make(bb);
    const g = bb.build({ name: 'stone' });
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    root.add(g);
    items.push({ g, x, z, c: crate, delay: 0 });
    rect(x, z, fw, fd, ry);
  };
  // the Ministry, facing the square
  item(9, -4.4, 0, 6.4, 2.9, [1.8, 0.9, 1.2], (bb) => { K.temple(bb, { w: 6, d: 2.5, h: 2.2, cols: 6, color: MARBLE }); eyes(bb, 6, 2.5, 2.4); seams(bb, 4.2, 1.75, 1.6, 0.45); });
  // the bank
  item(14.6, 0.6, -Math.PI / 2, 2.8, 2.3, [1.2, 0.8, 1], (bb) => { K.temple(bb, { w: 2.5, d: 2, h: 2, cols: 4, color: '#ece6da' }); eyes(bb, 2.5, 2, 2.2); });
  // monument on the square
  item(9, 0, 0, 1.2, 1.2, [0.6, 0.9, 0.6], (bb) => {
    bb.add(K.box(1.2, 0.3, 1.2), MARBLE, 'stone');
    K.column(bb, { y: 0.3, h: 3, r: 0.16, color: MARBLE });
    K.statue(bb, { y: 3.3, h: 0.9, color: '#6f5a3a' });
  });
  // palaces
  for (const [x, z, ry] of [[4.6, -10, 0], [14.6, -9.4, 0.1]] as const) item(x, z, ry, 3, 3, [1.4, 1, 1.4], (bb) => {
    K.house(bb, { w: 3, d: 3, h: 2.4, roof: 'flat', cornice: true, wall: '#e4dccd', roofColor: '#cfc7b6', lit: 0.3, glow: 2.4, litColor: '#ffe2a8', rng });
    eyes(bb, 3, 3, 2.45); seams(bb, 3, 3, 2.4);
  });
  // school (U-plan with a bell turret)
  item(5.6, 7.2, 0, 3, 2.5, [1.2, 0.7, 1], (bb) => {
    K.house(bb, { x: 0, z: -0.9, w: 3, d: 0.8, h: 1.4, roof: 'hip', wall: '#e9e1cf', roofColor: '#8a8580', lit: 0.4, glow: 2, rng });
    for (const s of [-1, 1]) K.house(bb, { x: s * 1.1, z: 0.4, w: 0.8, d: 1.8, h: 1.4, roof: 'hip', wall: '#e9e1cf', roofColor: '#8a8580', lit: 0.4, glow: 2, rng });
    K.tower(bb, { x: 0, z: -0.9, y: 1.4, r: 0.22, h: 0.6, sides: 4, top: 'pyramid', color: '#e9e1cf', topColor: '#8a8580' });
  });
  // hospital
  item(12.4, 10, 0, 6, 1.6, [1.6, 0.9, 1], (bb) => { K.house(bb, { w: 6, d: 1.6, h: 2, roof: 'flat', cornice: true, wall: '#f0ece2', roofColor: '#d8d2c6', lit: 0.55, glow: 2.2, litColor: '#e6f0ff', rng }); seams(bb, 6, 1.6, 2); eyes(bb, 6, 1.6, 2.05); });
  // slaughterhouse: low sheds and pens
  item(17, 11.5, -0.5, 4, 2, [1.4, 0.6, 1], (bb) => {
    for (const s of [-1, 1]) K.house(bb, { x: s * 1.05, w: 1.9, d: 2, h: 0.8, roof: 'gable', wall: '#b9b2a6', roofColor: '#6f6a64', rng });
    for (let i = 0; i < 4; i++) for (const y of [0.15, 0.3]) bb.add(K.at(K.box(0.9, 0.03, 0.03), -1.5 + i * 1, y, 1.6), '#6b5440', 'wood');
    for (let i = 0; i < 5; i++) bb.add(K.at(K.box(0.04, 0.35, 0.04), -2 + i, 0, 1.6), '#6b5440', 'wood');
  });
  // factories with sawtooth roofs and cement chimneys
  const smokeSrc: THREE.Vector3[] = [new THREE.Vector3(17.6, 1.2, 11.2)];
  for (const [x, z, ry] of [[17.4, -1.2, 0.3], [15.4, -5.6, 0.2], [3.8, -15, 0]] as const) {
    item(x, z, ry, 3, 2, [1.3, 0.8, 1], (bb) => {
      bb.add(K.box(3, 1.2, 2), '#b3aca0', 'stone');
      for (let i = 0; i < 4; i++) bb.add(K.at(K.shedRoof(0.75, 2, 0, 0.45), -1.125 + i * 0.75, 1.2, 0), '#7a7672', 'metal');
      bb.add(K.at(K.cyl(0.18, 0.25, 4, 12), 1.1, 0, 0.7), CEMENT, 'stone');
      seams(bb, 3, 2, 1.2);
    });
    smokeSrc.push(new THREE.Vector3(x + Math.cos(ry) * 1.1 + Math.sin(ry) * 0.7, 4.1, z - Math.sin(ry) * 1.1 + Math.cos(ry) * 0.7));
  }
  // refinery: tanks, distillation columns, pipe racks, flare stack
  const RF: [number, number] = [9.6, -14.4];
  item(RF[0], RF[1], 0, 6, 4.5, [1.6, 1, 1.2], (bb) => {
    for (let i = 0; i < 6; i++) {
      const tx = -2.2 + (i % 3) * 1.9, tz = i < 3 ? -1.3 : 1.2, r = 0.6 + (i % 2) * 0.35;
      bb.add(K.at(K.cyl(r, r, 1.1, 20), tx, 0, tz), '#d9d6cf', 'metal');
      bb.add(K.at(K.dome(r, 20, 1, 0.25), tx, 1.1, tz), '#cfcbc3', 'metal');
    }
    for (const [cx, h] of [[2.5, 5], [3.2, 4.4]] as const) {
      bb.add(K.at(K.cyl(0.32, 0.32, h, 12), cx, 0, -0.2), '#bdb8ae', 'metal');
      for (let y = 0.8; y < h; y += 0.8) bb.add(K.at(K.torus(0.36, 0.04, 4, 16), cx, y, -0.2, { rx: Math.PI / 2 }), '#8a8580', 'metal');
    }
    for (let i = 0; i < 6; i++) bb.add(K.strut([-2.8 + i, 0, 0], [-2.8 + i, 0.9, 0], 0.03), '#7d7872', 'metal');
    for (const dz of [-0.08, 0.08]) bb.add(K.strut([-2.8, 0.9, dz], [3.2, 0.9, dz], 0.05), '#9d978f', 'metal');
    bb.add(K.at(K.cyl(0.12, 0.16, 7, 8), -3.2, 0, 1.8), '#8f8a82', 'metal');
  });
  const flarePos = new THREE.Vector3(RF[0] - 3.2, 7.25, RF[1] + 1.8);
  // harbour cranes on the docks
  for (const a of [-0.55, -0.95]) {
    const x = Math.cos(a) * 18.6, z = Math.sin(a) * 18.6;
    item(x, z, -a, 1.2, 1.2, [0.7, 0.6, 0.7], (bb) => {
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bb.add(K.strut([sx * 0.35, 0, sz * 0.35], [sx * 0.12, 3.3, sz * 0.12], 0.04), '#c9a24c', 'metal');
      bb.add(K.at(K.box(0.5, 0.4, 0.5), 0, 3.2, 0), '#c9a24c', 'metal');
      bb.add(K.strut([-0.8, 3.6, 0], [2.8, 3.5, 0], 0.06), '#c9a24c', 'metal');
      bb.add(K.strut([2.6, 3.5, 0], [2.6, 1.6, 0], 0.01), '#333333', 'metal');
    });
  }
  // cement pylons carrying cables from the refinery towards the centre
  const pyl: [number, number][] = [];
  for (let i = 0; i < 6; i++) { const k = i / 5; pyl.push([K.lerp(RF[0] - 3.5, 3.2, k), K.lerp(RF[1] + 3.2, -1.5, k) + Math.sin(i) * 0.4]); }
  for (const [x, z] of pyl) item(x, z, 0.6, 0.6, 0.6, [0.5, 0.4, 0.5], (bb) => {
    bb.add(K.ngon(0.12, 2.5, 4, 0.08), CEMENT, 'stone');
    bb.add(K.at(K.box(1.0, 0.08, 0.1), 0, 2.3, 0), CEMENT, 'stone');
  });
  const cableG: THREE.Vector3[] = [];
  for (let i = 0; i < 5; i++) for (const s of [-0.45, 0.45]) {
    const [x0, z0] = pyl[i], [x1, z1] = pyl[i + 1], c = Math.cos(0.6), sn = Math.sin(0.6);
    const pts = K.ropePoints([x0 + s * c, 2.38, z0 - s * sn], [x1 + s * c, 2.38, z1 - s * sn], 0.35, 8);
    for (let k = 0; k < pts.length - 1; k++) cableG.push(pts[k], pts[k + 1]);
  }
  const cableMat = new THREE.LineBasicMaterial({ color: '#2a2830', transparent: true });
  root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cableG), cableMat));

  // delays: buildings nearest the road are packed last
  const order = [...items].sort((p, q) => Math.hypot(q.x - 21, q.z - ROAD_Z) - Math.hypot(p.x - 21, p.z - ROAD_Z));
  order.forEach((it, i) => { it.delay = 0.02 + (0.3 * i) / (order.length - 1); });

  // generic stone blocks filling the streets (instanced, lowered on departure)
  const blocks: { x: number; z: number; h: number; ry: number; d: number }[] = [];
  const clear = (x: number, z: number) => {
    if (Math.hypot(x, z) > 18.6 || x < 2.4 || Math.hypot(x - 9, z) < 2.6 || (Math.abs(z - ROAD_Z) < 1.6 && x > 14)) return false;
    return !outlines.some((o) => { const xs = o.map((p) => p[0]), zs = o.map((p) => p[1]); return x > Math.min(...xs) - 0.9 && x < Math.max(...xs) + 0.9 && z > Math.min(...zs) - 0.9 && z < Math.max(...zs) + 0.9; })
      && !blocks.some((q) => Math.abs(q.x - x) < 1.25 && Math.abs(q.z - z) < 1.25);
  };
  for (let i = 0; i < 4000 && blocks.length < 120; i++) {
    const x = rng.float(2.4, 19), z = rng.float(-18, 18);
    if (clear(x, z)) blocks.push({ x, z, h: rng.float(0.8, 2), ry: rng.pick([0, 0.1, -0.1]), d: rng.float(0.05, 0.5) });
  }
  const blockMesh = K.instanced(K.paint(K.box(1, 1, 1), '#ffffff'), K.finish('stone'), blocks.length, (i, o, c) => {
    o.position.set(blocks[i].x, 0, blocks[i].z); o.scale.set(1, blocks[i].h, 1); o.rotation.y = blocks[i].ry; c.copy(K.pickJitter([MARBLE, '#d8d2c6', '#bdb7ad', CEMENT], rng));
  });
  root.add(blockMesh);
  for (const q of blocks) outlines.push([[q.x - 0.5, q.z - 0.5], [q.x + 0.5, q.z - 0.5], [q.x + 0.5, q.z + 0.5], [q.x - 0.5, q.z + 0.5]]);
  const winPts = blocks.filter(() => rng.chance(0.5)).map((q) => [q.x + 0.51, q.h * 0.6, q.z + rng.float(-0.3, 0.3)] as [number, number, number]);
  const blockWins = K.glowPoints(winPts, '#ffe0a8', 0.35, 0.7);
  root.add(blockWins);
  // chalk outlines of the vacant lots
  const chalk: THREE.Vector3[] = [];
  for (const o of outlines) for (let i = 0; i < 4; i++) chalk.push(new THREE.Vector3(o[i][0], 0.03, o[i][1]), new THREE.Vector3(o[(i + 1) % 4][0], 0.03, o[(i + 1) % 4][1]));
  const chalkMat = new THREE.LineBasicMaterial({ color: '#f4f0e6', transparent: true, opacity: 0 });
  root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(chalk), chalkMat));

  // docks: a crescent of dark harbour water with stone quays
  const dock = new THREE.RingGeometry(19.4, 22.4, 48, 1, 0.25, 1.1).rotateX(-Math.PI / 2);
  const harbour = K.waterMesh(dock, { color: '#1f2a44', amp: 0.25, scale: 0.8 });
  harbour.position.y = 0.02;
  root.add(harbour);
  b.add(K.at(new THREE.RingGeometry(19.1, 19.4, 48, 1, 0.25, 1.1).rotateX(-Math.PI / 2), 0, 0.1, 0), '#cfc8ba', 'stone');

  // ---------------------------------------------------------------- the convoy: flatbed trailers waiting on the road
  const convoy = new THREE.Group();
  const cb = new K.Batch();
  const slots: THREE.Vector3[] = [];
  for (let k = 0; k < 14; k++) {
    const x = 24.5 + k * 3.7, z = ROAD_Z + 0.35;
    cb.add(K.at(K.box(2.5, 0.12, 0.95), x, 0.32, z), '#3c3a40', 'metal');
    cb.add(K.at(K.box(0.8, 0.75, 0.9), x + 1.75, 0.18, z), k % 3 ? '#7a2e34' : '#2f4b6e', 'metal');
    cb.add(K.at(K.box(0.05, 0.3, 0.8), x + 2.16, 0.55, z), '#cfe3f0', 'glass');
    for (const wx of [-0.9, 0.6, 1.9]) for (const s of [-0.48, 0.48]) cb.add(K.at(K.cyl(0.17, 0.17, 0.1, 10), x + wx, 0.17, z + s, { rx: Math.PI / 2 }).translate(0, 0, 0), '#141416', 'matte');
    for (const s of [-0.3, 0.3]) cb.add(K.at(K.sphere(0.05, 6, 4), x + 2.2, 0.35, z + s), '#fff1c8', 'glow', 4);
    cb.add(K.at(K.sphere(0.04, 6, 4), x - 1.27, 0.35, z), '#ff3a30', 'glow', 3);
    slots.push(new THREE.Vector3(x, 0.44, z));
  }
  convoy.add(cb.build());
  root.add(convoy);
  const crateGeo = K.paint(K.merge([K.box(1, 1, 1), ...[-0.5, 0.5].flatMap((s) => [K.at(K.box(1.04, 0.06, 0.06), 0, 0.97, s * 1.0), K.at(K.box(1.04, 0.06, 0.06), 0, 0, s * 1.0)])]), '#ffffff');
  const crates = K.instanced(crateGeo, K.finish('wood'), items.length, (_i, o, c) => { o.scale.setScalar(0); c.set('#a8865a'); });
  root.add(crates);
  const setCrate = K.instanceSetter(crates);

  // ---------------------------------------------------------------- the fairground (permanent)
  const bulbs: [number, number, number][] = [];
  const bulbLine = (a: [number, number, number], c: [number, number, number], sag = 0.25, step = 0.28) => {
    const n = Math.max(2, Math.round(Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]) / step));
    for (const p of K.ropePoints(a, c, sag, n)) bulbs.push([p.x, p.y, p.z]);
  };
  // roller coaster on a closed loop hugging the west rim
  const ctrl: THREE.Vector3[] = [];
  const hs = [1.2, 4.5, 1.0, 3.2, 0.9, 2.6, 0.8, 3.8, 1.0, 2.0, 0.9, 1.5, 0.8, 1.0];
  for (let i = 0; i < 8; i++) { const a = Math.PI * (0.58 + (i / 7) * 0.84); ctrl.push(new THREE.Vector3(Math.cos(a) * 20.6, hs[i], Math.sin(a) * 20.6)); }
  for (let i = 0; i < 6; i++) { const a = Math.PI * (1.36 - (i / 5) * 0.72); ctrl.push(new THREE.Vector3(Math.cos(a) * 17.4, hs[8 + i], Math.sin(a) * 17.4)); }
  const curve = new THREE.CatmullRomCurve3(ctrl, true, 'centripetal');
  const NS = 900;
  const cp = curve.getSpacedPoints(NS);
  const arc: number[] = [0];
  for (let i = 1; i <= NS; i++) arc.push(arc[i - 1] + cp[i].distanceTo(cp[i - 1]));
  const lapLen = arc[NS];
  const rails: THREE.Vector3[][] = [[], []];
  const side = new THREE.Vector3(), tan = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= NS; i += 3) {
    tan.subVectors(cp[(i + 1) % NS], cp[i]).normalize();
    side.crossVectors(tan, up).normalize().multiplyScalar(0.16);
    rails[0].push(cp[i].clone().add(side)); rails[1].push(cp[i].clone().sub(side));
  }
  for (const r of rails) b.add(K.tube(r, 0.035, 600, 4, true), '#e8e4dc', 'metal');
  let lastT = -9;
  for (let i = 0; i < NS; i++) {
    if (arc[i] - lastT < 0.8) continue;
    lastT = arc[i];
    const p = cp[i];
    tan.subVectors(cp[(i + 1) % NS], p).normalize();
    side.crossVectors(tan, up).normalize().multiplyScalar(0.2);
    for (const s of [1, -1]) b.add(K.strut([p.x + side.x * s, 0, p.z + side.z * s], [p.x + side.x * s, p.y - 0.04, p.z + side.z * s], 0.025, 4), '#cfd2d6', 'metal');
    b.add(K.strut([p.x + side.x, 0.05, p.z + side.z], [p.x - side.x, p.y - 0.05, p.z - side.z], 0.015, 4), '#b8bcc2', 'metal');
    b.add(K.at(K.box(0.44, 0.04, 0.08), p.x, p.y - 0.05, p.z, { ry: -Math.atan2(tan.z, tan.x) + Math.PI / 2 }), '#7a5a40', 'wood');
    if (i % 2 === 0) bulbs.push([p.x + side.x * 1.4, p.y + 0.06, p.z + side.z * 1.4]);
  }
  // gravity timing: slow on the crests, fast in the dips (lap ~18 s)
  const hMax = Math.max(...cp.map((p) => p.y));
  const tAt: number[] = [0];
  for (let i = 1; i <= NS; i++) tAt.push(tAt[i - 1] + (arc[i] - arc[i - 1]) / Math.sqrt(0.6 + 2 * 9.8 * (hMax + 0.05 - cp[i].y)));
  const tScale = 18 / tAt[NS];
  let lip = 0, best = -1;
  for (let i = 0; i < NS; i++) { const drop = cp[i].y - cp[(i + 40) % NS].y; if (drop > best) { best = drop; lip = i; } }
  const sAtTime = (tau: number) => {
    const tt = (((tau % 18) + 18) % 18) / tScale;
    let lo = 0, hi = NS;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tAt[m] <= tt) lo = m; else hi = m; }
    return arc[lo] + ((tt - tAt[lo]) / Math.max(1e-6, tAt[hi] - tAt[lo])) * (arc[hi] - arc[lo]);
  };
  const posAtS = (s: number, out: THREE.Vector3) => {
    s = ((s % lapLen) + lapLen) % lapLen;
    let lo = 0, hi = NS;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arc[m] <= s) lo = m; else hi = m; }
    return out.lerpVectors(cp[lo], cp[hi], (s - arc[lo]) / Math.max(1e-6, arc[hi] - arc[lo]));
  };
  const lipTau = tAt[lip] * tScale;
  const carGeo = K.merge([K.paint(K.at(K.box(0.6, 0.22, 0.4), 0, 0.02, 0), RED), K.paint(K.at(K.box(0.08, 0.16, 0.4), 0.24, 0.22, 0), CREAM), K.paint(K.at(K.box(0.1, 0.1, 0.42), -0.25, 0.2, 0), MINT)]);
  const train = K.instanced(carGeo, K.finish('polished'), 3, undefined, { colors: false });
  root.add(train);
  const setTrain = K.instanceSetter(train);
  const scream = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 6, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe9b0').multiplyScalar(3), transparent: true, opacity: 0, depthWrite: false }));
  scream.position.copy(cp[lip]).add(new THREE.Vector3(0, 1.0, 0));
  root.add(scream);

  // Ferris wheel of spinning cages
  const FW = new THREE.Vector3(-6, 3.6, -9), FR = 3.2;
  for (const s of [-1, 1]) for (const dz of [-0.55, 0.55]) b.add(K.strut([FW.x + s * 1.7, 0, FW.z + dz], [FW.x, FW.y, FW.z + dz * 0.5], 0.07), '#dfe3e8', 'metal');
  const wheel = new THREE.Group();
  const wb = new K.Batch();
  for (const dz of [-0.25, 0.25]) wb.add(K.at(K.torus(FR, 0.05, 6, 64), 0, 0, dz), '#f1ede4', 'metal');
  const wheelBulbs: [number, number, number][] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    for (const dz of [-0.25, 0.25]) wb.add(K.strut([0, 0, dz], [Math.cos(a) * FR, Math.sin(a) * FR, dz], 0.025, 4), '#e2ddd2', 'metal');
    for (let k = 1; k <= 6; k++) wheelBulbs.push([Math.cos(a) * FR * (k / 6), Math.sin(a) * FR * (k / 6), 0.3]);
  }
  wb.add(K.at(K.cyl(0.25, 0.25, 0.8, 12), 0, -0.4, 0, { rx: Math.PI / 2 }), '#c9a24c', 'gold');
  wheel.add(wb.build(), K.glowPoints(wheelBulbs, BULB, 0.35, 0.95));
  wheel.position.copy(FW);
  root.add(wheel);
  const cageGeo = K.merge([K.at(K.box(0.5, 0.05, 0.5), 0, -0.55, 0), K.at(K.cone(0.38, 0.2, 4), 0, -0.05, 0, { ry: Math.PI / 4 }),
    ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => K.at(K.box(0.03, 0.5, 0.03), sx * 0.23, -0.55, sz * 0.23)), K.at(K.box(0.03, 0.25, 0.03), 0, -0.05, 0)]);
  const cages = K.instanced(K.paint(cageGeo, '#ffffff'), K.finish('metal'), 12, (i, _o, c) => { c.set([RED, MINT, CREAM][i % 3]); });
  root.add(cages);
  const setCage = K.instanceSetter(cages);

  // chain carousel
  const CC = new THREE.Vector3(-11, 0, 3.5);
  b.add(K.at(K.cyl(0.12, 0.16, 2.6, 10), CC.x, 0, CC.z), '#c9a24c', 'gold');
  b.add(K.at(K.cyl(1.9, 1.9, 0.1, 32), CC.x, 0, CC.z), '#5a4a52', 'wood');
  const carousel = new THREE.Group();
  const kb = new K.Batch();
  const cone = K.cone(1.05, 0.7, 16);
  K.paintBy(cone, (x, _y, z, out) => out.set(Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 16) % 2 ? RED : CREAM));
  kb.add(K.at(cone, 0, 2.5, 0), null, 'cloth');
  kb.add(K.at(K.torus(0.95, 0.04, 4, 32), 0, 2.45, 0, { rx: Math.PI / 2 }), '#c9a24c', 'gold');
  const cBulbs: [number, number, number][] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, ex = Math.cos(a), ez = Math.sin(a), r1 = 0.95 + 1.2 * Math.sin(0.7), y1 = 2.45 - 1.2 * Math.cos(0.7);
    kb.add(K.strut([ex * 0.95, 2.45, ez * 0.95], [ex * r1, y1, ez * r1], 0.008, 3), '#3a3a3a', 'metal');
    kb.add(K.at(K.box(0.18, 0.05, 0.16), ex * r1, y1 - 0.05, ez * r1, { ry: -a }), [RED, MINT, CREAM][i % 3], 'polished');
    cBulbs.push([ex * 1.02, 2.5, ez * 1.02]);
  }
  carousel.add(kb.build(), K.glowPoints(cBulbs, BULB, 0.3, 0.9));
  carousel.position.copy(CC);
  root.add(carousel);

  // well of death: a wooden drum with riders on its inner wall
  const WD = new THREE.Vector3(-5, 0, 8.5);
  b.add(K.at(K.cyl(0.8, 0.8, 0.8, 32, true), WD.x, 0, WD.z), '#8a5c3a', 'wood');
  b.add(K.at(K.cyl(0.78, 0.78, 0.8, 32, true), WD.x, 0, WD.z, { s: [-1, 1, 1] }), '#a8784e', 'wood');
  b.add(K.at(K.torus(0.86, 0.05, 4, 32), WD.x, 0.82, WD.z, { rx: Math.PI / 2 }), '#5d3e28', 'wood');
  b.add(K.at(K.stairs(5, 0.3, 0.16, 0.18), WD.x + 0.95, 0, WD.z, { ry: Math.PI / 2 }), '#6d4a30', 'wood');
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; bulbs.push([WD.x + Math.cos(a) * 0.9, 0.95, WD.z + Math.sin(a) * 0.9]); }
  const riders = K.instanced(K.paint(K.merge([K.box(0.14, 0.06, 0.05), K.at(K.box(0.05, 0.08, 0.04), 0, 0.05, 0)]), '#ffffff'), K.finish('polished'), 2, (i, _o, c) => { c.set(i ? MINT : RED); });
  root.add(riders);
  const setRider = K.instanceSetter(riders);

  // big top with trapezes under the translucent canvas
  const BT = new THREE.Vector3(-14, 0, -2);
  const canvasG = K.merge([K.cyl(3, 3, 1.2, 48, true), K.at(K.cyl(0.2, 3, 1.6, 48, true), 0, 1.2, 0)]);
  K.paintBy(canvasG, (x, _y, z, out) => out.set(Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 24) % 2 ? RED : CREAM));
  const canvasMat = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false, roughness: 0.8, emissive: '#ffb070', emissiveIntensity: 0.1 });
  const tent = new THREE.Mesh(canvasG, canvasMat);
  tent.position.copy(BT);
  root.add(tent);
  for (const s of [-0.6, 0.6]) b.add(K.at(K.cyl(0.06, 0.06, 3.2, 8), BT.x + s, 0, BT.z), '#c9a24c', 'gold');
  K.flag(b, { x: BT.x, y: 2.8, z: BT.z, h: 0.7, w: 0.4, color: RED });
  b.add(K.at(K.disc(2.9, 40), BT.x, 0.02, BT.z), '#b88a5a', 'matte');
  const tentGlow = K.glowSprite('#ffc27a', 4, 0.22);
  tentGlow.position.set(BT.x, 1.3, BT.z);
  root.add(tentGlow);
  const trapG = K.paint(K.merge([K.at(K.cyl(0.015, 0.015, 0.4, 5), -0.2, -0.9, 0, { rz: Math.PI / 2 }), K.at(K.box(0.008, 0.9, 0.008), -0.2, -0.9, 0), K.at(K.box(0.008, 0.9, 0.008), 0.2, -0.9, 0)]), '#ffffff');
  const traps = K.instanced(trapG, K.finish('gold'), 8, (_i, _o, c) => { c.set('#e3c070'); });
  root.add(traps);
  const setTrap = K.instanceSetter(traps);

  // shooting galleries along the boulevard
  for (const z of [-11, -6.5, 6.5, 11]) {
    K.stall(b, { x: -2.6, z, ry: Math.PI / 2, w: 1.8, d: 0.9, h: 0.75, cloth: RED, stripes: CREAM });
    for (let i = 0; i < 6; i++) bulbs.push([-2.15, 1.0, z - 0.75 + i * 0.3]);
  }
  // bulb strings on poles
  const poles: [number, number][] = [];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; poles.push([-8.5 + Math.cos(a) * 6.5, 0.5 + Math.sin(a) * 7.5]); }
  for (const [x, z] of poles) b.add(K.at(K.cyl(0.04, 0.05, 2.4, 6), x, 0, z), '#3b3438', 'metal');
  for (let i = 0; i < 12; i++) {
    const [x0, z0] = poles[i], [x1, z1] = poles[(i + 1) % 12];
    bulbLine([x0, 2.35, z0], [x1, 2.35, z1], 0.4);
    if (i % 3 === 0) bulbLine([x0, 2.35, z0], [-8.5, 3.3, 0.5], 0.35);
  }
  b.add(K.at(K.cyl(0.06, 0.08, 3.4, 8), -8.5, 0, 0.5), '#3b3438', 'metal');
  for (let z = -16; z < 16; z += 3.2) bulbLine([-1.6, 1.6, z], [-1.6, 1.6, z + 3.2], 0.2);

  // the gate with a sign that counts the days
  const GX = -6, GZ = 18.5;
  for (const s of [-1.8, 1.8]) b.add(K.at(K.cyl(0.1, 0.12, 2.8, 8), GX + s, 0, GZ), '#c9a24c', 'gold');
  b.add(K.at(K.box(3.8, 0.9, 0.12), GX, 2.4, GZ), '#2a1e2a', 'wood');
  const tallyPos = new Float32Array(30 * 3), tallyIdx = new Float32Array(30);
  for (let i = 0; i < 30; i++) { tallyPos.set([GX - 1.55 + (i % 10) * 0.345, 2.6 + Math.floor(i / 10) * 0.25, GZ + 0.08], i * 3); tallyIdx[i] = i; }
  for (let x = -1.8; x <= 1.8; x += 0.3) bulbs.push([GX + x, 3.4, GZ + 0.05]);

  // all fair bulbs: one chasing Points shader (+ the tally)
  const bulbMat = (count: { value: number } | null) => new THREE.ShaderMaterial({
    uniforms: { uT, uCount: count ?? { value: 1e9 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aIdx; uniform float uT; uniform float uCount; varying float vB;
      void main(){ ${count ? 'vB = aIdx < uCount ? 2.6 : 0.12;' : 'vB = 0.55 + 1.9 * smoothstep(0.55, 1.0, 0.5 + 0.5 * sin(aIdx * 0.9 - uT * 5.0));'}
        vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = 0.22 * projectionMatrix[1][1] * 400.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vB; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
      gl_FragColor = vec4(vec3(1.0, 0.76, 0.35) * vB * (0.4 + 1.6 * smoothstep(0.25, 0.0, d)), a);
      #include <colorspace_fragment>
    }`,
  });
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.Float32BufferAttribute(bulbs.flat(), 3));
  bg.setAttribute('aIdx', new THREE.Float32BufferAttribute(bulbs.map((_, i) => i), 1));
  root.add(new THREE.Points(bg, bulbMat(null)));
  const tallyCount = { value: 0 };
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(tallyPos, 3));
  tg.setAttribute('aIdx', new THREE.BufferAttribute(tallyIdx, 1));
  root.add(new THREE.Points(tg, bulbMat(tallyCount)));

  root.add(b.build({ name: 'sophronia' }));

  // ---------------------------------------------------------------- people, smoke, flare
  const rides: [number, number, number][] = [[FW.x, FW.z, 2.2], [CC.x, CC.z, 2.3], [WD.x, WD.z, 1.4], [BT.x, BT.z, 3.3]];
  root.add(K.crowd({ count: 120, rng: rng.fork('fair'), colors: ['#d6344a', '#efe2c8', '#2f4b6e', '#8fd8bf', '#c9a35a', '#3c3a36', '#6d3d5e'], place: (_i, r) => {
    for (let k = 0; k < 30; k++) {
      const x = r.float(-16, -2.2), z = r.float(-15, 17);
      if (Math.hypot(x, z) > 16.5 || rides.some(([rx, rz, rr]) => Math.hypot(x - rx, z - rz) < rr)) continue;
      return [x, 0.01, z];
    }
    return null;
  } }));
  const sq = (r: number) => Array.from({ length: 25 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return new THREE.Vector3(9 + Math.cos(a) * r, 0.01, Math.sin(a) * r); });
  const walkers = new K.Walkers({ paths: [sq(2.0), sq(2.4), [new THREE.Vector3(1.6, 0.01, -16), new THREE.Vector3(1.6, 0.01, 16)]], count: 34, closed: true, rng: rng.fork('walk'), speed: [0.15, 0.25], colors: ['#2b2b2b', '#3c4250', '#5a5550', '#1f2430'] });
  root.add(walkers.mesh);
  const smoke = K.smoke({ sources: smokeSrc, perSource: 26, height: 5, color: '#8a8698', opacity: 0.35, size: [0.4, 1.4], life: 7, wind: [0.4, -0.15], rng: rng.fork('smoke') });
  root.add(smoke);
  const flare = K.glowSprite('#ff8a3a', 1.6, 0.9);
  flare.position.copy(flarePos);
  root.add(flare);
  const harbourGlow = K.glowPoints([[13, 2.2, -15.5], [16.5, 2.2, -11.5], [18.6, 2.2, -7]], '#e8f0ff', 0.9, 0.7);
  root.add(harbourGlow);

  const tog = new K.Toggle(1 / 12);
  let tau = 0, frozen = false, departedAt = -1;
  const pTmp = new THREE.Vector3(), pTmp2 = new THREE.Vector3();
  let lastW = -1;
  return {
    root,
    env: {
      skyTop: '#1b2046', skyHorizon: '#cf8a8c', skyBottom: '#3a3456', skyCurve: 0.5,
      fog: '#4a4467', fogNear: 50, fogFar: 135,
      sunDir: [-0.7, 0.16, -0.45], sunColor: '#ff9e8c', sunIntensity: 1.3, sunDisc: 0, sunGlow: 0.8,
      hemiSky: '#7276b0', hemiGround: '#3d3442', hemiIntensity: 1.0, envIntensity: 0.75,
      stars: 0.55, clouds: 0.2, cloudColor: '#b77a8a', bloomStrength: 0.9, bloomThreshold: 0.72, bloomRadius: 0.55,
      tiltShift: 0.35, shadowRadius: 25, vignette: 0.4, saturation: 1.1,
    },
    camera: {
      position: [11, 25, 46], target: [4, 1.5, 1.5], fov: 37, minDistance: 10, maxDistance: 95, autoRotate: 0.2,
      views: [
        { position: [-25, 8, 19], target: [-8, 2.4, -1] },
        { position: [27, 11, 20], target: [10, 1.2, -3] },
      ],
    },
    interaction: {
      label: 'Caravan departs', activeLabel: 'Caravan returns',
      hint: 'The bank and the refinery go on tour; the rides stay and count the days.',
      set: (on) => tog.set(on),
      camera: { position: [36, 21, 40], target: [20, 0.5, 3] },
    },
    update(t, dt) {
      uT.value = t;
      tog.update(dt);
      const w = tog.value;
      // the stone half packs itself into crates and leaves
      if (w !== lastW) {
        lastW = w;
        const drive = K.smoothstep(0.78, 1, w) ** 2 * 60;
        convoy.position.x = drive;
        items.forEach((it, i) => {
          const p = K.clamp((w - it.delay) / 0.45);
          const fold = K.smoothstep(0, 0.35, p);
          it.g.scale.set(1, Math.max(0.001, 1 - fold), 1);
          it.g.visible = fold < 0.999;
          const grow = K.smoothstep(0.25, 0.4, p), go = K.smoothstep(0.4, 0.85, p);
          const slot = slots[i % slots.length], stack = Math.floor(i / slots.length) * 0.9;
          pTmp.set(it.x, 0, it.z).lerp(pTmp2.set(slot.x + drive, slot.y + stack, slot.z), go);
          pTmp.y += Math.sin(Math.PI * go) * 4;
          setCrate(i, pTmp.x, pTmp.y, pTmp.z, 0, grow > 0.001 ? [it.c[0] * grow, it.c[1] * grow, it.c[2] * grow] : 0.0001);
        });
        setCrate.done();
        const setB = K.instanceSetter(blockMesh);
        blocks.forEach((q, i) => setB(i, q.x, 0, q.z, q.ry, [1, Math.max(0.001, q.h * (1 - K.smoothstep(q.d, q.d + 0.25, w))), 1]));
        setB.done();
        chalkMat.opacity = K.smoothstep(0.4, 0.7, w) * 0.85;
        cableMat.opacity = 1 - K.smoothstep(0.1, 0.3, w);
        blockWins.visible = w < 0.2;
        smoke.visible = w < 0.35;
        harbourGlow.visible = w < 0.5;
      }
      if (w >= 0.999 && departedAt < 0) departedAt = t;
      if (tog.target === 0) departedAt = -1;
      tallyCount.value = departedAt < 0 ? 0 : Math.min(30, Math.floor((t - departedAt) * 2));
      flare.material.opacity = w > 0.5 ? 0 : 0.7 + 0.3 * Math.sin(t * 13) * Math.sin(t * 7.3);
      flare.scale.setScalar(1.4 + 0.4 * Math.sin(t * 9.1));
      // the coaster: halts at the lip of its plunge while the stone city is away
      if (tog.target === 1 && w > 0.2 && !frozen) {
        const next = tau + dt, a = ((tau % 18) + 18) % 18, c = ((next % 18) + 18) % 18;
        if ((a <= lipTau && c >= lipTau) || (a > c && (lipTau >= a || lipTau <= c))) { frozen = true; tau = Math.floor(tau / 18) * 18 + lipTau; }
      }
      if (tog.target === 0) frozen = false;
      if (!frozen) tau += dt;
      const s = sAtTime(tau);
      for (let j = 0; j < 3; j++) {
        posAtS(s - j * 0.7, pTmp); posAtS(s - j * 0.7 + 0.15, pTmp2);
        const dx = pTmp2.x - pTmp.x, dy = pTmp2.y - pTmp.y, dz = pTmp2.z - pTmp.z;
        setTrain(j, pTmp.x, pTmp.y + 0.02, pTmp.z, -Math.atan2(dz, dx), 1, 0, Math.atan2(dy, Math.hypot(dx, dz)));
      }
      setTrain.done();
      (scream.material as THREE.MeshBasicMaterial).opacity = frozen ? 0.5 + 0.3 * Math.sin(t * 3) : 0;
      scream.rotation.set(Math.PI / 2, 0, t * 0.5);
      scream.scale.setScalar(1 + 0.15 * Math.sin(t * 2));
      // rides
      const wr = t * ((Math.PI * 2) / 40);
      wheel.rotation.z = wr;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + wr;
        setCage(i, FW.x + Math.cos(a) * FR, FW.y + Math.sin(a) * FR, FW.z, t * 0.6 + i, 1);
      }
      setCage.done();
      carousel.rotation.y = t * 1.4;
      for (let i = 0; i < 2; i++) {
        const a = t * 4.2 + i * Math.PI, y = 0.35 + 0.15 * Math.sin(t * 2 + i);
        setRider(i, WD.x + Math.cos(a) * 0.68, y, WD.z + Math.sin(a) * 0.68, -a - Math.PI / 2, 1, 1.2, 0);
      }
      setRider.done();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        setTrap(i, BT.x + Math.cos(a) * 0.9, 2.55, BT.z + Math.sin(a) * 0.9, -a, 1, Math.sin(t * 1.3 + i * 0.8) * 0.6, 0);
      }
      setTrap.done();
      walkers.update(t);
      walkers.mesh.visible = w < 0.4;
    },
  };
};

export default build;
