// TRUDE - Continuous Cities 2.
// One square of suburb (an airport, a terminal, a control tower, two rows of
// identical yellow and green houses, the same billboard) repeated to the
// horizon in every direction: the world covered by a single city. Toggle: take
// off, fly, land at another Trude identical point for point; only the name on
// the terminal changes.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const T = 16; // tile size
const NAMES = ['TRUDE INTL', 'TRUDE EAST', 'NEW TRUDE', 'TRUDE NORTH', 'GREATER TRUDE', 'TRUDE CENTRAL', 'UPPER TRUDE', 'TRUDE WEST'];
const D = 3 * T; // a journey crosses three identical squares
const DUR = 6.5; // seconds per flight

/** A small airliner facing +x, wheels at y = 0. */
function airliner(len = 1.7, tail: K.ColorLike = '#2f6fb0'): THREE.BufferGeometry {
  const W = '#f3f4f2', G = '#c3c8cc';
  const r = len * 0.075, yc = r * 2.6, L = len;
  const fin = new THREE.Shape([new THREE.Vector2(-0.28 * L, 0), new THREE.Vector2(-0.46 * L, 0.24 * L), new THREE.Vector2(-0.53 * L, 0.24 * L), new THREE.Vector2(-0.5 * L, 0)]);
  const parts = [
    K.paint(K.at(K.cyl(r, r, L * 0.78, 12), -L * 0.39, yc, 0, { rz: -Math.PI / 2 }), W),
    K.paint(K.at(K.sphere(r, 12, 8), L * 0.39, yc, 0, { s: [2.0, 1, 1] }), W),
    K.paint(K.at(K.cone(r, L * 0.2, 12), -L * 0.39, yc, 0, { rz: Math.PI / 2 }), W),
    K.paint(K.at(K.box(L * 0.66, r * 0.2, r * 2.04), 0.02, yc + r * 0.1, 0), tail),
    K.paint(K.at(K.prism([[L * 0.12, 0], [-L * 0.1, L * 0.5], [-L * 0.2, L * 0.5], [-L * 0.14, 0]], r * 0.25), 0, yc - r * 0.6, 0), G),
    K.paint(K.at(K.prism([[L * 0.12, 0], [-L * 0.14, 0], [-L * 0.2, -L * 0.5], [-L * 0.1, -L * 0.5]], r * 0.25), 0, yc - r * 0.6, 0), G),
    K.paint(K.at(K.extrudeZ(fin, r * 0.25), 0, yc + r * 0.5, 0), tail),
    K.paint(K.at(K.box(L * 0.1, r * 0.15, L * 0.36), -L * 0.5, yc + r * 0.2, 0), G),
  ];
  for (const s of [-1, 1]) parts.push(K.paint(K.at(K.cyl(r * 0.42, r * 0.45, L * 0.16, 8), -L * 0.03, yc - r * 0.9, s * L * 0.17, { rz: -Math.PI / 2 }), '#8d949a'));
  for (const [x, z] of [[0, -r * 0.9], [0, r * 0.9], [L * 0.3, 0]]) parts.push(K.paint(K.at(K.cyl(0.012, 0.012, yc - r * 0.8, 4), x, 0, z), '#333333'));
  return K.merge(parts);
}

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const world = new THREE.Group();
  root.add(world);

  // ================================================================ one tile
  const b = new K.Batch();
  const LAWN = '#8db466', ROAD = '#4c4f53', CONC = '#c3c0b6', ASPH = '#3b3e42';
  b.add(K.at(K.box(T, 0.04, T), 0, -0.04, 0), LAWN, 'matte');
  // boundary roads (continuous across tiles) and the suburb street
  b.add(K.at(K.box(T, 0.02, 0.8), 0, 0, -7.6), ROAD, 'matte');
  b.add(K.at(K.box(0.8, 0.021, T), -7.6, 0, 0), ROAD, 'matte');
  b.add(K.at(K.box(T - 0.8, 0.02, 0.7), 0.4, 0, 3.6), ROAD, 'matte');
  b.add(K.at(K.box(0.6, 0.02, 7.2), 0, 0, 3.6), ROAD, 'matte');
  for (let x = -7.6; x < 8; x += 0.8) b.add(K.at(K.box(0.36, 0.03, 0.04), x, 0, -7.6), '#e9d36a', 'matte');
  for (let z = -7.6; z < 8; z += 0.8) b.add(K.at(K.box(0.04, 0.031, 0.36), -7.6, 0, z), '#e9d36a', 'matte');
  // the airport: apron, runway, taxiway
  b.add(K.at(K.box(14.4, 0.012, 6.6), 0.2, 0, -3.8), CONC, 'stone');
  b.add(K.at(K.box(13.2, 0.025, 1.4), 0, 0, -5.4), ASPH, 'matte');
  for (let x = -5.6; x < 6; x += 0.7) b.add(K.at(K.box(0.36, 0.03, 0.05), x, 0, -5.4), '#f4f4ef', 'matte');
  for (const ex of [-6.3, 6.3]) for (let k = -2; k <= 2; k++) if (k) b.add(K.at(K.box(0.4, 0.03, 0.07), ex, 0, -5.4 + k * 0.2), '#f4f4ef', 'matte');
  b.add(K.at(K.box(12.4, 0.02, 0.45), 0, 0, -3.55), '#5b5e62', 'matte');
  for (const x of [-6, 6]) b.add(K.at(K.box(0.45, 0.02, 1.4), x, 0, -4.3), '#5b5e62', 'matte');
  for (let x = -6.5; x <= 6.5; x += 0.65) for (const z of [-6.15, -4.65]) b.add(K.at(K.sphere(0.035, 6, 4), x, 0.04, z), x < -6.2 ? '#7dff9a' : '#dff2ff', 'glow', 2.2);
  // terminal: long low hall with glazing, jetways and a roof sign frame
  const TX = -1.2, TZ = -1.5;
  b.add(K.at(K.box(6.4, 0.95, 1.3), TX, 0, TZ), '#eef0ee', 'plaster');
  b.add(K.at(K.box(6.2, 0.5, 0.02), TX, 0.25, TZ - 0.66), '#3a5f82', 'polished');
  b.add(K.at(K.box(6.2, 0.5, 0.02), TX, 0.25, TZ + 0.66), '#3a5f82', 'polished');
  b.add(K.at(K.box(6.6, 0.1, 1.5), TX, 0.95, TZ), '#d5d8d6', 'stone');
  for (let i = 0; i < 3; i++) {
    const jx = TX - 2 + i * 2;
    b.add(K.at(K.box(0.22, 0.2, 0.9), jx, 0.4, TZ - 1.1), '#d9dcdc', 'plaster');
    b.add(K.at(K.cyl(0.03, 0.03, 0.4, 5), jx, 0, TZ - 1.45), '#6a6e72', 'metal');
  }
  for (const sx of [-1.4, 1.4]) b.add(K.at(K.box(0.05, 0.5, 0.05), TX + sx, 0.95, TZ), '#6a6e72', 'metal');
  // control tower
  b.add(K.at(K.cyl(0.16, 0.22, 2.6, 12), 4.4, 0, -1.4), '#e8eaea', 'plaster');
  b.add(K.at(K.cyl(0.46, 0.34, 0.42, 10), 4.4, 2.6, -1.4), '#2f4f6e', 'polished');
  b.add(K.at(K.cyl(0.5, 0.5, 0.08, 12), 4.4, 3.02, -1.4), '#e8eaea', 'plaster');
  b.add(K.at(K.cyl(0.015, 0.015, 0.5, 4), 4.4, 3.1, -1.4), '#999999', 'metal');
  b.add(K.at(K.sphere(0.05, 6, 4), 4.4, 3.62, -1.4), '#ff4a3a', 'glow', 3);
  // parked airliners at the gates and the car park
  for (let i = 0; i < 2; i++) b.add(K.at(airliner(1.7, '#2f6fb0'), TX - 2 + i * 4, 0, TZ - 2.6, { ry: -Math.PI / 2 }), null, 'ceramic');
  for (let i = 0; i < 16; i++) {
    const x = 5.6 + (i % 4) * 0.45, z = -1.0 - Math.floor(i / 4) * 0.42;
    if (i === 6 || i === 13) continue;
    b.add(K.at(K.box(0.3, 0.12, 0.17), x, 0.02, z, { ry: Math.PI / 2 }), rng.pick(['#c9372c', '#2b4f8a', '#e8e6e0', '#3a3d40', '#d9b43a']), 'ceramic');
  }
  // the suburb: two rows of identical houses, yellow and green, alternating
  for (const [rz, face] of [[1.9, 0], [5.3, Math.PI]] as const) {
    for (let i = 0; i < 12; i++) {
      const x = -6.8 + i * 1.22;
      if (Math.abs(x) < 0.7) continue;
      const yellow = i % 2 === 0;
      K.house(b, { x, z: rz, ry: face, w: 0.9, d: 0.8, h: 0.62, roof: 'gable', roofH: 0.38, wall: yellow ? '#ecc84c' : '#8fc36c', roofColor: '#9b4a36', rng, cornice: false });
      const dz = face === 0 ? 0.75 : -0.75;
      b.add(K.at(K.box(0.3, 0.012, 0.95), x + 0.32, 0, rz + dz * 0.75), '#a9a69e', 'stone');
      b.add(K.at(K.box(0.28, 0.11, 0.15), x + 0.32, 0.02, rz + dz, { ry: Math.PI / 2 }), '#d0d4d8', 'ceramic');
      K.tree(b, { x: x - 0.25, z: rz - dz * 1.05, kind: 'round', h: 0.9, color: '#4f7f3a', rng });
      b.add(K.at(K.box(1.15, 0.12, 0.03), x, 0, rz - dz * 1.42), '#f2f2ee', 'wood');
    }
  }
  // the same signs at the same corners
  for (const [x, z] of [[-7, -6.9], [-6.9, 3], [0.6, 7.0]] as const) {
    b.add(K.at(K.cyl(0.02, 0.02, 0.55, 4), x, 0, z), '#9aa0a5', 'metal');
    b.add(K.at(K.box(0.24, 0.16, 0.02), x, 0.5, z), '#2c64b0', 'ceramic');
  }
  for (const sx of [-0.7, 0.7]) b.add(K.at(K.box(0.05, 1.0, 0.05), -4 + sx, 0, -0.15), '#5f6468', 'metal');
  const tileGroup = b.build({ name: 'trude-tile' });

  // tile offsets: 8 columns along the flight line, 5 rows
  const offsets: [number, number][] = [];
  for (let ix = -3; ix <= 4; ix++) for (let iz = -2; iz <= 2; iz++) offsets.push([ix * T, iz * T]);
  const toInstances = (mesh: THREE.Mesh, local?: THREE.Matrix4) => {
    const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, offsets.length);
    const m = new THREE.Matrix4();
    offsets.forEach(([x, z], i) => {
      m.makeTranslation(x, 0, z);
      if (local) m.multiply(local);
      im.setMatrixAt(i, m);
    });
    im.castShadow = mesh.castShadow;
    im.receiveShadow = mesh.receiveShadow;
    im.frustumCulled = false;
    return im;
  };
  for (const c of [...tileGroup.children]) world.add(toInstances(c as THREE.Mesh));

  // the airport's name board (all boards share one texture: it changes when you land)
  const nameTex = NAMES.map((n) => K.canvasTexture(512, 112, (g, w, h) => {
    g.fillStyle = '#163a6b';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2f6fa';
    g.font = 'bold 64px Helvetica, Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(n, w / 2, h / 2 + 3);
  }));
  const boardMat = new THREE.MeshBasicMaterial({ map: nameTex[0] });
  const boardGeo = new THREE.PlaneGeometry(2.6, 0.57);
  for (const [rx, z] of [[0, TZ + 0.03], [Math.PI, TZ - 0.03]] as const) {
    world.add(toInstances(new THREE.Mesh(boardGeo, boardMat), new THREE.Matrix4().compose(new THREE.Vector3(TX, 1.45, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rx, 0)), new THREE.Vector3(1, 1, 1))));
  }
  // the same billboard everywhere
  const adTex = K.canvasTexture(256, 112, (g, w, h) => {
    g.fillStyle = '#f6efe0';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#e9c13f';
    g.fillRect(14, 46, 40, 40);
    g.beginPath(); g.moveTo(10, 48); g.lineTo(34, 24); g.lineTo(58, 48); g.fill();
    g.fillStyle = '#86bd62';
    g.fillRect(66, 46, 40, 40);
    g.beginPath(); g.moveTo(62, 48); g.lineTo(86, 24); g.lineTo(110, 48); g.fill();
    g.fillStyle = '#c43a2e';
    g.font = 'bold 30px Helvetica, Arial, sans-serif';
    g.fillText('HOME', 122, 52);
    g.fillStyle = '#2a3a52';
    g.font = 'bold 20px Helvetica, Arial, sans-serif';
    g.fillText('AGAIN', 124, 82);
  });
  world.add(toInstances(new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.74), new THREE.MeshStandardMaterial({ map: adTex, roughness: 0.8, side: THREE.DoubleSide })), new THREE.Matrix4().makeTranslation(-4, 1.25, -0.12)));

  // ================================================================ traffic
  const carGeo = K.merge([K.paint(K.at(K.box(0.3, 0.09, 0.15), 0, 0.02, 0), '#ffffff'), K.paint(K.at(K.box(0.16, 0.07, 0.13), -0.02, 0.11, 0), '#cfd8e0')]);
  type Car = { axis: 0 | 1; lane: number; x0: number; v: number };
  const cars: Car[] = [];
  const XW = 8 * T, X0 = -3.5 * T, ZW = 5 * T, Z0 = -2.5 * T;
  for (let iz = -2; iz <= 2; iz++) for (const [lane, v] of [[-7.8, 1.3], [-7.4, -1.3], [3.45, 0.8], [3.75, -0.8]] as const) for (let k = 0; k < 5; k++) cars.push({ axis: 0, lane: iz * T + lane, x0: rng.float(0, XW), v: v * rng.float(0.85, 1.15) });
  for (let ix = -3; ix <= 4; ix++) for (const [lane, v] of [[-7.8, 1.1], [-7.4, -1.1]] as const) for (let k = 0; k < 3; k++) cars.push({ axis: 1, lane: ix * T + lane, x0: rng.float(0, ZW), v: v * rng.float(0.85, 1.15) });
  const carMesh = K.instanced(carGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 }), cars.length, (_i, _o, c) => { c.set(rng.pick(['#c9372c', '#2b4f8a', '#e8e6e0', '#3a3d40', '#d9b43a', '#4f8a5a'])); }, { castShadow: false });
  world.add(carMesh);
  const setCar = K.instanceSetter(carMesh);

  // ================================================================ the flight
  const hero = new THREE.Mesh(airliner(1.9, '#c8402f'), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 }));
  hero.castShadow = true;
  root.add(hero);
  const RWZ = -5.4;
  // far away, other flights crossing between other identical airports
  const others = K.instanced(airliner(1.7), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 }), 4, undefined, { castShadow: false, colors: false });
  root.add(others);
  const setOther = K.instanceSetter(others);
  const otherP = [0, 1, 2, 3].map((i) => ({ z: -30 + i * 17, y: 9 + i * 1.7, v: (i % 2 ? -1 : 1) * rng.float(3, 4.5), x0: rng.float(0, 160) }));
  root.add(K.particles({ count: 120, radius: 40, y0: 12, y1: 16, color: '#ffffff', size: 0.6, opacity: 0.12, velocity: [0.6, 0, 0], swirl: 0.6, rng: rng.fork('haze') }));

  let goal = false, atEast = false, journey = -1, dir = 1, base = 0, nameIdx = 0, swapped = false;
  const ease = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * K.clamp(u));

  return {
    root,
    env: {
      skyTop: '#3c7fd3', skyHorizon: '#d4e3ee', skyBottom: '#c5d3dc', skyCurve: 0.5,
      fog: '#d3e0e9', fogNear: 30, fogFar: 92,
      sunDir: [0.45, 0.85, 0.35], sunColor: '#fff4df', sunIntensity: 3.0, sunDisc: 0.6, sunGlow: 0.6,
      hemiSky: '#b8d2ee', hemiGround: '#7d8c5e', hemiIntensity: 0.7, envIntensity: 0.7,
      clouds: 0.45, cloudColor: '#ffffff', stars: 0,
      bloomStrength: 0.35, bloomThreshold: 0.9, tiltShift: 0.55, shadowRadius: 24, vignette: 0.25, saturation: 1.08, contrast: 1.05,
    },
    camera: {
      position: [14, 13, 17], target: [0, 0, -2], minDistance: 5, maxDistance: 60, maxPolar: 1.4, autoRotate: 0.2,
      views: [
        { position: [-6, 40, 22], target: [0, 0, -3] },
        { position: [-6.5, 1.0, -1.3], target: [3, 1.2, -5.4] },
      ],
    },
    interaction: {
      label: 'Fly to another Trude',
      activeLabel: 'Fly on to the next',
      hint: 'The same suburbs, the same houses, the same airport. Only the name changes.',
      set: (on) => { goal = on; },
      camera: { position: [13, 8.5, 17], target: [0, 3.2, -4.5] },
    },
    update(t, dt) {
      // start a flight whenever the wish differs from where we are
      if (journey < 0 && goal !== atEast) {
        journey = 0;
        dir = goal ? 1 : -1;
        swapped = false;
      }
      let S = base, px = atEast ? 4 : -5.5, py = 0, pitch = 0, yaw = atEast ? Math.PI : 0;
      if (journey >= 0) {
        journey += dt / DUR;
        const u = Math.min(1, journey);
        const A = dir > 0 ? -5.5 + (D + 9.5) * ease(u) : 4 - (D + 9.5) * ease(u);
        const g = K.smootherstep(0.2, 0.8, u);
        S = base + dir * D * g;
        px = A - dir * D * g;
        const alt = K.smoothstep(0.17, 0.42, u) - K.smoothstep(0.58, 0.83, u);
        py = 6.5 * alt;
        pitch = (K.smoothstep(0.15, 0.25, u) - K.smoothstep(0.25, 0.42, u)) * 0.22 - (K.smoothstep(0.58, 0.66, u) - K.smoothstep(0.74, 0.83, u)) * 0.12;
        yaw = (dir > 0 ? 0 : Math.PI) + Math.PI * K.smoothstep(0.93, 1, u);
        if (!swapped && u > 0.5) {
          swapped = true;
          nameIdx = (nameIdx + 1) % NAMES.length;
          boardMat.map = nameTex[nameIdx];
        }
        if (journey >= 1) {
          journey = -1;
          base += dir * D;
          atEast = dir > 0;
          S = base;
        }
      }
      world.position.x = -(((S % T) + T) % T);
      hero.position.set(px, py, RWZ);
      hero.rotation.set(0, yaw, 0);
      hero.rotateZ(dir > 0 ? pitch : -pitch);
      // cars
      for (let i = 0; i < cars.length; i++) {
        const c = cars[i];
        if (c.axis === 0) {
          const x = X0 + ((((c.x0 + c.v * t) % XW) + XW) % XW);
          setCar(i, x, 0, c.lane, c.v > 0 ? 0 : Math.PI);
        } else {
          const z = Z0 + ((((c.x0 + c.v * t) % ZW) + ZW) % ZW);
          setCar(i, c.lane, 0, z, c.v > 0 ? -Math.PI / 2 : Math.PI / 2);
        }
      }
      setCar.done();
      otherP.forEach((o, i) => {
        const x = -80 + ((((o.x0 + o.v * t) % 160) + 160) % 160);
        setOther(i, x, o.y, o.z, o.v > 0 ? 0 : Math.PI, 1.3);
      });
      setOther.done();
    },
  };
};

export default build;
