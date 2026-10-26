// EUTROPIA - Trading Cities 3.
// Eight identical cities stand on the squares of a grassy board; only one is lived
// in. When weariness sets in (its windows yawn), the whole population rolls as a
// stream of quicksilver beads along the road to the next copy, where everyone takes
// a new role colour, and the pattern of the city is exactly what it was before.
// Toggle: fold the seven empty copies onto the inhabited one.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

type Site = { c: number; r: number; kind: string; x: number; z: number; tilt: number; mod: number; h: number };
const SITES: [number, number, string][] = [[1, 0, 'slope'], [4, 0, 'crest'], [2, 2, 'stream'], [5, 2, 'pond'], [0, 3, 'hollow'], [3, 4, 'meadow'], [1, 5, 'boulders'], [5, 5, 'orchard']];
const ROT = [0, 2, 4, 6, 5, 7, 3, 1];
const ROLES = ['#c4673f', '#3f6f9a', '#d9b44a', '#6f8f4a', '#8a4f7a', '#e8e2d2', '#4a4a52', '#d98a8a'];
const PERIOD = 50, LIFE = 40;
const NB = 120;

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const sites: Site[] = SITES.map(([c, r, kind]) => ({
    c, r, kind, x: -15 + 6 * c, z: -15 + 6 * r,
    tilt: kind === 'slope' ? (7 * Math.PI) / 180 : 0, mod: kind === 'hollow' ? -1.1 : kind === 'crest' ? 1.0 : 0, h: 0,
  }));

  // ---- the plateau: an island base and a vertex-coloured relief with the faint board
  const isl = K.island({ radius: 26.6, flat: 26, depth: 10, hills: 0, top: '#93a06b', edge: '#8a9466', cliff: '#8c8068', under: '#4f4a40', strata: '#a89a7a', seed: 5 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -8, color: '#f2ead8', shadow: '#9aa0a8', opacity: 0.6, coverage: 0.45 }));
  const base = (x: number, z: number) => {
    let h = 0.55 + K.fbm2(x * 0.06 + 3, z * 0.06, 3) * 0.9;
    for (const s of sites) if (s.mod) h += s.mod * Math.exp(-((x - s.x) ** 2 + (z - s.z) ** 2) / 14);
    return h;
  };
  for (const s of sites) s.h = base(s.x, s.z);
  const heightAt = (x: number, z: number, flat = 0) => {
    const r = Math.hypot(x, z);
    let h = base(x, z);
    for (const s of sites) {
      const w = 1 - K.smoothstep(2.9, 4.3, Math.hypot(x - s.x, z - s.z));
      if (w > 0) h = K.lerp(h, s.h + Math.tan(s.tilt) * (x - s.x), w);
    }
    h = K.lerp(h, 0.55, flat);
    const rim = isl.rimAt(Math.atan2(z, x));
    return 0.03 + h * (1 - K.smoothstep(rim - 3.5, rim - 0.9, r));
  };
  const SEG = 130, W = 54;
  const tgeo = new THREE.PlaneGeometry(W, W, SEG, SEG).rotateX(-Math.PI / 2);
  const tpos = tgeo.attributes.position as THREE.BufferAttribute;
  const hBase = new Float32Array(tpos.count), hFlat = new Float32Array(tpos.count);
  const cols = new Float32Array(tpos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < tpos.count; i++) {
    const x = tpos.getX(i), z = tpos.getZ(i);
    hBase[i] = heightAt(x, z); hFlat[i] = heightAt(x, z, 1);
    tpos.setY(i, hBase[i]);
    const inB = Math.abs(x) < 18 && Math.abs(z) < 18;
    const sq = (Math.floor((x + 18) / 6) + Math.floor((z + 18) / 6)) % 2;
    c.set(inB ? (sq ? '#a3b07c' : '#8d9a64') : '#9ca674');
    const n = K.noise2(x * 0.4, z * 0.4) * 0.05 + K.noise2(x * 2.1, z * 2.1) * 0.03;
    c.offsetHSL(0, 0, n);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  tgeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const idx = tgeo.index!.array, keep: number[] = [];
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i], b2 = idx[i + 1], d = idx[i + 2];
    const cx = (tpos.getX(a) + tpos.getX(b2) + tpos.getX(d)) / 3, cz = (tpos.getZ(a) + tpos.getZ(b2) + tpos.getZ(d)) / 3;
    if (Math.hypot(cx, cz) < isl.rimAt(Math.atan2(cz, cx)) - 0.7) keep.push(a, b2, d);
  }
  tgeo.setIndex(keep);
  tgeo.deleteAttribute('uv');
  tgeo.computeVertexNormals();
  const terrain = new THREE.Mesh(tgeo, K.finish('matte'));
  terrain.receiveShadow = true;
  root.add(terrain);

  // ---- one city plan, cloned eight times
  const plan = rng.fork('plan');
  const cb = new K.Batch(), wb: THREE.BufferGeometry[] = [], lifeB = new K.Batch();
  const WHITE = '#efe8da';
  cb.add(K.at(K.box(1.3, 0.04, 1.3), 0, 0, 0), '#e2dacb', 'stone');
  for (let k = 0; k < 4; k++) cb.add(K.at(K.box(0.36, 0.03, 1.9), 0, 0, 1.6).rotateY((k * Math.PI) / 2), '#ddd5c4', 'stone');
  cb.add(K.at(K.ring(1.5, 1.82, 48), 0, 0.02, 0), '#ddd5c4', 'stone');
  // belfry on the north side of the square
  cb.add(K.at(K.box(0.36, 1.1, 0.36), 0.45, 0, -0.95), WHITE, 'plaster');
  cb.add(K.at(K.archWall(0.38, 0.3, 0.38, 0.2, 0.24), 0.45, 1.1, -0.95), WHITE, 'plaster');
  cb.add(K.at(K.pyramid(0.46, 0.46, 0.32), 0.45, 1.4, -0.95), '#e6dccb', 'plaster');
  const houses: { x: number; z: number; ry: number; w: number; d: number; h: number }[] = [];
  for (const [r, n, offs] of [[1.15, 3, [0.4, 0.785, 1.17]], [2.2, 4, [0.3, 0.6, 0.97, 1.27]]] as const) {
    for (let q = 0; q < 4; q++) for (let k = 0; k < n; k++) {
      if (houses.length >= 26) break;
      const a = (q * Math.PI) / 2 + offs[k] + plan.float(-0.04, 0.04);
      if (r < 2 && q === 3 && k === 2) continue; // room for the belfry
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      houses.push({ x, z, ry: Math.atan2(-x, -z), w: plan.float(0.4, 0.6), d: plan.float(0.4, 0.55), h: plan.float(0.4, 0.75) });
    }
  }
  for (const h of houses) {
    K.house(cb, { x: h.x, z: h.z, ry: h.ry, w: h.w, d: h.d, h: h.h, roof: 'gable', roofH: 0.22, wall: WHITE, roofColor: '#e2d8c6', roofFinish: 'plaster', windows: false });
    const fx = Math.sin(h.ry), fz = Math.cos(h.ry);
    for (const [ox, oy] of [[-0.12, 0.18], [0.12, 0.18], [-0.12, h.h - 0.18], [0.12, h.h - 0.18]]) {
      const g = K.at(K.wallPlane(0.12, 0.14), ox, oy - 0.02, h.d / 2 + 0.012);
      wb.push(K.at(g, h.x, 0, h.z, { ry: h.ry }));
    }
    // life: terracotta awnings and laundry on the inhabited copy only
    if (plan.chance(0.5)) lifeB.add(K.at(K.box(h.w * 0.7, 0.025, 0.14), h.x + fx * (h.d / 2 + 0.07), 0.3, h.z + fz * (h.d / 2 + 0.07), { ry: h.ry, rx: 0.3 }), '#c4673f', 'cloth');
    if (plan.chance(0.3)) lifeB.add(K.at(K.box(0.05, 0.12, 0.05), h.x, h.h + 0.1, h.z), '#9a7a66', 'stone');
  }
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1 + 0.3;
    for (let k = 0; k < 4; k++) lifeB.add(K.at(K.box(0.06, 0.07, 0.008), Math.cos(a) * 1.65 + Math.sin(a) * (k - 1.5) * 0.08, 0.32, Math.sin(a) * 1.65 - Math.cos(a) * (k - 1.5) * 0.08, { ry: -a }), ROLES[(i + k) % 8], 'cloth');
  }
  const cityGroup = cb.build();
  const winGeo = K.merge(wb);
  const statueGeo = (() => {
    const s = new K.Batch();
    s.add(K.box(0.28, 0.2, 0.28), '#e2dacb', 'stone');
    s.add(K.at(K.cyl(0.05, 0.08, 0.22, 8), 0, 0.2, 0), WHITE, 'plaster');
    s.add(K.at(K.sphere(0.05, 8, 6), 0, 0.47, 0), WHITE, 'plaster');
    for (const sx of [-1, 1]) s.add(K.at(K.box(0.012, 0.05, 0.08), sx * 0.05, 0.49, -0.01, { rz: sx * 0.6 }), '#e8dfc8', 'plaster');
    s.add(K.at(K.cyl(0.008, 0.008, 0.36, 5), 0.09, 0.22, 0.03), '#c9a24c', 'gold');
    s.add(K.at(K.sphere(0.02, 6, 5), 0.09, 0.6, 0.03), '#c9a24c', 'gold');
    return s;
  })();
  const statueProto = statueGeo.build();

  const copies: { g: THREE.Group; statue: THREE.Group; home: THREE.Vector3 }[] = [];
  for (const s of sites) {
    const g = new THREE.Group();
    g.add(cityGroup.clone());
    const st = statueProto.clone();
    g.add(st);
    g.position.set(s.x, s.h + 0.03, s.z);
    g.rotation.z = s.tilt;
    root.add(g);
    copies.push({ g, statue: st, home: g.position.clone() });
  }
  const ghostMat = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, transparent: true, opacity: 0.35, depthWrite: false, roughness: 0.6 });
  const origMats = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  copies.forEach(({ g }) => g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) origMats.set(m, m.material); }));

  // ---- the road of the rotation, and the sites' small differences
  const sb = new K.Batch();
  const roadPts: THREE.Vector3[][] = [];
  const rb = new K.Batch();
  for (let k = 0; k < 8; k++) {
    const A = sites[ROT[k]], B = sites[ROT[(k + 1) % 8]];
    const len = Math.hypot(B.x - A.x, B.z - A.z), n = Math.ceil(len / 0.5);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = K.lerp(A.x, B.x, u) + Math.sin(u * Math.PI) * 0.8 * (k % 2 ? 1 : -1), z = K.lerp(A.z, B.z, u);
      pts.push(new THREE.Vector3(x, heightAt(x, z) + 0.02, z));
    }
    roadPts.push(pts);
    const rp: number[] = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[i + 1];
      if (Math.hypot(p.x - A.x, p.z - A.z) < 2.4 || Math.hypot(q.x - B.x, q.z - B.z) < 2.4) continue;
      const dx = q.x - p.x, dz = q.z - p.z, l = Math.hypot(dx, dz), nx = (-dz / l) * 0.2, nz = (dx / l) * 0.2;
      const v = (x: number, z: number) => [x, heightAt(x, z) + 0.035, z];
      const L0 = v(p.x + nx, p.z + nz), R0 = v(p.x - nx, p.z - nz), L1 = v(q.x + nx, q.z + nz), R1 = v(q.x - nx, q.z - nz);
      rp.push(...L0, ...L1, ...R0, ...L1, ...R1, ...R0);
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    rg.computeVertexNormals();
    if (rp.length && rg.attributes.normal.getY(0) < 0) {
      for (let i = 0; i < rp.length; i += 9) for (let k = 0; k < 3; k++) { const tmp = rp[i + 3 + k]; rp[i + 3 + k] = rp[i + 6 + k]; rp[i + 6 + k] = tmp; }
      rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
      rg.computeVertexNormals();
    }
    rb.add(rg, '#e9e0c6', 'matte');
  }
  const roadsG = rb.build({ castShadow: false });
  const S = (kind: string) => sites.find((s) => s.kind === kind)!;
  { const s = S('crest'); for (let i = 0; i < 6; i++) { const a = -0.6 + i * 0.5, x = s.x + Math.cos(a) * 3.6, z = s.z + Math.sin(a) * 3.6 - 0.3, y = heightAt(x, z);
      sb.add(K.at(K.cyl(0.04, 0.05, 0.4, 5), x, y, z), '#5b4532', 'wood');
      sb.add(K.at(K.cone(0.24, 1.7, 8), x, y + 0.3, z, { rz: -0.22 }), K.jitter('#5f7a3a', rng), 'matte'); } }
  { const s = S('boulders'); for (let i = 0; i < 12; i++) { const a = rng.angle(), r = rng.float(2.9, 4.6), x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r; K.rock(sb, { x, y: heightAt(x, z) - 0.05, z, r: rng.float(0.2, 0.55), color: '#b8b0a2', rng }); } }
  { const s = S('orchard'); for (let gx = -2.7; gx <= 2.8; gx += 0.9) for (let gz = -2.7; gz <= 2.8; gz += 0.9) {
      if (Math.hypot(gx, gz) < 2.9) continue; const x = s.x + gx, z = s.z + gz; K.tree(sb, { x, z, y: heightAt(x, z), kind: 'round', h: 0.75, color: '#6a8a3e', rng }); } }
  { const s = S('meadow'); for (let i = 0; i < 160; i++) { const [dx, dz] = rng.inRing(2.8, 3.8); const x = s.x + dx, z = s.z + dz; sb.add(K.at(K.sphere(0.04, 5, 4), x, heightAt(x, z) + 0.03, z), rng.pick(['#f2e27a', '#ffffff', '#c97ab0', '#e8a04a']), 'matte'); } }
  K.forest(sb, { n: 40, r0: 19.5, r1: 24, rng, kinds: ['round', 'poplar'], h: [0.8, 1.6], color: '#6f8248', y: (x, z) => heightAt(x, z) });
  const sitesG = new THREE.Group();
  sitesG.add(sb.build());
  { // the stream bends round the east side of its city
    const s = S('stream'), pos: number[] = [];
    for (let i = 0; i < 40; i++) {
      for (const [u0, u1] of [[i, i + 1]]) {
        const a0 = -1.9 + (u0 / 40) * 3.8, a1 = -1.9 + (u1 / 40) * 3.8;
        const p = (a: number, o: number) => { const r = 3.5 + o; const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r; return [x, heightAt(x, z) + 0.04, z]; };
        const A0 = p(a0, -0.3), A1 = p(a1, -0.3), B0 = p(a0, 0.3), B1 = p(a1, 0.3);
        pos.push(...A0, ...A1, ...B0, ...A1, ...B1, ...B0);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    if (g.attributes.normal.getY(0) < 0) {
      for (let i = 0; i < pos.length; i += 9) for (let k = 0; k < 3; k++) { const tmp = pos[i + 3 + k]; pos[i + 3 + k] = pos[i + 6 + k]; pos[i + 6 + k] = tmp; }
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
    }
    const m = K.waterMesh(g, { color: '#4f7a96', amp: 0.2, scale: 1.2, speed: 0.6 });
    sitesG.add(m);
    const p = S('pond');
    sitesG.add(K.waterDisc(1.4, heightAt(p.x, p.z + 4) + 0.05, { color: '#4f7a96', amp: 0.12 }).translateX(p.x).translateZ(p.z + 4.1));
  }
  sitesG.add(roadsG);
  root.add(sitesG);
  const mistS = S('hollow');
  root.add(K.particles({ count: 70, center: [mistS.x, mistS.h + 0.5, mistS.z], radius: 3.6, y0: mistS.h, y1: mistS.h + 1.4, color: '#f4f2ea', size: 1.1, opacity: 0.1, swirl: 0.6, disc: true, rng: rng.fork('mist') }));

  // ---- the living city: lit windows (fading out behind, kindling ahead), awnings, smoke
  const winMats = [0, 1].map(() => new THREE.MeshBasicMaterial({ color: '#ffc66b' }));
  const wins = winMats.map((m) => { const w = new THREE.Mesh(winGeo, m); root.add(w); return w; });
  const life = lifeB.build();
  root.add(life);
  const smoke = K.smoke({ sources: houses.filter((_, i) => i % 5 === 0).map((h) => [h.x, h.h + 0.25, h.z] as [number, number, number]), perSource: 10, height: 2.5, color: '#e8e2d8', opacity: 0.25, size: [0.15, 0.6], life: 6, wind: [0.5, 0.1], rng: rng.fork('smk') });
  root.add(smoke);
  const lifeLight = new THREE.PointLight('#ffb760', 30, 9, 1.5);
  root.add(lifeLight);
  const lifeGlow = K.glowSprite('#ffc66b', 4, 0.12);
  root.add(lifeGlow);
  const yawnMat = new THREE.MeshBasicMaterial({ color: '#ffe2b0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const yawn = new THREE.Mesh(K.ring(0.95, 1, 64), yawnMat);
  root.add(yawn);

  // ---- citizens: beads with role colours, quicksilver on the road
  const beadMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.45, metalness: 0.1 });
  const beads = K.instanced(K.sphere(0.1, 10, 8), beadMat, NB, undefined, { castShadow: true });
  root.add(beads);
  const setB = K.instanceSetter(beads);
  const halo = K.glowSprite('#ffffff', 0.7, 0.9);
  root.add(halo);
  const glint = K.glowSprite('#fff2c0', 1.0, 0);
  root.add(glint);
  const coupleGeo = new THREE.BufferGeometry();
  const cpos = new Float32Array(20 * 6);
  coupleGeo.setAttribute('position', new THREE.BufferAttribute(cpos, 3));
  const coupleMat = new THREE.LineBasicMaterial({ color: '#fff0d0', transparent: true, opacity: 0.6 });
  const couples = new THREE.LineSegments(coupleGeo, coupleMat);
  couples.frustumCulled = false;
  root.add(couples);
  const local = new THREE.Vector3(), world = new THREE.Vector3(), road = new THREE.Vector3();
  const inCity = (i: number, cityIdx: number, tt: number, out: THREE.Vector3) => {
    const sp = 0.12 + (i % 7) * 0.02;
    if (i % 3 === 0) {
      const k = i % 4, s = 0.75 + 0.85 * (1 + Math.sin(tt * sp * 1.5 + i)), a = (k * Math.PI) / 2;
      local.set(Math.sin(a) * s + Math.cos(a) * 0.06, 0.075, Math.cos(a) * s - Math.sin(a) * 0.06);
    } else {
      const a = (i / NB) * Math.PI * 2 * 3 + tt * sp * (i % 2 ? 1 : -1), r = 1.66 + ((i * 37) % 10) * 0.012 - 0.06;
      local.set(Math.cos(a) * r, 0.075, Math.sin(a) * r);
    }
    out.copy(local).applyMatrix4(copies[cityIdx].g.matrixWorld);
  };
  const along = (pts: THREE.Vector3[], u: number, out: THREE.Vector3) => {
    const f = K.clamp(u) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f));
    return out.lerpVectors(pts[k], pts[k + 1], f - k);
  };

  const fold = new K.Toggle(0.35);
  let lastFold = -1;
  const tc = new THREE.Color();
  return {
    root,
    env: {
      skyTop: '#6e93bf', skyHorizon: '#eedfc0', skyBottom: '#a8a890', skyCurve: 0.55,
      fog: '#cfd1c2', fogNear: 80, fogFar: 240,
      sunDir: [-0.85, 0.32, 0.2], sunColor: '#ffd6a0', sunIntensity: 2.6, sunDisc: 1, sunGlow: 0.9,
      hemiSky: '#bcd0e8', hemiGround: '#7d8458', hemiIntensity: 0.75, envIntensity: 0.8,
      stars: 0, clouds: 0.3, cloudColor: '#ffffff',
      bloomStrength: 0.5, bloomThreshold: 0.85, bloomRadius: 0.5,
      tiltShift: 0.35, shadowRadius: 28, vignette: 0.3, saturation: 1.05,
    },
    camera: {
      position: [0, 42, 38],
      target: [0, 0, 1],
      minDistance: 10, maxDistance: 90, autoRotate: 0.15,
      views: [
        { position: [-30, 14, 28], target: [-6, 0, 0] },
        { position: [-3.5, 4.5, 4.5], target: [-3, 0.6, -2.6] },
      ],
    },
    interaction: {
      label: 'Fold into one',
      activeLabel: 'Scatter the copies',
      hint: 'Many cities, and only one: it never changes.',
      set: (on) => fold.set(on),
    },
    update(t, dt) {
      fold.update(dt);
      const f = fold.value;
      const T = t + 30;
      const cyc = Math.floor(T / PERIOD), ph = T - cyc * PERIOD;
      const cur = ROT[cyc % 8], nxt = ROT[(cyc + 1) % 8];
      const moving = ph > LIFE;
      const mv = moving ? (ph - LIFE) / (PERIOD - LIFE) : 0;
      const weary = K.smoothstep(15, LIFE, ph) * (moving ? 0 : 1);
      // folding: the copies glide onto the living city (the destination during a move)
      const hostIdx = moving && mv > 0.5 ? nxt : cur;
      const hs = sites[hostIdx];
      const hostPos = new THREE.Vector3(hs.x, K.lerp(hs.h + 0.03, 0.58, f), hs.z), hostTilt = hs.tilt * (1 - f);
      copies.forEach((cp, k) => {
        const s = sites[k];
        if (k === hostIdx) { cp.g.position.copy(hostPos); cp.g.rotation.z = hostTilt; cp.g.visible = true; }
        else {
          cp.g.position.lerpVectors(cp.home, hostPos, f);
          cp.g.position.y += Math.sin(f * Math.PI) * 2.5;
          cp.g.rotation.z = K.lerp(s.tilt, hostTilt, f);
          cp.g.visible = f < 0.985;
          const ghost = f > 0.02;
          cp.g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.material = ghost ? ghostMat : origMats.get(m)!; });
        }
        cp.g.updateMatrixWorld();
      });
      ghostMat.opacity = 0.5 * (1 - f) + 0.15;
      if (Math.abs(f - lastFold) > 1e-4) {
        lastFold = f;
        for (let i = 0; i < tpos.count; i++) tpos.setY(i, K.lerp(hBase[i], hFlat[i], f));
        tpos.needsUpdate = true;
        tgeo.computeVertexNormals();
        sitesG.scale.y = Math.max(0.001, 1 - f);
      }
      // statue of Mercury turns toward the next city before the move
      const a = copies[cur].statue;
      const target = Math.atan2(sites[nxt].x - sites[cur].x, sites[nxt].z - sites[cur].z);
      a.rotation.y = K.lerp(0, target, K.smoothstep(LIFE - 4, LIFE, ph));
      copies.forEach((cp, k) => { if (k !== cur) cp.statue.rotation.y = 0; });
      // windows: the old city dims and yawns, the next one kindles during the move
      const yawnBeat = 0.5 + 0.5 * Math.cos(t * (0.6 + 2.2 * weary) * Math.PI);
      const curB = moving ? 1 - K.smoothstep(0, 0.6, mv) : 1 - weary * 0.55 * yawnBeat;
      const nxtB = moving ? K.smoothstep(0.4, 1, mv) : 0;
      [cur, nxt].forEach((ci, k) => {
        wins[k].position.copy(copies[ci].g.position); wins[k].rotation.copy(copies[ci].g.rotation);
        winMats[k].color.set('#ffc66b').multiplyScalar(2.6 * (k ? nxtB : curB) + 0.001);
        wins[k].visible = (k ? nxtB : curB) > 0.01;
      });
      const lifeHost = copies[moving && mv > 0.5 ? nxt : cur].g;
      life.position.copy(lifeHost.position); life.rotation.copy(lifeHost.rotation);
      life.scale.setScalar(Math.max(0.001, moving ? Math.abs(mv - 0.5) * 2 : 1));
      smoke.position.copy(lifeHost.position);
      lifeLight.position.copy(lifeHost.position).y += 2.2;
      lifeLight.intensity = 9 * Math.max(curB * (moving && mv > 0.5 ? 0 : 1), nxtB);
      lifeGlow.position.copy(lifeHost.position).y += 1.6;
      (lifeGlow.material as THREE.SpriteMaterial).opacity = 0.12 * Math.max(curB * (moving && mv > 0.5 ? 0 : 1), nxtB);
      yawn.position.copy(copies[cur].g.position).y += 0.1;
      const yp = K.fract(t * (0.3 + weary));
      yawn.scale.setScalar(0.5 + yp * 3);
      yawnMat.opacity = weary * (1 - yp) * 0.5;
      // the citizens
      const rp = roadPts[cyc % 8];
      beadMat.metalness = moving ? K.smoothstep(0, 0.1, mv) * (1 - K.smoothstep(0.9, 1, mv)) : 0.1;
      beadMat.roughness = K.lerp(0.45, 0.08, beadMat.metalness);
      const slow = 1 - 0.6 * weary;
      for (let i = 0; i < NB; i++) {
        const tt = t * slow;
        const u = moving ? K.clamp(mv * 1.7 - (i / NB) * 0.7) : 0;
        let role = (i + 3 * cyc) % 8;
        if (!moving || u <= 0) inCity(i, cur, tt, world);
        else if (u >= 1) { inCity(i, nxt, tt, world); role = (i + 3 * (cyc + 1)) % 8; }
        else {
          along(rp, u, road);
          const wob = Math.sin(u * 40 + i * 1.3) * 0.18 + Math.sin(i * 7.1) * 0.12;
          road.x += wob * 0.7; road.z += Math.cos(u * 30 + i) * 0.12; road.y += 0.075;
          if (u < 0.08) { inCity(i, cur, tt, world); world.lerp(road, u / 0.08); }
          else if (u > 0.92) { inCity(i, nxt, tt, world); world.lerp(road, (1 - u) / 0.08); }
          else world.copy(road);
        }
        setB(i, world.x, world.y, world.z, 0, 1);
        const onRoad = moving && u > 0 && u < 1;
        beads.setColorAt(i, onRoad ? tc.set('#dfe6ee') : tc.set(ROLES[role]).lerp(tc.clone().set('#8a8a8a'), weary * 0.5));
        if (i === 0) halo.position.set(world.x, world.y + 0.08, world.z);
      }
      setB.done();
      // couples: re-paired in each new city
      const pairCyc = moving && mv > 0.9 ? cyc + 1 : cyc;
      const p = new THREE.Vector3(), q = new THREE.Vector3();
      for (let k = 0; k < 20; k++) {
        const ia = (k * 6) % NB, ib = (ia + 1 + ((pairCyc * 11 + k * 3) % 40)) % NB;
        beads.getMatrixAt(ia, _m); p.setFromMatrixPosition(_m);
        beads.getMatrixAt(ib, _m); q.setFromMatrixPosition(_m);
        cpos.set([p.x, p.y, p.z, q.x, q.y, q.z], k * 6);
      }
      coupleGeo.attributes.position.needsUpdate = true;
      coupleMat.opacity = moving ? 0 : 0.55;
      // a winged glint skims ahead along the road
      if (moving) { along(rp, Math.min(1, mv * 2.2), road); glint.position.set(road.x, road.y + 0.6, road.z); }
      (glint.material as THREE.SpriteMaterial).opacity = moving ? 0.9 * (1 - K.smoothstep(0.4, 0.5, mv)) : 0;
    },
  };
};
const _m = new THREE.Matrix4();

export default build;
