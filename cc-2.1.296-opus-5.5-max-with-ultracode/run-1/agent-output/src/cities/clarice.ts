// CLARICE - Cities & Names 4.
// A fixed site and a fixed hand of cards: a round travertine plinth bearing the name,
// and 35 durable fragments (9 Corinthian capitals, 12 marble urns, 8 wrought-iron
// grilles, 6 brocade cloths) that outlast every age. In the chrysalis Clarice they are
// put to use among patched huts: basil in the urns, grilles over cooking fires,
// brocade as bedsheets, a capital holding up the hens' basket. In the butterfly
// Clarice the very same pieces sit under bell jars, in vitrines and in the Museum of
// Capitals. Above, a faint gold drawing of a first Clarice that no one can prove.
// Toggle: shuffle, the fragments rise, circle like a deck of cards and are dealt again.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const TAU = Math.PI * 2;
type Pose = { p: THREE.Vector3; r: THREE.Euler };
const pose = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): Pose => ({ p: new THREE.Vector3(x, y, z), r: new THREE.Euler(rx, ry, rz) });

function capitalGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    K.lathe([[0.001, 0], [0.2, 0], [0.21, 0.04], [0.19, 0.06], [0.22, 0.3], [0.3, 0.45], [0.001, 0.46]], 20),
    K.at(K.box(0.78, 0.12, 0.78), 0, 0.46, 0),
  ];
  for (let ring = 0; ring < 2; ring++) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + ring * (TAU / 16);
      const leaf = K.at(K.cone(0.07, 0.2 + ring * 0.08, 4), 0, 0, 0, { s: [1, 1, 0.4], rx: 0.35 });
      parts.push(K.at(leaf, Math.cos(a) * (0.2 + ring * 0.03), 0.05 + ring * 0.12, Math.sin(a) * (0.2 + ring * 0.03), { ry: Math.PI / 2 - a }));
    }
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    parts.push(K.at(K.torus(0.06, 0.025, 5, 12), Math.cos(a) * 0.36, 0.42, Math.sin(a) * 0.36, { rx: Math.PI / 2, rz: a }));
  }
  return K.paint(K.merge(parts), '#f4efe4');
}
function urnGeo(): THREE.BufferGeometry {
  return K.paint(K.lathe([[0.001, 0], [0.11, 0], [0.11, 0.03], [0.07, 0.06], [0.17, 0.2], [0.19, 0.29], [0.13, 0.4], [0.09, 0.43], [0.13, 0.48], [0.12, 0.5], [0.001, 0.49]], 18), '#ece6da');
}
function grilleGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const W = 0.8, H = 1.1, t = 0.022;
  for (const x of [-W / 2, W / 2]) parts.push(K.at(K.boxC(t * 1.6, H, t * 1.6), x, 0, 0));
  for (const y of [-H / 2, -0.15, H / 2]) parts.push(K.at(K.boxC(W, t * 1.6, t * 1.6), 0, y, 0));
  for (let i = 1; i < 6; i++) parts.push(K.at(K.boxC(t, H, t), -W / 2 + (i * W) / 6, 0, 0));
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) parts.push(K.at(K.torus(0.1, 0.012, 4, 14, Math.PI * 1.5), s * 0.2, 0.3 - i * 0.0, 0, { rx: Math.PI / 2, rz: s * 0.8 + i }));
  parts.push(K.at(K.torus(0.16, 0.014, 4, 18), 0, 0.22, 0, { rx: Math.PI / 2 }));
  return K.paint(K.merge(parts), '#1c1a1c');
}

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  // ---- the site that never changes: a travertine plinth with the name round its rim
  const RP = 21;
  root.add(K.plinth({ radius: RP, height: 1.6, color: '#b9aa90', gilded: false, seg: 120 }));
  const top = K.groundDisc(RP - 0.02, '#c4b69d', '#a99a80', 120);
  K.paintBy(top.geometry, (x, _y, z, out) => {
    const n = K.fbm2(x * 0.18, z * 0.18, 4), crack = Math.abs(K.noise2(x * 0.5, z * 0.5));
    out.copy(K.mix('#c4b69d', '#9d8f78', K.smoothstep(0.1, 0.5, n))).multiplyScalar(crack < 0.03 ? 0.7 : 1);
  });
  top.position.y = 0.002;
  root.add(top);
  const nameTex = K.canvasTexture(4096, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = `600 84px ${K.DISPLAY_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 0; i < 2; i++) {
      const x = ((i + 0.5) / 2) * w;
      g.fillStyle = 'rgba(40,28,18,0.9)';
      g.fillText('C L A R I C E', x + 3, h / 2 + 3);
      g.fillStyle = 'rgba(244,214,150,1)';
      g.fillText('C L A R I C E', x, h / 2);
    }
  });
  nameTex.wrapS = THREE.RepeatWrapping;
  nameTex.repeat.x = 3;
  const rimText = new THREE.Mesh(new THREE.CylinderGeometry(RP + 0.015, RP + 0.015, 1.25, 160, 1, true).translate(0, -0.8, 0), new THREE.MeshBasicMaterial({ map: nameTex, transparent: true, depthWrite: false, color: '#e8c98a' }));
  root.add(rimText);

  // =============================================================== chrysalis Clarice
  const chrys = new THREE.Group();
  root.add(chrys);
  const cb = new K.Batch();
  const nearRun = (x: number, z: number) => Math.hypot(x, z - 4) < 2.4;
  const huts: { x: number; z: number; a: number; w: number; h: number }[] = [];
  let guard = 0;
  while (huts.length < 70 && guard++ < 2000) {
    const [x, z] = rng.inRing(4.2, 17);
    if (nearRun(x, z) || huts.some((h) => Math.hypot(h.x - x, h.z - z) < 1.25)) continue;
    const a = Math.atan2(z, x), w = rng.float(0.7, 1.2), h = rng.float(0.5, 1.2);
    huts.push({ x, z, a, w, h });
    const ry = -a + Math.PI / 2 + rng.float(-0.4, 0.4), lean = rng.float(-0.08, 0.08);
    cb.add(K.at(K.box(w, h, w * rng.float(0.8, 1.1)), x, 0, z, { ry, rz: lean }), K.pickJitter(['#7b4a33', '#6a5040', '#8a6a4c', '#5a463a', '#94704e'], rng), 'wood');
    cb.add(K.at(K.shedRoof(w + 0.2, w + 0.1, 0.05, rng.float(0.15, 0.3)), x, h - 0.02, z, { ry: ry + rng.float(-0.2, 0.2), rz: lean }), K.pickJitter(['#6f6a62', '#8a5a3a', '#5d564e', '#7a3f2a'], rng), rng.chance(0.5) ? 'metal' : 'wood');
    cb.add(K.at(K.wallPlane(0.22, 0.38), x + Math.cos(a) * 0.0, 0, z, { ry }), '#241a14', 'matte');
  }
  // lanes of mud, dark rivulets running outward
  const rivAngles: number[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.3;
    rivAngles.push(a);
    for (let k = 0; k < 14; k++) {
      const r = 4.5 + k * 0.95, wob = Math.sin(k * 1.7 + i) * 0.25;
      cb.add(K.at(K.box(0.18, 0.012, 1.05), Math.cos(a + wob * 0.03) * r, 0.006, Math.sin(a + wob * 0.03) * r, { ry: -a + Math.PI / 2 + wob }), '#2c241c', 'polished');
    }
  }
  // fallen beams, broken cornice blocks, landslip mounds
  for (let i = 0; i < 12; i++) { const [x, z] = rng.inRing(5, 18); if (!nearRun(x, z)) cb.add(K.at(K.cyl(0.08, 0.08, rng.float(1.5, 2.6), 6), x, 0.08, z, { rz: Math.PI / 2, ry: rng.angle() }), '#5a4232', 'wood'); }
  for (let i = 0; i < 15; i++) {
    const [x, z] = rng.inRing(5, 18);
    if (nearRun(x, z)) continue;
    const g = K.merge([K.box(0.7, 0.18, 0.35), K.at(K.box(0.7, 0.1, 0.45), 0, 0.18, 0.05), K.at(K.box(0.7, 0.06, 0.55), 0, 0.28, 0.1)]);
    cb.add(K.at(g, x, 0, z, { ry: rng.angle(), rz: rng.float(-0.3, 0.3) }), '#d8ccb4', 'stone');
  }
  for (const a of [0.9, 2.9, 4.6]) cb.add(K.wobble(K.at(K.sphere(2.4, 14, 8), Math.cos(a) * 18.4, -0.9, Math.sin(a) * 18.4, { s: [1.3, 0.55, 1] }), 0.3, 0.8, a), '#7a6248', 'matte');
  // rabbit hutches
  for (let i = 0; i < 10; i++) {
    const h = huts[(i * 7) % huts.length];
    const x = h.x + Math.cos(h.a + 1.2) * 0.9, z = h.z + Math.sin(h.a + 1.2) * 0.9;
    for (let k = 0; k < 3; k++) {
      cb.add(K.at(K.box(0.5, 0.26, 0.34), x, k * 0.28, z, { ry: -h.a }), '#7a5a3e', 'wood');
      cb.add(K.at(K.wallPlane(0.4, 0.18), x + Math.cos(h.a) * 0.175, k * 0.28 + 0.04, z + Math.sin(h.a) * 0.175, { ry: Math.PI / 2 - h.a }), '#3a3a3a', 'metal');
    }
  }
  // the chicken run at (0, 0, 4): fence, egg basket, hens
  for (let i = 0; i < 16; i++) {
    const s = (i % 4) / 4, side = Math.floor(i / 4);
    const p = [[-1 + 2 * s, -1], [1, -1 + 2 * s], [1 - 2 * s, 1], [-1, 1 - 2 * s]][side];
    cb.add(K.at(K.box(0.05, 0.5, 0.05), p[0], 0, 4 + p[1]), '#6a4a30', 'wood');
  }
  for (const [x, z, ry] of [[0, 3, 0], [0, 5, 0], [-1, 4, Math.PI / 2], [1, 4, Math.PI / 2]] as const) for (const y of [0.18, 0.4]) cb.add(K.at(K.box(2, 0.03, 0.02), x, y, z, { ry }), '#7a5a3a', 'wood');
  cb.add(K.at(K.cyl(0.32, 0.22, 0.2, 14, true), 0, 0.58, 4), '#a0784a', 'wood');
  for (let i = 0; i < 5; i++) cb.add(K.at(K.sphere(0.05, 6, 5), Math.cos(i * 1.3) * 0.1, 0.72, 4 + Math.sin(i * 1.3) * 0.1, { s: [1, 1.25, 1] }), '#efe2c4', 'ceramic');
  for (let i = 0; i < 5; i++) {
    const x = rng.float(-0.8, 0.8), z = 4 + rng.float(-0.8, 0.8);
    if (Math.hypot(x, z - 4) < 0.45) continue;
    const ry = rng.angle();
    cb.add(K.at(K.sphere(0.1, 8, 6), x, 0.12, z, { s: [0.8, 0.8, 1.2], ry }), rng.pick(['#e8dcc4', '#8a4a2a', '#c9a06a']), 'cloth');
    cb.add(K.at(K.sphere(0.05, 6, 5), x + Math.sin(ry) * 0.12, 0.22, z + Math.cos(ry) * 0.12), '#c0392b', 'cloth');
  }
  // beds for the brocade, drying lines, fires of inlaid wood
  const fires: THREE.Vector3[] = [];
  for (let i = 0; i < 6; i++) {
    const h = huts[(i * 11 + 3) % huts.length];
    const x = h.x - Math.cos(h.a) * 1.1, z = h.z - Math.sin(h.a) * 1.1;
    fires.push(new THREE.Vector3(x, 0, z));
    for (let k = 0; k < 4; k++) cb.add(K.at(K.box(0.5, 0.06, 0.08), x, 0.03, z, { ry: (k / 4) * Math.PI }), k % 2 ? '#8a5a2a' : '#c9a06a', 'wood');
    cb.add(K.at(K.sphere(0.16, 8, 5), x, 0.02, z, { s: [1, 0.5, 1] }), '#ff7a2a', 'glow', 4);
    for (let k = 0; k < 6; k++) cb.add(K.at(K.box(0.12, 0.12, 0.12), x + Math.cos(k) * 0.32, 0, z + Math.sin(k) * 0.32), '#5a5048', 'stone');
  }
  const beds: Pose[] = [];
  for (let i = 0; i < 4; i++) {
    const h = huts[(i * 13 + 5) % huts.length];
    const x = h.x + Math.cos(h.a - 1.4) * 1.0, z = h.z + Math.sin(h.a - 1.4) * 1.0, ry = -h.a;
    cb.add(K.at(K.box(1.3, 0.25, 0.9), x, 0, z, { ry }), '#5a4232', 'wood');
    beds.push(pose(x, 0.265, z, -Math.PI / 2, 0, -ry));
  }
  const lines: Pose[] = [];
  for (let i = 0; i < 2; i++) {
    const h = huts[(i * 17 + 9) % huts.length];
    const x = h.x + Math.cos(h.a + 2) * 1.2, z = h.z + Math.sin(h.a + 2) * 1.2, ry = h.a;
    for (const s of [-1, 1]) cb.add(K.at(K.cyl(0.03, 0.03, 1.7, 5), x + Math.cos(ry) * s * 0.85, 0, z - Math.sin(ry) * s * 0.85), '#5a4232', 'wood');
    cb.add(K.strut([x - Math.cos(ry) * 0.85, 1.65, z + Math.sin(ry) * 0.85], [x + Math.cos(ry) * 0.85, 1.65, z - Math.sin(ry) * 0.85], 0.008, 3), '#d8ccb0', 'cloth');
    lines.push(pose(x, 1.15, z, 0, ry, 0));
  }
  chrys.add(cb.build({ name: 'chrysalis' }));
  const smokeC = K.smoke({ sources: fires.map((f) => [f.x, 0.25, f.z] as [number, number, number]), perSource: 22, height: 3.5, color: '#8a7a6c', opacity: 0.35, size: [0.3, 1.1], life: 5, wind: [0.2, 0.1], rng: rng.fork('smoke') });
  chrys.add(smokeC);
  const ratGeo = K.quadruped({ len: 0.2, h: 0.08, color: '#3a302a', tail: 0.14, ears: true });
  const rats = K.instanced(ratGeo, K.std('#ffffff', { vertexColors: true, roughness: 0.9 }), 24, undefined, { colors: false });
  chrys.add(rats);
  const setRat = K.instanceSetter(rats);
  const flock = new K.Flock({ count: 14, radius: 11, height: 3.2, color: '#2a2422', span: 0.28, speed: 0.3, rng: rng.fork('birds') });
  chrys.add(flock.mesh);

  // =============================================================== butterfly Clarice
  const butter = new THREE.Group();
  root.add(butter);
  const bb = new K.Batch();
  // the Museum of Capitals: open-roofed gallery on the same spot as the chicken run
  bb.add(K.at(K.box(8.4, 0.12, 2.6), 0, 0, 4), '#e9e2d4', 'polished');
  bb.add(K.at(K.box(8.4, 1.8, 0.15), 0, 0, 2.75), '#f1ece2', 'plaster');
  for (const s of [-1, 1]) bb.add(K.at(K.box(0.15, 1.8, 2.6), s * 4.15, 0, 4), '#f1ece2', 'plaster');
  for (let i = 0; i < 9; i++) {
    const x = -3.6 + i * 0.9;
    bb.add(K.at(K.box(0.5, 0.5, 0.5), x, 0.12, 4), '#2a2a32', 'polished');
    bb.add(K.at(K.box(0.06, 0.06, 2.6), x, 1.8, 4), '#c9a24c', 'gold');
  }
  bb.add(K.at(K.box(8.4, 0.05, 0.2), 0, 1.8, 2.8), '#fff4dd', 'glow', 2.5);
  // promenade of pedestals with velvet cushions (urns under bell jars)
  const promo: Pose[] = [];
  const jarPos: THREE.Vector3[] = [];
  for (let i = 0; i < 12; i++) {
    const a = 0.35 + (i / 11) * (Math.PI - 0.7), r = 8.6, x = Math.cos(a) * r, z = Math.sin(a) * r;
    bb.add(K.at(K.ngon(0.28, 0.95, 8), x, 0, z), '#e8e2d6', 'stone');
    bb.add(K.at(K.box(0.48, 0.1, 0.48), x, 0.95, z, { ry: -a }), '#1f2a5a', 'cloth');
    bb.add(K.at(K.dome(0.34, 18, 1, 1.9), x, 1.05, z), '#e6f4ff', 'glass');
    promo.push(pose(x, 1.05, z, 0, -a, 0));
    jarPos.push(new THREE.Vector3(x, 1.65, z));
  }
  bb.add(K.at(K.ring(7.9, 9.3, 96), 0, 0.01, 0), '#d8d0c0', 'polished');
  // vitrines for the grilles and the brocade
  const cases: Pose[] = [];
  for (let i = 0; i < 14; i++) {
    const a = 0.2 + (i / 13) * (Math.PI - 0.4), r = 12.4, x = Math.cos(a) * r, z = Math.sin(a) * r, ry = Math.PI / 2 - a;
    bb.add(K.at(K.box(1.7, 0.3, 0.7), x, 0, z, { ry }), '#2a2a32', 'polished');
    bb.add(K.at(K.box(1.6, 1.6, 0.6), x, 0.3, z, { ry }), '#dff0ff', 'glass');
    bb.add(K.at(K.box(1.7, 0.06, 0.7), x, 1.9, z, { ry }), '#c9a24c', 'gold');
    cases.push(pose(x, 1.1, z, 0, ry, 0));
  }
  // the new city: glass pavilions, enamelled towers, a domed arcade, bright awnings
  let nb = 0;
  for (let gx = -17; gx <= 17 && nb < 40; gx += 3.4) {
    for (let gz = -17; gz <= 17 && nb < 40; gz += 3.4) {
      const r = Math.hypot(gx, gz);
      if (r < 5.5 || r > 18.3) continue;
      if (gz > -1 && r > 7 && r < 14) continue;
      if (Math.abs(gx) < 5 && Math.abs(gz - 4) < 2.5) continue;
      nb++;
      const kind = rng.int(0, 3), h = rng.float(1.5, 5);
      if (kind === 0) {
        bb.add(K.at(K.box(2.2, h * 0.6, 2.2), gx, 0, gz), '#cfe8f2', 'glass');
        bb.add(K.at(K.box(2.3, 0.1, 2.3), gx, h * 0.6, gz), '#d8dde2', 'metal');
        bb.add(K.at(K.box(1.2, h * 0.6 - 0.05, 1.2), gx, 0, gz), '#f4c56a', 'glow', 0.9);
      } else if (kind === 1) {
        bb.add(K.at(K.ngon(0.8, h, 6), gx, 0, gz), K.pickJitter(['#2f7a8a', '#d0503a', '#e8c040', '#3a5ab0', '#f0ece4'], rng), 'ceramic');
        bb.add(K.at(K.cone(0.9, 0.8, 6), gx, h, gz), '#c9a24c', 'gold');
      } else if (kind === 2) {
        K.domeHall(bb, { x: gx, z: gz, r: 1.2, h: 1.4, color: '#f2eee6', domeColor: '#a8c8d8', domeFinish: 'glass' });
      } else {
        bb.add(K.at(K.box(2.4, h * 0.5, 2), gx, 0, gz), '#f4f0e8', 'plaster');
        bb.add(K.at(K.shedRoof(2.5, 0.8, 0.0, 0.25), gx, 1.0, gz + 1.2), rng.pick(['#d0503a', '#2f7a8a', '#e8c040']), 'cloth');
        for (let k = 0; k < 3; k++) bb.add(K.at(K.wallPlane(0.4, 0.5), gx - 0.7 + k * 0.7, h * 0.25, gz + 1.012), '#ffe3a8', 'glow', 1.8);
      }
    }
  }
  butter.add(bb.build({ name: 'butterfly' }));
  const crowd = new K.Walkers({ paths: [Array.from({ length: 30 }, (_, i) => { const a = 0.25 + (i / 29) * (Math.PI - 0.5); return new THREE.Vector3(Math.cos(a) * 10.4, 0.01, Math.sin(a) * 10.4); })], count: 34, rng: rng.fork('crowd'), speed: [0.12, 0.25], colors: ['#1f2a5a', '#d0503a', '#f0ece4', '#2f7a8a', '#e8c040', '#3a3a3a'] });
  butter.add(crowd.mesh);
  const sparkles = K.glowPoints(jarPos, '#ffffff', 0.5, 0.0);
  butter.add(sparkles);

  // =============================================================== the 35 fragments
  const fragMat = (rough: number, metal: number, emissive: string) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: metal, emissive, emissiveIntensity: 0.4 });
  const capitals = K.instanced(capitalGeo(), fragMat(0.45, 0, '#fff4e0'), 9, undefined, { colors: false });
  const urns = K.instanced(urnGeo(), fragMat(0.35, 0, '#fff4e0'), 12, undefined, { colors: false });
  const grilles = K.instanced(grilleGeo(), fragMat(0.5, 0.6, '#000000'), 8, undefined, { colors: false });
  const damask = K.canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#8f1e30'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e0b45a'; g.lineWidth = 3;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const cx = (x + (y % 2) * 0.5) * 64 + 16, cy = y * 64 + 32;
      g.beginPath(); g.ellipse(cx, cy, 14, 24, 0, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(cx, cy - 24); g.quadraticCurveTo(cx + 18, cy, cx, cy + 24); g.quadraticCurveTo(cx - 18, cy, cx, cy - 24); g.stroke();
    }
    g.fillStyle = '#d9a84c'; g.fillRect(0, 0, w, 8); g.fillRect(0, h - 8, w, 8);
  });
  damask.wrapS = damask.wrapT = THREE.RepeatWrapping;
  damask.repeat.set(2, 1.4);
  const cloths = K.instanced(new THREE.PlaneGeometry(1.4, 1, 6, 4), new THREE.MeshStandardMaterial({ map: damask, roughness: 0.7, side: THREE.DoubleSide, emissive: '#3a0a10', emissiveIntensity: 0.4 }), 6, undefined, { colors: false });
  root.add(capitals, urns, grilles, cloths);

  // chrysalis poses (A) and butterfly poses (B)
  const capA: Pose[] = [pose(0, 0, 4)];
  for (let i = 0; i < 8; i++) {
    const h = huts[(i * 5 + 1) % huts.length];
    const x = h.x - Math.cos(h.a) * 0.9 + Math.sin(h.a) * 0.4, z = h.z - Math.sin(h.a) * 0.9 - Math.cos(h.a) * 0.4;
    capA.push(i % 3 === 0 ? pose(x, 0.39, z, Math.PI / 2, rng.angle(), 0) : i % 3 === 1 ? pose(x, 0.58, z, Math.PI, rng.angle(), 0) : pose(x, 0, z, 0, rng.angle(), 0.0));
  }
  const capB = Array.from({ length: 9 }, (_, i) => pose(-3.6 + i * 0.9, 0.62, 4, 0, ((i * 37) % 9) * 0.1, 0));
  const urnA = Array.from({ length: 12 }, (_, i) => {
    const h = huts[(i * 6 + 2) % huts.length];
    return pose(h.x - Math.cos(h.a) * (h.w / 2 + 0.25) + Math.sin(h.a) * 0.3, 0, h.z - Math.sin(h.a) * (h.w / 2 + 0.25) - Math.cos(h.a) * 0.3, 0, rng.angle(), 0);
  });
  const urnB = promo;
  const grA: Pose[] = fires.map((f) => pose(f.x, 0.3, f.z, -Math.PI / 2, 0, rng.angle()));
  for (let i = 0; i < 2; i++) { const h = huts[(i * 9 + 20) % huts.length]; grA.push(pose(h.x + Math.cos(h.a) * (h.w / 2 + 0.1), 0.57, h.z + Math.sin(h.a) * (h.w / 2 + 0.1), -0.25, Math.PI / 2 - h.a, 0)); }
  const grB = cases.slice(0, 8);
  const clA = [...beds, ...lines];
  const clB = cases.slice(8, 14).map((c) => pose(c.p.x, c.p.y, c.p.z, 0, c.r.y, 0));
  // basil in the urns (chrysalis only)
  const basil = K.instanced(K.wobble(K.at(K.sphere(0.16, 8, 6), 0, 0.6, 0, { s: [1, 0.8, 1] }), 0.05, 6, 3), K.std('#4f8a3a', { roughness: 0.8 }), 12, undefined, { colors: false });
  root.add(basil);

  type Frag = { mesh: THREE.InstancedMesh; i: number; A: Pose; B: Pose; orbitR0: number; orbitR1: number; oy: number; ph: number; delay: number; spin: THREE.Vector3 };
  const frags: Frag[] = [];
  const addSet = (mesh: THREE.InstancedMesh, A: Pose[], B: Pose[]) => A.forEach((a, i) => frags.push({
    mesh, i, A: a, B: B[i], orbitR0: rng.float(3, 8), orbitR1: rng.float(3, 8), oy: rng.float(4, 8), ph: rng.angle(), delay: rng.float(0, 0.18),
    spin: new THREE.Vector3(rng.float(-1, 1), rng.float(-1, 1), rng.float(-1, 1)).multiplyScalar(2.2),
  }));
  addSet(capitals, capA, capB); addSet(urns, urnA, urnB); addSet(grilles, grA, grB); addSet(cloths, clA, clB);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), QA = new THREE.Quaternion(), QB = new THREE.Quaternion(), QS = new THREE.Quaternion(), S1 = new THREE.Vector3(1, 1, 1);
  const P = new THREE.Vector3(), O = new THREE.Vector3(), E = new THREE.Euler();
  const placeFrags = (raw: number, t: number) => {
    for (const f of frags) {
      const p = K.clamp((raw - f.delay) / 0.82);
      const s1 = K.smoothstep(0, 0.3, p), s2 = K.smoothstep(0.7, 1, p);
      const ang = f.ph + p * TAU * 1.3 + t * 0.05 * Math.sin(p * Math.PI);
      const orr = K.lerp(f.orbitR0, f.orbitR1, K.smoothstep(0.3, 0.7, p));
      O.set(Math.cos(ang) * orr, f.oy + Math.sin(p * 9 + f.ph) * 0.4, Math.sin(ang) * orr);
      P.copy(f.A.p).lerp(O, s1).lerp(f.B.p, s2);
      QA.setFromEuler(f.A.r); QB.setFromEuler(f.B.r);
      Q.copy(QA).slerp(QB, s2);
      const tumble = Math.sin(p * Math.PI);
      E.set(f.spin.x * tumble * p * 3, f.spin.y * tumble * p * 3, f.spin.z * tumble * p * 3);
      QS.setFromEuler(E);
      Q.premultiply(QS);
      M.compose(P, Q, S1);
      f.mesh.setMatrixAt(f.i, M);
      if (f.mesh === urns) {
        const bs = Math.max(0.001, 1 - K.smoothstep(0, 0.12, raw));
        M.compose(P, Q, new THREE.Vector3(bs, bs, bs));
        basil.setMatrixAt(f.i, M);
      }
    }
    for (const m of [capitals, urns, grilles, cloths, basil]) m.instanceMatrix.needsUpdate = true;
  };
  placeFrags(0, 0);

  // =============================================================== the first Clarice that no one can prove
  const gparts: THREE.BufferGeometry[] = [];
  const gy = 7.5;
  for (let i = 0; i < 9; i++) {
    const x = -10 + i * 1.1;
    gparts.push(K.at(K.cyl(0.22, 0.25, 3.6, 10), x, gy, -9), K.at(K.box(0.7, 0.35, 0.7), x, gy + 3.6, -9));
  }
  gparts.push(K.at(K.box(10.4, 0.5, 1.6), -5.6, gy + 3.95, -9), K.at(K.gableRoof(10.4, 1.8, 1.1, 0.1), -5.6, gy + 4.45, -9), K.at(K.stairs(4, 10.4, 0.15, 0.3), -5.6, gy - 0.6, -8.0));
  gparts.push(K.at(K.box(7, 4.5, 2.4), 6, gy, -10));
  for (let i = 0; i < 8; i++) {
    const x = 3.3 + (i % 4) * 1.8, y = gy + 0.8 + Math.floor(i / 4) * 2;
    gparts.push(K.at(K.box(0.8, 1.1, 0.2), x, y, -8.75));
    for (let k = 1; k < 4; k++) gparts.push(K.at(K.box(0.03, 1.1, 0.05), x - 0.4 + k * 0.2, y, -8.62));
  }
  gparts.push(K.at(K.box(9, 0.6, 3), 0, gy + 1.2, -14));
  for (let i = 0; i < 12; i++) gparts.push(K.at(K.lathe([[0.001, 0], [0.15, 0], [0.32, 0.4], [0.18, 0.8], [0.25, 0.9], [0.001, 0.9]], 10), -4.1 + i * 0.75, gy + 1.8, -14));
  const ghostMat = new THREE.LineBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(K.merge(gparts), 28), ghostMat);
  root.add(ghost);

  // the slowly wheeling dome of stars
  const starPos: number[] = [];
  const sr = rng.fork('stars');
  for (let i = 0; i < 900; i++) {
    const [x, y, z] = sr.onSphere();
    starPos.push(x * 60, Math.abs(y) * 60 + 2, z * 60);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#fff2d6', size: 0.35, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
  root.add(stars);
  root.add(K.particles({ count: 200, radius: 18, y0: 0.3, y1: 5, color: '#ebb85f', size: 0.07, opacity: 0.4, swirl: 0.8, twinkle: 0.8, rng: rng.fork('motes') }));

  // =============================================================== animation
  const shuffle = new K.Toggle(1 / 7);
  let lastRaw = -1;

  return {
    root,
    env: {
      skyTop: '#13302f', skyHorizon: '#a97c52', skyBottom: '#3a2e2a', skyCurve: 0.22,
      fog: '#5b4b45', fogNear: 75, fogFar: 200,
      sunDir: [-0.6, 0.28, -0.55], sunColor: '#ffbf7a', sunIntensity: 2.0, sunDisc: 0, sunGlow: 0.8,
      hemiSky: '#6f9a92', hemiGround: '#5a4436', hemiIntensity: 1.0, envIntensity: 0.8,
      stars: 0.3, clouds: 0.15, cloudColor: '#a9845e',
      bloomStrength: 0.75, bloomThreshold: 0.8, bloomRadius: 0.55,
      shadowRadius: 23, vignette: 0.45, saturation: 1.05, tiltShift: 0.4,
    },
    camera: {
      position: [0, 16.6, 41.8], target: [0, 3, 0], fov: 40,
      minDistance: 10, maxDistance: 90, maxPolar: 1.45, autoRotate: 0.3,
      views: [
        { position: [-22, 34, -14], target: [0, 1, 0] },
        { position: [3.5, 2.6, 10.5], target: [0, 0.6, 4] },
      ],
    },
    interaction: {
      label: 'Shuffle Clarice',
      activeLabel: 'Shuffle back',
      hint: 'The same 35 pieces, dealt again into another age.',
      set: (on) => shuffle.set(on),
      camera: { position: [0, 20, 46], target: [0, 4, 0] },
    },
    update(t, dt) {
      shuffle.update(dt);
      const raw = shuffle.raw;
      if (raw !== lastRaw || raw % 1 !== 0) { placeFrags(raw, t); lastRaw = raw; }
      // perishable cities crumble and grow; both breathe
      const breath = 1 + 0.01 * Math.sin((t * TAU) / 6);
      const c = 1 - K.smoothstep(0.0, 0.3, raw), bu = K.smoothstep(0.7, 1, raw);
      chrys.visible = c > 0.001;
      chrys.scale.set(breath, Math.max(0.001, c) * breath, breath);
      butter.visible = bu > 0.001;
      butter.scale.set(breath, Math.max(0.001, bu) * breath, breath);
      // rats along the rivulets, birds over the huts
      if (chrys.visible) {
        for (let i = 0; i < 24; i++) {
          const a = rivAngles[i % 9], k = K.fract(t * 0.045 * (1 + (i % 5) * 0.2) + i * 0.37), r = 4.6 + k * 12.5;
          setRat(i, Math.cos(a) * r + Math.sin(a) * 0.15, 0, Math.sin(a) * r - Math.cos(a) * 0.15, Math.PI / 2 - a);
        }
        setRat.done();
        flock.update(t);
      }
      crowd.update(t);
      (sparkles.material as THREE.PointsMaterial).opacity = 0.5 + 0.5 * Math.sin(t * 1.3);
      // the sigh: the star dome turns every 40 s, and the first Clarice brightens at each turn
      stars.rotation.y = (t * TAU) / 40;
      const ph = t % 40;
      ghostMat.opacity = 0.22 + 0.55 * (Math.exp(-ph / 3) + Math.exp(-(40 - ph) / 1.5));
      ghost.position.y = Math.sin(t * 0.3) * 0.15;
    },
  };
};

export default build;
