import * as THREE from 'three';
import { B, TAU, V, clamp, smooth } from '../engine/kit';
import type { Gen } from './types';
import { animatedPoints, canvasTexture, crowd, dynamicLines, rock } from './util';

function carpetTexture(seed: number) {
  return canvasTexture(1024, 640, (g, w, h) => {
    const pal = ['#7a1e1e', '#1e2e5a', '#d8b060', '#efe0c0', '#2a5a4a', '#a8402a', '#14141e'];
    g.fillStyle = pal[0];
    g.fillRect(0, 0, w, h);
    // borders
    const border = (m: number, c: string, lw: number) => {
      g.strokeStyle = c;
      g.lineWidth = lw;
      g.strokeRect(m, m, w - 2 * m, h - 2 * m);
    };
    border(10, pal[3], 6);
    border(28, pal[2], 14);
    border(52, pal[1], 22);
    // repeated small motifs in the border band
    g.fillStyle = pal[3];
    for (let x = 70; x < w - 70; x += 36) {
      for (const y of [52, h - 52]) {
        g.beginPath();
        g.moveTo(x, y - 8);
        g.lineTo(x + 8, y);
        g.lineTo(x, y + 8);
        g.lineTo(x - 8, y);
        g.fill();
      }
    }
    // field: a symmetric lattice whose cells are the city's quarters
    const cx = w / 2;
    const cy = h / 2;
    const draw = (fx: number, fy: number) => {
      g.save();
      g.translate(cx, cy);
      g.scale(fx, fy);
      let s = seed;
      const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 7; i++)
        for (let j = 0; j < 4; j++) {
          const x = 40 + i * 58;
          const y = 30 + j * 56;
          g.fillStyle = pal[(i + j * 3) % 2 ? 4 : 1];
          g.globalAlpha = 0.9;
          g.beginPath();
          g.moveTo(x, y - 22);
          g.lineTo(x + 22, y);
          g.lineTo(x, y + 22);
          g.lineTo(x - 22, y);
          g.fill();
          g.fillStyle = pal[2];
          g.beginPath();
          g.arc(x, y, 6 + rnd() * 4, 0, TAU);
          g.fill();
          // stairs and alleys as little woven paths
          g.strokeStyle = pal[3];
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(x - 22, y);
          g.lineTo(x - 30, y + (rnd() - 0.5) * 30);
          g.stroke();
        }
      g.restore();
    };
    draw(1, 1);
    draw(-1, 1);
    draw(1, -1);
    draw(-1, -1);
    // central medallion
    g.fillStyle = pal[6];
    g.beginPath();
    g.ellipse(cx, cy, 120, 90, 0, 0, TAU);
    g.fill();
    g.strokeStyle = pal[2];
    g.lineWidth = 6;
    g.stroke();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU;
      g.strokeStyle = k % 2 ? pal[2] : pal[3];
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * 110, cy + Math.sin(a) * 80);
      g.stroke();
    }
    g.fillStyle = pal[5];
    g.beginPath();
    g.arc(cx, cy, 26, 0, TAU);
    g.fill();
  });
}

// ---------------------------------------------------------------- Eudoxia
// A tangled city of steps and dead ends; a carpet that holds its true form.
const eudoxia: Gen = (b, ctx) => {
  b.ground(11.6, '#a8987a');
  // the city spreads up a hill on the north side and down toward the carpet
  rock(b, 0, -1.2, -6.2, 7.5, 4.2, 4.8, '#9a8a6a', 1, 0.12);
  const placed: THREE.Vector3[] = [];
  for (let k = 0; k < 60; k++) {
    const x = b.r(-8.5, 8.5);
    const z = b.r(-10, -1.5);
    if (Math.hypot(x, z) > 10.6) continue;
    const ground = Math.max(0, 2.8 * (1 - Math.hypot(x / 7.5, (z + 6.2) / 4.8)));
    const h = 0.6 + b.r(1.2);
    b.house(x, z, 0.8 + b.r(0.4), 0.7 + b.r(0.4), h + ground, { ry: b.r(-0.4, 0.4), wall: b.jit('#e0c8a0', 0.03, 0.08, 0.08), roof: b.jit('#9a4a32'), roofType: b.pick(['hip', 'flat', 'gable']), lit: 0.4 });
    placed.push(V(x, h + ground, z));
    if (k % 3 === 0) b.stairs(x + 0.6, 0, z + 0.4, 0.4, 6, (h + ground) / 6, 0.18, '#c8b490', b.r(TAU));
  }
  // the carpet: everything in the city is in it, arranged in its true relation
  const tex = carpetTexture(7);
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.6, 1, 1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide }));
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.05, 5.2);
  carpet.receiveShadow = true;
  b.group.add(carpet);
  // the weaver's frame
  b.box(0, 0, 8.2, 9.4, 0.25, 0.3, '#5a3a22');
  b.box(0, 0, 2.2, 9.4, 0.25, 0.3, '#5a3a22');
  // threads of correspondence: each place in the city answers to a place in the carpet
  const threads = dynamicLines(b, 40, 0.7);
  const col = new THREE.Color(ctx.accent).multiplyScalar(1.4);
  const ends = placed.slice(0, 30).map((p) => ({ p, c: V((p.x / 8.5) * 4.2, 0.08, 5.2 + ((p.z + 5.75) / 4.25) * 2.6) }));
  b.on((t) => {
    threads.begin();
    ends.forEach((e, i) => {
      const k = Math.max(0, Math.sin(t * 0.5 + i * 0.7));
      if (k < 0.3) return;
      threads.seg(e.p.x, e.p.y + 0.3, e.p.z, e.c.x, e.c.y, e.c.z, col.r * k, col.g * k, col.b * k);
    });
    threads.end();
  });
  ctx.view.elev = 0.55;
  ctx.view.ty = 1.5;
};

// ---------------------------------------------------------------- Beersheba
// A city of gold believed to hang in the heavens, and a city of refuse believed to be buried below.
const beersheba: Gen = (b, ctx) => {
  ctx.below = 7;
  // the actual city, on a crust you can see through
  b.ground(11.6, '#8a7a62', 0, 0.12, 'glass');
  for (let k = 0; k < 30; k++) {
    const a = b.r(TAU);
    const r = Math.sqrt(b.r(0.05, 1)) * 9.6;
    b.house(Math.cos(a) * r, Math.sin(a) * r, 0.8 + b.r(0.5), 0.8 + b.r(0.5), 0.7 + b.r(1.4), { ry: b.r(TAU), wall: b.jit('#d8c4a0'), roof: b.jit('#8a4a32'), roofType: b.pick(['gable', 'hip']), lit: 0.4 });
  }
  // the celestial Beersheba: gold, gems, rigid and turning slowly
  const heaven = b.sub({ y: 12 });
  heaven.cyl(0, 0, 0, 5.5, 0.35, '#d9a441', { kind: 'gold', seg: 32 });
  heaven.cone(0, -2.6, 0, 5.5, 2.6, '#c8902a', { kind: 'gold', seg: 32, rx: Math.PI });
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * TAU;
    const r = k % 2 ? 4.3 : 2.6;
    heaven.box(Math.cos(a) * r, 0.35, Math.sin(a) * r, 0.7, 0.9 + (k % 3) * 0.5, 0.7, '#e8b850', { kind: 'gold', ry: -a });
    heaven.dome(Math.cos(a) * r, 0.35 + 0.9 + (k % 3) * 0.5, Math.sin(a) * r, 0.4, '#f0c860', { kind: 'gold', seg: 10 });
  }
  heaven.cyl(0, 0.35, 0, 0.8, 2.6, '#e8b850', { kind: 'gold', seg: 12 });
  heaven.dome(0, 2.95, 0, 0.85, '#f0c860', { kind: 'gold', seg: 14 });
  const gemGeo = new THREE.OctahedronGeometry(1, 0);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU;
    heaven.add(gemGeo, new THREE.Matrix4().compose(V(Math.cos(a) * 5.2, 0.5, Math.sin(a) * 5.2), new THREE.Quaternion(), V(0.2, 0.32, 0.2)), ['#ff4a6a', '#4ad0ff', '#6aff8a', '#c06aff'][k % 4], 'glow', 1.4);
  }
  heaven.on((t) => {
    heaven.group.rotation.y = t * 0.03;
    heaven.group.position.y = 12 + Math.sin(t * 0.3) * 0.25;
  });
  // golden light falling from it, a column that does not touch the ground
  const motes: THREE.Vector3[] = [];
  const ms: [number, number, number][] = [];
  for (let k = 0; k < 120; k++) {
    ms.push([b.r(TAU), b.r(0, 5), b.r(1)]);
    motes.push(V(0, 0, 0));
  }
  const mm = animatedPoints(b, motes, () => '#ffd27a', 0.2, () => 1.2);
  mm.on((t) => {
    const pos = mm.points?.geometry.attributes.position as THREE.BufferAttribute;
    if (!pos) return;
    ms.forEach(([a, r, ph], i) => {
      const u = (t * 0.08 + ph) % 1;
      pos.setXYZ(i, Math.cos(a) * r, 9.4 - u * 5, Math.sin(a) * r);
    });
    pos.needsUpdate = true;
  });
  // the infernal Beersheba below: peels, rags, refuse, which is in truth its only generosity
  const hell = b.sub({ y: -6 });
  hell.ground(11.6, '#2a2018', 0, 0.2);
  for (let k = 0; k < 70; k++) {
    const a = b.r(TAU);
    const r = Math.sqrt(b.r(1)) * 10.5;
    const kind = k % 3;
    if (kind === 0) rock(hell, Math.cos(a) * r, 0, Math.sin(a) * r, b.r(0.5, 1.4), b.r(0.3, 0.9), b.r(0.5, 1.4), b.pick(['#4a3a28', '#5a4a30', '#3a3020']), 0, 0.3);
    else if (kind === 1) hell.box(Math.cos(a) * r, 0, Math.sin(a) * r, b.r(0.3, 0.8), 0.05, b.r(0.3, 0.8), b.pick(['#8a6a5a', '#6a5a7a', '#7a7a5a']), { ry: b.r(TAU), kind: 'cloth' });
    else hell.sphere(Math.cos(a) * r, 0.1, Math.sin(a) * r, 0.15, b.pick(['#e0a030', '#c0d040', '#e06030']), { seg: 5, sy: 0.6 });
  }
  // the moment the city lets go: a warm glow rising from the refuse
  const warm = b.sub({ unique: true, y: -6 });
  for (let k = 0; k < 12; k++) {
    const a = b.r(TAU);
    const r = b.r(1, 9);
    warm.sphere(Math.cos(a) * r, 0.3, Math.sin(a) * r, 0.25, '#ffb060', { kind: 'glow', i: 1.2, seg: 6 });
  }
  warm.on((t) => warm.mats.glow.color.setScalar(0.4 + 0.6 * Math.max(0, Math.sin(t * 0.25))));
  ctx.view.elev = 0.35;
  ctx.view.ty = 4;
  ctx.view.dist = 38;
};

// ---------------------------------------------------------------- Thekla
// Endless construction so that destruction cannot begin. The blueprint is the starry sky.
const thekla: Gen = (b, ctx) => {
  b.ground(11.6, '#9a8a70');
  const plank = '#a8885a';
  // half-built houses wrapped in scaffolding
  const sites: THREE.Vector3[] = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU + b.r(0.2);
    const r = k % 2 ? 7.6 : 4.2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const w = 1.6 + b.r(0.6);
    const h = 1.5 + b.r(3.5);
    const built = h * b.r(0.3, 0.8);
    b.box(x, 0, z, w * 0.85, built, w * 0.85, b.jit('#d8c8a8'));
    // scaffold poles and planks
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.beam(V(x + (sx * w) / 2, 0, z + (sz * w) / 2), V(x + (sx * w) / 2, h, z + (sz * w) / 2), 0.03, plank);
    for (let y = 0.9; y < h; y += 0.9) {
      b.box(x, y, z + w / 2, w, 0.04, 0.25, plank);
      b.box(x + w / 2, y, z, 0.25, 0.04, w, plank);
      b.line(V(x - w / 2, y - 0.9, z - w / 2), V(x + w / 2, y, z - w / 2), '#6a5030');
    }
    // sackcloth screens
    if (k % 3 === 0) b.box(x - w / 2 - 0.02, built, z, 0.02, h - built, w, '#c8b48a', { kind: 'cloth' });
    sites.push(V(x, h, z));
  }
  // plank fences around the whole
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * TAU;
    b.box(Math.cos(a) * 10.6, 0, Math.sin(a) * 10.6, 0.06, 1.1, 1.6, b.jit('#8a6a42', 0.02, 0.06, 0.08), { ry: -a });
  }
  // cranes, turning
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.5;
    const x = Math.cos(a) * 2.2;
    const z = Math.sin(a) * 2.2;
    const H = 8 + k * 1.2;
    for (let y = 0; y < H; y += 0.8) {
      b.box(x, y, z, 0.4, 0.04, 0.4, '#e0a030');
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.beam(V(x + sx * 0.2, 0, z + sz * 0.2), V(x + sx * 0.2, H, z + sz * 0.2), 0.03, '#e0a030', { kind: 'metal' });
    const jib = b.sub({ x, y: H, z });
    jib.box(1.8, 0, 0, 5.4, 0.25, 0.25, '#e0a030', { kind: 'metal' });
    jib.box(-1.4, -0.3, 0, 1.0, 0.6, 0.6, '#5a5a5a');
    jib.line(V(3.6, 0, 0), V(3.6, -H + 2, 0), '#2a2a2a');
    jib.box(3.6, -H + 1.4, 0, 0.8, 0.5, 0.5, '#8a8a8a');
    jib.on((t) => (jib.group.rotation.y = Math.sin(t * 0.08 + k * 2) * 2.4));
  }
  // workers
  for (let k = 0; k < 14; k++) {
    const s = sites[k % sites.length];
    b.figure(s.x + b.r(-0.6, 0.6), b.r(0, s.y * 0.8), s.z + b.r(-0.6, 0.6), 0.75, '#3a4a6a');
  }
  // the blueprint in the stars
  const stars: THREE.Vector3[] = [];
  const blue = new THREE.Color('#8ab8ff');
  const sky = b.sub();
  const Y = 14;
  const grid = (x0: number, z0: number, w: number, d: number) => {
    const corners = [V(x0, Y, z0), V(x0 + w, Y, z0), V(x0 + w, Y, z0 + d), V(x0, Y, z0 + d)];
    corners.forEach((c) => stars.push(c));
    sky.polyline(corners, blue, 0.9, true);
    stars.push(V(x0 + w / 2, Y + 0.6, z0 + d / 2));
    sky.line(corners[0], V(x0 + w / 2, Y + 0.6, z0 + d / 2), blue, 0.6);
    sky.line(corners[2], V(x0 + w / 2, Y + 0.6, z0 + d / 2), blue, 0.6);
  };
  for (let k = 0; k < 9; k++) grid(b.r(-8, 5), b.r(-8, 5), b.r(1.5, 3.5), b.r(1.5, 3.5));
  for (let k = 0; k < 60; k++) stars.push(V(b.r(-10, 10), Y + b.r(-1, 2), b.r(-10, 10)));
  animatedPoints(sky, stars, () => '#e8f0ff', 0.45, (i, t) => 1.2 + 0.6 * Math.sin(t * 2 + i * 1.7));
  sky.on((t) => {
    const night = 0.5 + 0.5 * Math.sin(t * 0.15);
    if (sky.lines) (sky.lines.material as THREE.LineBasicMaterial).opacity = 0.15 + night * 0.75;
  });
  sky.mats = { ...sky.mats, line: sky.mats.line.clone() };
  ctx.view.elev = 0.38;
  ctx.view.ty = 5;
  ctx.view.dist = 36;
};

// ---------------------------------------------------------------- Perinthia
// Laid out by astronomers to mirror the firmament; its people turned out monstrous.
const perinthia: Gen = (b, ctx) => {
  b.ground(11.6, '#b0a080');
  // the cardo and the decumanus, aligned with the sun and the axis of the heavens
  b.box(0, 0.01, 0, 22.4, 0.02, 1.2, '#e0d0b0');
  b.box(0, 0.012, 0, 1.2, 0.02, 22.4, '#e0d0b0');
  b.ring(0, 0.015, 0, 5.2, 5.8, '#e0d0b0');
  b.ring(0, 0.015, 0, 9.0, 9.6, '#e0d0b0');
  // the quarters, laid out in the twelve houses of the zodiac
  for (let q = 0; q < 12; q++) {
    const a0 = (q / 12) * TAU;
    for (let k = 0; k < 5; k++) {
      const a = a0 + 0.12 + (k % 2) * 0.22;
      const r = k < 2 ? 3.8 : k < 4 ? 7.4 : 10.3;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.abs(x) < 0.9 || Math.abs(z) < 0.9) continue;
      b.house(x, z, 1.1, 1.0, 0.9 + ((q + k) % 3) * 0.5, { ry: -a, wall: '#e8dcc4', roof: '#7a6a9a', roofType: q % 2 ? 'dome' : 'hip', lit: 0.4 });
    }
  }
  // the astronomers' instruments: an armillary sphere at the center
  const arm = b.sub({ y: 3.2 });
  arm.torus(0, 0, 0, 1.6, 0.05, '#d9a441', { kind: 'gold', seg: 40, tube: 4 });
  arm.torus(0, 0, 0, 1.6, 0.05, '#d9a441', { kind: 'gold', seg: 40, tube: 4, rx: Math.PI / 2 });
  arm.torus(0, 0, 0, 1.5, 0.04, '#d9a441', { kind: 'gold', seg: 40, tube: 4, rx: 0.41, ry: 0.3 });
  arm.sphere(0, 0, 0, 0.3, '#5a8aff', { kind: 'glow', i: 1.2 });
  arm.on((t) => (arm.group.rotation.y = t * 0.2));
  b.cyl(0, 0, 0, 0.9, 0.4, '#e8dcc4', { seg: 16 });
  b.cyl(0, 0.4, 0, 0.12, 1.2, '#d9a441', { kind: 'gold', seg: 8 });
  // beams from the city to the stars it reflects
  const stars: THREE.Vector3[] = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU + 0.26;
    const top = V(Math.cos(a) * 7, 13 + Math.sin(k * 2.1) * 1.4, Math.sin(a) * 7);
    stars.push(top);
    b.line(V(Math.cos(a) * 7.4, 0.2, Math.sin(a) * 7.4), top, '#9ab0ff', 0.5);
    if (k > 0) b.line(stars[k - 1], top, '#c8d4ff', 0.8);
  }
  b.line(stars[11], stars[0], '#c8d4ff', 0.8);
  animatedPoints(b, stars, () => '#f0f4ff', 0.9, (i, t) => 1.5 + 0.5 * Math.sin(t * 1.3 + i));
  // its inhabitants: the strange bodies of Perinthia
  const N = 26;
  const people = crowd(b, N, (i) => b.pick(['#6a4a8a', '#8a5a3a', '#4a6a5a', '#9a3a4a', '#5a5a7a']));
  const shapes = Array.from({ length: N }, (_, i) => {
    const kind = i % 5;
    return {
      s: kind === 0 ? 0.6 : kind === 1 ? 1.6 : kind === 2 ? 1.25 : 1.0,
      sy: kind === 0 ? 0.55 : kind === 1 ? 2.6 : kind === 2 ? 0.9 : kind === 3 ? 0.7 : 1.4,
      r: b.r(1, 9.8),
      a: b.r(TAU),
      sp: b.r(0.03, 0.08) * (i % 2 ? 1 : -1),
    };
  });
  const humps = crowd(b, N, () => '#7a5a4a', { geo: new THREE.SphereGeometry(0.14, 6, 4) });
  b.on((t) => {
    shapes.forEach((p, i) => {
      const a = p.a + t * p.sp;
      const x = Math.cos(a) * p.r;
      const z = Math.sin(a) * p.r;
      people.set(i, x, 0.02, z, p.s, -a, p.sy);
      humps.set(i, x - Math.sin(-a) * 0.1, 0.45 * p.sy, z - Math.cos(-a) * 0.1, i % 5 === 2 ? 1.3 : 0.001);
    });
    people.commit();
    humps.commit();
  });
  ctx.view.elev = 0.5;
  ctx.view.ty = 3.5;
  ctx.view.dist = 34;
};

// ---------------------------------------------------------------- Andria
// Every street follows a planet's orbit; change the city and the stars change too.
const andria: Gen = (b, ctx) => {
  b.ground(11.6, '#2a2a40');
  // the sun temple at the center
  b.cyl(0, 0, 0, 1.4, 0.5, '#e8dcc4', { seg: 20 });
  b.dome(0, 0.5, 0, 1.2, '#d9a441', { kind: 'gold', seg: 20 });
  b.sphere(0, 2.2, 0, 0.5, '#ffcf6a', { kind: 'glow', i: 2.4, seg: 14 });
  // orbital streets and the buildings travelling on them
  const orbits = [2.6, 4.0, 5.4, 6.9, 8.4, 10.0];
  orbits.forEach((R, i) => {
    b.ring(0, 0.01, 0, R - 0.25, R + 0.25, '#4a4a68', { seg: 72 });
    b.torus(0, 0.03, 0, R, 0.02, '#8a8ac8', { rx: Math.PI / 2, seg: 96, tube: 3, kind: 'glow', i: 0.7 });
    const ring = b.sub();
    const n = 2 + i;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + i;
      const x = Math.cos(a) * R;
      const z = Math.sin(a) * R;
      const h = 0.6 + ((i + k) % 3) * 0.5;
      ring.house(x, z, 0.8, 0.8, h, { ry: -a, wall: b.jit('#e8e0d4'), roof: ['#d9a441', '#5a7ac8', '#c85a4a', '#4a9a7a'][i % 4], roofType: b.pick(['dome', 'cone', 'hip']), lit: 0.6 });
    }
    // Kepler's law, more or less
    const speed = 0.25 / Math.pow(R, 1.5);
    ring.on((t) => (ring.group.rotation.y = t * speed * 4));
  });
  // the sky above repeats the city: constellations turning with the streets
  const vault = b.sub({ y: 13 });
  const pts: THREE.Vector3[] = [];
  orbits.forEach((R, i) => {
    const n = 2 + i;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + i;
      pts.push(V(Math.cos(a) * R, Math.sin(k + i) * 0.4, Math.sin(a) * R));
    }
    vault.torus(0, 0, 0, R, 0.01, '#6a6aa8', { rx: Math.PI / 2, seg: 96, tube: 3, kind: 'ghost' });
  });
  animatedPoints(vault, pts, () => '#f4f0ff', 0.8, (i, t) => 1.4 + 0.5 * Math.sin(t * 2 + i));
  vault.on((t) => (vault.group.rotation.y = t * 0.04));
  // when a new building is raised, a new star kindles
  const nova = b.sub({ unique: true });
  nova.box(3.2, 0, -7.2, 0.6, 1.0, 0.6, '#f0e8d8');
  nova.sphere(3.2, 13.5, -7.2, 0.25, '#ffffff', { kind: 'glow', i: 2.5, seg: 10 });
  nova.line(V(3.2, 1.0, -7.2), V(3.2, 13.3, -7.2), '#c8c8ff');
  nova.on((t) => {
    const c = (t * 0.05) % 1;
    const s = smooth(clamp((c - 0.2) * 4, 0, 1)) * (1 - smooth(clamp((c - 0.85) * 7, 0, 1)));
    nova.group.scale.set(1, Math.max(0.001, s), 1);
  });
  ctx.view.elev = 0.55;
  ctx.view.ty = 4;
  ctx.view.dist = 34;
};

export const sky: Record<string, Gen> = { eudoxia, beersheba, thekla, perinthia, andria };
