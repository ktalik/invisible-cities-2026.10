// DOROTHEA - Cities & Desire 1.
// Two ways to tell it. As an inventory: four aluminium towers, seven gates with
// spring drawbridges over a moat that feeds four green canals, nine quarters of
// three hundred houses and seven hundred chimneys each, families trading bergamot,
// sturgeon roe, astrolabes and amethysts, from which every future can be computed.
// Or as one camel driver's young morning, when wheels turned, lettered banners
// waved, and every road seemed to start at its gates. Toggle: Count / Remember.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const QC = [-10.05, 0, 10.05]; // quarter centres on each axis
  const quarters: [number, number][] = [];
  for (const qz of QC) for (const qx of QC) quarters.push([qx, qz]);

  // ---- desert with dune ripples, the moat bed sunk around the walls
  const ground = (x: number, z: number) => {
    const d = Math.max(Math.abs(x), Math.abs(z));
    if (d < 16.9) return -0.7;
    return 0.12 + 0.45 * K.fbm2(x * 0.05, z * 0.05, 3) + 0.12 * Math.sin(x * 0.35 + K.noise2(x * 0.03, z * 0.03) * 3) + Math.max(0, d - 18) * 0.015;
  };
  root.add(K.terrain({ width: 220, depth: 220, seg: 176, height: ground, color: (_x, y, _z, o) => o.set('#dcc59e').multiplyScalar(0.9 + y * 0.12) }));
  const water = K.waterRect(34, 34, 0, -0.3, 0, 0, { color: '#2f9d7a', amp: 0.2, scale: 0.8 });
  root.add(water);

  const b = new K.Batch();
  // quarter slabs (canals are the gaps between them)
  const QE = [[-14.7, -5.4], [-4.2, 4.2], [5.4, 14.7]];
  for (const [x0, x1] of QE) for (const [z0, z1] of QE) b.add(K.at(K.box(x1 - x0, 0.7, z1 - z0), (x0 + x1) / 2, -0.7, (z0 + z1) / 2), '#cdb48c', 'stone');
  // walls with seven gates
  const GATES: { x: number; z: number; nx: number; nz: number }[] = [
    { x: -10.05, z: -15, nx: 0, nz: -1 }, { x: 10.05, z: -15, nx: 0, nz: -1 },
    { x: 15, z: -10.05, nx: 1, nz: 0 }, { x: 15, z: 10.05, nx: 1, nz: 0 },
    { x: -10.05, z: 15, nx: 0, nz: 1 }, { x: 10.05, z: 15, nx: 0, nz: 1 },
    { x: -15, z: 0, nx: -1, nz: 0 },
  ];
  const SAND = '#d4b483';
  for (const [nx, nz] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
    const gs = GATES.filter((g) => g.nx === nx && g.nz === nz).map((g) => (nx ? g.z : g.x)).sort((a, c) => a - c);
    let s0 = -15.3;
    for (const gc of [...gs, 15.3 + 0.7]) {
      const s1 = gc - 0.7, len = s1 - s0;
      if (len > 0.01) {
        const m = (s0 + s1) / 2;
        b.add(K.at(K.box(nx ? 0.6 : len, 2.9, nx ? len : 0.6), nx ? nx * 15 : m, -0.7, nx ? m : nz * 15), SAND, 'stone');
      }
      s0 = gc + 0.7;
    }
    for (const gc of gs) {
      const [gx, gz] = nx ? [nx * 15, gc] : [gc, nz * 15];
      for (const s of [-0.95, 0.95]) b.add(K.at(K.box(nx ? 1.0 : 0.5, 3.3, nx ? 0.5 : 1.0), gx + (nx ? 0 : s), -0.7, gz + (nx ? s : 0)), '#c9a46f', 'stone');
      b.add(K.at(K.box(nx ? 0.8 : 1.9, 0.6, nx ? 1.9 : 0.8), gx, 1.6, gz), '#c9a46f', 'stone');
    }
  }
  // merlons along the wall top
  for (let i = 0; i < 4; i++) for (let k = 0; k < 38; k++) {
    const s = -14.6 + k * 0.79;
    if (GATES.some((g) => Math.abs((i < 2 ? g.x : g.z) - s) < 1.0 && (i < 2 ? g.nz === (i ? 1 : -1) : g.nx === (i === 2 ? 1 : -1)))) continue;
    const [x, z] = i < 2 ? [s, i ? 15 : -15] : [i === 2 ? 15 : -15, s];
    b.add(K.at(K.box(0.32, 0.3, 0.32), x, 2.2, z), SAND, 'stone');
  }
  // four aluminium towers on the corners
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    K.tower(b, { x: sx * 15, y: -0.7, z: sz * 15, r: 0.9, h: 10.7, sides: 24, taper: 0.88, top: 'cone', topH: 1.3, color: '#cfd6de', finish: 'polished', topColor: '#cfd6de', topFinish: 'polished', bands: 3.6, bandColor: '#aeb8c2' });
  }
  // footbridges: two per canal segment
  for (const c of [-4.8, 4.8]) for (const q of QC) for (const o of [-2.2, 2.2]) {
    b.add(K.at(K.archBand(1.6, 0.12, 0.5, 10, 0.5), c, -0.05, q + o, { ry: Math.PI / 2 }), '#e2cfa8', 'stone');
    b.add(K.at(K.archBand(1.6, 0.12, 0.5, 10, 0.5), q + o, -0.05, c), '#e2cfa8', 'stone');
  }

  // ---- 300 houses and 700 chimneys in every quarter (exact census)
  type Hs = { x: number; z: number; w: number; h: number; q: number };
  const houses: Hs[] = [];
  const plazas: [number, number, number][] = [];
  quarters.forEach(([qx, qz], qi) => {
    const slots: [number, number][] = [];
    const P = 8.2 / 22, half = qi === 4 ? 1.3 : 1.0;
    for (let i = 0; i < 22; i++) for (let j = 0; j < 22; j++) {
      if (i % 7 === 6 || j % 7 === 6) continue;
      const u = (i - 10.5) * P, v = (j - 10.5) * P;
      if (Math.abs(u) < half && Math.abs(v) < half) continue;
      slots.push([qx + u, qz + v]);
    }
    const qr = rng.fork('q' + qi);
    qr.shuffle(slots);
    for (const [x, z] of slots.slice(0, 300)) houses.push({ x, z, w: qr.float(0.27, 0.33), h: qr.float(0.35, 0.9), q: qi });
    plazas.push([qx, qz, half]);
  });
  const NH = houses.length;
  const STUCCO = ['#ead6b0', '#e2c79c', '#f0e0c2', '#d9b98c', '#e8cfa6', '#f2e6cf'];
  const houseMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
  const baseCol = houses.map(() => K.pickJitter(STUCCO, rng));
  const houseMesh = K.instanced(K.box(1, 1, 1), houseMat, NH, (i, o, c) => {
    const hs = houses[i];
    o.position.set(hs.x, 0, hs.z);
    o.scale.set(hs.w, hs.h, hs.w);
    c.copy(baseCol[i]);
  });
  root.add(houseMesh);
  const chim: [number, number, number][] = [];
  for (let q = 0; q < 9; q++) {
    const qh = houses.filter((h) => h.q === q);
    qh.forEach((hs, k) => {
      const n = k < 100 ? 3 : 2;
      for (let c = 0; c < n; c++) {
        const a = c * 2.1 + k;
        chim.push([hs.x + Math.cos(a) * hs.w * 0.3, hs.h, hs.z + Math.sin(a) * hs.w * 0.3]);
      }
    });
  }
  root.add(K.instanced(K.box(0.045, 0.13, 0.045), K.std('#b98e6e', { roughness: 0.9 }), chim.length, (i, o) => { o.position.set(...chim[i]); }, { colors: false }));

  // ---- plazas: goods of the four monopolies, the central market and the trumpeters' platform
  const GOODS = ['#b8c84a', '#1d1d24', '#c9a24c', '#8c5ac8'];
  plazas.forEach(([qx, qz, half], qi) => {
    b.add(K.at(K.box(half * 2, 0.02, half * 2), qx, 0, qz), '#e8d6b4', 'stone');
    if (qi === 4) return;
    const g = GOODS[qi % 4];
    for (let k = 0; k < 9; k++) {
      const x = qx - 0.5 + (k % 3) * 0.35, z = qz - 0.5 + Math.floor(k / 3) * 0.35;
      if (qi % 4 === 2) b.add(K.at(K.cyl(0.13, 0.13, 0.03, 14), x, 0.02 + (k % 2) * 0.03, z), g, 'bronze');
      else b.add(K.at(K.sphere(qi % 4 === 3 ? 0.09 : 0.07, 7, 5), x, 0.08, z), g, qi % 4 === 1 ? 'polished' : 'ceramic');
    }
  });
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    K.stall(b, { x: Math.cos(a) * 1.0, z: Math.sin(a) * 1.0, ry: -a + Math.PI / 2, w: 0.42, d: 0.3, h: 0.36, cloth: ['#c84a3a', '#2f9d7a', '#e0b040', '#4a6ac8'][k % 4] });
  }
  b.add(K.at(K.box(1.2, 0.5, 0.8), 0, 0, 0), '#7a5a3a', 'wood');

  // ---- springs at the drawbridge hinges, roads into the desert
  const roadDust: THREE.BufferGeometry[] = [];
  const roadPos: number[] = [], roadIdx: number[] = [], roadAttr: number[] = [];
  let ri = 0, caravanRoad: THREE.Vector3[] = [];
  GATES.forEach((g) => {
    const tx = -g.nz, tz = g.nx;
    for (const s of [-0.55, 0.55]) {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 40; k++) { const a = k * 0.9, w = s + (k / 40 - 0.5) * 0.3; pts.push(new THREE.Vector3(g.x + g.nx * (0.45 + Math.cos(a) * 0.09) + tx * w, 0.02 + Math.sin(a) * 0.09, g.z + g.nz * (0.45 + Math.cos(a) * 0.09) + tz * w)); }
      b.add(K.tube(pts, 0.018, 120, 4), '#7d8794', 'metal');
    }
    for (const da of [-0.42, 0, 0.42]) {
      const base = Math.atan2(g.nz, g.nx) + da;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 60; k++) {
        const r = k * 1.0;
        const wig = K.noise2(ri * 3.1, k * 0.08) * 0.25;
        const a = base + wig * (r / 60);
        const x = g.x + g.nx * 2.3 + Math.cos(a) * r, z = g.z + g.nz * 2.3 + Math.sin(a) * r;
        pts.push(new THREE.Vector3(x, Math.max(ground(x, z), 0) + 0.05, z));
      }
      if (g.nx === -1 && da === 0) caravanRoad = pts;
      const off = roadPos.length / 3;
      pts.forEach((p, k) => {
        const n = k < pts.length - 1 ? pts[k + 1].clone().sub(p) : p.clone().sub(pts[k - 1]);
        const side = new THREE.Vector3(-n.z, 0, n.x).normalize().multiplyScalar(0.28);
        roadPos.push(p.x + side.x, p.y + 0.02, p.z + side.z, p.x - side.x, p.y + 0.02, p.z - side.z);
        roadAttr.push(ri, k, ri, k);
        if (k < pts.length - 1) roadIdx.push(off + k * 2, off + k * 2 + 1, off + k * 2 + 2, off + k * 2 + 1, off + k * 2 + 3, off + k * 2 + 2);
      });
      for (let k = 1; k < pts.length; k++) {
        const p = pts[k - 1], q = pts[k];
        const g2 = K.box(0.55, 0.03, p.distanceTo(q) + 0.05);
        roadDust.push(K.at(g2, (p.x + q.x) / 2, (p.y + q.y) / 2 - 0.02, (p.z + q.z) / 2, { ry: Math.atan2(q.x - p.x, q.z - p.z) }));
      }
      ri++;
    }
  });
  b.add(K.merge(roadDust), '#d6bb8e', 'matte');
  // drawbridge hinges sit outside the gates; tie-off posts for banner strings
  root.add(b.build({ name: 'dorothea' }));
  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPos, 3));
  roadGeo.setAttribute('aRoad', new THREE.Float32BufferAttribute(roadAttr, 2));
  roadGeo.setIndex(roadIdx);
  const roadMat = new THREE.ShaderMaterial({
    uniforms: { uOpen: { value: 0 }, uTime: K.U.time },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute vec2 aRoad; varying vec2 vR; void main(){ vR = aRoad; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uOpen, uTime; varying vec2 vR;
      void main(){
        float start = vR.x * 0.35;
        float reach = clamp((uOpen - start) * 14.0 - vR.y, 0.0, 1.0);
        float pulse = 0.7 + 0.3 * sin(vR.y * 0.4 - uTime * 2.0 + vR.x);
        float a = reach * pulse * (1.0 - vR.y / 64.0) * 0.55;
        gl_FragColor = vec4(vec3(1.0, 0.75, 0.35) * a, a);
      }`,
  });
  root.add(new THREE.Mesh(roadGeo, roadMat));

  // ---- drawbridges (pivot at the outer wall foot)
  const bridges = GATES.map((g) => {
    const piv = new THREE.Group();
    piv.position.set(g.x + g.nx * 0.3, -0.05, g.z + g.nz * 0.3);
    piv.rotation.y = Math.atan2(g.nx, g.nz);
    const plank = new THREE.Mesh(K.at(K.box(1.4, 0.1, 1.8), 0, 0, 0.9), K.std('#7a5636', { roughness: 0.85 }));
    plank.castShadow = true;
    piv.add(plank);
    root.add(piv);
    return piv;
  });

  // ---- COUNT: census tallies, scan plane, ledger arcs with goods beads
  const tallies = quarters.map(([qx, qz]) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 80;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set(3.2, 1.0, 1);
    sp.position.set(qx, 3.2, qz);
    root.add(sp);
    return { canvas, tex, sp, last: -1 };
  });
  const drawTally = (k: number, h: number) => {
    const T = tallies[k];
    if (T.last === h) return;
    T.last = h;
    const g = T.canvas.getContext('2d')!;
    g.clearRect(0, 0, 256, 80);
    g.fillStyle = 'rgba(20,28,52,0.55)'; g.fillRect(4, 4, 248, 72);
    g.strokeStyle = '#cdd6e0'; g.lineWidth = 2; g.strokeRect(4, 4, 248, 72);
    g.fillStyle = '#f2f5fa'; g.font = `600 30px ${K.DISPLAY_FONT}`; g.textAlign = 'center';
    g.fillText(`${h} houses`, 128, 36);
    g.font = `italic 24px ${K.DISPLAY_FONT}`;
    g.fillText(`${Math.round((h * 7) / 3)} chimneys`, 128, 66);
    T.tex.needsUpdate = true;
  };
  tallies.forEach((_, k) => drawTally(k, 300));
  const scanMat = new THREE.MeshBasicMaterial({ color: '#9fd8ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 2.2).translate(0, 1.1, 0), scanMat);
  scan.scale.set(1, 1, 1);
  root.add(scan);
  const scanBar = new THREE.Mesh(K.box(0.12, 1.4, 9.2), scanMat);
  root.add(scanBar);
  const arcs: THREE.Vector3[][] = [];
  const arcPairs: [K.V3, K.V3][] = [];
  for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) {
    const A = new THREE.Vector3(quarters[i][0], 1.2, quarters[i][1]), B = new THREE.Vector3(quarters[j][0], 1.2, quarters[j][1]);
    const M = A.clone().lerp(B, 0.5).setY(2.2 + A.distanceTo(B) * 0.28);
    const pts = new THREE.QuadraticBezierCurve3(A, M, B).getPoints(24);
    arcs.push(pts);
    for (let k = 1; k < pts.length; k++) arcPairs.push([pts[k - 1], pts[k]]);
  }
  const arcLines = K.lines(arcPairs, '#cdd6e0', 0.5);
  (arcLines.material as THREE.LineBasicMaterial).transparent = true;
  root.add(arcLines);
  const beadMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, metalness: 0.3, emissive: '#222222' });
  const beads = K.instanced(K.sphere(0.13, 10, 8), beadMat, arcs.length * 2, (i, _o, c) => { c.set(GOODS[i % 4]); }, { castShadow: false });
  root.add(beads);
  const setBead = K.instanceSetter(beads);

  // ---- REMEMBER: townsfolk, trumpeters, wheels, banners, sunrise, caravan
  const folkPaths: THREE.Vector3[][] = [];
  quarters.forEach(([qx, qz], qi) => {
    if (qi === 4) return;
    for (let k = 0; k < 4; k++) {
      const sx = qx + (k % 2 ? 1 : -1) * 1.2, sz = qz + (k < 2 ? 1 : -1) * 1.2;
      const bx = Math.abs(qx) > 1 ? Math.sign(qx) * 4.8 : (k % 2 ? 2.2 : -2.2), bz = Math.abs(qz) > 1 ? Math.sign(qz) * 4.8 : (k < 2 ? 2.2 : -2.2);
      folkPaths.push([new THREE.Vector3(sx, 0.02, sz), new THREE.Vector3(Math.abs(qx) > 1 ? qx : bx, 0.02, Math.abs(qz) > 1 ? qz * 0.6 : bz), new THREE.Vector3(bx * 0.75, 0.02, bz * 0.75), new THREE.Vector3(Math.cos(k + qi) * 1.6, 0.02, Math.sin(k + qi) * 1.6)]);
    }
  });
  const folk = new K.Walkers({ paths: folkPaths, count: 900, rng: rng.fork('folk'), speed: [0.25, 0.5], h: 0.25, colors: ['#c84a3a', '#2f9d7a', '#e0b040', '#4a6ac8', '#f2ead8', '#8a3a6a', '#3a3a3a'] });
  root.add(folk.mesh);
  const soldierMesh = K.instanced(K.merge([K.personGeometry(0.3), K.paint(K.at(K.cone(0.03, 0.16, 6), 0, 0.27, 0.1, { rx: Math.PI / 2 }), '#d9a640')]), K.figureMaterial(), 3, (i, o, c) => { o.position.set(-0.4 + i * 0.4, 0.5, 0); c.set('#a83a2a'); });
  root.add(soldierMesh);
  const setSold = K.instanceSetter(soldierMesh);
  const rings = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(K.torus(1, 0.015, 4, 48), new THREE.MeshBasicMaterial({ color: '#ffe2a0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.set(0, 1.0, 0);
    root.add(m);
    return m;
  });
  const wheelGeo = K.merge([K.at(K.torus(0.45, 0.04, 5, 20), 0, 0, 0, { rx: Math.PI / 2 }), ...[0, 1, 2, 3, 4, 5].map((k) => K.at(K.box(0.04, 0.88, 0.12), 0, -0.44, 0, { rz: (k * Math.PI) / 6 }))]);
  const WW: [number, number, number][] = [];
  for (const c of [-4.8, 4.8]) for (const q of QC) { WW.push([c + 0.45, q + 1.1, 0]); WW.push([q - 1.1, c - 0.45, 1]); }
  const wheels = K.instanced(wheelGeo, K.std('#6a4a30', { roughness: 0.8 }), WW.length, undefined, { colors: false });
  root.add(wheels);
  const setWheel = K.instanceSetter(wheels);
  const pin = K.merge([0, 1, 2, 3].map((k) => K.at(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.25, 0, 0, 0.12, 0.13, 0], 3)), 0, 0, 0, { rz: (k * Math.PI) / 2 })));
  pin.computeVertexNormals();
  const tall = [...houses].sort((a, c) => c.h - a.h).slice(0, 48);
  const pinMesh = K.instanced(pin, new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.6 }), 48, (i, _o, c) => { c.set(['#c84a3a', '#2f9d7a', '#e0b040', '#4a6ac8'][i % 4]); }, { castShadow: false });
  root.add(pinMesh);
  const setPin = K.instanceSetter(pinMesh);
  root.add(K.instanced(K.cyl(0.012, 0.012, 0.45, 4), K.std('#5a4632'), 48, (i, o) => { o.position.set(tall[i].x, tall[i].h, tall[i].z); }, { colors: false }));
  const letterTex = K.canvasTexture(128, 96, (g, w, h) => {
    g.fillStyle = '#f6efe0'; g.fillRect(0, 0, w, h);
    const inks = ['#c84a3a', '#2f6a9d', '#2f9d7a', '#8a3a6a', '#d08a20'];
    for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) {
      g.strokeStyle = inks[(r * 2 + k) % inks.length]; g.lineWidth = 5; g.beginPath();
      const x = 12 + k * 18, y = 18 + r * 28;
      g.moveTo(x, y + 14); g.quadraticCurveTo(x + 4 + (k % 3) * 3, y - 6, x + 12, y + 12 - (k % 2) * 8); g.stroke();
    }
  });
  const BAN: { x: number; y: number; z: number; ry: number }[] = [];
  for (let k = 0; k < 80; k++) {
    const [qx, qz] = quarters[k % 9];
    const along = ((k / 9) | 0) - 4;
    const lane = (k % 2 ? 1 : -1) * (6.5 * 8.2 / 22 - 4.1 + 0.18);
    BAN.push(k % 2 ? { x: qx + along * 0.85, y: 1.15, z: qz + lane, ry: 0 } : { x: qx + lane, y: 1.15, z: qz + along * 0.85, ry: Math.PI / 2 });
  }
  const banners = K.instanced(new THREE.PlaneGeometry(0.42, 0.3).translate(0, -0.15, 0), new THREE.MeshStandardMaterial({ map: letterTex, side: THREE.DoubleSide, roughness: 0.8 }), BAN.length, undefined, { castShadow: false, colors: false });
  root.add(banners);
  const setBan = K.instanceSetter(banners);
  // caravan: five camels and the driver on the western road
  const camel = K.quadruped({ len: 0.55, h: 0.55, hump: true, longNeck: true, tail: 0.1, color: '#b08850' });
  const caravan = K.instanced(K.merge([camel]), K.std('#ffffff', { vertexColors: true, roughness: 0.9 }), 6, undefined, { colors: false });
  root.add(caravan);
  const setCar = K.instanceSetter(caravan);
  const driver = new THREE.Mesh(K.personGeometry(0.3), K.std('#2f6a9d', { vertexColors: true }));
  root.add(driver);
  const carAcc = [0];
  for (let k = 1; k < caravanRoad.length; k++) carAcc.push(carAcc[k - 1] + caravanRoad[k].distanceTo(caravanRoad[k - 1]));
  const roadAt = (s: number, out: THREE.Vector3) => {
    let k = 1;
    while (k < carAcc.length - 1 && carAcc[k] < s) k++;
    const u = K.clamp((s - carAcc[k - 1]) / (carAcc[k] - carAcc[k - 1]));
    out.lerpVectors(caravanRoad[k - 1], caravanRoad[k], u);
    return Math.atan2(caravanRoad[k].x - caravanRoad[k - 1].x, caravanRoad[k].z - caravanRoad[k - 1].z);
  };
  const smoke = K.smoke({ sources: chim.filter((_, i) => i % 400 === 0).map(([x, y, z]) => new THREE.Vector3(x, y + 0.2, z)), perSource: 14, height: 3, color: '#efe4d2', opacity: 0, size: [0.2, 0.7], life: 7, wind: [-0.3, 0.1], rng: rng.fork('smoke') });
  root.add(smoke);
  const smokeU = (smoke.material as THREE.ShaderMaterial).uniforms.uOpacity;
  const motes = K.particles({ count: 300, radius: 26, y0: 0.2, y1: 6, color: '#ffd9a0', size: 0.07, opacity: 0, swirl: 0.8, rng: rng.fork('motes') });
  root.add(motes);
  const motesU = (motes.material as THREE.ShaderMaterial).uniforms.uOpacity;
  const sunSprite = K.glowSprite('#ffd27a', 40, 0);
  root.add(sunSprite);
  const morning = new THREE.DirectionalLight('#ffc88a', 0);
  morning.position.set(60, 12, -26);
  morning.castShadow = true;
  morning.shadow.mapSize.set(2048, 2048);
  Object.assign(morning.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 140 });
  morning.shadow.bias = -0.0005;
  root.add(morning);

  const tog = new K.Toggle(0.25);
  const tmp = new THREE.Vector3(), FLASH = new THREE.Color('#bfe6ff').multiplyScalar(1.6), tc = new THREE.Color();

  return {
    root,
    env: {
      skyTop: '#7b86b9',
      skyHorizon: '#f6c384',
      skyBottom: '#c7a988',
      skyCurve: 0.5,
      fog: '#e8cfa8',
      fogNear: 80,
      fogFar: 230,
      sunDir: [0.85, 0.12, -0.38],
      sunColor: '#b9c6ec',
      sunIntensity: 0.6,
      sunDisc: 0,
      sunGlow: 1.0,
      hemiSky: '#aab6dc',
      hemiGround: '#b89a78',
      hemiIntensity: 1.3,
      envIntensity: 1.0,
      stars: 0.2,
      clouds: 0.2,
      cloudColor: '#f6d2a8',
      bloomStrength: 0.55,
      bloomThreshold: 0.82,
      tiltShift: 0.35,
      shadowRadius: 26,
      vignette: 0.35,
      saturation: 0.92,
    },
    camera: {
      position: [-11, 52, 28],
      target: [0, 0, 0],
      fov: 38,
      minDistance: 6,
      maxDistance: 120,
      autoRotate: 0.12,
      views: [
        { position: [44, 20, -18], target: [0, 1, 0] },
        { position: [-2.8, 3.6, 4.8], target: [0, 0.4, 0] },
      ],
    },
    interaction: {
      label: 'Remember',
      activeLabel: 'Count',
      hint: 'Counted, it computes a future; remembered, it opens every road.',
      set: (on) => tog.set(on),
      camera: { position: [-34.5, 11.5, 3], target: [0, 2, 0] },
    },
    update(t, dt) {
      tog.update(dt);
      const v = tog.value, c = 1 - v;
      // COUNT: census sweep over the nine quarters
      const lt = t % 27, q = Math.floor(lt / 3), f = (lt % 3) / 3;
      const [qx, qz] = quarters[q];
      const sx = qx - 4.1 + f * 8.2;
      scanBar.position.set(sx, 0, qz);
      scanMat.opacity = 0.35 * c * Math.sin(Math.PI * f);
      scan.visible = false;
      tallies.forEach((T, k) => {
        (T.sp.material as THREE.SpriteMaterial).opacity = c;
        T.sp.visible = c > 0.01;
        drawTally(k, k === q ? Math.min(300, Math.floor(f * 1.25 * 300)) : 300);
      });
      for (let i = q * 300; i < q * 300 + 300; i++) {
        const fl = Math.exp(-(((houses[i].x - sx) / 0.35) ** 2)) * c;
        houseMesh.setColorAt(i, tc.copy(baseCol[i]).lerp(FLASH, fl));
      }
      const pq = (q + 8) % 9;
      for (let i = pq * 300; i < pq * 300 + 300; i++) houseMesh.setColorAt(i, baseCol[i]);
      if (houseMesh.instanceColor) houseMesh.instanceColor.needsUpdate = true;
      (arcLines.material as THREE.LineBasicMaterial).opacity = 0.45 * c;
      arcLines.visible = beads.visible = c > 0.01;
      arcs.forEach((pts, i) => {
        for (let k = 0; k < 2; k++) {
          const u = K.pingpong(t * (0.05 + (i % 5) * 0.012) + k * 0.5 + i * 0.13, 1);
          const p = pts[Math.min(pts.length - 1, Math.floor(u * (pts.length - 1)))];
          setBead(i * 2 + k, p.x, p.y, p.z, 0, c);
        }
      });
      setBead.done();
      // REMEMBER: the morning
      morning.intensity = v * 3.2;
      sunSprite.position.set(150, -12 + v * 26, -65);
      (sunSprite.material as THREE.SpriteMaterial).opacity = v;
      roadMat.uniforms.uOpen.value = v > 0.5 ? (roadMat.uniforms.uOpen.value as number) + dt * 0.5 : Math.max(0, (roadMat.uniforms.uOpen.value as number) - dt * 2);
      smokeU.value = 0.35 * v;
      motesU.value = 0.55 * v;
      folk.mesh.visible = v > 0.3;
      if (folk.mesh.visible) folk.update(t);
      bridges.forEach((p, i) => {
        const k = K.clamp(v * 1.6 - i * 0.08);
        const bounce = k >= 1 ? 1 : 1 - Math.cos(k * Math.PI * 2.5) * Math.exp(-k * 4) * (1 - k);
        p.rotation.x = -(Math.PI / 2) * (1 - K.clamp(bounce, 0, 1.08));
      });
      for (let i = 0; i < 3; i++) setSold(i, -0.4 + i * 0.4, 0.5, 0, Math.PI / 2 * (i - 1) * 0.3, 1, -0.35 * v * (0.8 + 0.2 * Math.sin(t * 3 + i)));
      setSold.done();
      rings.forEach((r, i) => {
        const k = K.fract(t / 3 + i / 3);
        r.scale.setScalar(0.5 + k * 6);
        (r.material as THREE.MeshBasicMaterial).opacity = v * (1 - k) * 0.4;
      });
      WW.forEach(([x, z, ax], i) => setWheel(i, x, -0.12, z, ax ? 0 : Math.PI / 2, 1, 0, t * 0.9 * v + i));
      setWheel.done();
      tall.forEach((h, i) => setPin(i, h.x, h.h + 0.42, h.z, Math.PI / 2, 1, 0, t * 4 * v + i));
      setPin.done();
      BAN.forEach((bn, i) => setBan(i, bn.x, bn.y, bn.z, bn.ry, v > 0.01 ? [v, v, v] : 0, Math.sin(t * 3 + i) * 0.35 * v));
      setBan.done();
      const total = carAcc[carAcc.length - 1];
      const head = 4 + K.fract(t / 120) * (total - 10);
      for (let i = 0; i < 6; i++) {
        const ry = roadAt(head - i * 0.75, tmp);
        if (i === 0) { driver.position.copy(tmp).setY(tmp.y + Math.abs(Math.sin(t * 4)) * 0.01); driver.rotation.y = ry; continue; }
        setCar(i, tmp.x, tmp.y + Math.abs(Math.sin(t * 2.5 + i)) * 0.02, tmp.z, ry, 1);
      }
      setCar(0, 0, -50, 0, 0, 0);
      setCar.done();
    },
  };
};

export default build;
