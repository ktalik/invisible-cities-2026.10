// FEDORA - Cities & Desire 4.
// A grey stone metropolis with a metal building at its heart; in every room a
// glass globe holds a small blue Fedora, a model of the city someone once
// imagined as ideal and which became a toy before it could be built: a canal
// city, an avenue for elephants, a spiral minaret with no place to stand.
// Every so often a blue projection of a new ideal plan blooms over the stone,
// fails to fit, and spirals back into the museum as one more globe.
// Toggle: enter a globe, and the blue Fedora grows to fill the whole diorama.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const AZURE = '#5cb3ff';

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const stone = new THREE.Group(); // everything that belongs to the grey city
  root.add(stone);

  // ---- a hewn-stone disc floating in an overcast void
  const R = 23;
  const disc = K.cyl(R, R - 1.2, 3.5, 96);
  K.at(disc, 0, -3.5, 0);
  K.paintBy(disc, (x, y, z, out) => {
    const course = Math.floor((y + 3.5) / 0.5);
    const a = Math.atan2(z, x);
    const block = Math.floor(a * 18 + (course % 2) * 0.5);
    out.set('#6b6e73').multiplyScalar(0.85 + 0.15 * K.fract(Math.sin(block * 12.9 + course * 78.2) * 437.5) - (y > -0.05 ? 0.12 : 0));
  });
  const gb = new K.Batch();
  gb.add(disc, null, 'stone');
  gb.add(K.at(K.cone(R - 1.2, 9, 48), 0, -3.5, 0, { rx: Math.PI }), '#4a4c51', 'stone');
  gb.add(K.at(K.disc(R - 0.02, 96), 0, 0.005, 0), '#5c5f64', 'stone');
  root.add(gb.build());
  root.add(K.cloudSea({ y: -8, color: '#b9bcc0', shadow: '#6f747c', opacity: 0.7, coverage: 0.55 }));

  // ---- the absences (where the blue models would have stood)
  const canalA = new THREE.Vector2(16.5, -16.5), canalB = new THREE.Vector2(7.2, -7.6);
  const SQ = { x: 7.2, z: -7.6 };
  const SP = { x: -11, z: 3 };
  const AV = { w: 2.4, z0: 7, z1: 22.5 };
  const distSeg = (x: number, z: number) => {
    const p = new THREE.Vector2(x, z), ab = canalB.clone().sub(canalA);
    const t = K.clamp(p.clone().sub(canalA).dot(ab) / ab.lengthSq());
    return p.distanceTo(canalA.clone().add(ab.multiplyScalar(t)));
  };
  const blocked = (x: number, z: number, m = 0) => {
    const r = Math.hypot(x, z);
    if (r < 7.2 + m || r > R - 1.3) return true;
    if (Math.abs(x) < AV.w / 2 + 0.9 + m && z > 6) return true;
    if (distSeg(x, z) < 1.2 + m) return true;
    if (Math.hypot(x - SQ.x, z - SQ.z) < 2.6 + m) return true;
    if (Math.hypot(x - SP.x, z - SP.z) < 1.6 + m) return true;
    return false;
  };

  const b = new K.Batch();
  // dry canal: dark bed between stone kerbs, stopping dead at a plain square
  const canalLen = canalA.distanceTo(canalB), canalAng = Math.atan2(canalB.x - canalA.x, canalB.y - canalA.y);
  const cm = canalA.clone().add(canalB).multiplyScalar(0.5);
  b.add(K.at(K.box(1.2, 0.03, canalLen), cm.x, 0, cm.y, { ry: canalAng }), '#3c3e42', 'stone');
  for (const s of [-1, 1]) {
    const ox = Math.cos(canalAng) * 0.68 * s, oz = -Math.sin(canalAng) * 0.68 * s;
    b.add(K.at(K.box(0.16, 0.14, canalLen), cm.x + ox, 0, cm.y + oz, { ry: canalAng }), '#8f9195', 'stone');
  }
  b.add(K.at(K.cyl(2.5, 2.5, 0.04, 40), SQ.x, 0, SQ.z), '#7d8085', 'stone');
  for (let i = 0; i < 6; i++) b.add(K.at(K.ring(0.6 + i * 0.32, 0.64 + i * 0.32, 40), SQ.x, 0.045, SQ.z), '#6c6f74', 'stone');
  // the elephant avenue: wide, empty, flanked by twenty bare plinths
  b.add(K.at(K.box(AV.w, 0.03, AV.z1 - AV.z0), 0, 0, (AV.z0 + AV.z1) / 2), '#777a7f', 'stone');
  for (let i = 0; i < 10; i++) for (const s of [-1, 1]) {
    const z = AV.z0 + 1.2 + i * 1.45;
    b.add(K.at(K.box(0.5, 0.55, 0.8), s * (AV.w / 2 + 0.4), 0, z), '#9a9ca0', 'stone');
    b.add(K.at(K.box(0.6, 0.08, 0.9), s * (AV.w / 2 + 0.4), 0.55, z), '#85878b', 'stone');
  }
  // a faint spiral inlay where the minaret's foot was meant to be
  const spiralPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 90; i++) { const a = i * 0.22, r = 0.08 + i * 0.015; spiralPts.push(new THREE.Vector3(SP.x + Math.cos(a) * r, 0.02, SP.z + Math.sin(a) * r)); }
  b.add(K.tube(spiralPts, 0.035, 160, 4), '#b4b6b9', 'stone');
  b.add(K.at(K.cyl(1.55, 1.55, 0.02, 32), SP.x, 0, SP.z), '#696c71', 'stone');

  // ---- plaza and the metal museum
  b.add(K.at(K.cyl(7, 7, 0.06, 64), 0, 0, 0), '#7a7d82', 'stone');
  for (let i = 0; i < 4; i++) b.add(K.at(K.ring(4.8 + i * 0.55, 4.84 + i * 0.55, 64), 0, 0.065, 0), '#64676c', 'stone');
  const IRON = '#2c2f35';
  b.add(K.at(K.ngon(4.7, 0.35, 8), 0, 0, 0, { ry: Math.PI / 8 }), '#8a8c90', 'stone');
  b.add(K.at(K.ngon(2.9, 5.2, 8), 0, 0.35, 0, { ry: Math.PI / 8 }), '#7cc0ff', 'glow', 0.7); // the azure inner light
  for (let f = 0; f < 3; f++) {
    const y = 0.35 + f * 1.7;
    b.add(K.at(K.ngon(4.2, 1.7, 8), 0, y, 0, { ry: Math.PI / 8 }), '#a9d4f0', 'glass');
    b.add(K.at(K.ngon(4.35, 0.14, 8), 0, y + 1.6, 0, { ry: Math.PI / 8 }), IRON, 'metal');
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8 * 0;
      b.add(K.at(K.box(0.16, 1.7, 0.16), Math.cos(a + Math.PI / 8) * 4.2, y, Math.sin(a + Math.PI / 8) * 4.2), IRON, 'metal');
      // mullions and riveted transoms on each room's glazed face
      const am = a, cx = Math.cos(am) * 3.9, cz = Math.sin(am) * 3.9;
      b.add(K.at(K.box(0.05, 1.6, 0.05), cx, y, cz), IRON, 'metal');
      b.add(K.at(K.box(3.2, 0.05, 0.05), cx, y + 1.05, cz, { ry: -am + Math.PI / 2 }), IRON, 'metal');
      b.add(K.at(K.cyl(0.12, 0.16, 0.45, 8), Math.cos(am) * 3.35, y, Math.sin(am) * 3.35), '#3d4047', 'metal');
    }
  }
  const DY = 0.35 + 5.1;
  b.add(K.at(K.dome(3.7, 40, 1, 0.95), 0, DY, 0), '#b9dcf2', 'glass');
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2, pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 10; j++) { const e = (j / 10) * Math.PI / 2; pts.push(new THREE.Vector3(Math.cos(a) * Math.cos(e) * 3.72, DY + Math.sin(e) * 3.72 * 0.95, Math.sin(a) * Math.cos(e) * 3.72)); }
    b.add(K.tube(pts, 0.05, 12, 4), IRON, 'metal');
  }
  for (const e of [0.35, 0.75]) b.add(K.at(K.torus(Math.cos(e) * 3.72, 0.05, 4, 48), 0, DY + Math.sin(e) * 3.53, 0), IRON, 'metal');
  b.add(K.at(K.cyl(0.5, 0.6, 0.6, 8), 0, DY + 3.5, 0), IRON, 'metal');
  b.add(K.at(K.cone(0.55, 0.9, 8), 0, DY + 4.1, 0), IRON, 'metal');
  b.add(K.at(K.box(1.4, 1.2, 0.5), 0, 0.35, 4.05), IRON, 'metal');
  b.add(K.at(K.box(1.0, 1.0, 0.1), 0, 0.35, 4.3), '#ffd28a', 'glow', 2.2);
  // amber lamp posts around the plaza
  const lampTops: THREE.Vector3[] = [];
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 + 0.1, x = Math.cos(a) * 6.5, z = Math.sin(a) * 6.5;
    b.add(K.at(K.cyl(0.04, 0.06, 1.3, 6), x, 0, z), IRON, 'metal');
    b.add(K.at(K.sphere(0.12, 8, 6), x, 1.38, z), '#ffcf86', 'glow', 3);
    lampTops.push(new THREE.Vector3(x, 1.38, z));
  }
  stone.add(b.build({ name: 'fedora' }));
  stone.add(K.glowPoints(lampTops, '#e3b46b', 1.0, 0.7));

  // ---- the grey city: instanced stone houses under slate roofs
  type H = { x: number; z: number; w: number; d: number; h: number; ry: number; gable: boolean };
  const houses: H[] = [];
  const cell = 1.35;
  for (let ix = -17; ix <= 17; ix++) for (let iz = -17; iz <= 17; iz++) {
    if (ix % 4 === 0 || iz % 5 === 0) continue;
    const swirl = Math.hypot(ix, iz) * 0.035;
    const gx = ix * cell, gz = iz * cell;
    const x = gx * Math.cos(swirl) - gz * Math.sin(swirl) + rng.float(-0.08, 0.08);
    const z = gx * Math.sin(swirl) + gz * Math.cos(swirl) + rng.float(-0.08, 0.08);
    if (blocked(x, z, 0.35)) continue;
    const r = Math.hypot(x, z);
    const civic = rng.chance(0.03);
    houses.push({ x, z, ry: swirl + rng.float(-0.04, 0.04), w: civic ? 1.3 : rng.float(1.0, 1.28), d: civic ? 1.3 : rng.float(1.0, 1.28), h: civic ? rng.float(4, 5.5) : K.lerp(3.6, 1.2, (r - 7) / 15) * rng.float(0.7, 1.25), gable: rng.chance(0.55) });
  }
  const houseMat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.02 });
  const roofMat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.1 });
  const wallCols = ['#8f9195', '#9a9b9c', '#83868b', '#a3a29e', '#7b7e83'];
  stone.add(K.instanced(K.box(1, 1, 1), houseMat, houses.length, (i, o, c) => {
    const h = houses[i]; o.position.set(h.x, 0, h.z); o.rotation.y = h.ry; o.scale.set(h.w, h.h, h.d);
    c.copy(K.pickJitter(wallCols, rng, 0.005, 0.02, 0.05));
  }));
  const gableGeo = K.gableRoof(1, 1, 0.55, 0.04);
  const mansGeo = K.hipRoof(1, 1, 0.5, 0.5, 0.03);
  const gables = houses.filter((h) => h.gable), hips = houses.filter((h) => !h.gable);
  const roofFill = (list: H[]) => (i: number, o: THREE.Object3D, c: THREE.Color) => {
    const h = list[i]; o.position.set(h.x, h.h, h.z); o.rotation.y = h.ry + (i % 2 ? Math.PI / 2 : 0); o.scale.set(h.w, 1, h.d);
    c.copy(K.jitter('#4d545e', rng, 0.01, 0.03, 0.06));
  };
  stone.add(K.instanced(gableGeo, roofMat, gables.length, roofFill(gables)));
  stone.add(K.instanced(mansGeo, roofMat, hips.length, roofFill(hips)));
  // chimneys and a scatter of newly lit windows
  const chim = houses.filter(() => rng.chance(0.35));
  stone.add(K.instanced(K.box(0.14, 0.5, 0.14), houseMat, chim.length, (i, o, c) => {
    const h = chim[i]; o.position.set(h.x + h.w * 0.25, h.h, h.z + 0.1); c.set('#6a6b6e');
  }));
  const winPos: THREE.Vector3[] = [];
  for (const h of houses) if (rng.chance(0.4)) {
    const s = rng.sign();
    winPos.push(new THREE.Vector3(h.x + Math.cos(h.ry) * h.w * 0.505 * s, rng.float(0.4, h.h - 0.3), h.z - Math.sin(h.ry) * h.w * 0.505 * s));
  }
  stone.add(K.instanced(K.boxC(0.06, 0.2, 0.14), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc979').multiplyScalar(2.2) }), winPos.length, (i, o) => { o.position.copy(winPos[i]); }, { castShadow: false, colors: false }));

  // ---- 24 glass globes, one in every room, each holding a blue Fedora
  const globeMat = new THREE.MeshStandardMaterial({ color: '#cfe8ff', emissive: AZURE, emissiveIntensity: 2.2, roughness: 0.15, transparent: true, opacity: 0.9 });
  const globePos: THREE.Vector3[] = [];
  for (let f = 0; f < 3; f++) for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    globePos.push(new THREE.Vector3(Math.cos(a) * 3.35, 0.35 + f * 1.7 + 0.72, Math.sin(a) * 3.35));
  }
  const globeScale = globePos.map((_, i) => (i === 1 || i === 2 || i === 3 ? 0.5 : 0.36));
  const globes = K.instanced(K.sphere(1, 18, 12), globeMat, globePos.length, (i, o) => { o.position.copy(globePos[i]); o.scale.setScalar(globeScale[i]); }, { castShadow: false, colors: false });
  stone.add(globes);
  const globeSet = K.instanceSetter(globes);
  const globeHalos = K.glowPoints(globePos, AZURE, 1.6, 0.75);
  stone.add(globeHalos);

  // visitors crossing the plaza to the museum doors
  const visitorPaths: THREE.Vector3[][] = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.3;
    visitorPaths.push([new THREE.Vector3(Math.cos(a) * 7.4, 0.06, Math.sin(a) * 7.4), new THREE.Vector3(Math.cos(a) * 5.4, 0.06, Math.sin(a) * 5.4), new THREE.Vector3(0.3 * Math.sign(Math.cos(a)), 0.06, 4.6)]);
  }
  const visitors = new K.Walkers({ paths: visitorPaths, count: 46, rng: rng.fork('vis'), speed: [0.12, 0.25], colors: ['#2c2e33', '#4a4d55', '#6b5e4e', '#3a3f4a', '#7a2e2a'] });
  stone.add(visitors.mesh);

  // ---- the blue Fedora (inside a globe; grows to fill the diorama when entered)
  const blue = new THREE.Group();
  const bb = new K.Batch();
  const blueGlass = new THREE.MeshStandardMaterial({ color: '#2f7fe0', emissive: '#1d5fb8', emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.7 });
  bb.add(K.at(K.disc(21, 72), 0, 0.03, 0), '#0f3466', 'glow', 1.0);
  for (let i = 1; i < 8; i++) bb.add(K.at(K.ring(i * 2.6, i * 2.6 + 0.05, 96), 0, 0.045, 0), '#5cb3ff', 'glow', 1.4);
  bb.add(K.at(K.box(1.4, 0.04, canalLen + 0.5), cm.x, 0.04, cm.y, { ry: canalAng }), '#2e8cff', 'glow', 1.6);
  bb.add(K.at(K.cyl(2.6, 2.6, 0.05, 48), SQ.x, 0.04, SQ.z), '#2e8cff', 'glow', 1.6);
  bb.add(K.at(K.torus(2.65, 0.1, 6, 48), SQ.x, 0.1, SQ.z), '#e6f4ff', 'glow', 2.2);
  bb.add(K.at(K.box(AV.w, 0.05, AV.z1 - AV.z0), 0, 0.04, (AV.z0 + AV.z1) / 2), '#9fd0ff', 'glow', 1.2);
  // the spiral minaret, wound by a slide, hovering above its blue roofs
  bb.add(K.at(K.spiralStair(1.2, 7.5, 64, 3.5, 0.55, true), SP.x, 1.2, SP.z), '#bfe4ff', 'glow', 1.3);
  bb.add(K.at(K.cone(0.5, 1.6, 12), SP.x, 8.7, SP.z), '#e6f4ff', 'glow', 2.4);
  const bluePos: [number, number, number, number][] = [];
  for (const h of houses) if (rng.chance(0.42)) bluePos.push([h.x, h.z, h.w * 0.85, h.h * rng.float(0.6, 1.5)]);
  for (const [x, z, w, h] of bluePos) {
    bb.addWith(K.at(K.box(w, h, w), x, 0, z), blueGlass);
    bb.add(K.at(K.box(w + 0.04, 0.06, w + 0.04), x, h, z), '#9fd6ff', 'glow', 1.2);
    if (rng.chance(0.35)) bb.add(K.at(K.dome(w * 0.45, 10), x, h, z), '#bfe4ff', 'glow', 1.1);
  }
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; bb.add(K.at(K.cyl(0.12, 0.12, 5, 8), Math.cos(a) * 4.4, 0, Math.sin(a) * 4.4), '#bfe4ff', 'glow', 1.4); }
  bb.addWith(K.at(K.dome(4.6, 32, 1, 1.3), 0, 5, 0), blueGlass);
  blue.add(bb.build({ castShadow: false }));
  // jellyfish pulsing in the round pond
  const jellyMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#e9f6ff').multiplyScalar(1.8), transparent: true, opacity: 0.8 });
  const jelly = K.instanced(K.dome(0.22, 10, 1, 0.8), jellyMat, 14, () => {}, { castShadow: false, colors: false });
  jelly.frustumCulled = false;
  blue.add(jelly);
  const setJelly = K.instanceSetter(jelly);
  const jellyP = Array.from({ length: 14 }, () => [rng.float(0, 6.28), rng.float(0.3, 2.1), rng.float(0, 6.28)]);
  // elephants with canopied seats parading the avenue
  const eleGeo = K.merge([K.quadruped({ len: 0.9, h: 0.75, color: '#dff0ff', ears: true, tail: 0.2 }), K.paint(K.at(K.box(0.42, 0.25, 0.5), 0, 0.78, 0), '#ffffff'), K.paint(K.at(K.pyramid(0.55, 0.65, 0.3), 0, 1.25, 0), '#7fc0ff'), K.paint(K.at(K.cyl(0.02, 0.02, 0.25, 4), 0, 1.0, 0), '#ffffff')]);
  const eleMat = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#3d8fe0', emissiveIntensity: 0.5, roughness: 0.5 });
  const elephants = new K.Walkers({ paths: [[new THREE.Vector3(-0.5, 0.06, AV.z1 - 0.5), new THREE.Vector3(-0.5, 0.06, 6.2)], [new THREE.Vector3(0.55, 0.06, 6.2), new THREE.Vector3(0.55, 0.06, AV.z1 - 0.5)]], count: 8, geometry: eleGeo, material: eleMat, speed: [0.35, 0.35], rng: rng.fork('ele'), colors: ['#ffffff'] });
  blue.add(elephants.mesh);
  // the rider sliding down the minaret
  const rider = new THREE.Mesh(K.sphere(0.18, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(3) }));
  blue.add(rider);
  // the curved glass of the globe, faintly overhead
  const sky = new THREE.Mesh(K.merge([K.at(K.torus(24, 0.06, 4, 96, Math.PI), 0, 0, 0, { rx: Math.PI / 2, ry: 0.5 }), K.at(K.torus(23.5, 0.04, 4, 96, Math.PI), 0, 0, 0, { rx: Math.PI / 2, ry: 0.62 })]), new THREE.MeshBasicMaterial({ color: '#cfeaff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  blue.add(sky);
  blue.visible = false;
  root.add(blue);
  const HERO = globePos[2];

  // ---- the recurring projection of a new ideal plan, which shrinks into a globe
  const projPairs: [K.V3, K.V3][] = [];
  for (let k = 0; k < 40; k++) {
    const x = rng.float(-5, 5), z = rng.float(-5, 5), w = rng.float(0.6, 1.6), h = rng.float(1.5, 6);
    const c = [[x - w, z - w], [x + w, z - w], [x + w, z + w], [x - w, z + w]];
    for (let e = 0; e < 4; e++) {
      const [ax, az] = c[e], [bx, bz] = c[(e + 1) % 4];
      projPairs.push([[ax, 0, az], [bx, 0, bz]], [[ax, h, az], [bx, h, bz]], [[ax, 0, az], [ax, h, az]]);
    }
  }
  for (let i = 0; i < 48; i++) { const a = i * 0.5, r = 0.4 + i * 0.12; projPairs.push([[Math.cos(a) * r, 6.5 + i * 0.05, Math.sin(a) * r], [Math.cos(a + 0.5) * (r + 0.12), 6.55 + i * 0.05, Math.sin(a + 0.5) * (r + 0.12)]]); }
  const proj = K.lines(projPairs, '#8fd0ff', 0);
  const projMat = proj.material as THREE.LineBasicMaterial;
  projMat.blending = THREE.AdditiveBlending; projMat.transparent = true;
  stone.add(proj);
  const projSpots = [[-13, -8], [13, 6], [-9, 13], [10, -13]];

  // overcast breath: drizzle and slow mist
  root.add(K.particles({ count: 700, radius: 24, y0: 0, y1: 18, color: '#d7dde4', size: 0.035, opacity: 0.35, velocity: [0.3, -6, 0.1], rng: rng.fork('rain') }));
  const mist = K.particles({ count: 120, radius: 22, y0: 0.5, y1: 3, color: '#c4c8cc', size: 1.8, opacity: 0.08, velocity: [0.25, 0, 0.1], swirl: 1, rng: rng.fork('mist') });
  stone.add(mist);
  const birds = new K.Flock({ count: 14, center: [0, 0, 0], radius: 13, height: 11, color: '#2b2d31', span: 0.3, speed: 0.3, rng: rng.fork('birds') });
  root.add(birds.mesh);

  const inside = new K.Toggle(0.3);
  const tmp = new THREE.Vector3();

  return {
    root,
    env: {
      skyTop: '#6c7380', skyHorizon: '#c4c5c3', skyBottom: '#8d9198', skyCurve: 0.6,
      fog: '#a8acb0', fogNear: 60, fogFar: 170,
      sunDir: [0.4, 0.8, 0.35], sunColor: '#e7e9ec', sunIntensity: 0.9, sunDisc: 0, sunGlow: 0.2,
      hemiSky: '#c9ced6', hemiGround: '#55585e', hemiIntensity: 1.25, envIntensity: 0.9,
      clouds: 0.65, cloudColor: '#d4d6d8',
      bloomStrength: 0.85, bloomThreshold: 0.75, bloomRadius: 0.6,
      tiltShift: 0.45, shadowRadius: 25, vignette: 0.4, saturation: 0.95, contrast: 1.05,
    },
    camera: {
      position: [30, 25, 30], target: [0, 2.5, 0], fov: 40,
      minDistance: 10, maxDistance: 90, maxPolar: 1.4, autoRotate: 0.2,
      views: [
        { position: [8.5, 10, 11], target: [0, 3.2, 0] },
        { position: [-26, 15, 20], target: [-6, 1, 2] },
      ],
    },
    interaction: {
      label: 'Enter a globe',
      activeLabel: 'Return to the stone',
      hint: 'A Fedora that might have been, kept under glass.',
      camera: { position: [24, 13, 26], target: [0, 3, 0] },
      set: (on) => inside.set(on),
    },
    update(t, dt) {
      inside.update(dt);
      const v = inside.value;
      // the stone city sinks away while the blue city grows out of its globe
      stone.visible = v < 0.999;
      stone.scale.set(1, Math.max(0.001, 1 - v), 1);
      blue.visible = v > 0.001;
      const s = Math.max(0.001, K.lerp(0.012, 1, v * v));
      blue.scale.setScalar(s);
      blue.position.copy(HERO).multiplyScalar(1 - v);
      (sky.material as THREE.MeshBasicMaterial).opacity = v * 0.5;
      // globes breathe; the projection cycle feeds one more globe every 25 s
      const cyc = t % 25, k = Math.floor(t / 25);
      const spot = projSpots[k % projSpots.length];
      const grow = K.smoothstep(1, 5, cyc), fit = K.smoothstep(12, 13.5, cyc), into = K.smoothstep(14, 19, cyc);
      const target = globePos[(k * 5 + 7) % globePos.length];
      const flicker = fit > 0 && into < 0.05 ? 0.5 + 0.5 * Math.sin(t * 30) : 1;
      projMat.opacity = grow * (1 - into * 0.6) * 0.75 * flicker * (into > 0.99 ? 0 : 1);
      const ps = K.lerp(1, 0.01, into);
      proj.scale.set(ps, ps * grow, ps);
      proj.rotation.y = into * 6 + t * 0.02;
      proj.position.set(K.lerp(spot[0], target.x, into), K.lerp(0, target.y, into), K.lerp(spot[1], target.z, into));
      const arrive = Math.exp(-Math.max(0, cyc - 19) * 1.2) * (cyc > 19 ? 1 : 0);
      globePos.forEach((p, i) => {
        const pulse = 1 + 0.04 * Math.sin(t * 1.3 + i);
        const flare = p === target ? 1 + arrive * 0.6 : 1;
        globeSet(i, p.x, p.y, p.z, 0, globeScale[i] * pulse * flare);
      });
      globeSet.done();
      globeMat.emissiveIntensity = 2.0 + 0.3 * Math.sin(t * 0.8) + arrive * 1.5;
      // life under glass
      if (blue.visible) {
        jellyP.forEach((j, i) => {
          const a = j[0] + t * 0.15, r = j[1], pul = 1 + 0.25 * Math.sin(t * 2.4 + j[2]);
          setJelly(i, SQ.x + Math.cos(a) * r, 0.18 + 0.1 * Math.sin(t + j[2]), SQ.z + Math.sin(a) * r, 0, [pul, 1 / pul, pul]);
        });
        setJelly.done();
        elephants.update(t);
        const u = K.fract(t / 9), ang = (1 - u) * 3.5 * Math.PI * 2;
        tmp.set(SP.x + Math.cos(ang) * 1.0, 1.4 + (1 - u) * 7.3, SP.z - Math.sin(ang) * 1.0);
        rider.position.copy(tmp);
      }
      visitors.update(t);
      birds.update(t);
    },
  };
};

export default build;
