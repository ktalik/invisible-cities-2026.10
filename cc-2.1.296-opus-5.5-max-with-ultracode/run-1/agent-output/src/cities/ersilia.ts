// ERSILIA - Trading Cities 4.
// Strings of four tones run between poles at the corners of the houses: white for
// blood, black for trade, grey for authority, black-and-white for agency. The living
// web thickens string by string; beyond it, toward the north-west fog, stand the
// older Ersilias: poles and strings only, each sparser and more chaotic.
// Toggle: dismantle the houses - the walls fold down, the people climb to the
// terrace on the mountainside, and the web alone remains: the city.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const TONES = ['#f3efe6', '#26272d', '#8f8f92', 'bw'] as const;
const pickTone = (r: number) => (r < 0.35 ? 0 : r < 0.6 ? 1 : r < 0.85 ? 2 : 3);
type Pole = { x: number; z: number; h: number; tx: number; tz: number };
type Str = { a: THREE.Vector3; b: THREE.Vector3; tone: number; sag: number };

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const isl = K.island({ radius: 26, flat: 25, depth: 9, hills: 0, top: '#a69474', edge: '#9a8868', cliff: '#7d6e58', under: '#3e362e', strata: '#988670', seed: 9 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -7, color: '#d8d2c4', shadow: '#6e6a66', opacity: 0.65, coverage: 0.5 }));

  // ---- terrain: a near-flat plain and the mountainside to the north-east with a terrace
  const TER = new THREE.Vector3(15.5, 4.2, -14.5);
  const heightAt = (x: number, z: number) => {
    const r = Math.hypot(x, z), a = Math.atan2(z, x), rim = isl.rimAt(a);
    const mask = K.smoothstep(-1.55, -1.25, a) * (1 - K.smoothstep(0.0, 0.3, a));
    let h = 0.04 + K.fbm2(x * 0.15, z * 0.15, 3) * 0.12;
    const ridge = K.smoothstep(15, 22.5, r) * (1 - K.smoothstep(23.6, rim - 0.6, r));
    h += mask * ridge * (6.5 + K.ridged2(x * 0.12, z * 0.12, 4) * 2.2);
    const dt = Math.hypot(x - TER.x, z - TER.z);
    h = K.lerp(h, TER.y, (1 - K.smoothstep(2.4, 3.6, dt)) * mask);
    return h * (1 - K.smoothstep(rim - 1.2, rim - 0.6, r));
  };
  const tg = new THREE.PlaneGeometry(54, 54, 140, 140).rotateX(-Math.PI / 2);
  const tp = tg.attributes.position as THREE.BufferAttribute;
  const tcol = new Float32Array(tp.count * 3), c = new THREE.Color();
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i), h = heightAt(x, z);
    tp.setY(i, h);
    c.set('#a69474').lerp(new THREE.Color('#5d554c'), K.smoothstep(0.6, 5, h)).offsetHSL(0, 0, K.noise2(x * 0.5, z * 0.5) * 0.04);
    if (Math.hypot(x - TER.x, z - TER.z) < 2.6) c.set('#8f7f64');
    tcol.set([c.r, c.g, c.b], i * 3);
  }
  tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
  const ix = tg.index!.array, keep: number[] = [];
  for (let i = 0; i < ix.length; i += 3) {
    const cx = (tp.getX(ix[i]) + tp.getX(ix[i + 1]) + tp.getX(ix[i + 2])) / 3, cz = (tp.getZ(ix[i]) + tp.getZ(ix[i + 1]) + tp.getZ(ix[i + 2])) / 3;
    if (Math.hypot(cx, cz) < isl.rimAt(Math.atan2(cz, cx)) - 0.7) keep.push(ix[i], ix[i + 1], ix[i + 2]);
  }
  tg.setIndex(keep); tg.deleteAttribute('uv'); tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, K.finish('matte'));
  terrain.receiveShadow = true;
  root.add(terrain);

  const b = new K.Batch();
  for (let i = 0; i < 220; i++) {
    const [x, z] = rng.inDisc(23);
    if (heightAt(x, z) > 0.5) continue;
    b.add(K.at(K.cone(0.08, rng.float(0.12, 0.25), 4), x, heightAt(x, z), z, { ry: rng.angle() }), K.jitter('#8a8456', rng), 'matte');
  }

  // ---- string helpers
  const poles: Pole[] = [];
  const pp = (p: Pole, y: number) => new THREE.Vector3(p.x + p.tx * y, y, p.z + p.tz * y);
  const pushString = (s: Str, P: number[], C: number[]) => {
    const n = s.tone === 3 || s.sag > 0 ? 8 : 1;
    for (let k = 0; k < n; k++) {
      const u0 = k / n, u1 = (k + 1) / n;
      const A = new THREE.Vector3().lerpVectors(s.a, s.b, u0), B = new THREE.Vector3().lerpVectors(s.a, s.b, u1);
      A.y -= s.sag * 4 * u0 * (1 - u0); B.y -= s.sag * 4 * u1 * (1 - u1);
      P.push(A.x, A.y, A.z, B.x, B.y, B.z);
      const col = c.set(s.tone === 3 ? (k % 2 ? '#26272d' : '#f3efe6') : TONES[s.tone]);
      C.push(col.r, col.g, col.b, col.r, col.g, col.b);
    }
  };

  // ---- the abandoned Ersilias: poles and strings only
  const ruins: { x: number; z: number; r: number; n: number; m: number; order: number }[] = [
    { x: -8, z: -2, r: 4.5, n: 70, m: 600, order: 0.9 },
    { x: -15, z: -7, r: 4, n: 60, m: 400, order: 0.6 },
    { x: -18, z: -15, r: 3.5, n: 50, m: 250, order: 0.3 },
    { x: -11, z: -21, r: 3, n: 40, m: 150, order: 0 },
  ];
  const ruinGroups: THREE.LineSegments[] = [];
  for (const R of ruins) {
    const ps: Pole[] = [];
    const rings = [Math.round(R.n * 0.15), Math.round(R.n * 0.33), R.n - Math.round(R.n * 0.15) - Math.round(R.n * 0.33)];
    rings.forEach((cnt, ri) => {
      for (let i = 0; i < cnt; i++) {
        const j = 1 - R.order;
        const a = (i / cnt) * Math.PI * 2 + rng.float(-0.5, 0.5) * j, rr = (R.r * (ri + 1)) / 3 + rng.float(-0.8, 0.8) * j;
        const fallen = R.order === 0 && rng.chance(0.2);
        const ta = rng.angle(), tilt = fallen ? rng.float(0.3, 0.9) : rng.float(0, 0.06) * (1 + j * 2);
        ps.push({ x: R.x + Math.cos(a) * rr, z: R.z + Math.sin(a) * rr, h: rng.float(1.8, 3.2) * (fallen ? 0.8 : 1), tx: Math.cos(ta) * tilt, tz: Math.sin(ta) * tilt });
      }
    });
    poles.push(...ps);
    const P: number[] = [], C: number[] = [];
    for (let k = 0; k < R.m; k++) {
      const i = rng.int(0, ps.length - 1);
      let j = i;
      if (rng.chance(R.order)) {
        // regular: neighbour in index (along a ring) or the same angle on the next ring
        j = rng.chance(0.6) ? (i + 1) % ps.length : (i + rings[0]) % ps.length;
      } else {
        for (let t = 0; t < 8; t++) { j = rng.int(0, ps.length - 1); if (j !== i && Math.hypot(ps[i].x - ps[j].x, ps[i].z - ps[j].z) < R.r * 1.1) break; }
      }
      if (j === i) continue;
      const lvl = R.order > 0.5 ? rng.pick([1, 0.72, 0.45]) : rng.float(0.3, 1);
      const lvl2 = R.order > 0.5 ? lvl : rng.float(0.3, 1);
      pushString({ a: pp(ps[i], ps[i].h * lvl), b: pp(ps[j], ps[j].h * lvl2), tone: pickTone(rng.next()), sag: R.order === 0 && rng.chance(0.3) ? rng.float(0.2, 0.8) : 0 }, P, C);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    const ls = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55 + R.order * 0.4 }));
    ruinGroups.push(ls);
    root.add(ls);
  }
  // wind-rolled fragments among the ruins
  for (let i = 0; i < 60; i++) {
    const R = ruins[i % 4], [dx, dz] = rng.inDisc(R.r + 1.5);
    b.add(K.at(K.sphere(rng.float(0.04, 0.09), 5, 4), R.x + dx, 0.05, R.z + dz), '#e8e2d4', 'stone');
  }

  // ---- the living Ersilia: 24 houses on a loose hexagonal grid at (2, 0, 5)
  const CX = 2, CZ = 5;
  const homes: { x: number; z: number; w: number; h: number; ry: number }[] = [];
  for (let q = -4; q <= 4; q++) for (let r = -4; r <= 4; r++) {
    const x = CX + 2.2 * (q + r * 0.5) + rng.float(-0.2, 0.2), z = CZ + 2.2 * r * 0.866 + rng.float(-0.2, 0.2);
    if (Math.hypot(x - CX, z - CZ) < 6.5 && homes.length < 24) homes.push({ x, z, w: rng.float(0.9, 1.2), h: rng.float(0.8, 1.0), ry: rng.float(-0.2, 0.2) });
  }
  const houseP: Pole[][] = homes.map((hm) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => {
    const lx = sx * (hm.w / 2 + 0.08), lz = sz * (hm.w / 2 + 0.08), cs = Math.cos(hm.ry), sn = Math.sin(hm.ry);
    return { x: hm.x + lx * cs + lz * sn, z: hm.z - lx * sn + lz * cs, h: rng.float(1.8, 3.2), tx: 0, tz: 0 };
  }));
  houseP.forEach((ps) => poles.push(...ps));
  const living: Str[] = [];
  for (let k = 0; k < 900; k++) {
    for (let t = 0; t < 10; t++) {
      const i = rng.int(0, homes.length - 1), j = rng.int(0, homes.length - 1);
      if (Math.hypot(homes[i].x - homes[j].x, homes[i].z - homes[j].z) > 6) continue;
      const pa = rng.pick(houseP[i]), pb = rng.pick(houseP[j]);
      if (pa === pb) continue;
      const ya = rng.pick([pa.h, pa.h * 0.75, 1.15]), yb = rng.pick([pb.h, pb.h * 0.75, 1.15]);
      living.push({ a: pp(pa, ya), b: pp(pb, yb), tone: pickTone(rng.next()), sag: 0 });
      break;
    }
  }
  const LP: number[] = [], LC: number[] = [], offs: number[] = [0];
  for (const s of living) { pushString(s, LP, LC); offs.push(LP.length / 3); }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(LP, 3));
  lg.setAttribute('color', new THREE.Float32BufferAttribute(LC, 3));
  const liveMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 });
  const liveLines = new THREE.LineSegments(lg, liveMat);
  liveLines.frustumCulled = false;
  root.add(liveLines);
  // the string being cast: a shuttle flies, the line snaps taut and vibrates
  const castPos = new Float32Array(17 * 3);
  const castGeo = new THREE.BufferGeometry();
  castGeo.setAttribute('position', new THREE.BufferAttribute(castPos, 3));
  const castMat = new THREE.LineBasicMaterial({ color: '#ffffff' });
  const castLine = new THREE.Line(castGeo, castMat);
  castLine.frustumCulled = false;
  root.add(castLine);
  const shuttle = K.glowSprite('#f2deaa', 0.5, 0.9);
  root.add(shuttle);

  // poles (one instanced mesh for all webs)
  const poleMesh = K.instanced(K.paint(K.cyl(0.035, 0.045, 1, 5), '#ffffff'), K.figureMaterial(), poles.length, (i, o, col) => {
    const p = poles[i];
    o.position.set(p.x, -0.05, p.z);
    const tilt = Math.hypot(p.tx, p.tz);
    o.rotation.set(Math.atan2(p.tz, 1), 0, -Math.atan2(p.tx, 1));
    o.scale.set(1, p.h * Math.sqrt(1 + tilt * tilt) + 0.05, 1);
    col.copy(K.jitter('#6e5a44', rng, 0.01, 0.05, 0.08));
  });
  root.add(poleMesh);

  // houses: instanced walls (they fold down) and flat roofs
  const wallMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const doorWall = K.merge([K.paint(K.box(1, 1, 0.08).translate(0, 0, -0.04), '#f1ede4'), K.paint(K.wallPlane(0.28, 0.55).translate(0, 0, 0.002), '#2c2622')]);
  const plainWall = K.paint(K.box(1, 1, 0.08).translate(0, 0, -0.04), '#ebe6da');
  const walls = K.instanced(plainWall, wallMat, homes.length * 3, undefined, { colors: false });
  const doors = K.instanced(doorWall, wallMat, homes.length, undefined, { colors: false });
  const roofs = K.instanced(K.paint(K.box(1, 0.08, 1), '#d8d0c0'), wallMat, homes.length, undefined, { colors: false });
  root.add(walls, doors, roofs);
  const setW = K.instanceSetter(walls), setDo = K.instanceSetter(doors), setR = K.instanceSetter(roofs);
  const O = new THREE.Object3D();
  const placeHouses = (fold: number) => {
    const fall = K.smoothstep(0, 0.35, fold), gone = K.smoothstep(0.35, 0.5, fold);
    homes.forEach((hm, i) => {
      for (let k = 0; k < 4; k++) {
        const ry = hm.ry + (k * Math.PI) / 2;
        O.position.set(hm.x + Math.sin(ry) * hm.w / 2, 0, hm.z + Math.cos(ry) * hm.w / 2);
        O.rotation.set(0, 0, 0); O.rotateY(ry); O.rotateX(fall * Math.PI / 2 * 0.98);
        O.position.y = 0.04 * fall;
        const s = 1 - gone;
        O.scale.set(hm.w * s + 1e-3, hm.h * s + 1e-3, s + 1e-3);
        O.updateMatrix();
        if (k === 0) doors.setMatrixAt(i, O.matrix); else walls.setMatrixAt(i * 3 + k - 1, O.matrix);
      }
      const s = 1 - K.smoothstep(0, 0.2, fold);
      setR(i, hm.x, hm.h * s, hm.z, hm.ry, [hm.w * 1.04 * s + 1e-3, 1, hm.w * 1.04 * s + 1e-3]);
    });
    setW.done(); setDo.done(); setR.done();
  };
  placeHouses(0);

  // the camp on the terrace (appears with the exodus)
  const camp = new K.Batch();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4, x = TER.x + Math.cos(a) * 1.6, z = TER.z + Math.sin(a) * 1.6;
    camp.add(K.at(K.gableRoof(0.7, 0.9, 0.5, 0.02), x, TER.y, z, { ry: a }), i % 2 ? '#9b4a33' : '#3a466e', 'cloth');
    camp.add(K.at(K.box(0.5, 0.04, 0.35), x * 0.7 + TER.x * 0.3, TER.y, z * 0.7 + TER.z * 0.3, { ry: a }), i % 2 ? '#3a466e' : '#9b4a33', 'cloth');
  }
  for (let i = 0; i < 10; i++) camp.add(K.at(K.box(0.3, 0.2, 0.22), TER.x + rng.float(-2, 2), TER.y, TER.z + rng.float(-2, 2), { ry: rng.angle() }), '#7a6a52', 'wood');
  const campG = camp.build();
  root.add(campG);
  root.add(b.build({ name: 'ersilia' }));

  // ---- citizens: walk among the houses; with the exodus, they climb with bundles
  const NP = 60;
  const people = K.instanced(K.personGeometry(0.25), K.figureMaterial(), NP, (_i, _o, col) => { col.set(rng.pick(['#9b4a33', '#3a466e', '#d9d0bf', '#5a4a3c', '#7a7064'])); });
  const bundles = K.instanced(K.paint(K.box(0.14, 0.1, 0.12), '#ffffff'), K.figureMaterial(), NP, (_i, _o, col) => { col.set(rng.pick(['#f1ede4', '#d8d0c0', '#9b4a33'])); });
  root.add(people, bundles);
  const setP = K.instanceSetter(people), setBu = K.instanceSetter(bundles);
  const exodus = [new THREE.Vector3(CX, 0, CZ), new THREE.Vector3(9, 0, -2), new THREE.Vector3(12.5, 0, -8), new THREE.Vector3(14.2, 0, -11.8), TER.clone()];
  exodus.forEach((p) => (p.y = heightAt(p.x, p.z)));
  const pAt = (u: number, out: THREE.Vector3) => {
    const f = K.clamp(u) * (exodus.length - 1), k = Math.min(exodus.length - 2, Math.floor(f));
    out.lerpVectors(exodus[k], exodus[k + 1], f - k);
    out.y = heightAt(out.x, out.z);
    return out;
  };
  const seat = Array.from({ length: NP }, (_, i) => { const a = i * 2.4, r = 0.6 + (i % 5) * 0.4; return [TER.x + Math.cos(a) * r, TER.z + Math.sin(a) * r]; });
  const P1 = new THREE.Vector3(), P2 = new THREE.Vector3();

  // light beads travelling along strings; dust in the west wind
  const NBd = 36, bpos = new Float32Array(NBd * 3), bcol = new Float32Array(NBd * 3);
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.BufferAttribute(bpos, 3));
  bg.setAttribute('color', new THREE.BufferAttribute(bcol, 3));
  const beads = new THREE.Points(bg, new THREE.PointsMaterial({ size: 0.35, map: K.glowTexture(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  beads.frustumCulled = false;
  root.add(beads);
  root.add(K.particles({ count: 500, radius: 22, y0: 0.05, y1: 1.2, color: '#d8cdb4', size: 0.05, opacity: 0.5, velocity: [1.6, 0, 0.25], swirl: 0.3, rng: rng.fork('dust') }));
  root.add(K.particles({ count: 60, radius: 20, y0: 0.4, y1: 4, color: '#e6dfd0', size: 1.6, opacity: 0.06, velocity: [1.0, 0, 0.1], swirl: 0.8, rng: rng.fork('haze') }));
  const flock = new K.Flock({ count: 9, center: [-10, 0, -10], radius: 8, height: 9, color: '#3a3836', rng: rng.fork('birds') });
  root.add(flock.mesh);

  const dis = new K.Toggle(0.18);
  const strAt = (k: number) => living[k];
  return {
    root,
    env: {
      skyTop: '#5e6670', skyHorizon: '#dcd6c8', skyBottom: '#9c968a', skyCurve: 0.6,
      fog: '#bdb6a7', fogNear: 45, fogFar: 150,
      sunDir: [-0.9, 0.22, 0.15], sunColor: '#ffd9a8', sunIntensity: 1.9, sunDisc: 0.6, sunGlow: 0.7,
      hemiSky: '#c8ccd2', hemiGround: '#8a7a60', hemiIntensity: 1.0, envIntensity: 0.8,
      stars: 0, clouds: 0.75, cloudColor: '#e8e4dc',
      bloomStrength: 0.45, bloomThreshold: 0.85, bloomRadius: 0.4,
      tiltShift: 0.3, shadowRadius: 27, vignette: 0.35, saturation: 0.95, contrast: 1.05,
    },
    camera: {
      position: [9, 13.5, 24],
      target: [-3, 1.0, -1.5],
      minDistance: 6, maxDistance: 80, autoRotate: 0.15,
      views: [
        { position: [-26, 12, 14], target: [-12, 1.5, -10] },
        { position: [6.5, 1.6, 12.5], target: [1, 1.6, 4] },
      ],
    },
    interaction: {
      label: 'Dismantle the houses',
      activeLabel: 'Rebuild the houses',
      hint: 'The houses go; the strings stay. The strings are the city.',
      set: (on) => dis.set(on),
      camera: { position: [18, 10.5, -18], target: [0, 0.5, 2] },
    },
    update(t, dt) {
      dis.update(dt);
      const v = dis.value;
      placeHouses(v);
      // weaving: a new string every 0.4 s, from 300 up to 900
      const castF = 300 + t / 0.4;
      const n = Math.min(living.length, Math.floor(castF));
      lg.setDrawRange(0, offs[Math.max(0, n - 1)]);
      liveMat.opacity = 0.9 + 0.1 * v;
      if (n < living.length) {
        const s = strAt(n - 1), age = (castF - Math.floor(castF)) * 0.4;
        const fly = K.smoothstep(0, 0.15, age);
        for (let k = 0; k <= 16; k++) {
          const u = (k / 16) * fly;
          P1.lerpVectors(s.a, s.b, u);
          P1.y += Math.sin((k / 16) * Math.PI) * 0.05 * Math.exp(-age * 6) * Math.sin(age * 60) * fly;
          castPos.set([P1.x, P1.y, P1.z], k * 3);
        }
        castGeo.attributes.position.needsUpdate = true;
        castMat.color.set(TONES[s.tone] === 'bw' ? '#ffffff' : TONES[s.tone]);
        P2.lerpVectors(s.a, s.b, fly);
        shuttle.position.copy(P2);
        (shuttle.material as THREE.SpriteMaterial).opacity = 1 - K.smoothstep(0.15, 0.3, age);
      } else castLine.visible = shuttle.visible = false;
      // light beads along strings
      for (let i = 0; i < NBd; i++) {
        const per = 2.5 + (i % 5) * 0.6, cyc = Math.floor(t / per + i * 0.37), u = K.fract(t / per + i * 0.37);
        const s = strAt((cyc * 97 + i * 31) % Math.max(1, n - 1));
        P1.lerpVectors(s.a, s.b, u);
        bpos.set([P1.x, P1.y, P1.z], i * 3);
        c.set(s.tone === 1 ? '#c8a050' : '#fff6e0').multiplyScalar(Math.sin(u * Math.PI) * 1.2);
        bcol.set([c.r, c.g, c.b], i * 3);
      }
      bg.attributes.position.needsUpdate = bg.attributes.color.needsUpdate = true;
      // the ruins sway in the gusts
      ruinGroups.forEach((g, k) => { g.rotation.z = Math.sin(t * 0.7 + k) * 0.004 * (1 + k); g.rotation.x = Math.sin(t * 0.5 + k * 2) * 0.003 * (1 + k); });
      // people
      const crowding = Math.min(1, n / 900);
      for (let i = 0; i < NP; i++) {
        const hm = homes[i % homes.length], hm2 = homes[(i * 7 + 3) % homes.length];
        const ph = K.pingpong(t * (0.05 - 0.025 * crowding) + i * 0.13, 1);
        P1.set(K.lerp(hm.x, hm2.x, ph) + 0.75, 0, K.lerp(hm.z, hm2.z, ph) + 0.75);
        const u = K.clamp(v * 1.8 - (i / NP) * 0.8);
        let stoop = 1 - 0.18 * crowding;
        if (u > 0) {
          pAt(u, P2);
          P2.x += Math.sin(i * 1.7) * 0.4; P2.z += Math.cos(i * 2.3) * 0.4;
          if (u < 0.08) P2.lerpVectors(P1, P2, u / 0.08);
          if (u > 0.95) { const [sx, sz] = seat[i]; P2.lerp(new THREE.Vector3(sx, TER.y, sz), (u - 0.95) / 0.05); }
          P2.y = heightAt(P2.x, P2.z);
          P1.copy(P2);
          if (u >= 1) stoop = 0.7;
        }
        const ry = Math.atan2(hm2.x - hm.x, hm2.z - hm.z);
        setP(i, P1.x, P1.y, P1.z, ry, [1, stoop, 1]);
        const carry = u > 0 && u < 1 ? 1 : 0;
        setBu(i, P1.x, P1.y + 0.25 * stoop, P1.z, ry, carry);
      }
      setP.done(); setBu.done();
      campG.scale.setScalar(Math.max(0.001, K.smoothstep(0.55, 0.85, v)));
      campG.position.set(TER.x, 0, TER.z).multiplyScalar(1 - campG.scale.x);
      flock.update(t);
    },
  };
};

export default build;
