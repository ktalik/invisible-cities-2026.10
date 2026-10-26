// ZEMRUDE - Cities & Eyes 2.
// The city takes its shape from the mood of whoever walks it. Whistling, nose in
// the air, you know it from above: windowsills, flapping curtains, flower boxes,
// fountains, swallows. Head bowed, you know it from below: gutters, manhole
// covers, fish scales, wastepaper. One long street canyon holds both cities.
// Toggle: lower your gaze, and the upper city greys out while the gutter wakes.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const SW = 2.6; // street width
const streetZ = (x: number) => Math.sin(x * 0.17) * 1.1;

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  const isl = K.island({ radius: 17.5, flat: 15.5, depth: 9, top: '#b9a58a', edge: '#a8936f', cliff: '#9b8467', under: '#4f4440', strata: '#c2ab84', seed: 12 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -7, color: '#f5efe4', shadow: '#9fb0c4', opacity: 0.6, coverage: 0.45 }));

  const b = new K.Batch();
  const XL = -14.5, XR = 14.5;

  // ---- the street: cobbles, two gutters, manhole covers
  const sg: THREE.Vector3[] = [];
  for (let x = XL; x <= XR + 0.01; x += 0.5) sg.push(new THREE.Vector3(x, 0, streetZ(x)));
  for (let i = 0; i < sg.length - 1; i++) {
    const a = sg[i], c = sg[i + 1];
    const ang = Math.atan2(c.z - a.z, c.x - a.x);
    const len = a.distanceTo(c) + 0.04;
    const mx = (a.x + c.x) / 2, mz = (a.z + c.z) / 2;
    b.add(K.at(K.box(len, 0.03, SW), mx, 0, mz, { ry: -ang }), K.jitter('#6f6862', rng, 0.01, 0.03, 0.04), 'stone');
    for (const s of [-1, 1]) {
      const ox = -Math.sin(ang) * s * (SW / 2 - 0.12), oz = Math.cos(ang) * s * (SW / 2 - 0.12);
      b.add(K.at(K.box(len, 0.02, 0.16), mx + ox, 0.022, mz + oz, { ry: -ang }), '#3b4148', 'polished');
      const kx = -Math.sin(ang) * s * (SW / 2 + 0.05), kz = Math.cos(ang) * s * (SW / 2 + 0.05);
      b.add(K.at(K.box(len, 0.09, 0.14), mx + kx, 0, mz + kz, { ry: -ang }), '#c9bba3', 'stone');
    }
  }
  for (let x = XL + 2; x < XR - 1; x += 3.1) {
    if (Math.abs(x) < 3.6) continue;
    const z = streetZ(x);
    b.add(K.at(K.cyl(0.32, 0.32, 0.035, 20), x, 0, z), '#2f3236', 'metal');
    b.add(K.at(K.torus(0.24, 0.025, 4, 20), x, 0.04, z), '#4a4e53', 'metal');
    b.add(K.at(K.torus(0.13, 0.02, 4, 16), x, 0.04, z), '#4a4e53', 'metal');
  }

  // ---- the piazza with the great fountain, and a fish stall
  b.add(K.at(K.disc(3.3, 48), 0, 0.035, 0), '#8e8272', 'stone');
  b.add(K.at(K.ring(3.12, 3.3, 48), 0, 0.04, 0), '#3b4148', 'polished');
  K.fountain(b, { x: 0, z: 0, r: 1.15, color: '#e9dfcc' });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    K.statue(b, { x: Math.cos(a) * 1.4, z: Math.sin(a) * 1.4, h: 0.55, color: '#5f7f78', finish: 'bronze', plinthColor: '#e9dfcc' });
  }
  const FX = 2.2, FZ = 2.2;
  K.stall(b, { x: FX, z: FZ, w: 1.1, d: 0.6, h: 0.6, cloth: '#3f6c8a' });
  for (let i = 0; i < 9; i++) b.add(K.at(K.sphere(0.07, 6, 4), FX - 0.4 + i * 0.1, 0.33, FZ, { s: [0.5, 0.35, 2.2], ry: 0.3 }), '#aab7bf', 'silver');
  K.lamp(b, { x: -2.6, z: 2.2, h: 1.5 });
  K.lamp(b, { x: 2.6, z: -2.4, h: 1.5 });

  // ---- tall houses lining both sides, every storey with sills, shutters, flower boxes
  const walls = ['#e9c98f', '#e3b27b', '#f1dcb0', '#d99a6c', '#ecd2a2', '#cf8e62', '#f0e2c4', '#b9c2b3'];
  const shutterCols = ['#3c6e64', '#2f5d7a', '#6a8f4d', '#8a4a35', '#4d6f8f'];
  const SH = 0.78; // storey height
  type Win = { x: number; y: number; z: number; ry: number };
  const wins: Win[] = [];
  const flowers: [number, number, number][] = [];
  for (const side of [-1, 1]) {
    let x = XL + 0.3;
    while (x < XR - 0.6) {
      const w = rng.float(1.2, 1.8);
      const cx = x + w / 2;
      x += w + 0.04;
      if (Math.abs(cx) < 3.0 + w / 2) continue; // piazza opening
      const d = rng.float(2.0, 2.6);
      const st = rng.int(3, 5);
      const h = st * SH + 0.3;
      const zc = streetZ(cx) + side * (SW / 2 + 0.15 + d / 2);
      const ry = side < 0 ? 0 : Math.PI; // front faces the street
      const wall = rng.pick(walls);
      K.house(b, { x: cx, z: zc, ry, w, d, h, roof: rng.pick(['hip', 'gable', 'flat'] as const), roofH: 0.55, wall, roofColor: rng.pick(['#a8553a', '#b8663f', '#94503c']), windows: false, cornice: true });
      // back house for depth
      const bh = rng.float(1.6, 3.2);
      K.house(b, { x: cx + rng.float(-0.2, 0.2), z: zc + side * (d / 2 + 1.3), ry, w: w * 0.95, d: 2.2, h: bh, roof: 'hip', roofH: 0.5, wall: rng.pick(walls), roofColor: '#9e5640', lit: 0, rng });
      const place = (g: THREE.BufferGeometry) => K.at(g, cx, 0, zc, { ry });
      const fz = d / 2;
      // ground floor shop: arched door and a dark opening
      b.add(place(K.at(K.archWall(w * 0.9, 0.62, 0.04, 0.42, 0.55), 0, 0.02, fz + 0.03)), K.shade(wall, 0.9), 'plaster');
      b.add(place(K.at(K.box(0.42, 0.52, 0.02), 0, 0.02, fz + 0.005)), '#2c2522', 'matte');
      const cols = w > 1.5 ? 2 : 1;
      const sh = rng.pick(shutterCols);
      for (let s = 1; s < st; s++) {
        for (let c = 0; c < cols; c++) {
          const lx = cols === 1 ? 0 : (c - 0.5) * w * 0.48;
          const y = 0.3 + s * SH;
          b.add(place(K.at(K.box(0.26, 0.4, 0.02), lx, y + 0.1, fz + 0.005)), '#2a2724', 'matte');
          b.add(place(K.at(K.box(0.4, 0.045, 0.14), lx, y + 0.05, fz + 0.06)), '#f6f0e4', 'stone'); // windowsill
          b.add(place(K.at(K.box(0.36, 0.035, 0.04), lx, y + 0.52, fz + 0.02)), '#f6f0e4', 'stone'); // lintel
          for (const sx of [-1, 1]) b.add(place(K.at(K.box(0.13, 0.42, 0.02), lx + sx * 0.2, y + 0.09, fz + 0.03, { ry: sx * 0.5 })), sh, 'wood');
          const lp = new THREE.Vector3(lx, 0, fz).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
          if (rng.chance(0.55)) {
            b.add(place(K.at(K.box(0.34, 0.08, 0.1), lx, y + 0.075, fz + 0.09)), '#8a5a3c', 'wood');
            for (let f = 0; f < 4; f++) flowers.push([cx + lp.x + Math.cos(ry) * (-0.13 + f * 0.087), y + 0.19, zc + lp.z - Math.sin(ry) * (-0.13 + f * 0.087) + (side < 0 ? 0.1 : -0.1)]);
          }
          if (rng.chance(0.5)) wins.push({ x: cx + lp.x, y: y + 0.5, z: zc + lp.z + (side < 0 ? 0.06 : -0.06), ry });
        }
      }
      if (rng.chance(0.5)) K.chimney(b, { x: cx + rng.float(-0.3, 0.3), y: h, z: zc + rng.float(-0.4, 0.4), h: 0.45 });
    }
  }

  // ---- side wall fountains at both ends of the street
  for (const fx of [-9.6, 9.6]) {
    const z = streetZ(fx) - SW / 2 + 0.35;
    b.add(K.at(K.lathe([[0.42, 0], [0.42, 0.3], [0.36, 0.3], [0.36, 0.08], [0.01, 0.08]], 20), fx, 0, z), '#e9dfcc', 'stone');
    b.add(K.at(K.box(0.7, 1.3, 0.12), fx, 0, z - 0.4), '#e2d5bd', 'stone');
    b.add(K.at(K.sphere(0.1, 8, 6), fx, 0.95, z - 0.3), '#5f7f78', 'bronze');
  }
  // the dense old town behind the street fronts
  for (const side of [-1, 1]) {
    for (let gx = -13.4; gx < 13; gx += 3.0) {
      for (let gd = 6.9; gd < 14; gd += 3.0) {
        const x = gx + 1.3, z = streetZ(x) + side * (gd + 1.3);
        if (Math.hypot(x, z) > 14.4) continue;
        K.block(b, { x, z, w: 2.6, d: 2.6, cell: 1.3, rng, minH: 1.1, maxH: 2.5, roof: ['hip', 'gable'], walls: ['#e9c98f', '#e3b27b', '#f1dcb0', '#d99a6c', '#ecd2a2'], roofs: ['#a8553a', '#b8663f', '#94503c'] });
      }
    }
  }
  // a church on the piazza, a loggia opposite
  K.house(b, { x: 0, z: streetZ(0) - 5.0, w: 3.0, d: 2.6, h: 3.6, roof: 'gable', roofH: 1.1, wall: '#f2e6cf', roofColor: '#a14f37', lit: 0, rng });
  K.tower(b, { x: 1.9, z: streetZ(0) - 5.6, r: 0.5, h: 6.2, sides: 4, top: 'pyramid', color: '#efdfc2', topColor: '#9c513a', bands: 1.5, rng });
  b.add(K.at(K.archBand(1.0, 0.18, 0.1, 16), 0, 1.6, streetZ(0) - 3.65), '#fbf4e6', 'stone');
  K.arcade(b, { x: 0, z: streetZ(0) + 4.2, n: 5, span: 0.9, h: 1.4, d: 0.3, color: '#f2e6cf' });
  K.house(b, { x: 0, z: streetZ(0) + 5.4, w: 4.6, d: 2.0, h: 2.6, roof: 'hip', roofH: 0.7, wall: '#e3b27b', roofColor: '#a8553a', lit: 0, rng });
  // cypresses and gardens around the rim
  K.forest(b, { n: 34, r0: 13, r1: 15.4, rng: rng.fork('trees'), kinds: ['cypress', 'round', 'olive'], h: [1.2, 2.6], avoid: (x, z) => Math.abs(z - streetZ(x)) < 7.5 && Math.abs(x) < 14 });

  root.add(b.build({ name: 'zemrude' }));

  // ---- water: basin surfaces and jets
  root.add(K.waterDisc(1.05, 0.2, { color: '#5d8fa0' }, 32));
  root.add(K.particles({ count: 70, center: [0, 0, 0], radius: 0.07, y0: 0.6, y1: 1.7, color: '#e8f6ff', size: 0.07, opacity: 0.7, velocity: [0, 1.2, 0], swirl: 0.05, rng: rng.fork('jet') }));
  for (const fx of [-9.6, 9.6]) {
    const z = streetZ(fx) - SW / 2 + 0.35;
    root.add(K.waterDisc(0.35, 0.25, { color: '#5d8fa0' }, 20).translateX(fx).translateZ(z));
    root.add(K.particles({ count: 30, center: [fx, 0, z - 0.15], radius: 0.04, y0: 0.3, y1: 0.95, color: '#e8f6ff', size: 0.05, opacity: 0.6, velocity: [0, -0.9, 0], swirl: 0.02, rng: rng.fork('spout' + fx) }));
  }

  // ---- the upper city: flowers and curtains (own materials, they grey with the mood)
  const upMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 });
  const flowerMesh = K.instanced(K.sphere(0.05, 6, 4), upMat, flowers.length, (i, o, c) => {
    o.position.set(...flowers[i]);
    o.scale.setScalar(rng.float(0.8, 1.3));
    c.set(rng.pick(['#e2384f', '#f27da0', '#f6c445', '#ffffff', '#c94bb0', '#ff7a3c']));
  }, { castShadow: false });
  root.add(flowerMesh);
  const curtainMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide });
  const curtains = K.instanced(new THREE.PlaneGeometry(0.24, 0.42).translate(0, -0.21, 0), curtainMat, wins.length, (_i, _o, c) => {
    c.set(rng.pick(['#fbf6ec', '#f3e3c3', '#e9b7a8', '#bfd4e6', '#f6efd9', '#d7e6c8']));
  }, { castShadow: false });
  root.add(curtains);
  const dummy = new THREE.Object3D();
  dummy.rotation.order = 'YXZ';
  const curtainPhase = wins.map(() => rng.float(0, 10));

  // ---- the lower city: wastepaper, fish scales, gutter glints
  const NP = 90;
  const paper = K.instanced(new THREE.PlaneGeometry(0.16, 0.12), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide }), NP, (_i, _o, c) => {
    c.set(rng.pick(['#f4f1ea', '#e8e1cf', '#d9d2c0', '#f0e6c8']));
  }, { castShadow: false });
  root.add(paper);
  const paperData = Array.from({ length: NP }, () => ({ x: rng.float(XL, XR), s: rng.sign(), ph: rng.float(0, 10), sp: rng.float(0.3, 0.9) }));
  const scalePos: THREE.Vector3[] = [];
  for (let i = 0; i < 70; i++) {
    const [dx, dz] = rng.inDisc(0.9);
    scalePos.push(new THREE.Vector3(FX + dx, 0.06, FZ + dz * 0.6 - 0.2));
  }
  for (let i = 0; i < 90; i++) {
    const x = rng.float(XL, XR), s = rng.sign();
    scalePos.push(new THREE.Vector3(x, 0.05, streetZ(x) + s * (SW / 2 - 0.12)));
  }
  const scales = K.glowPoints(scalePos, '#dff1ff', 0.12, 0.0);
  root.add(scales);

  // ---- swallows and people
  const flock = new K.Flock({ count: 34, center: [0, 0, 0], radius: 9, height: 6.5, color: '#1f2230', span: 0.3, speed: 0.45, rng: rng.fork('swallows') });
  root.add(flock.mesh);
  const paths: THREE.Vector3[][] = [];
  for (const off of [-0.55, 0, 0.55]) paths.push(sg.map((p) => new THREE.Vector3(p.x, 0.03, p.z + off)));
  const walkers = new K.Walkers({ paths, count: 70, rng: rng.fork('walk'), speed: [0.2, 0.45], colors: ['#7a3b2e', '#2f4b6e', '#e8e0d0', '#c9a35a', '#4a5d3a', '#2b2b2b'] });
  root.add(walkers.mesh);

  // ---- a negative ambient light: the mood that drains the colour
  const gloom = new THREE.AmbientLight('#ffd9a8', 0);
  root.add(gloom);

  const mood = new K.Toggle(0.45);
  const grab = (mesh: THREE.InstancedMesh) => Array.from({ length: mesh.count }, (_, i) => { const c = new THREE.Color(); mesh.getColorAt(i, c); return c; });
  const flowerCols = grab(flowerMesh), curtainCols = grab(curtains);
  const tmpC = new THREE.Color();
  let lastM = 0;
  return {
    root,
    env: {
      skyTop: '#3f86c6',
      skyHorizon: '#cfe3ef',
      skyBottom: '#a8b8c4',
      skyCurve: 0.55,
      fogNear: 80,
      fogFar: 240,
      sunDir: [0.35, 0.85, 0.45],
      sunColor: '#fff0d6',
      sunIntensity: 3.0,
      sunDisc: 1,
      sunGlow: 0.8,
      hemiSky: '#bcd6ee',
      hemiGround: '#9a8466',
      hemiIntensity: 0.75,
      envIntensity: 0.8,
      clouds: 0.55,
      cloudColor: '#ffffff',
      bloomStrength: 0.35,
      bloomThreshold: 0.9,
      tiltShift: 0.4,
      shadowRadius: 19,
      vignette: 0.3,
      saturation: 1.12,
    },
    camera: {
      position: [10, 11, 17],
      target: [0, 1.4, 0],
      minDistance: 3,
      maxDistance: 60,
      maxPolar: 1.48,
      autoRotate: 0.25,
      views: [
        { position: [-8.5, 3.0, -1.7], target: [-3.5, 2.5, 1.3] },
        { position: [8.3, 2.5, 1.0], target: [4.0, 0, 0.6] },
      ],
    },
    interaction: {
      label: 'Lower your gaze',
      activeLabel: 'Raise your eyes',
      hint: 'Head bowed, the city is gutters and paper. The windowsills are gone.',
      set: (on) => mood.set(on),
      camera: { position: [8.3, 2.5, 1.0], target: [4.0, 0, 0.6] },
    },
    update(t, dt) {
      mood.update(dt);
      const m = mood.value;
      // colour of the upper city fades to grey
      if (Math.abs(m - lastM) > 0.002) {
        lastM = m;
        for (const [mesh, orig] of [[flowerMesh, flowerCols], [curtains, curtainCols]] as const) {
          for (let i = 0; i < orig.length; i++) {
            const o = orig[i];
            const l = (o.r * 0.3 + o.g * 0.59 + o.b * 0.11) * 0.55;
            tmpC.setRGB(l, l, l * 1.04);
            mesh.setColorAt(i, tmpC.lerpColors(o, tmpC, m));
          }
          mesh.instanceColor!.needsUpdate = true;
        }
      }
      gloom.intensity = -0.5 * m;
      // curtains flap out of the windows (still and limp when the eyes are down)
      for (let i = 0; i < wins.length; i++) {
        const w = wins[i];
        const ph = curtainPhase[i];
        const flap = (0.35 + 0.3 * Math.sin(t * 2.1 + ph) + 0.12 * Math.sin(t * 5.3 + ph * 2)) * (1 - m * 0.85);
        dummy.position.set(w.x, w.y, w.z);
        dummy.rotation.set(-flap, w.ry, 0);
        dummy.updateMatrix();
        curtains.setMatrixAt(i, dummy.matrix);
      }
      curtains.instanceMatrix.needsUpdate = true;
      // swallows rise out of sight
      flock.update(t);
      flock.mesh.position.y = m * 14;
      flock.mesh.scale.setScalar(1 - m * 0.5);
      // wastepaper: lies in the gutters, then tumbles down the street in the wind
      for (let i = 0; i < NP; i++) {
        const p = paperData[i];
        let x = p.x + m * t * p.sp * 0.6;
        x = XL + ((((x - XL) % (XR - XL)) + (XR - XL)) % (XR - XL));
        const hop = Math.abs(Math.sin(t * 1.7 + p.ph)) * (0.03 + m * 0.35);
        const z = streetZ(x) + p.s * (SW / 2 - 0.25 - 0.4 * m * Math.abs(Math.sin(p.ph + t * 0.3)));
        dummy.position.set(x, 0.05 + hop, z);
        dummy.rotation.set(-Math.PI / 2 + m * Math.sin(t * 3 + p.ph) * 1.2, p.ph, 0);
        dummy.updateMatrix();
        paper.setMatrixAt(i, dummy.matrix);
      }
      paper.instanceMatrix.needsUpdate = true;
      // fish scales and gutter water glint when you look down
      (scales.material as THREE.PointsMaterial).opacity = 0.12 + m * (1.1 + 0.2 * Math.sin(t * 6));
      walkers.update(t);
    },
  };
};

export default build;
