import * as THREE from 'three';
import { B, TAU, V, type Col, type Kind } from '../engine/kit';
import type { Gen } from './types';
import { animatedPoints, crowd } from './util';

/** A small emblem: the sign of a trade or a thing, centered at (x, y, z) facing ry. */
function emblem(b: B, type: number, x: number, y: number, z: number, s: number, ry: number, color: Col, kind: Kind = 'gold') {
  const c = Math.cos(ry);
  const sn = Math.sin(ry);
  const P = (u: number, v: number) => V(x + c * u, y + v, z - sn * u);
  switch (type % 10) {
    case 0: // pincers of the tooth drawer
      b.beam(P(-0.3 * s, -0.4 * s), P(0.2 * s, 0.4 * s), 0.04 * s, color, { kind });
      b.beam(P(0.3 * s, -0.4 * s), P(-0.2 * s, 0.4 * s), 0.04 * s, color, { kind });
      break;
    case 1: // tankard of the tavern
      b.cyl(x, y - 0.3 * s, z, 0.22 * s, 0.55 * s, color, { kind, seg: 10 });
      b.torus(x + c * 0.25 * s, y, z - sn * 0.25 * s, 0.13 * s, 0.035 * s, color, { kind, ry: ry, seg: 10 });
      break;
    case 2: // halberds of the guardhouse
      for (const o of [-0.15, 0.15]) {
        b.beam(P(o * s, -0.5 * s), P(o * s, 0.5 * s), 0.025 * s, '#5a4030');
        b.cone(x + c * o * s, y + 0.5 * s, z - sn * o * s, 0.07 * s, 0.25 * s, color, { kind, seg: 4 });
        b.box(x + c * (o + 0.08) * s, y + 0.3 * s, z - sn * (o + 0.08) * s, 0.16 * s, 0.14 * s, 0.03 * s, color, { kind, ry });
      }
      break;
    case 3: // scales of the market
      b.beam(P(0, -0.4 * s), P(0, 0.35 * s), 0.025 * s, color, { kind });
      b.beam(P(-0.35 * s, 0.3 * s), P(0.35 * s, 0.3 * s), 0.02 * s, color, { kind });
      b.cone(x + c * -0.35 * s, y, z - sn * -0.35 * s, 0.14 * s, 0.1 * s, color, { kind, rx: Math.PI, seg: 8 });
      b.cone(x + c * 0.35 * s, y, z - sn * 0.35 * s, 0.14 * s, 0.1 * s, color, { kind, rx: Math.PI, seg: 8 });
      break;
    case 4: // a key
      b.torus(x + c * -0.25 * s, y, z - sn * -0.25 * s, 0.13 * s, 0.035 * s, color, { kind, ry, seg: 10 });
      b.beam(P(-0.12 * s, 0), P(0.4 * s, 0), 0.03 * s, color, { kind });
      b.box(x + c * 0.33 * s, y - 0.12 * s, z - sn * 0.33 * s, 0.05 * s, 0.14 * s, 0.03 * s, color, { kind, ry });
      break;
    case 5: // a boot for the cobbler
      b.box(x, y - 0.4 * s, z, 0.2 * s, 0.55 * s, 0.14 * s, color, { kind, ry });
      b.box(x + c * 0.1 * s, y - 0.4 * s, z - sn * 0.1 * s, 0.4 * s, 0.16 * s, 0.14 * s, color, { kind, ry });
      break;
    case 6: // an eye
      b.sphere(x, y, z, 0.3 * s, color, { kind, sy: 0.5, seg: 10, ry });
      b.sphere(x + sn * 0.12 * s, y, z + c * 0.12 * s, 0.12 * s, '#1a1a2a', { seg: 8 });
      break;
    case 7: // a fish for the fishmonger
      b.sphere(x, y, z, 0.3 * s, color, { kind, sy: 0.45, seg: 8, ry, rz: 0 });
      b.cone(x + c * -0.35 * s, y, z - sn * -0.35 * s, 0.15 * s, 0.2 * s, color, { kind, seg: 4, rz: Math.PI / 2, ry });
      break;
    case 8: // a star for the astrologer
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU;
        b.beam(P(0, 0), P(Math.sin(a) * 0.4 * s, Math.cos(a) * 0.4 * s), 0.04 * s, color, { kind });
      }
      break;
    case 9: // scissors of the tailor
      b.torus(x + c * -0.2 * s, y - 0.25 * s, z - sn * -0.2 * s, 0.09 * s, 0.03 * s, color, { kind, ry, seg: 8 });
      b.torus(x + c * 0.2 * s, y - 0.25 * s, z - sn * 0.2 * s, 0.09 * s, 0.03 * s, color, { kind, ry, seg: 8 });
      b.beam(P(-0.15 * s, -0.17 * s), P(0.2 * s, 0.45 * s), 0.025 * s, color, { kind });
      b.beam(P(0.15 * s, -0.17 * s), P(-0.2 * s, 0.45 * s), 0.025 * s, color, { kind });
      break;
  }
}

// ---------------------------------------------------------------- Tamara
// Streets thick with signboards: the eye sees images of things that mean other things.
const tamara: Gen = (b, ctx) => {
  b.ground(11.6, '#a89272');
  // a winding main street and side lanes
  const street: THREE.Vector3[] = [];
  for (let k = 0; k <= 24; k++) {
    const u = k / 24;
    street.push(V(-10 + u * 20, 0, Math.sin(u * TAU * 0.8) * 2.5));
  }
  const em = b.sub();
  let type = 0;
  for (let k = 0; k < street.length - 1; k++) {
    const p = street[k];
    const q = street[k + 1];
    const ang = Math.atan2(q.x - p.x, q.z - p.z);
    const nx = Math.cos(ang);
    const nz = -Math.sin(ang);
    b.box((p.x + q.x) / 2, 0, (p.z + q.z) / 2, 1.6, 0.03, p.distanceTo(q) + 0.1, '#d6c6a4', { ry: ang });
    for (const side of [-1, 1]) {
      const x = p.x + nx * side * 1.7;
      const z = p.z + nz * side * 1.7;
      if (Math.hypot(x, z) > 10.6) continue;
      const h = 1.6 + b.r(1.8);
      b.house(x, z, 0.9, 1.4, h, { ry: ang, wall: b.jit('#dcc8a2'), roof: b.jit('#8a5038'), roofType: 'gable', lit: 0.3 });
      // bracket and signboard
      const bx = x - nx * side * 0.6;
      const bz = z - nz * side * 0.6;
      b.beam(V(x - nx * side * 0.45, h * 0.75, z - nz * side * 0.45), V(bx - nx * side * 0.4, h * 0.75, bz - nz * side * 0.4), 0.025, '#2a2420');
      emblem(em, type++, bx - nx * side * 0.35, h * 0.75 - 0.42, bz - nz * side * 0.35, 0.75, ang + Math.PI / 2, b.pick(['#e8b04a', '#d0d8e0', '#c0603a', '#e8e0d0']), 'gold');
    }
  }
  // the back lanes are crowded too
  for (let k = 0; k < 40; k++) {
    const a = b.r(TAU);
    const r = b.r(4.5, 10.5);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    let near = false;
    for (const s of street) if (Math.hypot(s.x - x, s.z - z) < 2.5) near = true;
    if (near) continue;
    const h = 1.2 + b.r(1.8);
    b.house(x, z, 1.1, 1.1, h, { ry: b.r(TAU), wall: b.jit('#d8c4a0'), roof: b.jit('#8a5038'), roofType: 'hip', lit: 0.3 });
    emblem(em, type++, x, h + 0.9, z, 0.7, b.r(TAU), '#e8b04a', 'gold');
  }
  // above the roofs, the great floating signs that stand for other things
  const sky = b.sub({ y: 0 });
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU;
    emblem(sky, k, Math.cos(a) * 6, 6.5 + (k % 3) * 0.8, Math.sin(a) * 6, 1.8, -a, ctx.accent, 'glow');
  }
  sky.on((t) => (sky.group.rotation.y = t * 0.05));
  // passers-by who read and do not see
  const people = crowd(b, 14, (i) => ['#3a3a4a', '#6a3a3a', '#3a5a4a'][i % 3]);
  b.on((t) => {
    for (let k = 0; k < 14; k++) {
      const u = ((t * 0.02 + k / 14) % 1) * (street.length - 1);
      const i0 = Math.floor(u);
      const f = u - i0;
      const p = street[i0];
      const q = street[Math.min(i0 + 1, street.length - 1)];
      const off = k % 2 ? 0.35 : -0.35;
      people.set(k, p.x + (q.x - p.x) * f, 0.03, p.z + (q.z - p.z) * f + off, 1);
    }
    people.commit();
  });
};

// ---------------------------------------------------------------- Zirma
// A redundant city: everything repeats so that it can be remembered. Airships pass the windows.
const zirma: Gen = (b, ctx) => {
  b.ground(11.6, '#8a8680');
  const lit = '#ffe0a0';
  // twinned skyscrapers, each tower has its double
  const towers: [number, number, number, number, string][] = [];
  for (let k = 0; k < 11; k++) {
    const x = b.r(1.2, 8.5);
    const z = b.r(-8, 8);
    if (Math.hypot(x, z) > 9.5) continue;
    towers.push([x, z, 0.9 + b.r(0.8), 2 + b.r(6.5), b.pick(['#a8a49c', '#c8bca8', '#8a8c94', '#b8a48a'])]);
  }
  for (const [x, z, w, h, c] of towers) {
    for (const s of [1, -1]) {
      b.box(x * s, 0, z, w, h, w, c);
      b.box(x * s, h, z, w * 1.12, 0.12, w * 1.12, '#e8e0d0');
      b.windows(x * s, 0, z, w, w, h, 0, lit, 0.45, 0.13);
    }
  }
  // the lunatic teetering on the cornice of the tallest
  const tall = towers.reduce((a, t) => (t[3] > a[3] ? t : a), towers[0]);
  for (const s of [1, -1]) b.figure(tall[0] * s + tall[2] * 0.45, tall[3] + 0.12, tall[1], 0.9, '#c03030');
  // the blind man in the crowd, the girl with the puma
  for (const s of [1, -1]) {
    b.figure(0.6 * s, 0, 4, 1.1, '#2a2a2a');
    b.figure(0.4 * s, 0, -3.2, 1, '#e0e0f0');
    b.sphere(0.8 * s, 0.22, -3.2, 0.2, '#c8a060', { sy: 0.6, seg: 7 });
    b.sphere(1.0 * s, 0.32, -3.2, 0.1, '#c8a060', { seg: 6 });
  }
  // the central axis of repetition: a mirror line
  b.box(0, 0, 0, 0.06, 0.04, 20, ctx.accent, { kind: 'glow', i: 1.2 });
  // airships in every direction, just beyond the windows
  const ship = (s: B, x: number, y: number, z: number, ry: number, col: string) => {
    const c = Math.cos(ry);
    const sn = Math.sin(ry);
    s.sphere(x, y, z, 0.5, col, { sz: 2.4, ry, seg: 14 });
    s.box(x, y - 0.62, z, 0.22, 0.18, 0.7, '#5a4030', { ry });
    s.box(x, y - 0.56, z, 0.24, 0.06, 0.74, '#ffd890', { ry, kind: 'glow', i: 1.2 });
    for (const sd of [-1, 1]) s.box(x - sn * 1.0 + c * sd * 0.3, y, z - c * 1.0 - sn * sd * 0.3, 0.04, 0.4, 0.4, '#8a3020', { ry });
    s.box(x - sn * 1.0, y + 0.3, z - c * 1.0, 0.04, 0.4, 0.4, '#8a3020', { ry });
  };
  const fleetA = b.sub();
  const fleetB = b.sub();
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU;
    ship(fleetA, Math.cos(a) * 7, 5 + k * 0.9, Math.sin(a) * 7, -a, b.pick(['#e8dcc0', '#d0b890', '#c0c8d0']));
    ship(fleetB, Math.cos(a + 0.6) * 4.5, 8 + k * 0.6, Math.sin(a + 0.6) * 4.5, -a - 0.6 + Math.PI, b.pick(['#e8c0a0', '#d8d0c0']));
  }
  b.on((t) => {
    fleetA.group.rotation.y = t * 0.07;
    fleetB.group.rotation.y = -t * 0.05;
  });
  ctx.view.elev = 0.35;
  ctx.view.ty = 4;
};

// ---------------------------------------------------------------- Zoe
// The place of indivisible existence: any building could be anything.
const zoe: Gen = (b, ctx) => {
  b.ground(11.6, '#b8ad9a');
  const S = 1.45;
  const cells: THREE.Vector3[] = [];
  for (let i = -7; i <= 7; i++)
    for (let j = -7; j <= 7; j++) {
      const x = i * S;
      const z = j * S;
      const d = Math.hypot(x, z);
      if (d > 10.6) continue;
      cells.push(V(x, d, z));
    }
  // identical houses; the edge of the city dissolves, inside and outside cannot be told apart
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const roof = new THREE.ConeGeometry(0.72, 0.5, 4).rotateY(Math.PI / 4).translate(0, 1.25, 0);
  const merged = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#e6dccb', roughness: 0.8 }), cells.length);
  const roofs = new THREE.InstancedMesh(roof, new THREE.MeshStandardMaterial({ color: '#b07050', roughness: 0.8 }), cells.length);
  const glows = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.42, 1.02).translate(0, 0.35, 0), new THREE.MeshBasicMaterial({ toneMapped: false }), cells.length);
  merged.castShadow = roofs.castShadow = true;
  merged.receiveShadow = true;
  const m = new THREE.Matrix4();
  cells.forEach((p, k) => {
    const s = p.y > 9 ? 0.55 : 0.9;
    m.compose(V(p.x, 0, p.z), new THREE.Quaternion(), V(s, s, s));
    merged.setMatrixAt(k, m);
    roofs.setMatrixAt(k, m);
    m.compose(V(p.x, 0, p.z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), (k % 4) * (Math.PI / 2)), V(s * 1.02, s, s));
    glows.setMatrixAt(k, m);
    glows.setColorAt(k, new THREE.Color('#fff'));
  });
  b.group.add(merged, roofs, glows);
  // every door glows with a use that keeps changing: palace, harem, school, prison, market, temple...
  const uses = ['#ffd27a', '#ff7a8a', '#8ad0ff', '#a0ff9a', '#d29aff', '#ffffff', '#ffaa55'].map((c) => new THREE.Color(c).multiplyScalar(1.5));
  const tmp = new THREE.Color();
  b.on((t) => {
    for (let k = 0; k < cells.length; k++) {
      const v = t * 0.25 + Math.sin(k * 12.9898) * 43.0;
      const i0 = Math.floor(v) % uses.length;
      const i1 = (i0 + 1) % uses.length;
      const f = THREE.MathUtils.smoothstep(v - Math.floor(v), 0.7, 1);
      tmp.copy(uses[(i0 + uses.length) % uses.length]).lerp(uses[(i1 + uses.length) % uses.length], f);
      glows.setColorAt(k, tmp);
    }
    glows.instanceColor!.needsUpdate = true;
  });
  // the question: where does the city end? a faint boundary that is not there
  b.ring(0, 0.02, 0, 10.9, 11.1, ctx.accent, { kind: 'ghost', seg: 64 });
  ctx.view.elev = 0.62;
};

// ---------------------------------------------------------------- Hypatia
// Marble palaces and a clear lagoon; every sign points somewhere unexpected.
const hypatia: Gen = (b, ctx) => {
  // the lagoon
  const lag = new THREE.CircleGeometry(11.6, 48, Math.PI * 0.15, Math.PI * 0.9).rotateX(-Math.PI / 2);
  b.add(lag, new THREE.Matrix4().makeTranslation(0, 0.02, 0), '#8ae0e8', 'glass');
  const land = new THREE.CircleGeometry(11.6, 48, Math.PI * 1.05, Math.PI * 1.1).rotateX(-Math.PI / 2);
  b.add(land, new THREE.Matrix4().makeTranslation(0, 0.01, 0), '#d8cdb8');
  b.cyl(0, -0.3, 0, 11.6, 0.24, '#c8bca6', { seg: 48 });
  // crabs at the bottom of the clear water
  for (let k = 0; k < 16; k++) {
    const a = b.r(Math.PI * 0.25, Math.PI * 0.95);
    const r = b.r(3, 10);
    const x = Math.cos(a) * r;
    const z = -Math.sin(a) * r;
    b.sphere(x, -0.1, z, 0.16, '#d0503a', { sy: 0.4, seg: 6 });
  }
  // marble porticoes along the shore
  let prev: THREE.Vector3 | null = null;
  for (let k = 0; k < 18; k++) {
    const a = Math.PI * 1.1 + (k / 17) * Math.PI * 0.8;
    const x = Math.cos(a) * 3.2;
    const z = -Math.sin(a) * 3.2;
    b.cyl(x, 0, z, 0.14, 2.2, '#f4efe6', { seg: 10 });
    const top = V(x, 2.3, z);
    if (prev) b.beam(prev, top, 0.16, '#ece6da', { seg: 4 });
    prev = top;
  }
  // palaces
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * 1.1 + (k / 8) * Math.PI * 0.8;
    const r = 6 + (k % 2) * 2.2;
    const x = Math.cos(a) * r;
    const z = -Math.sin(a) * r;
    const h = 1.5 + b.r(1.5);
    b.house(x, z, 2, 1.4, h, { ry: Math.PI / 2 - a, wall: '#f0ebe0', roof: '#d8d0c0', roofType: 'flat', lit: 0.4 });
    for (let c = -2; c <= 2; c++) b.cyl(x + Math.sin(a) * c * 0.38 - Math.cos(a) * 0.85, 0, z + Math.cos(a) * c * 0.38 + Math.sin(a) * 0.85, 0.07, h, '#fbf8f2', { seg: 8 });
    b.prism(x, h, z, 1.6, 0.5, 2.1, '#f0ebe0', { ry: Math.PI / 2 - a + Math.PI / 2 });
  }
  // the round library: philosophers inside? no, children playing on the steps
  b.cyl(-1.5, 0, 1.5, 1.6, 0.4, '#e8e2d6', { seg: 20 });
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    b.cyl(-1.5 + Math.cos(a) * 1.3, 0.4, 1.5 + Math.sin(a) * 1.3, 0.09, 1.8, '#fbf8f2', { seg: 8 });
  }
  b.dome(-1.5, 2.2, 1.5, 1.5, '#e0d8c8', { seg: 18 });
  for (let k = 0; k < 4; k++) b.figure(-1.5 + Math.cos(k * 1.6) * 2, 0, 1.5 + Math.sin(k * 1.6) * 2, 0.7, ['#e05a3a', '#3a8ae0', '#e0c03a'][k % 3]);
  // signposts, each pointing the wrong way, turning
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * 1.15 + (k / 8) * Math.PI * 0.75;
    const r = 4.6 + (k % 3) * 0.9;
    const post = b.sub({ x: Math.cos(a) * r, z: -Math.sin(a) * r });
    post.cyl(0, 0, 0, 0.04, 2, '#4a3a2a', { seg: 5 });
    for (let j = 0; j < 3; j++) {
      const ry = j * 2.1;
      const c = Math.cos(ry);
      const s = Math.sin(ry);
      post.box(c * 0.35, 1.3 + j * 0.25, -s * 0.35, 0.7, 0.16, 0.03, j === 1 ? ctx.accent : '#e8dcc0', { ry, kind: j === 1 ? 'glow' : 'solid', i: 0.8 });
      post.cone(c * 0.75, 1.38 + j * 0.25, -s * 0.75, 0.1, 0.16, j === 1 ? ctx.accent : '#e8dcc0', { rz: -Math.PI / 2, ry, seg: 3, kind: j === 1 ? 'glow' : 'solid' });
    }
    const ph = b.r(10);
    post.on((t) => {
      const step = Math.floor(t * 0.25 + ph);
      const target = Math.sin(step * 91.7) * 3;
      post.group.rotation.y += (target - post.group.rotation.y) * 0.04;
    });
  }
  // girls riding horses in the stables
  for (let k = 0; k < 3; k++) {
    const x = 7.5 - k * 1.2;
    const z = 5.5 + k * 0.6;
    if (Math.hypot(x, z) > 10.5) continue;
    b.sphere(x, 0.75, z, 0.35, '#7a4a2a', { sy: 0.55, seg: 8 });
    b.sphere(x + 0.4, 1.0, z, 0.14, '#7a4a2a', { seg: 6 });
    for (const [lx, lz] of [[0.2, 0.1], [0.2, -0.1], [-0.2, 0.1], [-0.2, -0.1]]) b.cyl(x + lx, 0, z + lz, 0.04, 0.65, '#6a3a1a', { seg: 4 });
    b.figure(x, 0.9, z, 0.7, '#f0f0f0');
  }
  ctx.view.yaw = -0.6;
  ctx.view.elev = 0.5;
};

// ---------------------------------------------------------------- Olivia
// Filigree palaces and peacocks in the words; soot and grease in the things.
const olivia: Gen = (b, ctx) => {
  b.ground(11.6, '#4a4440');
  // behind: the factories, soot black
  const smokeSrc: THREE.Vector3[] = [];
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * 1.15 + (k / 8) * Math.PI * 0.7;
    const r = 7 + (k % 2) * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = 1.5 + b.r(1.5);
    b.box(x, 0, z, 2.2, h, 1.6, b.jit('#3a3634', 0.01, 0.05, 0.05), { ry: -a });
    for (let s = 0; s < 3; s++) b.prism(x + Math.cos(-a) * (s - 1) * 0.7, h, z - Math.sin(-a) * (s - 1) * 0.7, 0.7, 0.45, 1.6, '#2c2826', { ry: -a });
    const cx = x + 0.6;
    b.cyl(cx, 0, z, 0.22, h + 2.6, '#4a3e38', { seg: 8, rt: 0.8 });
    smokeSrc.push(V(cx, h + 2.7, z));
    b.windows(x, 0, z, 2.2, 1.6, h, -a, '#ff8a3a', 0.4);
  }
  const N = smokeSrc.length * 12;
  const sm: THREE.Vector3[] = Array.from({ length: N }, () => V(0, 0, 0));
  const seeds = Array.from({ length: N }, () => b.r(1));
  const smoke = animatedPoints(b, sm, () => '#20181a', 1.4, () => 1);
  smoke.on((t) => {
    const pts = smoke.points;
    if (!pts) return;
    (pts.material as THREE.PointsMaterial).blending = THREE.NormalBlending;
    (pts.material as THREE.PointsMaterial).opacity = 0.55;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < N; k++) {
      const s = smokeSrc[k % smokeSrc.length];
      const u = (t * 0.07 + seeds[k]) % 1;
      pos.setXYZ(k, s.x + u * 5, s.y + u * 3.5, s.z + u * 3 + Math.sin(u * 5 + k) * 0.5);
    }
    pos.needsUpdate = true;
  });
  // in front: the words. Filigree palaces of gold lace
  for (let k = 0; k < 4; k++) {
    const x = -4.5 + k * 3;
    const z = 3 + (k % 2) * 1.5;
    const h = 2.4 + (k % 2) * 0.8;
    b.box(x, 0, z, 2.4, h, 1.6, '#f2e8d4');
    for (let c = 0; c < 3; c++) b.arch(x - 0.8 + c * 0.8, 0, z + 0.81, 0.62, h * 0.5, 0.06, '#d9a441', { kind: 'gold' });
    b.dome(x, h, z, 0.75, '#d9a441', { kind: 'gold', seg: 16 });
    b.cone(x, h + 0.7, z, 0.06, 0.6, '#d9a441', { kind: 'gold', seg: 5 });
    // lacework lines over the facade
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 6; j++) {
        const px = x - 1.1 + i * 0.31;
        const py = h * 0.55 + j * ((h * 0.42) / 6);
        b.line(V(px, py, z + 0.82), V(px + 0.15, py + 0.1, z + 0.82), '#ffcf6a', 1.4);
        b.line(V(px + 0.15, py + 0.1, z + 0.82), V(px + 0.3, py, z + 0.82), '#ffcf6a', 1.4);
      }
    b.windows(x, 0, z, 2.4, 1.6, h, 0, '#ffe2a0', 0.5);
  }
  // peacocks in the gardens
  const peacock = (x: number, z: number, ry: number) => {
    b.sphere(x, 0.3, z, 0.14, '#1a5aa0', { sy: 1.2, seg: 8 });
    b.cyl(x + Math.sin(ry) * 0.06, 0.4, z + Math.cos(ry) * 0.06, 0.03, 0.25, '#1a5aa0', { seg: 4 });
    b.sphere(x + Math.sin(ry) * 0.06, 0.68, z + Math.cos(ry) * 0.06, 0.05, '#1a5aa0', { seg: 5 });
    const fan = new THREE.CircleGeometry(0.6, 16, 0, Math.PI);
    b.add(fan, new THREE.Matrix4().compose(V(x - Math.sin(ry) * 0.12, 0.25, z - Math.cos(ry) * 0.12), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, ry, 0)), V(1, 1, 1)), '#1f8a6a', 'cloth');
    for (let k = 0; k < 7; k++) {
      const a = (k / 6) * Math.PI;
      b.sphere(x - Math.sin(ry) * 0.13 + Math.cos(a) * 0.48 * Math.cos(ry), 0.25 + Math.sin(a) * 0.48, z - Math.cos(ry) * 0.13 - Math.cos(a) * 0.48 * Math.sin(ry), 0.05, '#ffd24a', { kind: 'glow', i: 1.2, seg: 5 });
    }
  };
  for (let k = 0; k < 5; k++) peacock(-4 + k * 2, 6.8 + (k % 2) * 0.8, b.r(-0.5, 0.5));
  // trucks in the narrow street between words and things
  b.box(0, 0, 0.5, 18, 0.03, 1.6, '#2a2624');
  for (let k = 0; k < 3; k++) {
    const truck = b.sub();
    truck.box(0, 0.1, 0.5, 1.4, 0.8, 0.7, '#5a4a3a');
    truck.box(0.9, 0.1, 0.5, 0.5, 0.6, 0.65, '#6a5a4a');
    truck.on((t) => (truck.group.position.x = ((t * 1.2 + k * 6) % 18) - 9));
  }
  ctx.view.yaw = 0.15;
  ctx.view.elev = 0.42;
};

export const signs: Record<string, Gen> = { tamara, zirma, zoe, hypatia, olivia };
