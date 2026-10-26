// AGLAURA - Cities & Names 1.
// Two Aglauras, one hovering above the other. Below: the city that grows out of the
// soil, faded, random, dithered half out of existence. Above: the city that is said,
// gilded, symmetrical, standing on a ring of seven letters that spell its name.
// Now and then a slit of light opens in a lane onto something rare; before it can be
// grasped, gilt ribbons of repeated sayings uncoil from the name-city and press it
// into one more copy of the stock house. Toggle: look at the ground instead.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const TAU = Math.PI * 2;

// ---- letter strokes (letter space: x in -1.1..1.1, y in 0..3.2)
type Seg = [number, number, number, number];
function arcSegs(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): Seg[] {
  const s: Seg[] = [];
  for (let i = 0; i < n; i++) {
    const p = a0 + ((a1 - a0) * i) / n, q = a0 + ((a1 - a0) * (i + 1)) / n;
    s.push([cx + Math.cos(p) * rx, cy + Math.sin(p) * ry, cx + Math.cos(q) * rx, cy + Math.sin(q) * ry]);
  }
  return s;
}
const LETTERS: Record<string, Seg[]> = {
  A: [[-1.0, 0.1, 0, 3.05], [0, 3.05, 1.0, 0.1], [-0.52, 1.15, 0.52, 1.15]],
  G: [...arcSegs(0, 1.6, 0.95, 1.42, Math.PI * 0.28, Math.PI * 1.97, 14), [0.12, 1.45, 0.95, 1.45]],
  L: [[-0.72, 0, -0.72, 3.2], [-0.72, 0.21, 1.0, 0.21]],
  U: [[-0.85, 3.2, -0.85, 1.05], [0.85, 3.2, 0.85, 1.05], ...arcSegs(0, 1.05, 0.85, 0.85, Math.PI, TAU, 8)],
  R: [[-0.8, 0, -0.8, 3.2], [-0.8, 2.99, 0.05, 2.99], [-0.8, 1.61, 0.05, 1.61], ...arcSegs(0.05, 2.3, 0.75, 0.69, Math.PI / 2, -Math.PI / 2, 7), [-0.15, 1.61, 0.95, 0.05]],
};
function letterGeo(ch: string, t = 0.42, d = 0.7): THREE.BufferGeometry {
  const parts = LETTERS[ch].map(([x0, y0, x1, y1]) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    return K.at(K.boxC(len + t * 0.55, t, d), (x0 + x1) / 2, (y0 + y1) / 2, 0, { rz: Math.atan2(y1 - y0, x1 - x0) });
  });
  return K.merge(parts);
}

// ---- the stock house of the said city (gabled, ivory and gold)
function stockHouse(wall: string, roof: string, s = 1): THREE.BufferGeometry {
  return K.merge([
    K.paint(K.box(0.56 * s, 0.5 * s, 0.56 * s), wall),
    K.paint(K.at(K.gableRoof(0.56 * s, 0.56 * s, 0.32 * s, 0.05 * s), 0, 0.5 * s, 0), roof),
    K.paint(K.at(K.wallPlane(0.14 * s, 0.24 * s), 0, 0, 0.285 * s), '#6b5532'),
  ]);
}

const IRID_VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vP = position; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const IRID_FRAG = /* glsl */ `
  uniform float uTime; uniform float uGold; uniform float uAlpha;
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main() {
    float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
    float h = fract(f * 1.4 + vP.y * 0.32 + uTime * 0.11);
    vec3 teal = vec3(0.10, 0.75, 0.66), rose = vec3(0.95, 0.42, 0.62), gold = vec3(1.0, 0.78, 0.33);
    vec3 c = h < 0.333 ? mix(teal, rose, h * 3.0) : h < 0.666 ? mix(rose, gold, h * 3.0 - 1.0) : mix(gold, teal, h * 3.0 - 2.0);
    c *= 0.85 + 1.3 * f;
    c = mix(c, vec3(1.0, 0.8, 0.42) * (0.8 + 0.6 * f), uGold);
    gl_FragColor = vec4(c * 1.35, uAlpha);
  }`;

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  // ---- the ground: a floating disc of pale ash earth
  const isl = K.island({ radius: 22, flat: 20.6, depth: 9, top: '#a19f99', edge: '#9b958a', cliff: '#878278', under: '#55524e', strata: '#b3ada1', hills: 0.12, seed: 9 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -7.5, color: '#d9d4ca', shadow: '#8c8a90', opacity: 0.7, coverage: 0.55 }));

  // ---- glyph texture: rows of small invented marks, the proverbs everyone recites
  const grng = rng.fork('glyphs');
  const glyphTex = K.canvasTexture(1024, 64, (g, w, h) => {
    g.fillStyle = '#e4c784';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#6e4f1e';
    g.lineWidth = 2.2;
    g.lineCap = 'round';
    for (let row = 0; row < 2; row++) {
      for (let x = 6; x < w - 10; x += 13) {
        const y = 10 + row * 30;
        g.beginPath();
        const n = grng.int(2, 3);
        for (let k = 0; k < n; k++) {
          const ax = x + grng.float(0, 9), ay = y + grng.float(0, 16);
          g.moveTo(ax, ay);
          if (grng.chance(0.4)) g.arc(ax + 2, ay, 3, 0, Math.PI * grng.float(0.8, 2));
          else g.lineTo(x + grng.float(0, 9), y + grng.float(0, 16));
        }
        g.stroke();
      }
      g.fillStyle = '#9c7a3a';
      g.fillRect(0, row * 30 + 1, w, 2);
    }
  });
  glyphTex.wrapS = THREE.RepeatWrapping;

  // =============================================================== the said city
  const upper = new THREE.Group();
  root.add(upper);
  const ub = new K.Batch();
  const LR = 8.5;
  const word = ['A', 'G', 'L', 'A', 'U', 'R', 'A'];
  const letterAngle = (i: number) => Math.PI / 4 + 0.22 - (i * TAU) / 7;
  const letterGeos: THREE.BufferGeometry[] = [];
  word.forEach((ch, i) => {
    const a = letterAngle(i);
    const g = K.at(letterGeo(ch), Math.cos(a) * LR, 3.2, Math.sin(a) * LR, { ry: Math.PI / 2 - a });
    letterGeos.push(g.clone());
    ub.add(g, '#d6a648', 'gold');
  });
  // disc, terraces, wall
  ub.add(K.at(K.cyl(10, 9.3, 0.8, 96), 0, 6.4, 0), '#efe3c4', 'stone');
  ub.add(K.at(K.torus(9.65, 0.12, 6, 96), 0, 6.42, 0), '#d6a648', 'gold');
  const levels: [number, number][] = [[8, 7.2], [6, 8.1], [4, 9.0]];
  for (const [r, y] of levels) {
    ub.add(K.at(K.cyl(r, r, 0.9, 96), 0, y, 0), '#ecdcb6', 'stone');
    ub.add(K.at(K.torus(r + 0.02, 0.06, 5, 96), 0, y + 0.9, 0), '#d6a648', 'gold');
  }
  ub.add(K.at(K.lathe([[9.3, 0], [9.6, 0], [9.6, 1.2], [9.3, 1.2]], 96), 0, 7.2, 0), '#f1e6c9', 'stone');
  ub.add(K.crenelRing(9.45, 8.4, 56, 0.4, 0.26, 0.32), '#f1e6c9', 'stone');
  // seven round towers standing over the seven letters
  for (let i = 0; i < 7; i++) {
    const a = letterAngle(i);
    K.tower(ub, { x: Math.cos(a) * 9.6, z: Math.sin(a) * 9.6, y: 7.2, r: 0.62, h: 3, sides: 16, top: 'cone', topH: 1.2, color: '#f3e8cc', topColor: '#d6a648', topFinish: 'gold', bands: 1, bandColor: '#d6a648', windows: false });
  }
  // the stock houses in exact concentric rows, avenues aligned with the letters
  const onAvenue = (a: number, r: number) => {
    for (let i = 0; i < 7; i++) {
      const d = Math.abs(((a - letterAngle(i) + Math.PI * 3) % TAU) - Math.PI);
      if (d * r < 0.75) return true;
    }
    return false;
  };
  const rows: [number, number][] = [[8.75, 7.2], [7.4, 8.1], [6.6, 8.1], [5.35, 9.0], [4.55, 9.0]];
  let stockCount = 0;
  for (const [r, y] of rows) {
    const n = Math.floor((TAU * r) / 0.82);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + 0.05;
      if (onAvenue(a, r)) continue;
      ub.add(K.at(stockHouse('#f4ead2', '#c9963c'), Math.cos(a) * r, y, Math.sin(a) * r, { ry: Math.PI / 2 - a }), null, 'plaster');
      stockCount++;
    }
  }
  // the avenues, paved in gold leaf
  for (let i = 0; i < 7; i++) {
    const a = letterAngle(i);
    for (const [r0, r1, y] of [[8, 9.3, 7.2], [6, 8, 8.1], [4, 6, 9.0]] as const) {
      const rm = (r0 + r1) / 2;
      ub.add(K.at(K.box(0.7, 0.02, r1 - r0), Math.cos(a) * rm, y + 0.005, Math.sin(a) * rm, { ry: Math.PI / 2 - a }), '#dcb565', 'gold');
    }
  }
  // the central domed tower with its lantern (top near y = 15.5)
  K.tower(ub, { y: 9.9, r: 1.05, h: 4.1, sides: 8, top: 'none', color: '#f3e8cc', bands: 1.3, bandColor: '#d6a648', windows: false });
  ub.add(K.at(K.cyl(1.25, 1.25, 0.18, 24), 0, 14.0, 0), '#d6a648', 'gold');
  ub.add(K.at(K.dome(1.15, 28, 1, 0.95), 0, 14.18, 0), '#d9a744', 'gold');
  ub.add(K.at(K.cyl(0.2, 0.2, 0.45, 10), 0, 15.2, 0), '#f3e8cc', 'stone');
  ub.add(K.at(K.cone(0.24, 0.5, 10), 0, 15.65, 0), '#d9a744', 'gold');
  // official eccentricity 1: the leaning tower (7 degrees)
  {
    const a = letterAngle(2) + 0.45, r = 5.0, x = Math.cos(a) * r, z = Math.sin(a) * r;
    ub.add(K.at(K.ngon(0.34, 2.9, 12), x, 9.0, z, { rz: 0.122 }), '#f1e4c2', 'stone');
    ub.add(K.at(K.at(K.cone(0.42, 0.8, 12), 0, 2.9, 0), x, 9.0, z, { rz: 0.122 }), '#d6a648', 'gold');
  }
  // official eccentricity 2: the dome set upside down
  {
    const a = letterAngle(5) + 0.45, r = 7.0, x = Math.cos(a) * r, z = Math.sin(a) * r;
    ub.add(K.at(K.cyl(0.12, 0.16, 0.9, 10), x, 8.1, z), '#f1e4c2', 'stone');
    ub.add(K.at(K.dome(0.7, 20, 1, 0.85), x, 9.0 + 0.6, z, { rx: Math.PI }), '#d6a648', 'gold');
  }
  const upperMeshes = ub.build({ name: 'said', castShadow: false });
  const upperMats: THREE.MeshStandardMaterial[] = [];
  upperMeshes.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = (m.material as THREE.MeshStandardMaterial).clone();
    mat.transparent = true;
    m.material = mat;
    upperMats.push(mat);
  });
  upper.add(upperMeshes);

  // glyph bands on the wall and terrace risers, scrolling like recited proverbs
  const bandGeos: THREE.BufferGeometry[] = [];
  for (const [r, y, hgt] of [[9.62, 7.35, 0.62], [10.02, 6.55, 0.5], [8.02, 7.42, 0.46], [6.02, 8.32, 0.46], [4.02, 9.22, 0.46]] as const) {
    const g = new THREE.CylinderGeometry(r, r, hgt, 128, 1, true).translate(0, y + hgt / 2, 0);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * Math.round(r * 1.6));
    bandGeos.push(g);
  }
  const glyphMat = new THREE.MeshStandardMaterial({ map: glyphTex, color: '#ffffff', roughness: 0.45, metalness: 0.35, transparent: true, emissive: '#5a3c10', emissiveIntensity: 0.25 });
  const bands = new THREE.Mesh(K.merge(bandGeos, true), glyphMat);
  upper.add(bands);

  // letter outlines (visible when attention moves to the ground)
  const edgeMat = new THREE.LineBasicMaterial({ color: '#f6d58a', transparent: true, opacity: 0, depthWrite: false });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(K.merge(letterGeos), 25), edgeMat);
  upper.add(edges);

  // the said city's private low sun
  const privateSun = new THREE.PointLight('#ffc879', 90, 36, 1.4);
  privateSun.position.set(-13, 15, 9);
  root.add(privateSun);

  // =============================================================== the ground city
  const N = 300;
  const houses: { x: number; z: number; w: number; d: number; h: number; base: THREE.Color; tint: THREE.Color }[] = [];
  const bodyGeo = K.paintBy(K.box(1, 1, 1), (_x, y, _z, out) => out.setScalar(0.72 + 0.28 * y));
  const roofGeo = K.paint(K.gableRoof(1, 1, 1, 0.03), '#ffffff');
  const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, alphaHash: true, opacity: 0.72 });
  const bodies = new THREE.InstancedMesh(bodyGeo, groundMat, N);
  const roofs = new THREE.InstancedMesh(roofGeo, groundMat, N);
  const M = new THREE.Matrix4(), MR = new THREE.Matrix4(), MT = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const hr = rng.fork('ground');
  for (let i = 0; i < N; i++) {
    let x = 0, z = 0;
    do { [x, z] = hr.inDisc(19.8); } while (Math.hypot(x, z) < 1.2);
    const w = hr.float(0.6, 2.0), d = hr.float(0.6, 1.6);
    const h = hr.chance(0.04) ? 2.5 : hr.float(0.4, 1.8);
    const lean = hr.chance(0.33) ? hr.float(0.05, 0.14) * hr.sign() : 0;
    e.set(hr.chance(0.5) ? lean : 0, hr.angle(), hr.chance(0.5) ? lean : 0);
    q.setFromEuler(e);
    M.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(w, h, d));
    bodies.setMatrixAt(i, M);
    const hasRoof = hr.chance(0.45);
    MR.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, 1, 1));
    MT.makeTranslation(0, h, 0);
    MR.multiply(MT).multiply(new THREE.Matrix4().makeScale(w * 1.04, Math.min(w, d) * hr.float(0.25, 0.45), d * 1.04));
    if (!hasRoof) MR.makeScale(0, 0, 0);
    roofs.setMatrixAt(i, MR);
    const hue = hr.float(0, 1);
    const base = K.hsl(hue, hr.float(0.03, 0.08), hr.float(0.5, 0.66));
    const tint = K.hsl(hue, hr.float(0.4, 0.6), hr.float(0.55, 0.68));
    houses.push({ x, z, w, d, h, base, tint });
    bodies.setColorAt(i, base);
    roofs.setColorAt(i, K.shade(base, 0.82));
  }
  for (const m of [bodies, roofs]) {
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    m.instanceMatrix.needsUpdate = true;
    root.add(m);
  }
  // the oddity: one perfectly regular house, identical to the stock house, but grey
  const gb = new K.Batch();
  const odd = houses.reduce((best, h) => (Math.abs(Math.hypot(h.x, h.z) - 15) < Math.abs(Math.hypot(best.x, best.z) - 15) && h.x > 0 && h.z > 0 ? h : best), houses[0]);
  gb.add(K.at(stockHouse('#c9c5bd', '#9a958c', 1.4), odd.x + 1.6, 0, odd.z, { ry: 0.3 }), null, 'plaster');
  // pale rubble, a few dry shrubs, a heap of nothing in particular
  for (let i = 0; i < 70; i++) {
    const [x, z] = hr.inDisc(20);
    K.rock(gb, { x, z, r: hr.float(0.08, 0.25), color: '#9d978c', rng: hr });
  }
  K.forest(gb, { n: 34, r1: 20, rng: hr, kinds: ['shrub', 'round', 'poplar'], h: [0.5, 1.6], color: '#8d907e' });
  root.add(gb.build({ name: 'ground' }));

  // people wandering at random
  const paths: THREE.Vector3[][] = [];
  for (let p = 0; p < 10; p++) {
    const pts: THREE.Vector3[] = [];
    let [x, z] = hr.inDisc(16);
    for (let k = 0; k < 7; k++) {
      pts.push(new THREE.Vector3(x, 0.02, z));
      x = K.clamp(x + hr.float(-3, 3), -18, 18);
      z = K.clamp(z + hr.float(-3, 3), -18, 18);
    }
    paths.push(pts);
  }
  const walkers = new K.Walkers({ paths, count: 40, rng: hr.fork('w'), speed: [0.15, 0.3], colors: ['#8d877d', '#77736c', '#a39c90', '#6d6a66'] });
  root.add(walkers.mesh);

  root.add(K.particles({ count: 320, radius: 19, y0: 0.2, y1: 4.5, color: '#e9e3d6', size: 0.09, opacity: 0.4, swirl: 0.9, twinkle: 0.3, velocity: [0.12, 0, 0.05], rng: hr.fork('dust') }));

  // =============================================================== glimpses
  const poolAt = (c: number): [number, number] => {
    const a = Math.PI / 4 + 0.15 + Math.sin(c * 0.11) * 0.9 + Math.sin(c * 0.047 + 1) * 0.3;
    const r = 13.5 + Math.sin(c * 0.07 + 2) * 2.2;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  const beam = K.beam([0, 16, 0], [0, 0, 0], 3.2, 4.2, '#fff6e0', 0.22);
  root.add(beam);
  const poolMat = new THREE.MeshBasicMaterial({ map: K.glowTexture(), color: '#fff3d6', transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2), poolMat);
  pool.position.y = 0.04;
  root.add(pool);

  const glimpse = new THREE.Group();
  root.add(glimpse);
  const slitMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const slit = new THREE.Mesh(new THREE.PlaneGeometry(1, 2.5).translate(0, 1.25, 0), slitMat);
  glimpse.add(slit);
  const halo = K.glowSprite('#fff0d0', 4, 0);
  halo.position.y = 1.2;
  glimpse.add(halo);

  const iridMat = new THREE.ShaderMaterial({ vertexShader: IRID_VERT, fragmentShader: IRID_FRAG, uniforms: { uTime: K.U.time, uGold: { value: 0 }, uAlpha: { value: 1 } }, transparent: true, side: THREE.DoubleSide });
  const mr = rng.fork('marvels');
  const marvelGeos: THREE.BufferGeometry[] = [
    K.spiralStair(0.55, 2.6, 22, 1.6, 0.5, false),
    K.merge([0, 1, 2, 3, 4].map((i) => K.at(K.dome(0.32 + (i % 3) * 0.12, 6, 1, 1.4), Math.cos(i * 1.3) * 0.4, (i % 2) * 0.5, Math.sin(i * 1.3) * 0.4))),
    K.merge([0, 1, 2, 3, 4, 5].map((i) => K.at(K.archBand(1.3 - i * 0.16, 0.1, 0.12, 14, 1.4), 0, i * 0.05, -i * 0.32, { s: 1 }))),
    K.merge([...Array(70)].map(() => {
      const yy = mr.float(0.3, 2.6), rr = (2.7 - yy) * 0.32;
      return K.at(K.sphere(0.09, 4, 3), Math.cos(mr.angle()) * rr * mr.float(0.6, 1), yy, Math.sin(mr.angle()) * rr, { s: [1, 0.4, 1.8], ry: mr.angle() });
    }).concat([K.cyl(0.03, 0.05, 2.7, 5)])),
    K.merge([0, 1, 2, 3, 4, 5, 6].map((i) => K.at(K.torus(0.55 - i * 0.04, 0.05, 6, 32), 0, 0.3 + i * 0.34, 0, { rx: Math.sin(i) * 0.3, rz: Math.cos(i * 1.7) * 0.25 }))),
  ];
  const marvels = marvelGeos.map((g) => {
    const m = new THREE.Mesh(g, iridMat);
    m.visible = false;
    glimpse.add(m);
    return m;
  });
  // the gilt copy the ribbons press the marvel into
  const copyMat = new THREE.MeshStandardMaterial({ color: '#f3d48c', metalness: 0.5, roughness: 0.35, transparent: true, opacity: 1, emissive: '#3a2a08' });
  const copy = new THREE.Mesh(K.merge([K.box(0.56, 0.5, 0.56), K.at(K.gableRoof(0.56, 0.56, 0.32, 0.05), 0, 0.5, 0)]), copyMat);
  copy.scale.setScalar(0);
  glimpse.add(copy);
  // ribbons: helical strips printed with the glyphs
  const ribbonMat = new THREE.MeshStandardMaterial({ map: glyphTex, color: '#ffe2a0', metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0, emissive: '#6b4a10', emissiveIntensity: 0.4 });
  const cage = new THREE.Group();
  glimpse.add(cage);
  for (let i = 0; i < 7; i++) {
    const g = new THREE.PlaneGeometry(1, 1, 1, 40);
    const p = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let k = 0; k < p.count; k++) {
      const s = p.getY(k) + 0.5, wv = p.getX(k) * 0.07;
      const a = (i / 7) * TAU + s * Math.PI * 1.1;
      p.setXYZ(k, Math.cos(a) + Math.cos(a) * wv, s, Math.sin(a) + Math.sin(a) * wv + 0.0);
      p.setY(k, s + wv * 2);
      uv.setXY(k, s * 6, uv.getX(k));
    }
    g.computeVertexNormals();
    cage.add(new THREE.Mesh(g, ribbonMat));
  }
  // motes the free marvel breaks into
  const MOTES = 90;
  const moteDir: THREE.Vector3[] = [];
  const motePos = new Float32Array(MOTES * 3), moteCol = new Float32Array(MOTES * 3);
  const moteColors = ['#2fb2a2', '#ef7fa4', '#f3c55f', '#9fe6ff'].map((c) => new THREE.Color(c));
  for (let i = 0; i < MOTES; i++) {
    const [dx, dy, dz] = mr.onSphere();
    moteDir.push(new THREE.Vector3(dx, Math.abs(dy) * 1.4 + 0.2, dz).multiplyScalar(mr.float(0.6, 1.6)));
    const c = mr.pick(moteColors);
    moteCol.set([c.r * 2, c.g * 2, c.b * 2], i * 3);
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  moteGeo.setAttribute('color', new THREE.BufferAttribute(moteCol, 3));
  const moteMat = new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, map: K.glowTexture() });
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  glimpse.add(motes);

  // =============================================================== animation
  const ground = new K.Toggle(0.4);
  const START = 2.4, CYCLE = 9;
  let clock = 0, lastCycle = -1, free = false, kind = 0;
  const gpos = new THREE.Vector2();
  const tmpC = new THREE.Color();
  const ss = K.smoothstep;

  return {
    root,
    env: {
      skyTop: '#6d7381', skyHorizon: '#d7d1c5', skyBottom: '#9a958d', skyCurve: 0.55,
      fog: '#c5bfb3', fogNear: 70, fogFar: 190,
      sunDir: [-0.75, 0.32, 0.45], sunColor: '#ffd7a0', sunIntensity: 1.3, sunDisc: 0, sunGlow: 0.5,
      hemiSky: '#e6e2da', hemiGround: '#8d877c', hemiIntensity: 1.15, envIntensity: 0.85,
      clouds: 0.75, cloudColor: '#e8e3da', stars: 0,
      bloomStrength: 0.55, bloomThreshold: 0.85, bloomRadius: 0.5,
      shadowRadius: 24, vignette: 0.35, saturation: 1.0, contrast: 1.05, tiltShift: 0.35, grain: 0.04,
    },
    camera: {
      position: [28.8, 16.2, 28.8], target: [0, 6, 0], fov: 42,
      minDistance: 12, maxDistance: 80, maxPolar: 1.45, autoRotate: 0.35,
      views: [
        { position: [-6, 38, 22], target: [0, 3, 0] },
        { position: [21, 4.2, 10], target: [6, 4.5, -2] },
      ],
    },
    interaction: {
      label: 'Aglaura on the ground',
      activeLabel: 'Aglaura of the sayings',
      hint: 'The city that has no words for itself, seen only while you look.',
      set: (on) => ground.set(on),
      camera: { position: [24, 7.5, 21], target: [8, 1.2, 6] },
    },
    update(t, dt) {
      ground.update(dt);
      const gv = ground.value;
      upper.rotation.y = (t * TAU) / 240;
      glyphTex.offset.x = (t * 0.02) % 1;
      walkers.update(t);

      // the said city fades to an outline when attention goes to the ground
      for (const m of upperMats) m.opacity = 1 - 0.88 * gv;
      glyphMat.opacity = 1 - 0.9 * gv;
      edgeMat.opacity = gv * 0.9;
      upperMeshes.visible = gv < 0.995;
      privateSun.intensity = 90 * (1 - gv);
      groundMat.opacity = 0.72 + 0.28 * gv + Math.sin(t * 1.7) * 0.025 * (1 - gv);

      // the wandering break in the overcast
      clock += dt * (1 + gv);
      const [px, pz] = poolAt(t);
      beam.position.set(px, 16, pz);
      pool.position.set(px, 0.04, pz);

      // glimpse cycle
      let bubble = 0;
      const c = clock - START;
      if (c >= 0) {
        const n = Math.floor(c / CYCLE), ph = c - n * CYCLE;
        if (n !== lastCycle) {
          lastCycle = n;
          free = gv > 0.5;
          kind = n % 5;
          const cr = new K.RNG(911 + n * 31);
          const [cx, cz] = poolAt(t);
          const [ox, oz] = cr.inDisc(2.6);
          gpos.set(cx + ox, cz + oz);
          marvels.forEach((m, i) => (m.visible = i === kind));
          marvels[kind].rotation.y = cr.angle();
        }
        glimpse.position.set(gpos.x, 0.02, gpos.y);
        const cam = ctx.camera.position;
        slit.rotation.y = Math.atan2(cam.x - gpos.x, cam.z - gpos.y);
        const open = ss(0, 1, ph);
        const marvel = marvels[kind];
        let mScale = ss(0.3, 1.5, ph), gold = 0, alpha = 1, copyS = 0, copyGrey = 0, ribbonA = 0, cageR = 1.8, cageBottom = 6.4, moteK = 0;
        if (!free) {
          slit.scale.set(K.lerp(0.1, 1.4, open), 1, 1);
          slitMat.opacity = open * (1 - ss(1.4, 2.6, ph)) * 0.9;
          bubble = ss(0.2, 1.3, ph) * (1 - ss(4.4, 5.6, ph));
          const desc = ss(2.6, 4.4, ph);
          cageBottom = 6.4 * (1 - desc);
          ribbonA = ss(2.6, 3.0, ph) * (1 - ss(6.0, 7.0, ph));
          const close = ss(4.4, 5.6, ph);
          cageR = K.lerp(1.8, 0.62, close);
          gold = close;
          mScale *= 1 - 0.85 * close;
          copyS = ss(4.8, 5.6, ph);
          copyGrey = ss(5.6, 6.6, ph);
          alpha = 1 - ss(5.4, 5.8, ph);
          copyMat.opacity = 1 - ss(6.2, 7.4, ph);
        } else {
          slit.scale.set(K.lerp(0.1, 2.0, open), 1, 1);
          slitMat.opacity = open * (1 - ss(1.6, 3.0, ph)) * 1.0;
          bubble = ss(0.2, 1.3, ph) * (1 - ss(4.2, 6.0, ph));
          mScale *= 1 + 0.3 * ss(3.4, 5, ph);
          alpha = 1 - ss(3.4, 4.6, ph);
          moteK = ss(3.3, 6.5, ph);
          moteMat.opacity = ss(3.2, 3.6, ph) * (1 - ss(5.2, 6.8, ph));
        }
        if (free) cageBottom = 6.4, ribbonA = 0;
        if (!free) moteMat.opacity = 0;
        marvel.scale.setScalar(Math.max(0.001, mScale) * (free ? 1.15 : 1));
        marvel.visible = alpha > 0.01 && mScale > 0.01;
        iridMat.uniforms.uGold.value = gold;
        iridMat.uniforms.uAlpha.value = alpha;
        (halo.material as THREE.SpriteMaterial).opacity = (open * (1 - ss(2.5, 4.5, ph)) + (free ? moteMat.opacity * 0.5 : 0)) * 0.8;
        copy.scale.setScalar(copyS * 1.4);
        copy.visible = copyS > 0.001 && copyMat.opacity > 0.01;
        copyMat.color.set('#f3d48c').lerp(tmpC.set('#a8a49c'), copyGrey);
        copyMat.emissive.set('#3a2a08').multiplyScalar(1 - copyGrey);
        // ribbons hang from the underside of the said city (y 6.4) down to the marvel
        cage.visible = ribbonA > 0.01;
        ribbonMat.opacity = ribbonA;
        cage.position.y = cageBottom;
        cage.scale.set(cageR, Math.max(0.05, 6.4 - cageBottom + 0.3), cageR);
        cage.rotation.y = ph * 0.9;
        // motes
        motes.visible = moteMat.opacity > 0.01;
        if (motes.visible) {
          for (let i = 0; i < MOTES; i++) {
            const d = moteDir[i];
            motePos[i * 3] = d.x * moteK * 2.2;
            motePos[i * 3 + 1] = 1.2 + d.y * moteK * 2.6;
            motePos[i * 3 + 2] = d.z * moteK * 2.2;
          }
          moteGeo.attributes.position.needsUpdate = true;
        }
      }
      // colour flooding back into the houses near the glimpse (and, while looking, everywhere)
      for (let i = 0; i < N; i++) {
        const h = houses[i];
        const dist = Math.hypot(h.x - gpos.x, h.z - gpos.y);
        const k = Math.max(bubble * (1 - ss(0.5, 3.4, dist)), gv * 0.28);
        tmpC.copy(h.base).lerp(h.tint, k);
        bodies.setColorAt(i, tmpC);
        roofs.setColorAt(i, tmpC.multiplyScalar(0.82));
      }
      bodies.instanceColor!.needsUpdate = true;
      roofs.instanceColor!.needsUpdate = true;
    },
  };
};

export default build;
