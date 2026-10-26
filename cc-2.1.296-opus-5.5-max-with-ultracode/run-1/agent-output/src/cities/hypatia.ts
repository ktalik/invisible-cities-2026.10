// HYPATIA - Cities & Signs 5.
// A radiant morning city whose things, not words, have changed meaning. Gilt sign-glyphs
// hover where a traveller's habits put them: a bather over the lagoons (where drowned
// suicides lie among crabs), scales over the sultan's domes (a barred hall, a quarry of
// chained convicts), a book over the library (shelves collapsing, opium smoke), a ship
// over the empty harbour. Toggle: unlearn the signs. They fly to the riding rings, the
// children's garden with the philosopher, the singing tombs, and the citadel's highest
// pinnacle, where a ship may, or may not, pass through the sky.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';
import { glyphBather, glyphBook, glyphLyre, glyphScales, glyphShip, fountainJets } from './_hypatia';

const PORPHYRY = '#7a3247';
const WHITE = '#f3e9df';
const TEAL = '#2e7f99';

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const isl = K.island({ radius: 22, flat: 19.5, depth: 10, top: '#d6c6a8', edge: '#c9b693', cliff: '#b9a582', under: '#5a4e48', strata: '#cbb48c', seed: 9, hills: 0.2 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -7, color: '#f6e2d2', shadow: '#9aa4b8', opacity: 0.8, coverage: 0.55 }));
  const b = new K.Batch();

  // ---------------------------------------------------------------- lagoons (raised basins), magnolias, hedges
  const lagoons: [number, number, number, number][] = [[-3, 11, 4.5, 2.5], [4.3, 12.2, 2.5, 2]];
  const inLagoon = (x: number, z: number, m = 0) => lagoons.some(([cx, cz, rx, rz]) => ((x - cx) / (rx + m)) ** 2 + ((z - cz) / (rz + m)) ** 2 < 1);
  const waterMat = new THREE.ShaderMaterial({
    uniforms: { uTime: K.U.time, uTop: { value: new THREE.Color('#9fbdd8') }, uHor: { value: new THREE.Color('#f6e2d0') }, uDeep: { value: new THREE.Color('#1d5a6e') }, uPink: { value: new THREE.Color('#f1c9cf') } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uTop, uHor, uDeep, uPink; varying vec3 vW;
      ${K.GLSL_NOISE}
      void main(){
        vec3 V = normalize(cameraPosition - vW);
        vec2 p = vW.xz * 1.3; float t = uTime * 0.25, e = 0.05;
        float h0 = snoise(vec3(p, t)), hx = snoise(vec3(p + vec2(e, 0.0), t)), hz = snoise(vec3(p + vec2(0.0, e), t));
        vec3 N = normalize(vec3(-(hx - h0) * 0.5, 1.0, -(hz - h0) * 0.5));
        float c = clamp(dot(N, V), 0.0, 1.0);
        float fres = 0.03 + 0.97 * pow(1.0 - c, 3.0);
        vec3 R = reflect(-V, N);
        vec3 sky = mix(uHor, uTop, pow(clamp(R.y, 0.0, 1.0), 0.6));
        sky = mix(sky, uPink, 0.35 * smoothstep(0.1, 0.6, snoise(vec3(vW.xz * 0.4, 1.0))) * (1.0 - R.y));
        vec3 col = mix(uDeep, sky, fres);
        gl_FragColor = vec4(col, mix(0.28, 0.97, fres));
      }`,
    transparent: true, depthWrite: false,
  });
  for (const [cx, cz, rx, rz] of lagoons) {
    b.add(K.at(K.disc(1, 40), cx, 0.02, cz, { s: [rx, 1, rz] }), '#6f8f86', 'stone');
    b.add(K.at(K.cyl(1, 1, 0.55, 48, true), cx, 0, cz, { s: [rx, 1, rz] }), '#d9cdb7', 'stone');
    b.add(K.at(K.torus(1, 0.03, 4, 64), cx, 0.56, cz, { rx: Math.PI / 2, s: [rx + 0.06, 1, rz + 0.06] }).scale(1, 1, 1), WHITE, 'stone');
    const w = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2).scale(rx, 1, rz), waterMat);
    w.position.set(cx, 0.45, cz);
    w.renderOrder = 2;
    root.add(w);
  }
  b.add(K.at(K.box(1.4, 0.5, 1.2), 1.2, 0, 11.8), '#d9cdb7', 'stone');
  // what lies at the bottom: tethered figures with green hair, stones, crabs
  const drowned = K.instanced(K.personGeometry(0.42), K.figureMaterial(), 9, (i, o, c) => {
    const [cx, cz, rx, rz] = lagoons[i < 6 ? 0 : 1];
    const a = rng.angle(), d = rng.float(0, 0.6);
    o.position.set(cx + Math.cos(a) * rx * d, 0.1, cz + Math.sin(a) * rz * d);
    o.rotation.set(Math.PI / 2, rng.angle(), 0, 'YXZ');
    c.set('#c9d0c4');
    b.add(K.at(K.sphere(0.1, 8, 6), o.position.x + rng.float(-0.4, 0.4), 0.05, o.position.z + rng.float(-0.4, 0.4)), '#4a4a48', 'stone');
    b.add(K.at(K.sphere(0.09, 8, 6), 0, 0, 0, { s: [1, 0.5, 1.4] }).translate(o.position.x, 0.12, o.position.z), '#3f7a3a', 'cloth');
    for (let k = 0; k < 2; k++) b.add(K.at(K.sphere(0.05, 6, 4), o.position.x + rng.float(-0.3, 0.3), 0.04, o.position.z + rng.float(-0.3, 0.3), { s: [1.3, 0.5, 1] }), '#a8432f', 'ceramic');
  }, { castShadow: false });
  root.add(drowned);
  const mags: [number, number][] = [];
  for (let tries = 0; mags.length < 20 && tries < 400; tries++) {
    const x = rng.float(-10, 9.5), z = rng.float(7.5, 16.5);
    if (inLagoon(x, z, 0.9) || (Math.abs(x) < 2.4 && z < 9.5) || Math.hypot(x, z) > 18.5 || mags.some(([mx, mz]) => Math.hypot(mx - x, mz - z) < 1.5)) continue;
    mags.push([x, z]);
    K.tree(b, { x, z, kind: 'round', h: rng.float(1.2, 1.8), color: K.pickJitter(['#f3dfe2', '#f6e9e4', '#e8bfc8'], rng), trunkColor: '#5a4636', rng });
  }
  for (let i = 0; i < 14; i++) {
    const x = rng.float(-11, 10), z = rng.float(7, 17);
    if (inLagoon(x, z, 0.6) || Math.abs(x) < 2.4 || Math.hypot(x, z) > 18.5) continue;
    const along = rng.chance(0.5);
    b.add(K.at(K.box(along ? 2 : 0.4, 0.5, along ? 0.4 : 2), x, 0, z), K.jitter('#4f6e44', rng), 'matte');
  }

  // ---------------------------------------------------------------- the sultan's palace: porphyry stair, six courtyards, barred hall
  b.add(K.at(K.box(6.4, 1, 18.6), 0, 0, -3.5), '#e8dccb', 'stone');
  for (let s = 0; s < 10; s++) b.add(K.at(K.box(3, 0.1 * (s + 1), 0.2), 0, 0, 7.8 - s * 0.2), PORPHYRY, 'polished');
  const nozzles: THREE.Vector3[] = [];
  const tiles = ['#2e7f99', '#f3e9df', '#d9a940', '#1f5a72', '#c8604a', '#e8d2a8'];
  for (let c = 0; c < 6; c++) {
    const z = 4.7 - c * 2.2;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) b.add(K.at(K.box(0.48, 0.02, 0.48), -0.75 + i * 0.5, 1, z - 0.75 + j * 0.5), (i + j) % 2 ? tiles[c] : WHITE, 'ceramic');
    for (const sx of [-1, 1]) b.add(K.at(K.box(0.2, 0.9, 2.2), sx * 1.6, 1, z), WHITE, 'plaster');
    b.add(K.at(K.archWall(3.4, 1.2, 0.2, 0.9, 0.9), 0, 1, z + 1.1), c % 2 ? WHITE : '#efe0cc', 'plaster');
    for (const sx of [-1, 1]) b.add(K.at(K.box(1.6, 0.6, 2.2), sx * 2.5, 1, z), K.jitter('#ece2d2', rng), 'plaster'), b.add(K.at(K.dome(0.45, 14), sx * 2.5, 1.6, z), WHITE, 'plaster');
    K.fountain(b, { x: 0, y: 1.02, z, r: 0.42, color: '#e9e0d0' });
    nozzles.push(new THREE.Vector3(0, 1.32, z));
  }
  root.add(fountainJets(nozzles, 40, rng.fork('jets'), { color: '#eaf6ff', h: 0.32, spread: 0.18 }));
  K.domeHall(b, { x: 0, y: 1, z: -9.9, r: 2.0, h: 2.6, color: WHITE, domeColor: '#eef0f2', domeFinish: 'polished' });
  for (const [dx, dz] of [[-2, -1.6], [2, -1.6], [-2, 1.8], [2, 1.8]]) {
    b.add(K.at(K.box(1.2, 1.8, 1.2), dx, 1, -9.9 + dz), WHITE, 'plaster');
    b.add(K.at(K.dome(0.6, 16, 1, 1.2), dx, 2.8, -9.9 + dz), '#e9eef0', 'polished');
  }
  for (let i = 0; i < 9; i++) b.add(K.at(K.box(0.04, 1.6, 0.04), -0.8 + i * 0.2, 1, -7.85), '#2a2a2e', 'metal');
  for (const y of [1.4, 2.0, 2.5]) b.add(K.at(K.box(1.8, 0.05, 0.05), 0, y, -7.85), '#2a2a2e', 'metal');
  // the quarry opening behind the hall
  for (const [x, z, w, d] of [[0, -12.8, 6.4, 0.8], [0, -17, 6.4, 0.8], [-2.7, -14.9, 1, 3.4], [2.7, -14.9, 1, 3.4]]) b.add(K.at(K.box(w, 1.6, d), x, 0, z), '#d9cbb3', 'stone');
  b.add(K.at(K.box(4.4, 0.04, 3.4), 0, 0, -14.9), '#2c2a2c', 'stone');
  b.add(K.at(K.box(0.9, 0.12, 4.4), 1.65, 0.8, -14.9, { rx: 0.37 }), '#3a3638', 'stone');
  for (let i = 0; i < 14; i++) b.add(K.at(K.box(rng.float(0.3, 0.5), 0.3, rng.float(0.3, 0.5)), rng.float(-1.8, 0.6), 0.04, rng.float(-16.4, -13.4), { ry: rng.angle() }), '#232226', 'stone');
  for (const sx of [-1, 1]) b.add(K.at(K.box(0.1, 2.8, 0.1), -1 + sx * 0.7, 0, -12.6), '#5a4636', 'wood');
  b.add(K.at(K.box(1.6, 0.1, 0.1), -1, 2.8, -12.6), '#5a4636', 'wood');
  const convicts = K.instanced(K.merge([K.personGeometry(0.26), K.paint(K.at(K.torus(0.07, 0.012, 4, 10), 0, 0.02, 0, { rx: Math.PI / 2 }), '#111111')]), K.figureMaterial(), 12, (_i, _o, c) => { c.set('#8a7a66'); });
  const blocksHauled = K.instanced(K.box(0.3, 0.22, 0.3), K.std('#222125'), 12);
  root.add(convicts, blocksHauled);
  const setCon = K.instanceSetter(convicts), setBlk = K.instanceSetter(blocksHauled);

  // ---------------------------------------------------------------- the great library (cut away) and the children's garden
  const LX = -11, LZ = -4;
  b.add(K.at(K.box(8.2, 0.2, 5.2), LX, 0, LZ), '#cbbfa8', 'stone');
  b.add(K.at(K.box(8, 5.5, 0.3), LX, 0, LZ - 2.5), '#e9dcc4', 'stone');
  for (const sx of [-1, 1]) b.add(K.at(K.box(0.3, 5.5, 5), LX + sx * 4, 0, LZ), '#e9dcc4', 'stone');
  b.add(K.at(K.box(8, 0.9, 0.3), LX, 0, LZ + 2.5), '#e9dcc4', 'stone');
  b.add(K.at(K.box(8.4, 0.3, 2.4), LX, 5.5, LZ - 1.4), '#bfa98a', 'stone');
  for (const [y, x0, x1] of [[1.8, -3.8, 0.5], [3.6, -1, 3.8]]) b.add(K.at(K.box(x1 - x0, 0.15, 4.6), LX + (x0 + x1) / 2, y, LZ), '#a88a64', 'wood');
  for (let fl = 0; fl < 3; fl++) for (let i = 0; i < 6; i++) {
    const x = LX - 3.4 + i * 1.3, y = fl * 1.8 + 0.2;
    if ((fl === 1 && x > LX + 0.5) || (fl === 2 && x < LX - 1)) continue;
    const tilt = rng.chance(0.25) ? rng.float(-0.25, 0.25) : 0;
    b.add(K.at(K.box(1.1, 1.5, 0.35), x, y, LZ - 2.15, { rz: tilt }), '#5a3a26', 'wood');
    for (const row of [0.08, 0.75]) for (let q = 0; q < 8; q++) {
      const lean = rng.chance(0.15) ? rng.float(-0.4, 0.4) : 0;
      b.add(K.at(K.box(0.1, rng.float(0.4, 0.58), 0.28), -0.42 + q * 0.12, row, 0, { rz: lean }).applyMatrix4(new THREE.Matrix4().makeRotationZ(tilt)).translate(x, y, LZ - 2.1), K.shade(rng.pick(tiles), 0.7), 'cloth');
    }
  }
  for (let s = 0; s < 9; s++) b.add(K.at(K.box(0.7, 0.1, 0.25), LX + 1.2 + s * 0.2, s * 0.2, LZ + 1.2 - s * 0.25), '#8a6a48', 'wood');
  b.add(K.at(K.box(3.4, 0.1, 0.5), LX - 0.5, 2.7, LZ + 0.6), '#8a6a48', 'wood');
  b.add(K.at(K.box(0.5, 0.1, 3), LX + 2, 4.6, LZ - 0.6), '#8a6a48', 'wood');
  b.add(K.at(K.wallPlane(0.4, 0.5), LX - 4.16, 4.6, LZ - 1.5, { ry: -Math.PI / 2 }), '#ffc070', 'glow', 2);
  root.add(K.smoke({ sources: [[LX - 4.3, 4.9, LZ - 1.5]], perSource: 30, height: 3.5, color: '#d8d4dc', opacity: 0.35, size: [0.2, 1.1], life: 8, wind: [-0.3, 0.05], rng: rng.fork('opium') }));
  const GX = -11, GZ = 2.3;
  b.add(K.at(K.box(4, 0.04, 4), GX, 0, GZ), '#7fa05a', 'matte');
  for (let i = 0; i < 9; i++) b.add(K.at(K.cyl(0.04, 0.05, 0.22, 8), GX + 0.8 + (i % 3) * 0.2, 0.04, GZ - 1 + Math.floor(i / 3) * 0.2), '#f5efe2', 'ceramic');
  for (const sx of [-1, 1]) for (const sz of [-0.4, 0.4]) b.add(K.strut([GX - 1 + sx * 0.6, 0, GZ + sz], [GX - 1 + sx * 0.6, 1.4, GZ], 0.04, 5), '#6a4a32', 'wood');
  b.add(K.strut([GX - 1.6, 1.4, GZ], [GX - 0.4, 1.4, GZ], 0.04, 5), '#6a4a32', 'wood');
  const swing = new THREE.Group();
  const sb = new K.Batch();
  for (const sx of [-0.2, 0.2]) sb.add(K.strut([sx, 0, 0], [sx, -1.1, 0], 0.01, 4), '#d8c8a8', 'cloth');
  sb.add(K.at(K.box(0.5, 0.04, 0.2), 0, -1.12, 0), '#a8432f', 'wood');
  swing.add(sb.build());
  swing.position.set(GX - 1, 1.4, GZ);
  root.add(swing);
  const top = new THREE.Group();
  const tb = new K.Batch();
  tb.add(K.at(K.cone(0.12, 0.2, 12), 0, 0, 0, { rx: Math.PI }).translate(0, 0.2, 0), '#c8304a', 'ceramic');
  tb.add(K.at(K.cyl(0.13, 0.13, 0.04, 12), 0, 0.2, 0), '#d9a940', 'ceramic');
  top.add(tb.build());
  top.position.set(GX + 0.6, 0.04, GZ + 1.1);
  root.add(top);
  const sage = K.crowd({ count: 1, place: () => [GX + 1.2, 0.04, GZ + 0.2], colors: ['#ece6da'], h: 0.2 });
  root.add(sage);

  // ---------------------------------------------------------------- stables and riding rings
  b.add(K.at(K.box(2, 1.2, 6), 15, 0, -2.5), '#e6d6bc', 'plaster');
  b.add(K.at(K.gableRoof(6.2, 2.3, 0.7), 15, 1.2, -2.5, { ry: Math.PI / 2 }), '#a85a3a', 'ceramic');
  for (let i = 0; i < 5; i++) b.add(K.at(K.wallPlane(0.5, 0.7), 13.99, 0, -4.8 + i * 1.15, { ry: -Math.PI / 2 }), '#3a2a22', 'matte');
  const rings: [number, number, number][] = [[9.6, 3.6, 2.2], [14.4, 4.6, 1.8]];
  for (const [x, z, r] of rings) {
    b.add(K.at(K.disc(r, 40), x, 0.02, z), '#e2c9a0', 'matte');
    b.add(K.at(K.torus(r, 0.03, 4, 48), x, 0.35, z, { rx: Math.PI / 2 }), '#f3e9df', 'wood');
    for (let i = 0; i < 16; i++) b.add(K.at(K.box(0.05, 0.4, 0.05), x + Math.cos((i / 16) * 6.283) * r, 0, z + Math.sin((i / 16) * 6.283) * r), '#f3e9df', 'wood');
  }
  for (const [x, z, c] of [[12, 0.5, '#d8b860'], [12.6, 1, '#e8d8b0'], [16.5, 6.8, '#d8b860'], [11.6, 6.4, '#e8d8b0']] as const) b.add(K.at(K.dome(0.45, 12, 1, 0.8), x, 0, z), c, 'cloth');
  const horseGeo = K.merge([K.quadruped({ len: 0.5, h: 0.36, color: '#ffffff', tail: 0.18, ears: true }), K.paint(K.at(K.personGeometry(0.24), 0, 0.3, -0.02), '#f0dccc')]);
  const horses = K.instanced(horseGeo, K.figureMaterial(), 8, (i, _o, c) => { c.set(['#6a4632', '#e8e0d4', '#2e2622', '#a87a52'][i % 4]); });
  root.add(horses);
  const setHorse = K.instanceSetter(horses);

  // ---------------------------------------------------------------- the cemetery terrace where music hides
  const CX = 12.5, CZ = -10;
  b.add(K.at(K.box(8, 0.6, 6), CX, 0, CZ), '#d2c3a4', 'stone');
  const tombs: THREE.Vector3[] = [];
  for (let i = 0; i < 36; i++) {
    const x = CX - 3.4 + (i % 9) * 0.85, z = CZ - 2.2 + Math.floor(i / 9) * 1.2 + rng.float(-0.1, 0.1);
    b.add(K.at(K.box(0.35, rng.float(0.35, 0.55), 0.14), x, 0.6, z), K.jitter('#ebe4d8', rng), 'stone');
    tombs.push(new THREE.Vector3(x, 1.1, z));
  }
  for (const [x, z] of [[CX - 4.6, CZ - 2], [CX - 4.6, CZ + 2], [CX + 4.6, CZ - 2], [CX + 4.6, CZ + 2]]) {
    b.add(K.at(K.box(1.0, 1.1, 1.0), x, 0, z), '#e8dfd0', 'stone');
    b.add(K.at(K.dome(0.5, 14), x, 1.1, z), '#8aa0a4', 'bronze');
  }
  K.forest(b, { n: 8, r0: 0, r1: 3.6, cx: CX, cz: CZ - 3.6, rng, kinds: ['cypress'], h: [1.6, 2.6] });
  const NM = 18;
  const motes = Array.from({ length: NM }, (_, i) => ({ a: rng.int(0, 35), b: rng.int(0, 35), flute: i % 2 === 0, ph: rng.float(0, 10) }));
  const mPos = new Float32Array(NM * 3), mCol = new Float32Array(NM * 3);
  const mGeo = new THREE.BufferGeometry();
  mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
  mGeo.setAttribute('color', new THREE.BufferAttribute(mCol, 3));
  const music = new THREE.Points(mGeo, new THREE.PointsMaterial({ size: 0.55, map: K.glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  music.frustumCulled = false;
  root.add(music);

  // ---------------------------------------------------------------- empty harbour quay, citadel crag with the highest pinnacle
  b.add(K.at(K.box(7, 0.5, 2), -21, -0.4, 6), '#d9cdb7', 'stone');
  for (let i = 0; i < 4; i++) b.add(K.at(K.cyl(0.1, 0.12, 0.35, 8), -19 - i * 1.6, 0.1, 6.8), '#3a3638', 'metal');
  const QX = 6.5, QZ = -16.5;
  b.add(K.wobble(K.cyl(1.5, 2.7, 10.5, 14, false), 0.35, 0.7, 3).translate(QX, 0, QZ), '#cdbb9a', 'stone');
  K.cityWall(b, { x: QX, y: 10.4, z: QZ, r: 1.9, h: 0.8, thick: 0.25, crenels: true, towers: 4, color: '#e6d9c2', seg: 24 });
  K.tower(b, { x: QX, y: 10.4, z: QZ, r: 0.6, h: 2.6, top: 'none', color: '#efe4d2', rng });
  b.add(K.at(K.cone(0.28, 4.2, 8), QX, 13, QZ), '#e9e2d4', 'stone');
  b.add(K.at(K.sphere(0.12, 8, 6), QX, 17.1, QZ), '#d9a940', 'gold');
  for (const [x, z, h] of [[QX - 3, QZ + 1, 3], [QX + 2.6, QZ + 2, 2.2], [QX - 1.5, QZ - 2.5, 4]]) K.rock(b, { x, z, r: h * 0.6, color: '#c4b190', rng });
  // white houses filling the city
  for (let i = 0; i < 60; i++) {
    const [x, z] = rng.inDisc(18);
    if (Math.abs(x) < 3.8 && z < 9 && z > -18) continue;
    if (inLagoon(x, z, 1.4) || mags.some(([mx, mz]) => Math.hypot(mx - x, mz - z) < 0.9)) continue;
    if (Math.abs(x - LX) < 5 && z < 5 && z > -7) continue;
    if (Math.hypot(x - 12, z - 2) < 6.5 || Math.hypot(x - CX, z - CZ) < 5.5 || Math.hypot(x - QX, z - QZ) < 4.2) continue;
    K.house(b, { x, z, ry: rng.pick([0, Math.PI / 2]), w: rng.float(0.9, 1.5), d: rng.float(0.9, 1.4), h: rng.float(0.9, 1.8), roof: rng.pick(['flat', 'dome', 'flat'] as const), wall: K.pickJitter([WHITE, '#efe4d6', '#e9dccb'], rng), roofColor: rng.pick([WHITE, TEAL]), roofFinish: 'ceramic', rng });
  }
  root.add(b.build({ name: 'hypatia' }));

  // ---------------------------------------------------------------- the gilt sign-glyphs
  const goldMat = new THREE.MeshStandardMaterial({ color: '#e8b85a', metalness: 0.85, roughness: 0.3, emissive: '#f4c468', emissiveIntensity: 0.55 });
  const inkMat = new THREE.MeshStandardMaterial({ color: '#7a3247', roughness: 0.5, emissive: '#3a1020', emissiveIntensity: 0.3 });
  const sc = glyphScales();
  const defs = [glyphBather(), { gold: K.merge([sc.post, sc.beam, sc.pan]) }, glyphBook(), glyphShip(), glyphLyre()];
  const glyphs = defs.map((g) => {
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(g.gold, goldMat));
    if ('ink' in g && g.ink) grp.add(new THREE.Mesh(g.ink, inkMat));
    const halo = K.glowSprite('#ffd890', 3.2, 0.35);
    grp.add(halo);
    grp.scale.setScalar(1.5);
    root.add(grp);
    return grp;
  });
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const homes = [V(-2, 4.5, 10.5), V(0, 11.8, -9.9), V(LX, 8.4, LZ), V(-20, 4.2, 6), V(CX, 1.4, CZ)];
  const truths = [V(11.8, 4.2, 3.8), V(0, 11.8, -9.9), V(GX + 0.6, 3.6, GZ + 0.4), V(QX, 19.4, QZ), V(CX, 4.4, CZ)];
  const skyShipMat = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0, roughness: 0.8, side: THREE.DoubleSide, depthWrite: false });
  const skyShip = new THREE.Mesh(K.sailboatGeometry(1.4, '#6e5a48', '#fffaf0'), skyShipMat);
  skyShip.scale.setScalar(2.2);
  root.add(skyShip);

  root.add(K.particles({ count: 140, center: [0, 0, 11], radius: 9, y0: 0.5, y1: 4, color: '#f6dde2', colors: ['#fff4f0'], size: 0.08, opacity: 0.8, velocity: [0.15, -0.12, 0.05], swirl: 0.5, rng: rng.fork('petals') }));
  root.add(K.particles({ count: 60, center: [0, 0, 11], radius: 7, y0: 0.4, y1: 1.6, color: '#ffffff', size: 2.2, opacity: 0.05, velocity: [0.1, 0.05, 0], swirl: 0.6, rng: rng.fork('mist') }));

  const tog = new K.Toggle(0.3);
  const tmp = new THREE.Vector3();

  return {
    root,
    env: {
      skyTop: '#7ea4c8', skyHorizon: '#f2d6bd', skyBottom: '#c8b8b0', skyCurve: 0.55,
      fog: '#e2d2c8', fogNear: 80, fogFar: 230,
      sunDir: [0.85, 0.32, 0.55], sunColor: '#ffd3a0', sunIntensity: 2.8, sunDisc: 1, sunGlow: 1.1,
      hemiSky: '#a8c0dc', hemiGround: '#b89a80', hemiIntensity: 0.6, envIntensity: 0.7,
      stars: 0, clouds: 0.3, cloudColor: '#fff0e4',
      bloomStrength: 0.5, bloomThreshold: 0.9, bloomRadius: 0.5,
      tiltShift: 0.4, shadowRadius: 24, vignette: 0.3, saturation: 1.05,
    },
    camera: {
      position: [3, 23, 38],
      target: [-1.5, 2.5, -0.5],
      minDistance: 8, maxDistance: 75, autoRotate: 0.25,
      views: [
        { position: [-2.5, 7.5, 16.5], target: [-2.5, 0, 9.5] },
        { position: [-3, 6.5, 8], target: [-11, 2.2, -1] },
      ],
    },
    interaction: {
      label: 'Unlearn the signs',
      activeLabel: 'Trust the old signs',
      hint: 'Each sign keeps its meaning, only elsewhere: riding rings, a lawn, the tombs, the highest pinnacle.',
      set: (on) => tog.set(on),
      camera: { position: [20, 17, 34], target: [2, 9.5, -6] },
    },
    update(t, dt) {
      tog.update(dt);
      const k = tog.value;
      // glyphs fly in arcs from habit to meaning; the scales find no new home and keep circling
      glyphs.forEach((g, i) => {
        tmp.lerpVectors(homes[i], truths[i], k);
        tmp.y += Math.sin(Math.PI * k) * 5;
        if (i === 1) { const a = t * (0.25 + k * 0.5); tmp.x += Math.cos(a) * 3; tmp.z += Math.sin(a) * 3; }
        tmp.y += Math.sin(t * 0.8 + i * 1.7) * 0.15;
        g.position.copy(tmp);
        g.rotation.y = Math.sin(t * 0.3 + i) * 0.5 + 0.2;
        const s = i === 4 ? K.lerp(0.6, 1.5, k) : 1.5;
        g.scale.setScalar(s);
      });
      goldMat.emissiveIntensity = 0.45 + 0.15 * Math.sin(t * 1.3);
      // horses canter round the rings
      for (let i = 0; i < 8; i++) {
        const [x, z, r] = rings[i < 5 ? 0 : 1];
        const a = t * (i < 5 ? 0.55 : -0.65) + (i * Math.PI * 2) / (i < 5 ? 5 : 3);
        const rr = r - 0.45;
        setHorse(i, x + Math.cos(a) * rr, Math.abs(Math.sin(t * 6 + i)) * 0.05, z + Math.sin(a) * rr, -a + (i < 5 ? Math.PI : 0));
      }
      setHorse.done();
      // convicts haul basalt up the ramp and return
      for (let i = 0; i < 12; i++) {
        const u = K.fract(t * 0.035 + i / 12);
        const up = u < 0.5, f = up ? u * 2 : 2 - u * 2;
        const z = -17 + f * 4.4, y = 0.04 + K.clamp((z + 17) / 4.4) * 1.6;
        const x = 1.65 + (up ? -0.2 : 0.2);
        setCon(i, x, y, z, up ? 0 : Math.PI);
        setBlk(i, x, y + 0.02, z + (up ? -0.32 : 0), 0, up ? 1 : 0.001);
      }
      setCon.done(); setBlk.done();
      swing.rotation.x = Math.sin(t * 1.6) * 0.5;
      top.rotation.y = t * 9;
      top.rotation.z = Math.sin(t * 1.3) * 0.08;
      // flute trills and harp chords leap from grave to grave
      for (let i = 0; i < NM; i++) {
        const m = motes[i];
        const period = m.flute ? 1.3 : 3.2;
        const cyc = Math.floor((t + m.ph) / period), f = K.fract((t + m.ph) / period);
        const A = tombs[(m.a + cyc * 7) % 36], B = tombs[(m.b + cyc * 11) % 36];
        const x = K.lerp(A.x, B.x, f), z = K.lerp(A.z, B.z, f), y = A.y + Math.sin(Math.PI * f) * (m.flute ? 0.9 : 1.8);
        mPos.set([x, y, z], i * 3);
        const lv = Math.sin(Math.PI * f) * (0.6 + 0.5 * k);
        if (m.flute) mCol.set([1.0 * lv, 0.92 * lv, 0.6 * lv], i * 3);
        else mCol.set([0.75 * lv, 0.55 * lv, 1.0 * lv], i * 3);
      }
      mGeo.attributes.position.needsUpdate = true;
      mGeo.attributes.color.needsUpdate = true;
      // the uncertain ship: only once the signs are unlearned, and not on every pass
      const P = 34, cyc = Math.floor(t / P), f = K.fract(t / P);
      const arrives = cyc === 0 || K.fract(Math.sin(cyc * 78.233 + 1.3) * 43758.5) > 0.45;
      const x = K.lerp(30, -30, f);
      const vis = K.smoothstep(0, 0.12, f) * (1 - K.smoothstep(arrives ? 0.88 : 0.38, arrives ? 1 : 0.5, f));
      skyShip.position.set(x, 21.6 + Math.sin(t * 0.5) * 0.2, QZ);
      skyShip.rotation.set(0, -Math.PI / 2, Math.sin(t * 0.7) * 0.05);
      skyShipMat.opacity = vis * k * 0.95;
      skyShip.visible = skyShipMat.opacity > 0.01;
    },
  };
};

export default build;
