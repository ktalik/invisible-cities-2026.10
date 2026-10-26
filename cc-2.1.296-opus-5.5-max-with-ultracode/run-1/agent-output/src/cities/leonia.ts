// LEONIA - Continuous Cities 1.
// A spotless pastel city that remakes itself every morning: fresh sheets on the
// lines, clean plastic bags at every curb, cleaners' trucks hauling them out.
// Around it rises a fortress of refuse, thousands of bags piled into a ring of
// mountains that leans over the rooftops. Toggle: the avalanche, the mountain
// of what was slides down upon the city.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const R_IN = 12.4; // foot of the rubbish wall (inner side)
const R_PEAK = 15.6;
const R_OUT = 20.8;

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  // ---- ground: a floating island of pale concrete
  const isl = K.island({ radius: 22.5, flat: 21.5, depth: 12, top: '#d9d6cc', edge: '#c4bfb2', cliff: '#9d968a', under: '#4b4744', strata: '#b3ab9c', seed: 11, hills: 0 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -10, color: '#f4efe6', shadow: '#8c9aa8', opacity: 0.7, coverage: 0.5 }));

  // ---- the rubbish mountain: height of the heap, and its collapsed form
  const peakAt = (a: number) => 6.4 + 2.6 * K.fbm2(Math.cos(a) * 1.6 + 3, Math.sin(a) * 1.6 + 7, 3);
  const heapH = (r: number, a: number) => {
    if (r < R_IN - 0.2) return -0.08;
    const up = K.smoothstep(R_IN - 0.2, R_PEAK, r);
    const down = 1 - K.smoothstep(R_PEAK + 0.4, R_OUT, r);
    const lump = 0.45 * K.fbm2(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, 3);
    return Math.max(-0.08, peakAt(a) * Math.pow(up, 0.8) * down + lump * up * down);
  };
  // the avalanche comes down from the far side (opposite the default camera)
  const A0 = Math.atan2(31, 27) + Math.PI;
  const sector = (a: number) => {
    const d = Math.abs(((a - A0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    return 1 - K.smoothstep(0.55, 1.45, d);
  };
  const slideH = (r: number, a: number) => {
    const w = sector(a);
    const slump = heapH(r + 0.9, a) * 0.88;
    const P = peakAt(a);
    const tongue = Math.max(-0.08, P * 0.62 * K.smoothstep(0.8, 7.5, r) * (1 - K.smoothstep(R_PEAK + 1.5, R_OUT + 0.3, r)) + 0.35 * K.fbm2(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, 2) * K.smoothstep(1.6, 4, r));
    return K.lerp(slump, tongue, w);
  };
  {
    const RS = 64, AS = 220, r0 = 1.2;
    const n = (RS + 1) * (AS + 1);
    const pos = new Float32Array(n * 3), pos2 = new Float32Array(n * 3), colArr = new Float32Array(n * 3);
    const idx: number[] = [];
    const tints = ['#34363a', '#3f5a7c', '#6c7074', '#4c5a44', '#9c968a', '#26272a', '#7a6c50'].map((c) => new THREE.Color(c));
    const c = new THREE.Color();
    for (let i = 0; i <= RS; i++) {
      const r = r0 + (R_OUT + 0.3 - r0) * (i / RS);
      for (let j = 0; j <= AS; j++) {
        const a = (j / AS) * Math.PI * 2;
        const k = i * (AS + 1) + j;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        pos.set([x, heapH(r, a), z], k * 3);
        pos2.set([x, slideH(r, a), z], k * 3);
        const nv = K.noise2(x * 0.9, z * 0.9) * 0.5 + 0.5;
        c.copy(tints[Math.floor(K.fract(nv * 5.3 + K.noise2(x * 2.1, z * 2.1)) * tints.length)]).multiplyScalar(0.75 + 0.3 * nv);
        colArr.set([c.r, c.g, c.b], k * 3);
        if (i < RS && j < AS) idx.push(k, k + AS + 1, k + 1, k + 1, k + AS + 1, k + AS + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
    g.setIndex(idx);
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute('position', new THREE.BufferAttribute(pos2, 3));
    g2.setIndex(idx);
    g2.computeVertexNormals();
    g.computeVertexNormals();
    g.morphAttributes.position = [g2.attributes.position];
    g.morphAttributes.normal = [g2.attributes.normal];
    var mound = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.0, envMapIntensity: 0.5 }));
    mound.castShadow = mound.receiveShadow = true;
    root.add(mound);
  }

  const b = new K.Batch();

  // ---- streets: a grid inside a ring road at the foot of the wall
  const CELL = 3.4, ROAD = '#55585c';
  b.add(K.at(K.ring(10.9, 12.3, 120), 0, 0.012, 0), ROAD, 'matte');
  b.add(K.at(K.ring(10.75, 10.9, 120), 0, 0.02, 0), '#e8e6df', 'stone');
  const streets: number[] = [];
  for (let k = -3; k <= 3; k++) {
    const s = k * CELL;
    streets.push(s);
    const L = 2 * Math.sqrt(11.6 * 11.6 - s * s);
    b.add(K.at(K.box(0.72, 0.02, L), s, 0, 0), ROAD, 'matte');
    b.add(K.at(K.box(L, 0.021, 0.72), 0, 0, s), ROAD, 'matte');
    for (let m = -L / 2 + 0.5; m < L / 2; m += 0.9) {
      b.add(K.at(K.box(0.05, 0.03, 0.35), s, 0, m), '#f2efe4', 'matte');
      b.add(K.at(K.box(0.35, 0.031, 0.05), m, 0, s), '#f2efe4', 'matte');
    }
  }

  // ---- the plaza of new things
  b.add(K.at(K.box(6.0, 0.05, 6.0), 0, 0, 0), '#ece6da', 'stone');
  K.fountain(b, { x: 0, z: 0, r: 1.1, color: '#f4f1ea' });
  const awn = ['#e46a5a', '#f2c45a', '#5fa8c9', '#8cc084', '#f3f0e8'];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    K.stall(b, { x: Math.cos(a) * 2.3, z: Math.sin(a) * 2.3, ry: -a + Math.PI / 2, w: 0.7, d: 0.45, h: 0.5, cloth: awn[i % awn.length], stripes: '#f7f3ea' });
  }
  for (const [x, z] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) K.tree(b, { x, z, kind: 'round', h: 1.5, color: '#7aa35a', rng });

  // ---- houses: pastel blocks, each pair of bags waiting at the curb
  const walls = ['#f6f1e7', '#f0d9cf', '#d9eadf', '#f4e6c3', '#dfe5ef', '#ecdcee'];
  const roofs = ['#c2674a', '#8fa6b8', '#e9e4da'];
  const curb: [number, number][] = [];
  const lines: [THREE.Vector3, THREE.Vector3][] = [];
  for (let i = -3; i < 3; i++) {
    for (let j = -3; j < 3; j++) {
      const cx = (i + 0.5) * CELL, cz = (j + 0.5) * CELL;
      if (Math.abs(cx) < 2 && Math.abs(cz) < 2) continue;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        if (Math.abs(cx) < 2 && Math.abs(cz) < 2) continue;
        const x = cx + sx * 0.68, z = cz + sz * 0.68;
        if (Math.hypot(x, z) < 3.3 || Math.hypot(Math.abs(x) + 0.6, Math.abs(z) + 0.6) > 10.6) continue;
        const h = rng.float(1.0, 2.6) * (Math.hypot(x, z) < 6 ? 1.25 : 1);
        const fr = rng.chance(0.55);
        K.house(b, { x, z, ry: sz > 0 ? 0 : Math.PI, w: 1.2, d: 1.2, h, roof: fr ? 'flat' : rng.pick(['gable', 'hip'] as const), wall: K.pickJitter(walls, rng), roofColor: rng.pick(roofs), cornice: true, rng });
        // bags at the curb in front of the door
        const fz = z + sz * 0.78;
        curb.push([x - 0.18, fz], [x + 0.12, fz + sz * 0.05]);
        if (rng.chance(0.5)) curb.push([x + 0.38, fz]);
        // fresh sheets drying on flat roofs
        if (fr && rng.chance(0.6)) {
          const y = h + 0.5;
          for (const px of [-0.45, 0.45]) b.add(K.at(K.cyl(0.012, 0.012, 0.5, 4), x + px, h, z), '#8b8f94', 'metal');
          lines.push([new THREE.Vector3(x - 0.45, y, z), new THREE.Vector3(x + 0.45, y, z)]);
          for (let s = 0; s < 3; s++) b.add(K.at(new THREE.PlaneGeometry(0.22, 0.3), x - 0.3 + s * 0.3, y - 0.16, z), rng.pick(['#ffffff', '#f2f6ff', '#fdf3f0']), 'cloth');
        }
      }
    }
  }
  root.add(K.lines(lines, '#6e7276', 0.8));
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    K.lamp(b, { x: Math.cos(a) * 10.6, z: Math.sin(a) * 10.6, h: 1.0, glow: '#fff4d8', intensity: 1.6 });
  }
  root.add(b.build({ name: 'leonia' }));

  // ---- the bags: curb bags (static) + the fortress of refuse (they avalanche)
  const bagGeo = K.merge([
    K.wobble(K.lathe([[0.01, 0], [0.7, 0.06], [0.9, 0.4], [0.7, 0.95], [0.2, 1.18], [0.12, 1.3], [0.01, 1.32]], 8), 0.1, 1.4, 3),
    K.at(K.cone(0.1, 0.32, 4), 0.1, 1.24, 0, { rz: -0.9 }),
    K.at(K.cone(0.1, 0.32, 4), -0.1, 1.24, 0, { rz: 0.9 }),
  ]);
  const boxGeo = K.box(1, 1, 1);
  const bagMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.32, metalness: 0.0, envMapIntensity: 1.2 });
  const NC = curb.length;
  const NM = ctx.quality === 'low' ? 2400 : 4300;
  const N = NC + NM;
  const bagCols = ['#232428', '#2b2d31', '#1c1d20', '#2a2c30', '#35506f', '#2f4a68', '#4a6f9c', '#dfe3e2', '#b9c1c6', '#3e5038', '#6d757b', '#c8b56e'];
  const curbCols = ['#ffffff', '#eef3f6', '#dfe8ef', '#cfe0ec'];
  type Bag = { x: number; y: number; z: number; tx: number; ty: number; tz: number; s: number; ry: number; rx: number; rz: number; d: number };
  const bags: Bag[] = [];
  const brng = rng.fork('bags');
  for (let i = 0; i < NM; i++) {
    const a = brng.chance(0.3) ? A0 + brng.float(-1.1, 1.1) : brng.angle();
    const r = K.lerp(R_IN + 0.1, R_OUT - 0.2, Math.pow(brng.next(), 0.9));
    const y = heapH(r, a);
    const w = sector(a);
    const rt = K.lerp(r - brng.float(0.5, 1.6), brng.float(2.2, Math.max(2.5, r - 2.5)), w);
    const at = a + brng.float(-0.05, 0.05);
    const s = brng.float(0.26, 0.46);
    bags.push({
      x: Math.cos(a) * r, y: y - 0.06, z: Math.sin(a) * r,
      tx: Math.cos(at) * rt, ty: slideH(rt, at) - 0.04, tz: Math.sin(at) * rt,
      s, ry: brng.angle(), rx: brng.float(-0.6, 0.6), rz: brng.float(-0.6, 0.6),
      d: 0.25 * (1 - y / 9) + brng.float(0, 0.18) + (1 - w) * 0.15,
    });
  }
  // discarded things among the bags: cartons, old boilers, fridges, a piano or two
  const NB = ctx.quality === 'low' ? 250 : 520;
  const boxes: Bag[] = [];
  for (let i = 0; i < NB; i++) {
    const a = brng.angle();
    const r = brng.float(R_IN + 0.6, R_OUT - 0.6);
    const w = sector(a);
    const rt = K.lerp(r - brng.float(0.5, 1.6), brng.float(2.5, Math.max(3, r - 2.5)), w);
    const s = brng.float(0.25, 0.5);
    boxes.push({ x: Math.cos(a) * r, y: heapH(r, a) - 0.1, z: Math.sin(a) * r, tx: Math.cos(a) * rt, ty: slideH(rt, a) - 0.08, tz: Math.sin(a) * rt, s, ry: brng.angle(), rx: brng.float(-0.4, 0.4), rz: brng.float(-0.4, 0.4), d: 0.25 * (1 - heapH(r, a) / 9) + brng.float(0, 0.18) + (1 - w) * 0.15 });
  }
  const boxCols = ['#b88c5a', '#c79d68', '#efefe9', '#e6e2d6', '#9a6a3c', '#d8d3c4', '#5a4030'];
  const boxMesh = K.instanced(boxGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), NB, (i, o, c) => {
    const bx = boxes[i];
    o.position.set(bx.x, bx.y, bx.z);
    o.rotation.set(bx.rx, bx.ry, bx.rz);
    o.scale.set(bx.s, bx.s * 0.9, bx.s * 0.7);
    c.copy(K.pickJitter(boxCols, brng));
  });
  root.add(boxMesh);
  const setBox = K.instanceSetter(boxMesh);
  const bagMesh = K.instanced(bagGeo, bagMat, N, (i, o, c) => {
    if (i < NC) {
      const [x, z] = curb[i];
      const s = brng.float(0.11, 0.15);
      o.position.set(x, 0, z);
      o.scale.set(s, s * 0.85, s);
      o.rotation.set(brng.float(-0.2, 0.2), brng.angle(), brng.float(-0.2, 0.2));
      c.copy(K.pickJitter(curbCols, brng));
      return;
    }
    const bg = bags[i - NC];
    o.position.set(bg.x, bg.y, bg.z);
    o.rotation.set(bg.rx, bg.ry, bg.rz);
    o.scale.set(bg.s, bg.s * 0.8, bg.s);
    c.copy(K.pickJitter(bagCols, brng, 0.01, 0.05, 0.06));
  });
  root.add(bagMesh);
  const setBag = K.instanceSetter(bagMesh);

  // ---- street cleaners' trucks hauling the bags out along the grid
  const truckGeo = K.merge([
    K.paint(K.at(K.box(0.36, 0.34, 0.62), 0, 0.08, -0.12), '#e9eef0'),
    K.paint(K.at(K.box(0.34, 0.28, 0.24), 0, 0.08, 0.32), '#3f8a6a'),
    K.paint(K.at(K.box(0.3, 0.1, 0.02), 0, 0.24, 0.445), '#2a3640'),
    K.paint(K.at(K.box(0.4, 0.08, 0.86), 0, 0.03, 0), '#2a2b2d'),
    K.paint(K.at(K.box(0.37, 0.05, 0.6), 0, 0.27, -0.12), '#3f8a6a'),
  ]);
  const trucks: { horiz: boolean; s: number; L: number; ph: number; sp: number }[] = [];
  for (const s of streets) for (const horiz of [false, true]) {
    if (s === 0) continue;
    if (rng.chance(0.35)) continue;
    trucks.push({ horiz, s, L: Math.sqrt(11.6 * 11.6 - s * s) - 0.5, ph: rng.next() * 2, sp: rng.float(0.6, 1.0) });
  }
  const truckMesh = K.instanced(truckGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), trucks.length, undefined, { colors: false });
  root.add(truckMesh);
  const setTruck = K.instanceSetter(truckMesh);

  // ---- gulls over the heap, and paper scraps lifted by the wind
  const gulls = new K.Flock({ count: 46, radius: 17, height: 9.5, color: '#f4f4ef', span: 0.42, speed: 0.22, rng: rng.fork('gulls') });
  root.add(gulls.mesh);
  root.add(K.particles({ count: 380, radius: 20, y0: 1.5, y1: 10, color: '#ffffff', colors: ['#dfe9f2', '#f2e6c8'], size: 0.09, opacity: 0.75, velocity: [0.35, 0.05, 0.12], swirl: 1.2, twinkle: 0.5, rng: rng.fork('paper') }));

  const tog = new K.Toggle(0.3);
  let lastV = -1;
  return {
    root,
    env: {
      skyTop: '#3f7fc4', skyHorizon: '#f1d8bc', skyBottom: '#9fb0c2', skyCurve: 0.45,
      fog: '#e4d3be', fogNear: 80, fogFar: 230,
      sunDir: [0.75, 0.42, 0.5], sunColor: '#ffe6c4', sunIntensity: 3.0, sunDisc: 0.8, sunGlow: 0.9,
      hemiSky: '#bcd2ea', hemiGround: '#8a8072', hemiIntensity: 0.6, envIntensity: 0.65,
      clouds: 0.3, cloudColor: '#ffffff', stars: 0,
      bloomStrength: 0.35, bloomThreshold: 0.9, tiltShift: 0.45, shadowRadius: 24, vignette: 0.3, saturation: 1.1, contrast: 1.08,
    },
    camera: {
      position: [25, 13.5, 28.5], target: [0, 2.4, 0], minDistance: 10, maxDistance: 80, autoRotate: 0.25,
      views: [
        { position: [2.5, 2.2, 6.5], target: [-2, 5.5, -16] },
        { position: [0.5, 42, 6], target: [0, 0, 0] },
      ],
    },
    interaction: {
      label: 'Let the mountain fall',
      activeLabel: 'Sweep it away',
      hint: 'The mountain of what was slides down upon the city.',
      set: (on) => tog.set(on),
      camera: { position: [16, 27, 21], target: [-1.5, 0, -1.5] },
    },
    update(t, dt) {
      tog.update(dt);
      const v = tog.raw;
      if (Math.abs(v - lastV) > 1e-4) {
        lastV = v;
        mound.morphTargetInfluences![0] = K.smoothstep(0.1, 0.9, v);
        for (let i = 0; i < NM; i++) {
          const bg = bags[i];
          const k = K.easeInOut(K.clamp((v - bg.d) / 0.4));
          const hop = Math.sin(Math.PI * k) * 0.8;
          setBag(i + NC, K.lerp(bg.x, bg.tx, k), K.lerp(bg.y, bg.ty, k) + hop, K.lerp(bg.z, bg.tz, k), bg.ry + k * 4, [bg.s, bg.s * 0.8, bg.s], bg.rx + k * 3, bg.rz);
        }
        setBag.done();
        for (let i = 0; i < NB; i++) {
          const bx = boxes[i];
          const k = K.easeInOut(K.clamp((v - bx.d) / 0.4));
          setBox(i, K.lerp(bx.x, bx.tx, k), K.lerp(bx.y, bx.ty, k) + Math.sin(Math.PI * k) * 0.8, K.lerp(bx.z, bx.tz, k), bx.ry + k * 3, [bx.s, bx.s * 0.9, bx.s * 0.7], bx.rx + k * 2.5, bx.rz);
        }
        setBox.done();
      }
      for (let i = 0; i < trucks.length; i++) {
        const tr = trucks[i];
        const u = (t * tr.sp / tr.L + tr.ph) % 2;
        const dir = u < 1 ? 1 : -1;
        const p = -tr.L + 2 * tr.L * (u < 1 ? u : 2 - u);
        const off = 0.17 * dir;
        if (tr.horiz) setTruck(i, p, 0, tr.s + off, dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        else setTruck(i, tr.s - off, 0, p, dir > 0 ? 0 : Math.PI);
      }
      setTruck.done();
      gulls.update(t);
    },
  };
};

export default build;
