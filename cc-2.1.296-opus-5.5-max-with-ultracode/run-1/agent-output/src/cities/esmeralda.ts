// ESMERALDA - Trading Cities 5.
// A city of water where canals and streets braid together on many levels: quays,
// humpbacked bridges, steps and hanging streets. A wedge is cut away on the south
// side to show the underworld of sewers, rats and smugglers. Every moving thing
// leaves a short trail in its own ink, and one citizen with a lantern goes from her
// door to the bell-tower square by a different route every day.
// Toggle: ink the map - the city fades to paper and the routes are laid down for good.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

type V = THREE.Vector3;
const D2R = Math.PI / 180;
const W0 = 40 * D2R, W1 = 140 * D2R, PIT_R = 6.5, CITY_R = 15, STREET = 0.35, WATER = 0.05, FLOOR = -2.5;
const grand = (x: number) => 1 + 2.5 * Math.sin((Math.PI * x) / 12);
const grandD = (x: number) => 2.5 * (Math.PI / 12) * Math.cos((Math.PI * x) / 12);
const MINOR: [number, number, number, number, number][] = [
  [-8, -14.5, -6, -0.2, 0.6], [6, -14, 5, 1.6, 0.6], [-14, -6, -3, -7, 0.55], [3.5, -7.5, 12.5, -5, 0.6],
  [-2, -14, -1, -6.5, 0.5], [-12.5, 7.5, -7, 2.4, 0.6], [8, 4.2, 14.8, 4.8, 0.65], [-14.8, 2, -9, 1.2, 0.5], [9, -9, 14, -2, 0.55],
];
const segDist = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, u = K.clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz));
  return Math.hypot(x - ax - dx * u, z - az - dz * u);
};
/** signed distance to the nearest canal bank (negative inside water); also whether it's the grand canal */
const canal = (x: number, z: number) => {
  let d = Math.abs(z - grand(x)) / Math.sqrt(1 + grandD(x) ** 2) - 1.2, isG = true;
  for (const [ax, az, bx, bz, hw] of MINOR) {
    const e = segDist(x, z, ax, az, bx, bz) - hw;
    if (e < d) { d = e; isG = false; }
  }
  return { d, isG };
};
const inPit = (x: number, z: number, m = 0) => {
  const a = Math.atan2(z, x);
  return Math.hypot(x, z) > PIT_R - m && a > W0 - m / 8 && a < W1 + m / 8;
};

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const b = new K.Batch();
  const secMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide });
  const strata = (g: THREE.BufferGeometry) => K.paintBy(g, (x, y, z, out) => {
    const n = K.noise2(x * 0.8 + z * 0.8, y * 3) * 0.06;
    out.set(y > -0.35 ? '#9a5a3c' : y > -1.3 ? '#7a6450' : y > -2.6 ? '#5f5444' : '#4a4036').offsetHSL(0, 0, n + (Math.floor(y * 6) % 2 ? 0.02 : -0.02));
  });

  // ---- lagoon: a block of emerald water
  const lag = new THREE.Mesh(K.paintBy(new THREE.CylinderGeometry(26, 26, 5.05, 96, 1, true).translate(0, -2.475, 0), (_x, y, _z, o) => o.set('#1d6b5a').lerp(new THREE.Color('#0a2a26'), -y / 5)), secMat);
  root.add(lag);
  root.add(new THREE.Mesh(new THREE.CircleGeometry(26, 64).rotateX(Math.PI / 2).translate(0, -5, 0), new THREE.MeshBasicMaterial({ color: '#0a2420' })));
  root.add(K.waterMesh(K.ring(CITY_R - 0.05, 26, 128).translate(0, WATER, 0), { color: '#1d6b5a', amp: 0.07, scale: 0.4, speed: 0.25 }));
  root.add(K.waterMesh(new THREE.CircleGeometry(CITY_R, 128, -W0, Math.PI * 2 - (W1 - W0)).rotateX(-Math.PI / 2).translate(0, WATER, 0), { color: '#1d6b5a', amp: 0.07, scale: 0.4, speed: 0.25 }));
  root.add(K.cloudSea({ y: -9, color: '#cfe0c8', shadow: '#5f8a7a', opacity: 0.55, coverage: 0.45 }));

  // ---- the city crust on a polar grid (canals carved, the pit wedge cut away)
  const NR = 60, NA = 360, hAt = (x: number, z: number) => (canal(x, z).d < 0 ? -0.4 : STREET);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i <= NR; i++) for (let j = 0; j < NA; j++) {
    const r = (i / NR) * CITY_R, a = (j / NA) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r, h = hAt(x, z);
    pos.push(x, h, z);
    const cd = canal(x, z).d;
    c.set(h < 0 ? '#2a4a3c' : cd < 0.35 ? '#b8a07c' : '#cdb48c').offsetHSL(0, 0, K.noise2(x * 1.7, z * 1.7) * 0.03);
    col.push(c.r, c.g, c.b);
  }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) {
    const a = ((j + 0.5) / NA) * Math.PI * 2, r = ((i + 0.5) / NR) * CITY_R;
    if (r > PIT_R && a > W0 && a < W1) continue;
    const p = i * NA + j, q = i * NA + ((j + 1) % NA), s = p + NA, t = q + NA;
    idx.push(p, s, q, q, s, t);
  }
  const crust = new THREE.BufferGeometry();
  crust.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  crust.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  crust.setIndex(idx);
  crust.computeVertexNormals();
  if (crust.attributes.normal.getY(NA * 5) < 0) { idx.reverse(); crust.setIndex(idx); crust.computeVertexNormals(); }
  const crustM = new THREE.Mesh(crust, K.finish('stone'));
  crustM.receiveShadow = true;
  root.add(crustM);
  // outer wall, section faces, pit floor and the lagoon's own section in the wedge
  const wallStrip = (r: number, a0: number, a1: number, n: number, yBot: number, top: (x: number, z: number) => number) => {
    const P: number[] = [];
    for (let k = 0; k < n; k++) {
      const p0 = a0 + ((a1 - a0) * k) / n, p1 = a0 + ((a1 - a0) * (k + 1)) / n;
      const x0 = Math.cos(p0) * r, z0 = Math.sin(p0) * r, x1 = Math.cos(p1) * r, z1 = Math.sin(p1) * r;
      P.push(x0, yBot, z0, x1, yBot, z1, x0, top(x0, z0), z0, x1, yBot, z1, x1, top(x1, z1), z1, x0, top(x0, z0), z0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.computeVertexNormals();
    return strata(g);
  };
  const sec = [
    wallStrip(CITY_R, W1, W0 + Math.PI * 2, 300, -4, (x, z) => hAt(x * 0.995, z * 0.995)),
    wallStrip(CITY_R, W0, W1, 80, -4, () => FLOOR),
    wallStrip(PIT_R, W0, W1, 60, FLOOR, () => STREET),
  ];
  for (const a of [W0, W1]) {
    const P: number[] = [];
    for (let k = 0; k < 34; k++) {
      const r0 = PIT_R + ((CITY_R - PIT_R) * k) / 34, r1 = PIT_R + ((CITY_R - PIT_R) * (k + 1)) / 34;
      const [x0, z0, x1, z1] = [Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1];
      P.push(x0, FLOOR, z0, x1, FLOOR, z1, x0, hAt(x0, z0), z0, x1, FLOOR, z1, x1, hAt(x1, z1), z1, x0, hAt(x0, z0), z0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.computeVertexNormals();
    sec.push(strata(g));
  }
  root.add(new THREE.Mesh(K.merge(sec), secMat));
  root.add(new THREE.Mesh(new THREE.CircleGeometry(CITY_R, 96).rotateX(Math.PI / 2).translate(0, -4, 0), new THREE.MeshBasicMaterial({ color: '#2a241e' })));
  b.add(K.at(new THREE.RingGeometry(PIT_R, CITY_R, 48, 1, -W1, W1 - W0).rotateX(-Math.PI / 2), 0, FLOOR, 0), '#3a3028', 'stone');
  const lagSec = new THREE.Mesh(new THREE.CylinderGeometry(CITY_R + 0.02, CITY_R + 0.02, WATER - FLOOR, 48, 1, true, Math.PI / 2 - W1, W1 - W0).translate(0, (WATER + FLOOR) / 2, 0),
    new THREE.MeshStandardMaterial({ color: '#2f9a7c', transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }));
  root.add(lagSec);

  // ---- the underworld in the wedge: two spokes and the ring sewer as open channels, piles, lanterns
  const chan = (pts: V[], w = 0.7) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const A = pts[k], B = pts[k + 1], mid = A.clone().add(B).multiplyScalar(0.5), len = A.distanceTo(B) + 0.03, ry = Math.atan2(B.x - A.x, B.z - A.z);
      b.add(K.at(K.box(w, 0.05, len), mid.x, FLOOR, mid.z, { ry }), '#1e1a1c', 'stone');
      for (const s of [-1, 1]) b.add(K.at(K.box(0.12, 0.22, len), mid.x + Math.cos(ry) * s * w * 0.55, FLOOR, mid.z - Math.sin(ry) * s * w * 0.55, { ry }), '#7a4a34', 'stone');
    }
  };
  const ringPts = Array.from({ length: 25 }, (_, k) => { const a = W0 + 0.02 + ((W1 - W0 - 0.04) * k) / 24; return new THREE.Vector3(Math.cos(a) * 11, FLOOR + 0.06, Math.sin(a) * 11); });
  chan(ringPts);
  const spokes = [67.5, 112.5].map((d) => [PIT_R + 0.05, 11].map((r) => new THREE.Vector3(Math.cos(d * D2R) * r, FLOOR + 0.06, Math.sin(d * D2R) * r)));
  spokes.forEach((p) => chan(p));
  for (const p of spokes) b.add(K.at(K.archWall(1.0, 1.4, 0.1, 0.7, 1.1), p[0].x * 0.985, FLOOR, p[0].z * 0.985, { ry: Math.atan2(-p[0].x, -p[0].z) + Math.PI }), '#5a3a2c', 'stone');
  for (let i = 0; i < 26; i++) {
    const a = rng.float(W0 + 0.05, W1 - 0.05), r = rng.float(12.3, 14.7);
    b.add(K.at(K.cyl(0.07, 0.08, rng.float(1.2, 2.4), 6), Math.cos(a) * r, FLOOR, Math.sin(a) * r), '#3e2c20', 'wood');
  }
  const tunnelLamps: [number, number, number][] = [];
  for (let k = 0; k < 7; k++) { const p = ringPts[k * 4]; tunnelLamps.push([p.x, FLOOR + 0.55, p.z]); b.add(K.at(K.sphere(0.06, 6, 5), p.x, FLOOR + 0.5, p.z), '#ffb860', 'glow', 4); }
  root.add(K.glowPoints(tunnelLamps, '#ffb860', 1.6, 0.6));
  for (let i = 0; i < 6; i++) b.add(K.at(K.cyl(0.13, 0.13, 0.25, 10), ringPts[3 + i * 3].x + 0.4, FLOOR, ringPts[3 + i * 3].z), '#6a4a2a', 'wood');

  // ---- houses, square, bell tower
  const houses: { x: number; z: number; w: number; d: number; h: number; ry: number }[] = [];
  const sqX = 1, sqZ = -1.5;
  for (let tries = 0; tries < 6000 && houses.length < 130; tries++) {
    const [x, z] = rng.inDisc(14.2);
    const w = rng.float(0.9, 1.6), d = rng.float(0.9, 1.5), fp = Math.max(w, d) / 2;
    const cn = canal(x, z);
    if (Math.hypot(x, z) > 14.4 - fp || inPit(x, z, fp + 0.4) || cn.d < fp * 0.8 + (cn.isG ? 0.7 : 0.25)) continue;
    if (Math.abs(x - sqX) < 2.2 + fp && Math.abs(z - sqZ) < 1.7 + fp) continue;
    if (houses.some((h) => Math.abs(h.x - x) < (Math.max(h.w, h.d) / 2 + fp) * 0.82 && Math.abs(h.z - z) < (Math.max(h.w, h.d) / 2 + fp) * 0.82)) continue;
    houses.push({ x, z, w, d, h: rng.int(3, 5) * 0.42, ry: Math.round(rng.float(-1, 1)) * 0.0 + Math.atan2(grandD(x), 1) * 0.5 });
  }
  for (const h of houses) {
    K.house(b, { x: h.x, y: STREET, z: h.z, ry: h.ry, w: h.w * 0.92, d: h.d * 0.92, h: h.h, roof: rng.pick(['gable', 'hip', 'gable'] as const), wall: rng.pick(['#d99877', '#d9a86a', '#c97a5c', '#e2b48a', '#b8664a', '#e0a080']), roofColor: rng.pick(['#b0533a', '#a04a30', '#c0603e']), lit: 0.08, glow: 2, rng, cornice: true });
    if (rng.chance(0.4)) b.add(K.at(K.box(h.w * 0.5, 0.05, 0.22), h.x + Math.sin(h.ry) * h.d * 0.5, STREET + 0.84, h.z + Math.cos(h.ry) * h.d * 0.5, { ry: h.ry }), '#6a4a3a', 'wood');
    if (rng.chance(0.5)) K.chimney(b, { x: h.x + h.w * 0.25, y: STREET + h.h, z: h.z, h: 0.45, w: 0.12, color: '#8a5a44' });
  }
  b.add(K.at(K.box(4.2, 0.03, 3.1), sqX, STREET, sqZ), '#e0cba4', 'stone');
  const TX = sqX - 1.2, TZ = sqZ - 0.9;
  b.add(K.at(K.box(1.2, 5.3, 1.2), TX, STREET, TZ), '#c97a5c', 'stone');
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.add(K.at(K.box(0.22, 0.9, 0.22), TX + sx * 0.49, STREET + 5.3, TZ + sz * 0.49), '#d99877', 'stone');
  b.add(K.at(K.box(1.35, 0.12, 1.35), TX, STREET + 6.2, TZ), '#b8664a', 'stone');
  b.add(K.at(K.pyramid(1.3, 1.3, 1.9), TX, STREET + 6.32, TZ), '#5a8a6a', 'ceramic');
  b.add(K.at(K.sphere(0.2, 10, 8), TX, STREET + 5.6, TZ), '#b08a3a', 'bronze');
  K.well(b, { x: sqX + 0.8, y: STREET, z: sqZ + 0.4 });

  // ---- bridges over the canals, hanging streets, steps down to the water
  const bridgeXs = [-11, -6.5, -1.5, 3, 7.5, 11.5];
  for (const x of bridgeXs) { const g = grand(x); K.bridge(b, { from: [x, STREET, g - 1.6], to: [x, STREET, g + 1.6], width: 0.85, hump: 0.45, rise: 0.25, color: '#e2c9a0' }); }
  for (const [ax, az, bx, bz, hw] of MINOR) {
    for (const u of [0.35, 0.75]) {
      const mx = K.lerp(ax, bx, u), mz = K.lerp(az, bz, u), l = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / l, nz = (bx - ax) / l, s = hw + 0.35;
      if (Math.hypot(mx, mz) > 13.8 || inPit(mx, mz, 1)) continue;
      K.bridge(b, { from: [mx - nx * s, STREET, mz - nz * s], to: [mx + nx * s, STREET, mz + nz * s], width: 0.6, hump: 0.4, rise: 0.2, color: '#d8bf96' });
    }
  }
  const HANG = [-4.9, 0.2, 8.6, -9.5, 11.8, -12.5];
  for (const x of HANG.slice(0, 6)) {
    const g = grand(x), y = 1.6 + (Math.abs(x) % 0.3);
    K.bridge(b, { from: [x, y, g - 2.3], to: [x, y, g + 2.3], width: 0.55, rise: 0, color: '#c98a6a' });
    for (const s of [-1, 1]) {
      b.add(K.at(K.box(0.6, y - STREET, 0.5), x, STREET, g + s * 2.55), '#b8664a', 'stone');
      b.add(K.at(K.stairs(5, 0.5, (y - STREET) / 5, 0.22), x + 0.55, STREET, g + s * 2.55 - 0.25, { ry: -Math.PI / 2 }), '#d8bf96', 'stone');
    }
  }
  for (let i = 0; i < 12; i++) {
    const x = -12 + i * 2.2 + 0.4, g = grand(x), s = i % 2 ? 1 : -1;
    if (inPit(x, g + s * 1.4, 1)) continue;
    b.add(K.at(K.stairs(4, 0.5, 0.1, 0.12), x, -0.05, g + s * 1.0, { ry: s > 0 ? Math.PI : 0 }), '#bfa47c', 'stone');
  }
  const manholes: [number, number][] = [];
  for (let i = 0; i < 12; i++) {
    for (let k = 0; k < 40; k++) {
      const [x, z] = rng.inDisc(13);
      if (canal(x, z).d < 0.5 || inPit(x, z, 0.5) || houses.some((h) => Math.abs(h.x - x) < h.w * 0.6 && Math.abs(h.z - z) < h.d * 0.6)) continue;
      manholes.push([x, z]); b.add(K.at(K.disc(0.16, 12), x, STREET + 0.012, z), '#2a2a2c', 'metal'); break;
    }
  }
  root.add(b.build({ name: 'esmeralda' }));

  // ---- agents (all analytic in time, so trails are just their own past)
  const path = (pts: V[], loop = false) => {
    const acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const L = acc[acc.length - 1] || 1;
    return (s: number, out: V) => {
      let d = loop ? ((s % L) + L) % L : L - Math.abs((((s % (2 * L)) + 2 * L) % (2 * L)) - L);
      let k = 1;
      while (k < acc.length - 1 && acc[k] < d) k++;
      d = K.clamp((d - acc[k - 1]) / Math.max(1e-6, acc[k] - acc[k - 1]));
      return out.lerpVectors(pts[k - 1], pts[k], d);
    };
  };
  const vec = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const quay = (side: number, x0: number, x1: number, y = STREET + 0.01) => { const p: V[] = []; for (let x = x0; x <= x1 + 1e-6; x += 0.5) p.push(vec(x, y, grand(x) + side * 1.75)); return p; };
  const cross = (x: number, from: number) => [vec(x, STREET, grand(x) + from * 1.75), vec(x, STREET + 0.45, grand(x)), vec(x, STREET, grand(x) - from * 1.75)];
  // walkers zigzag along the grand canal across the humpbacked bridges
  const zig = (startSide: number) => {
    const p: V[] = []; let side = startSide, x0 = -13.5;
    for (const x of [-11, -6.5, -1.5, 3]) { p.push(...quay(side, x0, x)); p.push(...cross(x, side)); side = -side; x0 = x; }
    p.push(...quay(side, 3, side < 0 ? 13 : 4));
    return p;
  };
  const wPaths = [path(zig(-1)), path(zig(1)), path(quay(-1, -13.5, 13)), path(quay(1, -13.5, 4)),
    path([vec(sqX, STREET + 0.01, sqZ), vec(sqX + 0.3, STREET + 0.01, -7), vec(sqX + 0.6, STREET + 0.01, -13)]),
    path([vec(sqX - 2, STREET + 0.01, sqZ), vec(-4, STREET + 0.01, -3), vec(-9.5, STREET + 0.01, -3.8)])];
  const NW = 60, walkers = K.instanced(K.personGeometry(0.25), K.figureMaterial(), NW, (_i, _o, cc) => { cc.set(rng.pick(['#5a4a3c', '#3a466e', '#8a3a2a', '#d9d0bf', '#6a5a7a'])); });
  const wInfo = Array.from({ length: NW }, (_, i) => ({ p: wPaths[i % wPaths.length], off: rng.float(0, 60), sp: rng.float(0.3, 0.5) * rng.sign() }));
  // boats on the grand canal and the minor canals
  const gc: V[] = []; for (let x = -15.5; x <= 15.5; x += 0.5) gc.push(vec(x, WATER, grand(x)));
  const bPaths = [path(gc), ...MINOR.filter((m) => !inPit(m[2], m[3], 1)).map(([ax, az, bx, bz]) => path([vec(ax, WATER, az), vec(bx, WATER, bz)]))];
  const NBo = 12, boats = K.instanced(K.boatGeometry(0.9, '#2a1e18'), K.figureMaterial(), NBo, undefined, { colors: false });
  const boInfo = Array.from({ length: NBo }, (_, i) => ({ p: i < 5 ? bPaths[0] : bPaths[1 + (i % (bPaths.length - 1))], off: rng.float(0, 40), sp: rng.float(0.5, 0.8) }));
  // roof-runners: cats, thieves and lovers leaping from roof to roof
  const roofChain = (start: number) => {
    const seq = [start], used = new Set(seq);
    for (let k = 0; k < 10; k++) {
      const h = houses[seq[seq.length - 1]];
      let best = -1, bd = 1e9;
      houses.forEach((o, j) => { const d = Math.hypot(o.x - h.x, o.z - h.z); if (!used.has(j) && d < bd && d > 0.8) { bd = d; best = j; } });
      if (best < 0 || bd > 3.2) break;
      seq.push(best); used.add(best);
    }
    return seq.map((j) => vec(houses[j].x, STREET + houses[j].h + 0.3, houses[j].z));
  };
  const chains = Array.from({ length: 8 }, (_, i) => roofChain((i * 13) % houses.length));
  const hop = (pts: V[], s: number, out: V) => {
    const n = pts.length - 1, m = ((s % (2 * n)) + 2 * n) % (2 * n), q = m > n ? 2 * n - m : m, k = Math.min(n - 1, Math.floor(q)), f = q - k;
    const e = K.smoothstep(0.25, 0.75, f);
    out.lerpVectors(pts[k], pts[k + 1], e); out.y += Math.sin(e * Math.PI) * 0.55;
    return out;
  };
  const NR2 = 16, roofers = K.instanced(K.personGeometry(0.22), K.figureMaterial(), NR2, (i, _o, cc) => { cc.set(i < 4 ? '#1e1c22' : i < 8 ? '#c0283a' : '#d9a050'); });
  const cats = K.instanced(K.quadruped({ len: 0.24, h: 0.14, tail: 0.14, ears: true, color: '#ffffff' }), K.figureMaterial(), 8, (_i, _o, cc) => { cc.set(rng.pick(['#2a2624', '#d0a070', '#8a8a8a', '#f0e8dc'])); });
  // rats in chains of ten and smugglers with kegs in the sewers
  const ratPaths = [path(ringPts, false), path([...spokes[0]].reverse()), path(spokes[1])];
  const rats = K.instanced(K.quadruped({ len: 0.22, h: 0.1, tail: 0.18, color: '#ffffff' }), K.figureMaterial(), 50, (_i, _o, cc) => { cc.set('#4a4040'); });
  const smugglers = K.instanced(K.personGeometry(0.26), K.figureMaterial(), 6, (_i, _o, cc) => { cc.set('#2e2a34'); });
  const kegs = K.instanced(K.paint(K.cyl(0.08, 0.08, 0.16, 8), '#7a4a2a'), K.figureMaterial(), 6, undefined, { colors: false });
  // swallows on still wings
  const NS = 30, swallows = K.instanced(K.birdGeometry(0.34), new THREE.MeshBasicMaterial({ color: '#1e1e2a', side: THREE.DoubleSide }), NS, undefined, { castShadow: false, colors: false });
  const sw = Array.from({ length: NS }, () => ({ ph: rng.angle(), sp: rng.float(0.25, 0.5) * rng.sign(), r: rng.float(4, 12), lift: rng.float(0, 10) }));
  const swallowAt = (i: number, t: number, out: V) => {
    const s = sw[i], a = s.ph + t * s.sp, r = s.r * (0.6 + 0.4 * Math.sin(t * 0.17 + s.lift));
    return out.set(TX + Math.cos(a) * r, 3 + 11 * Math.pow(0.5 + 0.5 * Math.sin(a * 1.6 + s.lift), 2), TZ + Math.sin(a) * r);
  };
  root.add(walkers, boats, roofers, cats, rats, smugglers, kegs, swallows);
  root.add(K.particles({ count: 160, radius: 13, y0: 0.15, y1: 1.2, color: '#2a2a20', size: 0.025, opacity: 0.6, swirl: 0.4, rng: rng.fork('mosq') }));

  // the citizen with a lantern: from her door to the bell-tower square, by a new route each day
  const DOOR = vec(-12.5, STREET + 0.01, -3.2), SQ = vec(sqX - 0.3, STREET + 0.01, sqZ + 0.6);
  const gW = (x: number, side: number, y = STREET + 0.01) => vec(x, y, grand(x) + side * 1.75);
  const routes = [
    [DOOR, gW(-12, -1), ...quay(-1, -12, -1.5).slice(1), SQ],
    [DOOR, gW(-12, -1), gW(-11, -1), ...cross(-11, 1).reverse(), ...quay(1, -11, -1.5).slice(1), ...cross(-1.5, 1), SQ],
    [DOOR, gW(-12, -1), vec(-12, WATER + 0.1, grand(-12) - 0.4), ...quay(0, -12, -2, WATER + 0.12).map((p) => p.setZ(p.z - 0.3)), gW(-2, -1), SQ],
    [DOOR, gW(-12, -1), ...quay(-1, -12, -4.9).slice(1), vec(-4.9, 1.6, grand(-4.9) - 2.3), vec(-4.9, 1.6, grand(-4.9) + 2.3), gW(-4.9, 1), ...quay(1, -4.9, -1.5).slice(1), ...cross(-1.5, 1), SQ],
    [DOOR, gW(-12, -1), vec(-12, WATER + 0.1, grand(-12) - 0.4), vec(-9.5, WATER + 0.1, grand(-9.5) - 0.4), gW(-9.5, -1), vec(-9.5, 1.6, grand(-9.5) - 2.3), vec(-9.5, 1.6, grand(-9.5) + 2.3), ...quay(1, -9.5, -6.5).slice(1), ...cross(-6.5, 1), ...quay(-1, -6.5, -1.5).slice(1), SQ],
  ].map((r) => { const acc = [0]; for (let i = 1; i < r.length; i++) acc.push(acc[i - 1] + r[i].distanceTo(r[i - 1])); return { f: path(r), L: acc[acc.length - 1] }; });
  const lady = K.instanced(K.personGeometry(0.27), K.figureMaterial(), 1, (_i, _o, cc) => { cc.set('#f0e6d0'); });
  root.add(lady);
  const lantern = K.glowSprite('#ffd98a', 0.9, 1);
  root.add(lantern);
  const DAY = 25, route = (cyc: number) => routes[(((cyc * 3) % 5) + 5) % 5];
  const ladyAt = (t: number, out: V) => {
    const cyc = Math.floor(t / DAY), f = K.smoothstep(0.04, 0.9, (t - cyc * DAY) / DAY), r = route(cyc);
    return r.f(f * r.L * 0.9999, out);
  };

  // ---- trails: every tracked agent's recent past, drawn in its ink
  const INK = { walk: '#704214', boat: '#2a3fb0', roof: '#c0182e', under: '#2e1a40', swallow: '#e8c060', lady: '#ffcf5a' };
  const tmp = new THREE.Vector3();
  type Tr = { ink: string; fixed?: boolean; at: (t: number, out: V) => V };
  const tracked: Tr[] = [
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ ink: INK.walk, at: (t: number, o: V) => wInfo[i].p(wInfo[i].off + wInfo[i].sp * t, o).setY(o.y + 0.05) })),
    ...[0, 1, 2, 5, 7, 9].map((i) => ({ ink: INK.boat, at: (t: number, o: V) => boInfo[i].p(boInfo[i].off + boInfo[i].sp * t, o).setY(WATER + 0.06) })),
    ...[0, 2, 4, 5, 6, 7].map((i) => ({ ink: INK.roof, at: (t: number, o: V) => hop(chains[i % 8], t * 0.7 + i * 1.3, o) })),
    ...[0, 1, 2].map((i) => ({ ink: INK.under, at: (t: number, o: V) => ratPaths[i](t * 1.2 + i * 3, o).setY(FLOOR + 0.12) })),
    ...Array.from({ length: 10 }, (_, i) => ({ ink: INK.swallow, fixed: true, at: (t: number, o: V) => swallowAt(i * 3, t, o) })),
    { ink: INK.lady, at: (t: number, o: V) => ladyAt(t, o).setY(o.y + 0.12) },
  ];
  const MAXS = 140, NT = tracked.length;
  const tPos = new Float32Array(NT * MAXS * 2 * 3), tCol = new Float32Array(NT * MAXS * 2 * 4);
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  tg.setAttribute('color', new THREE.BufferAttribute(tCol, 4));
  const trailMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
  const trails = new THREE.LineSegments(tg, trailMat);
  trails.frustumCulled = false;
  trails.renderOrder = 5;
  root.add(trails);
  const paper = new THREE.Mesh(new THREE.CircleGeometry(CITY_R + 0.4, 96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#efe2c4', transparent: true, opacity: 0, depthWrite: false }));
  paper.position.y = 3.5; paper.renderOrder = 4;
  root.add(paper);

  const ink = new K.Toggle(0.4);
  const Pp = new THREE.Vector3(), Qq = new THREE.Vector3();
  const setW = K.instanceSetter(walkers), setBo = K.instanceSetter(boats), setRo = K.instanceSetter(roofers), setCa = K.instanceSetter(cats);
  const setRa = K.instanceSetter(rats), setSm = K.instanceSetter(smugglers), setKe = K.instanceSetter(kegs), setSw = K.instanceSetter(swallows), setLa = K.instanceSetter(lady);
  const face = (f: (t: number, o: V) => V, t: number) => { f(t, Pp); f(t + 0.05, Qq); return Math.atan2(Qq.x - Pp.x, Qq.z - Pp.z); };
  return {
    root,
    env: {
      skyTop: '#7db4c2', skyHorizon: '#f1d9a3', skyBottom: '#7aa89a', skyCurve: 0.55,
      fog: '#a9c7b6', fogNear: 70, fogFar: 220,
      sunDir: [-0.75, 0.38, 0.45], sunColor: '#ffd29a', sunIntensity: 2.7, sunDisc: 1, sunGlow: 1.0,
      hemiSky: '#bfe0e0', hemiGround: '#5a6a4a', hemiIntensity: 0.7, envIntensity: 0.85,
      stars: 0, clouds: 0.35, cloudColor: '#fff4dc',
      bloomStrength: 0.55, bloomThreshold: 0.85, bloomRadius: 0.5,
      tiltShift: 0.35, shadowRadius: 18, vignette: 0.32, saturation: 1.08,
    },
    camera: {
      position: [3, 20, 30],
      target: [1, 0.5, -0.5],
      minDistance: 6, maxDistance: 75, autoRotate: 0.12,
      views: [
        { position: [0, 6, 21], target: [0, -1.5, 9] },
        { position: [-9, 4.5, 4.5], target: [-3, 1.2, -1] },
      ],
    },
    interaction: {
      label: 'Ink the map',
      activeLabel: 'Let the inks fade',
      hint: 'Every route laid down in its own ink; only the swallows escape.',
      set: (on) => ink.set(on),
      camera: { position: [1, 34, 13], target: [1, 0, -1] },
    },
    update(t, dt) {
      ink.update(dt);
      const m = ink.value;
      for (let i = 0; i < NW; i++) { const w = wInfo[i], f = (tt: number, o: V) => w.p(w.off + w.sp * tt, o); f(t, tmp); setW(i, tmp.x, tmp.y, tmp.z, face(f, t)); }
      setW.done();
      for (let i = 0; i < NBo; i++) { const w = boInfo[i], f = (tt: number, o: V) => w.p(w.off + w.sp * tt, o); f(t, tmp); setBo(i, tmp.x, WATER + Math.sin(t * 2 + i) * 0.015, tmp.z, face(f, t)); }
      setBo.done();
      for (let i = 0; i < NR2 + 8; i++) {
        const ch = chains[i % 8], s = t * 0.7 + i * 1.3 + (i >= 8 && i < 16 && i % 2 ? 0.25 : 0);
        const f = (tt: number, o: V) => hop(ch, tt * 0.7 + (s - t * 0.7), o);
        f(t, tmp);
        if (i < NR2) setRo(i, tmp.x, tmp.y - 0.05, tmp.z, face(f, t)); else setCa(i - NR2, tmp.x, tmp.y - 0.05, tmp.z, face(f, t));
      }
      setRo.done(); setCa.done();
      for (let i = 0; i < 50; i++) {
        const ci = Math.floor(i / 10), f = (tt: number, o: V) => ratPaths[ci % 3](tt * 1.2 + ci * 3 - (i % 10) * 0.2 + (ci >= 3 ? 7 : 0), o);
        f(t, tmp); setRa(i, tmp.x, FLOOR + 0.06, tmp.z, face(f, t));
      }
      setRa.done();
      for (let i = 0; i < 6; i++) {
        const f = (tt: number, o: V) => ratPaths[i % 3](tt * 0.35 + i * 5, o);
        f(t, tmp); const ry = face(f, t);
        setSm(i, tmp.x, FLOOR + 0.06, tmp.z, ry);
        setKe(i, tmp.x + Math.sin(ry) * 0.2, FLOOR + 0.06, tmp.z + Math.cos(ry) * 0.2, 0, 1, Math.PI / 2 * 0 + t * 3, 0);
      }
      setSm.done(); setKe.done();
      for (let i = 0; i < NS; i++) {
        swallowAt(i, t, Pp); swallowAt(i, t + 0.05, Qq);
        const ry = Math.atan2(Qq.x - Pp.x, Qq.z - Pp.z), pitch = -Math.atan2(Qq.y - Pp.y, Math.hypot(Qq.x - Pp.x, Qq.z - Pp.z));
        setSw(i, Pp.x, Pp.y, Pp.z, ry, 1, pitch, 0.25 * Math.sign(sw[i].sp));
      }
      setSw.done();
      ladyAt(t, tmp); setLa(0, tmp.x, tmp.y, tmp.z, face(ladyAt, t)); setLa.done();
      lantern.position.set(tmp.x, tmp.y + 0.3, tmp.z);
      // trails
      const span = K.lerp(1.4, 40, m);
      for (let a = 0; a < NT; a++) {
        const tr = tracked[a], n = tr.fixed ? 14 : Math.round(K.lerp(14, MAXS, m)), stp = (tr.fixed ? 1.4 : span) / n;
        c.set(tr.ink);
        for (let k = 0; k < MAXS; k++) {
          const o = (a * MAXS + k) * 6, oc = (a * MAXS + k) * 8;
          if (k >= n) { tCol.fill(0, oc, oc + 8); continue; }
          tr.at(Math.max(0, t - k * stp), Pp); tr.at(Math.max(0, t - (k + 1) * stp), Qq);
          tPos.set([Pp.x, Pp.y + 0.03, Pp.z, Qq.x, Qq.y + 0.03, Qq.z], o);
          const al0 = (1 - k / n) * (tr.fixed ? 0.9 : K.lerp(1, 0.95, m)), al1 = (1 - (k + 1) / n) * (tr.fixed ? 0.9 : K.lerp(1, 0.95, m));
          const fadeA = tr.fixed || m < 0.5 ? al0 : 0.95, fadeB = tr.fixed || m < 0.5 ? al1 : 0.95;
          tCol.set([c.r, c.g, c.b, fadeA, c.r, c.g, c.b, fadeB], oc);
        }
      }
      tg.attributes.position.needsUpdate = tg.attributes.color.needsUpdate = true;
      trailMat.depthTest = m < 0.5;
      (paper.material as THREE.MeshBasicMaterial).opacity = 0.62 * m;
      paper.visible = m > 0.01;
    },
  };
};

export default build;
