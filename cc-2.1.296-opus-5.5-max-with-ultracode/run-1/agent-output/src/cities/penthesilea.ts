// PENTHESILEA - Continuous Cities 5.
// A straight road through endless outskirts under a dusty sky: sheds,
// warehouses, smoking factories, container yards, empty lots behind wire,
// shabby blocks, pylons. Far ahead, a pale skyline promises the centre, and
// every signpost points to it in a different direction. Toggle: drive on in
// search of the centre; mile after mile the periphery goes by and the skyline
// stays exactly as far away.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const SL = 20; // strip length
const NS = 8; // strips
const ZMIN = -112; // strips wrap within [ZMIN, ZMIN + NS * SL)
const SPEED = 9;

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const world = new THREE.Group();
  root.add(world);

  // the shared signpost texture: CENTRE, with an arrow
  const signTex = K.canvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = '#e9e3cf'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2c3a4a'; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = '#2c3a4a'; g.font = 'bold 34px Helvetica, Arial, sans-serif'; g.textBaseline = 'middle';
    g.fillText('CENTRE', 18, h / 2 + 2);
    g.beginPath(); g.moveTo(200, 18); g.lineTo(238, 32); g.lineTo(200, 46); g.closePath(); g.fill();
    g.fillRect(170, 28, 32, 8);
  });
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.8, side: THREE.DoubleSide });

  const WALLS = ['#8d9499', '#a7a08e', '#7d6a58', '#9a5a42', '#6f7b74', '#b8ad94', '#8e8676'];
  const strips: THREE.Group[] = [];
  for (let si = 0; si < NS; si++) {
    const r = rng.fork('strip' + si);
    const g = new THREE.Group();
    const b = new K.Batch();
    const wires: [THREE.Vector3, THREE.Vector3][] = [];
    const smokeSrc: [number, number, number][] = [];
    // ground: dust, gravel and weeds
    const ground = K.paintBy(K.plane(110, SL, 44, 8), (x, _y, z, out) => {
      const n = K.fbm2(x * 0.08 + si * 13.1, (z + si * SL) * 0.08, 3);
      out.set('#a39a7c').lerp(new THREE.Color('#7f8158'), K.smoothstep(0.0, 0.5, n)).lerp(new THREE.Color('#b8ad90'), K.smoothstep(0.1, -0.5, n) * 0.6);
    });
    b.add(ground, null, 'matte');
    // the road, its verges and lamps
    b.add(K.at(K.box(3.4, 0.02, SL), 0, 0, 0), '#4b4a48', 'matte');
    for (const s of [-1, 1]) b.add(K.at(K.box(0.6, 0.03, SL), s * 2.0, 0, 0), '#8f897c', 'stone');
    for (let z = -SL / 2 + 1; z < SL / 2; z += 2) b.add(K.at(K.box(0.08, 0.025, 0.9), 0, 0, z), '#e8e2cf', 'matte');
    for (let z = -SL / 2 + 2.5; z < SL / 2; z += 5) {
      for (const s of [-1, 1]) {
        b.add(K.at(K.cyl(0.04, 0.05, 2.4, 5), s * 2.2, 0, z), '#5a5c5e', 'metal');
        b.add(K.at(K.box(0.6, 0.04, 0.08), s * 1.95, 2.38, z), '#5a5c5e', 'metal');
        b.add(K.at(K.box(0.22, 0.05, 0.12), s * 1.72, 2.34, z), '#ffb35a', 'glow', 2.6);
      }
    }
    const cross = si % 2 === 0;
    if (cross) {
      b.add(K.at(K.box(110, 0.021, 2.6), 0, 0, 0), '#555350', 'matte');
      // the signpost: every arm says CENTRE, every arm points elsewhere
      b.add(K.at(K.cyl(0.05, 0.05, 2.3, 6), 2.5, 0, 2.2), '#6a6c6e', 'metal');
      const arms: THREE.BufferGeometry[] = [];
      const dirs = r.shuffle([0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI / 4]).slice(0, 3);
      dirs.forEach((a, k) => arms.push(new THREE.PlaneGeometry(1.2, 0.3).translate(0.6, 0, 0).rotateY(a).translate(2.5, 1.5 + k * 0.33, 2.2)));
      const sign = new THREE.Mesh(K.merge(arms, true), signMat);
      sign.castShadow = true;
      g.add(sign);
    }
    // lots on both sides
    for (const side of [-1, 1]) {
      for (const [z0, z1] of cross ? [[-SL / 2, -1.5], [1.5, SL / 2]] : [[-SL / 2, 0], [0, SL / 2]]) {
        let x = 3.2;
        while (x < 46) {
          const w = r.float(4, 9);
          const a = x, bb = x + w;
          const cx = side * (a + bb) / 2, cz = (z0 + z1) / 2, d = z1 - z0;
          const kind = r.weighted(['shed', 'ware', 'factory', 'lot', 'block', 'yard'], [0.24, 0.2, 0.12, 0.2, 0.14, 0.1]);
          const ry = side > 0 ? -Math.PI / 2 : Math.PI / 2; // fronts face the road
          if (kind === 'shed') {
            const n = r.int(1, 2);
            for (let k = 0; k < n; k++) {
              const zz = n === 1 ? cz : cz + (k - 0.5) * d * 0.45;
              K.house(b, { x: cx + r.float(-0.5, 0.5), z: zz, ry, w: Math.min(d / n, 4) * 0.8, d: w * 0.55, h: r.float(1.2, 2.0), roof: r.pick(['shed', 'gable'] as const), roofH: 0.6, wall: K.pickJitter(WALLS, r), roofColor: r.pick(['#7c8288', '#8a5a3e', '#6d7276']), roofFinish: 'stone', lit: 0.05, glow: 2, rng: r });
            }
          } else if (kind === 'ware') {
            const ww = w * 0.8, dd = d * 0.75, h = r.float(2.0, 3.2);
            b.add(K.at(K.box(ww, h, dd), cx, 0, cz), K.pickJitter(['#b3aa98', '#a39d90', '#bfb6a0'], r), 'plaster');
            const teeth = Math.max(2, Math.floor(dd / 1.6));
            for (let k = 0; k < teeth; k++) b.add(K.at(K.shedRoof(ww, dd / teeth, 0.05, 0.7), cx, h, cz - dd / 2 + (k + 0.5) * (dd / teeth)), '#7f8487', 'stone');
            for (let k = 0; k < 3; k++) b.add(K.at(K.box(0.04, 1.1, 0.9), cx - side * ww / 2 - side * 0.02, 0, cz + (k - 1) * 1.4), '#3d3f40', 'metal');
          } else if (kind === 'factory') {
            const ww = w * 0.7, dd = d * 0.6, h = r.float(2.2, 3.6);
            b.add(K.at(K.box(ww, h, dd), cx, 0, cz), K.pickJitter(['#9a5a42', '#8a7a68', '#a56a50'], r), 'stone');
            b.add(K.at(K.gableRoof(ww, dd, 0.9), cx, h, cz), '#5d6266', 'stone');
            const nc = r.int(1, 3);
            for (let k = 0; k < nc; k++) {
              const chx = cx + side * (ww / 2 + 0.6), chz = cz + (k - (nc - 1) / 2) * 1.3, chh = r.float(5, 8.5);
              b.add(K.at(K.cyl(0.22, 0.34, chh, 10), chx, 0, chz), '#8e5a46', 'stone');
              for (let bnd = 1; bnd < 3; bnd++) b.add(K.at(K.cyl(0.235 - bnd * 0.03, 0.235 - bnd * 0.03 + 0.01, 0.35, 10), chx, chh - bnd * 0.9, chz), '#e6e0d2', 'stone');
              smokeSrc.push([chx, chh + 0.1, chz]);
            }
            b.add(K.at(K.cyl(1.0, 1.0, 1.6, 16), cx - side * (ww / 2 - 1.2), 0, cz + dd / 2 + 1.3), '#a9aaa6', 'stone');
          } else if (kind === 'lot') {
            // an empty lot behind wire: weeds, a scrap heap, maybe a billboard
            const corners = [[a + 0.3, z0 + 0.4], [bb - 0.3, z0 + 0.4], [bb - 0.3, z1 - 0.4], [a + 0.3, z1 - 0.4]];
            for (let k = 0; k < 4; k++) {
              const [xa, za] = corners[k], [xb, zb] = corners[(k + 1) % 4];
              const L = Math.hypot(xb - xa, zb - za);
              for (let s = 0; s <= L; s += 1.5) b.add(K.at(K.cyl(0.025, 0.025, 0.7, 4), side * (xa + ((xb - xa) * s) / L), 0, za + ((zb - za) * s) / L), '#6a6560', 'metal');
              for (const y of [0.3, 0.62]) wires.push([new THREE.Vector3(side * xa, y, za), new THREE.Vector3(side * xb, y, zb)]);
            }
            for (let k = 0; k < 26; k++) b.add(K.at(K.cone(0.1, r.float(0.2, 0.5), 4), side * r.float(a + 0.5, bb - 0.5), 0, r.float(z0 + 0.6, z1 - 0.6)), K.pickJitter(['#6f7a3e', '#8a8a4a', '#5f6a38'], r), 'matte');
            if (r.chance(0.6)) for (let k = 0; k < 7; k++) K.rock(b, { x: cx + r.float(-1, 1), z: cz + r.float(-1.5, 1.5), r: r.float(0.3, 0.6), color: r.pick(['#7a4a32', '#5d5a55', '#8a6a4a']), rng: r, flat: 0.5 });
            if (r.chance(0.5)) {
              const bx = side * (a + 0.6), bz = cz;
              for (const o of [-1, 1]) b.add(K.at(K.box(0.1, 2.4, 0.1), bx, 0, bz + o * 1.1), '#5a5c5e', 'metal');
              b.add(K.at(K.box(0.08, 1.3, 3.0), bx, 2.0, bz), K.pickJitter(['#c76a3c', '#3f6f8f', '#d9b65a', '#8f4f6a'], r), 'matte');
              b.add(K.at(K.box(0.09, 0.4, 2.2), bx, 2.4, bz - 0.2), '#efe6d2', 'matte');
            }
          } else if (kind === 'block') {
            const n = r.int(1, 2);
            for (let k = 0; k < n; k++) {
              K.house(b, { x: cx, z: n === 1 ? cz : cz + (k - 0.5) * d * 0.5, ry, w: Math.min(d / n * 0.75, 4.5), d: Math.min(w * 0.5, 2.6), h: r.float(3, 5.5), roof: 'flat', wall: K.pickJitter(['#c9bba3', '#b9b0a0', '#a8a294', '#c4a88a'], r), lit: 0.12, glow: 2.2, litColor: '#ffd58a', cornice: true, rng: r });
            }
          } else {
            // container yard
            for (let k = 0; k < 14; k++) {
              const lvl = k < 9 ? 0 : 1;
              b.add(K.at(K.box(0.9, 0.9, 2.2), cx + side * ((k % 3) - 1) * 1.0, lvl * 0.9, cz + (Math.floor((k % 9) / 3) - 1) * 2.4), r.pick(['#a5442f', '#2f5d7a', '#c58b2c', '#3f6b4a', '#7a7d80']), 'wood');
            }
          }
          x = bb + r.float(0.4, 1.5);
        }
      }
    }
    // a pylon line crossing the land
    for (const s of [-1, 1]) {
      const px = s * 22;
      for (const [x0, x1] of [[-0.6, -0.3], [0.6, 0.3]]) b.add(K.strut([px + x0, 0, 0], [px + x1 * 0.3, 7, 0], 0.06, 4), '#6c7074', 'metal');
      b.add(K.at(K.box(2.4, 0.1, 0.1), px, 6.2, 0), '#6c7074', 'metal');
      b.add(K.at(K.box(1.6, 0.1, 0.1), px, 7.0, 0), '#6c7074', 'metal');
      for (const wx of [-1.1, 1.1]) {
        const pts = K.ropePoints([px + wx, 6.1, -SL / 2], [px + wx, 6.1, SL / 2], 0.8, 6);
        for (let k = 0; k < pts.length - 1; k++) wires.push([pts[k], pts[k + 1]]);
      }
    }
    g.add(b.build({ name: 'strip' + si }));
    if (wires.length) g.add(K.lines(wires, '#3f3d3a', 0.7));
    if (smokeSrc.length) g.add(K.smoke({ sources: smokeSrc, perSource: 12, height: 6, color: '#cfc6b4', opacity: 0.32, size: [0.5, 1.6], wind: [0.5, 0.2], rng: r.fork('smoke') }));
    world.add(g);
    strips.push(g);
  }

  // ---- the promised centre: a pale skyline that is always just as far away
  const skyGeos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 40; i++) {
    const x = (i / 40 - 0.5) * 90 + rng.float(-2, 2);
    const h = 8 + 18 * Math.pow(rng.next(), 1.5) * (1 - Math.abs(x) / 60);
    skyGeos.push(K.at(K.box(rng.float(2.5, 5.5), h, rng.float(2.5, 5)), x, 0, -rng.float(0, 8)));
  }
  const skylineGeo = K.merge(skyGeos);
  const skyline = new THREE.Mesh(skylineGeo, new THREE.MeshBasicMaterial({ color: '#b3a68a', fog: false, transparent: true, opacity: 0.55, depthWrite: false }));
  skyline.position.set(0, 0, -150);
  root.add(skyline);

  // ---- traffic and the traveller's car
  const carGeo = K.merge([K.paint(K.at(K.box(0.6, 0.22, 1.2), 0, 0.08, 0), '#ffffff'), K.paint(K.at(K.box(0.54, 0.2, 0.62), 0, 0.3, -0.05), '#bcc6cc')]);
  const NC = 14;
  const traffic = K.instanced(carGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }), NC, (_i, _o, c) => { c.set(rng.pick(['#8a2f28', '#2b4f8a', '#d8d4c8', '#3a3d40', '#c9a23a', '#4f6a5a'])); });
  root.add(traffic);
  const setT = K.instanceSetter(traffic);
  const tc = Array.from({ length: NC }, (_, i) => ({ z0: rng.float(0, NS * SL), lane: i % 2 ? -0.8 : 0.8, v: (i % 2 ? 1 : -1) * rng.float(4, 7) }));
  const me = new THREE.Mesh(K.merge([K.paint(K.at(K.box(0.62, 0.24, 1.25), 0, 0.08, 0), '#c8402f'), K.paint(K.at(K.box(0.56, 0.2, 0.64), 0, 0.32, 0.05), '#d9e2e8'), K.paint(K.at(K.box(0.5, 0.06, 0.04), 0, 0.14, -0.64), '#fff1c0')]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 }));
  me.castShadow = true;
  me.position.set(0.8, 0, 5);
  root.add(me);
  const headlights = K.glowPoints([[0.62, 0.22, 4.36], [0.98, 0.22, 4.36]], '#ffe9b0', 0.5, 0.0);
  root.add(headlights);
  const crows = new K.Flock({ count: 18, center: [6, 0, -14], radius: 10, height: 9, color: '#2a2724', span: 0.35, speed: 0.25, rng: rng.fork('crows') });
  root.add(crows.mesh);
  root.add(K.particles({ count: 260, radius: 40, center: [0, 0, -20], y0: 0.3, y1: 6, color: '#e8dcc0', size: 0.12, opacity: 0.35, velocity: [0.4, 0.05, 0.6], swirl: 0.8, rng: rng.fork('dust') }));

  const tog = new K.Toggle(0.4);
  let dist = 0;
  const W = NS * SL;
  return {
    root,
    env: {
      skyTop: '#8f9aa0', skyHorizon: '#dccaa3', skyBottom: '#b5a688', skyCurve: 0.55,
      fog: '#d2c29f', fogNear: 22, fogFar: 105,
      sunDir: [0.75, 0.38, -0.25], sunColor: '#ffd9a0', sunIntensity: 2.6, sunDisc: 0.6, sunGlow: 1.1,
      hemiSky: '#c9c2b0', hemiGround: '#7a6e58', hemiIntensity: 0.75, envIntensity: 0.65,
      clouds: 0.55, cloudColor: '#efe3c9', stars: 0,
      bloomStrength: 0.45, bloomThreshold: 0.85, tiltShift: 0.4, shadowRadius: 28, vignette: 0.4, saturation: 0.92, contrast: 1.06,
    },
    camera: {
      position: [9, 8.5, 17], target: [0, 1.5, -8], minDistance: 4, maxDistance: 60, maxPolar: 1.45, autoRotate: 0,
      views: [
        { position: [-26, 30, 18], target: [0, 0, -12] },
        { position: [1.6, 1.4, 8.6], target: [0.3, 1.4, -20] },
      ],
    },
    interaction: {
      label: 'Search for the centre',
      activeLabel: 'Stop and look around',
      hint: 'Mile after mile of outskirts; the centre is always further on.',
      set: (on) => tog.set(on),
    },
    update(t, dt) {
      tog.update(dt);
      dist += dt * SPEED * tog.value;
      for (let i = 0; i < NS; i++) {
        const z = ZMIN + ((((i * SL + dist) % W) + W) % W);
        strips[i].position.z = z + SL / 2;
      }
      for (let i = 0; i < NC; i++) {
        const c = tc[i];
        const z = ZMIN + ((((c.z0 + c.v * t + dist) % W) + W) % W);
        const hide = c.lane > 0 && z > 1.5 && z < 8.5;
        setT(i, c.lane, 0, z, c.v > 0 ? Math.PI : 0, hide ? 0 : 1);
      }
      setT.done();
      me.position.y = Math.abs(Math.sin(t * 13)) * 0.012 * tog.value;
      (headlights.material as THREE.PointsMaterial).opacity = 0.25 + 0.6 * tog.value;
      crows.update(t);
    },
  };
};

export default build;
