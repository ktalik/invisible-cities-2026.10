// ARMILLA - Thin Cities 3.
// No walls, no floors, no roofs: only the plumbing, a forest of copper pipes that
// rises where the houses should be and branches where the floors should be,
// hung with white porcelain like late fruit. The water belongs to the nymphs now:
// they bathe in tubs and under showers over the void. A still sheet of water
// mirrors it all. Toggle: imagine the walls, and the nymphs and water withdraw.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

type V = THREE.Vector3;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const SH = 0.5; // storey height

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const city = new THREE.Group();
  root.add(city);
  const uT = { value: 0 }, uOn = { value: 1 };

  // ---------------------------------------------------------------- house footprints along two crossing lanes
  type House = { cx: number; cz: number; w: number; d: number; n: number };
  const houses: House[] = [];
  const overlaps = (h: House) => houses.some((o) => Math.abs(o.cx - h.cx) < (o.w + h.w) / 2 + 0.45 && Math.abs(o.cz - h.cz) < (o.d + h.d) / 2 + 0.45);
  for (let i = 0; i < 3000 && houses.length < 44; i++) {
    const w = rng.float(1.2, 2.4), d = rng.float(1.0, 2.0);
    const h: House = { cx: rng.float(-12, 12), cz: rng.float(-12, 12), w, d, n: rng.int(2, 6) };
    const r = Math.hypot(h.cx, h.cz);
    if (r > 12 || (r > 9 && !rng.chance(0.25))) continue;
    if (Math.abs(h.cx) < w / 2 + 0.7 || Math.abs(h.cz) < d / 2 + 0.7 || r < 3.4 + Math.max(w, d) / 2) continue;
    if (overlaps(h)) continue;
    houses.push(h);
  }
  houses.sort((a, b) => Math.hypot(a.cx, a.cz) - Math.hypot(b.cx, b.cz));
  for (let i = 0; i < 4; i++) houses[i * 3].n = 8; // tenement towers near the square

  // ---------------------------------------------------------------- pipes as one instanced mesh
  const segs: { a: V; b: V; r: number; c: THREE.Color }[] = [];
  const joints: V[] = [];
  const copper = (): THREE.Color => (rng.chance(0.08) ? K.jitter('#6f9f94', rng, 0.01, 0.05, 0.05) : K.jitter('#9c5a32', rng, 0.02, 0.06, 0.08));
  const pipe = (a: V, b: V, r = 0.022, c?: THREE.Color) => segs.push({ a, b, r, c: c ?? copper() });
  const b = new K.Batch();
  const pz: THREE.BufferGeometry[] = []; // porcelain (own fading material)

  type Port = { p: V; out: V; house: House; level: number };
  const ports: Port[] = [];
  const risersTop: V[] = [];
  for (const h of houses) {
    const H = h.n * SH, x0 = h.cx - h.w / 2, x1 = h.cx + h.w / 2, z0 = h.cz - h.d / 2, z1 = h.cz + h.d / 2;
    b.add(K.at(K.box(h.w + 0.3, 0.06, h.d + 0.3), h.cx, 0, h.cz), K.jitter('#e3d9c4', rng, 0.01, 0.03, 0.04), 'stone');
    const per = 2 * (h.w + h.d);
    const at = (p: number): [V, V] => {
      p = ((p % per) + per) % per;
      if (p < h.w) return [v(x0 + p, 0, z0), v(0, 0, -1)];
      if (p < h.w + h.d) return [v(x1, 0, z0 + p - h.w), v(1, 0, 0)];
      if (p < 2 * h.w + h.d) return [v(x1 - (p - h.w - h.d), 0, z1), v(0, 0, 1)];
      return [v(x0, 0, z1 - (p - 2 * h.w - h.d)), v(-1, 0, 0)];
    };
    const params = [0, h.w, h.w + h.d, 2 * h.w + h.d];
    const extra = rng.int(0, 6);
    for (let i = 0; i < extra; i++) params.push(rng.float(0.2, per - 0.2));
    params.sort((p, q) => p - q);
    const risers = params.map((p, i) => {
      const [pos, out] = at(p);
      const corner = i < 4 && [0, h.w, h.w + h.d, 2 * h.w + h.d].includes(p);
      const top = corner ? H : SH * rng.int(1, h.n);
      pipe(v(pos.x, 0.06, pos.z), v(pos.x, top + 0.08, pos.z), 0.026);
      risersTop.push(v(pos.x, top + 0.08, pos.z));
      return { pos, out, top, p };
    });
    for (let k = 1; k <= h.n; k++) {
      const y = k * SH;
      for (let i = 0; i < risers.length; i++) {
        const A = risers[i], B = risers[(i + 1) % risers.length];
        if (A.top < y || B.top < y || !rng.chance(0.85)) continue;
        pipe(v(A.pos.x, y, A.pos.z), v(B.pos.x, y, B.pos.z), 0.018);
        joints.push(v(A.pos.x, y, A.pos.z), v(B.pos.x, y, B.pos.z));
      }
      if (rng.chance(0.6)) {
        const f = rng.float(0.25, 0.75), alongX = rng.chance(0.5);
        const a = alongX ? v(x0, y, z0 + f * h.d) : v(x0 + f * h.w, y, z0), c = alongX ? v(x1, y, z0 + f * h.d) : v(x0 + f * h.w, y, z1);
        pipe(a, c, 0.016);
        joints.push(a, c);
      }
      for (const r of risers) if (r.top >= y) ports.push({ p: v(r.pos.x, y, r.pos.z), out: r.out, house: h, level: k });
    }
  }
  // valve handwheels
  for (let i = 0; i < 80; i++) {
    const pt = rng.pick(ports), y = pt.p.y - rng.float(0.12, 0.35);
    b.add(K.at(K.torus(0.045, 0.008, 4, 12), pt.p.x + pt.out.x * 0.035, y, pt.p.z + pt.out.z * 0.035, { ry: Math.atan2(pt.out.x, pt.out.z) }), '#c9a24c', 'gold');
  }

  // ---------------------------------------------------------------- water threads (one LineSegments, scrolling glitter)
  const lp: number[] = [], lv: number[] = [], ls: number[] = [];
  const stream = (pts: V[]) => {
    const seed = rng.next();
    for (let i = 0; i < pts.length - 1; i++) {
      lp.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
      lv.push(i / (pts.length - 1), (i + 1) / (pts.length - 1));
      ls.push(seed, seed);
    }
  };
  const hits: THREE.Vector3[] = [];
  const hit = (x: number, z: number) => { if (hits.length < 40) hits.push(new THREE.Vector3(x, z, rng.next())); };

  // terminations
  rng.shuffle(ports);
  const upper = ports.filter((p) => p.level >= 2);
  const nymphStand: { p: V; ry: number }[] = [], nymphLie: { p: V; ry: number }[] = [];
  const mirrorSpots: V[] = [];
  let pi = 0;
  const take = (list: Port[]) => list[pi++ % list.length];
  // showers on goosenecks over the void
  for (let i = 0; i < 70; i++) {
    const pt = take(upper), o = pt.out, y = pt.p.y;
    const tip = v(pt.p.x + o.x * 0.32, y + 0.12, pt.p.z + o.z * 0.32);
    pipe(pt.p, v(pt.p.x, y + 0.12, pt.p.z), 0.014);
    pipe(v(pt.p.x, y + 0.12, pt.p.z), tip, 0.014);
    b.add(K.at(K.cone(0.055, 0.05, 12), tip.x, tip.y - 0.06, tip.z), '#d9a066', 'bronze');
    const withNymph = i < 7;
    const floorY = withNymph ? y - 0.42 : 0;
    if (withNymph) {
      pz.push(K.at(K.cyl(0.13, 0.11, 0.025, 20), tip.x, floorY - 0.025, tip.z));
      pipe(v(pt.p.x, floorY, pt.p.z), v(tip.x, floorY - 0.01, tip.z), 0.01);
      nymphStand.push({ p: v(tip.x, floorY, tip.z), ry: rng.angle() });
    } else hit(tip.x, tip.z);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2, sp = (withNymph ? 0.25 : 0.08) * (tip.y - floorY);
      stream([v(tip.x + Math.cos(a) * 0.03, tip.y - 0.06, tip.z + Math.sin(a) * 0.03), v(tip.x + Math.cos(a) * sp * 0.4, floorY + 0.01, tip.z + Math.sin(a) * sp * 0.4)]);
    }
  }
  // bathtubs hung in the branches (claw feet, rolled rim)
  const tubGeo = () => K.at(K.merge([K.at(K.cyl(0.085, 0.07, 0.13, 18), 0, 0.03, 0, { s: [2.2, 1, 1] }), K.at(K.torus(0.085, 0.012, 5, 24), 0, 0.16, 0, { rx: Math.PI / 2, s: [2.2, 1, 1] })]), 0, 0, 0, { s: 1.4 });
  for (let i = 0; i < 40; i++) {
    const pt = take(upper), inw = pt.out.clone().negate(), c = v(pt.p.x + inw.x * 0.3, pt.p.y, pt.p.z + inw.z * 0.3);
    const ry = Math.atan2(inw.x, inw.z) + Math.PI / 2;
    pz.push(K.at(tubGeo(), c.x, c.y, c.z, { ry }));
    for (const s of [-1, 1]) b.add(K.at(K.sphere(0.016, 6, 4), c.x + Math.cos(ry) * 0.18 * s, c.y + 0.02, c.z - Math.sin(ry) * 0.18 * s), '#c9a24c', 'gold');
    pipe(pt.p, v(c.x, c.y + 0.01, c.z), 0.012);
    const tp = v(pt.p.x + inw.x * 0.08, c.y + 0.32, pt.p.z + inw.z * 0.08);
    pipe(v(pt.p.x, c.y + 0.32, pt.p.z), tp, 0.012);
    stream([tp, v(tp.x + inw.x * 0.02, c.y + 0.13, tp.z + inw.z * 0.02)]);
    if (i < 7) nymphLie.push({ p: v(c.x, c.y + 0.1, c.z), ry: ry });
  }
  // washbasins with taps, mirrors beside some
  for (let i = 0; i < 70; i++) {
    const pt = take(ports), o = pt.out, y = pt.p.y + 0.22;
    const c = v(pt.p.x + o.x * 0.11, y, pt.p.z + o.z * 0.11);
    pz.push(K.at(K.sphere(0.08, 14, 8), c.x, c.y, c.z, { s: [1.2, 0.55, 1] }));
    const tp = v(pt.p.x + o.x * 0.09, y + 0.12, pt.p.z + o.z * 0.09);
    pipe(v(pt.p.x, y + 0.12, pt.p.z), tp, 0.009);
    stream([tp, v(tp.x, y + 0.02, tp.z)]);
    if (i < 20) {
      const side = v(-o.z, 0, o.x), m = v(pt.p.x + side.x * 0.12 + o.x * 0.03, y + 0.3, pt.p.z + side.z * 0.12 + o.z * 0.03);
      const ry = Math.atan2(o.x, o.z);
      b.add(K.at(K.disc(0.055, 18), 0, 0, 0, { rx: Math.PI / 2, s: [1, 1.5, 1] }).rotateY(ry + Math.PI).translate(m.x, m.y, m.z), '#e8eef0', 'silver');
      b.add(K.at(K.torus(0.056, 0.007, 4, 20), 0, 0, 0, { s: [1, 1.5, 1] }).rotateY(ry).translate(m.x, m.y, m.z), '#c9a24c', 'gold');
      if (i < 4) {
        const st = v(m.x + o.x * 0.22, pt.p.y - 0.02, m.z + o.z * 0.22);
        pz.push(K.at(K.cyl(0.1, 0.09, 0.02, 16), st.x, st.y - 0.02, st.z));
        pipe(v(pt.p.x, st.y - 0.02, pt.p.z), v(st.x, st.y - 0.02, st.z), 0.01);
        nymphStand.push({ p: st, ry: ry + Math.PI });
      }
      mirrorSpots.push(m);
    }
  }
  // cisterns high on the risers, taps low with free-falling threads
  for (let i = 0; i < 25; i++) { const t = rng.pick(risersTop); pz.push(K.at(K.box(0.14, 0.1, 0.07), t.x + 0.05, t.y - 0.25, t.z)); }
  for (let i = 0; i < 120; i++) {
    const pt = take(ports), o = pt.out, tp = v(pt.p.x + o.x * 0.14, pt.p.y - 0.06, pt.p.z + o.z * 0.14);
    pipe(pt.p, v(tp.x, pt.p.y, tp.z), 0.011);
    b.add(K.at(K.cone(0.016, 0.06, 6), tp.x, tp.y, tp.z), '#d9a066', 'bronze');
    if (i % 3 === 0) { stream([tp, v(tp.x, 0.005, tp.z)]); hit(tp.x, tp.z); }
  }
  // rooftop fountains and the fountain of the square
  const fountains = [...risersTop].sort((a, c) => c.y - a.y).slice(0, 8);
  fountains.push(v(0, 2.2, 0));
  pipe(v(0, 0.06, 0), v(0, 2.2, 0), 0.06);
  b.add(K.at(K.cyl(1.4, 1.5, 0.12, 40), 0, 0, 0), '#e3d9c4', 'stone');
  b.add(K.at(K.torus(0.5, 0.03, 6, 24), 0, 1.1, 0, { rx: Math.PI / 2 }), '#b8723c', 'bronze');
  for (const f of fountains) {
    const big = f.x === 0 && f.z === 0, hgt = big ? 1.2 : rng.float(0.6, 1.2);
    for (let k = 0; k < (big ? 14 : 7); k++) {
      const a = (k / (big ? 14 : 7)) * Math.PI * 2 + rng.float(0, 0.4), reach = big ? 1.25 : rng.float(0.35, 0.6);
      const pts: V[] = [];
      for (let s = 0; s <= 10; s++) { const u = s / 10; pts.push(v(f.x + Math.cos(a) * reach * u, f.y + 4 * hgt * u * (1 - u) * 1.0 - (big ? 2.1 : f.y * 0.3) * u * u, f.z + Math.sin(a) * reach * u)); }
      stream(pts);
    }
  }

  // build pipes + joints
  const pipeMesh = K.instanced(K.paint(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), '#ffffff'), K.finish('bronze'), segs.length, (i, o, c) => {
    const s = segs[i], d = s.b.clone().sub(s.a), len = d.length();
    o.position.copy(s.a).addScaledVector(d, 0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    o.scale.set(s.r, len, s.r);
    c.copy(s.c);
  });
  city.add(pipeMesh);
  city.add(K.instanced(K.paint(K.sphere(1, 8, 6), '#ffffff'), K.finish('bronze'), joints.length, (i, o, c) => { o.position.copy(joints[i]); o.scale.setScalar(0.032); c.set('#a8643a'); }, { castShadow: false }));
  city.add(b.build({ name: 'armilla' }));
  const porcelainMat = new THREE.MeshStandardMaterial({ color: '#fbf6ea', roughness: 0.12, metalness: 0, transparent: true, envMapIntensity: 1.2 });
  const porcelain = new THREE.Mesh(K.merge(pz), porcelainMat);
  porcelain.castShadow = porcelain.receiveShadow = true;
  city.add(porcelain);

  // ---------------------------------------------------------------- the nymphs: slender figures of water-light
  const nymphGeo = () => {
    const parts = [
      K.at(K.cone(0.03, 0.11, 8), 0, 0.11, 0, { rx: Math.PI }), // legs (narrow to the feet)
      K.at(K.cyl(0.022, 0.03, 0.09, 8), 0, 0.11, 0), // torso
      K.at(K.sphere(0.022, 10, 8), 0, 0.225, 0), // head
      K.at(K.cyl(0.024, 0.012, 0.16, 8), 0, 0.075, -0.018, { rx: 0.18 }), // long hair down the back
      K.at(K.cyl(0.006, 0.006, 0.09, 4), 0.03, 0.2, 0, { rz: -0.4 }), K.at(K.cyl(0.006, 0.006, 0.09, 4), -0.03, 0.2, 0, { rz: 0.4 }), // raised arms
    ];
    return K.merge(parts);
  };
  const nymphMat = new THREE.MeshStandardMaterial({ color: '#cdf3ff', emissive: '#6fd6f0', emissiveIntensity: 2.6, roughness: 0.25, transparent: true, opacity: 0.9, depthWrite: false });
  const standing = K.instanced(nymphGeo(), nymphMat, nymphStand.length, undefined, { castShadow: false, receiveShadow: false, colors: false });
  const lying = K.instanced(nymphGeo(), nymphMat, nymphLie.length, undefined, { castShadow: false, receiveShadow: false, colors: false });
  city.add(standing, lying);
  const setS = K.instanceSetter(standing), setL = K.instanceSetter(lying);
  // one traveller slips through the pipes from shower to shower
  const slots = [0, 3, 5].filter((i) => i < nymphStand.length);
  const traveller = K.glowSprite('#bdf3ff', 0.7, 0.95);
  city.add(traveller);

  // water threads
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  lg.setAttribute('aV', new THREE.Float32BufferAttribute(lv, 1));
  lg.setAttribute('aSeed', new THREE.Float32BufferAttribute(ls, 1));
  city.add(new THREE.LineSegments(lg, new THREE.ShaderMaterial({
    uniforms: { uT, uOn }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aV; attribute float aSeed; varying float vV; varying float vS;
      void main(){ vV = aV; vS = aSeed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uT; uniform float uOn; varying float vV; varying float vS;
      void main(){ float s = fract(vV * 5.0 - uT * 2.4 + vS * 7.0);
        float streak = smoothstep(0.0, 0.12, s) * smoothstep(0.7, 0.3, s);
        float a = (0.3 + 0.7 * streak) * uOn * (1.0 - 0.35 * vV);
        gl_FragColor = vec4(vec3(1.0, 0.95, 0.82) * (1.2 + 1.6 * streak), a);
        #include <colorspace_fragment>
      }`,
  })));

  // ---------------------------------------------------------------- imagined walls (toggle)
  const wallMat = new THREE.MeshStandardMaterial({ color: '#efe4d2', roughness: 0.9, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const winMat = new THREE.MeshBasicMaterial({ color: '#3a2c24', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const wallG: THREE.BufferGeometry[] = [], winG: THREE.BufferGeometry[] = [];
  for (const h of houses) {
    const H = h.n * SH;
    wallG.push(K.at(K.box(h.w, H, h.d), h.cx, 0.06, h.cz));
    wallG.push(K.at(K.hipRoof(h.w, h.d, 0.35, 0.3, 0.06), h.cx, H + 0.06, h.cz));
    for (let k = 1; k < h.n; k++) wallG.push(K.at(K.box(h.w - 0.02, 0.03, h.d - 0.02), h.cx, k * SH, h.cz));
    for (const [fw, ox, oz, ry] of [[h.w, 0, h.d / 2, 0], [h.w, 0, -h.d / 2, Math.PI], [h.d, h.w / 2, 0, Math.PI / 2], [h.d, -h.w / 2, 0, -Math.PI / 2]] as const) {
      const cols = Math.max(1, Math.floor(fw / 0.5));
      for (let k = 0; k < h.n; k++) for (let c = 0; c < cols; c++) {
        winG.push(K.at(K.wallPlane(0.14, 0.22), -fw / 2 + (c + 0.5) * (fw / cols), 0.06 + k * SH + 0.14, 0.012).rotateY(ry).translate(h.cx + ox, 0, h.cz + oz));
      }
    }
  }
  const walls = new THREE.Group();
  walls.add(new THREE.Mesh(K.merge(wallG), wallMat), new THREE.Mesh(K.merge(winG), winMat));
  walls.visible = false;
  city.add(walls);

  // ---------------------------------------------------------------- mirror floor: a reflected copy under a translucent sheet
  city.updateMatrixWorld(true);
  const mirror = new THREE.Group();
  mirror.scale.y = -1;
  root.add(mirror);
  const pairs: [THREE.Object3D, THREE.Object3D][] = [];
  city.traverse((o) => {
    let p: THREE.Object3D | null = null;
    if ((o as THREE.InstancedMesh).isInstancedMesh) {
      const im = o as THREE.InstancedMesh, c = new THREE.InstancedMesh(im.geometry, im.material, im.count);
      c.instanceMatrix = im.instanceMatrix; c.instanceColor = im.instanceColor; c.frustumCulled = false; p = c;
    } else if ((o as THREE.Mesh).isMesh) p = new THREE.Mesh((o as THREE.Mesh).geometry, (o as THREE.Mesh).material);
    else if ((o as THREE.LineSegments).isLineSegments) p = new THREE.LineSegments((o as THREE.LineSegments).geometry, (o as THREE.LineSegments).material);
    else if ((o as THREE.Sprite).isSprite) p = new THREE.Sprite((o as THREE.Sprite).material);
    if (!p) return;
    p.matrixAutoUpdate = false;
    p.matrix.copy(o.matrixWorld);
    mirror.add(p);
    pairs.push([o, p]);
  });
  const hitArr = Array.from({ length: 40 }, (_, i) => hits[i] ?? new THREE.Vector3(999, 999, 0));
  const water = new THREE.Mesh(new THREE.CircleGeometry(110, 96).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { uT, uOn, uHits: { value: hitArr }, uFog: { value: new THREE.Color('#eadccb') } }, transparent: true, depthWrite: false,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uT; uniform float uOn; uniform vec3 uHits[40]; uniform vec3 uFog; varying vec3 vW;
      void main(){
        vec3 V = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(V.y, 0.0), 2.5);
        vec3 col = mix(vec3(0.5, 0.56, 0.58), vec3(0.86, 0.78, 0.7), fres);
        float rings = 0.0;
        for (int i = 0; i < 40; i++) { vec3 h = uHits[i]; float d = length(vW.xz - h.xy);
          if (d > 0.6) continue;
          for (int k = 0; k < 2; k++) { float age = fract(uT * 0.8 + h.z + float(k) * 0.5); rings += exp(-pow((d - age * 0.5) / 0.015, 2.0)) * (1.0 - age); } }
        float dist = length(vW.xz);
        float a = mix(0.5, 0.15, fres);
        float far = smoothstep(22.0, 75.0, dist);
        col = mix(col, uFog, far); a = mix(a, 1.0, far);
        gl_FragColor = vec4(col + vec3(1.0, 0.95, 0.85) * rings * 0.7 * uOn, a);
        #include <colorspace_fragment>
      }`,
  }));
  water.renderOrder = 1;
  // the reflected sky inside the mirror
  const skyGeo = new THREE.SphereGeometry(95, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const cH = new THREE.Color('#f2cfb0'), cT = new THREE.Color('#5f93c4');
  K.paintBy(skyGeo, (_x, y, _z, out) => out.copy(cH).lerp(cT, Math.pow(Math.max(0, y) / 95, 0.6)));
  const skyMirror = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false, depthWrite: false }));
  skyMirror.renderOrder = -1;
  mirror.add(skyMirror);
  root.add(water);
  // morning motes rising
  root.add(K.particles({ count: 260, radius: 14, y0: 0.3, y1: 7, velocity: [0, 0.18, 0], color: '#fff0c6', size: 0.05, opacity: 0.55, swirl: 0.4, twinkle: 0.8, rng: rng.fork('motes') }));

  const tog = new K.Toggle(0.4);
  const tmp = new THREE.Vector3();
  return {
    root,
    env: {
      skyTop: '#5f93c4', skyHorizon: '#f2cfb0', skyBottom: '#ebe4da', skyCurve: 0.55,
      fog: '#eadccb', fogNear: 60, fogFar: 170,
      sunDir: [1, 0.28, 0.35], sunColor: '#ffd6a0', sunIntensity: 3.0, sunDisc: 1, sunGlow: 0.8, exposure: 0.85, contrast: 1.08,
      hemiSky: '#cfe0f0', hemiGround: '#d6c8b4', hemiIntensity: 0.8, envIntensity: 0.9,
      clouds: 0.2, cloudColor: '#ffe9d6', bloomStrength: 0.5, bloomThreshold: 0.92, bloomRadius: 0.5,
      tiltShift: 0.25, shadowRadius: 15, vignette: 0.3, saturation: 1.12,
    },
    camera: {
      position: [10.5, 1.3, 13.5], target: [0, 2.2, 0], fov: 38, minDistance: 4, maxDistance: 32, maxPolar: 1.66, autoRotate: 0.2,
      views: [
        { position: [17, 13, 21], target: [0, 1.2, 0] },
        { position: [6, 4.2, 8], target: [0, 1.9, 0] },
      ],
    },
    interaction: {
      label: 'Imagine the walls', activeLabel: 'Let the water back',
      hint: 'Rooms close around the pipes, and the bathers slip away.',
      set: (on) => tog.set(on),
    },
    update(t, dt) {
      uT.value = t;
      tog.update(dt);
      const w = tog.value;
      walls.visible = w > 0.005;
      wallMat.opacity = 0.22 * w;
      winMat.opacity = 0.5 * w;
      uOn.value = 1 - K.smoothstep(0.0, 0.6, w);
      porcelainMat.opacity = 1 - 0.85 * K.smoothstep(0.3, 1, w);
      nymphMat.opacity = 0.85 * (1 - K.smoothstep(0.1, 0.8, w));
      // traveller: shrink at one shower, run down the pipe, under the water, up to the next
      const cyc = Math.floor(t / 12), ct = t - cyc * 12;
      const from = slots[cyc % slots.length], to = slots[(cyc + 1) % slots.length];
      nymphStand.forEach((n, i) => {
        let s = 1;
        if (slots.includes(i)) s = i === from ? 1 - K.smoothstep(0, 1, ct) : i === to ? K.smoothstep(6, 7, ct) : 0;
        setS(i, n.p.x, n.p.y, n.p.z, n.ry + Math.sin(t * 0.3 + i) * 0.4, Math.max(0.001, s * 1.6), Math.sin(t * (0.5 + i * 0.03) + i) * 0.22, 0);
      });
      nymphLie.forEach((n, i) => setL(i, n.p.x, n.p.y, n.p.z, n.ry, 1.5, 0, -1.35 + Math.sin(t * 0.4 + i * 2) * 0.12));
      setS.done(); setL.done();
      const A = nymphStand[from]?.p, B = nymphStand[to]?.p;
      if (A && B && ct > 0.6 && ct < 6.4) {
        const u = (ct - 0.6) / 5.8, l1 = A.y + 0.2, l2 = Math.hypot(B.x - A.x, B.z - A.z), l3 = B.y + 0.2, tot = l1 + l2 + l3, d = u * tot;
        if (d < l1) tmp.set(A.x, A.y + 0.12 - d, A.z);
        else if (d < l1 + l2) tmp.lerpVectors(v(A.x, -0.08, A.z), v(B.x, -0.08, B.z), (d - l1) / l2);
        else tmp.set(B.x, -0.08 + (d - l1 - l2), B.z);
        traveller.position.copy(tmp);
        traveller.visible = w < 0.5;
      } else traveller.visible = false;
      for (const [o, p] of pairs) { p.matrix.copy(o.matrixWorld); p.visible = o.visible; }
    },
  };
};

export default build;
