// OCTAVIA - Thin Cities 4.
// The spider-web city: a net of hemp slung between two mountain crests over a
// chasm. The net is street and foundation; everything else hangs beneath it on
// ropes of different lengths: sack-shaped houses, gondola terraces, hammocks,
// ladders, laundry, water skins, gas flames, chandeliers, trailing plants,
// trapezes and rings. Clouds pass below; far down, a thread of river.
// Toggle: the view from the abyss, looking up at a city whose towers point down.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const CX = 17, EZ = 14, HUB_Y = -1.2;
const HEMP = '#cfae74', DARKHEMP = '#a98a5c', WOOD = '#76523a', GLOW = '#ffad52';

// height of the net and the anchor at the end of each direction
const edgeOf = (a: number) => {
  const c = Math.cos(a), s = Math.sin(a);
  const tx = Math.abs(c) > 1e-6 ? CX / Math.abs(c) : 1e9, tz = Math.abs(s) > 1e-6 ? EZ / Math.abs(s) : 1e9;
  const d = Math.min(tx, tz), x = c * d, z = s * d;
  const y = tx <= tz ? 1.8 + 0.6 * Math.sin(z * 0.7 + (c > 0 ? 1 : 3)) : 1.8 - 2.4 * (1 - (x / CX) ** 2);
  return { d, x, z, y, cliff: tx <= tz };
};
const netY = (u: number, yEnd: number) => yEnd * u + HUB_Y * (1 - u) - 0.35 * Math.sin(Math.PI * u);
const netAt = (x: number, z: number) => { const e = edgeOf(Math.atan2(z, x)); const u = Math.min(1, Math.hypot(x, z) / e.d); return netY(u, e.y); };

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const web = new THREE.Group();
  root.add(web);
  const b = new K.Batch();
  const wb = new K.Batch();

  // ---------------------------------------------------------------- the two mountains
  for (const side of [-1, 1]) {
    const prof = (z: number): [number, number][] => {
      const n = K.fbm2(z * 0.08 + side * 5, 0.3, 3), crest = 9 + 3 * n + 2 * Math.sin(z * 0.11 + side);
      const face = CX + 0.4;
      return [[face + 3, -95], [face + 1.2, -60], [face + 0.3, -30], [face, -12], [face - 0.2, -4], [face, 0], [face + 0.2, 3], [face + 0.6, crest - 2],
        [face + 2, crest], [face + 6, crest + 1.5 + 2 * n], [face + 14, crest + 6 + 4 * n], [face + 30, crest + 3]];
    };
    const NZ = 90, nz0 = -60, nz1 = 60;
    const rows = prof(0).length;
    const g = new THREE.PlaneGeometry(1, 1, NZ, rows * 3 - 1);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const z = nz0 + uv.getX(i) * (nz1 - nz0), pr = prof(z), k = uv.getY(i) * (rows - 1), k0 = Math.min(rows - 2, Math.floor(k)), f = k - k0;
      let x = K.lerp(pr[k0][0], pr[k0 + 1][0], f), y = K.lerp(pr[k0][1], pr[k0 + 1][1], f);
      const n = K.noise3(z * 0.25, y * 0.25, side * 7);
      x += n * 1.4 + K.noise2(z * 0.9, y * 0.9) * 0.35;
      y += K.noise2(z * 0.4 + 9, x * 0.4) * 0.6 * f;
      p.setXYZ(i, side * x, y, side > 0 ? z : -z);
    }
    const geo = g.toNonIndexed();
    geo.computeVertexNormals();
    const base = K.col('#353b4c'), glow = K.col('#e8a083'), deep = K.col('#232838');
    K.paintBy(geo, (x, y, z, out) => {
      const strata = 0.5 + 0.5 * Math.sin(y * 1.7 + K.noise2(z * 0.2, y * 0.1) * 2);
      out.copy(base).multiplyScalar(0.85 + 0.25 * strata).lerp(deep, K.clamp(-y / 40));
      out.lerp(glow, K.smoothstep(4, 12, y) * (x > 0 ? 0.9 : 0.35));
    });
    b.add(geo, null, 'stone');
  }

  // ---------------------------------------------------------------- the net: radials, spiral, edge cables, ties
  const NR = 36;
  const radials = Array.from({ length: NR }, (_, j) => ({ a: (j / NR) * Math.PI * 2 + 0.04, ...edgeOf((j / NR) * Math.PI * 2 + 0.04) }));
  const point = (j: number, u: number) => { const r = radials[((j % NR) + NR) % NR]; return new THREE.Vector3(r.x * u, netY(u, r.y), r.z * u); };
  for (let j = 0; j < NR; j++) {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 16; k++) pts.push(point(j, k / 16));
    wb.add(K.tube(pts, 0.045, 32, 5), HEMP, 'cloth');
    const r = radials[j];
    if (r.cliff) {
      b.add(K.at(K.torus(0.18, 0.05, 6, 12), r.x + Math.sign(r.x) * 0.15, r.y, r.z, { ry: Math.PI / 2 }), '#4a4a50', 'metal');
      b.add(K.strut([r.x, r.y, r.z], [r.x + Math.sign(r.x) * 0.6, r.y - 0.2, r.z], 0.06, 4), '#3a3a40', 'metal');
    }
  }
  for (const s of [-1, 1]) {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 24; k++) { const x = -CX + (k / 24) * 2 * CX; pts.push(new THREE.Vector3(x, 1.8 - 2.4 * (1 - (x / CX) ** 2), s * EZ)); }
    wb.add(K.tube(pts, 0.08, 48, 6), DARKHEMP, 'cloth');
  }
  const spiral: THREE.Vector3[] = [];
  for (let u = 0.035, j = 0; u < 0.99; j++) {
    const u2 = u + 0.022 / NR;
    spiral.push(point(j, u), point(j + 1, u2));
    u = u2;
  }
  const spiralLines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(spiral), new THREE.LineBasicMaterial({ color: '#c8ab78', transparent: true, opacity: 0.85 }));
  web.add(spiralLines);
  // walkways of little wooden ties along 8 main radials and around 3 rings
  const ties: { p: THREE.Vector3; ry: number; w: number }[] = [];
  const mains = [0, 4, 9, 14, 18, 22, 27, 32];
  for (const j of mains) {
    const r = radials[j];
    for (let d = 0.6; d < r.d - 0.2; d += 0.32) ties.push({ p: point(j, d / r.d), ry: -r.a, w: 0.34 });
  }
  for (const u of [0.12, 0.3, 0.5]) for (let j = 0; j < NR; j++) {
    const a = point(j, u), c = point(j + 1, u), n = Math.max(1, Math.round(a.distanceTo(c) / 0.32));
    for (let k = 0; k < n; k++) ties.push({ p: a.clone().lerp(c, (k + 0.5) / n), ry: -Math.atan2(c.z - a.z, c.x - a.x) + Math.PI / 2, w: 0.3 });
  }
  web.add(K.instanced(K.paint(K.boxC(1, 0.03, 0.07), '#ffffff'), K.finish('wood'), ties.length, (i, o, c) => {
    o.position.copy(ties[i].p).add(new THREE.Vector3(0, 0.05, 0)); o.rotation.y = ties[i].ry + Math.PI / 2; o.scale.set(ties[i].w, 1, 1); c.copy(K.jitter('#9a7048', rng));
  }, { castShadow: false }));
  wb.add(K.at(K.ring(0.25, 0.9, 24), 0, HUB_Y + 0.06, 0), '#8a6440', 'wood');
  // timber catwalks from cliff ledges onto the net
  for (const j of [0, 3, 33, 18, 15, 21]) {
    const r = radials[j];
    if (!r.cliff) continue;
    const a = new THREE.Vector3(r.x + Math.sign(r.x) * 1.2, r.y + 0.1, r.z), c = point(j, 0.85);
    const len = a.distanceTo(c), mid = a.clone().lerp(c, 0.5);
    b.add(K.at(K.boxC(len, 0.06, 0.5), 0, 0, 0, { rz: Math.atan2(c.y - a.y, Math.hypot(c.x - a.x, c.z - a.z)) * -Math.sign(r.x) }).rotateY(-Math.atan2(c.z - a.z, c.x - a.x)).translate(mid.x, mid.y, mid.z), '#6d4a30', 'wood');
    b.add(K.at(K.box(1.6, 0.3, 1.4), r.x + Math.sign(r.x) * 1.4, r.y - 0.25, r.z), '#3c4152', 'stone');
  }
  web.add(wb.build({ name: 'net' }));

  // ---------------------------------------------------------------- the hanging city
  type Hang = { x: number; z: number; y: number; L: number; s: number; ry: number; ph: number; c: THREE.Color };
  const P = (g: THREE.BufferGeometry, c: string) => K.paint(g, c);
  const figure = (x: number, y: number, z: number, c: string) => P(K.at(K.personGeometry(0.25), x, y, z), c);
  const sack = K.merge([P(K.lathe([[0.04, 0], [0.09, -0.08], [0.3, -0.3], [0.42, -0.62], [0.36, -0.92], [0.16, -1.06], [0.001, -1.1]], 16), '#ffffff'), P(K.at(K.torus(0.08, 0.025, 4, 12), 0, -0.07, 0, { rx: Math.PI / 2 }), '#8a6440')]);
  const sackWin = K.merge([0, 2.1, 4.2].map((a) => K.at(K.disc(0.07, 10), 0, 0, 0, { rx: 0 }).translate(0, 0, 0.425).rotateY(a).translate(0, -0.6, 0)));
  const gondola = K.merge([
    P(K.at(K.box(1.6, 0.14, 0.62), 0, -1.35, 0), WOOD), P(K.at(K.box(1.7, 0.18, 0.05), 0, -1.25, 0.3), '#8a6440'), P(K.at(K.box(1.7, 0.18, 0.05), 0, -1.25, -0.3), '#8a6440'),
    ...[[-0.75, -0.28], [0.75, -0.28], [0.75, 0.28], [-0.75, 0.28]].map(([x, z]) => P(K.strut([0, 0, 0], [x, -1.25, z], 0.012, 3), HEMP)),
    P(K.at(K.cyl(0.08, 0.06, 0.12, 8), -0.55, -1.21, 0), '#a8583a'), P(K.at(K.sphere(0.13, 8, 6), -0.55, -1.0, 0), '#5b8a4f'),
    figure(0.1, -1.21, 0.05, '#c9a35a'), figure(0.4, -1.21, -0.1, '#3f5a6e'),
  ]);
  const hammock = K.merge([P(K.at(K.rope([-0.55, -0.6, 0], [0.55, -0.6, 0], 0.3, 0.09, 12, 6), 0, 0, 0, { s: [1, 0.5, 2] }), '#b8473a'), P(K.strut([0, 0, 0], [-0.55, -0.6, 0], 0.01, 3), HEMP), P(K.strut([0, 0, 0], [0.55, -0.6, 0], 0.01, 3), HEMP)]);
  const ladderParts: THREE.BufferGeometry[] = [];
  for (const x of [-0.15, 0.15]) ladderParts.push(P(K.at(K.cyl(0.015, 0.015, 4, 4), x, -4, 0), HEMP));
  for (let y = -0.2; y > -4; y -= 0.3) ladderParts.push(P(K.at(K.boxC(0.3, 0.025, 0.04), 0, y, 0), WOOD));
  const ladder = K.merge(ladderParts);
  const laundry = K.merge([P(K.at(K.boxC(0.9, 0.02, 0.02), 0, -0.05, 0), WOOD), ...[-0.3, 0, 0.3].map((x, i) => P(K.at(K.boxC(0.22, 0.32, 0.01), x, -0.24, 0), ['#e8e0d0', '#5b7fa6', '#b8473a'][i]))]);
  const skin = P(K.at(K.sphere(0.22, 10, 8), 0, -0.25, 0, { s: [0.8, 1.2, 0.8] }), '#76523a');
  const gasJet = K.merge([P(K.at(K.cyl(0.02, 0.02, 0.4, 5), 0, -0.4, 0), '#5a5a5e'), P(K.at(K.cyl(0.06, 0.04, 0.06, 8), 0, -0.44, 0), '#3a3a3e')]);
  const gasFlame = K.at(K.cone(0.06, 0.2, 8), 0, -0.58, 0, { rx: Math.PI });
  const basket = K.merge([P(K.at(K.cyl(0.2, 0.15, 0.25, 10), 0, -0.4, 0), '#b08a52'), ...[0, 2.1, 4.2].map((a) => P(K.strut([0, 0, 0], [Math.cos(a) * 0.19, -0.15, Math.sin(a) * 0.19], 0.008, 3), HEMP))]);
  const chandelier = K.merge([P(K.at(K.torus(0.3, 0.025, 5, 20), 0, -0.4, 0, { rx: Math.PI / 2 }), '#c9a24c'), P(K.at(K.cyl(0.02, 0.02, 0.4, 5), 0, -0.4, 0), '#c9a24c'), P(K.at(K.sphere(0.07, 8, 6), 0, -0.45, 0), '#c9a24c')]);
  const crystals = K.merge(Array.from({ length: 10 }, (_, i) => K.at(K.sphere(0.035, 6, 4), Math.cos(i * 0.628) * 0.3, -0.33, Math.sin(i * 0.628) * 0.3)).concat([K.at(K.cone(0.08, 0.18, 6), 0, -0.66, 0, { rx: Math.PI })]));
  const potParts = [P(K.at(K.cyl(0.13, 0.09, 0.18, 10), 0, -0.25, 0), '#a8583a'), P(K.at(K.sphere(0.15, 8, 6), 0, -0.05, 0, { s: [1, 0.6, 1] }), '#5b8a4f')];
  for (let k = 0; k < 5; k++) { const a = k * 1.25, l = 0.6 + (k % 3) * 0.35; potParts.push(P(K.tube([[Math.cos(a) * 0.12, -0.1, Math.sin(a) * 0.12], [Math.cos(a) * 0.2, -0.3 - l * 0.4, Math.sin(a) * 0.2], [Math.cos(a) * 0.16, -0.25 - l, Math.sin(a) * 0.16]], 0.018, 8, 3), '#4f7d45')); }
  const pot = K.merge(potParts);
  const trapeze = K.merge([P(K.at(K.cyl(0.015, 0.015, 0.45, 5), 0, -0.02, 0, { rz: Math.PI / 2 }).translate(0.22, 0, 0), WOOD), P(K.strut([-0.22, 0, 0], [-0.1, 0.9, 0], 0.008, 3), HEMP), P(K.strut([0.22, 0, 0], [0.1, 0.9, 0], 0.008, 3), HEMP), figure(0, -0.22, 0, '#d6344a')]).translate(0, -0.9, 0);
  const rings = K.merge([P(K.at(K.torus(0.09, 0.015, 5, 14), -0.18, -1.0, 0), '#c9a24c'), P(K.at(K.torus(0.09, 0.015, 5, 14), 0.18, -1.0, 0), '#c9a24c'), P(K.strut([-0.18, -0.9, 0], [0, 0, 0], 0.007, 3), HEMP), P(K.strut([0.18, -0.9, 0], [0, 0, 0], 0.007, 3), HEMP), figure(0.0, -1.38, 0, '#5b7fa6')]);
  const shower = K.merge([P(K.at(K.cyl(0.015, 0.015, 0.5, 5), 0, -0.5, 0), '#8a8a8e'), P(K.at(K.cone(0.1, 0.07, 10), 0, -0.56, 0), '#b8b8bc')]);
  const spit = K.merge([P(K.at(K.cyl(0.012, 0.012, 0.9, 4), 0, 0, 0, { rz: Math.PI / 2 }).translate(0, -0.5, 0), '#5a5a5e'), P(K.at(K.sphere(0.13, 8, 6), 0, -0.5, 0, { s: [1.6, 0.8, 0.8] }), '#8a4a2a'), P(K.strut([-0.45, -0.5, 0], [0, 0, 0], 0.008, 3), '#5a5a5e'), P(K.strut([0.45, -0.5, 0], [0, 0, 0], 0.008, 3), '#5a5a5e')]);
  const embers = K.at(K.box(0.4, 0.06, 0.18), 0, -0.72, 0);
  const dumb = P(K.at(K.box(0.3, 0.3, 0.3), 0, -0.3, 0), '#8a6440');

  type Kind = { geo: THREE.BufferGeometry; n: number; L: [number, number]; s: [number, number]; fin: K.Finish; glow?: THREE.BufferGeometry; glowCol?: string; tint?: string[]; rope?: boolean; swing?: number };
  const kinds: Kind[] = [
    { geo: sack, n: 70, L: [0.5, 5.5], s: [0.5, 1.05], fin: 'cloth', glow: sackWin, glowCol: '#ffbf6a', tint: ['#d8c39a', '#c9a878', '#e3d4b0', '#b89366', '#cfae74'], rope: true },
    { geo: gondola, n: 10, L: [0.3, 2.5], s: [1, 1.2], fin: 'wood', rope: false },
    { geo: hammock, n: 30, L: [0.2, 2], s: [0.9, 1.1], fin: 'cloth', rope: true },
    { geo: ladder, n: 25, L: [0.02, 0.05], s: [0.5, 2], fin: 'wood', rope: false },
    { geo: laundry, n: 20, L: [0.4, 3], s: [0.9, 1.1], fin: 'cloth', rope: true },
    { geo: skin, n: 30, L: [0.3, 3], s: [0.8, 1.3], fin: 'cloth', rope: true },
    { geo: gasJet, n: 40, L: [0.3, 5], s: [1, 1], fin: 'metal', glow: gasFlame, glowCol: '#ffad52', rope: true },
    { geo: basket, n: 40, L: [0.5, 6], s: [0.8, 1.2], fin: 'wood', rope: true },
    { geo: chandelier, n: 12, L: [0.6, 4], s: [1, 1.6], fin: 'gold', glow: crystals, glowCol: '#fff0d0', rope: true },
    { geo: pot, n: 40, L: [0.3, 4], s: [0.9, 1.3], fin: 'ceramic', rope: true },
    { geo: trapeze, n: 10, L: [0.05, 0.1], s: [1, 1], fin: 'wood', rope: false, swing: 0.5 },
    { geo: rings, n: 8, L: [0.05, 0.1], s: [1, 1.2], fin: 'gold', rope: false, swing: 0.35 },
    { geo: shower, n: 12, L: [0.3, 2], s: [1, 1], fin: 'metal', rope: true },
    { geo: spit, n: 8, L: [0.4, 2.5], s: [1, 1], fin: 'metal', glow: embers, glowCol: '#ff7a2a', rope: true },
    { geo: dumb, n: 6, L: [2, 5], s: [1, 1], fin: 'wood', rope: true },
  ];
  const hangs: { k: Kind; list: Hang[]; mesh: THREE.InstancedMesh; glow?: THREE.InstancedMesh }[] = [];
  const allRopes: Hang[] = [];
  for (const k of kinds) {
    const list: Hang[] = [];
    for (let i = 0; i < k.n; i++) {
      const a = rng.angle(), r = Math.pow(rng.next(), 0.75) * 13.5;
      const x = Math.max(-15.5, Math.min(15.5, Math.cos(a) * r * 1.15)), z = Math.max(-12.5, Math.min(12.5, Math.sin(a) * r));
      const near = 1 - Math.hypot(x, z) / 16;
      const L = K.lerp(k.L[0], k.L[1], rng.next() * (0.4 + 0.6 * near));
      const h: Hang = { x, z, y: netAt(x, z), L, s: rng.float(k.s[0], k.s[1]), ry: rng.angle(), ph: rng.angle(), c: k.tint ? K.pickJitter(k.tint, rng) : new THREE.Color('#ffffff') };
      list.push(h);
      if (k.rope) allRopes.push(h);
    }
    const mesh = K.instanced(k.geo, K.finish(k.fin), list.length, (i, _o, c) => { c.copy(list[i].c); });
    web.add(mesh);
    let glow: THREE.InstancedMesh | undefined;
    if (k.glow) {
      glow = K.instanced(k.glow, new THREE.MeshBasicMaterial({ color: new THREE.Color(k.glowCol).multiplyScalar(2.6) }), list.length, undefined, { castShadow: false, receiveShadow: false, colors: false });
      web.add(glow);
    }
    hangs.push({ k, list, mesh, glow });
  }
  const ropeMesh = K.instanced(K.paint(K.at(K.cyl(1, 1, 1, 4, true), 0, -1, 0), '#ffffff'), K.finish('cloth'), allRopes.length, (_i, _o, c) => { c.set(DARKHEMP); }, { castShadow: false });
  web.add(ropeMesh);
  const flameGlows = K.glowPoints(hangs[6].list.map((h) => [h.x, h.y - h.L - 0.6, h.z] as [number, number, number]), GLOW, 0.9, 0.55);
  web.add(flameGlows);

  // walkers on the ties
  const paths = mains.map((j) => { return Array.from({ length: 12 }, (_, k) => point(j, 0.04 + (k / 11) * 0.9).add(new THREE.Vector3(0, 0.07, 0))); });
  const walkers = new K.Walkers({ paths, count: 60, rng: rng.fork('walk'), speed: [0.12, 0.22], colors: ['#c9a35a', '#3f5a6e', '#8a4a2a', '#e8e0d0', '#5b8a4f', '#6d3d5e'] });
  web.add(walkers.mesh);

  // cable cars crossing the chasm under the net
  const cables: THREE.Vector3[][] = [];
  for (const [z, y] of [[-7, -4.5], [2.5, -5.8], [9.5, -4.2]] as const) {
    const pts = K.ropePoints([-CX - 0.6, y, z], [CX + 0.6, y, z], 1.4, 40);
    cables.push(pts);
    b.add(K.tube(pts, 0.03, 60, 4), '#2d2d33', 'metal');
    for (const s of [-1, 1]) b.add(K.at(K.box(1.2, 0.8, 1.2), s * (CX + 1.0), y - 0.6, z), '#4a4e5c', 'stone');
  }
  const cabinGeo = K.merge([P(K.at(K.box(0.9, 0.6, 0.55), 0, -0.95, 0), '#b8473a'), P(K.at(K.box(0.95, 0.06, 0.6), 0, -0.36, 0), '#3a3a3e'), P(K.at(K.cyl(0.02, 0.02, 0.35, 4), 0, -0.35, 0), '#3a3a3e'), P(K.at(K.box(0.92, 0.18, 0.57), 0, -0.68, 0), '#ffd28a')]);
  const cabins = K.instanced(cabinGeo, K.finish('metal'), 6, undefined, { colors: false });
  root.add(cabins);
  const setCab = K.instanceSetter(cabins);

  // clouds below, the river far down, birds
  root.add(K.cloudSea({ y: -15, radius: 90, color: '#f2c9c0', shadow: '#6f7a9c', opacity: 0.8, coverage: 0.42, scale: 0.05, speed: 0.6 }));
  root.add(K.cloudSea({ y: -22, radius: 90, color: '#e2b7b8', shadow: '#5d6788', opacity: 0.7, coverage: 0.55, scale: 0.035, speed: 0.4 }));
  root.add(K.waterRect(2.2, 160, 0, -80, 0, 0.05, { color: '#9fb6d0', amp: 0.4 }));
  const flock = new K.Flock({ count: 9, center: [0, 5, -6], radius: 14, color: '#2a2a33', rng: rng.fork('birds') });
  root.add(flock.mesh);
  root.add(b.build({ name: 'octavia' }));

  const tog = new K.Toggle(0.35);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pv = new THREE.Vector3(), sv = new THREE.Vector3(), off = new THREE.Vector3();
  return {
    root,
    env: {
      skyTop: '#3f6fa6', skyHorizon: '#f0c3a4', skyBottom: '#8c9cb8', skyCurve: 0.55,
      fog: '#8c9cb8', fogNear: 55, fogFar: 190,
      sunDir: [-0.92, 0.17, 0.25], sunColor: '#ffb48a', sunIntensity: 2.2, sunDisc: 0, sunGlow: 1.0,
      hemiSky: '#8fb0dc', hemiGround: '#4a4e64', hemiIntensity: 1.0, envIntensity: 0.85,
      stars: 0.15, clouds: 0.2, cloudColor: '#f6c6b0', bloomStrength: 0.75, bloomThreshold: 0.8, bloomRadius: 0.5,
      tiltShift: 0.3, shadowRadius: 30, vignette: 0.35, saturation: 1.08,
    },
    camera: {
      position: [3, 9, 44], target: [0, -4, 0], fov: 40, minDistance: 8, maxDistance: 80, maxPolar: 3.05, autoRotate: 0.15,
      views: [
        { position: [-6, 2, -36], target: [0, -5, 0] },
        { position: [5, -3, 11], target: [-1, -4.5, -2] },
      ],
    },
    interaction: {
      label: 'View from the abyss', activeLabel: 'Climb back to the crest',
      hint: 'From far below, every tower of Octavia points down.',
      set: (on) => tog.set(on),
      camera: { position: [1.5, -32, 7], target: [0, -1, 0] },
    },
    update(t, dt) {
      tog.update(dt);
      // the web breathes with a slow wind wave
      const breath = 0.28 * Math.sin((t * Math.PI * 2) / 14);
      web.position.y = breath;
      const wind = (x: number) => 0.05 * Math.sin((t * Math.PI * 2) / 14 - x * 0.12);
      let ri = 0;
      const setR = K.instanceSetter(ropeMesh);
      for (const h of hangs) {
        const set = K.instanceSetter(h.mesh), gset = h.glow ? K.instanceSetter(h.glow) : null;
        const isDumb = h.k === kinds[14];
        h.list.forEach((o, i) => {
          const L = isDumb ? o.L * (0.55 + 0.45 * Math.sin(t * 0.3 + o.ph)) : o.L;
          const w = Math.sqrt(9.8 / Math.max(0.4, L + 0.6)) * 0.45;
          const amp = h.k.swing ?? 0.07;
          const ax = amp * Math.sin(t * w + o.ph) + wind(o.x), az = amp * 0.7 * Math.sin(t * w * 0.83 + o.ph * 1.7) + wind(o.z) * 0.6;
          e.set(ax, 0, az);
          off.set(0, -L, 0).applyEuler(e);
          pv.set(o.x, o.y, o.z).add(off);
          e.set(ax, o.ry + (h.k === kinds[11] ? Math.sin(t * 0.7 + o.ph) * 0.5 : 0), az);
          q.setFromEuler(e);
          m4.compose(pv, q, sv.setScalar(o.s));
          if (h.k === kinds[3]) m4.compose(pv, q, sv.set(1, o.s, 1));
          h.mesh.setMatrixAt(i, m4);
          if (h.glow) h.glow.setMatrixAt(i, m4);
          if (h.k.rope) {
            e.set(ax, 0, az); q.setFromEuler(e);
            m4.compose(pv.set(o.x, o.y, o.z), q, sv.set(0.012, L, 0.012));
            ropeMesh.setMatrixAt(ri++, m4);
          }
        });
        set.done();
        gset?.done();
      }
      setR.done();
      walkers.update(t);
      // cable cars glide crest to crest (about 40 s per crossing)
      for (let i = 0; i < 6; i++) {
        const c = cables[i % 3], f = K.pingpong(t / 40 + i * 0.37 + (i >= 3 ? 0.5 : 0), 1), idx = f * (c.length - 1), k0 = Math.min(c.length - 2, Math.floor(idx));
        pv.copy(c[k0]).lerp(c[k0 + 1], idx - k0);
        setCab(i, pv.x, pv.y, pv.z + (i >= 3 ? 0.0 : 0), 0, 1, Math.sin(t * 0.8 + i) * 0.05, 0);
      }
      setCab.done();
      flock.update(t);
      (flameGlows.material as THREE.PointsMaterial).opacity = 0.45 + 0.1 * Math.sin(t * 7.3) + 0.15 * tog.value;
    },
  };
};

export default build;
