// MAROZIA - Hidden Cities 3.
// The city of the rat: a cramped warren of soot-brown houses whose alleys are
// roofed over by low vaults, tunnels where rats scurry and people walk bent. But
// now and then a vault cracks open, a gesture lifts, and the city of the swallow
// shows through: the vaults part like wings, the light pours in, the people rise
// and a cloud of swallows wheels into the sky. Then it closes again.
// Toggle: the swallow city (all the vaults open in a wave from the centre).

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const C = 1.2; // grid cell
const H0 = 1.15; // spring line of the vaults
const md3 = (i: number) => ((i % 3) + 3) % 3;

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  const isl = K.island({ radius: 14.5, flat: 13, depth: 9, top: '#4e443b', edge: '#5a4e42', cliff: '#6b5a4a', under: '#2f2925', strata: '#7a6855', seed: 33 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -7, color: '#b39c86', shadow: '#4a3d38', opacity: 0.7, coverage: 0.55 }));

  const b = new K.Batch();
  const ground = K.paintBy(new THREE.CircleGeometry(13, 96).rotateX(-Math.PI / 2), (x, _y, z, out) => {
    out.set('#4a4038').multiplyScalar(0.85 + 0.2 * K.fbm2(x * 0.6, z * 0.6, 3));
  });
  b.add(K.at(ground, 0, 0.01, 0), null, 'stone');

  // ---- the warren: blocks between narrow alleys every third cell
  const WALLS = ['#8a7058', '#7a6450', '#957a5e', '#705c4c', '#9c8466', '#806650'];
  const inPlaza = (x: number, z: number) => Math.hypot(x, z) < 2.6;
  for (let bi = -3; bi <= 3; bi++) {
    for (let bj = -3; bj <= 3; bj++) {
      const cx = (bi * 3 + 1.5) * C, cz = (bj * 3 + 1.5) * C;
      if (Math.hypot(cx, cz) > 11.4) continue;
      const lots: [number, number, number, number][] = rng.chance(0.4)
        ? [[cx, cz, 2.3, 2.3]]
        : rng.chance(0.5)
          ? [[cx - 0.58, cz, 1.12, 2.3], [cx + 0.58, cz, 1.12, 2.3]]
          : [[cx - 0.58, cz - 0.58, 1.12, 1.12], [cx + 0.58, cz - 0.58, 1.12, 1.12], [cx - 0.58, cz + 0.58, 1.12, 1.12], [cx + 0.58, cz + 0.58, 1.12, 1.12]];
      for (const [x, z, w, d] of lots) {
        if (inPlaza(x, z)) continue;
        const h = rng.float(1.3, 2.7);
        K.house(b, {
          x, z, w, d, h, ry: 0,
          roof: rng.pick(['flat', 'shed', 'flat'] as const), roofH: 0.35,
          wall: K.jitter(rng.pick(WALLS), rng, 0.01, 0.04, 0.05), roofColor: '#3f342d', roofFinish: 'stone',
          lit: 0.09, glow: 1.8, litColor: '#ffae5a', windowColor: '#1e1915', door: false, rng,
        });
        if (rng.chance(0.35)) K.chimney(b, { x: x + rng.float(-0.3, 0.3), z: z + rng.float(-0.3, 0.3), y: h, h: 0.45, w: 0.12, color: '#3d332c' });
      }
    }
  }
  // the little open square at the centre: a well and a crooked lamp
  K.well(b, { x: 0, z: 0, r: 0.4, color: '#7a6a58', roofColor: '#4a3a30' });
  K.lamp(b, { x: 1.1, z: 0.9, h: 1.4, glow: '#ffbf70', intensity: 2 });
  // rubble and crates along the walls
  for (let i = 0; i < 70; i++) {
    const a = rng.angle(), r = rng.float(3, 11);
    const x = Math.round((Math.cos(a) * r) / (3 * C)) * 3 * C + rng.float(-0.4, 0.4);
    const z = Math.sin(a) * r;
    b.add(K.at(K.box(0.18, 0.14, 0.18), x, 0, z, { ry: rng.angle() }), rng.pick(['#5a4636', '#3f362f', '#6e5a44']), 'wood');
  }
  K.forest(b, { n: 20, r0: 12.2, r1: 13.6, rng, kinds: ['shrub', 'round'], h: [0.8, 1.4], color: '#4a5236' });
  root.add(b.build({ name: 'marozia' }));

  // ---- the vaults over the alleys: two halves each, hinged at the walls
  interface Vault { x: number; z: number; ry: number; d: number }
  const vaults: Vault[] = [];
  const openSlots: THREE.Vector3[] = [];
  for (let i = -10; i <= 10; i++) {
    for (let j = -10; j <= 10; j++) {
      const ai = md3(i) === 0, aj = md3(j) === 0;
      if (!(ai || aj) || (ai && aj)) continue;
      const x = i * C, z = j * C;
      if (Math.hypot(x, z) > 11.8 || inPlaza(x, z)) continue;
      if (rng.chance(0.2)) { openSlots.push(new THREE.Vector3(x, 0, z)); continue; }
      vaults.push({ x, z, ry: ai ? 0 : Math.PI / 2, d: Math.hypot(x, z) });
    }
  }
  const halfGeo = (sign: number) => {
    const g = new THREE.CylinderGeometry(C / 2, C / 2, C * 1.01, 8, 1, true, sign > 0 ? Math.PI / 2 : Math.PI, Math.PI / 2);
    g.rotateX(Math.PI / 2);
    g.translate(-sign * (C / 2), 0, 0);
    return g;
  };
  const vaultMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, side: THREE.DoubleSide });
  const halves = [1, -1].map((sign) => {
    const m = K.instanced(halfGeo(sign), vaultMat, vaults.length, (i, o, c) => {
      const v = vaults[i];
      o.position.set(v.x + Math.cos(v.ry) * sign * (C / 2), H0, v.z - Math.sin(v.ry) * sign * (C / 2));
      o.rotation.set(0, v.ry, 0);
      c.set('#7a4634');
    });
    root.add(m);
    return { m, set: K.instanceSetter(m), sign };
  });
  const DARK = new THREE.Color('#7a4634');
  const WING = new THREE.Color('#dfe6ee');
  const vc = new THREE.Color();

  // ---- rats in the alleys, bent people, and people who will fly
  const alleyPaths: THREE.Vector3[][] = [];
  for (let i = -3; i <= 3; i++) {
    const s = i * 3 * C;
    const L = Math.sqrt(Math.max(0, 11.6 * 11.6 - s * s));
    alleyPaths.push([new THREE.Vector3(s, 0.01, -L), new THREE.Vector3(s, 0.01, L)]);
    alleyPaths.push([new THREE.Vector3(-L, 0.01, s), new THREE.Vector3(L, 0.01, s)]);
  }
  const rats = new K.Walkers({ paths: alleyPaths, count: 110, rng: rng.fork('rats'), speed: [0.6, 1.3], colors: ['#4a423c', '#5b524a', '#3a3430', '#6a6058'], geometry: K.quadruped({ len: 0.16, h: 0.07, tail: 0.14, ears: true }) });
  root.add(rats.mesh);
  const walkers = new K.Walkers({ paths: alleyPaths, count: 40, rng: rng.fork('walk'), speed: [0.1, 0.2], h: 0.22, colors: ['#3d342e', '#4a4038', '#2e2a28', '#55493d'] });
  root.add(walkers.mesh);
  const FLY = 64;
  const flyers: { x: number; z: number; h: number; ph: number; delay: number }[] = [];
  for (let i = 0; i < FLY; i++) {
    const p = alleyPaths[rng.int(0, alleyPaths.length - 1)];
    const k = rng.float(0.1, 0.9);
    const x = K.lerp(p[0].x, p[1].x, k), z = K.lerp(p[0].z, p[1].z, k);
    flyers.push({ x, z, h: rng.float(2.5, 7), ph: rng.angle(), delay: Math.hypot(x, z) / 14 });
  }
  const people = K.instanced(K.personGeometry(0.24), K.figureMaterial(), FLY, (_i, _o, c) => { c.set(rng.pick(['#e8dccb', '#c8b9a5', '#9fb4c8', '#d9c09a', '#b7a28a'])); });
  root.add(people);
  const peopleSet = K.instanceSetter(people);

  // ---- swallows: a few always, a whole sky of them in the swallow city
  const SW = 220;
  const swMat = new THREE.MeshStandardMaterial({ color: '#22304f', roughness: 0.6, side: THREE.DoubleSide, emissive: '#0b1020' });
  const swallows = K.instanced(K.birdGeometry(0.34), swMat, SW, undefined, { castShadow: false, receiveShadow: false, colors: false });
  root.add(swallows);
  const swSet = K.instanceSetter(swallows);
  const sw = Array.from({ length: SW }, () => {
    const src = rng.chance(0.5) && openSlots.length ? rng.pick(openSlots) : new THREE.Vector3(rng.float(-10, 10), 0, rng.float(-10, 10));
    return { src, r: rng.float(2, 12), y: rng.float(3.5, 11), ph: rng.angle(), sp: rng.float(0.35, 0.8) * rng.sign(), delay: rng.float(0, 0.45), flap: rng.float(9, 14) };
  });
  const flock = new K.Flock({ count: 10, radius: 7, height: 8, color: '#22304f', span: 0.34, speed: 0.5, rng: rng.fork('fl') });
  root.add(flock.mesh);

  // ---- light of the swallow city (extra lights fade in)
  const skyLight = new THREE.HemisphereLight('#fff3dc', '#b8c8de', 0);
  root.add(skyLight);
  const sunBreak = new THREE.DirectionalLight('#ffe2b0', 0);
  sunBreak.position.set(-6, 14, 8);
  root.add(sunBreak);
  const shafts = [0, 1, 2].map((k) => {
    const x = [-3, 2.5, 6][k], z = [4, -5, 3][k];
    const bm = K.beam([x - 4, 16, z + 5], [x, 0, z], 0.4, 2.6, '#ffe7b8', 0);
    root.add(bm);
    return bm;
  });
  const moment = K.glowSprite('#ffe2a8', 3, 0);
  root.add(moment);
  root.add(K.smoke({ sources: [[-4, 2.7, 5], [5, 2.6, -3], [-6, 2.4, -6], [3, 2.6, 7]], perSource: 30, height: 4, color: '#5a5048', opacity: 0.35, size: [0.4, 1.2], life: 6, wind: [0.3, 0.1], rng: rng.fork('smoke') }));

  const swallowCity = new K.Toggle(0.4);
  return {
    root,
    env: {
      skyTop: '#4a4a5c',
      skyHorizon: '#b59a7e',
      skyBottom: '#4a3d38',
      skyCurve: 0.5,
      fog: '#9c8471',
      fogNear: 60,
      fogFar: 210,
      sunDir: [0.6, 0.5, -0.45],
      sunColor: '#e8b88a',
      sunIntensity: 2.3,
      sunDisc: 0.4,
      sunGlow: 0.6,
      hemiSky: '#a7a3b0',
      hemiGround: '#4a3c32',
      hemiIntensity: 1.0,
      envIntensity: 0.7,
      clouds: 0.6,
      cloudColor: '#c7ab92',
      bloomStrength: 0.75,
      bloomThreshold: 0.8,
      bloomRadius: 0.55,
      tiltShift: 0.45,
      shadowRadius: 16,
      vignette: 0.45,
      saturation: 0.95,
    },
    camera: {
      position: [16, 14, 18],
      target: [0, 1, 0],
      minDistance: 5,
      maxDistance: 60,
      autoRotate: 0.3,
      views: [
        { position: [7.5, 6.5, 8.5], target: [1, 1.2, 0.5] },
        { position: [-3.6, 2.2, 10.5], target: [-3.6, 1.0, 2] },
      ],
    },
    interaction: {
      label: 'The swallow city',
      activeLabel: 'Back among the rats',
      hint: 'For an instant the vaults open and everyone flies.',
      set: (on) => swallowCity.set(on),
      camera: { position: [17, 11, 19], target: [0, 3.5, 0] },
    },
    update(t, dt) {
      swallowCity.update(dt);
      const s = swallowCity.raw;
      const S = swallowCity.value;
      // a momentary opening: every 7 seconds one vault and its neighbours flick open
      const cyc = Math.floor(t / 7);
      const mi = (cyc * 7919 + 13) % vaults.length;
      const mk = K.fract(t / 7);
      const mOpen = Math.sin(K.clamp(mk / 0.3) * Math.PI);
      const mv = vaults[mi];
      moment.position.set(mv.x, H0 + 0.6, mv.z);
      (moment.material as THREE.SpriteMaterial).opacity = mOpen * 0.8 * (1 - S);
      for (const h of halves) {
        for (let i = 0; i < vaults.length; i++) {
          const v = vaults[i];
          const wave = K.easeInOut(K.clamp(s * 1.6 - v.d / 14));
          const near = Math.hypot(v.x - mv.x, v.z - mv.z) < C * 1.6 ? mOpen : 0;
          const o = Math.max(wave, near * 0.85);
          const flutter = o > 0.5 ? Math.sin(t * 3 + v.d) * 0.06 * o : 0;
          const ang = -(o * 1.2 + flutter) * h.sign;
          h.set(i, v.x + Math.cos(v.ry) * h.sign * (C / 2), H0 + o * 1.75 + Math.sin(t * 2 + v.d) * 0.08 * o, v.z - Math.sin(v.ry) * h.sign * (C / 2), v.ry, 1, 0, ang);
          vc.copy(DARK).lerp(WING, o);
          h.set.color(i, vc);
        }
        h.set.done();
      }
      // people rise and hover, arms of the city lifted
      for (let i = 0; i < FLY; i++) {
        const f = flyers[i];
        const p = K.easeInOut(K.clamp(s * 1.5 - f.delay));
        const y = p * (f.h + Math.sin(t * 1.3 + f.ph) * 0.3);
        peopleSet(i, f.x + Math.sin(t * 0.5 + f.ph) * 0.4 * p, y, f.z + Math.cos(t * 0.4 + f.ph) * 0.4 * p, f.ph + t * 0.3 * p, 1, Math.sin(t + f.ph) * 0.3 * p);
      }
      peopleSet.done();
      // swallows burst from the alleys and wheel
      for (let i = 0; i < SW; i++) {
        const w = sw[i];
        const p = K.clamp((s - w.delay) * 2.2);
        if (p <= 0) { swSet(i, 0, -50, 0, 0, 0); continue; }
        const a = w.ph + t * w.sp;
        const hx = Math.cos(a) * w.r, hz = Math.sin(a) * w.r, hy = w.y + Math.sin(t * 0.9 + w.ph) * 0.8;
        const e = K.easeOut(p);
        const x = K.lerp(w.src.x, hx, e), y = K.lerp(w.src.y + 0.5, hy, e), z = K.lerp(w.src.z, hz, e);
        const flap = Math.sin(t * w.flap + w.ph);
        swSet(i, x, y, z, -a - (w.sp > 0 ? 0 : Math.PI), [p, flap * p, p], 0, 0.35 * Math.sign(w.sp));
      }
      swSet.done();
      skyLight.intensity = S * 0.8;
      sunBreak.intensity = S * 1.3;
      for (const sh of shafts) ((sh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = S * 0.22);
      rats.update(t);
      walkers.update(t);
      flock.update(t);
    },
  };
};

export default build;
