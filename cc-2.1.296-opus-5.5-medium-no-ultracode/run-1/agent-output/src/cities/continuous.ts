import * as THREE from 'three';
import { B, TAU, V, VIEW, clamp, smooth } from '../engine/kit';
import type { Gen } from './types';
import { animatedPoints, crowd, wordSprite } from './util';

// ---------------------------------------------------------------- Leonia
// The city that refashions itself every day, walled in by mountains of its own refuse.
const leonia: Gen = (b, ctx) => {
  b.ground(11.6, '#8a8278');
  // the spotless city
  b.cyl(0, 0, 0, 6.2, 0.06, '#f4f2ee', { seg: 40 });
  for (let k = 0; k < 26; k++) {
    const a = b.r(TAU);
    const r = Math.sqrt(b.r(0.04, 1)) * 5.4;
    b.house(Math.cos(a) * r, Math.sin(a) * r, 0.8 + b.r(0.4), 0.8 + b.r(0.4), 0.8 + b.r(1.8), { ry: b.r(TAU), wall: '#fbfaf6', roof: '#e8eef4', roofType: 'flat', lit: 0.5, win: '#cfeaff' });
  }
  // the mountains of refuse: bags of every color, piled all around
  const bagGeo = new THREE.SphereGeometry(0.32, 7, 5);
  const N = 1700;
  const bags = new THREE.InstancedMesh(bagGeo, new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 }), N);
  bags.castShadow = true;
  bags.receiveShadow = true;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const c = new THREE.Color();
  const colors = ['#1a1a1e', '#2a3a2a', '#3a4a6a', '#e8e8e8', '#5a5a5a', '#c8b040', '#2a2a3a'];
  const height = (a: number) => 1.8 + 1.6 * Math.sin(a * 3 + 1) + 1.0 * Math.sin(a * 7 + 2) + 0.8;
  for (let i = 0; i < N; i++) {
    const a = b.r(TAU);
    const r = b.r(7.4, 11.2);
    const hmax = height(a) * (1 - Math.abs(r - 9.3) / 2.2);
    const y = Math.max(0, b.r(0, Math.max(0.2, hmax)));
    q.setFromEuler(new THREE.Euler(b.r(TAU), b.r(TAU), 0));
    const s = b.r(0.6, 1.2);
    m.compose(V(Math.cos(a) * r, y + 0.15, Math.sin(a) * r), q, V(s, s * 0.85, s));
    bags.setMatrixAt(i, m);
    c.set(colors[i % colors.length]);
    bags.setColorAt(i, c);
  }
  b.group.add(bags);
  // the garbage trucks carrying yesterday's Leonia out
  const trucks = crowd(b, 4, () => '#e8e8e8', { geo: new THREE.BoxGeometry(0.9, 0.55, 0.5).translate(0, 0.28, 0) });
  b.on((t) => {
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + 0.4;
      const u = 0.5 - 0.5 * Math.cos(t * 0.25 + k * 1.6);
      const r = 1.5 + u * 5.6;
      trucks.set(k, Math.cos(a) * r, 0.06, Math.sin(a) * r, 1, -a);
    }
    trucks.commit();
  });
  // new bags on the kerbs every morning
  for (let k = 0; k < 30; k++) {
    const a = b.r(TAU);
    const r = b.r(1, 5.8);
    b.sphere(Math.cos(a) * r, 0.18, Math.sin(a) * r, 0.16, '#3a3a40', { seg: 6, sy: 0.9 });
  }
  ctx.view.elev = 0.45;
};

// ---------------------------------------------------------------- Trude
// The same suburbs, the same streets, the same goods: only the name of the airport changes.
const trude: Gen = (b, ctx) => {
  b.ground(11.6, '#7a8a6a');
  // the airport and its runway
  b.box(0, 0.01, 6.6, 15.5, 0.02, 1.6, '#3a3a40');
  for (let x = -7; x <= 7; x += 1.2) b.box(x, 0.022, 6.6, 0.6, 0.005, 0.08, '#f0f0f0');
  b.box(-3.2, 0, 8.6, 4.2, 1.0, 1.4, '#d8dce4');
  b.box(-3.2, 1.0, 8.6, 4.4, 0.1, 1.6, '#a8b0bc', { kind: 'metal' });
  b.windows(-3.2, 0, 8.6, 4.2, 1.4, 1.0, 0, '#cfeaff', 0.9, 0.15);
  b.cyl(0.6, 0, 8.6, 0.3, 2.6, '#d8dce4', { seg: 10 });
  b.cyl(0.6, 2.6, 8.6, 0.55, 0.5, '#9ad0ff', { seg: 10, kind: 'glass' });
  // the sign that names the place
  const names = ['TRUDE', 'TRUDE', 'TRUDE'];
  const others = ['IRENE', 'CECILIA', 'LEONIA', 'PENTHESILEA', 'OLINDA', 'EUTROPIA'];
  const signs = [...names, ...others].map((n) => {
    const s = wordSprite(n, '#ffe8b0', 0.75);
    s.position.set(-3.2, 2.1, 8.6);
    s.visible = false;
    b.group.add(s);
    return s;
  });
  // the same neighborhood tile, again and again
  const tile = (ox: number, oz: number) => {
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        const x = ox + (i - 1) * 1.15;
        const z = oz + (j - 1) * 1.15;
        if (Math.hypot(x, z) > 10.8) continue;
        const pattern = (i * 3 + j) % 4;
        b.house(x, z, 0.75, 0.75, 0.6 + (pattern % 2) * 0.35, { wall: pattern % 2 ? '#7ac06a' : '#e8d060', roof: '#6a5a5a', roofType: 'hip', lit: 0.4 });
      }
    b.box(ox, 0.005, oz + 1.75, 3.6, 0.01, 0.3, '#5a5a5a');
  };
  for (let i = -2; i <= 2; i++)
    for (let j = -3; j <= 1; j++) {
      const ox = i * 3.8;
      const oz = j * 3.8 + 0.6;
      if (Math.hypot(ox, oz) > 10.4) continue;
      tile(ox, oz);
    }
  // planes landing and taking off, forever
  const plane = (s: B) => {
    s.sphere(0, 0, 0, 0.18, '#f0f0f4', { sz: 5.5, seg: 8 });
    s.box(0, -0.02, 0.1, 2.2, 0.04, 0.45, '#e0e4ea');
    s.box(0, 0.15, -0.85, 0.04, 0.4, 0.3, '#c03a3a');
    s.box(0, 0.02, -0.85, 0.8, 0.03, 0.22, '#e0e4ea');
  };
  const planes = [b.sub(), b.sub()];
  planes.forEach(plane);
  b.on((t) => {
    planes.forEach((p, k) => {
      const u = ((t * 0.06 + k * 0.5) % 1);
      // approach from the west, touch down, roll, then climb out east
      const x = -16 + u * 32;
      const y = x < -6 ? 0.25 + (-6 - x) * 0.45 : x > 6 ? 0.25 + (x - 6) * 0.45 : 0.25;
      p.group.position.set(x, y, 6.6);
      p.group.rotation.set(0, Math.PI / 2, 0);
      p.group.rotateX(x < -6 ? 0.42 : x > 6 ? -0.42 : 0);
      p.group.visible = Math.abs(x) < 13;
    });
    const idx = Math.floor(t * 0.25) % signs.length;
    signs.forEach((s, i) => (s.visible = i === idx));
  });
  ctx.view.elev = 0.48;
  ctx.view.dist = 30;
};

// ---------------------------------------------------------------- Procopia
// Every year the same room, the same window, the same view; every year more faces fill it.
const procopia: Gen = (b, ctx) => {
  b.ground(11.6, '#8aa05a');
  // the landscape: a ditch, a bridge, a little wall, a medlar tree, a field of corn
  b.box(-1, 0.01, -2, 0.9, 0.02, 20, '#3a6a7a', { kind: 'water', ry: 0.3 });
  b.torus(-1.4, 0, -0.7, 0.9, 0.16, '#b8a888', { arc: Math.PI, ry: 0.3 + Math.PI / 2, seg: 10, tube: 4 });
  b.box(3, 0, -5, 5, 0.6, 0.35, '#c8b898', { ry: -0.2 });
  b.tree(-4.5, -3.5, 2.6, '#4a7a3a');
  for (let i = 0; i < 14; i++) for (let j = 0; j < 10; j++) {
    const x = 1 + i * 0.5;
    const z = -9.5 + j * 0.45;
    if (Math.hypot(x, z) > 10.8) continue;
    b.cone(x, 0, z, 0.06, 0.8, b.jit('#d8b850', 0.02, 0.05, 0.08), { seg: 4 });
  }
  // the inn with the window
  const iz = 7.2;
  // a cutaway room: floor, side walls, no ceiling, so we look over the guest's shoulder
  b.box(0, 0, iz, 9, 0.12, 2.8, '#9a7a52');
  b.box(-4.4, 0, iz, 0.3, 2.2, 2.8, '#d0c0a0');
  b.box(4.4, 0, iz, 0.3, 2.2, 2.8, '#d0c0a0');
  b.box(0, 0, iz + 1.3, 9, 0.6, 0.3, '#d8c8a8');
  // the wall with the window opening
  b.box(-3.15, 0, iz - 1.3, 2.4, 3.6, 0.25, '#e0d0b0');
  b.box(3.15, 0, iz - 1.3, 2.4, 3.6, 0.25, '#e0d0b0');
  b.box(0, 0, iz - 1.3, 3.9, 1.2, 0.25, '#e0d0b0');
  b.box(0, 3.2, iz - 1.3, 3.9, 0.4, 0.25, '#e0d0b0');
  // the guest's bed and a chair
  b.box(2.6, 0.12, iz + 0.4, 1.4, 0.4, 0.9, '#e8e0d0');
  b.box(-1.0, 0.12, iz, 0.4, 0.5, 0.4, '#6a4a2a');
  b.box(0, 1.2, iz - 1.45, 4.1, 0.12, 0.45, '#7a5a3a');
  // curtains
  b.box(-1.8, 1.3, iz - 1.15, 0.5, 2.1, 0.06, '#a03a3a', { kind: 'cloth' });
  b.box(1.8, 1.3, iz - 1.15, 0.5, 2.1, 0.06, '#a03a3a', { kind: 'cloth' });
  b.sphere(-3.8, 1.8, iz, 0.16, '#ffd896', { kind: 'glow', i: 2, seg: 8 });
  // the faces, more every year
  const N = 420;
  const people = crowd(b, N, (i) => b.pick(['#5a4a6a', '#7a3a3a', '#3a5a6a', '#6a6a3a', '#e0c0a0', '#3a3a3a']));
  const spots: [number, number][] = [];
  for (let i = 0; i < N - 26; i++) {
    let x = 0;
    let z = 0;
    do {
      x = b.r(-10, 10);
      z = b.r(-10.5, 5.2);
    } while (Math.hypot(x, z) > 10.8);
    spots.push([x, z]);
  }
  // ...and in the room, finally, twenty six people
  for (let i = 0; i < 26; i++) spots.push([b.r(-4, 4), iz + b.r(-0.9, 1.0)]);
  spots.forEach((p, i) => i >= N - 26 && (p[1] = Math.min(p[1], iz + 1.0)));
  // order of arrival: the field first, the room last
  b.on((t) => {
    const year = (t * 0.035) % 1;
    const count = Math.floor(Math.pow(year, 1.6) * N * 1.1);
    for (let i = 0; i < N; i++) {
      const [x, z] = spots[i];
      const shown = i < count;
      people.set(i, x, i >= N - 26 ? 0.12 : 0.02, z, shown ? 1 : 0.0001, i);
    }
    people.commit();
  });
  ctx.view.yaw = 0;
  ctx.view.elev = 0.52;
  ctx.view.ty = 1.5;
  ctx.view.dist = 30;
};

// ---------------------------------------------------------------- Cecilia
// The goatherd who never knew which city he was in, lost now in Cecilia, which has covered all the pastures.
const cecilia: Gen = (b, ctx) => {
  b.ground(11.6, '#6a6a6a');
  const S = 2.0;
  for (let i = -5; i <= 5; i++)
    for (let j = -5; j <= 5; j++) {
      const x = i * S;
      const z = j * S;
      if (Math.hypot(x, z) > 10.6) continue;
      if ((i === 1 && j === -1) || (i === -2 && j === 2)) {
        // the last scraps of grass
        b.box(x, 0, z, 1.3, 0.05, 1.3, '#6a9a4a');
        continue;
      }
      b.box(x, 0, z, 1.3, 1.0 + ((i * 7 + j * 3) % 3 === 0 ? 0.6 : 0), 1.3, '#a8a8aa');
      b.windows(x, 0, z, 1.3, 1.3, 1.0, 0, '#e8e4d0', 0.35, 0.14);
    }
  // street lamps at every corner, identical
  for (let i = -5; i <= 4; i++)
    for (let j = -5; j <= 4; j++) {
      const x = (i + 0.5) * S;
      const z = (j + 0.5) * S;
      if (Math.hypot(x, z) > 10) continue;
      if ((i + j) % 2) continue;
      b.cyl(x, 0, z, 0.03, 1.0, '#3a3a3a', { seg: 4 });
      b.sphere(x, 1.05, z, 0.07, '#ffe8b0', { kind: 'glow', i: 1.8, seg: 5 });
    }
  // the goatherd and his goats, wandering the streets
  const goatGeo = new THREE.SphereGeometry(0.22, 7, 5).scale(1.6, 1, 1).translate(0, 0.32, 0);
  const G = 9;
  const goats = crowd(b, G, () => '#f0ece4', { geo: goatGeo });
  const herd = crowd(b, 1, () => '#6a4a2a');
  const path: THREE.Vector3[] = [];
  let cx = 0;
  let cz = 0;
  for (let k = 0; k < 60; k++) {
    path.push(V((cx + 0.5) * S, 0, (cz + 0.5) * S));
    const dir = b.ri(0, 3);
    const nx = cx + (dir === 0 ? 1 : dir === 1 ? -1 : 0);
    const nz = cz + (dir === 2 ? 1 : dir === 3 ? -1 : 0);
    if (Math.hypot((nx + 0.5) * S, (nz + 0.5) * S) < 9) {
      cx = nx;
      cz = nz;
    }
  }
  const curve = new THREE.CatmullRomCurve3(path, true, 'catmullrom', 0.05);
  b.on((t) => {
    const u = (t * 0.006) % 1;
    const p = curve.getPoint(u);
    herd.set(0, p.x, 0, p.z, 1.5);
    herd.commit();
    for (let g = 0; g < G; g++) {
      const pg = curve.getPoint((u + 1 - (g + 1) * 0.0035) % 1);
      const d = curve.getTangent((u + 1 - (g + 1) * 0.0035) % 1);
      goats.set(g, pg.x + Math.sin(g * 2.3) * 0.3, 0, pg.z + Math.cos(g * 1.7) * 0.3, 1.2, Math.atan2(d.x, d.z) - Math.PI / 2);
    }
    goats.commit();
  });
  ctx.view.elev = 0.62;
};

// ---------------------------------------------------------------- Penthesilea
// Only outskirts; the center recedes as you approach. Is there an outside?
const penthesilea: Gen = (b, ctx) => {
  b.ground(11.6, '#7a7462');
  // density increases outward: warehouses, sheds, billboards, power lines
  for (let k = 0; k < 120; k++) {
    const a = b.r(TAU);
    const r = 3 + Math.pow(b.r(1), 0.5) * 8;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (r > 11) continue;
    const kind = k % 6;
    if (kind < 3) b.box(x, 0, z, 0.6 + b.r(1.4), 0.4 + b.r(0.6), 0.6 + b.r(0.8), b.jit(b.pick(['#9a9488', '#8a8a92', '#a89a7a']), 0.02, 0.05, 0.08), { ry: b.r(TAU) });
    else if (kind === 3) b.prism(x, 0, z, 1.2, 0.6, 2, '#8a8a8a', { ry: b.r(TAU), kind: 'metal' });
    else if (kind === 4) {
      b.cyl(x, 0, z, 0.03, 1.2, '#3a3a3a', { seg: 4 });
      b.box(x, 1.2, z, 1.2, 0.6, 0.05, b.pick(['#e0c040', '#c04a3a', '#3a8ac0', '#e8e8e8']), { ry: b.r(TAU) });
    } else b.box(x, 0, z, 1.2, 0.02, 1.4, '#5a5a4a', { ry: b.r(TAU) });
  }
  const poles: THREE.Vector3[] = [];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * TAU;
    const p = V(Math.cos(a) * 9.4, 2.2, Math.sin(a) * 9.4);
    b.cyl(p.x, 0, p.z, 0.04, 2.2, '#4a3a2a', { seg: 4 });
    b.box(p.x, 2.0, p.z, 0.6, 0.04, 0.04, '#4a3a2a', { ry: -a });
    poles.push(p);
  }
  for (let k = 0; k < poles.length; k++) b.rope(poles[k], poles[(k + 1) % poles.length], 0.25, '#1a1a1a', 1, 8);
  // sparse lights
  const lights: THREE.Vector3[] = [];
  for (let k = 0; k < 60; k++) {
    const a = b.r(TAU);
    const r = b.r(4, 11);
    lights.push(V(Math.cos(a) * r, 0.4 + b.r(0.6), Math.sin(a) * r));
  }
  animatedPoints(b, lights, () => '#ffd8a0', 0.3, (i, t) => 0.8 + 0.4 * Math.sin(t + i));
  // the empty field where the center should be, and the center itself, always somewhere else
  b.disc(0, 0.01, 0, 3, '#8a8470', { seg: 32 });
  b.cyl(0, 0, 0, 0.05, 1.6, '#4a3a2a', { seg: 4 });
  for (let k = 0; k < 4; k++) b.box(0, 1.3 - k * 0.12, 0, 0.8, 0.12, 0.04, '#e8dcc0', { ry: k * 0.9 });
  const center = b.sub({ unique: true });
  center.sphere(0, 1.2, 0, 0.35, '#ffe0a0', { kind: 'glow', i: 2, seg: 10 });
  center.cyl(0, 0, 0, 0.6, 0.02, '#ffe0a0', { kind: 'glow', i: 1, seg: 16 });
  const wp = new THREE.Vector3();
  b.on((t) => {
    b.group.getWorldPosition(wp);
    const dx = VIEW.cam.x - wp.x;
    const dz = VIEW.cam.z - wp.z;
    const a = Math.atan2(dz, dx) + Math.PI + Math.sin(t * 0.3) * 0.4;
    const d = Math.hypot(dx, dz);
    // the closer you come, the further it goes
    const r = clamp(10.5 - d * 0.12, 3, 10.5);
    center.group.position.x += (Math.cos(a) * r - center.group.position.x) * 0.02;
    center.group.position.z += (Math.sin(a) * r - center.group.position.z) * 0.02;
  });
  ctx.view.elev = 0.5;
  void smooth;
};

export const continuous: Record<string, Gen> = { leonia, trude, procopia, cecilia, penthesilea };
