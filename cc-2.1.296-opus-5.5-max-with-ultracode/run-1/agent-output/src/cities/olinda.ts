// OLINDA - Hidden Cities 1.
// Under a lens, at the centre of the city, a point no bigger than a pinhead is a
// whole tiny Olinda. It grows in concentric circles, carrying the older quarters
// outward with it, each ring keeping its proportions on a wider horizon, until the
// oldest ring sinks back into the meadows at the rim. And at the centre a new
// pinpoint is already being born. The diorama is a self-similar spiral in time:
// every ring is the same city at a different age.
// Toggle: let it grow (the generations bloom outward quickly).

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const Q = 1.6; // ratio between successive rings
const RT = 16; // template outer radius (the template is built at full size)
const RMAX = 20; // a ring that reaches this radius has sunk into the fields
const NS = 9; // ring slots kept alive

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  // ---- the island: soft spring meadows where the oldest rings dissolve
  const meadow = '#9fb36e';
  const isl = K.island({ radius: 23, flat: 21, depth: 10, top: meadow, edge: '#8fa462', cliff: '#a38e70', under: '#4c4a42', strata: '#c2ad86', hills: 0.25, seed: 11 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -8, color: '#fff1dc', shadow: '#9aa7c4', opacity: 0.7, coverage: 0.5 }));

  const outer = new K.Batch();
  // furrowed fields and orchards on the rim beyond the city
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2 + rng.float(-0.03, 0.03);
    const r = rng.float(20.6, 22);
    const kind = rng.pick(['round', 'round', 'cypress', 'olive'] as const);
    K.tree(outer, { x: Math.cos(a) * r, z: Math.sin(a) * r, kind, h: rng.float(1.1, 2.0), rng, color: kind === 'cypress' ? '#3c5a3a' : '#6f8f45' });
  }
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + 0.1;
    const f = K.paintBy(K.at(new THREE.RingGeometry(16.6, 20.2, 6, 1, a, (Math.PI * 2) / 18 - 0.03).rotateX(-Math.PI / 2), 0, 0.012, 0), (x, _y, z, out) => {
      const rr = Math.hypot(x, z);
      out.set(i % 3 === 0 ? '#c9b96e' : i % 3 === 1 ? '#a8bb6c' : '#b9c47e').multiplyScalar(0.92 + 0.08 * Math.sin(rr * 9));
    });
    outer.add(f, null, 'matte');
  }
  root.add(outer.build({ name: 'olinda-rim' }));

  // ---- three ring templates (old quarters look different from each other), built at full size
  const AVENUES = 6;
  const PALETTES = [
    { walls: ['#f4ead6', '#efe0c2', '#f7f0e2', '#e9d6b4'], roof: ['#b5603e', '#c4744b', '#a85638'], ground: '#ddd0b2', wall: '#e8dcc0', dome: '#7fa7a0' },
    { walls: ['#ecd7a8', '#e4c690', '#f0dfb8', '#d9b98a'], roof: ['#6c7a86', '#5e6c78', '#7d8a92'], ground: '#d6c7a2', wall: '#dcc79c', dome: '#c9a24c' },
    { walls: ['#f2dccf', '#ead0c0', '#f6e8de', '#e3c4b3'], roof: ['#8f4b3a', '#a3584a', '#7e4a3c'], ground: '#d9cdb6', wall: '#eadbc9', dome: '#9fb6c8' },
  ];
  const templates: { meshes: THREE.Group }[] = [];
  for (let v = 0; v < 3; v++) {
    const P = PALETTES[v];
    const tr = rng.fork('tpl' + v);
    const b = new K.Batch();
    const off = (v * Math.PI) / AVENUES / 1.5;
    const avenueAt = (a: number, r: number) => {
      for (let k = 0; k < AVENUES; k++) {
        const aa = off + (k / AVENUES) * Math.PI * 2;
        const d = Math.abs(((a - aa + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (d * r < 0.75) return true;
      }
      return false;
    };
    // paving and gardens of the ring
    const g = new THREE.RingGeometry(RT / Q, RT, 160, 8).rotateX(-Math.PI / 2);
    K.paintBy(g, (x, _y, z, out) => {
      const n = K.fbm2(x * 0.35 + v * 7, z * 0.35, 3);
      out.set(P.ground);
      if (n > 0.18) out.lerp(new THREE.Color('#9db06a'), 0.75);
      const a = Math.atan2(z, x);
      if (avenueAt(a, Math.hypot(x, z))) out.set('#cbbd9c');
    });
    b.add(K.at(g, 0, 0.015, 0), null, 'matte');
    // the ring wall with gates on the avenues
    const gates = Array.from({ length: AVENUES }, (_, k) => off + (k / AVENUES) * Math.PI * 2);
    K.cityWall(b, { r: RT - 0.25, h: 1.25, thick: 0.38, seg: 96, color: P.wall, towers: 12, towerTop: v === 1 ? 'cone' : 'crenel', towerTopColor: P.roof[0], gates, gateWidth: 1.6 });
    // houses in five rows
    const rows = [10.75, 11.85, 12.95, 14.05, 15.0];
    for (let ri = 0; ri < rows.length; ri++) {
      const r = rows[ri];
      const n = Math.floor((Math.PI * 2 * r) / 1.18);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ri * 0.21;
        if (avenueAt(a, r)) continue;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (tr.chance(0.12)) {
          K.tree(b, { x, z, kind: tr.pick(['round', 'cypress'] as const), h: tr.float(1.0, 1.8), rng: tr, color: '#5f7f3f' });
          continue;
        }
        const h = tr.float(0.8, 1.7) * (ri === 0 ? 1.35 : 1) * (v === 1 ? 1.15 : 1);
        K.house(b, {
          x, z, ry: -a + Math.PI / 2, w: tr.float(0.8, 1.0), d: tr.float(0.85, 1.05), h,
          roof: tr.pick(v === 2 ? (['gable', 'hip'] as const) : (['gable', 'gable', 'hip'] as const)),
          wall: tr.pick(P.walls), roofColor: tr.pick(P.roof), lit: 0.18, glow: 2.2, rng: tr,
        });
      }
    }
    // landmarks of each generation: towers, domes, a belfry
    for (let k = 0; k < AVENUES; k++) {
      const a = off + ((k + 0.5) / AVENUES) * Math.PI * 2;
      const r = 10.7;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (v === 0) K.tower(b, { x, z, r: 0.45, h: 3.6, sides: 4, top: 'pyramid', color: '#efe3cb', topColor: P.roof[1], bands: 1.2, rng: tr, lit: 0.3 });
      else if (v === 1) {
        b.add(K.at(K.ngon(0.85, 1.5, 8), x, 0, z), '#efdcb2', 'plaster');
        b.add(K.at(K.dome(0.85, 18, 1, 1.0), x, 1.5, z), P.dome, 'gold');
      } else K.tower(b, { x, z, r: 0.35, h: 4.2, sides: 12, top: 'spire', color: '#f3e4d6', topColor: '#7f8fa0', topFinish: 'metal', rng: tr, lit: 0.3 });
    }
    templates.push({ meshes: b.build({ name: 'olinda-ring' + v }) });
  }

  // ---- ring slots: each holds the three templates (one visible) and its own tintable materials
  type Tintable = THREE.Material & { color: THREE.Color };
  interface Slot { g: THREE.Group; vars: THREE.Group[]; mats: Tintable[]; glows: Tintable[] }
  const slots: Slot[] = [];
  for (let i = 0; i < NS; i++) {
    const g = new THREE.Group();
    const own = new Map<THREE.Material, Tintable>();
    const mats: Tintable[] = [];
    const glows: Tintable[] = [];
    const vars = templates.map((tpl) => {
      const c = tpl.meshes.clone(true);
      c.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const src = m.material as THREE.Material;
        let mine = own.get(src);
        if (!mine) {
          mine = src.clone() as Tintable;
          delete (mine.userData as { shared?: boolean }).shared;
          own.set(src, mine);
          (m.name.endsWith(':glow') ? glows : mats).push(mine);
        }
        m.material = mine;
      });
      g.add(c);
      return c;
    });
    root.add(g);
    slots.push({ g, vars, mats, glows });
  }

  // ---- the seed at the centre: a pinhead of gold light under a brass lens
  const seedCore = new THREE.Mesh(K.sphere(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff3c4' }));
  seedCore.position.set(0, 0.08, 0);
  root.add(seedCore);
  const seedGlow = K.glowSprite('#ffd98a', 1.4, 0.9);
  seedGlow.position.set(0, 0.12, 0);
  root.add(seedGlow);
  const seedBeam = K.beam([0, 0.05, 0], [0, 7, 0], 0.05, 0.9, '#ffe2a0', 0.22);
  root.add(seedBeam);

  const lens = new THREE.Group();
  const lb = new K.Batch();
  lb.add(K.at(K.torus(2.3, 0.11, 10, 72), 0, 0, 0), '#c99a4a', 'gold');
  lb.add(K.at(K.strut([2.38, 0, 0], [4.1, 0, 0.6], 0.08, 8), 0, 0, 0), '#c99a4a', 'gold');
  lb.add(K.at(K.strut([4.1, 0, 0.6], [5.7, 0, 1.1], 0.15, 10), 0, 0, 0), '#4a3326', 'wood');
  lens.add(lb.build({ name: 'olinda-lens' }));
  const glassMat = new THREE.MeshStandardMaterial({ color: '#e8f4ff', roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16, envMapIntensity: 2.2, depthWrite: false });
  const glass = new THREE.Mesh(new THREE.SphereGeometry(2.3, 40, 8, 0, Math.PI * 2, 0, 0.28).scale(1, 0.35, 1).translate(0, -0.55, 0), glassMat);
  lens.add(glass);
  const glass2 = new THREE.Mesh(new THREE.SphereGeometry(2.3, 40, 8, 0, Math.PI * 2, 0, 0.28).scale(1, -0.35, 1).translate(0, 0.55, 0), glassMat);
  lens.add(glass2);
  root.add(lens);

  // ---- life: swallows over the rings, motes of light rising from the seed
  const flock = new K.Flock({ count: 26, center: [0, 0, 0], radius: 13, height: 8, color: '#3a3438', span: 0.32, speed: 0.22, rng: rng.fork('birds') });
  root.add(flock.mesh);
  root.add(K.particles({ count: 160, center: [0, 0, 0], radius: 1.6, disc: true, y0: 0.1, y1: 8, color: '#ffe3a0', colors: ['#fff6d8'], size: 0.07, opacity: 0.8, velocity: [0, 0.35, 0], swirl: 0.4, twinkle: 0.7, additive: true, rng: rng.fork('motes') }));
  root.add(K.particles({ count: 220, radius: 20, disc: true, y0: 0.4, y1: 7, color: '#fff2cc', size: 0.05, opacity: 0.45, swirl: 0.7, twinkle: 0.8, rng: rng.fork('pollen') }));

  const grow = new K.Toggle(0.45);
  let gen = 0.35;
  const FRESH = new THREE.Color('#fffaf0');
  const OLD = new THREE.Color('#c2b8a6');
  const tmp = new THREE.Color();

  return {
    root,
    env: {
      skyTop: '#86acd8',
      skyHorizon: '#fde6c6',
      skyBottom: '#c9b8a8',
      skyCurve: 0.55,
      fog: '#f3dfc6',
      fogNear: 80,
      fogFar: 260,
      sunDir: [0.75, 0.42, 0.5],
      sunColor: '#ffe0b0',
      sunIntensity: 2.8,
      sunDisc: 1,
      sunGlow: 1.1,
      hemiSky: '#cfe0f2',
      hemiGround: '#8a8a5e',
      hemiIntensity: 0.8,
      envIntensity: 0.85,
      clouds: 0.3,
      cloudColor: '#fff4e4',
      bloomStrength: 0.65,
      bloomThreshold: 0.85,
      bloomRadius: 0.5,
      tiltShift: 0.45,
      shadowRadius: 24,
      vignette: 0.35,
      saturation: 1.05,
    },
    camera: {
      position: [18, 20, 22],
      target: [0, 0.5, 0],
      minDistance: 4,
      maxDistance: 75,
      autoRotate: 0.25,
      views: [
        { position: [2.6, 6.6, 4.6], target: [0, 0.2, 0] },
        { position: [19, 4.2, 8], target: [0, 1.6, 0] },
      ],
    },
    interaction: {
      label: 'Let it grow',
      activeLabel: 'Let it rest',
      hint: 'Each ring carries the older city outward; a new point is born at the centre.',
      set: (on) => grow.set(on),
    },
    update(t, dt) {
      grow.update(dt);
      gen += dt * (0.035 + 0.55 * grow.value);
      const f = K.fract(gen);
      const base = Math.floor(gen);
      for (let i = 0; i < NS; i++) {
        const s = slots[i];
        const R = RMAX * Math.pow(Q, f - 1 - i);
        const sc = R / RT;
        const hs = 1 - K.smoothstep(14.5, 19.6, R);
        s.g.visible = hs > 0.01 && R > 0.2;
        if (!s.g.visible) continue;
        s.g.scale.set(sc, sc * hs, sc);
        s.g.position.y = -(1 - hs) * 0.4;
        s.g.rotation.y = (base - i) * 0.37;
        const id = base - i;
        const v = ((id % 3) + 3) % 3;
        s.vars.forEach((c, k) => (c.visible = k === v));
        // newer rings are fresh and bright; older ones weathered
        const age = K.clamp((R - 1.5) / 16);
        tmp.copy(FRESH).lerp(OLD, age);
        for (const m of s.mats) m.color.copy(tmp);
        const lit = 1 + (1 - age) * 1.6 + 0.3 * Math.sin(t * 2 + i);
        for (const m of s.glows) m.color.setScalar(lit);
      }
      // the newborn point pulses; its light swells as a ring is about to emerge
      const pulse = 0.75 + 0.25 * Math.sin(t * 2.4) + 0.6 * K.smoothstep(0.75, 1, f);
      seedGlow.scale.setScalar(1.1 + pulse * 0.7);
      (seedCore.material as THREE.MeshBasicMaterial).color.setScalar(1.5 + pulse * 2);
      // the lens hovers, drifting slightly; lifts away while growing
      lens.position.set(Math.sin(t * 0.3) * 0.15, 2.9 + Math.sin(t * 0.8) * 0.08 + grow.value * 1.6, Math.cos(t * 0.27) * 0.15);
      lens.rotation.set(0.12 + Math.sin(t * 0.5) * 0.03, t * 0.05, 0.08);
      flock.update(t);
    },
  };
};

export default build;
