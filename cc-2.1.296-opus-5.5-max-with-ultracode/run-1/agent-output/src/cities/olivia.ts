// OLIVIA - Cities & Signs 2.
// A city that can only be told with images meaning their opposite: filigree palaces
// with fringed cushions at mullioned windows, a white peacock on a lawn watered by
// whirling jets, hanging canals turning mill paddles, saddlers and raffia weavers,
// ladies in lantern-lit canoes on a green estuary. Already the long evening shadows,
// cast by hidden geometry, are smokestacks and sawtooth sheds, and the golden motes
// are soot. Toggle: words to things, the same outlines read as soot, lathes,
// flywheels, barges unloading files of sleepwalkers, and trailers in brawling streets.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const IVORY = '#f1e7d4';
const SOOT = '#1f1c1a';

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const isl = K.island({ radius: 21, flat: 18.5, depth: 6, top: '#2f2b27', edge: '#3a342e', cliff: '#2a2622', under: '#151311', strata: '#3a3129', seed: 5, hills: 0.15 });
  root.add(isl.mesh);
  root.add(K.waterDisc(120, -1.2, { color: '#0a0b0c', roughness: 0.75, amp: 0.05 }));

  // ---------------------------------------------------------------- the green estuary
  const curve = new THREE.CatmullRomCurve3([[-19, 17], [-12, 11], [-6, 7], [-1, 2], [2.5, -3], [5.5, -8], [11, -12], [18, -16]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const N = 90;
  const width = (s: number) => K.lerp(5, 2, s);
  const frame = (s: number) => {
    const p = curve.getPointAt(s), tg = curve.getTangentAt(s);
    return { p, n: new THREE.Vector3(-tg.z, 0, tg.x), tg };
  };
  const rib: number[] = [], idx: number[] = [];
  const quays = new K.Batch();
  for (let i = 0; i <= N; i++) {
    const s = i / N, { p, n } = frame(s), w = width(s) / 2;
    rib.push(p.x + n.x * w, 0.05, p.z + n.z * w, p.x - n.x * w, 0.05, p.z - n.z * w);
    if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    if (i % 2 === 0) for (const sd of [1, -1]) quays.add(K.at(K.box(0.35, 0.22, 0.7), p.x + n.x * (w + 0.15) * sd, 0, p.z + n.z * (w + 0.15) * sd, { ry: Math.atan2(n.x, n.z) }), '#6d655a', 'stone');
  }
  const ribGeo = new THREE.BufferGeometry();
  ribGeo.setAttribute('position', new THREE.Float32BufferAttribute(rib, 3));
  ribGeo.setIndex(idx);
  ribGeo.computeVertexNormals();
  if (ribGeo.attributes.normal.getY(0) < 0) ribGeo.setIndex(idx.map((_, i) => idx[i - (i % 3) + [0, 2, 1][i % 3]]));
  ribGeo.computeVertexNormals();
  root.add(new THREE.Mesh(ribGeo, K.waterMaterial({ color: '#2e6b5a', roughness: 0.4, amp: 0.15 })));
  root.add(quays.build());
  const nearRiver = (x: number, z: number, m: number) => {
    for (let i = 0; i <= 40; i++) { const s = i / 40, p = curve.getPointAt(s); if (Math.hypot(p.x - x, p.z - z) < width(s) / 2 + m) return true; }
    return false;
  };
  const frameAt = (s: number, side: number, off: number) => { const { p, n } = frame(s); const d = width(s) / 2 + off; return [p.x + n.x * d * side, p.z + n.z * d * side] as [number, number]; };

  // ---------------------------------------------------------------- two readings: words and things (in clusters for a wave)
  const NCL = 4;
  const wordsB = Array.from({ length: NCL }, () => new K.Batch());
  const thingsB = Array.from({ length: NCL }, () => new K.Batch());
  const clusterOf = (x: number, z: number) => K.clamp(Math.floor(((x - z) / 2 + 16) / 8), 0, NCL - 1);
  const shadowB = new K.Batch();
  const filigree = K.canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#f1e7d4'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#b8945a'; g.lineWidth = 2;
    g.fillStyle = '#5a4630';
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const cx = x * 32 + 16, cy = y * 32 + 16;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(cx + Math.cos((k * Math.PI) / 2) * 6, cy + Math.sin((k * Math.PI) / 2) * 6, 5, 0, Math.PI * 2); g.fill(); }
      g.strokeRect(x * 32 + 2, y * 32 + 2, 28, 28);
    }
  });
  filigree.wrapS = filigree.wrapT = THREE.RepeatWrapping;
  filigree.repeat.set(2, 2);
  const filMat = new THREE.MeshStandardMaterial({ map: filigree, roughness: 0.55, metalness: 0.15 });
  const filParts: THREE.BufferGeometry[][] = Array.from({ length: NCL }, () => []);
  type Lot = { x: number; z: number; r: number };
  const taken: Lot[] = [];
  const free = (x: number, z: number, r: number) => !taken.some((l) => Math.hypot(l.x - x, l.z - z) < l.r + r) && Math.hypot(x, z) < 15.5 && !nearRiver(x, z, r + 0.4);

  // features reserved first
  const [PX, PZ] = frameAt(0.42, 1, 4.2); // patio (east bank)
  taken.push({ x: PX, z: PZ, r: 3.4 });
  const [RX, RZ] = frameAt(0.3, -1, 3.6); // rug court (west bank)
  taken.push({ x: RX, z: RZ, r: 2.4 });
  const shops: [number, number, number][] = [];
  for (let i = 0; i < 8; i++) { const s = 0.5 + i * 0.045, [x, z] = frameAt(s, -1, 1.3); const t = frame(s).tg; shops.push([x, z, Math.atan2(t.x, t.z)]); taken.push({ x, z, r: 0.6 }); }
  // hanging canals: two aqueducts crossing at 60 degrees
  const aq = [{ a: new THREE.Vector3(-14, 5, -3), b: new THREE.Vector3(13, 5, 3.5) }, { a: new THREE.Vector3(-6.5, 6.5, -13.5), b: new THREE.Vector3(5.5, 6.5, 12.5) }];
  const mills: THREE.Vector3[] = [];
  aq.forEach(({ a, b }, j) => {
    const L = a.distanceTo(b), ry = Math.atan2(b.x - a.x, b.z - a.z);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    for (const B of [wordsB, thingsB]) B[1 + j].add(K.at(K.box(0.7, 0.45, L), mid.x, a.y, mid.z, { ry }), B === wordsB ? '#e9dcc0' : '#3a3430', 'stone');
    if (j === 0) wordsB[1].add(K.at(K.box(0.5, 0.05, L), mid.x, a.y + 0.42, mid.z, { ry }), '#4aa08a', 'glass');
    for (let d = 1; d < L; d += 2.4) {
      const p = a.clone().lerp(b, d / L);
      if (nearRiver(p.x, p.z, 0.2)) continue;
      shadowB.add(K.at(K.box(0.22, a.y, 0.22), p.x, 0, p.z), '#888888', 'stone');
      wordsB[1 + j].add(K.at(K.ngon(0.1, a.y, 8), p.x, 0, p.z), '#e9dcc0', 'stone');
      thingsB[1 + j].add(K.at(K.box(0.24, a.y, 0.24), p.x, 0, p.z), '#2a2522', 'metal');
    }
    for (const f of [0.22, 0.5, 0.78]) {
      const p = a.clone().lerp(b, f);
      if (nearRiver(p.x, p.z, 0.6)) p.add(new THREE.Vector3(Math.cos(ry) * 1.6, 0, -Math.sin(ry) * 1.6));
      mills.push(new THREE.Vector3(p.x, a.y, p.z));
      taken.push({ x: p.x, z: p.z, r: 1.2 });
    }
  });

  // palaces along the banks (words) and their tenements and sheds (things)
  const glowW: { p: THREE.Vector3 }[] = [];
  let made = 0;
  for (let tries = 0; made < 12 && tries < 900; tries++) {
    const s = rng.float(0.05, 0.95), side = rng.sign(), w = rng.float(2.6, 3.6), d = rng.float(2.6, 4), h = rng.float(3, 5.5);
    const [x, z] = frameAt(s, side, d / 2 + rng.float(0.9, 3.5));
    if (!free(x, z, Math.max(w, d) * 0.55)) continue;
    { const dx = -21 - PX, dz = 22 - PZ, L2 = dx * dx + dz * dz, u = K.clamp(((x - PX) * dx + (z - PZ) * dz) / L2); if (Math.hypot(x - PX - dx * u, z - PZ - dz * u) < 3.6) continue; }
    taken.push({ x, z, r: Math.max(w, d) * 0.55 });
    made++;
    const ry = Math.atan2(frame(s).tg.x, frame(s).tg.z), c = clusterOf(x, z);
    const place = (g: THREE.BufferGeometry) => K.at(g, x, 0, z, { ry });
    filParts[c].push(place(K.box(w, h, d)));
    const W = wordsB[c], T = thingsB[c];
    W.add(place(K.at(K.box(w + 0.2, 0.18, d + 0.2), 0, h, 0)), '#d9b56a', 'gold');
    if (rng.chance(0.5)) W.add(place(K.at(K.dome(Math.min(w, d) * 0.38, 20, 1, 1.2), 0, h + 0.18, 0)), '#e2c27a', 'gold');
    else W.add(place(K.at(K.pyramid(w * 0.8, d * 0.8, 1.2), 0, h + 0.18, 0)), '#c9a24c', 'gold');
    for (const [fw, ox, oz, rot] of [[w, 0, d / 2, 0], [w, 0, -d / 2, Math.PI], [d, w / 2, 0, Math.PI / 2], [d, -w / 2, 0, -Math.PI / 2]] as const) {
      for (let r = 0; r < Math.floor(h / 1.3); r++) for (let q = 0; q < Math.floor(fw / 1.0); q++) {
        const lx = -fw / 2 + (q + 0.5) * (fw / Math.floor(fw / 1.0)), ly = 0.5 + r * 1.3;
        const win = K.at(K.archWall(0.55, 0.85, 0.02, 0.4, 0.62, 6), lx, ly, 0.02).applyMatrix4(new THREE.Matrix4().makeRotationY(rot)).translate(ox, 0, oz);
        W.add(place(win), '#b8945a', 'gold');
        W.add(place(K.at(K.wallPlane(0.38, 0.55), lx, ly + 0.02, 0.015).applyMatrix4(new THREE.Matrix4().makeRotationY(rot)).translate(ox, 0, oz)), '#ffc97a', 'glow', 2.2);
        W.add(place(K.at(K.box(0.42, 0.08, 0.14), lx, ly, 0.08).applyMatrix4(new THREE.Matrix4().makeRotationY(rot)).translate(ox, 0, oz)), rng.pick(['#b8323a', '#2e6b5a', '#d98a2a']), 'cloth');
        T.add(place(K.at(K.wallPlane(0.3, 0.4), lx, ly, 0.015).applyMatrix4(new THREE.Matrix4().makeRotationY(rot)).translate(ox, 0, oz)), rng.chance(0.4) ? '#ff8a3a' : '#2a2420', rng.chance(0.4) ? 'glow' : 'matte', 1.4);
      }
    }
    T.add(place(K.paintBy(K.box(w, h, d), (_x, y, _z, out) => { out.set(SOOT).lerp(new THREE.Color('#4a4038'), K.clamp(y / h) * 0.6); })), null, 'plaster');
    const teeth = Math.max(2, Math.round(w / 1.1));
    for (let k = 0; k < teeth; k++) T.add(place(K.at(K.shedRoof(d, w / teeth, 0.05, 0.9), -w / 2 + (k + 0.5) * (w / teeth), h, 0, { ry: Math.PI / 2 })), '#2b2826', 'metal');
    shadowB.add(place(K.at(K.box(w * 0.9, h + 1.5, d * 0.9), 0, 0, 0)), '#888888', 'stone');
    for (let k = 0; k < teeth; k++) shadowB.add(place(K.at(K.shedRoof(d, w / teeth, 0.05, 1.3), -w / 2 + (k + 0.5) * (w / teeth), h + 1.5, 0, { ry: Math.PI / 2 })), '#888888', 'stone');
    glowW.push({ p: new THREE.Vector3(x, h, z) });
  }

  // the patio: screen, lawn, four whirling jets (words); chimney yard and lathes (things)
  const pc = clusterOf(PX, PZ);
  wordsB[pc].add(K.at(K.box(5, 0.06, 5), PX, 0, PZ), '#d8ccb4', 'stone');
  wordsB[pc].add(K.at(K.box(4, 0.08, 4), PX, 0.02, PZ), '#3f9a4a', 'matte');
  for (const [dx, dz, w, d] of [[0, -2.5, 5, 0.12], [0, 2.5, 5, 0.12], [2.5, 0, 0.12, 5], [-2.5, 0, 0.12, 2]]) filParts[pc].push(K.at(K.box(w, 1.6, d), PX + dx, 0, PZ + dz));
  thingsB[pc].add(K.at(K.box(5, 0.06, 5), PX, 0, PZ), '#2a2622', 'stone');
  const stacks: [number, number, number][] = [[PX + 1.6, PZ - 1.6, 8.8], [PX - 1.7, PZ - 1.4, 7.2], [PX + 0.2, PZ + 1.9, 7.8]];
  for (const [x, z, h] of stacks) {
    thingsB[pc].add(K.at(K.cyl(0.32, 0.5, h, 12), x, 0, z), '#3a2a24', 'stone');
    thingsB[pc].add(K.at(K.torus(0.35, 0.06, 5, 14), x, h - 0.4, z, { rx: Math.PI / 2 }), '#2a1e1a', 'metal');
    shadowB.add(K.at(K.cyl(0.32, 0.5, h, 10), x, 0, z), '#888888', 'stone');
  }
  const jets: THREE.Group[] = [];
  const dropPos: number[] = [];
  for (let a = 0; a < 2; a++) for (let k = 1; k <= 8; k++) { const r = k * 0.13; dropPos.push(Math.cos(a * Math.PI) * r, 0.25 + Math.sin((k / 8) * Math.PI) * 0.35, Math.sin(a * Math.PI) * r); }
  const dropGeo = new THREE.BufferGeometry();
  dropGeo.setAttribute('position', new THREE.Float32BufferAttribute(dropPos, 3));
  const dropMat = new THREE.PointsMaterial({ color: '#d8f0ff', size: 0.09, transparent: true, opacity: 0.8, depthWrite: false });
  for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) {
    const g = new THREE.Group();
    g.add(new THREE.Points(dropGeo, dropMat));
    g.add(new THREE.Mesh(K.cyl(0.03, 0.03, 0.25, 6), K.M.metal('#8a8f94')));
    g.position.set(PX + dx, 0.08, PZ + dz);
    root.add(g);
    jets.push(g);
  }
  // the white peacock, whose fan is the silhouette of a plume of smoke
  const peacock = new THREE.Group();
  const pb = new K.Batch();
  pb.add(K.at(K.sphere(0.16, 12, 8), 0, 0.22, 0, { s: [0.8, 1, 1.3] }), '#ffffff', 'ceramic');
  pb.add(K.strut([0, 0.28, 0.12], [0, 0.48, 0.2], 0.04, 6), '#ffffff', 'ceramic');
  pb.add(K.at(K.sphere(0.06, 8, 6), 0, 0.5, 0.22), '#ffffff', 'ceramic');
  for (const sx of [-0.05, 0.05]) pb.add(K.strut([sx, 0, 0], [sx, 0.14, 0], 0.012, 4), '#c8b8a0', 'matte');
  peacock.add(pb.build());
  const fanTex = K.canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 12; i++) {
      const a = Math.PI * (i + 0.5) / 12, rr = h * (0.35 + r * 0.17);
      g.fillStyle = 'rgba(230,214,170,0.9)';
      g.beginPath(); g.ellipse(w / 2 + Math.cos(a) * rr * 2, h - Math.sin(a) * rr, 7, 5, 0, 0, Math.PI * 2); g.fill();
    }
  });
  const fanMat = new THREE.MeshStandardMaterial({ map: fanTex, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.25, transparent: true, roughness: 0.6 });
  const fan = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32, 0, Math.PI), fanMat);
  fan.castShadow = true;
  root.add(fan);
  peacock.position.set(PX + 0.2, 0.1, PZ - 0.4);
  peacock.rotation.y = Math.atan2(-21 - PX, 22 - PZ);
  const fwd = new THREE.Vector3(Math.sin(peacock.rotation.y), 0, Math.cos(peacock.rotation.y));
  peacock.scale.setScalar(2.2);
  root.add(peacock);
  // lathes: forty benches, one figure each, one stroke repeated (things)
  const LN = 40;
  const lathePts: [number, number][] = [];
  for (let i = 0; i < LN; i++) {
    const inPatio = i < 16;
    const cx = inPatio ? PX : RX, cz = inPatio ? PZ : RZ, n = inPatio ? 4 : 6;
    const k = inPatio ? i : i - 16;
    lathePts.push([cx - 1.5 + (k % n) * (3 / (n - 1)), cz - 1.2 + Math.floor(k / n) * (inPatio ? 0.8 : 0.6)]);
  }
  const benchGeo = K.merge([K.paint(K.box(0.42, 0.3, 0.22), '#3a3632'), K.paint(K.at(K.personGeometry(0.26), 0, 0, -0.26), '#6a6058')]);
  const benches = K.instanced(benchGeo, K.std('#ffffff', { vertexColors: true }), LN);
  const spindles = K.instanced(K.cyl(0.04, 0.04, 0.3, 6).rotateZ(Math.PI / 2), K.std('#c8c0b0', { metalness: 0.8, roughness: 0.3 }), LN, undefined, { colors: false });
  root.add(benches, spindles);
  const setBench = K.instanceSetter(benches), setSp = K.instanceSetter(spindles);

  // rug court: six women at raffia looms (words); saddlers' shops (words)
  const rc = clusterOf(RX, RZ);
  wordsB[rc].add(K.at(K.box(4.4, 0.05, 3.6), RX, 0, RZ), '#c9b48c', 'stone');
  for (let i = 0; i < 6; i++) {
    const x = RX - 1.6 + (i % 3) * 1.6, z = RZ - 0.8 + Math.floor(i / 3) * 1.6;
    wordsB[rc].add(K.at(K.box(1.0, 0.03, 0.7), x, 0.05, z + 0.1), rng.pick(['#d84a2a', '#e8b030', '#2e8a7a', '#b83a6a', '#f0d8a0']), 'cloth');
    for (const sx of [-0.5, 0.5]) wordsB[rc].add(K.at(K.box(0.05, 0.6, 0.05), x + sx, 0, z - 0.3), '#8a6a40', 'wood');
    wordsB[rc].add(K.at(K.box(1.05, 0.05, 0.05), x, 0.6, z - 0.3), '#8a6a40', 'wood');
    wordsB[rc].add(K.at(K.box(0.95, 0.5, 0.01), x, 0.08, z - 0.3), '#d8c08a', 'cloth');
  }
  const weavers = K.crowd({ count: 6, place: (i) => [RX - 1.6 + (i % 3) * 1.6, 0, RZ - 0.8 + Math.floor(i / 3) * 1.6 + 0.35], colors: ['#c8402a', '#2e6b5a', '#e0b050'], h: 0.22, rng: rng.fork('w') });
  root.add(weavers);
  for (const [x, z, ry] of shops) K.stall(wordsB[clusterOf(x, z)], { x, z, ry, w: 0.9, d: 0.6, h: 0.7, cloth: '#7a4a2a', stripes: '#a8703a' });

  // mills: paddle wheels under the cascades (become flywheels)
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: 0.7, metalness: 0 });
  const wheelGeo = K.merge([K.torus(0.8, 0.06, 6, 24), K.cyl(0.08, 0.08, 0.3, 8).rotateX(Math.PI / 2), ...Array.from({ length: 8 }, (_, i) => K.at(K.box(0.08, 0.8, 0.3), 0, 0, 0, { rz: (i * Math.PI) / 4 }).translate(0, 0, 0))]);
  wheelGeo.translate(0, 0, 0);
  const wheels: THREE.Mesh[] = [];
  const cascMat = new THREE.ShaderMaterial({
    uniforms: { uTime: K.U.time, uCol: { value: new THREE.Color('#cfeee6') } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float uTime; uniform vec3 uCol; varying vec2 vUv; void main(){ float s = 0.5 + 0.5 * sin(vUv.y * 40.0 + uTime * 12.0 + sin(vUv.x * 20.0) * 2.0); float e = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x); gl_FragColor = vec4(uCol * (0.8 + 0.6 * s), (0.35 + 0.4 * s) * e); }',
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  for (const m of mills) {
    const c = clusterOf(m.x, m.z);
    wordsB[c].add(K.at(K.box(1.2, 1.0, 1.0), m.x + 0.9, 0, m.z), '#e6d6b8', 'plaster');
    wordsB[c].add(K.at(K.pyramid(1.4, 1.2, 0.5), m.x + 0.9, 1.0, m.z), '#a8582e', 'ceramic');
    thingsB[c].add(K.at(K.box(1.3, 1.3, 1.1), m.x + 0.9, 0, m.z), '#2a2522', 'metal');
    thingsB[c].add(K.strut([m.x, 0.9, m.z], [m.x + 0.9, 1.25, m.z], 0.05, 4), '#111111', 'cloth');
    const wh = new THREE.Mesh(wheelGeo, wheelMat);
    wh.position.set(m.x, 0.9, m.z);
    wh.castShadow = true;
    root.add(wh);
    wheels.push(wh);
    const casc = new THREE.Mesh(new THREE.PlaneGeometry(0.35, m.y - 1.7), cascMat);
    casc.position.set(m.x - 0.4, (m.y + 1.7) / 2, m.z);
    root.add(casc);
  }

  // ---------------------------------------------------------------- outskirts: low row houses on a ring
  const ob = new K.Batch();
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2, r = rng.float(16.5, 19);
    if (nearRiver(Math.cos(a) * r, Math.sin(a) * r, 1.5)) continue;
    K.house(ob, { x: Math.cos(a) * r, z: Math.sin(a) * r, ry: -a, w: rng.float(1.6, 2.6), d: 1, h: rng.float(0.6, 1.0), roof: 'gable', wall: K.jitter('#5a524a', rng), roofColor: '#3a3230', lit: 0.25, glow: 1.5, rng });
  }
  root.add(ob.build({ name: 'outskirts' }));

  // build the two readings
  const groups: { w: THREE.Group; t: THREE.Group }[] = [];
  for (let c = 0; c < NCL; c++) {
    const w = wordsB[c].build({ name: 'words' + c });
    if (filParts[c].length) { const m = new THREE.Mesh(K.merge(filParts[c], true), filMat); m.castShadow = m.receiveShadow = true; w.add(m); }
    const t = thingsB[c].build({ name: 'things' + c });
    t.visible = false;
    root.add(w, t);
    groups.push({ w, t });
  }
  const shadows = shadowB.build({ name: 'shadow-only' });
  const shadowMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  shadows.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.material = shadowMat; m.castShadow = true; m.receiveShadow = false; } });
  root.add(shadows);

  // ---------------------------------------------------------------- canoes (words) and barges with sleepwalkers (things)
  const NCN = 9;
  const canoeGeo = K.merge([K.boatGeometry(0.8, '#2a1e18'), K.paint(K.at(K.personGeometry(0.2), 0, 0.02, -0.1), '#e8d0d8'), K.paint(K.strut([0, 0, 0.3], [0, 0.45, 0.42], 0.01, 4), '#3a2a20')]);
  const canoes = K.instanced(canoeGeo, K.std('#ffffff', { vertexColors: true }), NCN);
  root.add(canoes);
  const setCanoe = K.instanceSetter(canoes);
  const bargeB = new K.Batch();
  const [MX, MZ] = frameAt(0.06, -1, 0.2);
  for (let i = 0; i < 3; i++) { const [bx, bz] = frameAt(0.04 + i * 0.05, i % 2 ? 1 : -1, -1.6); bargeB.add(K.at(K.box(1.0, 0.35, 2.6), bx, -0.05, bz, { ry: 0.8 }), '#24201c', 'wood'); }
  const barges = bargeB.build();
  root.add(barges);
  const filePaths = [[-13, 12], [-15, 5], [-8, 16], [-17, 9]].map(([ex, ez]) => [new THREE.Vector3(MX, 0.02, MZ), new THREE.Vector3((MX + ex) / 2 + 1, 0.02, (MZ + ez) / 2 + 1), new THREE.Vector3(ex, 0.02, ez)]);
  const sleepers = new K.Walkers({ paths: filePaths, count: 60, speed: [0.12, 0.18], colors: ['#4a4440', '#3a3836', '#5a5048'], rng: rng.fork('sleep') });
  root.add(sleepers.mesh);
  const trailers = K.instanced(K.merge([K.paint(K.box(0.5, 0.5, 1.4), '#5a5048'), K.paint(K.at(K.box(0.5, 0.42, 0.45), 0, 0, 0.95), '#7a2a20')]), K.std('#ffffff', { vertexColors: true }), 7);
  root.add(trailers);
  const setTr = K.instanceSetter(trailers);
  const trail = Array.from({ length: 7 }, () => { const [x, z] = rng.inDisc(13); return { x, z, ry: rng.pick([0, Math.PI / 2]), ph: rng.float(0, 10) }; });
  // lamps: canoe lanterns, then dim sleepwalker lamps (one Points cloud)
  const NL = NCN + 60;
  const lPos = new Float32Array(NL * 3), lCol = new Float32Array(NL * 3);
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3));
  lGeo.setAttribute('color', new THREE.BufferAttribute(lCol, 3));
  const lamps = new THREE.Points(lGeo, new THREE.PointsMaterial({ size: 0.9, map: K.glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  lamps.frustumCulled = false;
  root.add(lamps);

  const motes = K.particles({ count: 150, radius: 15, y0: 0.5, y1: 9, color: '#ffd98c', size: 0.06, opacity: 0.5, swirl: 0.5, twinkle: 0.8, rng: rng.fork('motes') });
  const soot = K.particles({ count: 600, radius: 15, y0: 0, y1: 12, color: '#0e0c0a', size: 0.09, opacity: 0, velocity: [0.1, -0.35, 0.05], swirl: 0.3, additive: false, rng: rng.fork('soot') });
  root.add(motes, soot);
  const smokeFx = K.smoke({ sources: stacks.map(([x, z, h]) => [x, h, z] as [number, number, number]), perSource: 30, height: 7, color: '#1a1614', opacity: 0, size: [0.8, 3], life: 8, wind: [0.5, 0.2], additive: false, rng: rng.fork('smoke') });
  root.add(smokeFx);
  const furnace = new THREE.PointLight('#ff6a20', 0, 30, 1.2);
  furnace.position.set(PX, 1.5, PZ);
  root.add(furnace);
  const smogLight = new THREE.HemisphereLight('#6a4a30', '#ff7a30', 0);
  root.add(smogLight);

  const tog = new K.Toggle(0.33);
  const ivory = new THREE.Color('#ffffff'), soot0 = new THREE.Color('#1a1614'), wood = new THREE.Color('#8a5a32'), iron = new THREE.Color('#2a2a2c');
  const motesU = (motes.material as THREE.ShaderMaterial).uniforms, sootU = (soot.material as THREE.ShaderMaterial).uniforms, smokeU = (smokeFx.material as THREE.ShaderMaterial).uniforms;
  let wheelA = 0, spinA = 0;

  return {
    root,
    env: {
      skyTop: '#1e2137', skyHorizon: '#b07b52', skyBottom: '#2a2420', skyCurve: 0.5,
      fog: '#5f5547', fogNear: 60, fogFar: 160,
      sunDir: [0.55, 0.2, -0.65], sunColor: '#ffb070', sunIntensity: 2.6, sunDisc: 1, sunGlow: 0.9,
      hemiSky: '#6a6a90', hemiGround: '#3a2a22', hemiIntensity: 0.95, envIntensity: 0.7,
      stars: 0.4, clouds: 0.3, cloudColor: '#c08a60',
      bloomStrength: 0.5, bloomThreshold: 0.92, bloomRadius: 0.55,
      tiltShift: 0.4, shadowRadius: 24, vignette: 0.45, saturation: 1.05,
    },
    camera: {
      position: [-19, 20, 21],
      target: [1, 1, -1],
      minDistance: 8, maxDistance: 70, autoRotate: 0.2,
      views: [
        { position: [5, 24, 26], target: [1, 2, -1] },
        { position: [PX + 3, 7.5, PZ + 6.5], target: [PX, 0.8, PZ] },
      ],
    },
    interaction: {
      label: 'Words to things',
      activeLabel: 'Things to words',
      hint: 'The same outlines, read as what they stand for: soot, lathes, flywheels, sleepwalkers.',
      set: (on) => tog.set(on),
    },
    update(t, dt) {
      tog.update(dt);
      const k = tog.value;
      groups.forEach(({ w, t: th }, c) => {
        const f = K.smoothstep(c * 0.12, c * 0.12 + 0.6, k);
        w.visible = f < 0.999; th.visible = f > 0.001;
        w.scale.y = Math.max(0.001, 1 - f); th.scale.y = Math.max(0.001, f);
      });
      // rotations: gentle in the words, hard mechanical tempo in the things
      wheelA += dt * K.lerp(0.8, 4.5, k);
      spinA += dt * K.lerp(3, 14, k);
      for (const wh of wheels) wh.rotation.z = -wheelA;
      wheelMat.color.copy(wood).lerp(iron, k);
      wheelMat.metalness = k * 0.8;
      cascMat.uniforms.uCol.value.set('#cfeee6').lerp(new THREE.Color('#3a2a1a'), k);
      jets.forEach((j, i) => { j.rotation.y = spinA * (i % 2 ? 1 : -1); j.scale.setScalar(Math.max(0.001, 1 - k)); });
      // the peacock opens its tail every 15 s; in the things it is a fan of black smoke from a stack
      const cyc = (t % 15) / 15, open = K.smoothstep(0.05, 0.2, cyc) * (1 - K.smoothstep(0.7, 0.85, cyc));
      const o = Math.max(open, k);
      const [sx, sz, sh] = stacks[0];
      fan.position.set(K.lerp(peacock.position.x - fwd.x * 0.3, sx, k), K.lerp(peacock.position.y + 0.35, sh + 0.2, k), K.lerp(peacock.position.z - fwd.z * 0.3, sz, k));
      fan.rotation.set(0, peacock.rotation.y, Math.sin(t * 2) * 0.04 * k, 'YXZ');
      fan.rotateX(-0.3 - k * 0.1);
      fan.scale.set(K.lerp(0.25 + 0.75 * o, 1.7, k) * 1.4, K.lerp(0.2 + 0.8 * o, 1.6, k) * 1.4, 1);
      fanMat.color.copy(ivory).lerp(soot0, k);
      fanMat.emissiveIntensity = 0.25 * (1 - k);
      fanMat.opacity = 1 - k * 0.15;
      peacock.scale.setScalar(Math.max(0.001, 2.2 * (1 - k)));
      // lathes: one stroke repeated in unison to the shift bell
      const stroke = Math.sin(t * 5) > 0 ? 1 : 0;
      for (let i = 0; i < LN; i++) {
        const [x, z] = lathePts[i];
        const s = Math.max(0.001, K.smoothstep(0.3, 0.9, k));
        setBench(i, x, 0, z, 0, s, stroke * 0.18 * s);
        setSp(i, x, 0.32 * s, z, 0, s, spinA * 3);
      }
      setBench.done(); setSp.done();
      // canoes glide in file; barges and sleepwalkers take their place
      const cs = Math.max(0.001, 1 - k);
      for (let i = 0; i < NCN; i++) {
        const u = K.fract(t * 0.006 + i / NCN) * 2;
        const back = u > 1, s = back ? 2 - u : u;
        const { p, n, tg } = frame(K.clamp(s, 0.01, 0.99));
        const off = width(s) * 0.22 * (back ? 1 : -1);
        const x = p.x + n.x * off, z = p.z + n.z * off, ry = Math.atan2(tg.x, tg.z) + (back ? Math.PI : 0);
        setCanoe(i, x, 0.08 + Math.sin(t * 1.3 + i) * 0.015, z, ry, cs);
        lPos.set([x + Math.sin(ry) * 0.42, 0.5, z + Math.cos(ry) * 0.42], i * 3);
        const fl = (0.9 + 0.1 * Math.sin(t * 9 + i * 3)) * (1 - k);
        lCol.set([1.0 * fl, 0.75 * fl, 0.4 * fl], i * 3);
      }
      setCanoe.done();
      barges.visible = k > 0.02;
      barges.scale.y = Math.max(0.001, k);
      sleepers.update(t);
      sleepers.mesh.visible = k > 0.4;
      const arr = sleepers.mesh.instanceMatrix.array as Float32Array;
      const laugh = (t % 9) * 14;
      for (let i = 0; i < 60; i++) {
        const j = NCN + i;
        lPos.set([arr[i * 16 + 12], 0.3, arr[i * 16 + 14]], j * 3);
        const flare = Math.exp(-((i - laugh) ** 2) / 6) * 2.5;
        const v = sleepers.mesh.visible ? (0.18 + flare) * K.smoothstep(0.4, 0.8, k) : 0;
        lCol.set([v, v * 0.8, v * 0.5], j * 3);
      }
      lGeo.attributes.position.needsUpdate = true;
      lGeo.attributes.color.needsUpdate = true;
      // trailers shunt through the brawling streets
      for (let i = 0; i < 7; i++) {
        const tr = trail[i], u = Math.sin(t * 0.35 + tr.ph) * 2.2;
        setTr(i, tr.x + Math.sin(tr.ry) * u, 0, tr.z + Math.cos(tr.ry) * u, tr.ry, Math.max(0.001, K.smoothstep(0.5, 1, k)));
      }
      setTr.done();
      motesU.uOpacity.value = 0.5 * (1 - k);
      sootU.uOpacity.value = 0.85 * k;
      smokeU.uOpacity.value = 0.55 * k;
      furnace.intensity = k * 60;
      smogLight.intensity = k * 1.1;
    },
  };
};

export default build;
