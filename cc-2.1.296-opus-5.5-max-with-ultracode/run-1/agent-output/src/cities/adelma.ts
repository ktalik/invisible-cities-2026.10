// ADELMA - Cities & the Dead 2.
// A steep harbour town climbing out of a still dusk sea: quay and bollards, a moored
// ship, an arcaded fish market, a small vegetable market under a balcony, and one long
// stair up which hooded stevedores toil. Every tiny townsperson has a dark face-disc;
// the traveller's lantern-gaze turns each face it touches into a bone-white mask of
// someone he lost, and the faces turn to follow him, until the dead outnumber the living.
// Toggle: be recognised, every face turns to him at once along silver sight-lines.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const LOOP = 80;
const zFront = (k: number) => 2 - 3.2 * (k - 1); // front edge of terrace k (1..5)
const levelY = (k: number) => 0.7 + 1.66 * k;
const stairY = (z: number) => 0.7 + K.clamp((3.5 - z) / 15.5) * 8.3;

function groundH(x: number, z: number) {
  let h = 0.7;
  for (let k = 1; k <= 5; k++) h += 1.66 * K.smoothstep(zFront(k) + 0.22, zFront(k) - 0.22, z);
  h += 1.6 * K.smoothstep(-15, -19, z) + K.fbm2(x * 0.15, z * 0.15, 3) * 0.6 * K.smoothstep(-13, -16, z);
  const rr = Math.hypot(x, (z + 2) * 1.15) + K.noise2(x * 0.2, z * 0.2) * 0.8;
  const e = Math.min(K.smoothstep(21, 19.2, rr), K.smoothstep(6.9, 6.5, z));
  h = K.lerp(-1.6, h, e);
  if (Math.abs(x) < 1.25 && z < 3.6) h = Math.min(h, stairY(z) - 0.04);
  return h;
}

// the traveller's route through the loop: [time, x, z]
const ROUTE: [number, number, number][] = [
  [0, -6, 7.2], [4, -5.5, 5.9], [9, -4.5, 5.3], [16, -1.4, 4.6], [24, 3.2, 4.8], [28, 5.2, 2.2],
  [36, 7.4, 1.0], [44, 5.0, 1.2], [50, 1.6, 4.0], [56, 0, 3.8], [LOOP, 0, 3.8],
];
function travAt(tl: number): [number, number, number, number] {
  let i = 0;
  while (i < ROUTE.length - 2 && ROUTE[i + 1][0] < tl) i++;
  const [t0, x0, z0] = ROUTE[i], [t1, x1, z1] = ROUTE[i + 1];
  const f = K.easeInOutSine(K.clamp((tl - t0) / Math.max(0.01, t1 - t0)));
  const x = K.lerp(x0, x1, f), z = K.lerp(z0, z1, f);
  const y = z > 6.6 ? 0.95 : Math.max(0.7, groundH(x, z));
  return [x, y, z, Math.atan2(x1 - x0, z1 - z0)];
}

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const b = new K.Batch();

  // ---------------------------------------------------------------- sea, hill, quay
  root.add(K.waterDisc(160, 0, { color: '#10313b', amp: 0.07, scale: 0.45, speed: 0.1, roughness: 0.18 }));
  root.add(K.terrain({
    width: 46, depth: 46, seg: 184, height: groundH,
    color: (x, y, z, o) => {
      const n = K.fbm2(x * 0.4, z * 0.4, 3);
      o.set(K.mix('#4c4945', '#6e665c', K.clamp(0.45 + n * 0.8)));
      if (y < 0.3) o.lerp(K.col('#2a3a3a'), 0.6);
    },
    finishKind: 'stone',
  }));
  b.add(K.at(K.box(30, 2.3, 4.6), 0, -1.6, 4.3), '#7a7066', 'stone');
  b.add(K.at(K.box(30.2, 0.12, 0.5), 0, 0.62, 6.4), '#9a8e80', 'stone');
  for (const sx of [-13.6, 13.6]) b.add(K.at(K.stairs(5, 1.2, 0.14, 0.3), sx, 0, 7.9, { ry: Math.PI }), '#7a7066', 'stone');
  const bollards: THREE.Vector3[] = [];
  for (let i = 0; i < 12; i++) {
    const x = -12.1 + i * 2.2;
    b.add(K.at(K.lathe([[0.12, 0], [0.1, 0.18], [0.16, 0.26], [0.0, 0.32]], 10), x, 0.7, 6.2), '#26282a', 'metal');
    bollards.push(new THREE.Vector3(x, 0.92, 6.2));
  }

  // ---------------------------------------------------------------- the stevedores' stair and its arch
  b.add(K.at(K.stairs(55, 2, 0.151, 0.282), 0, 0.7, 3.5, { ry: Math.PI }), '#8a8074', 'stone');
  for (const sx of [-1.1, 1.1]) {
    const g = K.box(0.2, 0.5, 15.6);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + stairY(pos.getZ(i) + 3.5 - 7.8) - 0.3);
    b.add(K.at(g, sx, 0, 3.5 - 7.8), '#6e665c', 'stone');
  }
  b.add(K.at(K.archWall(3.2, 3.2, 0.6, 2, 2.4), 0, 9, -12.2), '#8e8476', 'stone');
  K.tower(b, { x: -3.6, y: levelY(5), z: -13.6, r: 0.8, h: 9, sides: 4, top: 'pyramid', color: '#8a7f72', topColor: '#5b4a40', bands: 3, bandColor: '#7a6f62', rng, lit: 0.3 });

  // ---------------------------------------------------------------- the packed town on five terraces
  const WALLS = ['#a08d78', '#8e7c6a', '#b09c84', '#7d6e60', '#9c8a76', '#b8a48a'];
  const ROOFS = ['#6a3e30', '#5a3a2e', '#7a4a36', '#4e3a32'];
  for (let k = 1; k <= 6; k++) {
    const y0 = k <= 5 ? levelY(k) : levelY(5) + 0.6;
    const zc0 = k <= 5 ? zFront(k) - 0.95 : -15.3;
    const hw = Math.sqrt(Math.max(0, 18.6 ** 2 - ((zc0 - 1 + 2) * 1.15) ** 2));
    let x = -hw;
    while (x < hw) {
      const w = rng.float(1.0, 1.8);
      const cx = x + w / 2;
      x += w + rng.float(0.5, 0.8);
      if (Math.abs(cx) < 1.9) continue;
      if (k === 1 && cx > 3.4 && cx < 12.6) continue;
      const d = rng.float(1.6, 2.1);
      K.house(b, { x: cx, y: y0, z: zc0 - d / 2, w, d, h: rng.float(2.5, 6) * (k === 6 ? 0.8 : 1), roof: rng.pick(['gable', 'gable', 'hip', 'flat'] as const), wall: K.pickJitter(WALLS, rng), roofColor: rng.pick(ROOFS), lit: 0.22, glow: 2.2, litColor: '#ffb066', rng });
    }
  }

  // ---------------------------------------------------------------- fish market loggia (west quay)
  K.arcade(b, { x: -8, y: 0.7, z: 4.55, n: 7, span: 1.43, h: 2.8, d: 0.3, color: '#9a8e80' });
  b.add(K.at(K.box(10.2, 2.8, 0.3), -8, 0.7, 2.35), '#8a7e70', 'stone');
  b.add(K.at(K.gableRoof(10.4, 2.8, 0.8), -8, 3.5, 3.45, { ry: 0 }), '#6a3e30', 'ceramic');
  const fish: [number, number, number][] = [];
  const urchins: [number, number, number][] = [];
  for (let i = 0; i < 14; i++) {
    const cx = -12.3 + (i % 7) * 1.43, cz = i < 7 ? 3.0 : 3.9;
    b.add(K.at(K.box(0.7, 0.25, 0.45), cx, 0.7, cz), '#5a4434', 'wood');
    if (i % 3 === 2) for (let j = 0; j < 9; j++) urchins.push([cx + rng.float(-0.25, 0.25), 0.99, cz + rng.float(-0.15, 0.15)]);
    else for (let j = 0; j < 16; j++) fish.push([cx + rng.float(-0.28, 0.28), 0.98 + rng.float(0, 0.04), cz + rng.float(-0.17, 0.17)]);
  }
  root.add(K.instanced(K.at(K.sphere(0.05, 6, 4), 0, 0, 0, { s: [2.4, 0.6, 0.8] }), K.M.silver('#cfd6dc'), fish.length, (i, o) => { o.position.set(...fish[i]); o.rotation.y = rng.angle(); }, { colors: false }));
  const urchinGeo = K.merge([K.sphere(0.045, 6, 5), ...Array.from({ length: 10 }, (_, j) => K.at(K.cone(0.008, 0.05, 3), 0, 0.02, 0, { rx: (j * 0.7) % 3, rz: j * 1.3 }))]);
  root.add(K.instanced(urchinGeo, K.M.matte('#2a1a2e'), urchins.length, (i, o) => { o.position.set(...urchins[i]); o.rotation.set(rng.angle(), rng.angle(), 0); }, { colors: false }));
  // the old man's cart
  b.add(K.at(K.box(0.9, 0.12, 0.5), -10.2, 0.95, 5.4), '#5a4434', 'wood');
  for (const sz of [-0.28, 0.28]) b.add(K.at(K.torus(0.2, 0.03, 5, 14), -10.2, 0.92, 5.4 + sz, { rx: Math.PI / 2 }), '#3a2a20', 'wood');
  b.add(K.at(K.cyl(0.18, 0.14, 0.2, 10), -10.2, 1.07, 5.4), '#8a6a3a', 'wood');
  // the fever victim under his blanket against the loggia's east end
  b.add(K.at(K.sphere(0.2, 8, 6), -2.6, 0.82, 3.0, { s: [1, 0.55, 1.6] }), '#5a5a3a', 'cloth');

  // ---------------------------------------------------------------- vegetable market and the balcony house (east)
  for (let i = 0; i < 4; i++) K.stall(b, { x: 5 + i * 2, y: levelY(1), z: 0.9 - (i % 2) * 0.6, w: 1.1, d: 0.7, h: 0.75, cloth: rng.pick(['#5a6a3a', '#8a5a30', '#6a4a3a']) });
  const cabb: [number, number, number][] = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 14; j++) cabb.push([5 + i * 2 + rng.float(-0.4, 0.4), levelY(1) + 0.4, 0.9 - (i % 2) * 0.6 + rng.float(-0.12, 0.12)]);
  root.add(K.instanced(K.sphere(0.07, 7, 5), K.M.matte('#6a8a4a'), cabb.length, (i, o, c) => { o.position.set(...cabb[i]); c.copy(K.jitter('#7a9a50', rng)); }));
  const BH = { x: 8.6, z: -1.9 };
  K.house(b, { x: BH.x, y: levelY(1), z: BH.z - 0.5, w: 1.3, d: 1.6, h: 5.6, roof: 'gable', wall: '#b09c84', roofColor: '#6a3e30', lit: 0.5, glow: 2.6, litColor: '#ffb066', rng });
  b.add(K.at(K.box(1.1, 0.07, 0.5), BH.x, levelY(1) + 1.4, BH.z + 0.55), '#7a6f62', 'stone');
  b.add(K.at(K.box(1.1, 0.03, 0.03), BH.x, levelY(1) + 1.75, BH.z + 0.78), '#26282a', 'metal');
  // the hanging balance
  b.add(K.at(K.cyl(0.02, 0.02, 1.1, 5), 7.2, levelY(1), 1.6), '#3a2a20', 'wood');
  b.add(K.at(K.box(0.6, 0.02, 0.02), 7.2, levelY(1) + 1.1, 1.6), '#3a2a20', 'metal');
  for (const sx of [-0.28, 0.28]) b.add(K.at(K.cyl(0.08, 0.06, 0.02, 10), 7.2 + sx, levelY(1) + 0.8, 1.6), '#9a7a40', 'bronze');

  // ---------------------------------------------------------------- the moored ship (bobbing group)
  const ship = new THREE.Group();
  const sb = new K.Batch();
  sb.add(K.at(K.lathe([[0.001, -0.55], [0.45, -0.42], [0.66, 0.0], [0.7, 0.45]], 14), 0, 0, 0, { s: [1, 1, 3.6] }), '#2a221e', 'wood');
  sb.add(K.at(K.cyl(0.66, 0.66, 0.05, 14), 0, 0.38, 0, { s: [1, 1, 3.55] }), '#6a5442', 'wood');
  for (const [mz, mh] of [[0.9, 4.5], [-1.1, 3.5]] as const) {
    sb.add(K.at(K.cyl(0.05, 0.07, mh, 6), 0, 0.4, mz), '#3a2c22', 'wood');
    for (const yy of [mh * 0.55, mh * 0.85]) sb.add(K.at(K.cyl(0.09, 0.09, 1.6 - yy * 0.12, 6), 0, 0.4 + yy, mz, { rx: Math.PI / 2, ry: Math.PI / 2 }), '#c9bca2', 'cloth');
  }
  sb.add(K.at(K.box(1.0, 0.5, 0.9), 0, 0.4, -1.9), '#3e3028', 'wood');
  ship.add(sb.build({ name: 'ship' }));
  const sternLamp = K.glowSprite('#ffb066', 1.4, 0.95);
  sternLamp.position.set(0, 1.2, -2.5);
  ship.add(sternLamp);
  ship.position.set(-6, 0, 8.4);
  ship.rotation.y = Math.PI / 2;
  root.add(ship);
  b.add(K.rope([-3.4, 0.9, 7.9], bollards[4], 0.25, 0.02), '#8a7a5a', 'cloth');

  // ---------------------------------------------------------------- the crowd and its face-discs
  const people: { x: number; y: number; z: number; ry: number; col: THREE.Color; tint: string; rec: number }[] = [];
  const addP = (x: number, z: number, y = groundH(x, z), tint = '#efe9da') =>
    people.push({ x, y, z, ry: rng.float(-0.6, 0.6), col: K.pickJitter(['#3a3430', '#4a3e34', '#2e3438', '#5a4a3a', '#3e3a40', '#6a5a48'], rng), tint, rec: 0 });
  // scripted: sailor, old urchin seller, fever victim, vendor, girl on the balcony
  addP(-3.0, 5.8); addP(-10.0, 5.0); addP(-2.6, 3.4, 0.7, '#e8d27a'); addP(7.4, 1.4); addP(BH.x, BH.z + 0.6, levelY(1) + 1.47);
  for (let i = 0; i < 230; i++) addP(rng.float(-13.5, 13.5), rng.float(4.9, 6.0));
  for (let i = 0; i < 70; i++) addP(rng.float(-12.6, -3.4), rng.float(2.7, 4.3));
  for (let i = 0; i < 90; i++) addP(rng.float(3.6, 12.4), rng.float(-0.6, 1.8));
  for (let k = 1; k <= 5; k++) {
    const hw = Math.sqrt(Math.max(0, 18 ** 2 - ((zFront(k) + 2) * 1.15) ** 2));
    for (let i = 0; i < 105; i++) {
      const x = rng.float(-hw, hw);
      if (Math.abs(x) < 1.4 || (k === 1 && x > 3.4)) { i--; continue; }
      addP(x, rng.float(zFront(k) - 0.85, zFront(k) - 0.2));
    }
  }
  const NPPL = people.length;
  // recognition times: first touch of the gaze cone, or the mind's slow stamping
  for (const p of people) {
    let rec = 12 + 34 * K.clamp((p.y - 0.7) / 8.3) + rng.float(0, 14);
    for (let tl = 0; tl < 56; tl += 0.25) {
      const [tx, , tz, hd] = travAt(tl);
      const gaze = hd + Math.sin(tl * 0.9) * 0.6;
      const dx = p.x - tx, dz = p.z - tz, d = Math.hypot(dx, dz);
      if (d < 7 && Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - gaze), Math.cos(Math.atan2(dx, dz) - gaze))) < 0.32) { rec = Math.min(rec, tl); break; }
    }
    p.rec = rec;
  }
  people[0].rec = 4.5;
  const PH = 0.25;
  const bodyMat = K.figureMaterial();
  const bodies = K.instanced(K.personGeometry(PH), bodyMat, NPPL, (i, o, c) => { c.copy(people[i].col); });
  root.add(bodies);
  const faceMat = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });
  const faces = K.instanced(K.disc(0.034, 10).rotateX(Math.PI / 2), faceMat, NPPL + 1, undefined, { castShadow: false, receiveShadow: false });
  root.add(faces);
  const setBody = K.instanceSetter(bodies), setFace = K.instanceSetter(faces);

  // the traveller: cloak, lantern, gaze cone
  const trav = new THREE.Mesh(K.personGeometry(0.3), new THREE.MeshStandardMaterial({ color: '#2a2a3a', roughness: 0.9, vertexColors: true }));
  trav.castShadow = true;
  root.add(trav);
  const lantern = K.glowSprite('#ffc070', 0.9, 1);
  root.add(lantern);
  const lampLight = new THREE.PointLight('#ffb066', 4, 6, 1.5);
  root.add(lampLight);
  const cone = K.beam([0, 0, 0], [0, 0, 7], 0.05, 2.2, '#ffe2b0', 0.35);
  const coneMat = cone.material as THREE.ShaderMaterial;
  const coneHolder = new THREE.Group();
  coneHolder.add(cone);
  root.add(coneHolder);

  // stevedores on the stair: body, sackcloth hood, demijohn or barrel
  const SN = 10;
  const stBody = K.instanced(K.personGeometry(0.27), K.figureMaterial(), SN, (_i, _o, c) => { c.set('#5a4a3a'); });
  const stHood = K.instanced(K.cone(0.06, 0.13, 6), K.M.cloth('#8a7a5a'), SN, undefined, { colors: false });
  const loadGeo = (i: number) => (i % 2 ? K.at(K.cyl(0.08, 0.08, 0.2, 10), 0, -0.1, 0, { rz: Math.PI / 2 }) : K.at(K.sphere(0.1, 8, 6), 0, 0, 0));
  const stLoadA = K.instanced(loadGeo(0), K.M.ceramic('#1f4030'), SN, undefined, { colors: false });
  const stLoadB = K.instanced(loadGeo(1), K.M.wood('#6a4a2e'), SN, undefined, { colors: false });
  root.add(stBody, stHood, stLoadA, stLoadB);
  const sB = K.instanceSetter(stBody), sH = K.instanceSetter(stHood), sLA = K.instanceSetter(stLoadA), sLB = K.instanceSetter(stLoadB);

  // the girl's basket on its string
  const basket = new THREE.Mesh(K.cyl(0.07, 0.05, 0.08, 8), K.M.wood('#8a6a3a'));
  root.add(basket);
  const stringGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const stringLine = new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: '#c8b890' }));
  stringLine.frustumCulled = false;
  root.add(stringLine);

  // sight-lines (interaction)
  const slPos = new Float32Array(NPPL * 6);
  const slGeo = new THREE.BufferGeometry();
  slGeo.setAttribute('position', new THREE.BufferAttribute(slPos, 3));
  const slMat = new THREE.LineBasicMaterial({ color: new THREE.Color(1.4, 1.45, 1.55), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const sight = new THREE.LineSegments(slGeo, slMat);
  sight.frustumCulled = false;
  root.add(sight);

  root.add(b.build({ name: 'adelma' }));
  root.add(K.cloudSea({ y: 0.35, radius: 120, color: '#8a96a0', shadow: '#2a3440', opacity: 0.35, coverage: 0.35, scale: 0.08, speed: 0.4 }));
  root.add(K.smoke({ sources: [[-6.2, 1.5, 8.4], [-11, 3.2, 1.0], [11, 4.2, -3.5]], perSource: 18, height: 3, color: '#8a9298', opacity: 0.25, size: [0.4, 1.4], life: 9, rng: rng.fork('smoke') }));
  const gulls = new K.Flock({ count: 14, center: [0, 0, 2], radius: 12, height: 11, color: '#d8d4cc', span: 0.35, speed: 0.15, rng: rng.fork('gulls') });
  root.add(gulls.mesh);

  // ---------------------------------------------------------------- animation
  const tog = new K.Toggle(0.4);
  const BONE = new THREE.Color('#efe9da').multiplyScalar(2.4), DARK = new THREE.Color('#1e1a18'), cc = new THREE.Color();
  const tmp = new THREE.Color();
  const update = (t: number, dt: number) => {
    tog.update(dt);
    const g = tog.value;
    const tl = (t + 30) % LOOP;
    const [tx, ty, tz, hd] = travAt(tl);
    const dim = 1 - K.smoothstep(70, 78, tl);
    const turned = K.smoothstep(60, 63, tl);
    trav.position.set(tx, ty, tz);
    trav.rotation.y = hd;
    const lx = tx + Math.sin(hd + 0.6) * 0.12, lz = tz + Math.cos(hd + 0.6) * 0.12;
    const lampOn = (1 - turned) * (1 - 0.85 * g) * (0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.3));
    lantern.position.set(lx, ty + 0.2, lz);
    (lantern.material as THREE.SpriteMaterial).opacity = lampOn;
    lampLight.position.set(lx, ty + 0.4, lz);
    lampLight.intensity = 4 * lampOn;
    const gaze = hd + Math.sin(tl * 0.9) * 0.6;
    coneHolder.position.set(tx, ty + 0.25, tz);
    coneHolder.rotation.y = gaze;
    cone.rotation.x = 0;
    coneMat.uniforms.uOpacity.value = 0.35 * (tl < 58 ? 1 : 0) * (1 - g);
    const headY = ty + 0.27;
    // faces
    for (let i = 0; i < NPPL; i++) {
      const p = people[i];
      let px = p.x, pz = p.z, py = p.y;
      let m = K.smoothstep(p.rec, p.rec + 0.6, tl) * dim;
      if (i === 1 && tl > p.rec + 2) { pz -= Math.min(2, (tl - p.rec - 2) * 0.5); if (tl > p.rec + 6) py = -50; } // the old man vanishes down an alley
      const look = Math.max(m, g);
      m = Math.max(m, g);
      const toT = Math.atan2(tx - px, tz - pz);
      const ry = p.ry + (Math.atan2(Math.sin(toT - p.ry), Math.cos(toT - p.ry))) * look;
      const lie = i === 2;
      if (lie) setBody(i, px, py + 0.05, pz, 1.2, 1, Math.PI / 2 - 0.2 * m);
      else setBody(i, px, py, pz, ry, 1);
      const fy = lie ? py + 0.12 : py + PH * 0.86;
      setFace(i, px + Math.sin(ry) * 0.026, fy, pz + Math.cos(ry) * 0.026, ry, 1 + m * 0.4);
      const flick = 0.85 + 0.15 * Math.sin(t * 2.3 + i * 1.7);
      tmp.set(p.tint).multiplyScalar(2.4 * flick);
      cc.copy(DARK).lerp(tmp, m);
      setFace.color(i, cc);
      slPos[i * 6] = px; slPos[i * 6 + 1] = fy; slPos[i * 6 + 2] = pz;
      slPos[i * 6 + 3] = tx; slPos[i * 6 + 4] = headY; slPos[i * 6 + 5] = tz;
    }
    // the traveller's own face whitens
    const own = Math.max(turned * dim, g);
    setFace(NPPL, tx + Math.sin(hd) * 0.03, ty + 0.26, tz + Math.cos(hd) * 0.03, hd, 1.1);
    setFace.color(NPPL, cc.copy(DARK).lerp(BONE, own));
    setBody.done();
    setFace.done();
    slGeo.attributes.position.needsUpdate = true;
    slMat.opacity = 0.07 * g;
    sight.visible = g > 0.01;
    // stevedores: climb bent, halt, then straighten one by one with hoods back
    for (let j = 0; j < SN; j++) {
      const s = K.fract(j / SN * 0.9 + Math.min(tl, 54) * 0.008 + 0.05);
      const z = 3.4 - s * 15.3;
      const y = stairY(z);
      const up = K.smoothstep(57 + j * 0.6, 58.5 + j * 0.6, tl) * dim;
      const bend = 0.55 * (1 - up);
      const x = (j % 2 ? 0.45 : -0.45);
      sB(j, x, y, z, Math.PI, 1, -bend);
      const hy = y + 0.23 * Math.cos(bend), hz = z - 0.23 * Math.sin(bend);
      sH(j, x, hy - 0.04 + up * 0.0, hz + up * 0.08, Math.PI, 1 - up * 0.6, -bend + up * 1.2);
      const ly = y + 0.2 * Math.cos(bend) + 0.08, lz = z + 0.1 + 0.1 * Math.sin(bend);
      const isA = j % 2 === 0;
      sLA(j, x, ly, lz, 0, isA ? 1 : 0);
      sLB(j, x, ly, lz, 0, isA ? 0 : 1);
    }
    sB.done(); sH.done(); sLA.done(); sLB.done();
    // basket: lowered, weighed, raised
    const bk = K.smoothstep(26, 32, tl) * (1 - K.smoothstep(38, 44, tl));
    const top = new THREE.Vector3(BH.x + 0.25, levelY(1) + 1.75, BH.z + 0.8);
    basket.position.set(top.x, K.lerp(top.y - 0.15, levelY(1) + 0.3, bk), top.z + bk * 0.2);
    stringGeo.attributes.position.setXYZ(0, top.x, top.y, top.z);
    stringGeo.attributes.position.setXYZ(1, basket.position.x, basket.position.y + 0.04, basket.position.z);
    stringGeo.attributes.position.needsUpdate = true;
    // the ship rides the swell
    ship.position.y = Math.sin(t * 0.7) * 0.05;
    ship.rotation.x = Math.sin(t * 0.55) * 0.025;
    gulls.update(t);
  };
  update(0, 0);

  return {
    root,
    env: {
      skyTop: '#1c2636',
      skyHorizon: '#b86a42',
      skyBottom: '#14262c',
      skyCurve: 0.3,
      exposure: 1.1,
      fog: '#4a5862',
      fogNear: 75,
      fogFar: 230,
      sunDir: [-0.75, 0.13, 0.55],
      sunColor: '#e89a68',
      sunIntensity: 1.6,
      sunDisc: 0,
      sunGlow: 0.9,
      hemiSky: '#8494b4',
      hemiGround: '#3a3430',
      hemiIntensity: 0.95,
      envIntensity: 0.7,
      stars: 0.35,
      clouds: 0.3,
      cloudColor: '#c08060',
      bloomStrength: 0.8,
      bloomThreshold: 0.85,
      bloomRadius: 0.45,
      vignette: 0.45,
      tiltShift: 0.35,
      shadowRadius: 22,
      saturation: 0.95,
    },
    camera: {
      position: [0, 15.5, 38],
      target: [0, 4.6, -4],
      fov: 38,
      minDistance: 8,
      maxDistance: 70,
      maxPolar: 1.42,
      autoRotate: 0.12,
      views: [
        { position: [-20, 18, 24], target: [0, 4, -3] },
        { position: [1.5, 3.2, 11], target: [4, 1.6, 1.5] },
      ],
    },
    interaction: {
      label: 'Be Recognised',
      activeLabel: 'Look away',
      hint: 'Every face in the harbour turns toward the newcomer.',
      set: (on) => tog.set(on),
      camera: { position: [0, 15, -9], target: [0, 1.2, 4.5] },
    },
    update,
  };
};

export default build;
