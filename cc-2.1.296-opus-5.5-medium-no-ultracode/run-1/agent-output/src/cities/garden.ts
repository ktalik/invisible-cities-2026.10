import { B, TAU, V } from '../engine/kit';

// The Khan's garden: a marble terrace with a pavilion, a chessboard,
// two seated figures and the smoke of their pipes.

export function buildGarden(b: B, _focus: { value: number }) {
  const marble = '#e7ddcb';
  const jade = '#4f8a72';
  const lacquer = '#8c2a22';
  const gold = '#d9a441';

  // terraces
  b.cyl(0, 0, 0, 11.6, 0.35, '#cfc3ad', { seg: 8, ry: TAU / 16 });
  b.cyl(0, 0.35, 0, 9.6, 0.35, marble, { seg: 8, ry: TAU / 16 });
  // steps on four sides
  for (let k = 0; k < 4; k++) {
    const a = (k * TAU) / 4;
    for (let s = 0; s < 3; s++) {
      const r = 10.6 - s * 0.5;
      b.box(Math.sin(a) * r, 0, Math.cos(a) * r, 3, 0.12 * (s + 1) + 0.23 * (s > 1 ? 1 : 0), 0.6, marble, { ry: a });
    }
  }
  // pools of water
  for (let k = 0; k < 4; k++) {
    const a = (k * TAU) / 4 + TAU / 8;
    const x = Math.sin(a) * 6.6;
    const z = Math.cos(a) * 6.6;
    b.box(x, 0.7, z, 3.2, 0.14, 3.2, '#d8ccb6', { ry: a });
    b.box(x, 0.72, z, 2.8, 0.14, 2.8, '#1d3c55', { ry: a, kind: 'water' });
    // lotus
    for (let i = 0; i < 4; i++) b.sphere(x + b.r(-1, 1), 0.88, z + b.r(-1, 1), 0.12, '#f0b8c8', { seg: 5, sy: 0.5 });
  }
  // pavilion at the back: eight lacquered columns and a double sweeping roof
  const PZ = -5.6;
  const pr = 2.5;
  b.cyl(0, 0.7, PZ, pr + 0.6, 0.25, '#d8ccb6', { seg: 8, ry: TAU / 16 });
  for (let k = 0; k < 8; k++) {
    const a = (k * TAU) / 8 + TAU / 16;
    b.cyl(Math.cos(a) * pr, 0.95, PZ + Math.sin(a) * pr, 0.12, 2.9, lacquer, { seg: 8 });
  }
  b.cyl(0, 3.85, PZ, pr + 0.3, 0.25, lacquer, { seg: 8, ry: TAU / 16 });
  b.lathe([[0, 1.7], [0.3, 1.55], [1.6, 0.8], [3.1, 0.2], [4.0, 0.04], [3.85, 0.0], [0, 0]], 0, 4.1, PZ, '#2f6a5c', { seg: 8, ry: TAU / 16 });
  b.cyl(0, 5.45, PZ, 1.2, 0.35, lacquer, { seg: 8, ry: TAU / 16 });
  b.lathe([[0, 1.1], [0.25, 0.95], [1.2, 0.3], [2.0, 0.04], [1.9, 0], [0, 0]], 0, 5.8, PZ, '#2f6a5c', { seg: 8, ry: TAU / 16 });
  b.sphere(0, 7.0, PZ, 0.18, gold, { kind: 'gold', seg: 8 });
  b.cone(0, 7.1, PZ, 0.07, 0.7, gold, { kind: 'gold', seg: 6 });
  for (let k = 0; k < 8; k++) {
    const a = (k * TAU) / 8 + TAU / 16;
    b.sphere(Math.cos(a) * 3.9, 4.0, PZ + Math.sin(a) * 3.9, 0.1, gold, { kind: 'gold', seg: 6 });
  }
  // a lamp inside the pavilion
  b.sphere(0, 2.6, PZ, 0.3, '#ffcf8a', { kind: 'glow', i: 1.6, seg: 10 });

  // carpet and the chessboard
  b.box(0, 0.7, 0.6, 6.4, 0.03, 4.4, '#7a2e2a');
  b.box(0, 0.73, 0.6, 5.8, 0.02, 3.8, '#b07a3a');
  const s = 0.26;
  b.box(0, 0.73, 0.6, 8 * s + 0.24, 0.32, 8 * s + 0.24, '#5a3a22');
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++) b.box((i - 3.5) * s, 1.05, 0.6 + (j - 3.5) * s, s, 0.02, s, (i + j) % 2 ? '#3a2416' : '#e2cfa6');
  // a few pieces mid game
  const pieces: [number, number, string][] = [
    [1, 1, '#f3ead8'], [2, 0, '#f3ead8'], [5, 2, '#f3ead8'], [3, 3, '#f3ead8'], [6, 1, '#f3ead8'],
    [1, 6, '#1d1612'], [4, 5, '#1d1612'], [6, 6, '#1d1612'], [2, 4, '#1d1612'], [5, 7, '#1d1612'],
  ];
  for (const [i, j, c] of pieces) {
    b.cyl((i - 3.5) * s, 1.07, 0.6 + (j - 3.5) * s, 0.07, 0.14, c, { seg: 6, rt: 0.6 });
    b.sphere((i - 3.5) * s, 1.25, 0.6 + (j - 3.5) * s, 0.055, c, { seg: 6 });
  }
  // cushions and the two figures: the Khan (gold robe) and the Venetian (dark red)
  for (const [x, robe, hat, sc] of [
    [-1.9, '#c79a3a', '#2a1c10', 1.25],
    [1.9, '#6e2430', '#1c1a22', 1.0],
  ] as [number, string, string, number][]) {
    b.cyl(x, 0.72, 0.6, 0.55, 0.22, '#3d5d7a', { seg: 8 });
    b.cyl(x, 0.94, 0.6, 0.42 * sc, 0.5 * sc, robe, { seg: 8, rt: 0.55 });
    b.cyl(x, 1.4 * sc - 0.2, 0.6, 0.17 * sc, 0.38 * sc, robe, { seg: 8, rt: 0.7 });
    b.sphere(x, 1.75 * sc - 0.2, 0.6, 0.14 * sc, '#d8b896', { seg: 8 });
    b.cyl(x, 1.84 * sc - 0.2, 0.6, 0.13 * sc, 0.14 * sc, hat, { seg: 8, rt: 0.6 });
  }
  // smoke from their pipes, drifting
  const smoke = b.sub({ unique: true });
  smoke.pointSize(0.9);
  const N = 60;
  for (let i = 0; i < N; i++) smoke.point(0, 0, 0, '#b9b2c8', 0.16);
  smoke.on((t) => {
    const pts = smoke.points;
    if (!pts) return;
    const pos = pts.geometry.attributes.position as any;
    for (let i = 0; i < N; i++) {
      const side = i % 2 ? 1 : -1;
      const ph = (t * 0.18 + i / N) % 1;
      pos.setXYZ(i, side * 1.6 + Math.sin(ph * 7 + i) * 0.4 * ph, 2.0 + ph * 3.2, 0.6 + Math.cos(ph * 5 + i) * 0.4 * ph);
    }
    pos.needsUpdate = true;
  });

  // lanterns on posts around the terrace
  for (let k = 0; k < 8; k++) {
    const a = (k * TAU) / 8;
    const x = Math.cos(a) * 9;
    const z = Math.sin(a) * 9;
    b.cyl(x, 0.7, z, 0.05, 1.6, '#2a2018', { seg: 5 });
    b.box(x, 2.3, z, 0.36, 0.46, 0.36, '#ffbe6a', { kind: 'glow', i: 1.8 });
    b.pyramid(x, 2.76, z, 0.5, 0.25, 0.5, '#2a2018');
  }
  // trees: pines and plum blossom
  for (let k = 0; k < 10; k++) {
    const a = (k * TAU) / 10 + 0.2;
    const r = 10.6 + b.r(-0.2, 0.4);
    if (Math.abs(Math.sin(a * 2)) < 0.25) continue;
    b.tree(Math.cos(a) * r, Math.sin(a) * r, 2.2 + b.r(0.8), k % 2 ? '#2f5a3e' : '#d99ab0', { y: 0.35, type: k % 3 ? 'round' : 'cypress' });
  }
  // the atlas, open on a low table
  b.box(0, 0.7, 4.2, 1.4, 0.4, 0.8, '#3a2416');
  b.box(-0.32, 1.1, 4.2, 0.62, 0.05, 0.8, '#efe2c2', { rz: 0.06 });
  b.box(0.32, 1.1, 4.2, 0.62, 0.05, 0.8, '#efe2c2', { rz: -0.06 });
  b.line(V(0, 1.18, 3.85), V(0, 1.18, 4.55), '#7a5a3a');
}
