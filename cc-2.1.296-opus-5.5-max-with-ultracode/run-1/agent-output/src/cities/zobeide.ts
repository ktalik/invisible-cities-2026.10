// ZOBEIDE - Cities & Desire 5.
// A white city under the moon, its streets wound over one another like a ball
// of yarn. Men of many nations dreamed the same woman running at night, seen
// from behind, and lost her; they built the streets of the dream and walled
// every place where she had slipped away. She never came back.
// Night: the chase replays, coloured lanterns fall behind at the turns and a
// wall rises where each loses her. Toggle: wake, the moon pales, and workers
// walk the same streets to their jobs.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const RX = 15, RY = 7;
const surf = (x: number, z: number) => RY * Math.sqrt(Math.max(0, 1 - (x * x + z * z) / (RX * RX)));

const _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
/** Place a geometry at p with its local z along `fwd` and local y near `up`. */
function orient(g: THREE.BufferGeometry, p: THREE.Vector3, fwd: THREE.Vector3, up: THREE.Vector3) {
  _z.copy(fwd).normalize();
  _x.crossVectors(up, _z).normalize();
  _y.crossVectors(_z, _x).normalize();
  _m.makeBasis(_x, _y, _z).setPosition(p);
  return g.applyMatrix4(_m);
}

interface Strand { pts: THREE.Vector3[]; side: THREE.Vector3[]; }

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  // ---- dark plain silvered by the moon, and the white hill of the skein
  root.add(K.groundDisc(110, '#2a3158', '#161a36'));
  const whiteMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, emissive: '#7480b0', emissiveIntensity: 0.45 });
  const hill = K.dome(RX + 0.3, 72, 1, RY / (RX + 0.3));
  K.paintBy(hill, (x, y, z, out) => { out.set('#cfc9bd').lerp(new THREE.Color('#8d93a8'), 0.35 + K.noise3(x * 0.3, y * 0.3, z * 0.3) * 0.25); });
  const hillMesh = new THREE.Mesh(hill, whiteMat);
  hillMesh.receiveShadow = true;
  root.add(hillMesh);

  // ---- the strands: great-circle arcs over the dome at many inclinations
  const strands: Strand[] = [];
  const NS = 20;
  for (let i = 0; i < NS; i++) {
    const az = (i / NS) * Math.PI * 2 + rng.float(-0.12, 0.12);
    const tilt = rng.float(0.15, 1.15);
    const n = new THREE.Vector3(Math.cos(az) * Math.cos(tilt), Math.sin(tilt), Math.sin(az) * Math.cos(tilt)).normalize();
    // basis in the plane perpendicular to n
    const u = new THREE.Vector3(-Math.sin(az), 0, Math.cos(az));
    const v = new THREE.Vector3().crossVectors(n, u).normalize();
    if (v.y < 0) v.negate();
    const lift = 0.18 + (i % 4) * 0.42;
    const endFrac = rng.float(0.55, 0.85);
    const pts: THREE.Vector3[] = [];
    // tail on the plain (a loose end of yarn)
    const start = u.clone().negate();
    const tailDir = new THREE.Vector3(start.x, 0, start.z).normalize();
    for (let k = 2; k >= 1; k--) pts.push(new THREE.Vector3(tailDir.x * (RX + k * 1.0), 0.05, tailDir.z * (RX + k * 1.0)));
    const N = 90;
    for (let k = 0; k <= N * endFrac; k++) {
      const th = (k / N) * Math.PI;
      const d = start.clone().multiplyScalar(Math.cos(th)).addScaledVector(v, Math.sin(th));
      const r = Math.hypot(d.x, d.z);
      const rr = Math.min(1, r) * (RX - 0.2);
      const x = (d.x / (r || 1)) * rr, z = (d.z / (r || 1)) * rr;
      const y = surf(x, z) + lift * K.smoothstep(0, 0.15, th) + 0.06;
      pts.push(new THREE.Vector3(x, y, z));
    }
    const side: THREE.Vector3[] = pts.map((p, k) => {
      const a = pts[Math.max(0, k - 1)], c = pts[Math.min(pts.length - 1, k + 1)];
      const t = c.clone().sub(a).normalize();
      return new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize();
    });
    strands.push({ pts, side });
  }

  const b = new K.Batch();
  const W = 0.9;
  const UP = new THREE.Vector3(0, 1, 0);
  const deadEnds: THREE.Vector3[] = [];
  for (const s of strands) {
    for (let k = 0; k < s.pts.length - 1; k++) {
      const a = s.pts[k], c = s.pts[k + 1];
      const len = a.distanceTo(c), mid = a.clone().add(c).multiplyScalar(0.5);
      const fwd = c.clone().sub(a);
      b.add(orient(K.boxC(W, 0.14, len + 0.04), mid, fwd, UP), '#f2eee6', 'plaster');
      for (const sg of [-1, 1]) {
        const off = mid.clone().addScaledVector(s.side[k], sg * (W / 2 - 0.04));
        b.add(orient(K.boxC(0.08, 0.3, len + 0.04), off.add(new THREE.Vector3(0, 0.15, 0)), fwd, UP), '#e6e0d4', 'plaster');
      }
      // arcade piers where the strand rides above the hill
      const gap = mid.y - surf(mid.x, mid.z);
      if (gap > 0.45 && k % 3 === 0) {
        for (const sg of [-1, 1]) {
          const p = mid.clone().addScaledVector(s.side[k], sg * 0.33);
          const g0 = surf(p.x, p.z) - 0.1;
          b.add(K.at(K.box(0.16, p.y - g0, 0.16), p.x, g0, p.z), '#ddd6c8', 'plaster');
        }
        b.add(orient(K.boxC(W, 0.12, 0.2), mid.clone().add(new THREE.Vector3(0, -0.13, 0)), fwd, UP), '#d4ccbd', 'plaster');
      }
    }
    // the dead end: a blank white wall where the dreamer lost her
    const e = s.pts[s.pts.length - 1], ep = s.pts[s.pts.length - 2];
    b.add(orient(K.boxC(W + 0.3, 1.4, 0.22), e.clone().add(new THREE.Vector3(0, 0.7, 0)), e.clone().sub(ep), UP), '#fbf8f2', 'plaster');
    deadEnds.push(e);
  }
  // stair flights linking strands to the hill
  for (let i = 0; i < 22; i++) {
    const s = strands[i % NS], k = rng.int(8, s.pts.length - 4), p = s.pts[k];
    const gs = surf(p.x, p.z), hgt = p.y - gs;
    if (hgt < 0.5) continue;
    const n = Math.ceil(hgt / 0.13);
    const st = K.stairs(n, 0.5, hgt / n, 0.16);
    const dir = s.side[k].clone().multiplyScalar(rng.sign());
    const ry = Math.atan2(dir.x, dir.z) + Math.PI;
    b.add(K.at(st, p.x + dir.x * (0.45 + n * 0.16), gs - 0.05, p.z + dir.z * (0.45 + n * 0.16), { ry }), '#e9e3d7', 'plaster');
  }
  // sparse stones and pale dust on the plain
  for (let i = 0; i < 60; i++) {
    const [x, z] = rng.inRing(18, 50);
    K.rock(b, { x, z, r: rng.float(0.2, 0.7), color: '#565d80', rng });
  }
  const city = b.build({ name: 'zobeide' });
  city.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && (m.material as THREE.MeshStandardMaterial).roughness !== undefined && !(m.material as THREE.Material).transparent) m.material = whiteMat; });
  root.add(city);

  // ---- houses lining both sides of every strand, built up to its level
  const houses: { x: number; y: number; z: number; w: number; h: number; ry: number }[] = [];
  for (const s of strands) {
    for (let k = 5; k < s.pts.length - 2; k += 1) {
      for (const sg of [-1, 1]) {
        if (rng.chance(0.25)) continue;
        const w = rng.float(0.35, 0.6), p = s.pts[k];
        const x = p.x + s.side[k].x * sg * (W / 2 + w / 2 + 0.04), z = p.z + s.side[k].z * sg * (W / 2 + w / 2 + 0.04);
        const g = surf(x, z);
        houses.push({ x, y: g - 0.1, z, w, h: Math.min(Math.hypot(x, z) > 12.5 ? 0.9 : 2.2, Math.max(0.3, p.y - g) + rng.float(0.25, 0.65)), ry: Math.atan2(s.side[k].x, s.side[k].z) });
      }
    }
  }
  const houseMesh = K.instanced(K.box(1, 1, 1), whiteMat, houses.length, (i, o, c) => {
    const h = houses[i]; o.position.set(h.x, h.y, h.z); o.rotation.y = h.ry; o.scale.set(h.w, h.h, h.w * rng.float(0.9, 1.3));
    c.copy(K.jitter('#f1ede4', rng, 0.01, 0.03, 0.05));
  });
  houseMesh.material = new THREE.MeshStandardMaterial({ roughness: 0.85, emissive: '#7480b0', emissiveIntensity: 0.45 });
  const houseMat = houseMesh.material as THREE.MeshStandardMaterial;
  root.add(houseMesh);
  // a few small domes and dark door recesses
  const domed = houses.filter(() => rng.chance(0.08));
  root.add(K.instanced(K.dome(0.5, 10), houseMat, domed.length, (i, o) => { const h = domed[i]; o.position.set(h.x, h.y + h.h, h.z); o.scale.setScalar(h.w * 0.8); }, { colors: false }));
  const windowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a8').multiplyScalar(2) });
  const lit = houses.filter(() => rng.chance(0.06));
  root.add(K.instanced(K.boxC(0.1, 0.14, 0.02), windowMat, lit.length, (i, o) => { const h = lit[i]; o.position.set(h.x, h.y + h.h - 0.2, h.z); o.rotation.y = h.ry; o.translateZ(h.w * 0.52); }, { castShadow: false, colors: false }));

  // ---- the chase: a pale wisp with long hair-like filaments and nine coloured lanterns
  const chase: THREE.Vector3[] = [];
  const order = [3, 8, 13, 17];
  let cur = strands[order[0]].pts.slice(0, Math.floor(strands[order[0]].pts.length * 0.55));
  chase.push(...cur);
  for (let j = 1; j < order.length; j++) {
    const s = strands[order[j]], last = chase[chase.length - 1];
    let best = 0, bd = 1e9;
    s.pts.forEach((p, k) => { const d = p.distanceTo(last); if (d < bd) { bd = d; best = k; } });
    const fwd = best < s.pts.length / 2 ? 1 : -1;
    cur = [];
    for (let k = best, n = 0; k >= 0 && k < s.pts.length && n < 26; k += fwd, n++) cur.push(s.pts[k]);
    chase.push(...cur);
  }
  const chaseCurve = new THREE.CatmullRomCurve3(chase.map((p) => p.clone().add(new THREE.Vector3(0, 0.3, 0))));
  const CYCLE = 35, RUN = 28;
  const wisp = K.glowSprite('#ffe5d0', 2.2, 0.95);
  root.add(wisp);
  const TRAIL = 40;
  const trailPos = Array.from({ length: TRAIL }, () => new THREE.Vector3());
  const trail = K.glowPoints(trailPos, '#f4ead8', 0.6, 0.7);
  root.add(trail);
  const trailAttr = trail.geometry.attributes.position as THREE.BufferAttribute;
  const LANTERNS = ['#f0a058', '#f2c14e', '#ff7a8a', '#3fd0c0', '#a77bff', '#7ad36a', '#ffffff', '#d9824a', '#5a8cff'];
  const lantPos = LANTERNS.map(() => new THREE.Vector3());
  const lanterns = K.glowPoints(lantPos, '#ffffff', 1.5, 0.95, LANTERNS);
  root.add(lanterns);
  const lantAttr = lanterns.geometry.attributes.position as THREE.BufferAttribute;
  const pursuers = K.crowd({ count: 9, place: () => [0, -5, 0], colors: ['#2a2a3a', '#4a3a5a', '#3a4a5a'], h: 0.3 });
  root.add(pursuers);
  const setP = K.instanceSetter(pursuers);
  const stopU = LANTERNS.map((_, i) => 0.12 + i * 0.095);
  const stopPos = stopU.map((u) => chaseCurve.getPointAt(Math.min(1, u)));
  const newWalls = K.instanced(K.boxC(1.3, 1.4, 0.22), new THREE.MeshStandardMaterial({ color: '#fbf8f2', roughness: 0.9, emissive: '#3b4670', emissiveIntensity: 0.4 }), 9, () => {}, { colors: false });
  newWalls.frustumCulled = false;
  pursuers.frustumCulled = false;
  root.add(newWalls);
  const setW = K.instanceSetter(newWalls);
  const dust = K.particles({ count: 220, radius: 16, y0: 0.2, y1: 9, color: '#e8eefc', size: 0.06, opacity: 0.5, swirl: 0.5, twinkle: 0.8, rng: rng.fork('dust') });
  root.add(dust);
  const mist = K.particles({ count: 140, radius: 26, y0: 0, y1: 1.5, color: '#9aa7d6', size: 2.2, opacity: 0.07, velocity: [0.15, 0, 0.05], swirl: 0.8, rng: rng.fork('mist') });
  root.add(mist);

  // ---- waking: workers on the same strands, a chalky dawn shell, flat fill light
  const workerPaths = strands.map((s) => s.pts.slice(4).map((p) => p.clone().add(new THREE.Vector3(0, 0.08, 0))));
  const workers = new K.Walkers({ paths: workerPaths, count: 520, rng: rng.fork('work'), speed: [0.2, 0.4], colors: ['#5d5a55', '#6b675f', '#4a4844', '#7a6f60'], h: 0.22 });
  root.add(workers.mesh);
  const dawn = new THREE.Mesh(K.sphere(95, 32, 16), new THREE.MeshBasicMaterial({ color: '#b9b4aa', side: THREE.BackSide, transparent: true, opacity: 0, fog: false, depthWrite: true }));
  dawn.renderOrder = -1;
  root.add(dawn);
  const dawnGround = new THREE.Mesh(K.at(K.disc(110, 64), 0, 0.02, 0), new THREE.MeshStandardMaterial({ color: '#a39d90', roughness: 1, transparent: true, opacity: 0 }));
  dawnGround.receiveShadow = true;
  root.add(dawnGround);
  const dawnLight = new THREE.HemisphereLight('#efe8dc', '#8a8274', 0);
  root.add(dawnLight);

  const wake = new K.Toggle(0.35);
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

  return {
    root,
    env: {
      skyTop: '#140f33', skyHorizon: '#2d3a6c', skyBottom: '#1b2041', skyCurve: 0.55,
      fog: '#343e6a', fogNear: 60, fogFar: 150,
      sunDir: [-0.62, 0.5, -0.6], sunColor: '#d6e0ff', sunIntensity: 3.2, sunDisc: 0, sunGlow: 0.4,
      moon: { dir: [-0.55, 0.07, -0.83], size: 4.5, color: '#fff6e6' },
      hemiSky: '#8a9ad0', hemiGround: '#2a3158', hemiIntensity: 0.9, envIntensity: 0.6,
      stars: 0.75, clouds: 0.08, cloudColor: '#5a6699',
      bloomStrength: 0.85, bloomThreshold: 0.7, bloomRadius: 0.6,
      tiltShift: 0.4, shadowRadius: 20, vignette: 0.45, saturation: 1.0,
    },
    camera: {
      position: [12, 17.5, 36], target: [0, 4.5, 0], fov: 45,
      minDistance: 12, maxDistance: 90, maxPolar: 1.42, autoRotate: 0.2,
      views: [
        { position: [2, 42, 14], target: [0, 0, 0] },
        { position: [9, 9, 13], target: [0, 5, 0] },
      ],
    },
    interaction: {
      label: 'Wake',
      activeLabel: 'Dream again',
      hint: 'The streets of a dream, walked to work.',
      camera: { position: [4, 38, 20], target: [0, 1, 0] },
      set: (on) => wake.set(on),
    },
    update(t, dt) {
      wake.update(dt);
      const v = wake.value, night = 1 - v;
      whiteMat.emissiveIntensity = 0.45 * night;
      houseMat.emissiveIntensity = 0.45 * night;
      whiteMat.color.setRGB(1 - v * 0.18, 1 - v * 0.2, 1 - v * 0.28);
      houseMat.color.setRGB(1 - v * 0.15, 1 - v * 0.18, 1 - v * 0.26);
      (dawn.material as THREE.MeshBasicMaterial).opacity = v * 0.97;
      dawn.visible = v > 0.001;
      (dawnGround.material as THREE.MeshStandardMaterial).opacity = v * 0.9;
      dawnGround.visible = v > 0.001;
      dawnLight.intensity = v * 1.6;
      windowMat.color.setRGB(2 * night, 1.7 * night, 1.3 * night);
      workers.mesh.visible = v > 0.05;
      if (workers.mesh.visible) workers.update(t);
      // the dream chase
      const c = t % CYCLE;
      const u = K.clamp(c / RUN);
      const showChase = night > 0.02;
      wisp.visible = showChase && c < RUN + 2;
      chaseCurve.getPointAt(Math.min(1, u), tmp);
      const fade = c > RUN ? Math.max(0, 1 - (c - RUN) / 2) : 1;
      wisp.position.copy(tmp).add(tmp2.set(0, (c > RUN ? (c - RUN) * 2 : 0), 0));
      wisp.material.opacity = 0.95 * fade * night;
      for (let i = 0; i < TRAIL; i++) {
        const uu = Math.max(0, u - i * 0.0022);
        chaseCurve.getPointAt(uu, tmp2);
        tmp2.y += Math.sin(t * 6 + i * 0.5) * 0.03 * i * 0.1 + 0.05 * i * 0.02;
        if (c > RUN) tmp2.y += (c - RUN) * (2 + i * 0.15);
        trailAttr.setXYZ(i, tmp2.x, tmp2.y, tmp2.z);
      }
      trailAttr.needsUpdate = true;
      (trail.material as THREE.PointsMaterial).opacity = 0.6 * fade * night;
      LANTERNS.forEach((_, i) => {
        const lag = 0.03 + i * 0.012;
        const pu = Math.min(stopU[i], Math.max(0, u - lag));
        const stopped = u - lag >= stopU[i];
        chaseCurve.getPointAt(pu, tmp);
        lantAttr.setXYZ(i, tmp.x, tmp.y + 0.15, tmp.z);
        setP(i, tmp.x, tmp.y - 0.25, tmp.z, 0, showChase ? 1 : 0);
        // a wall rises where he lost her
        const rise = stopped ? K.smoothstep(0, 0.8, (u - lag - stopU[i]) * RUN) : 0;
        const sp = stopPos[i];
        chaseCurve.getTangentAt(Math.min(1, stopU[i] + 0.01), tmp2);
        setW(i, sp.x + tmp2.x * 0.7, sp.y - 0.3 - 0.7 * (1 - rise) + 0.7, sp.z + tmp2.z * 0.7, Math.atan2(tmp2.x, tmp2.z), [1, Math.max(0.001, rise), 1]);
      });
      setP.done(); setW.done();
      lantAttr.needsUpdate = true;
      (lanterns.material as THREE.PointsMaterial).opacity = 0.95 * night * (c > RUN + 3 ? 0.4 : 1);
      dust.visible = night > 0.05;
    },
  };
};

export default build;
