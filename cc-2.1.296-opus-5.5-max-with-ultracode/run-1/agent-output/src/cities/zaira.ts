// ZAIRA - Cities & Memory 3.
// A city of high bastions on a promontory, stairway streets, arcades of measurable
// curve, roofs scaled in zinc. Its substance is the relation between the measures
// of its spaces and the events of its past: a lamppost and a hanged usurper's feet,
// a line to a railing and the festoons of a royal wedding, the railing and a lover's
// dawn leap, a gutter and the cat on it, a gunboat's shot and the wrecked gutter,
// the torn net and the old men mending it. Toggle: read its past, the measures fill
// with the pale gold ghosts of what they hold, and the lines become a palm's creases.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const city = new THREE.Group(); // the part that swells when memory flows in
  root.add(city);

  // ---- terraced promontory: sea wall drum, eight terraces, citadel on top
  const N = 9;
  const R = (i: number) => 12 - i * 1.15; // outer radius of terrace i
  const Yt = (i: number) => 2.5 + i * 0.75; // top height of terrace i
  const hillY = (r: number) => {
    if (r > 12.9) return 0;
    if (r > 12) return 0.6;
    for (let i = N - 1; i >= 0; i--) if (r <= R(i)) return Yt(i);
    return 0;
  };
  const b = new K.Batch();
  const STONE = ['#b39a7a', '#a8906f', '#bba486', '#a38b6c'];
  b.add(K.at(K.ngon(12.9, 0.6, 72, 12.85), 0, 0, 0), '#9c8a74', 'stone'); // quay
  for (let i = 0; i < N; i++) {
    const r = R(i), y0 = i === 0 ? 0.6 : Yt(i - 1), h = Yt(i) - y0;
    b.add(K.paintBy(K.at(K.ngon(r, h + 0.001, 64, r - (i === 0 || i === 3 ? 0.35 : 0.08)), 0, y0, 0), (x, y, z, o) => {
      o.set(STONE[i % 4]).multiplyScalar(0.85 + 0.12 * K.noise2(x * 0.7, z * 0.7 + y) + 0.1 * ((y - y0) / Math.max(0.01, h)));
    }), null, 'stone');
    // parapet rim
    b.add(K.at(K.torus(r - 0.06, 0.05, 4, 64), 0, Yt(i) + 0.04, 0), '#c9b496', 'stone');
  }
  // bastions: arrow heads on the sea wall and the upper wall
  const flagTips: THREE.Vector3[] = [];
  for (const [lvl, phase] of [[0, 0.5], [3, 1.1]] as const) {
    for (let k = 0; k < 5; k++) {
      const a = phase + (k / 5) * Math.PI * 2;
      const r = R(lvl) - 0.25;
      const h = Yt(lvl) - (lvl === 0 ? 0 : Yt(lvl - 1)) + 0.15;
      const y0 = lvl === 0 ? 0 : Yt(lvl - 1);
      b.add(K.at(K.prism([[-1.3, 0], [1.3, 0], [0, 1.75]], h), Math.cos(a) * r, y0, Math.sin(a) * r, { ry: Math.atan2(Math.cos(a), Math.sin(a)) }), '#a58d6d', 'stone');
      if (k < 3 || lvl === 3) flagTips.push(new THREE.Vector3(Math.cos(a) * (r + 1.2), y0 + h, Math.sin(a) * (r + 1.2)));
    }
  }
  for (const p of flagTips.slice(0, 6)) K.flag(b, { x: p.x, y: p.y, z: p.z, h: 1.0, w: 0.4, color: '#b4433a' });
  // citadel on the summit
  K.tower(b, { x: 0, y: Yt(N - 1), z: 0, r: 1.0, h: 3.2, sides: 4, top: 'crenel', color: '#b8a284', bands: 1.1, bandColor: '#a58d6d', rng, lit: 0.2 });
  K.tower(b, { x: 1.6, y: Yt(N - 1), z: 1.2, r: 0.45, h: 2.0, sides: 12, top: 'cone', color: '#c0aa8a', topColor: '#7f8b97', topFinish: 'metal' });

  // ---- stairway streets (6 radial) and the quay arcade
  const STREETS = [0, 1, 2, 3, 4, 5].map((k) => 0.25 + (k * Math.PI) / 3);
  for (const a of STREETS) {
    for (let i = -1; i < N - 1; i++) {
      const top = Yt(i + 1), bot = i < 0 ? 0.6 : Yt(i);
      const rr = R(i + 1);
      const n = Math.round((top - bot) / 0.0625);
      const run = i < 0 ? 0.85 : 1.08;
      const g = K.stairs(n, 0.7, (top - bot) / n, run / n);
      b.add(K.at(g, Math.cos(a) * (rr + run), bot, Math.sin(a) * (rr + run), { ry: Math.atan2(-Math.cos(a), -Math.sin(a)) }), '#cdbb9f', 'stone');
    }
  }
  const ARC_A = 0.05;
  for (let k = 0; k < 14; k++) {
    const a = ARC_A + (k - 6.5) * 0.05;
    b.add(K.at(K.archWall(0.6, 0.8, 0.12, 0.44, 0.6), Math.cos(a) * 12.6, 0.6, Math.sin(a) * 12.6, { ry: Math.atan2(-Math.cos(a), -Math.sin(a)) + Math.PI / 2 }), '#c7b292', 'stone');
  }
  const arcRoof: THREE.BufferGeometry = new THREE.CylinderGeometry(12.72, 12.0, 0.08, 64, 1, true, Math.PI / 2 - ARC_A - 0.36, 0.72);
  b.add(K.at(arcRoof, 0, 1.44, 0), '#7f8b97', 'metal');

  // ---- zinc fish-scale roofs (own textured material)
  const zincTex = K.canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#8693a0'; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 9; row++) for (let c = -1; c < 9; c++) {
      const x = c * 16 + (row % 2) * 8, y = row * 16 - 8;
      const grd = g.createRadialGradient(x + 8, y + 4, 1, x + 8, y + 8, 12);
      grd.addColorStop(0, '#dfe5ea'); grd.addColorStop(1, '#93a0ac');
      g.fillStyle = grd; g.beginPath(); g.arc(x + 8, y + 8, 8.5, 0, Math.PI); g.fill();
      g.strokeStyle = '#4d5862'; g.lineWidth = 1.2; g.stroke();
    }
  });
  zincTex.wrapS = zincTex.wrapT = THREE.RepeatWrapping;
  const zincMat = new THREE.MeshStandardMaterial({ map: zincTex, metalness: 0.65, roughness: 0.35 });
  const roofs: THREE.BufferGeometry[] = [];

  // ---- houses stepped up the terraces
  const WALLS = ['#d8b77e', '#e8dcc4', '#cfa96e', '#ece2cf', '#d9c09a', '#c9a77c'];
  const PZ = Math.PI / 4; // the hero piazza faces south-east
  const gutters: THREE.BufferGeometry[] = [];
  let count = 0;
  const angDist = (a: number, c: number) => Math.abs(Math.atan2(Math.sin(a - c), Math.cos(a - c)));
  const houseAt = (r: number, a: number, w: number, h: number, y: number, wall: string, lit = 0.12) => {
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const ry = Math.atan2(Math.cos(a), Math.sin(a)); // local +z faces outward
    K.house(b, { x, y, z, ry, w, d: 0.8, h, roof: 'none', wall, cornice: true, lit, glow: 2.2, litColor: '#ffd59a', rng, windowColor: '#2d3236' });
    const rf = K.gableRoof(w, 0.8, 0.42, 0.07);
    const p = rf.attributes.position, uv = new Float32Array(p.count * 2);
    for (let v = 0; v < p.count; v++) { uv[v * 2] = p.getX(v) * 1.6; uv[v * 2 + 1] = (p.getY(v) + Math.abs(p.getZ(v)) * 0.2) * 3.2; }
    rf.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    roofs.push(K.at(rf, x, y + h, z, { ry }));
    gutters.push(K.at(K.box(w + 0.12, 0.04, 0.05), x + Math.cos(a) * 0.46, y + h - 0.02, z + Math.sin(a) * 0.46, { ry }));
    count++;
    return { x, z, ry };
  };
  for (let i = 0; i < N - 1; i++) {
    const r = R(i + 1) + 0.42;
    let a = rng.float(0, 0.3);
    while (a < Math.PI * 2 - 0.1) {
      const w = rng.float(0.8, 1.2);
      const da = (w + rng.float(0.06, 0.22)) / r;
      const mid = a + da / 2;
      const street = STREETS.some((s) => angDist(mid, s) < (w / 2 + 0.45) / r);
      const piazza = i <= 1 && angDist(mid, PZ) < (i === 0 ? 0.26 : 0.32);
      if (!street && !piazza) houseAt(r, mid, w, rng.float(1.2, 2.6) * (i > 5 ? 0.8 : 1), Yt(i), rng.pick(WALLS));
      a += da;
    }
  }

  // ---- the hero piazza: lamppost, railing opposite, the tilted gutter, the cat
  const lampA = PZ - 0.12, railA = PZ + 0.17;
  const LP = new THREE.Vector3(Math.cos(lampA) * 10.55, Yt(1), Math.sin(lampA) * 10.55);
  b.add(K.at(K.cyl(0.035, 0.06, 0.9, 8), LP.x, LP.y, LP.z), '#2a2b2e', 'metal');
  b.add(K.at(K.cyl(0.08, 0.08, 0.08, 8), LP.x, LP.y, LP.z), '#2a2b2e', 'metal');
  const tang = new THREE.Vector3(-Math.sin(lampA), 0, Math.cos(lampA));
  const armEnd = LP.clone().addScaledVector(tang, 0.32).setY(LP.y + 0.84);
  b.add(K.strut([LP.x, LP.y + 0.84, LP.z], armEnd, 0.015, 5), '#2a2b2e', 'metal');
  b.add(K.at(K.sphere(0.07, 8, 6), LP.x, LP.y + 0.97, LP.z), '#ffe2a8', 'glow', 3);
  const hero = houseAt(9.75 + 0.42 - 0.0, railA, 1.1, 2.3, Yt(1), '#e8dcc4', 0.3);
  const out = new THREE.Vector3(Math.cos(railA), 0, Math.sin(railA));
  const RAIL = new THREE.Vector3(hero.x, Yt(1) + 0.65, hero.z).addScaledVector(out, 0.62);
  b.add(K.at(K.box(0.7, 0.04, 0.25), RAIL.x - out.x * 0.1, RAIL.y - 0.3, RAIL.z - out.z * 0.1, { ry: hero.ry }), '#9a8a74', 'stone');
  b.add(K.at(K.box(0.7, 0.03, 0.03), RAIL.x, RAIL.y, RAIL.z, { ry: hero.ry }), '#2a2b2e', 'metal');
  for (let k = 0; k < 8; k++) {
    const f = (k / 7 - 0.5) * 0.66;
    const tx = -Math.sin(railA) * f, tz = Math.cos(railA) * f;
    b.add(K.at(K.box(0.012, 0.3, 0.012), RAIL.x + tx, RAIL.y - 0.3, RAIL.z + tz), '#2a2b2e', 'metal');
  }
  const ht = new THREE.Vector3(-Math.sin(railA), 0, Math.cos(railA));
  const G0 = new THREE.Vector3(hero.x, Yt(1) + 2.3 + 0.12, hero.z).addScaledVector(out, 0.48).addScaledVector(ht, -0.6);
  const G1 = G0.clone().addScaledVector(ht, 1.2).setY(G0.y - Math.tan((12 * Math.PI) / 180) * 1.2);
  b.add(K.strut(G0, G1, 0.03, 6), '#5f6a74', 'metal');
  b.add(K.at(K.box(0.3, 0.6, 0.3), G1.x + ht.x * 0.2, G1.y - 0.5, G1.z + ht.z * 0.2), '#d8b77e', 'plaster'); // little dormer at the gutter's end
  b.add(K.at(K.wallPlane(0.14, 0.2), G1.x + ht.x * 0.2 + out.x * 0.16, G1.y - 0.32, G1.z + ht.z * 0.2 + out.z * 0.16, { ry: hero.ry }), '#ffcf8a', 'glow', 2.4);

  // lightning rods with antennae on the four highest roofs
  for (let k = 0; k < 4; k++) {
    const a = 0.6 + k * 1.6, r = R(7) + 0.42, y = Yt(6) + 2.6;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    b.add(K.at(K.cyl(0.012, 0.012, 1.0, 4), x, y, z), '#3b3f44', 'metal');
    for (let j = 0; j < 3; j++) b.add(K.at(K.box(0.3 - j * 0.07, 0.01, 0.01), x, y + 0.55 + j * 0.15, z, { ry: a }), '#3b3f44', 'metal');
  }

  // ---- the dock, the torn net, three old men mending
  const DA = 0.42;
  const D0 = new THREE.Vector3(Math.cos(DA) * 12.8, 0, Math.sin(DA) * 12.8);
  b.add(K.at(K.box(6, 0.12, 1.2), D0.x + 3, 0.42, D0.z), '#6b5440', 'wood');
  for (let k = 0; k < 7; k++) for (const s of [-0.5, 0.5]) b.add(K.at(K.cyl(0.06, 0.06, 0.9, 6), D0.x + 0.4 + k * 0.9, -0.4, D0.z + s), '#4a3a2c', 'wood');
  const netTex = K.canvasTexture(256, 160, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#d8cfb8'; g.lineWidth = 2;
    for (let x = 0; x <= w; x += 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 20, h); g.stroke(); }
    for (let x = -h; x <= w; x += 10) { g.beginPath(); g.moveTo(x + 20, 0); g.lineTo(x, h); g.stroke(); }
    g.globalCompositeOperation = 'destination-out';
    for (const [cx, cy, r] of [[60, 50, 18], [150, 100, 24], [205, 40, 14]]) { g.beginPath(); g.ellipse(cx, cy, r * 1.4, r, 0.3, 0, Math.PI * 2); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = '#b4433a'; g.lineWidth = 6; g.strokeRect(2, 2, w - 4, h - 4);
  });
  const net = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.9 }));
  net.position.set(D0.x + 2.4, 0.495, D0.z);
  root.add(net);
  const MENDERS = [[D0.x + 1.2, D0.z - 0.35], [D0.x + 1.25, D0.z + 0.35], [D0.x + 3.6, D0.z + 0.1]];
  const menders = K.instanced(K.personGeometry(0.3), K.figureMaterial(), 3, (i, o, c) => {
    o.position.set(MENDERS[i][0], 0.48, MENDERS[i][1]);
    o.scale.set(1, 0.72, 1);
    o.rotation.y = i === 2 ? -Math.PI / 2 : Math.PI / 2;
    c.set(['#3c5860', '#5a4a3a', '#3a3a40'][i]);
  });
  root.add(menders);
  const setMend = K.instanceSetter(menders);

  // ---- the cape curling round the harbour, rocks, fishing boats
  const capePts: THREE.Vector3[] = [];
  for (let k = 0; k <= 24; k++) {
    const f = k / 24, a = -1.25 + f * 0.85;
    const r = 16.5 + Math.sin(f * Math.PI) * 1.2;
    capePts.push(new THREE.Vector3(Math.cos(a) * r + 2, 0, Math.sin(a) * r + 2));
  }
  for (const [k, p] of capePts.entries()) {
    const s = 1 - Math.abs(k / 24 - 0.4) * 0.9;
    K.rock(b, { x: p.x, y: -0.3, z: p.z, r: 1.1 + s * 1.4 + rng.float(0, 0.4), color: '#8f8576', rng, flat: 0.9 });
  }
  const capeTip = capePts[capePts.length - 1];
  K.tree(b, { x: capePts[8].x, y: 1.4, z: capePts[8].z, kind: 'pine', h: 1.6, rng });
  K.tree(b, { x: capePts[12].x, y: 1.2, z: capePts[12].z, kind: 'pine', h: 1.3, rng });
  b.add(K.at(K.disc(25.6, 64), 4, -0.6, 1), '#2f4b52', 'matte'); // sea floor

  city.add(b.build({ name: 'zaira' }));
  const roofMesh = new THREE.Mesh(K.merge(roofs, true), zincMat);
  roofMesh.castShadow = roofMesh.receiveShadow = true;
  city.add(roofMesh);
  const gutterMesh = new THREE.Mesh(K.merge(gutters), K.std('#5f6a74', { metalness: 0.7, roughness: 0.4 }));
  city.add(gutterMesh);

  const sea = K.waterDisc(26, 0, { color: '#6f8f96', amp: 0.2, scale: 0.45 });
  sea.position.set(4, 0, 1);
  root.add(sea);
  const boatPos = [[16, 6], [14, 9.5], [18, 3]] as const;
  const boats = K.instanced(K.boatGeometry(1.0, '#3c5860'), K.std('#ffffff', { vertexColors: true, roughness: 0.7 }), 3, (i, o) => { o.position.set(boatPos[i][0], 0.02, boatPos[i][1]); });
  root.add(boats);
  const setBoat = K.instanceSetter(boats);
  const gulls = new K.Flock({ count: 18, center: [8, 0, 2], radius: 9, height: 7, color: '#eef0f0', span: 0.35, speed: 0.2, rng: rng.fork('gulls') });
  root.add(gulls.mesh);

  // the real cat, padding along the tilted gutter into the window
  const cat = new THREE.Mesh(K.quadruped({ len: 0.2, h: 0.12, color: '#2b2622', tail: 0.12, ears: true }), K.std('#ffffff', { vertexColors: true, roughness: 0.8 }));
  root.add(cat);

  // ---- measures: hairline dimensions with ticks, always present
  const dims: [THREE.Vector3, THREE.Vector3][] = [];
  const dim = (a: THREE.Vector3, c: THREE.Vector3, off: THREE.Vector3) => {
    const A = a.clone().add(off), C = c.clone().add(off);
    dims.push([A, C]);
    const dir = C.clone().sub(A).normalize();
    const n = new THREE.Vector3().crossVectors(dir, Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(0.07);
    dims.push([A.clone().add(n), A.clone().sub(n)], [C.clone().add(n), C.clone().sub(n)]);
    return A.clone().lerp(C, 0.5);
  };
  const side = tang.clone().multiplyScalar(-0.25);
  const labels: [THREE.Vector3, string][] = [];
  labels.push([dim(LP, LP.clone().setY(LP.y + 0.9), side), '0.90']);
  labels.push([dim(armEnd, RAIL, new THREE.Vector3(0, 0.12, 0)), '3.00']);
  labels.push([dim(RAIL.clone().setY(Yt(1)), RAIL, out.clone().multiplyScalar(0.25)), '0.65']);
  labels.push([dim(G0, G1, new THREE.Vector3(0, 0.15, 0)), '12°']);
  labels.push([dim(new THREE.Vector3(D0.x + 1.4, 0.55, D0.z - 0.6), new THREE.Vector3(D0.x + 3.4, 0.55, D0.z - 0.6), new THREE.Vector3()), '2.00']);
  const dimLines = K.lines(dims, '#f5e6bf', 0.5);
  root.add(dimLines);
  const labelSprites = labels.map(([p, s]) => {
    const sp = K.textSprite(s, 0.22, { color: '#f5e6bf', italic: true, px: 64 });
    sp.position.copy(p).add(new THREE.Vector3(0, 0.16, 0));
    root.add(sp);
    return sp;
  });

  // ---- the past: pale gold ghosts in one additive material
  const ghostMat = new THREE.MeshBasicMaterial({ color: '#f5e6bf', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ghosts = new THREE.Group();
  ghosts.visible = false;
  root.add(ghosts);
  const gMesh = (g: THREE.BufferGeometry) => { const m = new THREE.Mesh(g, ghostMat); ghosts.add(m); return m; };
  const person = K.personGeometry(0.3);
  const hanged = gMesh(K.at(person.clone(), 0, -0.34, 0));
  hanged.position.copy(armEnd).setY(armEnd.y - 0.02);
  gMesh(K.strut(armEnd, armEnd.clone().setY(armEnd.y - 0.06), 0.004, 3));
  const fest = K.ropePoints(armEnd, RAIL, 0.35, 16);
  gMesh(K.tube(fest, 0.012, 32, 4));
  const pennants: THREE.BufferGeometry[] = [];
  fest.forEach((p, k) => { if (k % 2) pennants.push(K.at(K.cone(0.05, 0.12, 3), p.x, p.y - 0.12, p.z, { rx: Math.PI })); });
  const festoons = gMesh(K.merge(pennants));
  const procession = [0, 1, 2, 3, 4].map(() => gMesh(person));
  const lover = gMesh(person);
  const gutterGhost = gMesh(K.strut(G0, G1, 0.05, 6));
  const gunboat = new THREE.Group();
  ghosts.add(gunboat);
  for (const g of [K.at(K.box(0.6, 0.35, 2.2), 0, -0.1, 0), K.at(K.box(0.4, 0.35, 0.7), 0, 0.25, -0.2), K.at(K.cyl(0.1, 0.1, 0.6, 8), 0, 0.5, 0.1), K.at(K.cyl(0.04, 0.04, 0.6, 6), 0, 0.3, 0.9, { rx: Math.PI / 2 - 0.3 })]) gunboat.add(new THREE.Mesh(g, ghostMat));
  const shot = gMesh(K.sphere(0.12, 8, 6));
  const burst = gMesh(K.sphere(0.5, 12, 8));
  const foundling = gMesh(K.at(K.sphere(0.08, 8, 6), 0, 0, 0, { s: [1, 0.7, 1.8] }));
  foundling.position.set(D0.x + 1.7, 0.53, D0.z + 0.05);
  // palm creases across the hill, seen best from above
  const creaseMat = ghostMat.clone();
  const crease = (pts: [number, number][]) => {
    const v = pts.map(([x, z]) => new THREE.Vector3(x, hillY(Math.hypot(x, z)) + 2.9, z));
    ghosts.add(new THREE.Mesh(K.tube(new THREE.CatmullRomCurve3(v).getPoints(60), 0.05, 120, 4), creaseMat));
  };
  crease([[11, 9], [6, 5], [1, 4.5], [-4, 6.5], [-9, 6]]);
  crease([[12, 4], [5, 1], [-1, -0.5], [-7, -3], [-10, -6.5]]);
  crease([[3, 11], [2, 5], [0.5, 0], [-1, -6], [-3.5, -11]]);

  // ---- the memory tide ring
  const tideMat = new THREE.MeshBasicMaterial({ color: '#f5d79a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const tide = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 128).rotateX(-Math.PI / 2), tideMat);
  root.add(tide);
  const tideLight = new THREE.HemisphereLight('#ffe2a8', '#3c5860', 0);
  root.add(tideLight);

  const tog = new K.Toggle(0.35);
  const tmp = new THREE.Vector3();
  const lineMat = dimLines.material as THREE.LineBasicMaterial;
  lineMat.transparent = true;

  return {
    root,
    env: {
      skyTop: '#45556e',
      skyHorizon: '#eac6a1',
      skyBottom: '#5d6e7a',
      skyCurve: 0.55,
      fog: '#a7b1b9',
      fogNear: 70,
      fogFar: 210,
      sunDir: [0.85, 0.24, -0.35],
      sunColor: '#ffd2a8',
      sunIntensity: 2.3,
      sunDisc: 1,
      sunGlow: 1.2,
      hemiSky: '#b6c4d4',
      hemiGround: '#5d5850',
      hemiIntensity: 0.85,
      envIntensity: 0.9,
      clouds: 0.3,
      cloudColor: '#f2d3b6',
      stars: 0.1,
      bloomStrength: 0.55,
      bloomThreshold: 0.8,
      tiltShift: 0.4,
      shadowRadius: 22,
      vignette: 0.35,
      saturation: 1.0,
    },
    camera: {
      position: [25, 15, 25],
      target: [3, 3.5, 3],
      minDistance: 5,
      maxDistance: 70,
      autoRotate: 0.25,
      views: [
        { position: [6, 38, 8], target: [2, 0, 1] },
        { position: [13, 6.2, 12.2], target: [7.0, 3.9, 7.6] },
      ],
    },
    interaction: {
      label: 'Read its past',
      activeLabel: 'Let it keep silent',
      hint: 'Every measure holds an event; the city never tells them.',
      set: (on) => tog.set(on),
      camera: { position: [8, 30, 14], target: [3, 2, 2] },
    },
    update(t, dt) {
      tog.update(dt);
      const v = tog.value;
      gulls.update(t);
      // memory tide every 35 s and the sponge-like swelling
      const p = (t + 26) % 35;
      const tr = 30 * (1 - p / 9);
      tide.visible = p < 9;
      tide.scale.setScalar(Math.max(0.1, tr));
      tide.position.set(0, hillY(tr) + 0.06, 0);
      tideMat.opacity = Math.sin(Math.PI * Math.min(1, p / 9)) * 0.55;
      const swell = K.smoothstep(7, 10, p) * (1 - K.smoothstep(10, 30, p));
      city.scale.setScalar(1 + 0.015 * swell);
      tideLight.intensity = swell * 0.5;
      // boats bob, old men mend
      for (let i = 0; i < 3; i++) setBoat(i, boatPos[i][0], 0.02 + Math.sin(t * 1.3 + i) * 0.03, boatPos[i][1], 0.6 + i + Math.sin(t * 0.4 + i) * 0.1, 1, Math.sin(t * 1.1 + i) * 0.05);
      setBoat.done();
      for (let i = 0; i < 3; i++) setMend(i, MENDERS[i][0], 0.48, MENDERS[i][1], (i === 2 ? -1 : 1) * Math.PI / 2 + Math.sin(t * 2.5 + i * 2) * 0.12, [1, 0.72 + Math.sin(t * 3 + i) * 0.015, 1]);
      setMend.done();
      // the cat walks the gutter, slips in at the window, starts again
      const cf = (t % 14) / 12;
      cat.visible = cf < 1;
      cat.position.lerpVectors(G0, G1, Math.min(1, cf)).setY(K.lerp(G0.y, G1.y, Math.min(1, cf)) + 0.035);
      cat.rotation.set(0, Math.atan2(ht.x, ht.z), Math.tan(0.21) * 0);
      cat.rotation.x = 0.21;
      // measures brighten with reading
      lineMat.opacity = 0.35 + 0.6 * v;
      labelSprites.forEach((s) => ((s.material as THREE.SpriteMaterial).opacity = 0.5 + 0.5 * v));
      // ghosts
      ghosts.visible = v > 0.01;
      ghostMat.opacity = v * 0.75;
      creaseMat.opacity = v * 0.35;
      if (ghosts.visible) {
        hanged.rotation.set(Math.sin(t * 1.1) * 0.12, 0, Math.sin(t * 0.9) * 0.14);
        festoons.position.y = Math.sin(t * 3) * 0.02;
        procession.forEach((m, k) => {
          const f = K.fract(t / 16 + k * 0.035);
          m.position.lerpVectors(LP, RAIL, f).setY(Yt(1) + Math.abs(Math.sin(t * 6 + k)) * 0.01);
          m.position.addScaledVector(out, -0.35);
          m.rotation.y = Math.atan2(RAIL.x - LP.x, RAIL.z - LP.z);
        });
        const lf = K.fract(t / 9);
        const jump = K.clamp(lf * 2.2);
        lover.position.copy(RAIL).addScaledVector(out, 0.15 + jump * 0.9).setY(RAIL.y - 0.1 + Math.sin(jump * Math.PI) * 0.35 - jump * (RAIL.y - Yt(1) - 0.1));
        lover.rotation.set(0, Math.atan2(out.x, out.z), Math.sin(jump * Math.PI) * 0.6);
        // gunboat and its shot
        const gf = K.fract(t / 20);
        gunboat.position.set(capeTip.x - 1 + gf * 4, 0.15, capeTip.z + 1.5 + gf * 3);
        gunboat.rotation.y = 0.9;
        const sf = K.clamp((gf - 0.45) / 0.3);
        shot.visible = sf > 0 && sf < 1;
        tmp.copy(gunboat.position).lerp(G1, sf);
        shot.position.copy(tmp).setY(tmp.y + Math.sin(sf * Math.PI) * 6);
        const bf = K.clamp((gf - 0.75) / 0.15);
        burst.visible = bf > 0 && bf < 1;
        burst.position.copy(G1);
        burst.scale.setScalar(0.2 + bf * 1.4);
        gutterGhost.visible = gf < 0.75;
        foundling.rotation.y = Math.sin(t * 0.7) * 0.2;
      }
    },
  };
};

export default build;
