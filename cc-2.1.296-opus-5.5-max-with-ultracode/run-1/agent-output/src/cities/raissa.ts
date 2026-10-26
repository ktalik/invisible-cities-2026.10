// RAISSA - Hidden Cities 2.
// A grey city in drizzle: cramped houses, people trudging with bowed heads. Yet a
// thread runs through it, linking small moments of joy that do not know about each
// other: a child laughing at a jumping dog, a girl smiling at a man, a cook tossing a
// fish to a cat, a woman watering geraniums on a roof, a boy with a kite, an old man
// feeding sparrows, a fiddler and two dancers. The thread is spun, broken and spun
// again: a golden pulse runs along it and lights each moment as it passes.
// Toggle: reveal the thread (the happy city inside the unhappy one, all at once).

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  const isl = K.island({ radius: 15.5, flat: 14, depth: 9, top: '#6f7276', edge: '#666a6e', cliff: '#7d7a74', under: '#3d3f45', strata: '#8c8a84', seed: 21 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -7, color: '#9aa4b4', shadow: '#4d5566', opacity: 0.75, coverage: 0.6 }));

  const b = new K.Batch();
  // wet cobbles with a faint sheen
  const ground = K.paintBy(new THREE.CircleGeometry(14, 96).rotateX(-Math.PI / 2), (x, _y, z, out) => {
    out.set('#5f6368').multiplyScalar(0.9 + 0.12 * K.noise2(x * 0.9, z * 0.9));
  });
  b.add(K.at(ground, 0, 0.01, 0), null, 'polished');

  // ---- dense grey blocks on a grid; four central cells form the piazza
  const WALLS = ['#8d9097', '#9a948a', '#7f8790', '#a39d93', '#888378', '#959aa0'];
  const ROOFS = ['#4a4f58', '#545a62', '#5b5048', '#43484f'];
  const roofTop = new Map<string, number>();
  const centres = [-10, -6, -2, 2, 6, 10];
  for (const cx of centres) {
    for (const cz of centres) {
      if (Math.hypot(cx, cz) > 12.2) continue;
      if (Math.abs(cx) === 2 && Math.abs(cz) === 2) continue; // piazza
      for (const ox of [-0.78, 0.78]) {
        for (const oz of [-0.78, 0.78]) {
          const x = cx + ox, z = cz + oz;
          const isTerrace = cx === 6 && cz === 6 && ox < 0 && oz < 0;
          const h = isTerrace ? 2.4 : rng.float(1.8, 3.6);
          roofTop.set(`${cx},${cz},${ox},${oz}`, h);
          K.house(b, {
            x, z, ry: rng.int(0, 3) * (Math.PI / 2), w: 1.5, d: 1.5, h,
            roof: isTerrace ? 'flat' : rng.pick(['gable', 'hip', 'gable'] as const),
            wall: K.jitter(rng.pick(WALLS), rng, 0.01, 0.03, 0.05), roofColor: rng.pick(ROOFS), roofFinish: 'stone',
            lit: 0.04, glow: 1.8, litColor: '#ffb866', windowColor: '#2e3238', rng,
          });
          if (!isTerrace && rng.chance(0.5)) K.chimney(b, { x: x + rng.float(-0.4, 0.4), z: z + rng.float(-0.4, 0.4), y: h, h: 0.6, color: '#5d5751' });
        }
      }
    }
  }
  // the piazza: dark paving, a dry fountain, a few benches
  b.add(K.at(K.box(7.2, 0.04, 7.2), 0, 0, 0), '#6c6a66', 'stone');
  K.fountain(b, { x: 0.6, z: -0.6, r: 0.9, color: '#9d9890' });
  for (const [x, z, ry] of [[3, -2.8, 0], [-3, -2.8, 0], [3.1, 1.2, Math.PI / 2]] as const) {
    b.add(K.at(K.box(0.9, 0.08, 0.3), x, 0.22, z, { ry }), '#5a4a3c', 'wood');
    for (const s of [-0.38, 0.38]) b.add(K.at(K.box(0.06, 0.22, 0.26), x + Math.cos(ry) * s, 0, z - Math.sin(ry) * s, { ry }), '#3a3634', 'metal');
  }
  // street lamps, unlit, and laundry lines that never dry
  for (const p of [[-4, -4], [4, 4], [-4, 8], [8, -4], [0, -8], [-8, 0], [4, -8]] as const) K.lamp(b, { x: p[0] + 0.35, z: p[1] + 0.35, h: 1.3, glow: '#ffcf8a', intensity: 1.2 });
  for (let i = 0; i < 9; i++) {
    const sx = rng.pick([-8, -4, 4, 8]);
    const z = rng.pick(centres) + rng.float(-1, 1);
    const a: [number, number, number] = [sx - 0.45, 1.6, z], c: [number, number, number] = [sx + 0.45, 1.6, z];
    b.add(K.rope(a, c, 0.1, 0.008), '#3a3a3a', 'matte');
    for (const k of [0.3, 0.55, 0.75]) b.add(K.at(K.box(0.12, 0.16, 0.01), sx - 0.45 + 0.9 * k, 1.38, z), rng.pick(['#9a9fa6', '#b0aaa0', '#7d8590']), 'cloth');
  }
  K.forest(b, { n: 24, r0: 12.8, r1: 14.2, rng, kinds: ['cypress', 'round'], h: [1.2, 2], color: '#4d5a4e' });
  root.add(b.build({ name: 'raissa' }));

  // ---- the moments of joy (static figures in Batch, animated ones as small groups)
  const joy = new K.Batch();
  const fig = (x: number, z: number, color: string, h = 0.26, ry = 0, y = 0) => {
    joy.add(K.at(K.cyl(h * 0.1, h * 0.19, h * 0.72, 8), x, y, z, { ry }), color, 'cloth');
    joy.add(K.at(K.sphere(h * 0.12, 8, 6), x, y + h * 0.7, z, { s: [1.1, 0.6, 0.9] }), color, 'cloth');
    joy.add(K.at(K.sphere(h * 0.1, 10, 8), x, y + h * 0.86, z), '#efcfb4', 'matte');
  };
  // B: a girl smiles at a man (street x = 4)
  fig(4.0, -5.7, '#c6604a', 0.24, 0);
  fig(4.0, -5.15, '#3f4a5c', 0.28, Math.PI);
  // C: the cook at a back door with his white apron
  fig(-8.3, -1.4, '#f2efe8', 0.27, Math.PI / 2);
  // D: the woman on her roof terrace among geraniums
  const TX = 6 - 0.78, TZ = 6 - 0.78, TY = 2.48;
  fig(TX, TZ, '#7a4d7a', 0.26, -Math.PI / 4, TY);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const x = TX + Math.cos(a) * 0.55, z = TZ + Math.sin(a) * 0.55;
    joy.add(K.at(K.cyl(0.07, 0.05, 0.1, 8), x, TY, z), '#a0523a', 'ceramic');
    joy.add(K.at(K.sphere(0.08, 8, 6), x, TY + 0.14, z), rng.pick(['#e8344a', '#ff5a6e', '#d82a5a']), 'cloth');
  }
  // E: the boy with the kite (street z = 8)
  const KX = -6, KZ = 8;
  fig(KX, KZ, '#3d6e9c', 0.18, Math.PI);
  // F: the old man on a bench feeding sparrows
  fig(8.3, -4.3, '#5b5148', 0.24, -Math.PI / 2, 0.08);
  joy.add(K.at(K.box(0.6, 0.06, 0.25), 8.32, 0.16, -4.3, { ry: Math.PI / 2 }), '#5a4a3c', 'wood');
  // G: a fiddler on the steps (street z = -8)
  fig(-0.6, -8.2, '#6b3b2a', 0.26, Math.PI / 2);
  joy.add(K.at(K.box(0.03, 0.03, 0.18), -0.55, 0.2, -8.12, { rx: 0.5 }), '#8a4a20', 'wood');
  root.add(joy.build({ name: 'raissa-joy' }));

  // animated actors
  const actor = (geo: THREE.BufferGeometry, color: string) => {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    m.castShadow = true;
    root.add(m);
    return m;
  };
  // A: child and jumping dog in the piazza
  const child = actor(K.merge([K.cyl(0.02, 0.035, 0.12, 8), K.at(K.sphere(0.03, 8, 6), 0, 0.15, 0)]), '#e2b23a');
  const dog = actor(K.quadruped({ len: 0.26, h: 0.18, tail: 0.08, ears: true }), '#a2683a');
  // C: cat and the arcing fish
  const cat = actor(K.quadruped({ len: 0.16, h: 0.11, tail: 0.1, ears: true }), '#2b2724');
  cat.position.set(-7.66, 0, -1.4);
  cat.rotation.y = -Math.PI / 2;
  const fish = actor(K.at(K.sphere(0.05, 8, 6), 0, 0, 0, { s: [0.5, 0.6, 1.6] }), '#c8d4dc');
  // E: kite and string
  const kite = actor(K.at(new THREE.OctahedronGeometry(0.28, 0), 0, 0, 0, { s: [1, 1.3, 0.12] }), '#e94b3c');
  (kite.material as THREE.MeshStandardMaterial).emissive.set('#5a1208');
  const kiteString = K.polyline([[KX, 0.15, KZ], [KX, 4, KZ]], '#d9d4c8', 0.8);
  root.add(kiteString);
  // F: sparrows hopping at the old man's feet
  const sparrows = K.instanced(K.at(K.sphere(0.035, 6, 5), 0, 0.035, 0, { s: [0.8, 0.8, 1.2] }), new THREE.MeshStandardMaterial({ color: '#7a5f45', roughness: 0.9 }), 7);
  root.add(sparrows);
  const sparrowSet = K.instanceSetter(sparrows);
  // G: two dancers turning around each other
  const dancers = K.instanced(K.merge([K.paint(K.cyl(0.03, 0.06, 0.19, 8), '#ffffff'), K.paint(K.at(K.sphere(0.028, 8, 6), 0, 0.23, 0), '#efcfb4')]), K.figureMaterial(), 2, (i, _o, c) => { c.set(i ? '#2f6a8a' : '#d8a23a'); });
  root.add(dancers);
  const danceSet = K.instanceSetter(dancers);

  // ---- the invisible thread: a closed curve through every moment, arching over the roofs
  const anchors: THREE.Vector3[] = [
    new THREE.Vector3(-1.6, 0.18, 1.9), // child & dog
    new THREE.Vector3(-0.4, 0.22, -8.0), // fiddler & dancers
    new THREE.Vector3(4.0, 0.25, -5.45), // girl & man
    new THREE.Vector3(8.3, 0.22, -4.2), // old man & sparrows
    new THREE.Vector3(TX, TY + 0.25, TZ), // woman on the roof
    new THREE.Vector3(KX, 0.15, KZ), // boy & kite
    new THREE.Vector3(-7.8, 0.22, -1.4), // cook & cat
  ];
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i], c = anchors[(i + 1) % anchors.length];
    pts.push(a);
    const m = a.clone().lerp(c, 0.5);
    m.y = 6.4 + rng.float(-0.5, 1.0);
    pts.push(a.clone().lerp(m, 0.06).setY(Math.max(a.y + 4.6, 4.8)));
    pts.push(m);
    pts.push(c.clone().lerp(m, 0.06).setY(Math.max(c.y + 4.6, 4.8)));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const threadU = { uReveal: { value: 0 }, uTime: K.U.time };
  const threadMat = new THREE.ShaderMaterial({
    uniforms: threadU,
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uReveal; uniform float uTime; varying vec2 vUv;
      void main(){
        float u = vUv.x;
        float head = fract(uTime * 0.035);
        float d = u - head; d -= floor(d + 0.5);
        float trail = d < 0.0 ? exp(d * 9.0) : exp(-d * 260.0);          // bright head with a fading wake
        float spun = smoothstep(0.35, 0.6, sin(u * 37.0 - uTime * 0.6) * 0.5 + 0.5 + 0.35 * sin(u * 11.0 + uTime * 0.23));
        float a = max(trail, 0.22 * spun);
        a = mix(a, 0.75 + 0.25 * sin(u * 300.0 - uTime * 4.0), uReveal);
        gl_FragColor = vec4(vec3(1.0, 0.78, 0.38) * (1.5 + 2.5 * a), a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const thread = new THREE.Mesh(new THREE.TubeGeometry(curve, 900, 0.03, 5, true), threadMat);
  root.add(thread);
  // where each moment sits along the thread
  const anchorU = anchors.map((a) => {
    let best = 0, bd = 1e9;
    for (let i = 0; i < 1200; i++) {
      const d = curve.getPointAt(i / 1200).distanceToSquared(a);
      if (d < bd) { bd = d; best = i / 1200; }
    }
    return best;
  });
  const halos = anchors.map((a) => {
    const s = K.glowSprite('#ffd27a', 1.6, 0);
    s.position.copy(a).add(new THREE.Vector3(0, 0.1, 0));
    root.add(s);
    return s;
  });
  const warm = new THREE.PointLight('#ffc070', 0, 22, 1.4);
  warm.position.set(0, 5, 0);
  root.add(warm);

  // ---- the unhappy crowd, drizzle and pigeons
  const paths: THREE.Vector3[][] = [];
  for (const s of [-8, -4, 0, 4, 8]) {
    const L = Math.sqrt(Math.max(0, 12.5 * 12.5 - s * s));
    paths.push([new THREE.Vector3(s, 0.02, -L), new THREE.Vector3(s, 0.02, L)]);
    paths.push([new THREE.Vector3(-L, 0.02, s), new THREE.Vector3(L, 0.02, s)]);
  }
  const walkers = new K.Walkers({ paths, count: 120, rng: rng.fork('walk'), speed: [0.12, 0.24], colors: ['#4a4d52', '#5b554e', '#3d4350', '#6a6660', '#2f3236', '#575a63'] });
  root.add(walkers.mesh);
  root.add(K.particles({ count: 1800, radius: 14, y0: 0, y1: 12, color: '#b9c4d2', size: 0.035, opacity: 0.32, velocity: [0.3, -5.5, 0], rng: rng.fork('rain') }));
  const flock = new K.Flock({ count: 14, radius: 8, height: 6, color: '#55575c', speed: 0.18, rng: rng.fork('birds') });
  root.add(flock.mesh);

  const reveal = new K.Toggle(0.4);
  return {
    root,
    env: {
      skyTop: '#59667a',
      skyHorizon: '#a7adb5',
      skyBottom: '#525866',
      skyCurve: 0.6,
      fog: '#9298a2',
      fogNear: 60,
      fogFar: 200,
      sunDir: [-0.4, 0.75, 0.35],
      sunColor: '#d6dde6',
      sunIntensity: 1.3,
      sunDisc: 0,
      sunGlow: 0.2,
      hemiSky: '#b7c1cf',
      hemiGround: '#4f4a46',
      hemiIntensity: 0.9,
      envIntensity: 0.7,
      clouds: 0.85,
      cloudColor: '#c3c8cf',
      bloomStrength: 0.9,
      bloomThreshold: 0.75,
      bloomRadius: 0.6,
      tiltShift: 0.45,
      shadowRadius: 17,
      vignette: 0.45,
      saturation: 0.95,
    },
    camera: {
      position: [17, 15, 19],
      target: [0, 1.2, 0],
      minDistance: 5,
      maxDistance: 60,
      autoRotate: 0.25,
      views: [
        { position: [1.6, 1.7, -1.6], target: [-1.6, 0.6, 1.8] },
        { position: [1, 24, 3], target: [0, 0, 0] },
      ],
    },
    interaction: {
      label: 'Reveal the thread',
      activeLabel: 'Let it hide again',
      hint: 'A happy city runs through the unhappy one, not knowing it exists.',
      set: (on) => reveal.set(on),
    },
    update(t, dt) {
      reveal.update(dt);
      const r = reveal.value;
      threadU.uReveal.value = r;
      const head = K.fract(t * 0.035);
      anchors.forEach((_, i) => {
        let d = anchorU[i] - head;
        d -= Math.floor(d + 0.5);
        const lit = d < 0 ? Math.exp(d * 14) : Math.exp(-d * 120);
        (halos[i].material as THREE.SpriteMaterial).opacity = Math.min(1, 0.85 * Math.max(lit, r));
        halos[i].scale.setScalar(1.2 + lit * 0.8 + r * 0.4);
      });
      warm.intensity = r * 10;
      // child bobs with laughter, the dog leaps around him
      child.position.set(-1.7, Math.abs(Math.sin(t * 7)) * 0.025, 1.9);
      const da = t * 1.6;
      dog.position.set(-1.7 + Math.cos(da) * 0.5, Math.abs(Math.sin(t * 5)) * 0.14, 1.9 + Math.sin(da) * 0.5);
      dog.rotation.y = -da;
      // the fish flies from the cook to the cat every three seconds
      const ft = K.fract(t / 3);
      fish.visible = ft < 0.5;
      const k = ft / 0.5;
      fish.position.set(K.lerp(-8.15, -7.68, k), 0.25 + Math.sin(k * Math.PI) * 0.5, -1.4);
      fish.rotation.z = k * 6;
      cat.position.y = ft > 0.42 && ft < 0.56 ? 0.04 : 0;
      // the kite swims in the wind
      const kx = KX + 1.2 + Math.sin(t * 0.7) * 0.6, ky = 5 + Math.sin(t * 1.1) * 0.35, kz = KZ - 1.5 + Math.cos(t * 0.5) * 0.4;
      kite.position.set(kx, ky, kz);
      kite.rotation.set(0.3, t * 0.2, Math.sin(t * 1.3) * 0.4);
      const sp = (kiteString.geometry as THREE.BufferGeometry).attributes.position as THREE.BufferAttribute;
      sp.setXYZ(1, kx, ky - 0.3, kz);
      sp.needsUpdate = true;
      // sparrows hop
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9 + Math.floor(t * 1.5 + i * 0.37) * 1.7;
        const hop = Math.max(0, Math.sin((t * 1.5 + i * 0.37) * Math.PI * 2)) * 0.05;
        sparrowSet(i, 7.82 + Math.cos(a) * 0.22, hop, -4.3 + Math.sin(a) * 0.35, a);
      }
      sparrowSet.done();
      // dancers turn
      for (let i = 0; i < 2; i++) {
        const a = t * 1.8 + i * Math.PI;
        danceSet(i, 0.1 + Math.cos(a) * 0.14, Math.abs(Math.sin(t * 3.6)) * 0.02, -8.2 + Math.sin(a) * 0.14, -a);
      }
      danceSet.done();
      walkers.update(t);
      flock.update(t);
    },
  };
};

export default build;
