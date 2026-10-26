// ZOE - Cities & Signs 4.
// The city of indivisible existence: a perfectly even lattice of identical houses
// under identical pyramid roofs, a door on every side. The activities (sleep, forge,
// cook, gold, undress, reign, sell, oracle, baths, lepers) drift from house to house
// like weather, so every roof shelters everything in turn. At the rim the roofs turn
// into firs on the same lattice points, the firs into pyramidal hills, and no line
// divides the rumble of carts from the wolves. Toggle: any other city of the empire,
// made of differences, with a wall drawn against the forest.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const P = 1.9; // lattice pitch
const ACT = ['#5a64c8', '#ff8a3a', '#e0503a', '#ffd04a', '#f08aa8', '#c8304a', '#6cc46a', '#a46ae0', '#5ad0d0', '#cfe08a'];

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  // ---------------------------------------------------------------- the plain (same colour inside and outside)
  root.add(K.groundDisc(90, '#8b8273', '#8a8274'));
  const lanes = new K.Batch();
  for (let i = -12; i <= 12; i++) {
    const c = (i + 0.5) * P, L = 2 * Math.sqrt(Math.max(0, 24 * 24 - c * c));
    if (L < 1) continue;
    lanes.add(K.at(K.box(0.34, 0.01, L), c, 0, 0), '#9a907e', 'matte');
    lanes.add(K.at(K.box(L, 0.012, 0.34), 0, 0, c), '#9a907e', 'matte');
  }
  root.add(lanes.build({ castShadow: false }));

  // ---------------------------------------------------------------- lattice points: houses, firs, and both
  type Pt = { x: number; z: number; r: number; house: boolean; fir: boolean; fh: number; seed: number };
  const pts: Pt[] = [];
  for (let i = -14; i <= 14; i++) for (let j = -14; j <= 14; j++) {
    const x = i * P, z = j * P, r = Math.hypot(x, z);
    if (r > 26) continue;
    const ph = r < 13 ? 1 : K.clamp(1 - (r - 13) / 8);
    const pf = r < 12 ? 0 : K.clamp((r - 12) / 7) * 0.9;
    const house = rng.chance(ph), fir = rng.chance(pf) || (r > 12 && !house && rng.chance(0.5));
    if (!house && !fir) continue;
    pts.push({ x, z, r, house, fir, fh: rng.float(1.4, 3.0), seed: rng.float(0, 100) });
  }
  const houses = pts.filter((p) => p.house);
  const firs = pts.filter((p) => p.fir);

  // one primitive for roofs and firs: a four-sided cone
  const pyr = (r: number, h: number) => K.at(K.cone(r, h, 4), 0, 0, 0, { ry: Math.PI / 4 });
  const houseGeo = K.merge([
    K.paint(K.box(1.1, 0.85, 1.1), '#d0c4ad'),
    K.paint(K.at(K.box(1.2, 0.06, 1.2), 0, 0.82, 0), '#b9ad96'),
    K.paint(K.at(pyr(0.85, 0.8), 0, 0.88, 0), '#857668'),
  ]);
  const vc = K.std('#ffffff', { vertexColors: true, roughness: 0.9 });
  const houseMesh = K.instanced(houseGeo, vc, houses.length, (i, o, c) => {
    o.position.set(houses[i].x, 0, houses[i].z);
    c.copy(K.jitter('#ffffff', rng, 0, 0, 0.03));
  });
  const doorParts: THREE.BufferGeometry[] = [];
  for (let f = 0; f < 4; f++) doorParts.push(K.at(K.wallPlane(0.26, 0.46), 0, 0, 0.556, {}).applyMatrix4(new THREE.Matrix4().makeRotationY((f * Math.PI) / 2)));
  const doorMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const doorMesh = K.instanced(K.merge(doorParts), doorMat, houses.length, (i, o) => { o.position.set(houses[i].x, 0, houses[i].z); }, { castShadow: false, receiveShadow: false });
  const firGeo = K.merge([K.paint(K.at(K.cyl(0.06, 0.08, 0.3, 5), 0, 0, 0), '#4a3a2c'), K.paint(K.at(pyr(0.55, 1), 0, 0.2, 0), '#3f6a5c')]);
  firGeo.scale(1, 1 / 1.2, 1);
  const firMesh = K.instanced(firGeo, vc, firs.length, (i, _o, c) => { c.copy(K.jitter('#ffffff', rng, 0.02, 0.05, 0.12)); });
  root.add(houseMesh, doorMesh, firMesh);
  const setHouse = K.instanceSetter(houseMesh), setDoor = K.instanceSetter(doorMesh), setFir = K.instanceSetter(firMesh);

  // pyramidal hills beyond, at a coarser pitch, melting into fog
  const hb = new K.Batch();
  for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) {
    const x = i * P * 3 + P * 1.5, z = j * P * 3 + P * 1.5, r = Math.hypot(x, z);
    if (r < 20 || r > 42) continue;
    const h = K.lerp(3, 8, K.clamp((r - 20) / 16)) * rng.float(0.8, 1.15);
    hb.add(K.at(pyr(h * 0.75, h), x, 0, z), K.mix('#55705f', '#8d9088', K.clamp((r - 20) / 22)), 'matte');
  }
  root.add(hb.build({ name: 'hills' }));

  // ---------------------------------------------------------------- any other city (hidden until the toggle)
  const bands: THREE.Group[] = [];
  const bandB: K.Batch[] = [];
  for (let i = 0; i < 6; i++) { bandB.push(new K.Batch()); const g = new THREE.Group(); g.visible = false; bands.push(g); root.add(g); }
  const bandOf = (r: number) => Math.min(5, Math.floor(r / 2.6));
  const snapCol: string[] = [];
  const pagoda = (b: K.Batch, x: number, z: number) => {
    let y = 0;
    for (let k = 0; k < 4; k++) {
      const w = 1.0 - k * 0.18;
      b.add(K.at(K.box(w * 0.75, 0.42, w * 0.75), x, y, z), '#b8442e', 'wood');
      b.add(K.at(K.pyramid(w * 1.25, w * 1.25, 0.22), x, y + 0.42, z), '#2f3a38', 'ceramic');
      y += 0.55;
    }
    b.add(K.at(K.cone(0.05, 0.5, 6), x, y, z), '#c9a24c', 'gold');
  };
  for (const p of houses) {
    if (p.r > 13.2) continue;
    const b = bandB[bandOf(p.r)];
    const sector = Math.floor(((Math.atan2(p.z, p.x) + Math.PI) / (Math.PI * 2)) * 8) % 8;
    const { x, z } = p;
    const pick = rng.next();
    let act: number;
    if (p.r < 2.8) { snapCol[houses.indexOf(p)] = ACT[5]; continue; }
    switch (sector) {
      case 0: // high priests' temples
        if (pick < 0.35) { K.temple(b, { x, z, w: 1.3, d: 1.6, h: 1.1, color: '#efe6d6', roofColor: '#b0704e' }); act = 7; }
        else { K.house(b, { x, z, w: 1.1, d: 1.1, h: 1.0, roof: 'dome', roofH: 0.5, wall: '#e8dcc6', roofColor: '#7aa0b0', lit: 0.2, rng }); act = 8; }
        break;
      case 1: // the slum
        for (let k = 0; k < 4; k++) K.house(b, { x: x + rng.float(-0.5, 0.5), z: z + rng.float(-0.5, 0.5), ry: rng.float(-0.4, 0.4), w: rng.float(0.35, 0.55), d: rng.float(0.35, 0.5), h: rng.float(0.3, 0.55), roof: 'shed', roofH: 0.15, wall: rng.pick(['#8a7258', '#6e5a48', '#9d8a6a']), roofColor: '#5a4a3a', roofFinish: 'wood', windows: false });
        act = rng.pick([0, 2, 9]);
        break;
      case 2: // prison and barracks
        if (pick < 0.3) { K.house(b, { x, z, w: 1.6, d: 1.6, h: 1.2, roof: 'flat', wall: '#6d6a66', wallFinish: 'stone', windows: false }); b.add(K.at(K.crenelRing(0.95, 1.2, 10, 0.25, 0.2, 0.15), x, 0, z), '#6d6a66', 'stone'); act = 0; }
        else { K.house(b, { x, z, w: 1.6, d: 0.8, h: 0.8, roof: 'gable', wall: '#c9b08a', roofColor: '#8a3a2a', lit: 0.3, rng }); K.flag(b, { x: x + 0.7, z, h: 1.6, color: '#c8304a' }); act = 1; }
        break;
      case 3: // the bazaar and the tavern
        if (pick < 0.25) { K.house(b, { x, z, w: 1.2, d: 1.0, h: 1.1, roof: 'gable', wall: '#e2c79a', roofColor: '#7a3a2a', lit: 0.9, glow: 3, rng }); act = 2; }
        else { for (let k = 0; k < 3; k++) K.stall(b, { x: x + (k - 1) * 0.55, z, w: 0.5, d: 0.45, h: 0.5, cloth: rng.pick(['#c8304a', '#e0a030', '#3a6a9a', '#6a9a4a']) }); act = 6; }
        break;
      case 4: // pagodas and garrets
        if (pick < 0.4) { pagoda(b, x, z); act = 7; } else { K.house(b, { x, z, w: 0.9, d: 1.0, h: 1.6, roof: 'gable', roofH: 0.7, wall: '#d8cbb0', roofColor: '#4a4a52', lit: 0.4, rng }); act = 0; }
        break;
      case 5: // the mill and the haymows
        if (pick < 0.2) { K.tower(b, { x, z, r: 0.45, h: 1.8, top: 'cone', color: '#d9c9a8', topColor: '#6a4a32', rng }); for (let k = 0; k < 4; k++) b.add(K.at(K.box(0.08, 1.4, 0.02), 0, 0, 0, { rz: (k * Math.PI) / 2 }).translate(x, 1.9, z + 0.5), '#8a6a44', 'wood'); act = 1; }
        else { b.add(K.at(K.dome(0.45, 12, 1, 1.5), x - 0.3, 0, z), '#d8b860', 'cloth'); b.add(K.at(K.dome(0.38, 12, 1, 1.5), x + 0.4, 0, z + 0.2), '#c9a64a', 'cloth'); act = 3; }
        break;
      case 6: // theatre and gardens
        if (pick < 0.2) { b.add(K.at(new THREE.CylinderGeometry(0.9, 1.0, 0.6, 20, 1, false, 0, Math.PI), x, 0, z), '#e6dccb', 'stone'); act = 4; }
        else { K.tree(b, { x, z, kind: rng.pick(['round', 'cypress']), h: rng.float(0.9, 1.5), rng }); act = 6; }
        break;
      default: // rubbish heaps and the leprosarium
        if (pick < 0.3) { K.rock(b, { x, z, r: 0.4, color: '#6a5a44', rng, flat: 0.5 }); act = 9; }
        else { K.house(b, { x, z, w: 1.4, d: 1.0, h: 0.7, roof: 'hip', wall: '#d8dcc0', roofColor: '#8a9070', lit: 0.5, litColor: '#e0f0a0', rng }); act = 9; }
    }
    snapCol[houses.indexOf(p)] = ACT[act];
  }
  // the princes' palace at the centre
  K.domeHall(bandB[0], { x: 0, z: 0, r: 2.2, h: 1.8, color: '#efe2c4', domeColor: '#d9a940', domeFinish: 'gold' });
  for (const [mx, mz] of [[2.2, 2.2], [-2.2, 2.2], [2.2, -2.2], [-2.2, -2.2]]) K.minaret(bandB[0], { x: mx, z: mz, h: 3.4, topColor: '#d9a940', topFinish: 'gold' });
  // the wall that finally draws the line
  K.cityWall(bandB[5], { r: 13.8, h: 1.5, towers: 12, crenels: true, color: '#a89880', gates: [Math.PI / 4, (Math.PI * 5) / 4] });
  bandB.forEach((b, i) => bands[i].add(b.build({ name: 'other' + i })));
  // canals scrawled through the other city
  const canals = new THREE.Group();
  canals.visible = false;
  for (const [x, z, w, d] of [[-0.95, -6, 0.5, 9.5], [4, 0.95, 7.5, 0.5], [-6.6, 4.7, 0.5, 6], [6.6, -6.6, 4, 0.5]]) canals.add(K.waterRect(w, d, x, 0.03, z, 0, { color: '#4a6a70' }));
  root.add(canals);

  // ---------------------------------------------------------------- carts with lanterns, wolves' eyes
  const NC = 26, NW = 12;
  const carts = Array.from({ length: NC }, () => ({ axis: rng.chance(0.5), c: (rng.int(-10, 9) + 0.5) * P, u0: rng.float(-24, 24), v: rng.float(0.35, 0.6) * rng.sign() }));
  const cartGeo = K.merge([K.paint(K.box(0.3, 0.18, 0.5), '#5a4a38'), K.paint(K.at(K.cyl(0.1, 0.1, 0.36, 8), 0, 0.1, -0.1, { rz: Math.PI / 2 }), '#3a3028')]);
  cartGeo.translate(0, 0.05, 0);
  const cartMesh = K.instanced(cartGeo, vc, NC);
  root.add(cartMesh);
  const setCart = K.instanceSetter(cartMesh);
  const wolves = Array.from({ length: NW }, (_, i) => ({ a: rng.angle(), r: rng.float(13, 22), w: rng.float(0.02, 0.05) * (i % 2 ? 1 : -1), ph: rng.float(0, 10) }));
  const wolfMesh = K.instanced(K.quadruped({ len: 0.3, h: 0.17, color: '#4a4844', tail: 0.12, ears: true }), vc, 5);
  root.add(wolfMesh);
  const setWolf = K.instanceSetter(wolfMesh);
  const nPts = NC + NW * 2;
  const ptsPos = new Float32Array(nPts * 3), ptsCol = new Float32Array(nPts * 3);
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.BufferAttribute(ptsPos, 3));
  glowGeo.setAttribute('color', new THREE.BufferAttribute(ptsCol, 3));
  const glow = new THREE.Points(glowGeo, new THREE.PointsMaterial({ size: 0.9, map: K.glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.frustumCulled = false;
  root.add(glow);

  // smoke from a few roofs (someone is always cooking somewhere), mist on the plain
  root.add(K.smoke({ sources: rng.shuffle(houses.filter((h) => h.r < 12).slice()).slice(0, 10).map((h) => [h.x, 1.7, h.z] as [number, number, number]), perSource: 12, height: 2.5, color: '#d8d2c6', opacity: 0.16, size: [0.15, 0.55], life: 7, wind: [0.3, 0.1], rng: rng.fork('smoke') }));
  root.add(K.particles({ count: 160, radius: 26, y0: 0.3, y1: 2.5, color: '#d9d2c4', size: 3.5, opacity: 0.07, velocity: [0.25, 0, 0.08], swirl: 1, rng: rng.fork('mist') }));
  root.add(K.particles({ count: 80, radius: 14, y0: 0.5, y1: 4, color: '#ffc070', size: 0.05, opacity: 0.6, swirl: 0.4, twinkle: 1, rng: rng.fork('sparks') }));

  const tog = new K.Toggle(0.35);
  const tmp = new THREE.Color(), ta = new THREE.Color(), tb = new THREE.Color(), AMB = new THREE.Color('#f0b25e');
  const hIdx = new Map(houses.map((h, i) => [h, i] as const));

  return {
    root,
    env: {
      skyTop: '#4a526b', skyHorizon: '#c9bba7', skyBottom: '#8a8274', skyCurve: 0.55,
      fog: '#aba496', fogNear: 34, fogFar: 82,
      sunDir: [0.7, 0.75, -0.25], sunColor: '#efe2cf', sunIntensity: 1.3, sunDisc: 0, sunGlow: 0.3,
      hemiSky: '#c4c0bc', hemiGround: '#7a7062', hemiIntensity: 1.1, envIntensity: 0.8,
      stars: 0, clouds: 0.85, cloudColor: '#d8d0c4',
      bloomStrength: 0.6, bloomThreshold: 0.85, bloomRadius: 0.5,
      tiltShift: 0.35, shadowRadius: 26, vignette: 0.4, saturation: 0.95,
    },
    camera: {
      position: [25, 27, 25],
      target: [0, 0, 0],
      minDistance: 8, maxDistance: 80, autoRotate: 0.2,
      views: [
        { position: [6.5, 1.5, 3.2], target: [-2, 0.9, -5] },
        { position: [-27, 10, -6], target: [-15, 1, 0] },
      ],
    },
    interaction: {
      label: 'Any other city',
      activeLabel: 'Return to Zoe',
      hint: 'The city of differences the traveller expected: palace, prison, slum, temple, wall.',
      set: (on) => tog.set(on),
    },
    update(t, dt) {
      tog.update(dt);
      const k = tog.value;
      // houses melt into the other city in a wave from the centre; at the rim they breathe into firs
      for (let i = 0; i < houses.length; i++) {
        const h = houses[i];
        const inner = h.r < 13.9;
        const wave = inner ? K.smoothstep((h.r / 14) * 0.5, (h.r / 14) * 0.5 + 0.4, k) : k;
        const breathe = h.fir ? K.smoothstep(0.25, 0.75, 0.5 + 0.5 * Math.sin(t * 0.09 + h.seed)) : 0;
        const s = Math.max(0.001, (1 - breathe) * (1 - wave));
        setHouse(i, h.x, 0, h.z, 0, [1, s, 1]);
        setDoor(i, h.x, 0, h.z, 0, [1, s, 1]);
        // the activity drift: a travelling field of functions, crossfading
        const v = (K.noise3(h.x * 0.09, h.z * 0.09, t * 0.05) * 0.5 + 0.5) * 10 + t * 0.12 + h.r * 0.05;
        const a = Math.floor(v), f = K.smoothstep(0.7, 1, v - a);
        ta.set(ACT[((a % 10) + 10) % 10]); tb.set(ACT[(((a + 1) % 10) + 10) % 10]);
        tmp.copy(ta).lerp(tb, f).lerp(AMB, 0.35);
        if (snapCol[i]) tmp.lerp(ta.set(snapCol[i]), k);
        tmp.multiplyScalar(1.6 + 0.25 * Math.sin(t * 2 + h.seed));
        doorMesh.setColorAt(i, tmp);
      }
      for (let i = 0; i < firs.length; i++) {
        const p = firs[i];
        const hi = p.house ? hIdx.get(p) : undefined;
        let m = 1;
        if (hi !== undefined) m = K.smoothstep(0.25, 0.75, 0.5 + 0.5 * Math.sin(t * 0.09 + p.seed));
        if (p.r > 13.9) m = Math.max(m, k);
        const s = Math.max(0.001, m);
        setFir(i, p.x, 0, p.z, 0, [s * (0.9 + p.fh * 0.2), s * p.fh, s * (0.9 + p.fh * 0.2)]);
      }
      setHouse.done(); setDoor.done(); setFir.done();
      bands.forEach((g, i) => {
        const s = K.smoothstep(i * 0.09, i * 0.09 + 0.45, k);
        g.visible = s > 0.002;
        g.scale.set(1, Math.max(0.001, s), 1);
      });
      canals.visible = k > 0.3;
      // carts roll in and out across the non-border; wolves' eyes drift among roofs and trunks
      for (let i = 0; i < NC; i++) {
        const c = carts[i];
        const u = (((c.u0 + c.v * t + 24) % 48) + 48) % 48 - 24;
        const x = c.axis ? u : c.c, z = c.axis ? c.c : u;
        const ry = c.axis ? (c.v > 0 ? Math.PI / 2 : -Math.PI / 2) : c.v > 0 ? 0 : Math.PI;
        const fade = 1 - K.smoothstep(21, 24, Math.abs(u));
        setCart(i, x, 0, z, ry, fade);
        ptsPos.set([x + Math.sin(ry) * 0.3, 0.4, z + Math.cos(ry) * 0.3], i * 3);
        ptsCol.set([1.0 * fade, 0.7 * fade, 0.35 * fade], i * 3);
      }
      setCart.done();
      for (let i = 0; i < NW; i++) {
        const w = wolves[i];
        const a = w.a + t * w.w, r = w.r - (1 - k) * 1.5 * (0.5 + 0.5 * Math.sin(t * 0.07 + w.ph)) + k * 2;
        const x = Math.cos(a) * r, z = Math.sin(a) * r, ry = -a + (w.w > 0 ? 0 : Math.PI);
        const blink = Math.sin(t * 0.8 + w.ph) > -0.85 ? 1 : 0;
        for (let e = 0; e < 2; e++) {
          const ex = x + Math.cos(ry) * (e ? 0.05 : -0.05) + Math.sin(ry) * 0.18, ez = z - Math.sin(ry) * (e ? 0.05 : -0.05) + Math.cos(ry) * 0.18;
          ptsPos.set([ex, 0.2, ez], (NC + i * 2 + e) * 3);
          ptsCol.set([0.55 * blink, 0.75 * blink, 0.3 * blink], (NC + i * 2 + e) * 3);
        }
        if (i < 5) setWolf(i, x, 0, z, ry);
      }
      setWolf.done();
      glowGeo.attributes.position.needsUpdate = true;
      glowGeo.attributes.color.needsUpdate = true;
    },
  };
};

export default build;
