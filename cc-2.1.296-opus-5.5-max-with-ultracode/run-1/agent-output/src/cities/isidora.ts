// ISIDORA - Cities & Memory 2.
// A man rides a long time through wild country and longs for a city: Isidora,
// where stairs wind like the seashells crusted on them, where telescopes and
// violins are made to perfection, where cockfights end in brawls among the
// bettors and a stranger torn between two women meets a third. It is the city
// of his dreams, with one difference: he arrives old, and takes his seat on the
// wall where the old men watch the young go by. Toggle: the city as he dreamed it,
// identical stone for stone, with the traveller young again among the strollers.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

type P2 = [number, number];

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const Y0 = 0.6; // city plateau height

  // ---- ground: floating island with a wild ring, raised city plateau
  const isl = K.island({ radius: 23, flat: 16.2, depth: 9, top: '#c2a27c', edge: '#b08d66', cliff: '#9b7b5c', under: '#4e3e36', strata: '#b9946a', hills: 1.2, rough: 0.1, seed: 12 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -7.5, color: '#f3d2b8', shadow: '#b48f94', opacity: 0.7, coverage: 0.5 }));
  const b = new K.Batch();
  b.add(K.paintBy(K.cyl(16, 16.1, Y0, 96), (_x, y, _z, o) => o.set('#cdb69a').multiplyScalar(0.8 + 0.25 * (y / Y0))), null, 'stone');

  // ---- the spiral main street (logarithmic, 1.75 turns, gate on the west)
  const TURNS = 1.75 * Math.PI * 2;
  const kSp = Math.log(15 / 3.5) / TURNS;
  const spiral = (th: number): P2 => {
    const r = 15 * Math.exp(-kSp * th);
    return [Math.cos(Math.PI + th) * r, Math.sin(Math.PI + th) * r];
  };
  const thAtR = (r: number) => Math.log(15 / r) / kSp;
  const spiralPts: P2[] = [];
  for (let i = 0; i <= 320; i++) spiralPts.push(spiral((i / 320) * TURNS));
  const PAVE = '#8f6a5a';
  const segBox = (a: P2, c: P2, w: number, y: number, color: string, h = 0.03) => {
    const dx = c[0] - a[0], dz = c[1] - a[1];
    const len = Math.hypot(dx, dz);
    b.add(K.at(K.box(w, h, len + 0.06), (a[0] + c[0]) / 2, y, (a[1] + c[1]) / 2, { ry: Math.atan2(dx, dz) }), color, 'stone');
  };
  for (let i = 1; i < spiralPts.length; i++) segBox(spiralPts[i - 1], spiralPts[i], 0.95, Y0, i % 2 ? PAVE : '#9a7462');
  // six radial lanes
  const lanes = [0.5, 1.55, 2.6, 3.65, 4.7, 5.75];
  for (const a of lanes) segBox([Math.cos(a) * 3.6, Math.sin(a) * 3.6], [Math.cos(a) * 15.2, Math.sin(a) * 15.2], 0.5, Y0, '#b8a089');

  const distSpiral = (x: number, z: number) => {
    let m = 1e9;
    for (const p of spiralPts) m = Math.min(m, Math.hypot(p[0] - x, p[1] - z));
    return m;
  };
  const distLane = (x: number, z: number) => {
    let m = 1e9;
    const r = Math.hypot(x, z);
    for (const a of lanes) {
      const along = x * Math.cos(a) + z * Math.sin(a);
      if (along > 0) m = Math.min(m, Math.abs(-x * Math.sin(a) + z * Math.cos(a)));
    }
    return r < 3.6 ? 0 : m;
  };

  // reserved plazas
  const COCK: P2 = [7.1, 0.8];
  const thF = thAtR(7);
  const fp = spiral(thF);
  const FOUNT: P2 = [fp[0] * 8.5 / 7, fp[1] * 8.5 / 7];
  const thA = thAtR(9);
  const ap = spiral(thA), ap2 = spiral(thA + 0.02);
  const tan: P2 = [(ap2[0] - ap[0]) / Math.hypot(ap2[0] - ap[0], ap2[1] - ap[1]), (ap2[1] - ap[1]) / Math.hypot(ap2[0] - ap[0], ap2[1] - ap[1])];
  const out = [ap[0] / 9, ap[1] / 9];
  const ARC: P2 = [ap[0] + out[0] * 1.1, ap[1] + out[1] * 1.1];
  const reserved: [number, number, number][] = [[COCK[0], COCK[1], 2.2], [FOUNT[0], FOUNT[1], 1.8], [ARC[0], ARC[1], 3.2], [-16, 0, 1.5]];
  const occupied: [number, number, number][] = [];
  const free = (x: number, z: number, rad: number, street = 0.6) => {
    const r = Math.hypot(x, z);
    if (r < 4.2 || r + rad > 15.3) return false;
    if (distSpiral(x, z) < rad + street || distLane(x, z) < rad + 0.25) return false;
    for (const q of reserved) if (Math.hypot(q[0] - x, q[1] - z) < q[2] + rad) return false;
    for (const q of occupied) if (Math.hypot(q[0] - x, q[1] - z) < q[2] + rad + 0.12) return false;
    return true;
  };

  // shells along every helical railing (instanced, iridescent nacre)
  const shellPts: { p: THREE.Vector3; a: number }[] = [];
  const helix = (cx: number, cz: number, y0: number, r: number, h: number, turns: number, a0: number, n: number) => {
    b.add(K.at(K.spiralStair(r, h, Math.max(8, Math.round(turns * 14)), turns, r * 0.6, false), cx, y0, cz, { ry: a0 }), '#efe3d6', 'plaster');
    const rail: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const a = -a0 - f * turns * Math.PI * 2; // matches spiralStair winding (ry: -a)
      const p = new THREE.Vector3(cx + Math.cos(a) * r, y0 + f * h + 0.12, cz + Math.sin(a) * r);
      rail.push(p);
      shellPts.push({ p, a: f * 40 + cx });
    }
    b.add(K.tube(rail, 0.018, n * 2, 4), '#d9c7b6', 'plaster');
  };

  // ---- seven shell towers with double-helix stairs and conch finials
  let nT = 0, tries = 0;
  while (nT < 7 && tries++ < 3000) {
    const [x, z] = rng.inRing(6, 11);
    if (!free(x, z, 1.3, 0.5) || (z > -1 && x < 6)) continue;
    occupied.push([x, z, 1.3]);
    nT++;
    const h = rng.float(4, 7);
    b.add(K.at(K.ngon(0.55, h, 10, 0.45), x, Y0, z), '#f3ebe2', 'plaster');
    for (let y = 1.2; y < h; y += 1.2) b.add(K.at(K.ngon(0.6, 0.08, 10), x, Y0 + y, z), '#d8b7a6', 'plaster');
    for (const off of [0, Math.PI]) helix(x, z, Y0, 0.85, h, h / 3.2, off, 48);
    // conch finial: lathe body + spiral ridge
    const prof: [number, number][] = [[0.62, 0], [0.7, 0.25], [0.55, 0.7], [0.35, 1.2], [0.15, 1.65], [0.01, 1.9]];
    b.add(K.at(K.lathe(prof, 24), x, Y0 + h, z, { s: 0.75 }), '#f4d9cf', 'ceramic');
    const ridge: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const f = i / 60, a = f * Math.PI * 8;
      const rr = 0.51 * (1 - f) + 0.03;
      ridge.push(new THREE.Vector3(x + Math.cos(a) * rr, Y0 + h + 0.08 + f * 1.3, z + Math.sin(a) * rr));
    }
    b.add(K.tube(ridge, 0.045, 120, 5), '#e2b6a6', 'ceramic');
    b.add(K.at(K.sphere(0.07, 8, 6), x, Y0 + h + 1.45, z), '#ffe2b0', 'glow', 2.2);
  }

  // ---- houses: nacre walls, dusty-rose roofs, each with a helical stair
  const WALLS = ['#f2e8de', '#efe1d3', '#f6eee6', '#ead8cc', '#f0e4dc'];
  const ROOFS = ['#b9776d', '#c48a7e', '#a9675e', '#cf9a8a'];
  const terraces: { x: number; z: number; h: number }[] = [];
  tries = 0;
  while (occupied.length < 99 && tries++ < 6000) {
    const [x, z] = rng.inRing(4.4, 15);
    const w = rng.float(0.8, 1.35), d = rng.float(0.8, 1.25);
    const rad = Math.hypot(w, d) / 2 + 0.25;
    if (!free(x, z, rad)) continue;
    occupied.push([x, z, rad]);
    const h = rng.float(0.8, 1.8);
    const ry = -Math.atan2(z, x) + Math.PI / 2 + rng.float(-0.15, 0.15);
    const flat = terraces.length < 3 && Math.hypot(x, z) > 7 && Math.hypot(x, z) < 12 && z > -4 && rng.chance(0.4);
    if (flat) terraces.push({ x, z, h });
    K.house(b, { x, y: Y0, z, ry, w, d, h, roof: flat ? 'flat' : rng.pick(['hip', 'hip', 'gable', 'dome'] as const), wall: rng.pick(WALLS), roofColor: rng.pick(ROOFS), cornice: true, lit: 0.05, glow: 1.4, rng });
    // stair at a corner, rotated with the house
    const sx = rng.sign() * (w / 2 + 0.05), sz = rng.sign() * (d / 2 + 0.05);
    const cx = x + Math.cos(ry) * sx + Math.sin(ry) * sz, cz = z - Math.sin(ry) * sx + Math.cos(ry) * sz;
    helix(cx, cz, Y0, rng.float(0.25, 0.4), h + 0.15, rng.float(1, 1.8), rng.angle(), 22);
  }

  // ---- central square: spiral mosaic, the old men's wall on its north edge
  const mosaic = K.canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#e8d9c4'; g.fillRect(0, 0, w, h);
    for (let arm = 0; arm < 2; arm++) {
      for (let i = 0; i < 700; i++) {
        const th = i * 0.03;
        const r = 6 + th * 9.5;
        if (r > 250) break;
        const a = th + arm * Math.PI;
        g.fillStyle = (i >> 3) % 2 ? (arm ? '#a24f2a' : '#3f6f8f') : '#c9a34c';
        g.fillRect(256 + Math.cos(a) * r - 4, 256 + Math.sin(a) * r - 4, 8, 8);
      }
    }
    g.strokeStyle = '#a24f2a'; g.lineWidth = 10; g.beginPath(); g.arc(256, 256, 250, 0, Math.PI * 2); g.stroke();
  });
  const sq = new THREE.Mesh(K.at(new THREE.CircleGeometry(3.55, 64).rotateX(-Math.PI / 2), 0, Y0 + 0.02, 0), new THREE.MeshStandardMaterial({ map: mosaic, roughness: 0.8 }));
  sq.receiveShadow = true;
  root.add(sq);
  const WALL_R = 3.15, WALL_A = 5 / WALL_R;
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI / 2 - WALL_A / 2 + ((i + 0.5) / 14) * WALL_A;
    b.add(K.at(K.box(0.38, 0.3, 5 / 14 + 0.03), Math.cos(a) * WALL_R, Y0, Math.sin(a) * WALL_R, { ry: -a }), '#f4ead8', 'stone');
    b.add(K.at(K.box(0.44, 0.04, 5 / 14 + 0.03), Math.cos(a) * WALL_R, Y0 + 0.3, Math.sin(a) * WALL_R, { ry: -a }), '#d6c0a2', 'stone');
  }
  const seatAt = (i: number) => {
    const a = -Math.PI / 2 - WALL_A / 2 + ((i + 0.5) / 8) * WALL_A;
    return { x: Math.cos(a) * (WALL_R - 0.1), z: Math.sin(a) * (WALL_R - 0.1), ry: Math.atan2(-Math.cos(a), -Math.sin(a)) };
  };
  // a bench of lamps around the square and two cypresses
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    if (Math.abs(a - (Math.PI * 1.5)) < 1) continue;
    K.lamp(b, { x: Math.cos(a) * 3.4, y: Y0, z: Math.sin(a) * 3.4, h: 0.9, intensity: 2.5 });
  }

  // ---- seated figures (old men and, later, the traveller)
  const seated = (coat: string, hair: string) => {
    const s = 1.45;
    return K.merge([
      K.paint(K.at(K.cyl(0.035 * s, 0.05 * s, 0.13 * s, 7), 0, 0, -0.01), coat),
      K.paint(K.at(K.sphere(0.042 * s, 7, 5), 0, 0.12 * s, -0.005, { s: [1.1, 0.6, 0.9] }), coat),
      K.paint(K.at(K.box(0.085 * s, 0.035 * s, 0.11 * s), 0, 0, 0.05 * s), coat),
      K.paint(K.at(K.box(0.075 * s, 0.13 * s, 0.035 * s), 0, -0.125 * s, 0.1 * s), '#3a302a'),
      K.paint(K.at(K.sphere(0.03 * s, 8, 6), 0, 0.165 * s, 0.005), '#e8c9ae'),
      K.paint(K.at(K.dome(0.033 * s, 8, 1, 0.9), 0, 0.17 * s, -0.004), hair),
      K.paint(K.at(K.cyl(0.006, 0.006, 0.22, 4), 0.07, -0.15, 0.1, { rz: -0.15 }), '#5a4632'), // a cane
    ]);
  };
  const oldMat = K.figureMaterial();
  const oldGeo = seated('#ffffff', '#f4f1ec');
  const OLD_COATS = ['#3b3a46', '#4a3a30', '#2f3a3a', '#463844', '#3d3328', '#33384a', '#4b4036'];
  const oldMen = K.instanced(oldGeo, oldMat, 7, (i, o, c) => {
    const s = seatAt(i);
    o.position.set(s.x, Y0 + 0.31, s.z);
    o.rotation.y = s.ry;
    c.set(OLD_COATS[i]);
  });
  root.add(oldMen);
  const setOld = K.instanceSetter(oldMen);

  // ---- telescopes on rooftop terraces (brass, sweeping the sky in unison)
  const scopes: { x: number; y: number; z: number; ry: number }[] = [];
  for (const t of terraces) {
    const n = 2 + (scopes.length % 2);
    for (let i = 0; i < n; i++) {
      const x = t.x + (i - (n - 1) / 2) * 0.32, z = t.z + rng.float(-0.15, 0.15), y = Y0 + t.h + 0.08;
      for (let l = 0; l < 3; l++) {
        const a = (l / 3) * Math.PI * 2;
        b.add(K.strut([x + Math.cos(a) * 0.12, y, z + Math.sin(a) * 0.12], [x, y + 0.32, z], 0.008, 4), '#5a4030', 'wood');
      }
      scopes.push({ x, y: y + 0.34, z, ry: rng.angle() });
    }
  }
  const scopeGeo = K.merge([K.at(K.cyl(0.035, 0.05, 0.85, 10), 0, -0.35, 0), K.at(K.cyl(0.055, 0.055, 0.1, 10), 0, 0.45, 0)]).rotateX(Math.PI / 2);
  const scopeMesh = K.instanced(scopeGeo, K.std('#c9a34c', { metalness: 0.9, roughness: 0.3 }), Math.max(1, scopes.length), undefined, { colors: false });
  root.add(scopeMesh);
  const setScope = K.instanceSetter(scopeMesh);

  // ---- violin makers' arcade with hanging violins and a great violin sign
  const arcRy = Math.atan2(-tan[1], tan[0]);
  K.arcade(b, { x: ARC[0], y: Y0, z: ARC[1], ry: arcRy, n: 8, span: 0.72, h: 1.1, d: 0.35, color: '#efe2d2', finish: 'plaster' });
  b.add(K.at(K.box(0.72 * 8, 0.12, 1.4), ARC[0] + out[0] * 0.5, Y0 + 1.1, ARC[1] + out[1] * 0.5, { ry: arcRy }), '#d9c4b2', 'plaster');
  b.add(K.at(K.box(0.72 * 8, 1.1, 0.1), ARC[0] + out[0] * 1.15, Y0, ARC[1] + out[1] * 1.15, { ry: arcRy }), '#e8d6c4', 'plaster');
  b.add(K.at(K.hipRoof(0.72 * 8 + 0.2, 1.6, 0.32), ARC[0] + out[0] * 0.5, Y0 + 1.22, ARC[1] + out[1] * 0.5, { ry: arcRy }), '#b9776d', 'ceramic');
  const violin = (s: number) => K.merge([
    K.at(K.sphere(0.05, 10, 6), 0, 0, 0, { s: [1, 1.15, 0.35] }),
    K.at(K.sphere(0.04, 10, 6), 0, 0.08, 0, { s: [1, 1.05, 0.35] }),
    K.at(K.box(0.012, 0.11, 0.01), 0, 0.11, 0),
    K.at(K.sphere(0.012, 6, 4), 0, 0.225, 0),
  ]).scale(s, s, s);
  for (let i = 0; i < 12; i++) {
    const f = (i % 8 - 3.5) * 0.72 + (i >= 8 ? 0.3 : 0);
    const x = ARC[0] + tan[0] * f - out[0] * (i >= 8 ? 0.0 : 0.05), z = ARC[1] + tan[1] * f - out[1] * (i >= 8 ? 0.0 : 0.05);
    b.add(K.at(violin(1.0), x, Y0 + 0.62, z, { ry: arcRy + rng.float(-0.4, 0.4) }), rng.pick(['#a8561f', '#8f3f16', '#b8682a']), 'polished');
  }
  b.add(K.at(violin(3.2), ARC[0] - out[0] * 0.25, Y0 + 1.25, ARC[1] - out[1] * 0.25, { ry: arcRy }), '#a24f2a', 'polished');

  // ---- cockpit: a sunken sand ring in a side plaza
  b.add(K.at(K.disc(2.1, 40), COCK[0], Y0 + 0.015, COCK[1]), '#cdb393', 'stone');
  b.add(K.at(K.cyl(1.0, 1.0, 0.18, 32, true), COCK[0], Y0, COCK[1]), '#8a5a3a', 'wood');
  b.add(K.at(K.disc(0.95, 32), COCK[0], Y0 + 0.025, COCK[1]), '#d9b47c', 'matte');
  const bettorMat = K.figureMaterial();
  const bettors = K.instanced(K.personGeometry(0.27), bettorMat, 14, (_i, _o, c) => { c.set(rng.pick(['#7a3b2e', '#2f4b6e', '#6d3d5e', '#8a6a3a', '#3f5a3a', '#5a2b2b'])); });
  root.add(bettors);
  const setBet = K.instanceSetter(bettors);
  const cockGeo = K.merge([K.at(K.sphere(0.045, 8, 6), 0, 0.06, 0, { s: [0.8, 0.9, 1.2] }), K.at(K.sphere(0.022, 6, 5), 0, 0.11, 0.04), K.at(K.cone(0.03, 0.08, 5), 0, 0.05, -0.06, { rx: -0.8 })]);
  const cocks = K.instanced(cockGeo, K.std('#ffffff', { roughness: 0.6 }), 2, (i, _o, c) => { c.set(i ? '#c8471f' : '#2b2420'); });
  root.add(cocks);
  const setCock = K.instanceSetter(cocks);
  const dustMat = new THREE.MeshBasicMaterial({ color: '#c0563a', transparent: true, opacity: 0, depthWrite: false });
  const dust = K.instanced(K.sphere(0.25, 10, 8), dustMat, 6, undefined, { castShadow: false, receiveShadow: false, colors: false });
  root.add(dust);
  const setDust = K.instanceSetter(dust);

  // ---- fountain vignette: a foreigner between two women, a third comes from a lane
  K.fountain(b, { x: FOUNT[0], y: Y0, z: FOUNT[1], r: 0.6, color: '#e6d6c4' });
  const fw = K.waterDisc(0.5, Y0 + 0.2, { color: '#7fa6b4' });
  fw.position.x = FOUNT[0]; fw.position.z = FOUNT[1];
  root.add(fw);
  const vMat = K.figureMaterial();
  const vign = K.instanced(K.personGeometry(0.28), vMat, 4, (i, _o, c) => { c.set(['#2e5f8a', '#c8473a', '#e0b84a', '#7a3f8a'][i]); });
  root.add(vign);
  const setV = K.instanceSetter(vign);

  // ---- the wild ring: thorn scrub, boulders, and the long winding road
  K.forest(b, { n: 300, r0: 16.8, r1: 22.2, rng: rng.fork('scrub'), kinds: ['shrub', 'shrub', 'shrub', 'olive', 'cypress'], h: [0.3, 1.1], color: '#7d8a5a', y: (x, z) => isl.heightAt(x, z) - 0.05 });
  for (let i = 0; i < 60; i++) {
    const [x, z] = rng.inRing(16.8, 22);
    K.rock(b, { x, y: isl.heightAt(x, z), z, r: rng.float(0.25, 0.8), color: '#a89078', rng });
  }
  const roadPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 160; i++) {
    const f = i / 160;
    const a = (3 * Math.PI) / 4 - f * (Math.PI * 2 - Math.PI / 4);
    const r = 21.6 - f * 5.2 + Math.sin(f * 17) * 0.6 * (1 - f);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    roadPts.push(new THREE.Vector3(x, Math.max(0, isl.heightAt(x, z)) + 0.04, z));
  }
  for (let i = 1; i < roadPts.length; i++) {
    const p = roadPts[i - 1], q = roadPts[i];
    const len = p.distanceTo(q);
    const g = K.box(0.95, 0.05, len + 0.05);
    g.lookAt(new THREE.Vector3(0, 0, 0).subVectors(q, p));
    b.add(K.at(g, (p.x + q.x) / 2, (p.y + q.y) / 2 - 0.02, (p.z + q.z) / 2), '#e0c79a', 'matte');
  }
  // rampart with the west gate
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.06) continue;
    b.add(K.at(K.box(0.3, 0.5, 1.42), Math.cos(a) * 15.85, Y0, Math.sin(a) * 15.85, { ry: -a }), '#d4bea2', 'stone');
  }
  for (const s of [-1, 1]) K.tower(b, { x: -15.85, y: Y0, z: s * 0.9, r: 0.35, h: 1.6, sides: 8, top: 'cone', color: '#e6d6c4', topColor: '#b9776d' });
  // gardens: cypresses and olives inside the walls
  K.forest(b, { n: 45, r0: 4.6, r1: 15, rng: rng.fork('trees'), kinds: ['cypress', 'cypress', 'olive', 'round'], h: [0.9, 2.2], y: () => Y0, avoid: (x, z) => !free(x, z, 0.3, 0.4) });

  const city = b.build({ name: 'isidora' });
  root.add(city);

  // shells (one instanced draw call, iridescent)
  const shellGeo = K.merge([K.cone(0.03, 0.08, 7), K.at(K.torus(0.026, 0.01, 4, 10), 0, 0.012, 0, { rx: Math.PI / 2 })]);
  const shellMat = new THREE.MeshPhysicalMaterial({ color: '#f7ece6', roughness: 0.25, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 700], sheen: 0.4, sheenColor: new THREE.Color('#ffd6e4') });
  const shells = K.instanced(shellGeo, shellMat, shellPts.length, (i, o, c) => {
    const s = shellPts[i];
    o.position.copy(s.p);
    o.rotation.set(rng.float(-1, 1), rng.angle(), rng.float(-1.2, 1.2));
    o.scale.setScalar(rng.float(0.5, 1.1));
    c.copy(K.pickJitter(['#fbeee8', '#f4d6d2', '#e8eef2', '#f7e6c8'], rng));
  }, { castShadow: false });
  root.add(shells);

  // ---- young people strolling: round the square, along the spiral street
  const ring = (r: number, y: number) => Array.from({ length: 41 }, (_, i) => new THREE.Vector3(Math.cos((i / 40) * Math.PI * 2) * r, y, Math.sin((i / 40) * Math.PI * 2) * r));
  const YOUTH = ['#d9534f', '#3f7fbf', '#e8c35a', '#f2ede4', '#5aa36a', '#c46aa8', '#ef8f4a'];
  const prom = new K.Walkers({ paths: [ring(2.2, Y0 + 0.03), ring(2.6, Y0 + 0.03)], count: 18, closed: true, rng: rng.fork('prom'), speed: [0.25, 0.4], colors: YOUTH, h: 0.27 });
  root.add(prom.mesh);
  const streetPath = spiralPts.filter((_, i) => i % 4 === 0).map((p) => new THREE.Vector3(p[0], Y0 + 0.03, p[1]));
  const street = new K.Walkers({ paths: [streetPath], count: 46, rng: rng.fork('street'), speed: [0.3, 0.55], colors: YOUTH, h: 0.26 });
  root.add(street.mesh);

  // ---- the traveller: rider on the road, walker on the spiral, then old man on the wall
  const pathLen = (pts: THREE.Vector3[]) => { const acc = [0]; for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + pts[i].distanceTo(pts[i - 1])); return acc; };
  const sample = (pts: THREE.Vector3[], acc: number[], f: number, outP: THREE.Vector3) => {
    const s = K.clamp(f) * acc[acc.length - 1];
    let k = 1;
    while (k < acc.length - 1 && acc[k] < s) k++;
    const u = (s - acc[k - 1]) / Math.max(1e-6, acc[k] - acc[k - 1]);
    outP.lerpVectors(pts[k - 1], pts[k], K.clamp(u));
    return Math.atan2(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z);
  };
  const roadAcc = pathLen(roadPts);
  const walkPts = [new THREE.Vector3(-17, Y0, 0), ...spiralPts.filter((_, i) => i % 2 === 0).map((p) => new THREE.Vector3(p[0], Y0 + 0.03, p[1]))];
  const lastSeat = seatAt(7);
  walkPts.push(new THREE.Vector3(lastSeat.x * 0.85, Y0 + 0.03, lastSeat.z * 0.85));
  const walkAcc = pathLen(walkPts);

  const travCoatMat = new THREE.MeshStandardMaterial({ color: '#2f6fa8', roughness: 0.85, vertexColors: true });
  const rider = new THREE.Group();
  rider.add(new THREE.Mesh(K.quadruped({ len: 0.5, h: 0.42, color: '#6b4a33', tail: 0.14, ears: true }), K.std('#ffffff', { vertexColors: true, roughness: 0.8 })));
  const riderMan = new THREE.Mesh(K.personGeometry(0.26), travCoatMat);
  riderMan.position.set(0, 0.22, 0);
  rider.add(riderMan);
  rider.traverse((o) => { o.castShadow = true; });
  root.add(rider);
  const walker = new THREE.Mesh(K.personGeometry(0.3), travCoatMat);
  walker.castShadow = true;
  const hairMat = new THREE.MeshStandardMaterial({ color: '#4a2e1c', roughness: 0.9 });
  const hair = new THREE.Mesh(K.dome(0.032, 8, 1, 0.9), hairMat);
  hair.position.y = 0.265;
  walker.add(hair);
  root.add(walker);
  const sitter = new THREE.Mesh(seated('#ffffff', '#ffffff'), new THREE.MeshStandardMaterial({ color: '#4a4a5a', roughness: 0.9, vertexColors: true }));
  sitter.position.set(lastSeat.x, Y0 + 0.31, lastSeat.z);
  sitter.rotation.y = lastSeat.ry;
  sitter.castShadow = true;
  root.add(sitter);
  const halo = K.glowSprite('#ffe3b0', 0.9, 0.0);
  root.add(halo);

  // ---- light of the dream: a cool morning lift added on top of the golden afternoon
  const dreamSun = new THREE.DirectionalLight('#eef3ff', 0);
  dreamSun.position.set(4, 30, 10);
  root.add(dreamSun);
  const dreamHemi = new THREE.HemisphereLight('#cfe0ff', '#f2e2d6', 0);
  root.add(dreamHemi);
  const dream = new K.Toggle(0.4);

  // ---- life in the air: golden dust from the wild lands, swallows
  root.add(K.particles({ count: 320, radius: 20, y0: 0.4, y1: 7, color: '#ffd8a0', size: 0.07, opacity: 0.5, swirl: 0.7, twinkle: 0.6, rng: rng.fork('dust') }));
  const birds = new K.Flock({ count: 26, center: [0, 0, 0], radius: 12, height: 9, color: '#3a2e2a', span: 0.32, speed: 0.22, rng: rng.fork('birds') });
  root.add(birds.mesh);

  const tmp = new THREE.Vector3();
  const COAT_YOUNG = new THREE.Color('#2f6fa8'), COAT_OLD = new THREE.Color('#3e3a44');
  const HAIR_Y = new THREE.Color('#4a2e1c'), HAIR_O = new THREE.Color('#f4f1ec');
  const RIDE = 14, DISMOUNT = 15.5, ARRIVE = 38;
  const youthPath = ring(2.4, Y0 + 0.03), youthAcc = pathLen(youthPath);

  return {
    root,
    env: {
      skyTop: '#6e7db4',
      skyHorizon: '#f4c8a4',
      skyBottom: '#9a7f86',
      skyCurve: 0.5,
      fog: '#e2d1cc',
      fogNear: 70,
      fogFar: 220,
      sunDir: [-0.85, 0.32, 0.25],
      sunColor: '#ffc58e',
      sunIntensity: 2.6,
      sunDisc: 1,
      sunGlow: 1.1,
      hemiSky: '#a6b2dc',
      hemiGround: '#8a6a52',
      hemiIntensity: 0.7,
      envIntensity: 0.8,
      clouds: 0.35,
      cloudColor: '#f9d9c0',
      bloomStrength: 0.45,
      bloomThreshold: 0.85,
      tiltShift: 0.45,
      shadowRadius: 25,
      vignette: 0.35,
      saturation: 1.05,
      tint: '#fff2e2',
    },
    camera: {
      position: [-8.5, 20, 23.5],
      target: [0, 0.5, 0],
      minDistance: 6,
      maxDistance: 75,
      autoRotate: 0.25,
      views: [
        { position: [20, 34, -14], target: [0, 0, 1] },
        { position: [1.6, 2.4, 2.2], target: [-0.5, 1.0, -3.0] },
      ],
    },
    interaction: {
      label: 'As he dreamed it',
      activeLabel: 'As he reaches it',
      hint: 'Stone for stone the same city; only the dreamer has changed.',
      set: (on) => dream.set(on),
      camera: { position: [-3, 7, 9], target: [0, 0.8, -1] },
    },
    update(t, dt) {
      dream.update(dt);
      const d = dream.value;
      prom.update(t);
      street.update(t);
      birds.update(t);
      // the old men's heads follow the passing young, in unison
      for (let i = 0; i < 7; i++) {
        const s = seatAt(i);
        setOld(i, s.x, Y0 + 0.31, s.z, s.ry + Math.sin(t * 0.35 - i * 0.15) * 0.45);
      }
      setOld.done();
      // telescopes sweep the sky together
      scopes.forEach((s, i) => setScope(i, s.x, s.y, s.z, s.ry + t * 0.08, 1, -0.6 - 0.25 * Math.sin(t * 0.2)));
      setScope.done();
      // the cockfight, and every 25 s the bettors brawl
      const cyc = t % 25, brawl = K.smoothstep(0, 1, cyc - 8) * (1 - K.smoothstep(0, 2, cyc - 13));
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const r = 1.25 - brawl * 0.35 + Math.sin(t * 9 + i * 3) * 0.08 * brawl;
        const jx = Math.sin(t * 11 + i) * 0.12 * brawl, jz = Math.cos(t * 13 + i * 2) * 0.12 * brawl;
        setBet(i, COCK[0] + Math.cos(a) * r + jx, Y0 + 0.02 + Math.abs(Math.sin(t * 7 + i)) * (0.015 + 0.05 * brawl), COCK[1] + Math.sin(a) * r + jz, -a - Math.PI / 2 + brawl * Math.sin(t * 6 + i));
      }
      setBet.done();
      for (let i = 0; i < 2; i++) {
        const a = t * 1.4 + i * Math.PI;
        setCock(i, COCK[0] + Math.cos(a) * 0.25, Y0 + 0.03 + Math.abs(Math.sin(t * 5 + i)) * 0.12, COCK[1] + Math.sin(a) * 0.25, -a + (i ? 0 : Math.PI), 1.3);
      }
      setCock.done();
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + t * 0.3;
        setDust(i, COCK[0] + Math.cos(a) * 0.7, Y0 + 0.25 + brawl * 0.25, COCK[1] + Math.sin(a) * 0.7, 0, 0.3 + brawl * (0.8 + 0.2 * Math.sin(t * 3 + i)));
      }
      setDust.done();
      dustMat.opacity = brawl * 0.35;
      // the fountain: he turns from one woman to the other; a third arrives
      const fc = t % 25;
      const ca = Math.atan2(FOUNT[1], FOUNT[0]);
      const tx = -Math.sin(ca), tz = Math.cos(ca);
      const fx = FOUNT[0] - Math.cos(ca) * 0.8, fz = FOUNT[1] - Math.sin(ca) * 0.8;
      const turn = Math.sin(fc * 0.8) > 0 ? 1 : -1;
      setV(0, fx, Y0 + 0.02, fz, Math.atan2(tx * turn, tz * turn));
      setV(1, fx + tx * 0.35, Y0 + 0.02, fz + tz * 0.35, Math.atan2(-tx, -tz));
      setV(2, fx - tx * 0.35, Y0 + 0.02, fz - tz * 0.35, Math.atan2(tx, tz));
      const third = K.smoothstep(10, 18, fc) * (1 - K.smoothstep(22, 24.5, fc));
      const r3 = 2.6 - 2.15 * third;
      setV(3, fx - Math.cos(ca) * r3 + tx * 0.05, Y0 + 0.02 + Math.abs(Math.sin(t * 6)) * 0.01 * (third > 0 && third < 1 ? 1 : 0), fz - Math.sin(ca) * r3, Math.atan2(Math.cos(ca), Math.sin(ca)), third > 0.01 ? 1 : 0);
      setV.done();
      // the traveller
      let age = 0;
      rider.visible = false; walker.visible = false; sitter.visible = false;
      if (t < DISMOUNT) {
        rider.visible = true;
        const f = K.easeOut(Math.min(1, t / RIDE) * 0.9 + 0.1 * Math.min(1, t / RIDE)) ;
        const ry = sample(roadPts, roadAcc, f, tmp);
        rider.position.copy(tmp).setY(tmp.y + Math.abs(Math.sin(t * 9)) * 0.05 * (t < RIDE ? 1 : 0));
        rider.rotation.y = ry;
        age = 0.1 + 0.15 * (t / DISMOUNT);
      } else if (t < ARRIVE) {
        walker.visible = true;
        const u = (t - DISMOUNT) / (ARRIVE - DISMOUNT);
        const ry = sample(walkPts, walkAcc, 1 - Math.pow(1 - u, 1.6), tmp);
        walker.position.copy(tmp).setY(tmp.y + Math.abs(Math.sin(t * 7 * (1 - u * 0.6))) * 0.012);
        walker.rotation.set(0, ry, 0);
        age = 0.25 + 0.75 * u;
        walker.rotation.x = age * 0.35;
      } else {
        sitter.visible = true;
        age = 1;
      }
      // the dream overrides the age: he walks young among the young
      if (d > 0.5) {
        rider.visible = false; sitter.visible = false; walker.visible = true;
        const ry = sample(youthPath, youthAcc, ((t * 0.32) / youthAcc[youthAcc.length - 1]) % 1, tmp);
        walker.position.copy(tmp).setY(tmp.y + Math.abs(Math.sin(t * 7)) * 0.012);
        walker.rotation.set(0, ry, 0);
        age = 0;
      }
      travCoatMat.color.copy(COAT_YOUNG).lerp(COAT_OLD, age);
      hairMat.color.copy(HAIR_Y).lerp(HAIR_O, age);
      const tgt = rider.visible ? rider.position : walker.visible ? walker.position : sitter.position;
      halo.position.set(tgt.x, tgt.y + 0.55, tgt.z);
      (halo.material as THREE.SpriteMaterial).opacity = 0.35 + 0.1 * Math.sin(t * 2);
      // dream light: high, cool, clean
      dreamSun.intensity = d * 1.0;
      dreamHemi.intensity = d * 0.4;
      shellMat.iridescenceThicknessRange = [200 + 60 * Math.sin(t * 0.4), 700];
    },
  };
};

export default build;
