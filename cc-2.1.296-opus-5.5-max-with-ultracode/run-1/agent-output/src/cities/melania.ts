// MELANIA - Cities & the Dead 1.
// A round square raised like a stage, backed by a horseshoe of painted facades whose
// five streets recede in forced perspective. Seventeen stock roles stand on chalk marks,
// each marked by a glowing mask: the bodies age, crumble and are replaced by newborns
// stepping out of the doors, while the masks (the roles) persist and the dialogue,
// gold beads shuttling between speakers, never stops. Above the square the plot, a gold
// thread, winds ever tighter around a star it never reaches. On the south terraces a
// thousand king's sons fallen into low estate wait to be recognised.
// Toggle: the city's own time, forty times faster.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const D2R = Math.PI / 180;
/** azimuth (deg, north = -z, clockwise seen from above towards +x) and radius to x/z */
const P = (deg: number, r: number): [number, number] => [Math.sin(deg * D2R) * r, -Math.cos(deg * D2R) * r];
const STAGE_Y = 0.35;
const BASE_Y = -1.6;

/** annulus sector solid from y0 to y1 */
function sector(r0: number, r1: number, a0: number, a1: number, y0: number, y1: number, seg = 32) {
  const s = new THREE.Shape();
  for (let i = 0; i <= seg; i++) {
    const [x, z] = P(a0 + ((a1 - a0) * i) / seg, r1);
    if (i === 0) s.moveTo(x, z);
    else s.lineTo(x, z);
  }
  for (let i = seg; i >= 0; i--) {
    const [x, z] = P(a0 + ((a1 - a0) * i) / seg, r0);
    s.lineTo(x, z);
  }
  return K.at(K.extrudeUp(s, y1 - y0), 0, y0, 0);
}

interface Role { name: string; body: string; mask: string; mark: (s: number) => [number, number] }

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const b = new K.Batch();

  // ---------------------------------------------------------------- the plinth
  const pl = K.plinth({ radius: 21, height: 1, color: '#8c7458', rim: '#c9a24c' });
  pl.position.y = BASE_Y;
  root.add(pl);
  const cone = K.wobble(K.lathe([[0.4, -9.5], [8, -6.5], [15, -4.2], [19.5, -3], [20.8, -2.62]], 48), 0.45, 0.6, 3);
  K.paintBy(cone, (_x, y, _z, o) => {
    const band = 0.5 + 0.5 * Math.sin(y * 3.1 + K.noise2(y, 1) * 2);
    o.set(K.mix('#4a3442', '#9a7d62', 0.3 + 0.5 * band));
  });
  b.add(cone, null, 'stone');

  // the raised square (stage), the north ground (behind the facades) and the south terraces
  b.add(K.at(K.cyl(8.5, 8.5, STAGE_Y - BASE_Y, 96), 0, BASE_Y, 0), '#c8ad86', 'stone');
  for (let i = 0; i < 9; i++) {
    const r0 = 0.9 + i * 0.85;
    b.add(K.at(K.ring(r0, r0 + 0.42, 96), 0, STAGE_Y + 0.008, 0), i % 2 ? '#c4a57c' : '#d8c29c', 'stone');
  }
  b.add(K.at(K.ring(8.2, 8.5, 96), 0, STAGE_Y + 0.008, 0), '#8a1c2b', 'stone');
  b.add(sector(8.5, 21, -112, 112, BASE_Y, 0, 48), '#b39673', 'stone');
  for (let k = 0; k < 6; k++) {
    const top = STAGE_Y - (k + 1) * 0.31;
    b.add(sector(8.5 + k * 1.5, 8.5 + (k + 1) * 1.5, 112, 248, BASE_Y, top, 40), k % 2 ? '#9c8064' : '#ab8f70', 'stone');
  }
  K.well(b, { x: 0, y: STAGE_Y, z: 0, r: 0.6, color: '#d9c7a6', roofColor: '#8a1c2b' });

  // ---------------------------------------------------------------- the horseshoe of painted facades
  const STREETS = [-80, -40, 0, 40, 80];
  const FACADES = ['#d9a77c', '#e3b98f', '#c98b6a', '#e8c9a0', '#cf9a78', '#dcb28a', '#b97a62'];
  const doors: [number, number][] = [];
  const segs: [number, number, number][] = [[-110, -84, 1], [-76, -44, 2], [-36, -4, 2], [4, 36, 2], [44, 76, 2], [84, 110, 1]];
  for (const [a0, a1, n] of segs) {
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * (i + 0.5)) / n;
      const r = 9.9;
      const w = (((a1 - a0) / n) * D2R * r) - 0.12;
      const h = rng.float(3.6, 6.2);
      const [x, z] = P(a, r);
      const ry = -a * D2R;
      const wall = rng.pick(FACADES);
      K.house(b, { x, z, ry, w, d: 1.8, h, roof: 'flat', wall, cornice: true, lit: 0.22, glow: 2.2, litColor: '#ffc864', door: false, rng });
      const pl2 = (g: THREE.BufferGeometry) => K.at(g, x, 0, z, { ry });
      // arched door on its stone threshold, a balcony with railing, a painted pilaster frame
      b.add(pl2(K.at(K.box(0.62, 1.05, 0.06), 0, 0.12, 0.9)), '#3a2028', 'wood');
      b.add(pl2(K.at(K.archBand(0.62, 0.1, 0.1, 10), 0, 0.82, 0.92)), '#efe2c8', 'stone');
      b.add(pl2(K.at(K.box(1.1, 0.12, 0.5), 0, 0, 1.1)), '#d8ccb6', 'stone');
      b.add(pl2(K.at(K.box(1.3, 0.08, 0.45), 0, 2.05, 1.1)), '#efe2c8', 'stone');
      b.add(pl2(K.at(K.box(1.3, 0.04, 0.04), 0, 2.4, 1.32)), '#3b2b2b', 'metal');
      for (let q = 0; q < 7; q++) b.add(pl2(K.at(K.box(0.025, 0.3, 0.025), -0.6 + q * 0.2, 2.12, 1.32)), '#3b2b2b', 'metal');
      for (const sx of [-w / 2 + 0.08, w / 2 - 0.08]) b.add(pl2(K.at(K.box(0.14, h, 0.06), sx, 0, 0.92)), K.shade(wall, 1.12), 'plaster');
      doors.push(P(a, r - 1.3));
    }
  }

  // ---------------------------------------------------------------- five streets in forced perspective
  const streetRise = (r: number) => K.clamp((r - 10) / 10) * 0.8;
  const mouths: { x: number; z: number; a: number }[] = [];
  for (const sa of STREETS) {
    const [dx, dz] = P(sa, 1);
    const px = -dz, pz = dx;
    for (let k = 0; k < 7; k++) {
      const r = 9.4 + k * 1.6;
      const sw = 1.7 - k * 0.12;
      const [x, z] = P(sa, r + 0.8);
      b.add(K.at(K.box(sw, streetRise(r) + 0.02, 1.62), x, 0, z, { ry: -sa * D2R }), k % 2 ? '#9b8366' : '#a88e70', 'stone');
    }
    for (let k = 0; k < 6; k++) {
      const s = 1 - k * 0.12;
      const r = 11 + k * 1.55;
      const y = streetRise(r);
      for (const side of [-1, 1]) {
        const hw = 0.8 - k * 0.05;
        const d = 1.6 * s;
        const off = hw + d / 2 + 0.05;
        const x = dx * r + px * side * off, z = dz * r + pz * side * off;
        const ry = Math.atan2(-side * px, -side * pz);
        K.house(b, { x, y, z, ry, w: 1.5 * s, d, h: rng.float(3.6, 4.6) * s, roof: rng.pick(['flat', 'gable'] as const), wall: rng.pick(FACADES), roofColor: '#8f4a38', cornice: true, lit: 0.3, glow: 2.4, litColor: '#ffc864', rng });
      }
    }
    // a tiny painted arch closes each vista
    const [ex, ez] = P(sa, 20.2);
    b.add(K.at(K.archWall(1.6, 1.5, 0.2, 0.6, 1.0), ex, 0.8, ez, { ry: -sa * D2R }), '#e8c9a0', 'plaster');
    b.add(K.at(K.box(0.6, 1.0, 0.05), ex, 0.8, ez + 0, { ry: -sa * D2R }), '#ffd9a0', 'glow', 1.6);
    mouths.push({ x: dx * 11.5, z: dz * 11.5, a: sa });
  }
  // the town behind the streets
  for (let i = 0; i < 70; i++) {
    const a = rng.float(-108, 108);
    const r = rng.float(12.5, 19.5);
    const [x, z] = P(a, r);
    let ok = true;
    for (const sa of STREETS) {
      const [dx, dz] = P(sa, 1);
      if (Math.abs(x * -dz + z * dx) < 2.9 + (r - 11) * 0.02 && x * dx + z * dz > 0) ok = false;
    }
    if (!ok) continue;
    const s = 1.15 - (r - 12) * 0.06;
    K.house(b, { x, z, ry: -a * D2R + rng.float(-0.1, 0.1), w: rng.float(1.2, 1.9) * s, d: rng.float(1.2, 1.8) * s, h: rng.float(2.2, 3.6) * s, roof: rng.pick(['gable', 'hip'] as const), wall: rng.pick(FACADES), roofColor: K.pickJitter(['#8f4a38', '#a35a3e', '#7d3e33'], rng), lit: 0.25, glow: 2.2, litColor: '#ffc864', rng });
  }
  K.forest(b, { n: 26, r0: 19, r1: 20.5, rng, kinds: ['cypress', 'cypress', 'round'], h: [1.4, 2.6] });

  // ---------------------------------------------------------------- footlights along the stage lip
  const foot: THREE.Vector3[] = [];
  for (let i = 0; i < 60; i++) {
    const a = 113 + (134 * i) / 59;
    const [x, z] = P(a, 8.32);
    b.add(K.at(K.box(0.16, 0.12, 0.08), x, STAGE_Y, z, { ry: -a * D2R }), '#2b1c22', 'metal');
    b.add(K.at(K.sphere(0.06, 8, 6), x, STAGE_Y + 0.08, z), '#ffc864', 'glow', 5);
    foot.push(new THREE.Vector3(x, STAGE_Y + 0.12, z));
  }
  root.add(K.glowPoints(foot, '#ffc864', 0.9, 0.75));
  const footLight = new THREE.PointLight('#ffb35c', 9, 12, 1.6);
  footLight.position.set(0, 2.2, 6.5);
  root.add(footLight);

  // chalk marks are added below with the cast
  // ---------------------------------------------------------------- the cast
  const wander = (cx: number, cz: number, rx: number, rz: number, f: number, ph: number) => (s: number): [number, number] =>
    [cx + Math.sin(s * f + ph) * rx, cz + Math.sin(s * f * 0.73 + ph * 2) * rz];
  const fixed = (deg: number, r: number) => { const p = P(deg, r); return () => p; };
  const ROLES: Role[] = [
    { name: 'soldier', body: '#a01c24', mask: '#ffd27a', mark: fixed(38, 5.6) },
    { name: 'parasite', body: '#6b6a2e', mask: '#d9e07a', mark: fixed(52, 5.9) },
    { name: 'wastrel', body: '#1d6f8f', mask: '#7ae0ff', mark: fixed(40, 4.4) },
    { name: 'prostitute', body: '#d06a86', mask: '#ffb0c8', mark: fixed(55, 4.6) },
    { name: 'miser', body: '#1d1418', mask: '#ff5a4a', mark: fixed(-18, 7.4) },
    { name: 'daughter', body: '#f2b8c2', mask: '#ffe0ea', mark: fixed(-12, 6.2) },
    { name: 'servant', body: '#c84a2a', mask: '#fff07a', mark: (s) => { const k = K.pingpong(s, 22); const a = K.lerp(-24, -58, K.easeInOutSine(k)); return P(a, 6.4); } },
    { name: 'procuress', body: '#6a3a8a', mask: '#d6a0ff', mark: fixed(-64, 7.3) },
    { name: 'old man', body: '#6b4a2e', mask: '#ffcf9a', mark: fixed(92, 5.6) },
    { name: 'maidservant', body: '#3a6ab0', mask: '#ffffff', mark: fixed(98, 4.4) },
    { name: 'usurer', body: '#1f5a3a', mask: '#9affb8', mark: (s) => P(s * 9, 1.55) },
    { name: 'youth', body: '#b8954e', mask: '#ffe2a0', mark: (s) => P(s * 9 + 55, 1.55) },
    { name: 'nurse', body: '#f1ece2', mask: '#fff6e0', mark: fixed(-92, 5.4) },
    { name: 'stepdaughter', body: '#7a90b0', mask: '#bcd4ff', mark: fixed(-98, 4.2) },
    { name: 'hypocrite', body: '#9a9a9a', mask: '#f0f0f0', mark: wander(1.5, -3.8, 1.6, 0.8, 0.11, 0) },
    { name: 'confidante', body: '#b49ad0', mask: '#ead6ff', mark: wander(-2.4, -3.2, 1.2, 0.9, 0.13, 1.7) },
    { name: 'astrologer', body: '#1d2a5e', mask: '#a0b8ff', mark: wander(3.2, 2.6, 1.3, 1.1, 0.09, 3.1) },
    { name: 'tyrant', body: '#5a1630', mask: '#ffc864', mark: fixed(-150, 4.2) },
  ];
  const PAIRS: [number, number][] = [[0, 2], [1, 3], [4, 5], [6, 7], [8, 9], [10, 11], [12, 13], [14, 15], [16, 17], [6, 4]];
  const N = ROLES.length;
  const life = ROLES.map((_, i) => {
    const per = rng.float(95, 135);
    const death = 6.6 + i * 6.9;
    return { per, off: (((per - death) % per) + per) % per, door: 0 };
  });
  ROLES.forEach((r, i) => {
    const [mx, mz] = r.mark(0);
    let best = 0, bd = 1e9;
    doors.forEach(([x, z], j) => { const d = Math.hypot(x - mx, z - mz) + (j % 3) * 0.6; if (d < bd) { bd = d; best = j; } });
    life[i].door = best;
    if (i !== 6 && i !== 10 && i !== 11 && i < 14) b.add(K.at(K.ring(0.26, 0.32, 24), mx, STAGE_Y + 0.016, mz), '#f4efe4', 'matte');
  });

  const ACT_H = 0.62;
  const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, transparent: true });
  const bodies = K.instanced(K.personGeometry(ACT_H), bodyMat, N, () => {}, { receiveShadow: false });
  root.add(bodies);
  const maskGeo = K.at(K.sphere(0.1, 12, 8), 0, 0, 0, { s: [1, 1.15, 0.5] });
  const maskMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.2) });
  const masks = K.instanced(maskGeo, maskMat, N + 2, () => {}, { castShadow: false, receiveShadow: false });
  root.add(masks);
  const dustMat = new THREE.MeshStandardMaterial({ color: '#8d8680', roughness: 1 });
  const DUST = 10;
  const dust = K.instanced(K.sphere(0.03, 5, 4), dustMat, N * DUST, () => false, { castShadow: false });
  root.add(dust);
  const beadMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc864').multiplyScalar(3.2) });
  const BEADS = 14;
  const beads = K.instanced(K.sphere(0.05, 6, 5), beadMat, PAIRS.length * BEADS, () => false, { castShadow: false, receiveShadow: false });
  root.add(beads);
  const setBody = K.instanceSetter(bodies), setMask = K.instanceSetter(masks), setDust = K.instanceSetter(dust), setBead = K.instanceSetter(beads);
  const dustSeed = Array.from({ length: N * DUST }, () => [rng.angle(), rng.float(0.1, 0.45), rng.float(0.2, 1)]);

  // ---------------------------------------------------------------- multitudes
  const KING_COLS = ['#8a6a50', '#a08668', '#6a6058', '#b09a78', '#8a5a48', '#5e5a6a', '#9a8a72'];
  const crowns: THREE.Vector3[] = [];
  const kings: [number, number, number, number][] = [];
  for (let k = 0; k < 6 && kings.length < 1000; k++) {
    const r0 = 8.5 + k * 1.5, y = STAGE_Y - (k + 1) * 0.31;
    for (const rr of [r0 + 0.45, r0 + 1.05]) {
      const n = Math.floor((136 * D2R * rr) / 0.2);
      for (let i = 0; i < n && kings.length < 1000; i++) {
        const a = 117 + (126 * (i + rng.float(-0.3, 0.3))) / n;
        const [x, z] = P(a, rr + rng.float(-0.1, 0.1));
        kings.push([x, y, z, rng.float(0.85, 1.1)]);
      }
    }
  }
  const kingH = 0.3;
  root.add(K.instanced(K.personGeometry(kingH), K.figureMaterial(), kings.length, (i, o, c) => {
    const [x, y, z, s] = kings[i];
    o.position.set(x, y, z);
    o.rotation.y = Math.atan2(-x, -z);
    o.scale.set(s * 1.15, s * 0.85, s * 1.15);
    c.copy(K.pickJitter(KING_COLS, rng));
    crowns.push(new THREE.Vector3(x, y + kingH * 0.85 * s + 0.02, z));
  }));
  root.add(K.glowPoints(crowns, '#ffc864', 0.2, 0.95));
  // spongers round tavern tables in the street mouths, hypocrites among them
  const spong: [number, number, number, string][] = [];
  for (const m of mouths) {
    const [dx, dz] = P(m.a, 1);
    for (let t = 0; t < 3; t++) {
      const tr = 9.8 + t * 0.9;
      const tx = dx * tr, tz = dz * tr;
      b.add(K.at(K.cyl(0.18, 0.18, 0.2, 10), tx, 0, tz), '#5a3a28', 'wood');
      for (let j = 0; j < 20; j++) {
        const a = rng.angle(), rr = rng.float(0.25, 0.75);
        spong.push([tx + Math.cos(a) * rr, streetRise(tr), tz + Math.sin(a) * rr, j % 10 === 0 ? (j % 20 ? '#e8e8e8' : '#606060') : rng.pick(['#6b6a2e', '#7a5a3a', '#5a4a4a', '#8a6a4a'])]);
      }
    }
  }
  root.add(K.instanced(K.personGeometry(0.26), K.figureMaterial(), spong.length, (i, o, c) => {
    const [x, y, z, col] = spong[i];
    o.position.set(x, y, z);
    o.rotation.y = rng.angle();
    c.set(col);
  }));

  // ---------------------------------------------------------------- the plot: a gold thread knotting round a star
  const STAR = new THREE.Vector3(0, 11, 0);
  const NP = 4000, RISE = 520;
  const pts = new Float32Array(NP * 3);
  const v = new THREE.Vector3(), u1 = new THREE.Vector3(), u2 = new THREE.Vector3(), ax = new THREE.Vector3();
  for (let k = 0; k < NP; k++) {
    if (k < RISE) {
      const s = k / RISE;
      const a = s * 9;
      const rr = 0.35 + s * 1.6;
      v.set(Math.cos(a) * rr, STAGE_Y + 0.6 + s * 5.8, Math.sin(a) * rr);
    } else {
      const s = (k - RISE) / (NP - RISE);
      const a = (k - RISE) * 0.043;
      ax.set(Math.sin(k * 0.0031) * Math.cos(k * 0.0017), Math.cos(k * 0.0023), Math.sin(k * 0.0029 + 1)).normalize();
      u1.set(1, 0, 0).cross(ax).normalize();
      u2.crossVectors(ax, u1);
      const rr = 3.7 * (1 - 0.58 * s) * (1 + 0.08 * Math.sin(k * 0.05));
      const c = new THREE.Vector3(0, 10, 0).lerp(STAR, s);
      v.copy(c).addScaledVector(u1, Math.cos(a) * rr).addScaledVector(u2, Math.sin(a) * rr);
      if (k < RISE + 60) v.lerp(new THREE.Vector3(1.95, 6.75, 0), 1 - (k - RISE) / 60);
    }
    pts.set([v.x, v.y, v.z], k * 3);
  }
  const plotGeo = new THREE.BufferGeometry();
  plotGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const plotCol = new Float32Array(NP * 3);
  plotGeo.setAttribute('color', new THREE.BufferAttribute(plotCol, 3));
  const plot = new THREE.Line(plotGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  plot.frustumCulled = false;
  root.add(plot);
  const OBST = 16;
  const obstIdx = Array.from({ length: OBST }, (_, j) => RISE + 200 + j * 205);
  const obst = K.instanced(K.sphere(0.13, 8, 6), new THREE.MeshStandardMaterial({ color: '#2a1828', roughness: 0.6, metalness: 0.3 }), OBST, (i, o) => {
    o.position.fromArray(pts, obstIdx[i] * 3);
  }, { castShadow: false });
  root.add(obst);
  const setObst = K.instanceSetter(obst);
  const starCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4, 3.6) }));
  starCore.position.copy(STAR);
  root.add(starCore);
  const starGlow = K.glowSprite('#fff4dc', 3.2, 0.9);
  starGlow.position.copy(STAR);
  root.add(starGlow);
  const head = K.glowSprite('#ffc864', 0.7, 0.9);
  root.add(head);

  // stage-lighting cues (strong only in the time-lapse)
  const CUES = ['#ff7a8a', '#7ab0ff', '#ffd27a', '#b07aff', '#7affc8'];
  const beams = [[-6, 14, 6], [6, 14, 6], [0, 15, -9]].map(([x, y, z]) => {
    const m = K.beam([x, y, z], [x * 0.25, STAGE_Y, z * 0.2 - 1], 0.2, 3.2, '#ffe0b0', 0.12);
    root.add(m);
    return m;
  });

  root.add(b.build({ name: 'melania' }));
  root.add(K.particles({ count: 220, radius: 18, y0: 0.5, y1: 12, color: '#ffd9a0', colors: ['#d8a0c8'], size: 0.06, opacity: 0.5, swirl: 0.5, twinkle: 0.8, disc: true, rng: rng.fork('motes') }));
  root.add(K.cloudSea({ y: -9, color: '#a86a80', shadow: '#2a1a34', opacity: 0.6, coverage: 0.45 }));

  // ---------------------------------------------------------------- animation
  const tog = new K.Toggle(0.4);
  let sim = 0;
  const cBody = new THREE.Color(), cMask = new THREE.Color(), tmp = new THREE.Color();
  const ASH = new THREE.Color('#8a8580'), NEWBORN = new THREE.Color('#fff1d6');
  const maskPos: THREE.Vector3[] = ROLES.map(() => new THREE.Vector3());
  const hsl = { h: 0, s: 0, l: 0 };
  const hash = (a: number, b2: number) => K.fract(Math.sin(a * 12.9898 + b2 * 78.233) * 43758.5453);
  let lastHead = -1;

  const update = (t: number, dt: number) => {
    tog.update(dt);
    const g = tog.value;
    sim += dt * (1 + 39 * g);
    bodyMat.opacity = 1 - 0.55 * g;
    const drift = sim * 0.0005;
    for (let i = 0; i < N; i++) {
      const L0 = sim + life[i].off, per = life[i].per;
      const L = ((L0 % per) + per) % per;
      const gen = Math.floor(L0 / per);
      const role = ROLES[i];
      const [mx, mz] = role.mark(sim);
      const pi = PAIRS.find((p) => p[0] === i || p[1] === i);
      const other = pi ? ROLES[pi[0] === i ? pi[1] : pi[0]].mark(sim) : [0, 0];
      const W = 3.5;
      let x = mx, z = mz, sc = 1, stoop = 1, alive = true;
      cBody.set(role.body).getHSL(hsl);
      cBody.setHSL(K.fract(hsl.h + drift + (hash(i, gen) - 0.5) * 0.04), hsl.s, K.clamp(hsl.l + (hash(gen, i) - 0.5) * 0.08));
      let maskK = 1; // 1 = on the face, 0 = hovering over the empty mark
      if (L < W) {
        const k = L / W;
        const [dx, dz] = doors[life[i].door];
        x = K.lerp(dx, mx, K.easeInOutSine(k));
        z = K.lerp(dz, mz, K.easeInOutSine(k));
        sc = K.lerp(0.32, 1, k);
        tmp.copy(cBody);
        cBody.copy(NEWBORN).lerp(tmp, K.smoothstep(0.65, 1, k));
        maskK = K.smoothstep(0.78, 1, k);
      } else if (L > per - 4 && L <= per - 1) {
        const k = (L - (per - 4)) / 3;
        cBody.lerp(ASH, k);
        stoop = 1 - 0.15 * k;
        maskK = 1 - K.smoothstep(0.7, 1, k);
      } else if (L > per - 1) {
        alive = false;
        maskK = 0;
      }
      const ry = Math.atan2(other[0] - x, other[1] - z);
      if (alive) setBody(i, x, STAGE_Y, z, ry, [sc, sc * stoop, sc]);
      else setBody(i, 0, -50, 0, 0, 0);
      setBody.color(i, cBody);
      // dust of the dead
      const ck = L > per - 1 ? L - (per - 1) : -1;
      for (let j = 0; j < DUST; j++) {
        const [da, dr, dh] = dustSeed[i * DUST + j];
        if (ck < 0) setDust(i * DUST + j, 0, -50, 0, 0, 0);
        else setDust(i * DUST + j, mx + Math.cos(da) * dr * ck, STAGE_Y + dh * ACT_H * (1 - ck), mz + Math.sin(da) * dr * ck, 0, 1 - ck * 0.8);
      }
      // the mask: on the face, or hovering over the vacant mark
      const faceY = STAGE_Y + ACT_H * 0.86 * sc * stoop;
      const fx = x + Math.sin(ry) * 0.045 * sc, fz = z + Math.cos(ry) * 0.045 * sc;
      const hoverY = STAGE_Y + ACT_H + 0.3 + Math.sin(t * 1.7 + i) * 0.04;
      const mp = maskPos[i].set(K.lerp(mx, fx, maskK), K.lerp(hoverY, faceY, maskK), K.lerp(mz, fz, maskK));
      setMask(i, mp.x, mp.y, mp.z, ry, 1 + (1 - maskK) * 0.5);
      cMask.set(role.mask).getHSL(hsl);
      cMask.setHSL(K.fract(hsl.h + drift * 1.5), hsl.s, hsl.l);
      setMask.color(i, cMask);
    }
    // one actor plays three roles at once: tyrant, benefactor, messenger
    const ty = maskPos[N - 1];
    for (let j = 0; j < 2; j++) {
      const a = t * 1.1 + j * 2.1 + 2.1;
      setMask(N + j, ty.x + Math.cos(a) * 0.22, ty.y + 0.1, ty.z + Math.sin(a) * 0.22, -a, 0.8);
      setMask.color(N + j, j ? '#9affb8' : '#7ab0ff');
    }
    setBody.done();
    setMask.done();
    setDust.done();
    // the dialogue never pauses: beads arc between mask positions
    PAIRS.forEach(([a, c], pi) => {
      const A = maskPos[a], B = maskPos[c];
      for (let j = 0; j < BEADS; j++) {
        const idx = pi * BEADS + j;
        const ph = t * 0.95 + pi * 0.37;
        const vis = j === 0 ? 1 : K.clamp(g * 1.4 - j / BEADS * 0.4);
        if (vis <= 0.01) { setBead(idx, 0, -50, 0, 0, 0); continue; }
        const u = K.fract(ph + j / BEADS);
        const fwd = j === 0 ? Math.floor(ph) % 2 === 0 : j % 2 === 0;
        const k = fwd ? u : 1 - u;
        setBead(idx, K.lerp(A.x, B.x, k), K.lerp(A.y, B.y, k) + Math.sin(Math.PI * k) * 0.28, K.lerp(A.z, B.z, k), 0, vis * (j === 0 ? 1.2 : 0.8));
      }
    });
    setBead.done();
    // the plot grows, older loops fading
    const h = Math.min(NP - 1, Math.floor(1700 + sim * 3));
    if (h !== lastHead) {
      lastHead = h;
      for (let k = 0; k < NP; k++) {
        const f = k > h ? 0 : k < RISE ? 0.9 : 0.22 + 0.95 * Math.pow((k - RISE) / Math.max(1, h - RISE), 2);
        plotCol[k * 3] = f * 2.2; plotCol[k * 3 + 1] = f * 1.55; plotCol[k * 3 + 2] = f * 0.6;
      }
      plotGeo.attributes.color.needsUpdate = true;
      plotGeo.setDrawRange(0, h + 1);
      for (let j = 0; j < OBST; j++) {
        const on = h >= obstIdx[j];
        setObst(j, pts[obstIdx[j] * 3], pts[obstIdx[j] * 3 + 1], pts[obstIdx[j] * 3 + 2], 0, on ? 1 : 0);
      }
      setObst.done();
    }
    head.position.fromArray(pts, h * 3);
    starCore.rotation.y = t * 0.6;
    starGlow.scale.setScalar(3.0 + Math.sin(t * 2.1) * 0.35);
    // stage cues: one colour per act
    const act = Math.floor(sim / 30);
    beams.forEach((m, i) => {
      const u = (m.material as THREE.ShaderMaterial).uniforms;
      u.uOpacity.value = 0.25 * g;
      m.visible = g > 0.01;
      u.uColor.value.set(g > 0.05 ? CUES[(act + i) % CUES.length] : '#ffe0b0');
    });
  };
  update(0, 0);

  return {
    root,
    env: {
      skyTop: '#1b1430',
      skyHorizon: '#b9636e',
      skyBottom: '#3a2440',
      skyCurve: 0.5,
      fog: '#5a3a58',
      fogNear: 70,
      fogFar: 220,
      sunDir: [0.35, 1, 0.55],
      sunColor: '#c6ccff',
      sunIntensity: 1.3,
      sunDisc: 0,
      sunGlow: 0.3,
      moon: { dir: [-0.4, 0.55, -0.7], size: 1.2, color: '#f4ecff' },
      hemiSky: '#8a7ab8',
      hemiGround: '#7a4a40',
      hemiIntensity: 0.85,
      envIntensity: 0.8,
      stars: 0.6,
      clouds: 0.2,
      cloudColor: '#c88090',
      bloomStrength: 0.85,
      bloomThreshold: 0.85,
      bloomRadius: 0.5,
      vignette: 0.45,
      tiltShift: 0.4,
      shadowRadius: 23,
      saturation: 1.05,
    },
    camera: {
      position: [0, 16.9, 28.6],
      target: [0, 3, -2],
      fov: 35,
      minDistance: 10,
      maxDistance: 70,
      autoRotate: 0.15,
      views: [
        { position: [24, 30, 20], target: [0, 4, -2] },
        { position: [5.5, 2.4, 3.2], target: [-1.5, 1.2, -5.5] },
      ],
    },
    interaction: {
      label: 'Across Generations',
      activeLabel: 'One lifetime',
      hint: 'Bodies flicker past; the masks stay where they are.',
      set: (on) => tog.set(on),
    },
    update,
  };
};

export default build;
