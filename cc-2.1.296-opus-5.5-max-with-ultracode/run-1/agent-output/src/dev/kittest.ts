// Development scene exercising every toolkit function (?shot=kittest).

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  root.add(K.plinth({ radius: 18 }));
  const b = new K.Batch();
  b.add(K.at(K.disc(17.5, 64), 0, 0.005, 0), '#9a9a7a', 'matte');
  // row 1: architecture
  K.house(b, { x: -12, z: -10, w: 1.6, d: 1.4, h: 2, roof: 'gable', lit: 0.5, rng });
  K.house(b, { x: -9.5, z: -10, w: 1.6, d: 1.4, h: 2, roof: 'hip', rng });
  K.house(b, { x: -7, z: -10, w: 1.6, d: 1.4, h: 2, roof: 'pyramid', rng });
  K.house(b, { x: -4.5, z: -10, w: 1.6, d: 1.4, h: 2, roof: 'shed', rng });
  K.house(b, { x: -2, z: -10, w: 1.6, d: 1.4, h: 2, roof: 'dome', rng });
  K.house(b, { x: 0.5, z: -10, w: 1.6, d: 1.4, h: 2, roof: 'onion', rng });
  K.house(b, { x: 3, z: -10, w: 1.6, d: 1.4, h: 2, roof: 'cone', rng });
  K.house(b, { x: 5.5, z: -10, w: 1.6, d: 1.4, h: 2, roof: 'flat', cornice: true, rng });
  for (const [i, top] of (['cone', 'dome', 'onion', 'crenel', 'flat', 'spire', 'pyramid'] as const).entries()) {
    K.tower(b, { x: -12 + i * 3, z: -6, r: 0.6, h: 4, top, sides: i % 2 ? 4 : 12, bands: 1.2, lit: 0.5, rng });
  }
  K.cityWall(b, { x: 10, z: -8, r: 4, h: 1.2, towers: 6, gates: [Math.PI / 2] });
  K.temple(b, { x: -10, z: -1, w: 3, d: 4, h: 2.2 });
  K.domeHall(b, { x: -5, z: -1, r: 1.5, h: 1.5 });
  K.minaret(b, { x: -2.5, z: -1, h: 4 });
  K.arcade(b, { x: 1, z: -1, n: 4, span: 0.9, h: 1.4 });
  K.flag(b, { x: 4, z: -1 });
  K.stall(b, { x: 5.5, z: -1 });
  K.chimney(b, { x: 7, z: -1 });
  K.well(b, { x: 8.5, z: -1 });
  K.statue(b, { x: 10, z: -1 });
  K.fountain(b, { x: 12, z: -1 });
  K.column(b, { x: 14, z: -1, h: 2 });
  K.lamp(b, { x: 15, z: -1 });
  K.bridge(b, { from: [-12, 0, 3], to: [-8, 0.5, 6], rise: 0.6, hump: 0.4 });
  K.block(b, { x: -3, z: 5, w: 5, d: 4, rng, lit: 0.3 });
  b.add(K.at(K.stairs(6, 1, 0.15, 0.25), 2, 0, 4), '#ccbbaa', 'stone');
  b.add(K.at(K.spiralStair(0.8, 3, 24), 4.5, 0, 5), '#ccbbaa', 'stone');
  b.add(K.at(K.archWall(2, 2, 0.3, 1, 1.5), 7, 0, 5), '#ddccaa', 'stone');
  b.add(K.at(K.archBand(1.5, 0.2, 0.4), 9.5, 0, 5), '#ddccaa', 'stone');
  b.add(K.rope([11, 2, 4], [15, 2, 6], 0.6, 0.03), '#553322', 'wood');
  b.add(K.strut([11, 0, 7], [13, 2.5, 8], 0.06), '#553322', 'wood');
  // nature
  const kinds: K.TreeKind[] = ['cypress', 'round', 'palm', 'pine', 'poplar', 'olive', 'willow', 'shrub'];
  kinds.forEach((kind, i) => K.tree(b, { x: -12 + i * 2.5, z: 10, kind, h: 2, rng }));
  for (let i = 0; i < 4; i++) K.rock(b, { x: 9 + i * 1.5, z: 10, r: 0.5, rng });
  root.add(b.build());
  // water, figures, fx
  root.add(K.waterRect(6, 3, 12, 0.02, 13));
  root.add(K.crowd({ count: 30, place: (_i, r) => [r.float(-14, -6), 0, r.float(12, 15)], rng }));
  const w = new K.Walkers({ paths: [[new THREE.Vector3(-4, 0, 13), new THREE.Vector3(4, 0, 13), new THREE.Vector3(4, 0, 15)]], count: 12, rng });
  root.add(w.mesh);
  const animals = K.instanced(K.quadruped({ hump: true, longNeck: true, len: 0.5, h: 0.4, tail: 0.1 }), K.figureMaterial(), 3, (i, o, c) => {
    o.position.set(6 + i, 0, 14);
    c.set('#c8a070');
  });
  root.add(animals);
  const boat = new THREE.Mesh(K.sailboatGeometry(1.4), K.figureMaterial());
  boat.position.set(12, 0.05, 13);
  root.add(boat);
  const flock = new K.Flock({ count: 20, radius: 8, height: 7, rng });
  root.add(flock.mesh);
  root.add(K.particles({ count: 200, radius: 15, y0: 0.5, y1: 8, color: '#ffeeaa', size: 0.08, twinkle: 1 }));
  root.add(K.smoke({ sources: [[7, 1.2, -1], [-12, 4.5, -6]], height: 4 }));
  root.add(K.cloudSea({ y: -2, radius: 60 }));
  const g = K.glowSprite('#ff9955', 2);
  g.position.set(15, 1.6, -1);
  root.add(g);
  root.add(K.beam([0, 8, 0], [0, 0, 0], 0.2, 2, '#ffeecc', 0.3));
  root.add(K.lines([[[0, 3, 8], [4, 5, 9]], [[0, 3, 8], [-3, 4, 9]]], '#ffffff'));
  const t = K.textSprite('Kit test', 1.2, { italic: true });
  t.position.set(0, 7, -10);
  root.add(t);
  const tp = K.textPlane('SIGN', 0.5, { background: '#553322' });
  tp.position.set(5.5, 1.3, -0.6);
  root.add(tp);
  const ter = K.terrain({ width: 10, depth: 6, seg: 40, height: (x, z) => K.fbm2(x * 0.2, z * 0.2) * 0.8, color: (_x, y, _z, out) => out.set('#7a8a5a').multiplyScalar(0.8 + y * 0.3) });
  ter.position.set(-20, 0, 0);
  root.add(ter);
  return {
    root,
    camera: { position: [0, 26, 34], target: [0, 1, 1] },
    update(time) {
      w.update(time);
      flock.update(time);
    },
  };
};

export default build;
