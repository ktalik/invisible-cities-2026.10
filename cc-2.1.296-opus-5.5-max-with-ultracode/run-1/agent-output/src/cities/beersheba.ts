// BEERSHEBA - Cities & the Sky 2.
// The citizens believe two other Beershebas hang over and under their own: a
// celestial one of gold, silver and diamond above, an infernal one of soot,
// sewers and red furnaces below. They hoard gold in their vaults and aspire to
// the heavenly double, while their discarded rubbish, being lightest, drifts up
// and wheels around the city. Toggle: the truth is weighed. The golden city sinks
// and turns into the base, the hoard that holds the city down, while the cloud
// of refuse rises and kindles into the true celestial Beersheba.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  // ================================================== the earthly city
  const isl = K.island({ radius: 11.5, flat: 9.8, depth: 4, top: '#a99a7c', edge: '#958467', cliff: '#7b6a58', under: '#4a3c38', strata: '#8f7a62', seed: 23, hills: 0.25 });
  root.add(isl.mesh);
  const b = new K.Batch();
  b.add(K.at(K.ring(4.2, 4.9, 72), 0, 0.012, 0), '#6f675c', 'stone');
  b.add(K.at(K.disc(2.4, 48), 0, 0.012, 0), '#7a7064', 'stone');
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    b.add(K.at(K.box(0.6, 0.02, 7.2), Math.cos(a) * 6, 0.008, Math.sin(a) * 6, { ry: -a + Math.PI / 2 }), '#716a5e', 'stone');
  }
  const walls = ['#d2c4a6', '#c6b08a', '#b9a88c', '#d9cdb5', '#a89a86', '#c7a98a'];
  const chimneyTops: THREE.Vector3[] = [];
  const onAvenue = (a: number) => { for (let i = 0; i < 6; i++) { const d = Math.abs(Math.atan2(Math.sin(a - (i / 6) * Math.PI * 2 - 0.3), Math.cos(a - (i / 6) * Math.PI * 2 - 0.3))); if (d < 0.11) return true; } return false; };
  for (const [r0, r1, n] of [[2.9, 3.9, 16], [5.3, 7.0, 34], [7.4, 9.3, 46]] as const) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.float(-0.03, 0.03);
      if (onAvenue(a)) continue;
      const r = rng.float(r0 + 0.25, r1 - 0.25);
      const x = Math.cos(a) * r, z = Math.sin(a) * r, h = rng.float(0.8, 1.9);
      K.house(b, { x, z, ry: -a + Math.PI / 2, w: rng.float(0.7, 1.0), d: rng.float(0.8, 1.1), h, roof: rng.pick(['gable', 'hip', 'flat'] as const), wall: K.pickJitter(walls, rng), roofColor: K.pickJitter(['#7e4a36', '#6a5040', '#8a5a3c'], rng), lit: 0.15, glow: 2, rng });
      if (rng.chance(0.25)) { K.chimney(b, { x: x + 0.2, y: h, z, h: 0.45 }); chimneyTops.push(new THREE.Vector3(x + 0.2, h + 0.5, z)); }
    }
  }
  // the treasury at the centre: a squat vault with a gilded door, where the gold is hoarded
  b.add(K.at(K.box(2.6, 1.6, 2.6), 0, 0, 0), '#8c8273', 'stone');
  b.add(K.at(K.box(2.9, 0.25, 2.9), 0, 1.6, 0), '#7a7062', 'stone');
  b.add(K.at(K.pyramid(2.4, 2.4, 0.9), 0, 1.85, 0), '#5c564e', 'metal');
  for (const r of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) b.add(K.at(K.box(0.7, 0.95, 0.06), Math.sin(r) * 1.31, 0, Math.cos(r) * 1.31, { ry: r }), '#d8a63c', 'gold');
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; K.column(b, { x: Math.cos(a) * 1.75, z: Math.sin(a) * 1.75, h: 1.6, r: 0.1, color: '#a49a88' }); }
  // the rubbish chute at the rim, from which the refuse takes flight
  const CH = new THREE.Vector3(-8.6, 0, 5.4);
  b.add(K.at(K.cyl(0.9, 1.2, 0.8, 16), CH.x, 0, CH.z), '#5b5047', 'stone');
  b.add(K.at(K.cyl(0.55, 0.75, 2.6, 12), CH.x, 0.8, CH.z, { rz: 0.35 }), '#4c4540', 'metal');
  K.forest(b, { n: 24, r0: 10, r1: 11, rng, kinds: ['poplar', 'round'], h: [0.9, 1.8] });
  root.add(b.build({ name: 'beersheba' }));
  root.add(K.smoke({ sources: chimneyTops, perSource: 10, height: 2.2, color: '#b5aca2', opacity: 0.28, size: [0.15, 0.5], life: 6, wind: [0.15, 0.05], rng: rng.fork('s') }));

  const paths: THREE.Vector3[][] = [];
  for (const r of [4.55, 2.2]) paths.push(Array.from({ length: 41 }, (_, i) => new THREE.Vector3(Math.cos((i / 40) * Math.PI * 2) * r, 0.02, Math.sin((i / 40) * Math.PI * 2) * r)));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; paths.push([new THREE.Vector3(Math.cos(a) * 2.5, 0.02, Math.sin(a) * 2.5), new THREE.Vector3(Math.cos(a) * 9.5, 0.02, Math.sin(a) * 9.5)]); }
  const walkers = new K.Walkers({ paths, count: 90, rng: rng.fork('w'), speed: [0.15, 0.35], colors: ['#4a3c34', '#6a2f2a', '#c9b48a', '#2f3a4a', '#7a6a4a'] });
  root.add(walkers.mesh);

  // ================================================== the celestial Beersheba (gold, silver, diamond)
  const heaven = new THREE.Group();
  const hb = new K.Batch();
  hb.add(K.at(K.cyl(7.2, 6.4, 0.5, 64), 0, -0.5, 0), '#e6c56a', 'gold');
  hb.add(K.at(K.ring(6.2, 6.9, 64), 0, 0.01, 0), '#f1e6c8', 'polished');
  for (let i = 0; i < 26; i++) { // puffs of cloud beneath the golden ground
    const a = (i / 26) * Math.PI * 2, r = rng.float(4, 7.2);
    hb.add(K.at(K.sphere(rng.float(1.0, 1.8), 14, 10), Math.cos(a) * r, -0.9 - rng.float(0, 0.5), Math.sin(a) * r, { s: [1, 0.45, 1] }), '#fff5e2', 'matte');
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, r = 4.8;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (i % 3 === 0) K.tower(hb, { x, z, r: 0.38, h: 3.6, sides: 8, top: 'spire', topH: 1.6, color: '#e9edf2', finish: 'silver', topColor: '#f6e2a0', topFinish: 'gold', windows: false });
    else { hb.add(K.at(K.box(1.0, 1.2, 1.0), x, 0, z, { ry: -a }), '#f4ead2', 'polished'); hb.add(K.at(K.dome(0.5, 16), x, 1.2, z), '#e9be52', 'gold'); }
  }
  hb.add(K.at(K.cyl(2.6, 2.6, 0.6, 32), 0, 0, 0), '#f5ecd6', 'polished');
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; K.column(hb, { x: Math.cos(a) * 2.3, y: 0.6, z: Math.sin(a) * 2.3, h: 2.0, r: 0.12, color: '#dfe5ec', finish: 'silver' }); }
  hb.add(K.at(K.cyl(2.5, 2.5, 0.3, 32), 0, 2.6, 0), '#f5ecd6', 'polished');
  hb.add(K.at(K.dome(2.2, 32), 0, 2.9, 0), '#efc65a', 'gold');
  hb.add(K.at(K.ngon(0.5, 1.6, 4), 0, 5.0, 0, { rx: 0 }), '#e9f6ff', 'glass'); // the diamond
  hb.add(K.at(K.cone(0.5, 0.9, 4), 0, 6.6, 0), '#e9f6ff', 'glass');
  hb.add(K.at(K.cone(0.5, 0.9, 4), 0, 5.0, 0, { rx: Math.PI }), '#e9f6ff', 'glass');
  for (let i = 0; i < 36; i++) { // jewelled windows
    const a = (i / 36) * Math.PI * 2;
    hb.add(K.at(K.box(0.14, 0.2, 0.05), Math.cos(a) * 2.62, 0.2, Math.sin(a) * 2.62, { ry: -a + Math.PI / 2 }), i % 2 ? '#fff0c0' : '#bfe8ff', 'glow', 2.4);
  }
  heaven.add(hb.build({ name: 'heaven' }));
  const halo = K.glowSprite('#ffdc8a', 16, 0.35);
  halo.position.y = 3;
  heaven.add(halo);
  const diamondGlow = K.glowSprite('#dff4ff', 4, 0.8);
  diamondGlow.position.y = 5.8;
  heaven.add(diamondGlow);
  const HEAVEN_Y = 13;
  heaven.position.y = HEAVEN_Y;
  root.add(heaven);

  // ================================================== the infernal Beersheba, hanging below
  const hell = new THREE.Group();
  const hellIsl = K.island({ radius: 8.5, flat: 7, depth: 2.5, top: '#2e2522', edge: '#3a2c27', cliff: '#4a3a33', under: '#5a4a40', strata: '#3a2a24', seed: 31, hills: 0.2 });
  hell.add(hellIsl.mesh);
  const ib = new K.Batch();
  for (let i = 0; i < 46; i++) {
    const [x, z] = rng.inDisc(6.5);
    if (Math.hypot(x, z) < 1.4) continue;
    const h = rng.float(0.8, 3.4);
    const ry = rng.angle();
    ib.add(K.at(K.box(0.52, h, 0.52), x, 0, z, { ry }), K.jitter('#3b2c27', rng), 'metal');
    if (rng.chance(0.5)) { ib.add(K.at(K.cyl(0.12, 0.16, h + 1.2, 8), x + 0.35, 0, z), '#2a201d', 'metal'); }
    for (let k = 0; k < 3; k++) for (const f of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) if (rng.chance(0.6)) ib.add(K.at(K.at(K.wallPlane(0.13, 0.17), 0, 0.3 + k * h * 0.28, 0.27), x, 0, z, { ry: ry + f }), rng.pick(['#ff4a1a', '#ff7a2a']), 'glow', 3.2);
  }
  for (let i = 0; i < 14; i++) { // sewers and pipes
    const a0 = rng.angle(), a1 = a0 + rng.float(0.6, 1.6), r0 = rng.float(2, 6.5), r1 = rng.float(2, 6.5);
    ib.add(K.tube([[Math.cos(a0) * r0, 0.3, Math.sin(a0) * r0], [Math.cos((a0 + a1) / 2) * 3, rng.float(1.2, 2.4), Math.sin((a0 + a1) / 2) * 3], [Math.cos(a1) * r1, 0.3, Math.sin(a1) * r1]], 0.1, 20, 6), '#4a3428', 'bronze');
  }
  ib.add(K.at(K.cyl(1.2, 0.5, 3.8, 16), 0, 0, 0), '#2b211e', 'metal');
  ib.add(K.at(K.disc(1.0, 24), 0, 3.82, 0), '#ff5a1e', 'glow', 3);
  ib.add(K.at(K.ring(1.8, 6.6, 48), 0, 0.015, 0), '#5a2318', 'matte');
  hell.add(ib.build({ name: 'hell' }));
  const HELL_Y = -8.5;
  hell.rotation.x = Math.PI;
  hell.position.y = HELL_Y;
  root.add(hell);
  const hellGlow = K.glowSprite('#ff4a1a', 14, 0.35);
  hellGlow.position.y = HELL_Y - 2.5;
  root.add(hellGlow);
  const sparks = K.particles({ count: 160, center: [0, HELL_Y - 4, 0], radius: 7, y0: -3, y1: 3, color: '#ff7a3a', size: 0.07, opacity: 0.8, velocity: [0, -0.4, 0], twinkle: 0.8, additive: true, rng: rng.fork('sp') });
  root.add(sparks);

  // ================================================== the refuse, lightest of all, wheeling upwards
  const junk = new THREE.Group();
  const junkMat = new THREE.MeshStandardMaterial({ roughness: 0.8, emissive: '#ffd6a0', emissiveIntensity: 0 });
  const kinds = [K.box(0.22, 0.12, 0.3), K.cyl(0.08, 0.08, 0.22, 8), K.torus(0.12, 0.035, 5, 10, Math.PI * 1.3), K.box(0.3, 0.03, 0.22), K.at(K.sphere(0.1, 8, 6), 0, 0, 0, { s: [1.4, 0.7, 1] })];
  const junkCols = ['#8a7a5a', '#6a8a5a', '#c9b48a', '#7a5a4a', '#a8a29a', '#c46a3a', '#d9cfa8', '#5a6a7a'];
  const junkPos: THREE.Vector3[] = [];
  kinds.forEach((g, ki) => {
    const n = 110;
    const m = K.instanced(g, junkMat, n, (i, o, c) => {
      const s = rng.next();
      const a = rng.angle(), r = 4 + s * 8 + rng.float(-1, 1);
      o.position.set(Math.cos(a) * r, 3 + s * 7 + rng.float(-1.2, 1.2), Math.sin(a) * r);
      o.rotation.set(rng.angle(), rng.angle(), rng.angle());
      o.scale.setScalar(rng.float(0.8, 1.6));
      c.set(rng.pick(junkCols));
      if (i % 3 === 0) junkPos.push(o.position.clone());
    }, { castShadow: true, receiveShadow: false });
    m.name = 'junk' + ki;
    junk.add(m);
  });
  // a stream rising from the chute into the swirl
  const stream = K.instanced(kinds[0], junkMat, 60, (i, o, c) => {
    const k = i / 60;
    const a = Math.atan2(CH.z, CH.x) + k * 1.4;
    const r = 10 - k * 1.5;
    o.position.set(Math.cos(a) * r + rng.float(-0.4, 0.4), 1.6 + k * 4 + rng.float(-0.3, 0.3), Math.sin(a) * r + rng.float(-0.4, 0.4));
    o.rotation.set(rng.angle(), rng.angle(), 0);
    c.set(rng.pick(junkCols));
  });
  root.add(stream);
  const junkStars = K.glowPoints(junkPos, '#ffe2b0', 0.45, 0);
  junk.add(junkStars);
  root.add(junk);

  const flock = new K.Flock({ count: 16, center: [0, 0, 0], radius: 10, height: 7, color: '#2b2a2e', rng: rng.fork('f') });
  root.add(flock.mesh);

  const tog = new K.Toggle(0.3);

  return {
    root,
    env: {
      skyTop: '#1c2848', skyHorizon: '#d6b994', skyBottom: '#3a2220', skyCurve: 0.42, contrast: 1.1,
      fog: '#b8a490', fogNear: 85, fogFar: 230,
      sunDir: [-0.6, 0.55, 0.45], sunColor: '#ffe2bb', sunIntensity: 2.6, sunDisc: 0.6, sunGlow: 0.8,
      hemiSky: '#a9b2d0', hemiGround: '#8a3a22', hemiIntensity: 0.9, envIntensity: 0.8,
      stars: 0.35, clouds: 0.3, cloudColor: '#e9d6bc',
      bloomStrength: 0.8, bloomThreshold: 0.78, bloomRadius: 0.55,
      tiltShift: 0.25, shadowRadius: 15, vignette: 0.4, saturation: 1.05,
    },
    camera: {
      position: [37, 7, 41], target: [0, 1.5, 0], minDistance: 10, maxDistance: 90, maxPolar: 2.4, autoRotate: 0.25,
      views: [
        { position: [14, 22, 16], target: [0, 8, 0] },
        { position: [17, -16, 15], target: [0, -9, 0] },
      ],
    },
    interaction: {
      label: 'Weigh the doubles',
      activeLabel: 'Restore the belief',
      camera: { position: [30, 3, 33], target: [0, 2.5, 0] },
      hint: 'Hoarded gold sinks to the foundations; the lightest refuse climbs to heaven.',
      set: (on) => tog.set(on),
    },
    update(t, dt) {
      tog.update(dt);
      const v = tog.value;
      // the golden city sinks beneath and turns over into the base
      heaven.position.y = K.lerp(HEAVEN_Y, -5.7, v);
      heaven.rotation.x = Math.PI * K.smoothstep(0.25, 0.8, v);
      heaven.rotation.y = t * 0.03;
      (halo.material as THREE.SpriteMaterial).opacity = 0.35 * (1 - v) + 0.12;
      const hs = Math.max(0.001, 1 - K.smoothstep(0.1, 0.7, v));
      hell.scale.setScalar(hs);
      hell.visible = hs > 0.01;
      (hellGlow.material as THREE.SpriteMaterial).opacity = 0.35 * hs + 0.15 * v;
      // the rubbish wheels; with the truth it rises and kindles into the heavens
      junk.rotation.y = t * 0.12;
      junk.position.y = v * 4;
      junk.scale.setScalar(1 + v * 0.25);
      junk.children.forEach((c, i) => { if (i < 5) c.rotation.y = Math.sin(t * 0.3 + i) * 0.05; });
      junkMat.emissiveIntensity = v * 0.9;
      (junkStars.material as THREE.PointsMaterial).opacity = K.smoothstep(0.4, 1, v) * (0.75 + 0.25 * Math.sin(t * 2.2));
      stream.rotation.y = Math.sin(t * 0.5) * 0.04;
      walkers.update(t);
      flock.update(t);
    },
  };
};

export default build;
