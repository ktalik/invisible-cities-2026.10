import * as THREE from 'three';
import { B, TAU, V, clamp, smooth } from '../engine/kit';
import type { Gen } from './types';
import { animatedPoints, crowd, dynamicLines, rock, wordSprite } from './util';

// ---------------------------------------------------------------- Euphemia
// Merchants of seven nations; at night by the fires each says a word, and the stories go round.
const euphemia: Gen = (b, ctx) => {
  b.ground(11.6, '#b89a70');
  const nations = ['#c0392b', '#2a7ab0', '#e0a030', '#3a9a6a', '#8a4ab0', '#e07a4a', '#e8e0d0'];
  // seven roads converging on the market
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU;
    b.box(Math.cos(a) * 6.5, 0.005, Math.sin(a) * 6.5, 1.1, 0.02, 10, '#cdb48a', { ry: Math.PI / 2 - a });
  }
  // a river through the market, with boats
  b.box(0, 0.01, -8.4, 15.6, 0.04, 1.8, '#2c6a80', { kind: 'water' });
  for (let k = 0; k < 4; k++) {
    const x = -6 + k * 4;
    b.box(x, 0.05, -8.4, 1.3, 0.25, 0.5, '#6a4a2a');
    b.cyl(x, 0.3, -8.4, 0.03, 1.2, '#4a3a2a', { seg: 4 });
    b.box(x + 0.1, 0.5, -8.4, 0.6, 0.7, 0.02, nations[k], { kind: 'cloth' });
  }
  // tents of the seven nations
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU + TAU / 14;
    for (let j = 0; j < 4; j++) {
      const r = 4.6 + j * 1.5;
      const aa = a + b.r(-0.18, 0.18);
      const x = Math.cos(aa) * r;
      const z = Math.sin(aa) * r;
      if (z < -7) continue;
      if (j % 2) b.cone(x, 0, z, 0.75, 1.5, b.jit(nations[k], 0.01, 0.05, 0.08), { seg: 8, kind: 'cloth' });
      else b.prism(x, 0, z, 1.3, 1.1, 1.6, b.jit(nations[k], 0.01, 0.05, 0.08), { ry: -aa, kind: 'cloth' });
      // sacks and barrels
      b.sphere(x + 0.7, 0.2, z + 0.3, 0.22, '#c8a878', { sy: 1.1, seg: 6 });
      b.cyl(x - 0.6, 0, z + 0.5, 0.18, 0.4, '#7a5a3a', { seg: 8 });
    }
  }
  // camels resting
  for (let k = 0; k < 5; k++) {
    const a = b.r(TAU);
    const r = b.r(8.5, 10.5);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (z < -7) continue;
    b.sphere(x, 0.35, z, 0.4, '#b8865a', { sy: 0.55, seg: 8 });
    b.sphere(x, 0.62, z, 0.22, '#b8865a', { seg: 7 });
    b.sphere(x + 0.45, 0.6, z, 0.12, '#b8865a', { seg: 6 });
  }
  // fires in the market, and the circles around them
  const fires = [V(0, 0, 0), V(2.4, 0, 1.5), V(-2.2, 0, 1.8), V(0.4, 0, -2.6)];
  const embers: THREE.Vector3[] = [];
  const seeds: [number, number, number][] = [];
  const people = crowd(b, fires.length * 7, (i) => nations[i % 7]);
  fires.forEach((f, fi) => {
    b.cyl(f.x, 0, f.z, 0.45, 0.08, '#4a4040', { seg: 10 });
    for (let k = 0; k < 6; k++) b.beam(V(f.x + Math.cos(k) * 0.4, 0.05, f.z + Math.sin(k) * 0.4), V(f.x, 0.4, f.z), 0.03, '#3a2a1a');
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * TAU;
      b.cyl(f.x + Math.cos(a) * 1.2, 0, f.z + Math.sin(a) * 1.2, 0.18, 0.25, '#8a6a42', { seg: 6 });
      people.set(fi * 7 + k, f.x + Math.cos(a) * 1.2, 0.18, f.z + Math.sin(a) * 1.2, 0.8, -a);
    }
    for (let k = 0; k < 24; k++) {
      embers.push(f.clone());
      seeds.push([b.r(1), b.r(-1, 1), b.r(-1, 1)]);
    }
  });
  people.commit();
  const flames = b.sub({ unique: true });
  fires.forEach((f) => {
    flames.cone(f.x, 0.05, f.z, 0.32, 0.9, '#ff9a3a', { kind: 'glow', i: 2.2, seg: 7 });
    flames.cone(f.x, 0.05, f.z, 0.18, 1.25, '#ffd27a', { kind: 'glow', i: 2.6, seg: 6 });
  });
  flames.on((t) => {
    flames.group.scale.y = 1 + Math.sin(t * 9) * 0.08 + Math.sin(t * 13.7) * 0.05;
  });
  const em = animatedPoints(b, embers, () => '#ffb050', 0.18, (i, t) => 1.6 * (1 - ((t * 0.4 + seeds[i][0]) % 1)));
  em.on((t) => {
    const pos = em.points?.geometry.attributes.position as THREE.BufferAttribute;
    if (!pos) return;
    for (let k = 0; k < embers.length; k++) {
      const f = fires[Math.floor(k / 24)];
      const [ph, dx, dz] = seeds[k];
      const u = (t * 0.4 + ph) % 1;
      pos.setXYZ(k, f.x + dx * u * 0.7 + Math.sin(u * 9 + k) * 0.1, 0.4 + u * 3.5, f.z + dz * u * 0.7);
    }
    pos.needsUpdate = true;
  });
  // the words that start the stories, rising with the smoke
  const words = ['wolf', 'sister', 'hidden treasure', 'battle', 'scabies', 'lovers', 'a ship', 'the well', 'a stranger', 'the desert', 'a key', 'mother'];
  const sprites = words.map((w, i) => {
    const s = wordSprite(w, '#ffe2b0', 0.75);
    s.userData.f = fires[i % fires.length];
    s.userData.ph = i / words.length;
    b.group.add(s);
    return s;
  });
  b.on((t) => {
    for (const s of sprites) {
      const u = (t * 0.045 + s.userData.ph) % 1;
      const f = s.userData.f as THREE.Vector3;
      s.position.set(f.x + Math.sin(u * 4 + s.userData.ph * 20) * 0.6, 1.6 + u * 6.5, f.z);
      (s.material as THREE.SpriteMaterial).opacity = smooth(clamp(u * 5, 0, 1)) * (1 - smooth(clamp((u - 0.6) * 2.5, 0, 1)));
    }
  });
  ctx.view.elev = 0.45;
  ctx.view.ty = 2.4;
};

// ---------------------------------------------------------------- Chloe
// Strangers who never speak; their glances weave lines, stars and triangles across the squares.
const chloe: Gen = (b, ctx) => {
  b.ground(11.6, '#c8bca6');
  // two squares and an arcade street
  b.cyl(-2.8, 0, -1.2, 4.2, 0.04, '#e4dac6', { seg: 40 });
  b.cyl(3.6, 0, 2.6, 3.2, 0.04, '#e4dac6', { seg: 40 });
  for (let k = 0; k < 30; k++) {
    const a = (k / 30) * TAU;
    const r = 9.6;
    b.house(Math.cos(a) * r, Math.sin(a) * r, 1.5, 1.4, 1.6 + b.r(1.6), { ry: -a + Math.PI / 2, wall: b.jit('#e8dcc4'), roof: b.jit('#a86a4a'), roofType: 'hip', lit: 0.4 });
  }
  // arcades around the main square
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * TAU;
    const x = -2.8 + Math.cos(a) * 4.6;
    const z = -1.2 + Math.sin(a) * 4.6;
    b.cyl(x, 0, z, 0.1, 1.8, '#f0e8d8', { seg: 8 });
  }
  b.torus(-2.8, 1.85, -1.2, 4.6, 0.12, '#e8dcc4', { rx: Math.PI / 2, seg: 48, tube: 4 });
  b.cyl(-2.8, 0, -1.2, 0.6, 0.6, '#d8ccb6', { seg: 16 });
  b.cyl(-2.8, 0.6, -1.2, 0.1, 1.2, '#d8ccb6', { seg: 8 });
  // strangers
  const N = 26;
  const walkers = crowd(b, N, (i) => ['#3a3a5a', '#7a3a3a', '#3a6a5a', '#8a7a4a', '#5a3a6a'][i % 5]);
  const st = Array.from({ length: N }, (_, i) => ({
    cx: i % 2 ? -2.8 : 3.6,
    cz: i % 2 ? -1.2 : 2.6,
    r: i % 2 ? b.r(0.8, 3.8) : b.r(0.6, 2.8),
    sp: b.r(0.05, 0.16) * (b.chance(0.5) ? 1 : -1),
    ph: b.r(TAU),
    w: b.r(0.5, 1.5),
  }));
  const pos = st.map(() => V(0, 0, 0));
  const lines = dynamicLines(b, 200, 0.9);
  const col = new THREE.Color(ctx.accent).multiplyScalar(1.4);
  b.on((t) => {
    st.forEach((s, i) => {
      const a = s.ph + t * s.sp;
      const r = s.r + Math.sin(t * s.w * 0.3 + i) * 0.5;
      pos[i].set(s.cx + Math.cos(a) * r, 0.02, s.cz + Math.sin(a * (1 + 0.1 * s.w)) * r);
      walkers.set(i, pos[i].x, pos[i].y, pos[i].z, 1, -a);
    });
    walkers.commit();
    lines.begin();
    for (let i = 0; i < N; i++)
      for (let j = i + 1; j < N; j++) {
        const d = pos[i].distanceTo(pos[j]);
        if (d > 5.5) continue;
        // each glance flickers on for a moment
        const g = Math.sin(t * 0.7 + i * 1.7 + j * 2.3);
        if (g < 0.55) continue;
        const k = (g - 0.55) / 0.45;
        lines.seg(pos[i].x, 0.62, pos[i].z, pos[j].x, 0.62, pos[j].z, col.r * k, col.g * k, col.b * k);
      }
    lines.end();
  });
  ctx.view.elev = 0.6;
  ctx.view.dist = 28;
};

// ---------------------------------------------------------------- Eutropia
// Many identical cities on a plain; only one is inhabited at a time, and life moves on to the next.
const eutropia: Gen = (b, ctx) => {
  b.ground(11.6, '#8a9a62');
  // fields
  for (let k = 0; k < 18; k++) b.box(b.r(-9, 9), 0.005, b.r(-9, 9), b.r(1, 3), 0.01, b.r(1, 3), b.jit('#9aaa6a', 0.03, 0.1, 0.08), { ry: b.r(TAU) });
  const centers: THREE.Vector3[] = [V(0, 0, 0)];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.3;
    centers.push(V(Math.cos(a) * 6.6, 0, Math.sin(a) * 6.6));
  }
  const glows: THREE.MeshBasicMaterial[] = [];
  // the same little city, again and again
  const proto: [number, number, number, number, number][] = [];
  for (let k = 0; k < 11; k++) proto.push([b.r(-1.4, 1.4), b.r(-1.4, 1.4), 0.4 + b.r(0.3), 0.4 + b.r(0.3), 0.4 + b.r(0.8)]);
  centers.forEach((c) => {
    const s = b.sub({ unique: true, x: c.x, z: c.z });
    s.cyl(0, 0, 0, 2.1, 0.05, '#c8b896', { seg: 20 });
    s.cyl(0, 0, 0, 2.1, 0.3, '#a89878', { seg: 20, open: true });
    for (const [x, z, w, d, h] of proto) s.house(x, z, w, d, h, { wall: '#e0d0b0', roof: '#a85a3a', roofType: 'hip', lit: 0.9, roofH: 0.25 });
    s.tower(0.3, -0.3, 0.2, 1.6, '#e0d0b0', { cap: 'cone', capColor: '#a85a3a' });
    glows.push(s.mats.glow);
    s.mats.glow.transparent = true;
  });
  // roads between them
  for (let k = 1; k < centers.length; k++) b.box(centers[k].x / 2, 0.01, centers[k].z / 2, 0.3, 0.02, 4.4, '#c8b48a', { ry: Math.atan2(centers[k].x, centers[k].z) });
  // the moving population: a stream of lights going from city to city
  const M = 40;
  const mv: THREE.Vector3[] = Array.from({ length: M }, () => V(0, -5, 0));
  const movers = animatedPoints(b, mv, () => '#ffe0a0', 0.35, () => 1.6);
  const PERIOD = 9;
  b.on((t) => {
    const cycle = t / PERIOD;
    const cur = Math.floor(cycle) % centers.length;
    const nxt = (cur + 1) % centers.length;
    const f = cycle - Math.floor(cycle);
    glows.forEach((m, i) => {
      let v = 0.03;
      if (i === cur) v = 1 - smooth(clamp((f - 0.7) / 0.3, 0, 1)) * 0.97;
      if (i === nxt) v = Math.max(v, smooth(clamp((f - 0.85) / 0.15, 0, 1)));
      m.opacity = v;
    });
    const pos = movers.points?.geometry.attributes.position as THREE.BufferAttribute;
    if (!pos) return;
    const a = centers[cur];
    const c = centers[nxt];
    for (let k = 0; k < M; k++) {
      const u = clamp((f - 0.68) / 0.3 - (k / M) * 0.4, 0, 1);
      const on = u > 0 && u < 1;
      const off = Math.sin(k * 7.3) * 0.5;
      pos.setXYZ(k, a.x + (c.x - a.x) * u + off, on ? 0.25 + Math.sin(u * Math.PI) * 0.6 : -5, a.z + (c.z - a.z) * u + Math.cos(k * 3.1) * 0.5);
    }
    pos.needsUpdate = true;
  });
  ctx.view.elev = 0.62;
};

// ---------------------------------------------------------------- Ersilia
// Strings of kinship, trade and authority; when they thicken, the people leave and the webs remain.
const ersilia: Gen = (b, ctx) => {
  b.ground(11.6, '#9a8a6a');
  const colors = ['#f4f0e8', '#2a2626', '#9a9894'];
  const web = (cx: number, cz: number, R: number, withHouses: boolean, density: number) => {
    const corners: THREE.Vector3[] = [];
    const n = withHouses ? 9 : 10;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + b.r(0.3);
      const r = R * (0.45 + b.r(0.55));
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      const h = 1.1 + b.r(1.2);
      if (withHouses) {
        b.house(x, z, 0.9, 0.9, h, { ry: b.r(TAU), wall: b.jit('#e0cca6'), roof: b.jit('#9a5a3a'), roofType: 'hip', lit: 0.5 });
        corners.push(V(x + 0.45, h, z + 0.45), V(x - 0.45, h, z - 0.45), V(x + 0.45, h * 0.6, z - 0.45));
      } else {
        // only the poles remain
        b.beam(V(x, 0, z), V(x, h + 0.4, z), 0.04, '#5a4a3a');
        b.box(x, 0, z, 0.9, 0.05, 0.9, '#8a7a5a');
        corners.push(V(x, h + 0.4, z), V(x, h * 0.6, z));
      }
    }
    for (let k = 0; k < corners.length * density; k++) {
      const a = corners[Math.floor(b.r(corners.length))];
      const c = corners[Math.floor(b.r(corners.length))];
      if (a === c) continue;
      const type = b.ri(0, 3);
      if (type < 3) b.line(a, c, colors[type], withHouses ? 1.1 : 0.8);
      else {
        // black and white
        const m = a.clone().lerp(c, 0.5);
        b.line(a, m, colors[0], 1);
        b.line(m, c, colors[1], 1);
      }
    }
  };
  web(-1.2, 1.0, 4.6, true, 5);
  web(5.6, -5.2, 2.8, false, 4);
  web(-6.4, -5.0, 2.6, false, 3.5);
  web(6.6, 4.8, 2.4, false, 3);
  // the hillside where the refugees look back
  rock(b, -7.6, 0, 6.0, 2.6, 1.4, 2.2, '#8a7a5a', 1, 0.2);
  for (let k = 0; k < 6; k++) b.figure(-7.0 + k * 0.25, 1.15 + Math.sin(k) * 0.08, 5.0 + k * 0.1, 0.7, '#4a3a3a');
  ctx.view.elev = 0.48;
  ctx.view.dist = 30;
};

// ---------------------------------------------------------------- Esmeralda
// A city of water where canals and streets cross at every level; cats and thieves keep to the roofs.
const esmeralda: Gen = (b, ctx) => {
  b.ground(11.6, '#3a7a8a', 0, 0.25, 'water');
  // islands of houses
  const blocks: [number, number, number, number][] = [];
  for (let i = -2; i <= 2; i++)
    for (let j = -2; j <= 2; j++) {
      const x = i * 3.8 + (j % 2) * 0.8;
      const z = j * 3.8;
      if (Math.hypot(x, z) > 9.6) continue;
      blocks.push([x, z, 2.5 + b.r(0.4), 2.5 + b.r(0.4)]);
    }
  const roofTops: THREE.Vector3[] = [];
  for (const [x, z, w, d] of blocks) {
    b.box(x, 0, z, w, 0.25, d, '#b8a888');
    const n = 2 + b.ri(0, 2);
    for (let k = 0; k < n; k++) {
      const hx = x + (k % 2 ? 0.6 : -0.6);
      const hz = z + (k > 1 ? 0.6 : -0.6);
      const h = 1.2 + b.r(1.8);
      b.house(hx, hz, 1.1, 1.1, h, { y: 0.25, wall: b.jit(b.pick(['#e0a88a', '#e8d0a0', '#c87a6a', '#f0e0c0'])), roof: '#9a4a32', roofType: b.pick(['flat', 'hip']), lit: 0.45 });
      roofTops.push(V(hx, 0.25 + h + 0.1, hz));
    }
  }
  // arched bridges over the canals
  for (let k = 0; k < 14; k++) {
    const [x, z] = blocks[Math.floor(b.r(blocks.length))];
    const dir = b.chance(0.5);
    const bx = x + (dir ? 1.9 : 0);
    const bz = z + (dir ? 0 : 1.9);
    b.torus(bx, 0.15, bz, 0.7, 0.12, '#d8c8a8', { arc: Math.PI, ry: dir ? 0 : Math.PI / 2, seg: 10, tube: 4 });
  }
  // the high walkways of rooftops: discontinuous, for cats, thieves and lovers
  for (let k = 0; k < 12; k++) {
    const a = roofTops[Math.floor(b.r(roofTops.length))];
    const c = roofTops[Math.floor(b.r(roofTops.length))];
    if (a.distanceTo(c) > 5 || a.distanceTo(c) < 1) continue;
    const m = a.clone().lerp(c, 0.5);
    const ang = Math.atan2(c.x - a.x, c.z - a.z);
    b.box(m.x, Math.min(a.y, c.y), m.z, 0.25, 0.06, a.distanceTo(c), '#7a5a3a', { ry: ang });
  }
  // cats on the roofs
  const cats = crowd(b, 6, () => '#1a1a1a');
  // boats along the canals
  const boats = crowd(b, 8, (i) => (i % 2 ? '#1a1a1a' : '#5a3a2a'));
  const hullGeo = new THREE.SphereGeometry(0.2, 8, 4).scale(1, 0.5, 5.5);
  const hulls = crowd(b, 8, () => '#141418', { geo: hullGeo });
  const lanes = [-1.9, 1.9, -5.7, 5.7];
  b.on((t) => {
    for (let k = 0; k < 8; k++) {
      const lane = lanes[k % 4];
      const u = ((t * 0.06 + k * 0.37) % 1) * 18 - 9;
      const horiz = k < 4;
      const x = horiz ? u : lane;
      const z = horiz ? lane : u;
      boats.set(k, x, 0.04, z, 1.1, horiz ? Math.PI / 2 : 0);
      hulls.set(k, x, 0.02, z, 1, horiz ? Math.PI / 2 : 0);
    }
    boats.commit();
    hulls.commit();
    for (let k = 0; k < 6; k++) {
      const p = roofTops[(k * 5 + Math.floor(t * 0.15 + k)) % roofTops.length];
      cats.set(k, p.x + Math.sin(t + k) * 0.2, p.y, p.z, 0.5);
    }
    cats.commit();
  });
  // swallows above
  const sw = b.sub();
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * TAU;
    sw.cone(Math.cos(a) * 5, 6 + Math.sin(k) * 0.8, Math.sin(a) * 5, 0.12, 0.35, '#1a1a2a', { rz: Math.PI / 2, ry: -a, seg: 3 });
  }
  sw.on((t) => (sw.group.rotation.y = t * 0.3));
  ctx.view.elev = 0.52;
};

export const trading: Record<string, Gen> = { euphemia, chloe, eutropia, ersilia, esmeralda };
