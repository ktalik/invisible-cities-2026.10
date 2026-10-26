// TAMARA - Cities & Signs 1.
// A city so thickly coated with signs that the visitor never sees the city:
// pincers for the tooth-drawer, a tankard for the tavern, halberds for the
// guardhouse, scales for the greengrocer; gods with their attributes; wares
// that stand for virtues. The streets read like lines on a page.
// Motion: a warm gaze reads the streets line by line; every emblem sways.
// Toggle: strip the signs. They lift into a gilded cloud, and what is left is
// mute, doorless, and the colour of the stones outside.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const Y0 = 0.3;
const VERMILION = '#c4432b', INK = '#28304a', GILT = '#e2b04a', PUTTY = '#c9c2b2', STONE = '#a99d84';

function glyphTexture(kind: number, field: string) {
  return K.canvasTexture(128, 96, (g, w, h) => {
    g.fillStyle = field; g.fillRect(0, 0, w, h);
    g.strokeStyle = GILT; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = GILT; g.translate(w / 2, h / 2);
    if (kind === 0) { // lion: a maned head
      for (let i = 0; i < 14; i++) { g.rotate(Math.PI / 7); g.fillRect(-3, 14, 6, 16); }
      g.beginPath(); g.arc(0, 0, 16, 0, Math.PI * 2); g.fill();
    } else if (kind === 1) { // dolphin: a leaping arc with a tail
      g.beginPath(); g.arc(0, 12, 26, Math.PI * 1.1, Math.PI * 1.95); g.lineWidth = 12; g.strokeStyle = GILT; g.stroke();
      g.beginPath(); g.moveTo(22, 4); g.lineTo(36, -6); g.lineTo(34, 14); g.fill();
    } else if (kind === 2) { // tower: crenellated
      g.fillRect(-14, -18, 28, 46);
      for (let i = 0; i < 3; i++) g.fillRect(-18 + i * 13, -30, 10, 12);
    } else { // star
      g.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 12 : 30, a = (i / 10) * Math.PI * 2 - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.fill();
    }
  });
}

function ruleTexture(allowed: boolean, kind: number) {
  return K.canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#f2ead6'; g.fillRect(0, 0, w, h);
    g.translate(w / 2, h / 2);
    g.fillStyle = '#2b2b2b';
    if (kind === 0) { g.fillRect(-28, -6, 56, 20); g.beginPath(); g.arc(-16, 20, 9, 0, 7); g.arc(16, 20, 9, 0, 7); g.fill(); }
    else if (kind === 1) { g.fillRect(-20, -26, 40, 44); g.fillRect(-26, -32, 52, 8); }
    else { g.fillRect(-30, 20, 60, 5); g.save(); g.rotate(-0.8); g.fillRect(-2, -34, 4, 60); g.restore(); }
    g.strokeStyle = allowed ? '#3f8f7a' : '#c4432b'; g.lineWidth = 12;
    g.beginPath(); g.arc(0, 0, 52, 0, Math.PI * 2); g.stroke();
    if (!allowed) { g.beginPath(); g.moveTo(-37, -37); g.lineTo(37, 37); g.stroke(); }
  });
}

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  // ---- the plain, the mound, the seven street-lines
  root.add(K.groundDisc(120, '#c8b182', '#d8c9a4'));
  const b = new K.Batch();
  const HW = (z: number) => 11.2 * Math.sqrt(Math.max(0, 1 - (z / 9.2) ** 2));
  b.add(K.at(K.cyl(1, 1.06, Y0, 64), 0, 0, 0, { s: [12.2, 1, 9.6] }), '#cdbb93', 'stone');
  const STREETS = Array.from({ length: 7 }, (_, s) => -6.6 + s * 2.2);
  for (const z of STREETS) b.add(K.at(K.box(HW(z) * 2 + 0.6, 0.02, 1.1), 0, Y0, z), '#e6dcc6', 'stone');
  // the canal and its single humped bridge
  const CX = -1.5;
  b.add(K.at(K.box(0.8, 0.05, 19.4), CX, Y0 - 0.03, 0), '#3e6f78', 'polished');
  for (const s of [-1, 1]) b.add(K.at(K.box(0.1, 0.12, 19.4), CX + s * 0.45, Y0, 0), '#b9ad94', 'stone');
  b.add(K.at(K.archBand(1.2, 0.18, 1.1, 12, 0.5), CX, Y0, STREETS[3], { ry: Math.PI / 2 }), '#d9cdb2', 'stone');
  // rocks of the plain: the colour every wall returns to when the signs are gone
  for (let i = 0; i < 70; i++) { const [x, z] = rng.inRing(14, 40); K.rock(b, { x, z, r: rng.float(0.15, 0.6), color: STONE, rng }); }
  for (let i = 0; i < 40; i++) { const [x, z] = rng.inRing(15, 34); K.tree(b, { x, z, kind: 'round', h: 1.4, color: '#6c7a46', rng }); }

  // ---- mute blocks: no doors, no windows, fog-coloured
  const muteMat = new THREE.MeshStandardMaterial({ color: PUTTY, roughness: 0.95 });
  type Block = { x: number; z: number; w: number; d: number; h: number };
  const blocks: Block[] = [];
  const reserved = [
    { x: 2.6, z: -1.1, w: 3.2 }, // palace
    { x: -6.4, z: 7.7, w: 2.0 }, // prison
    { x: 6.2, z: -3.3, w: 1.5 }, // mint
    { x: -6.8, z: -3.3, w: 1.6 }, // school
    { x: 7.2, z: 5.5, w: 1.0 }, // brothel at the market's end
  ];
  for (let r = -1; r < 7; r++) {
    const z = -6.6 + r * 2.2 + 1.1, hw = HW(z) - 0.3;
    let x = -hw;
    while (x < hw - 0.6) {
      const w = Math.min(rng.float(0.8, 1.8), hw - x);
      const cx = x + w / 2;
      const clash = Math.abs(cx - CX) < w / 2 + 0.55 || reserved.some((q) => Math.abs(q.z - z) < 0.1 && Math.abs(q.x - cx) < (q.w + w) / 2);
      if (!clash && w > 0.5) blocks.push({ x: cx, z, w: w - 0.06, d: 1.0, h: rng.float(0.85, 1.7) });
      x += w + (rng.chance(0.22) ? 0.55 : 0.04);
    }
  }
  const muteGeos: THREE.BufferGeometry[] = blocks.map((k) => K.at(K.box(k.w, k.h, k.d), k.x, Y0, k.z));
  // the five buildings that need no sign
  const P = reserved;
  muteGeos.push(K.at(K.box(3.0, 1.6, 1.0), P[0].x, Y0, P[0].z), K.at(K.cyl(0.62, 0.62, 0.5, 24), P[0].x, Y0 + 1.6, P[0].z), K.at(K.dome(0.62, 24), P[0].x, Y0 + 2.1, P[0].z));
  for (let i = 0; i < 9; i++) muteGeos.push(K.at(K.cyl(0.06, 0.06, 1.5, 8), P[0].x - 1.4 + i * 0.35, Y0, P[0].z + 0.58));
  muteGeos.push(K.at(K.box(3.1, 0.12, 0.25), P[0].x, Y0 + 1.5, P[0].z + 0.58));
  muteGeos.push(K.at(K.box(1.0, 1.0, 1.0), P[1].x, Y0, P[1].z), K.at(K.torus(0.92, 0.07, 6, 40).translate(0, 0, 0), P[1].x, Y0 + 0.05, P[1].z));
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; muteGeos.push(K.at(K.box(0.2, 0.9, 0.12), P[1].x + Math.cos(a) * 0.92, Y0, P[1].z + Math.sin(a) * 0.92, { ry: -a })); }
  muteGeos.push(K.at(K.box(1.4, 1.3, 1.0), P[2].x, Y0, P[2].z), K.at(K.cyl(0.14, 0.18, 2.6, 10), P[2].x + 0.45, Y0 + 1.3, P[2].z), K.at(K.torus(0.24, 0.05, 6, 24), P[2].x - 0.2, Y0 + 0.8, P[2].z + 0.52, { rx: Math.PI / 2 }));
  muteGeos.push(K.at(K.box(1.0, 1.0, 1.0), P[3].x, Y0, P[3].z), K.at(K.prism([[-0.6, 0], [0.6, 0], [0, 0.6]], 0.9), P[3].x, Y0 + 1.0 + 0.45, P[3].z + 0.45, { rx: -Math.PI / 2 }));
  muteGeos.push(K.at(new THREE.DodecahedronGeometry(0.3), P[3].x, Y0 + 1.95, P[3].z), K.at(new THREE.OctahedronGeometry(0.16), P[3].x + 0.55, Y0 + 1.15, P[3].z));
  muteGeos.push(K.at(K.box(0.9, 2.8, 0.9), P[4].x, Y0, P[4].z));
  for (let i = 0; i < 4; i++) muteGeos.push(K.at(K.box(0.5, 0.06, 0.25), P[4].x, Y0 + 0.8 + i * 0.5, P[4].z - 0.55));
  const mute = new THREE.Mesh(K.merge(muteGeos), muteMat);
  mute.castShadow = mute.receiveShadow = true;
  root.add(mute);
  // curtains on the brothel's balconies (they signify, so they lift with the signs)
  const signsStatic = new K.Batch();
  for (let i = 0; i < 4; i++) signsStatic.add(K.at(K.box(0.42, 0.34, 0.02), P[4].x, Y0 + 0.86 + i * 0.5, P[4].z - 0.66), ['#b02a4a', '#d76a3a', '#7a2a6a', '#c4432b'][i], 'cloth');

  // ---- three temples on the north edge: open doors, gods with attributes
  const TZ = -8.6;
  for (const [i, tx] of [-3.4, 0, 3.4].entries()) {
    K.temple(b, { x: tx, y: Y0, z: TZ, ry: 0, w: 2.0, d: 1.4, h: 1.3, cols: 4, color: '#e3dac6' });
    b.add(K.at(K.box(0.6, 0.85, 0.05), tx, Y0, TZ + 0.72), '#ffcf6e', 'glow', 2.4);
    const godY = Y0 + 0.05;
    signsStatic.add(K.at(K.personGeometry(0.62), tx, godY, TZ + 0.55), GILT, 'gold');
    if (i === 0) signsStatic.add(K.at(K.cone(0.09, 0.32, 10), tx + 0.17, godY + 0.4, TZ + 0.6, { rz: 2.3 }), GILT, 'gold');
    if (i === 1) { signsStatic.add(K.at(K.cone(0.07, 0.11, 10), tx + 0.17, godY + 0.4, TZ + 0.6), '#f4f0e0', 'glass'); signsStatic.add(K.at(K.cone(0.07, 0.11, 10), tx + 0.17, godY + 0.62, TZ + 0.6, { rx: Math.PI }), '#f4f0e0', 'glass'); }
    if (i === 2) { signsStatic.add(K.at(K.sphere(0.08, 10, 8), tx + 0.2, godY + 0.5, TZ + 0.6), '#7a9a6a', 'bronze'); for (let k = 0; k < 6; k++) signsStatic.add(K.at(K.box(0.015, 0.1, 0.015), tx + 0.2 + Math.cos(k) * 0.08, godY + 0.55, TZ + 0.6 + Math.sin(k) * 0.08, { rz: Math.cos(k) }), '#5a7a4a', 'bronze'); }
  }
  // statues at crossings (lion, dolphin, tower, star) and shields on facades
  const statueSpots = [[-4.2, STREETS[1]], [4.8, STREETS[2]], [-3.2, STREETS[4]], [3.6, STREETS[5]]];
  statueSpots.forEach(([x, z], i) => {
    signsStatic.add(K.at(K.box(0.36, 0.4, 0.36), x, Y0, z), '#d9cdb2', 'stone');
    const sy = Y0 + 0.4;
    if (i === 0) { signsStatic.add(K.at(K.sphere(0.2, 12, 8), x, sy + 0.25, z, { s: [1.4, 1, 0.8] }), GILT, 'gold'); signsStatic.add(K.at(K.sphere(0.16, 12, 8), x + 0.25, sy + 0.45, z), GILT, 'gold'); }
    if (i === 1) signsStatic.add(K.at(K.torus(0.22, 0.07, 8, 16, Math.PI * 1.2), x, sy + 0.25, z, { rx: Math.PI / 2 }), GILT, 'gold');
    if (i === 2) { signsStatic.add(K.at(K.box(0.24, 0.6, 0.24), x, sy, z), GILT, 'gold'); signsStatic.add(K.at(K.crenelRing(0.16, 0, 4, 0.08, 0.1, 0.08), x, sy + 0.6, z), GILT, 'gold'); }
    if (i === 3) signsStatic.add(K.at(new THREE.OctahedronGeometry(0.3), x, sy + 0.4, z, { s: [1, 1, 0.35] }), GILT, 'gold');
  });
  for (let i = 0; i < 44; i++) {
    const k = rng.pick(blocks), s = rng.sign();
    signsStatic.add(K.at(K.cyl(0.13, 0.13, 0.03, 14), k.x + rng.float(-0.3, 0.3) * k.w, Y0 + k.h - 0.35, k.z + s * 0.515, { rx: Math.PI / 2 }), rng.pick([GILT, VERMILION, INK, '#2f6b5a']), rng.chance(0.5) ? 'gold' : 'ceramic');
  }
  // the market lane: stalls whose wares shine like emblems
  const MZ = STREETS[5];
  for (let i = 0; i < 7; i++) {
    const x = -8 + i * 2.3 + (i > 2 ? 0.5 : 0);
    if (Math.abs(x - CX) < 0.9) continue;
    K.stall(b, { x, y: Y0, z: MZ - 0.2, w: 0.7, d: 0.4, h: 0.55, cloth: rng.pick([VERMILION, INK, GILT]) });
    const ware = i % 4;
    if (ware === 0) signsStatic.add(K.at(K.torus(0.08, 0.02, 6, 16), x, Y0 + 0.62, MZ - 0.2), GILT, 'gold');
    if (ware === 1) { signsStatic.add(K.at(K.box(0.3, 0.16, 0.18), x, Y0 + 0.55, MZ - 0.2), GILT, 'gold'); signsStatic.add(K.at(K.pyramid(0.34, 0.22, 0.1), x, Y0 + 0.71, MZ - 0.2), VERMILION, 'cloth'); }
    if (ware === 2) for (let k = 0; k < 3; k++) signsStatic.add(K.at(K.box(0.12, 0.04, 0.16), x, Y0 + 0.55 + k * 0.045, MZ - 0.2, { ry: k * 0.3 }), [VERMILION, INK, '#2f6b5a'][k], 'matte');
    if (ware === 3) signsStatic.add(K.at(K.torus(0.06, 0.012, 6, 16), x, Y0 + 0.6, MZ - 0.2, { rx: 0.4 }), '#eadfc4', 'silver');
  }
  // permissions and prohibitions on posts
  const rules: [number, number, boolean, number][] = [[-4.9, STREETS[2] - 0.45, false, 0], [1.2, MZ + 0.42, false, 1], [CX + 0.6, STREETS[3] + 0.5, false, 2], [9.0, STREETS[1] + 0.5, true, 0], [-9.2, STREETS[4] + 0.5, true, 1], [10.6, STREETS[4] + 0.5, true, 2]];
  const ruleGroup = new THREE.Group();
  for (const [x, z, ok, kind] of rules) {
    b.add(K.at(K.cyl(0.025, 0.025, 1.0, 6), x, Y0, z), '#2a2a2a', 'metal');
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), new THREE.MeshStandardMaterial({ map: ruleTexture(ok, kind), roughness: 0.7, side: THREE.DoubleSide }));
    pl.position.set(x, Y0 + 1.1, z);
    ruleGroup.add(pl);
  }
  root.add(ruleGroup);
  // trough with two zebras, a bowls green, and the pyre at the edge
  b.add(K.at(K.box(0.8, 0.22, 0.3), 9.0, Y0, STREETS[1] + 0.05), '#9a9080', 'stone');
  b.add(K.at(K.box(0.7, 0.02, 0.2), 9.0, Y0 + 0.2, STREETS[1] + 0.05), '#4f8590', 'polished');
  const zebraGeo = K.quadruped({ len: 0.36, h: 0.28, color: '#f2efe8', ears: true, tail: 0.08 });
  K.paintBy(zebraGeo, (x, _y, z, out) => { out.set(Math.sin(z * 60 + x * 10) > 0.2 ? '#1d1d1d' : '#f2efe8'); });
  const zebras = K.instanced(zebraGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), 2, (i, o) => { o.position.set(8.8 + i * 0.45, Y0, STREETS[1] + 0.42); o.rotation.y = Math.PI; }, { colors: false });
  root.add(zebras);
  const setZ = K.instanceSetter(zebras);
  b.add(K.at(K.box(1.6, 0.02, 0.9), -9.2, Y0, STREETS[4] + 1.0), '#6f8a4a', 'matte');
  for (let i = 0; i < 6; i++) b.add(K.at(K.sphere(0.06, 8, 6), -9.8 + i * 0.22, Y0 + 0.06, STREETS[4] + 0.8 + (i % 2) * 0.3), i ? '#5a3b2a' : '#e8e0d0', 'ceramic');
  b.add(K.at(K.stairs(4, 1.0, 0.12, 0.2), 10.6, Y0, STREETS[4] + 0.9), '#9a9080', 'stone');
  for (let i = 0; i < 5; i++) b.add(K.at(K.box(0.7, 0.07, 0.07), 10.6, Y0 + 0.5 + i * 0.06, STREETS[4] + 0.55, { ry: i * 0.6 }), '#4a3424', 'wood');
  const ember = K.glowSprite('#ff8a3a', 1.2, 0.8);
  ember.position.set(10.6, Y0 + 0.75, STREETS[4] + 0.55);
  root.add(ember);

  // ---- hanging emblems on iron brackets along every street-line
  type Sign = { px: number; py: number; pz: number; ry: number; type: number; phase: number; order: number; street: number };
  const signs: Sign[] = [];
  for (let s = 0; s < 7; s++) {
    const zs = STREETS[s];
    for (const n of [1, -1]) {
      const rowZ = zs - n * 1.1;
      for (const k of blocks) {
        if (Math.abs(k.z - rowZ) > 0.1) continue;
        const cnt = Math.max(1, Math.round(k.w / 0.6));
        for (let j = 0; j < cnt; j++) {
          const x = k.x - k.w / 2 + (j + 0.5) * (k.w / cnt);
          const y = Y0 + Math.min(rng.float(0.7, 1.15), k.h - 0.12);
          const wallZ = k.z + n * 0.5;
          b.add(K.strut([x, y + 0.02, wallZ], [x, y + 0.02, wallZ + n * 0.5], 0.015, 4), '#1d1c1b', 'metal');
          b.add(K.strut([x, y - 0.14, wallZ], [x, y + 0.02, wallZ + n * 0.3], 0.01, 4), '#1d1c1b', 'metal');
          signs.push({ px: x, py: y, pz: wallZ + n * 0.29, ry: n > 0 ? -Math.PI / 2 : Math.PI / 2, type: rng.int(0, 7), phase: rng.float(0, 6.28), order: s + (x + 11) / 22, street: s });
        }
      }
    }
  }
  root.add(b.build({ name: 'tamara' }));
  const staticSigns = signsStatic.build();
  root.add(staticSigns);

  // geometries hang from their origin (the bracket point)
  const gilt = new THREE.MeshStandardMaterial({ color: GILT, metalness: 0.85, roughness: 0.3 });
  const hang = (g: THREE.BufferGeometry, drop: number) => K.at(g, 0, -drop, 0);
  const types: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  for (let g = 0; g < 4; g++) {
    types.push(K.at(K.boxC(0.24, 0.17, 0.02), 0, -0.12, 0));
    const tex = glyphTexture(g, g % 2 ? INK : VERMILION);
    mats.push(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  }
  // pincers, tankard, crossed halberds, scales
  types.push(hang(K.merge([K.at(K.boxC(0.03, 0.26, 0.03), -0.04, 0, 0, { rz: 0.25 }), K.at(K.boxC(0.03, 0.26, 0.03), 0.04, 0, 0, { rz: -0.25 }), K.at(K.torus(0.035, 0.01, 4, 10), -0.08, 0.12, 0, { rx: Math.PI / 2 }), K.at(K.torus(0.035, 0.01, 4, 10), 0.08, 0.12, 0, { rx: Math.PI / 2 })]), 0.17));
  types.push(hang(K.merge([K.at(K.cyl(0.07, 0.08, 0.2, 12), 0, -0.1, 0), K.at(K.torus(0.05, 0.015, 4, 10), 0.08, 0, 0, { rx: Math.PI / 2 })]), 0.06));
  types.push(hang(K.merge([K.at(K.boxC(0.015, 0.34, 0.015), 0, 0, 0, { rz: 0.6 }), K.at(K.boxC(0.015, 0.34, 0.015), 0, 0, 0, { rz: -0.6 }), K.at(K.boxC(0.07, 0.05, 0.01), 0.1, 0.14, 0, { rz: 0.6 }), K.at(K.boxC(0.07, 0.05, 0.01), -0.1, 0.14, 0, { rz: -0.6 })]), 0.17));
  types.push(hang(K.merge([K.at(K.boxC(0.3, 0.015, 0.015), 0, 0, 0), K.at(K.boxC(0.01, 0.06, 0.01), 0, 0.03, 0), K.at(K.dome(0.06, 10, 1, 0.5), -0.13, -0.12, 0, { rx: Math.PI }), K.at(K.dome(0.06, 10, 1, 0.5), 0.13, -0.12, 0, { rx: Math.PI }), K.at(K.boxC(0.005, 0.12, 0.005), -0.13, -0.06, 0), K.at(K.boxC(0.005, 0.12, 0.005), 0.13, -0.06, 0)]), 0.05));
  for (let i = 0; i < 4; i++) mats.push(gilt);
  const meshes: THREE.InstancedMesh[] = [];
  const members: number[][] = types.map(() => []);
  signs.forEach((sg, i) => members[sg.type].push(i));
  types.forEach((g, ti) => {
    const m = new THREE.InstancedMesh(g, mats[ti], Math.max(1, members[ti].length));
    m.castShadow = true;
    m.frustumCulled = false;
    root.add(m);
    meshes.push(m);
  });

  // ---- the reading gaze, the racing clouds and the clouds that turn into signs
  const gaze = K.glowSprite('#ffd98a', 2.6, 0.55);
  root.add(gaze);
  const gazeSpot = new THREE.Mesh(K.at(K.disc(1, 32), 0, 0, 0), new THREE.MeshBasicMaterial({ color: '#ffcf7a', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  root.add(gazeSpot);
  const PUFFS = 46;
  const scatter = Array.from({ length: PUFFS }, () => new THREE.Vector3(rng.float(-9, 9), rng.float(-2, 2), rng.float(-1.5, 1.5)));
  const shapes: THREE.Vector3[][] = [];
  shapes.push(Array.from({ length: PUFFS }, (_, i) => i < 16 ? new THREE.Vector3(-6 + i * 0.8, -2 + Math.abs(i - 7.5) * 0.08, 0) : i < 24 ? new THREE.Vector3(0, -1.4 + (i - 16) * 0.75, 0) : new THREE.Vector3(0.6 + ((i - 24) % 4) * 1.0, -1 + Math.floor((i - 24) / 4) * 0.85, 0).setX(0.6 + ((i - 24) % 4) * (1 - Math.floor((i - 24) / 4) * 0.12)))); // ship
  shapes.push(Array.from({ length: PUFFS }, (_, i) => i < 20 ? new THREE.Vector3((i % 5) * 0.8 - 1.6, -2.5 + Math.floor(i / 5) * 0.8, 0) : new THREE.Vector3(-1.8 + ((i - 20) % 4) * 1.05, 0.9 + Math.floor((i - 20) / 4) * 0.55 * (1 + ((i - 20) % 4) * 0.25), 0))); // hand
  shapes.push(Array.from({ length: PUFFS }, (_, i) => i < 22 ? new THREE.Vector3(-3 + (i % 11) * 0.6, -0.3 + Math.floor(i / 11) * 0.9, 0) : i < 30 ? new THREE.Vector3(-3.2 + ((i - 22) % 2) * 5.2 + (i % 4 > 1 ? 0.7 : 0), -1.4 - Math.floor((i - 22) / 4) * 0.6, 0) : i < 38 ? new THREE.Vector3(3.6 + (i - 30) * 0.12, 0.6 - (i - 30) * 0.4, 0) : new THREE.Vector3(2.8, 1.2 + (i - 38) * 0.1, (i - 38) * 0.05))); // elephant
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#fbf6ea', roughness: 1, transparent: true, opacity: 0.92, emissive: '#f5ead2', emissiveIntensity: 0.35 });
  const clouds = K.instanced(K.sphere(1, 12, 8), cloudMat, PUFFS, () => {}, { castShadow: false, receiveShadow: false, colors: false });
  clouds.frustumCulled = false;
  root.add(clouds);
  const setC = K.instanceSetter(clouds);
  root.add(K.particles({ count: 300, radius: 20, y0: 0.3, y1: 4, color: '#eadfc4', size: 0.05, opacity: 0.45, velocity: [1.6, 0, 0.3], swirl: 0.4, rng: rng.fork('dust') }));
  const walkers = new K.Walkers({ paths: STREETS.map((z) => [new THREE.Vector3(-HW(z) + 0.6, Y0 + 0.02, z + 0.25), new THREE.Vector3(HW(z) - 0.6, Y0 + 0.02, z - 0.25)]), count: 60, rng: rng.fork('walk'), speed: [0.15, 0.3], colors: [VERMILION, INK, '#e8e0d0', '#6b5a3a', '#2f6b5a'] });
  root.add(walkers.mesh);

  const strip = new K.Toggle(0.28);
  const d = new THREE.Object3D();
  d.rotation.order = 'YXZ';
  const muteBase = new THREE.Color(PUTTY), muteStone = new THREE.Color(STONE);
  const PAGE = 40;

  return {
    root,
    env: {
      skyTop: '#5a7ea6', skyHorizon: '#eadfc4', skyBottom: '#dccfb2', skyCurve: 0.55,
      fog: '#dccfb2', fogNear: 45, fogFar: 120,
      sunDir: [0.45, 0.85, 0.5], sunColor: '#fff1d6', sunIntensity: 3.2, sunDisc: 0.6, sunGlow: 0.6,
      hemiSky: '#bcd0e6', hemiGround: '#c8b182', hemiIntensity: 0.65, envIntensity: 0.8,
      clouds: 0.45, cloudColor: '#fbf4e4',
      bloomStrength: 0.45, bloomThreshold: 0.9, bloomRadius: 0.4,
      tiltShift: 0.45, shadowRadius: 14, vignette: 0.3, saturation: 1.1, contrast: 1.05,
    },
    camera: {
      position: [4.5, 13.5, 23], target: [0, 1.2, -1.5], fov: 42,
      minDistance: 6, maxDistance: 70, maxPolar: 1.42, autoRotate: 0.15,
      views: [
        { position: [4.2, 1.7, 2.35], target: [-2.5, 1.2, 2.0] },
        { position: [0.5, 30, 6], target: [0, 0, 0] },
      ],
    },
    interaction: {
      label: 'Strip the signs',
      activeLabel: 'Let the signs return',
      hint: 'Beneath its signs the city cannot be found.',
      set: (on) => strip.set(on),
    },
    update(t, dt) {
      strip.update(dt);
      const v = strip.raw;
      // the reading head: line by line, left to right, one page every 40 s
      const pg = K.fract(t / PAGE) * 7;
      const line = Math.floor(pg), fr = pg - line;
      const lz = STREETS[line], hw = HW(lz);
      const hx = -hw + fr * hw * 2;
      gaze.position.set(hx, Y0 + 2.2, lz);
      gazeSpot.position.set(hx, Y0 + 0.04, lz);
      gazeSpot.scale.setScalar(1.3);
      (gazeSpot.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - v);
      gaze.material.opacity = 0.55 * (1 - v);
      // emblems sway; under the gaze they swing harder; stripped in reading order
      const counts = types.map(() => 0);
      const rot = t * 0.15;
      for (let i = 0; i < signs.length; i++) {
        const sg = signs[i];
        const near = sg.street === line ? Math.max(0, 1 - Math.abs(sg.px - hx) / 1.4) : 0;
        const sw = Math.sin(t * 2.2 + sg.phase) * (0.12 + near * 0.45) + Math.sin(t * 0.7 + sg.phase) * 0.08;
        const k = K.smoothstep(0, 1, v * 3.2 - sg.order * 0.31);
        const a = sg.phase * 3 + rot, r = 2.5 + (i % 9) * 0.6;
        const cxp = Math.cos(a) * r, czp = Math.sin(a) * r * 0.7, cyp = 9 + Math.sin(sg.phase * 5) * 1.6;
        d.position.set(K.lerp(sg.px, cxp, k), K.lerp(sg.py, cyp, k), K.lerp(sg.pz, czp, k));
        d.rotation.set(sw * (1 - k) + k * t * 0.6, sg.ry + k * (t * 0.3 + sg.phase), 0);
        d.scale.setScalar(1.75 * (1 + near * 0.3 * (1 - k)));
        d.updateMatrix();
        meshes[sg.type].setMatrixAt(counts[sg.type]++, d.matrix);
      }
      for (const m of meshes) m.instanceMatrix.needsUpdate = true;
      // statues, gods, shields, wares and placards rise and dissolve too
      const ks = K.smoothstep(0.2, 0.9, v);
      staticSigns.position.y = ks * 7;
      staticSigns.scale.setScalar(Math.max(0.001, 1 - ks));
      staticSigns.visible = ks < 0.999;
      ruleGroup.position.y = ks * 6;
      ruleGroup.visible = ks < 0.999;
      ruleGroup.children.forEach((c, i) => { c.rotation.y = Math.sin(t * 0.5 + i) * 0.3 + ks * t; });
      // the mute city goes the colour of the stones outside
      muteMat.color.copy(muteBase).lerp(muteStone, K.smoothstep(0.4, 1, v));
      muteMat.roughness = 0.95;
      ember.material.opacity = 0.55 + 0.35 * Math.sin(t * 1.7) * Math.sin(t * 0.6 + 1);
      ember.scale.setScalar(1 + 0.2 * Math.sin(t * 1.7));
      // zebras dip to drink
      for (let i = 0; i < 2; i++) setZ(i, 8.8 + i * 0.45, Y0, STREETS[1] + 0.42, Math.PI, 1, Math.max(0, Math.sin(t * 0.8 + i * 2)) * 0.3);
      setZ.done();
      // clouds race; every 25 s a cluster becomes a figure, holds, and shreds
      const cc = t % 25, ci = Math.floor(t / 25) % 3;
      const form = K.smoothstep(4, 9, cc) * (1 - K.smoothstep(13, 17, cc));
      const shape = shapes[ci];
      const drift = ((t * 0.5) % 36) - 18;
      for (let i = 0; i < PUFFS; i++) {
        const sc = scatter[i], sh = shape[i];
        const x = K.lerp(sc.x + Math.sin(t * 0.3 + i) * 0.6, sh.x * 1.1, form) + drift;
        const y = K.lerp(sc.y, sh.y * 1.1, form) + 9.5;
        const z = K.lerp(sc.z, sh.z, form) - 17;
        setC(i, x, y, z, 0, K.lerp(0.9 + (i % 5) * 0.2, 0.62, form));
      }
      setC.done();
      walkers.update(t);
    },
  };
};

export default build;
