// ANASTASIA - Cities & Desire 2.
// Three days south lies a city of concentric canals with kites flying above it, a city
// that sells agate, onyx and chrysoprase. Here it is built as the jewel it sells: a sliced
// agate nodule whose bands are its rings of land and water. Described, it wakes one desire
// at a time (a stall heaped with stones, a hearth where golden pheasants turn over cherry
// wood, the garden pool of bathers, a flock of kites) and smothers each in turn under a
// pale veil. Toggle: a morning in its heart. Every desire wakes at once, the kites sink
// into a slow vortex, and in that light their strings show, running down to the reels of
// the stone cutters bent over their wheels: the sky of desire is held up by their labour.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const TAU = Math.PI * 2;

// Every band of the nodule follows the same gentle lobes (agate bands echo the outline).
const lobe = (a: number) => 1 + 0.018 * Math.sin(2 * a + 0.6) + 0.012 * Math.sin(3 * a + 2.2) + 0.006 * Math.sin(5 * a + 4.1);
const LOBE_GLSL = /* glsl */ `float lobe(float a){ return 1.0 + 0.018*sin(2.0*a+0.6) + 0.012*sin(3.0*a+2.2) + 0.006*sin(5.0*a+4.1); }`;

// Rings, in normalised radius (world radius = rho * lobe(angle)).
const RIM = 22.5;
const POOL_R = 1.6;
const CANAL: [number, number][] = [[3.4, 4.4], [8.2, 9.2], [13.2, 14.2], [19.0, 20.2]];
const LAND: [number, number][] = [[POOL_R, 3.4], [4.4, 8.2], [9.2, 13.2], [14.2, 19.0], [20.2, RIM - 0.12]];
const DEPTH = 0.42;
const WATER_Y = -0.13;
const SIDE = 2.4;

// Camera composition (the wind and the order of desires are composed for this view).
const CAM_AZ = 0.42;
const CAM_EL = 0.86;
const CAM_D = 68;

const lin = (hex: string) => {
  const c = new THREE.Color(hex);
  return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;
};

const C = {
  milk: '#efe6d6', milk2: '#ddcfb8', honey: '#dca85e', honey2: '#c4873a', carn: '#c95a2c', carn2: '#9c3d1f',
  blue: '#a6b7c4', blue2: '#7f95a8', onyx: '#1f1b1c', slate: '#64788b', lawn: '#7f9d55', lawn2: '#a3b86c',
  chryso: '#74c7a2', saffron: '#f0a63a', kcarn: '#d9612f', kmilk: '#f6efe2', kblue: '#9fc3dd', konyx: '#2b2627',
  cherry: '#7b3a2b', pheasant: '#c9862e', stoneG: '#8f8579',
};

type V3 = [number, number, number];

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const hi = ctx.quality !== 'low';
  const root = new THREE.Group();

  const camDir = new THREE.Vector3(Math.sin(CAM_AZ) * Math.cos(CAM_EL), Math.sin(CAM_EL), Math.cos(CAM_AZ) * Math.cos(CAM_EL));
  const TH_CAM = Math.atan2(camDir.z, camDir.x); // angle of the camera side of the disc
  const AV0 = TH_CAM + Math.PI / 8; // the eight facet avenues frame the view
  // the wind blows away from the viewer and a little to the right: kites show their faces, tails stream
  const wind = new THREE.Vector2(-camDir.x, -camDir.z).normalize().rotateAround(new THREE.Vector2(), -0.7);
  const YAW_WIND = Math.atan2(-wind.x, -wind.y); // kites face into the wind

  const avenueDist = (a: number, r: number) => {
    const s = TAU / 8;
    let d = (((a - AV0) % s) + s) % s;
    d = Math.min(d, s - d);
    return d * r;
  };
  const xz = (rho: number, a: number): [number, number] => {
    const r = rho * lobe(a);
    return [Math.cos(a) * r, Math.sin(a) * r];
  };

  // ------------------------------------------------------------------ the desire field
  // One pool of colour and warmth wanders through a veiled, desaturated city (uPool, uPoolK);
  // uWake lifts the veil everywhere at once.
  const DU = {
    uWake: { value: 0 },
    uPool: { value: new THREE.Vector4(0, 0, 0, 1) },
    uPoolK: { value: 0 },
    uVeil: { value: 0.42 },
  };
  const DESIRE = /* glsl */ `
    uniform float uWake, uPoolK, uVeil;
    uniform vec4 uPool;
    float desireAt(vec3 p) {
      float d = length(p - uPool.xyz);
      float pool = uPoolK * (1.0 - smoothstep(uPool.w * 0.3, uPool.w, d));
      return clamp(max(pool, uWake), 0.0, 1.0);
    }
    vec3 veil(vec3 c, float k) {
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      vec3 o = mix(vec3(l) * vec3(1.04, 1.0, 0.94), c, mix(uVeil, 1.1, k));
      o = mix(o, vec3(l) * 0.84 + vec3(0.045, 0.042, 0.038), (1.0 - k) * 0.18);
      return o * mix(vec3(1.0), vec3(1.07, 1.02, 0.93), k);
    }
  `;

  interface PatchOpts {
    key: string;
    glow?: boolean;
    uniforms?: Record<string, THREE.IUniform>;
    vertPars?: string;
    vertMain?: string;
    colorVert?: string;
    fragPars?: string;
    colorFrag?: string;
    roughFrag?: string;
    normalFrag?: string;
    preOut?: string;
  }
  const patch = <M extends THREE.Material>(m: M, o: PatchOpts): M => {
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, DU, o.uniforms ?? {});
      let v = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vDW;\n' + (o.vertPars ?? ''))
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + (o.vertMain ?? ''))
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
          { vec4 dwp = vec4(transformed, 1.0);
            #ifdef USE_INSTANCING
              dwp = instanceMatrix * dwp;
            #endif
            vDW = (modelMatrix * dwp).xyz; }`,
        );
      if (o.colorVert) v = v.replace('#include <color_vertex>', o.colorVert);
      sh.vertexShader = v;
      let f = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vDW;\n' + DESIRE + (o.fragPars ?? ''));
      if (o.colorFrag) f = f.replace('#include <color_fragment>', '#include <color_fragment>\n' + o.colorFrag);
      if (o.roughFrag) f = f.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + o.roughFrag);
      if (o.normalFrag) f = f.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + o.normalFrag);
      f = f.replace(
        '#include <opaque_fragment>',
        `{ float dk = desireAt(vDW);
           ${o.preOut ?? ''}
           outgoingLight = veil(outgoingLight, dk);
           ${o.glow ? 'outgoingLight *= mix(0.4, 1.6, dk);' : ''} }
         #include <opaque_fragment>`,
      );
      sh.fragmentShader = f;
    };
    m.customProgramCacheKey = () => 'anastasia|' + o.key;
    return m;
  };

  // Own vertex-coloured finishes (the shared kit materials are never touched).
  const FIN_PARAMS: Record<string, THREE.MeshStandardMaterialParameters> = {
    matte: { roughness: 0.95 },
    plaster: { roughness: 0.9 },
    stone: { roughness: 0.8 },
    wood: { roughness: 0.72 },
    cloth: { roughness: 0.95, side: THREE.DoubleSide },
    ceramic: { roughness: 0.35 },
    polished: { roughness: 0.15, envMapIntensity: 1.3 },
    metal: { roughness: 0.35, metalness: 0.9 },
    gold: { roughness: 0.26, metalness: 1, envMapIntensity: 1.4 },
    silver: { roughness: 0.2, metalness: 1, envMapIntensity: 1.4 },
    bronze: { roughness: 0.42, metalness: 0.85 },
  };
  const FIN: Partial<Record<K.Finish, THREE.Material>> = {};
  const finMat = (kind: K.Finish): THREE.Material => {
    const hit = FIN[kind];
    if (hit) return hit;
    let m: THREE.Material;
    if (kind === 'glow') {
      m = patch(new THREE.MeshBasicMaterial({ vertexColors: true }), { key: 'glow', glow: true });
      m.userData.unlit = true;
    } else if (kind === 'ghost') {
      m = patch(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }), { key: 'ghost', glow: true });
      m.userData.unlit = true;
    } else if (kind === 'glass') {
      m = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6 }), { key: 'lit' });
      m.userData.unlit = true;
    } else {
      m = patch(new THREE.MeshStandardMaterial({ vertexColors: true, ...FIN_PARAMS[kind] }), { key: 'lit' });
    }
    FIN[kind] = m;
    return m;
  };

  class DBatch extends K.Batch {
    add(geo: THREE.BufferGeometry, color: K.ColorLike | null, kind: K.Finish = 'matte', intensity = 1): this {
      if (color !== null) K.paint(geo, color, intensity);
      return this.addWith(geo, finMat(kind));
    }
  }
  const built = (b: DBatch, name: string, cast = true) => {
    const g = b.build({ name, castShadow: cast });
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && (m.material as THREE.Material).userData.unlit) {
        m.castShadow = false;
        m.receiveShadow = false;
      }
    });
    return g;
  };

  const figMat = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), { key: 'lit' });

  // ------------------------------------------------------------------ the agate base
  const revolve = (prof: [number, number][], seg: number, disp?: (x: number, y: number, z: number) => V3) => {
    const rows = prof.length, cols = seg + 1;
    const pos = new Float32Array(rows * cols * 3);
    let k = 0;
    for (let r = 0; r < rows; r++) {
      const [rho, y] = prof[r];
      for (let j = 0; j <= seg; j++) {
        const a = (j / seg) * TAU;
        const L = rho * lobe(a);
        let x = Math.cos(a) * L, z = Math.sin(a) * L, yy = y;
        if (disp) [x, yy, z] = disp(x, y, z);
        pos[k++] = x;
        pos[k++] = yy;
        pos[k++] = z;
      }
    }
    const idx: number[] = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let j = 0; j < seg; j++) {
        const a = r * cols + j, b = a + 1, c = a + cols, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  const flatUp = (g: THREE.BufferGeometry) => {
    const n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
    return g;
  };

  const groundParts: THREE.BufferGeometry[] = [];
  for (const [a, b] of LAND) groundParts.push(flatUp(revolve([[a, 0], [b, 0]], 360)));
  for (const [a, b] of CANAL) {
    groundParts.push(revolve([[a, 0], [a, -DEPTH]], 360));
    groundParts.push(flatUp(revolve([[a, -DEPTH], [b, -DEPTH]], 360)));
    groundParts.push(revolve([[b, -DEPTH], [b, 0]], 360));
  }
  groundParts.push(revolve([[POOL_R, 0], [POOL_R, -0.32]], 160));
  groundParts.push(flatUp(revolve([[0, -0.32], [POOL_R, -0.32]], 160)));
  groundParts.push(revolve([[RIM - 0.12, 0], [RIM, -0.12]], 512));
  groundParts.push(revolve([[RIM, -0.12], [RIM, -SIDE]], 512));
  {
    const prof: [number, number][] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      prof.push([RIM * Math.pow(Math.cos((t * Math.PI) / 2), 0.62), -SIDE - t * 7.2]);
    }
    groundParts.push(
      revolve(prof, 256, (x, y, z) => {
        const f = Math.min(1, (-y - SIDE) / 1.6);
        const s = 1 + 0.06 * K.noise3(x * 0.11, y * 0.22, z * 0.11) * f;
        return [x * s, y + 0.35 * K.noise3(x * 0.2 + 5, y * 0.1, z * 0.2) * f, z * s];
      }),
    );
  }

  const AGATE_GLSL = /* glsl */ `
    ${LOBE_GLSL}
    const float PI8 = 0.39269908;
    vec3 bandsOf(float w, vec3 a, vec3 b, vec3 c, vec3 ln, float f, float s) {
      float x = w * f + s;
      float t1 = 0.5 + 0.5 * sin(x);
      float t2 = 0.5 + 0.5 * sin(x * 2.31 + 1.7);
      vec3 col = mix(a, b, smoothstep(0.2, 0.8, t1));
      col = mix(col, c, smoothstep(0.62, 0.92, t2) * 0.7);
      float l = smoothstep(0.95, 0.993, 0.5 + 0.5 * sin(x * 0.53 + 2.0));
      return mix(col, ln, l * 0.9);
    }
    vec3 agate(vec3 p, out float rough) {
      float r = length(p.xz);
      float ang = atan(p.z, p.x);
      float rho = r / lobe(ang);
      float n1 = snoise(vec3(p.xz * 0.19, 1.3));
      float n2 = snoise(vec3(p.xz * 0.83, 5.1));
      float w = rho + n1 * 0.16 + n2 * 0.04;
      rough = 0.55;
      vec3 col;
      if (p.y < -0.02) {
        if (rho > ${(RIM - 0.25).toFixed(2)}) {
          float yy = -p.y + 0.16 * sin(ang * 3.0 + 1.0) + 0.12 * n1 + 0.03 * n2;
          col = bandsOf(yy, ${lin(C.carn)}, ${lin(C.honey)}, ${lin(C.milk)}, ${lin(C.onyx)}, 5.4, 0.4);
          col = mix(col, ${lin(C.blue2)}, smoothstep(0.55, 0.95, 0.5 + 0.5 * sin(yy * 1.7 + 0.8)) * 0.6);
          rough = 0.3;
          if (p.y < -${SIDE.toFixed(2)} + 0.05) {
            float t = clamp((-p.y - ${SIDE.toFixed(2)}) / 5.5, 0.0, 1.0);
            col = mix(col * 0.82, ${lin('#5e4636')} * (0.8 + 0.3 * n2), 0.45 + 0.5 * t);
            rough = 0.9;
          }
          return col;
        }
        if (rho < ${(POOL_R + 0.05).toFixed(2)}) {
          return mix(${lin('#d6eadf')}, ${lin('#8fcdb0')}, smoothstep(0.35, 0.65, 0.5 + 0.5 * sin(rho * 10.0 + n2 * 2.0)));
        }
        rough = 0.45;
        return p.y < -0.3 ? mix(${lin('#2d5b49')}, ${lin('#1f3f35')}, 0.5 + 0.5 * n1) : ${lin(C.onyx)};
      }
      float av = mod(ang - ${AV0.toFixed(5)} + PI8, 2.0 * PI8) - PI8;
      float avd = abs(av) * r;
      if (rho < 3.4) {
        col = mix(${lin(C.lawn)}, ${lin(C.lawn2)}, 0.5 + 0.5 * snoise(vec3(p.xz * 1.7, 9.0)));
        rough = 0.92;
        if (rho < 2.15 || rho > 3.24 || avd < 0.24) {
          col = mix(${lin(C.milk)}, ${lin(C.milk2)}, 0.5 + 0.5 * sin(w * 24.0));
          rough = 0.5;
        }
      } else if (rho < 8.2) {
        col = bandsOf(w, ${lin(C.carn)}, ${lin(C.carn2)}, ${lin(C.honey)}, ${lin(C.milk)}, 4.4, 0.0);
      } else if (rho < 13.2) {
        col = bandsOf(w, ${lin(C.honey)}, ${lin(C.honey2)}, ${lin(C.milk)}, ${lin(C.carn)}, 4.0, 1.3);
      } else if (rho < 19.0) {
        col = bandsOf(w, ${lin(C.blue)}, ${lin(C.blue2)}, ${lin(C.milk)}, ${lin(C.slate)}, 3.6, 2.1);
      } else {
        col = bandsOf(w, ${lin(C.milk)}, ${lin(C.milk2)}, ${lin(C.blue)}, ${lin(C.honey)}, 6.0, 0.7);
      }
      if (rho > 3.4 && rho < 20.2) {
        col = mix(col, ${lin(C.milk)}, smoothstep(0.5, 0.44, avd) * 0.55);
        col = mix(col, ${lin(C.onyx)}, smoothstep(0.035, 0.0, abs(avd - 0.47)) * 0.7);
      }
      float e = abs(rho - ${(RIM - 0.14).toFixed(2)});
      e = min(e, abs(rho - 3.4)); e = min(e, abs(rho - 4.4));
      e = min(e, abs(rho - 8.2)); e = min(e, abs(rho - 9.2));
      e = min(e, abs(rho - 13.2)); e = min(e, abs(rho - 14.2));
      e = min(e, abs(rho - 19.0)); e = min(e, abs(rho - 20.2));
      col = mix(col, ${lin(C.milk)}, smoothstep(0.17, 0.12, e) * 0.85);
      col = mix(col, ${lin(C.onyx)}, smoothstep(0.08, 0.06, e));
      return col;
    }
  `;
  const agateMat = patch(new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.85 }), {
    key: 'agate',
    fragPars: K.GLSL_NOISE + AGATE_GLSL,
    colorFrag: 'float agR; diffuseColor.rgb = agate(vDW, agR);',
    roughFrag: 'roughnessFactor = agR;',
  });
  const ground = new THREE.Mesh(K.merge(groundParts), agateMat);
  ground.castShadow = true;
  ground.receiveShadow = true;
  ground.name = 'agate';
  root.add(ground);

  // ------------------------------------------------------------------ chrysoprase water
  const BATH = Array.from({ length: 6 }, () => new THREE.Vector3());
  const waterMat = patch(
    new THREE.MeshStandardMaterial({ color: '#4dae89', roughness: 0.06, metalness: 0.02, transparent: true, opacity: 0.8, envMapIntensity: 1.2 }),
    {
      key: 'water',
      uniforms: { uTime: K.U.time, uBath: { value: BATH } },
      fragPars: K.GLSL_NOISE + 'uniform float uTime; uniform vec3 uBath[6];',
      normalFrag: /* glsl */ `{
        vec2 wp = vDW.xz * 0.75; float t = uTime * 0.4; float e = 0.07;
        float h0 = snoise(vec3(wp, t)) + 0.5 * snoise(vec3(wp * 2.7, t * 1.6));
        float hx = snoise(vec3(wp + vec2(e, 0.0), t)) + 0.5 * snoise(vec3((wp + vec2(e, 0.0)) * 2.7, t * 1.6));
        float hz = snoise(vec3(wp + vec2(0.0, e), t)) + 0.5 * snoise(vec3((wp + vec2(0.0, e)) * 2.7, t * 1.6));
        vec2 g = vec2(hx - h0, hz - h0) / e * 0.2;
        if (dot(vDW.xz, vDW.xz) < 3.2) {
          for (int i = 0; i < 6; i++) {
            vec2 d = vDW.xz - uBath[i].xz; float r = length(d) + 1e-4;
            g += d / r * cos(r * 40.0 - uTime * 5.0 - float(i) * 1.7) * exp(-r * 3.4) * uBath[i].y;
          }
        }
        vec3 nW = normalize(vec3(-g.x, 1.0, -g.y));
        normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
      }`,
      preOut: 'outgoingLight += vec3(0.07, 0.12, 0.09) * dk;',
    },
  );
  {
    const parts = CANAL.map(([a, b]) => flatUp(revolve([[a, WATER_Y], [b, WATER_Y]], 360)));
    parts.push(flatUp(revolve([[0, -0.075], [POOL_R, -0.075]], 160)));
    const water = new THREE.Mesh(K.merge(parts), waterMat);
    water.receiveShadow = true;
    water.name = 'water';
    root.add(water);
  }

  // ------------------------------------------------------------------ static city
  const b = new DBatch();

  // eight lines of bridges, every 45 degrees, like facet lines on the jewel
  const bridgeAt = (a: number, ra: number, rb: number) => {
    const L0 = ra * lobe(a), L1 = rb * lobe(a);
    const cw = L1 - L0;
    const ext = 0.24;
    const len = cw + ext * 2;
    const hump = 0.21;
    const w = 0.6;
    const mid = (L0 + L1) / 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    K.bridge(b, { from: [ca * (L0 - ext), 0, sa * (L0 - ext)], to: [ca * (L1 + ext), 0, sa * (L1 + ext)], width: w, rise: 0, hump, color: C.milk, finish: 'stone', rails: true });
    const top = (x: number) => hump * (1 - Math.pow((2 * x) / len, 2)) - 0.06;
    const hw = cw / 2 + 0.03;
    const s = new THREE.Shape();
    s.moveTo(-hw, -DEPTH);
    s.lineTo(hw, -DEPTH);
    for (let i = 0; i <= 12; i++) {
      const x = hw - (i / 12) * 2 * hw;
      s.lineTo(x, top(x));
    }
    s.lineTo(-hw, -DEPTH);
    const ow = cw * 0.64, ys = WATER_Y + 0.03;
    const eh = Math.max(0.06, top(0) - ys - 0.07);
    const hole = new THREE.Path();
    hole.moveTo(-ow / 2, -DEPTH + 0.02);
    hole.lineTo(-ow / 2, ys);
    hole.absellipse(0, ys, ow / 2, eh, Math.PI, 0, true);
    hole.lineTo(ow / 2, -DEPTH + 0.02);
    hole.lineTo(-ow / 2, -DEPTH + 0.02);
    s.holes.push(hole);
    b.add(K.at(K.extrudeZ(s, w * 0.9, 8), ca * mid, 0, sa * mid, { ry: -a }), C.milk2, 'stone');
  };
  for (let i = 0; i < 8; i++) {
    const a = AV0 + (i * TAU) / 8;
    for (const [ra, rb] of CANAL) bridgeAt(a, ra, rb);
  }

  // low terraced houses lining every canal
  const houseRow = (rho: number, dep: number, faceIn: boolean, walls: string[], roofs: string[], h0: number, h1: number, clear = 0.55, gap = 0.06) => {
    let a = rng.float(0, 0.3 / rho);
    const end = a + TAU - 0.35 / rho;
    while (a < end) {
      const w = rng.float(0.5, 0.9);
      const ac = a + w / 2 / rho;
      a += (w + rng.float(0.03, 0.08)) / rho;
      if (avenueDist(ac, rho) < clear + w / 2) continue;
      if (rng.chance(gap)) continue;
      const [x, z] = xz(rho, ac);
      const h = rng.float(h0, h1);
      const d = dep * rng.float(0.82, 1);
      const ry = faceIn ? -ac - Math.PI / 2 : -ac + Math.PI / 2;
      const wall = K.pickJitter(walls, rng, 0.01, 0.04, 0.035);
      const roofC = K.pickJitter(roofs, rng, 0.01, 0.04, 0.035);
      K.house(b, { x, z, ry, w, d, h, roof: 'flat', wall, roofColor: roofC, windowColor: '#3a302b', rng });
      const bx = -Math.sin(ry), bz = -Math.cos(ry); // towards the back of the house
      if (rng.chance(0.32)) {
        const off = d * 0.22;
        K.house(b, { x: x + bx * off, z: z + bz * off, y: h + 0.08, ry, w: w * rng.float(0.45, 0.62), d: d * 0.5, h: rng.float(0.26, 0.36), roof: 'flat', wall, roofColor: roofC, windowColor: '#3a302b', door: false, rng });
      } else if (rng.chance(0.3)) {
        // a roof terrace: parapet, a pot of herbs, sometimes an awning
        b.add(K.at(K.box(w + 0.08, 0.06, 0.03), x - bx * (d / 2), h + 0.08, z - bz * (d / 2), { ry }), wall, 'plaster');
        b.add(K.at(K.sphere(0.05, 6, 5), x + rng.float(-0.2, 0.2) * w, h + 0.13, z, { s: [1, 0.8, 1] }), K.jitter('#6f8f4a', rng), 'matte');
      }
    }
  };
  const BAZ_W = ['#d98a5f', '#c9714a', '#e3a27a', '#d47e62', '#e8b48e'], BAZ_R = ['#b5562f', '#a84b2a', '#c4683d', '#b9603a'];
  const KIT_W = ['#e3b46a', '#d9a65c', '#ecc787', '#d49a52', '#efd29a'], KIT_R = ['#c98b3a', '#b9792f', '#d79a48'];
  const WRK_W = ['#b8c4cc', '#a7b5c0', '#cfd6db', '#9fb0bd', '#dfe3e3'], WRK_R = ['#7f93a6', '#71879b', '#8ea0b0'];
  houseRow(4.8, 0.55, false, BAZ_W, BAZ_R, 0.5, 0.85);
  houseRow(7.88, 0.55, true, BAZ_W, BAZ_R, 0.5, 0.9);
  houseRow(9.68, 0.62, false, KIT_W, KIT_R, 0.5, 0.9);
  houseRow(12.82, 0.62, true, KIT_W, KIT_R, 0.55, 0.9);
  houseRow(18.42, 0.8, true, WRK_W, WRK_R, 0.5, 0.85);

  // ---- the garden heart: bathing pool, marble rim, citrus trees, flowers
  b.add(K.lathe([[POOL_R - 0.02, -0.1], [POOL_R + 0.02, 0.1], [POOL_R + 0.2, 0.1], [POOL_R + 0.22, 0]], 96), C.milk, 'polished');
  const flowerPos: V3[] = [];
  for (let s = 0; s < 8; s++) {
    for (const off of [-0.27, 0.27]) {
      const a = AV0 + (s + 0.5) * (TAU / 8) + off;
      const [x, z] = xz(2.72, a);
      K.tree(b, { x, z, kind: 'round', h: rng.float(1.15, 1.45), color: '#4f7a3c', rng });
      for (let f = 0; f < 7; f++) {
        const fa = rng.angle(), fy = rng.float(0.65, 1.05);
        b.add(K.at(K.sphere(0.035, 6, 4), x + Math.cos(fa) * 0.3, fy, z + Math.sin(fa) * 0.3), '#f29a2e', 'ceramic');
      }
    }
    // flower beds between the trees
    for (let f = 0; f < 26; f++) {
      const a = AV0 + (s + rng.float(0.2, 0.8)) * (TAU / 8);
      const rr = rng.float(2.3, 3.15);
      const [x, z] = xz(rr, a);
      if (avenueDist(a, rr) < 0.3) continue;
      flowerPos.push([x, 0.04, z]);
    }
    // benches on the terrace
    const ba = AV0 + (s + 0.5) * (TAU / 8);
    const [bx, bz] = xz(1.98, ba);
    b.add(K.at(K.box(0.36, 0.05, 0.1), bx, 0.1, bz, { ry: -ba + Math.PI / 2 }), C.milk2, 'stone');
    b.add(K.at(K.box(0.3, 0.1, 0.06), bx, 0, bz, { ry: -ba + Math.PI / 2 }), C.milk2, 'stone');
  }
  const FLOWERS = ['#e0475a', '#f2c14e', '#f5f0e6', '#d9608f', '#ef7d3c'];
  for (const p of flowerPos) b.add(K.at(K.sphere(0.04, 5, 4), p[0], p[1], p[2], { s: [1, 0.7, 1] }), rng.pick(FLOWERS), 'matte');
  // a low hedge along the garden's edge
  for (let s = 0; s < 8; s++) {
    const a0 = AV0 + s * (TAU / 8) + 0.13, a1 = AV0 + (s + 1) * (TAU / 8) - 0.13;
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = a0 + ((i + 0.5) / n) * (a1 - a0);
      const [x, z] = xz(3.3, a);
      b.add(K.at(K.box(0.36, 0.16, 0.12), x, 0, z, { ry: -a + Math.PI / 2 }), K.jitter('#4d6e3a', rng, 0.01, 0.03, 0.03), 'matte');
    }
  }

  // ---- the bazaar ring: forty stalls under carnelian awnings, rugs heaped with stones
  interface GemSpec { x: number; y: number; z: number; s: number; kind: number; rx: number; ry: number }
  const gems: GemSpec[] = [];
  const stalls: { a: number; x: number; z: number }[] = [];
  const easels: { x: number; z: number; a: number; q: number; r: number }[] = [];
  const RUGS = ['#8e2c25', '#2f3f6b', '#a8742c', '#5b2a4a', '#2e5a4c'];
  const heap = (x: number, z: number, y0: number, kind: number, n: number, rad: number) => {
    for (let i = 0; i < n; i++) {
      const rr = rad * Math.sqrt(rng.next());
      const ga = rng.angle();
      const s = rng.float(0.032, 0.05);
      const hgt = (1 - rr / rad) * rad * 0.9 * rng.float(0.5, 1);
      gems.push({ x: x + Math.cos(ga) * rr, y: y0 + hgt + s * 0.4, z: z + Math.sin(ga) * rr, s, kind: rng.chance(0.15) ? rng.int(0, 3) : kind, rx: rng.angle(), ry: rng.angle() });
    }
  };
  const loc = (x0: number, z0: number, a: number, u: number, v: number): [number, number] => [x0 + Math.cos(a) * u - Math.sin(a) * v, z0 + Math.sin(a) * u + Math.cos(a) * v];
  for (let s = 0; s < 8; s++) {
    for (let k = 0; k < 5; k++) {
      const a = AV0 + (s + (k + 1) / 6) * (TAU / 8);
      const [x, z] = xz(6.3, a);
      stalls.push({ a, x, z });
      const ry = -a;
      // poles
      for (const su of [-0.3, 0.3]) for (const sv of [-0.28, 0.28]) b.add(P2(x, z, a, su, sv, 0, K.cyl(0.014, 0.016, 0.56, 5)), '#4b3a2c', 'wood');
      // striped gable awning (ridge along the radius)
      for (let j = 0; j < 4; j++) {
        const g = K.gableRoof(0.19, 0.62, 0.2, 0.05);
        b.add(P2(x, z, a, -0.285 + j * 0.19, 0, 0.56, g), j % 2 ? C.milk : (k % 2 ? '#c4512a' : '#d9612f'), 'cloth');
      }
      // counter with baskets of stones
      b.add(P2(x, z, a, 0, 0, 0, K.box(0.5, 0.28, 0.24)), '#6e4b33', 'wood');
      const kind = (s * 5 + k) % 4;
      for (const bu of [-0.13, 0.13]) {
        const [px, pz] = loc(x, z, a, bu, 0);
        b.add(K.at(K.cyl(0.07, 0.055, 0.06, 8), px, 0.28, pz), '#a9824e', 'wood');
        heap(px, pz, 0.33, (kind + (bu > 0 ? 1 : 0)) % 4, 6, 0.055);
      }
      // a rug toward the inner street, heaped with stones
      {
        const [rx, rz] = loc(x, z, a, -0.56, 0);
        const rc = rng.pick(RUGS);
        b.add(K.at(K.box(0.36, 0.012, 0.6), rx, 0, rz, { ry }), rc, 'cloth');
        b.add(K.at(K.box(0.28, 0.012, 0.5), rx, 0.004, rz, { ry }), K.mix(rc, '#e8d6b0', 0.35), 'cloth');
        for (let hh = 0; hh < 2; hh++) {
          const [hx, hz] = loc(x, z, a, -0.56 + rng.float(-0.05, 0.05), -0.13 + hh * 0.26);
          heap(hx, hz, 0.016, (kind + hh * 2) % 4, hi ? 12 : 7, 0.085);
        }
      }
      // an easel showing a polished slice
      {
        const [ex, ez] = loc(x, z, a, -0.42, 0.24 * (k % 2 ? 1 : -1));
        b.add(K.at(K.cyl(0.008, 0.008, 0.3, 4), ex, 0, ez, { rx: 0.15, ry }), '#4b3a2c', 'wood');
        easels.push({ x: ex, z: ez, a, q: (kind + 1) % 4, r: rng.float(0.1, 0.13) });
      }
    }
  }

  // ---- the kitchen ring: twenty four hearths of cherry wood, spits of golden pheasant
  interface Hearth { x: number; z: number; a: number; seed: number }
  const hearths: Hearth[] = [];
  const diners: V3[] = [];
  const cooks: V3[] = [];
  for (let s = 0; s < 8; s++) {
    for (let k = 0; k < 3; k++) {
      const a = AV0 + (s + (k + 1) / 4) * (TAU / 8);
      const [hx, hz] = xz(10.75, a);
      hearths.push({ x: hx, z: hz, a, seed: rng.float(0, 100) });
      const ry = -a;
      // stone fire ring and embers
      b.add(K.at(K.lathe([[0.3, 0], [0.31, 0.1], [0.26, 0.12], [0.22, 0.03]], 18), hx, 0, hz), K.jitter(C.stoneG, rng), 'stone');
      b.add(K.at(K.disc(0.23, 14), hx, 0.035, hz), '#ff6a22', 'glow', 1.8);
      for (let l = 0; l < 3; l++) {
        const la = (l / 3) * Math.PI + rng.float(-0.2, 0.2);
        b.add(K.at(K.cyl(0.022, 0.022, 0.34, 6), hx, 0.06, hz, { rz: Math.PI / 2, ry: la }), C.cherry, 'wood');
      }
      // spit on forked posts (tangential)
      for (const sv of [-0.36, 0.36]) {
        const [px, pz] = loc(hx, hz, a, 0, sv);
        b.add(K.at(K.cyl(0.012, 0.014, 0.42, 5), px, 0, pz), '#3a2c24', 'wood');
        b.add(K.at(K.box(0.05, 0.05, 0.012), px, 0.42, pz, { ry }), '#3a2c24', 'wood');
      }
      {
        const [p0x, p0z] = loc(hx, hz, a, 0, -0.42);
        const [p1x, p1z] = loc(hx, hz, a, 0, 0.42);
        b.add(K.strut([p0x, 0.43, p0z], [p1x, 0.43, p1z], 0.006, 5), '#2a2420', 'metal');
      }
      // cherry log pile
      {
        const [lx, lz] = loc(hx, hz, a, -0.05, 0.62);
        for (let l = 0; l < 6; l++) {
          const row = l < 3 ? 0 : l < 5 ? 1 : 2;
          const off = (l - (row === 0 ? 1 : row === 1 ? 3.5 : 5)) * 0.055;
          const [px, pz] = loc(lx, lz, a, off, 0);
          b.add(K.at(K.cyl(0.026, 0.026, 0.26, 6), px, 0.026 + row * 0.045, pz, { rx: Math.PI / 2, ry }), K.jitter(C.cherry, rng, 0.01, 0.05, 0.05), 'wood');
        }
      }
      // pots of marjoram by the fire
      for (const pv of [-0.6, -0.72]) {
        const [px, pz] = loc(hx, hz, a, -0.2, pv);
        b.add(K.at(K.cyl(0.05, 0.035, 0.08, 8), px, 0, pz), '#b0603c', 'ceramic');
        b.add(K.at(K.sphere(0.06, 7, 5), px, 0.11, pz, { s: [1, 0.8, 1] }), K.jitter('#6d8f45', rng), 'matte');
      }
      {
        const [cx, cz] = loc(hx, hz, a, -0.38, -0.2);
        cooks.push([cx, 0, cz]);
      }
      // pergola with a table and diners
      {
        const [tx, tz] = xz(11.8, a);
        for (const pu of [-0.38, 0.38]) for (const pv of [-0.62, 0.62]) {
          const [px, pz] = loc(tx, tz, a, pu, pv);
          b.add(K.at(K.cyl(0.02, 0.022, 0.62, 5), px, 0, pz), '#5a4332', 'wood');
        }
        for (const pv of [-0.62, 0.62]) b.add(P2(tx, tz, a, 0, pv, 0.6, K.box(0.84, 0.03, 0.04)), '#5a4332', 'wood');
        for (let sl = 0; sl < 7; sl++) b.add(P2(tx, tz, a, -0.36 + sl * 0.12, 0, 0.635, K.box(0.03, 0.025, 1.34)), '#6a5038', 'wood');
        // vine leaves over the slats
        for (let vl = 0; vl < 7; vl++) {
          const [vx, vz] = loc(tx, tz, a, rng.float(-0.38, 0.38), rng.float(-0.6, 0.6));
          b.add(K.at(K.wobble(K.sphere(0.13, 7, 5), 0.04, 6, rng.float(0, 50)), vx, 0.68, vz, { s: [1, 0.45, 1] }), K.jitter('#5f8a3e', rng, 0.02, 0.06, 0.05), 'matte');
        }
        // table, benches, a hanging bunch of oregano
        b.add(P2(tx, tz, a, 0, 0, 0.24, K.box(0.34, 0.03, 0.96)), '#d8c3a0', 'wood');
        b.add(P2(tx, tz, a, 0, 0, 0, K.box(0.08, 0.24, 0.7)), '#7a5a3e', 'wood');
        for (const bu of [-0.27, 0.27]) b.add(P2(tx, tz, a, bu, 0, 0.12, K.box(0.1, 0.03, 0.9)), '#7a5a3e', 'wood');
        for (const hv of [-0.3, 0.05, 0.4]) b.add(P2(tx, tz, a, 0, hv, 0.5, K.cone(0.03, 0.1, 5), Math.PI), '#7f9a52', 'matte');
        // dishes on the table
        for (let d = 0; d < 4; d++) b.add(P2(tx, tz, a, 0, -0.33 + d * 0.22, 0.27, K.cyl(0.05, 0.04, 0.015, 10)), '#efe6d6', 'ceramic');
        for (let dn = 0; dn < 6; dn++) {
          if (rng.chance(0.2)) continue;
          const side = dn < 3 ? -1 : 1;
          const [px, pz] = loc(tx, tz, a, side * 0.27, -0.3 + (dn % 3) * 0.3);
          diners.push([px, 0.03, pz]);
        }
      }
    }
  }
  function P2(x0: number, z0: number, a: number, u: number, v: number, y: number, g: THREE.BufferGeometry, rot = 0) {
    const [px, pz] = loc(x0, z0, a, u, v);
    return K.at(g, px, y, pz, { ry: -a + rot });
  }

  // ---- the workshop ring: forty eight gabled halls; two cutters at their wheels before each
  interface Shed { a: number; x: number; z: number; reels: THREE.Vector3[] }
  const sheds: Shed[] = [];
  const SHED_RHO = 16.3;
  const HALL_H = 0.5, RIDGE = 0.34;
  for (let s = 0; s < 8; s++) {
    for (let k = 0; k < 6; k++) {
      const a = AV0 + (s + (k + 0.5) / 6) * (TAU / 8);
      const [x, z] = xz(SHED_RHO, a);
      const wallC = K.jitter(rng.pick(['#d5dadc', '#c8d0d5', '#dfe2e0']), rng, 0.01, 0.03, 0.03);
      const roofC = K.jitter(rng.pick(['#7f96aa', '#7389a0', '#8ea2b4', '#93a0ae']), rng, 0.01, 0.03, 0.04);
      // the hall, its gable roof (ridge along the radius) and a dark open mouth toward the centre
      b.add(P2(x, z, a, 0.1, 0, 0, K.box(1.6, HALL_H, 0.84)), wallC, 'plaster');
      b.add(P2(x, z, a, 0.1, 0, HALL_H, K.gableRoof(1.6, 0.84, RIDGE, 0.07)), roofC, 'ceramic');
      b.add(P2(x, z, a, 0.1, 0, HALL_H + RIDGE - 0.01, K.box(1.76, 0.035, 0.05)), K.shade(roofC, 0.7), 'ceramic');
      b.add(P2(x, z, a, -0.705, 0, 0, K.wallPlane(0.5, 0.4), -Math.PI / 2), '#2c2622', 'matte');
      b.add(P2(x, z, a, -0.71, 0, 0.4, K.box(0.02, 0.05, 0.6)), '#6e5440', 'wood');
      // the workbench out in the light, with two wheels; stools for the cutters
      b.add(P2(x, z, a, -0.96, 0, 0, K.box(0.22, 0.22, 0.8)), '#6e5440', 'wood');
      for (const sv of [-0.22, 0.22]) {
        b.add(P2(x, z, a, -0.96, sv, 0.22, K.box(0.05, 0.12, 0.06)), '#3e332c', 'wood');
        b.add(P2(x, z, a, -1.22, sv, 0, K.cyl(0.045, 0.05, 0.1, 6)), '#5a4332', 'wood');
        // a trough of water for wet grinding
        b.add(P2(x, z, a, -0.96, sv, 0.22, K.box(0.12, 0.03, 0.05)), '#4f8c78', 'ceramic');
      }
      // raw nodules and stacked slabs in the yard behind
      for (let r = 0; r < 5; r++) {
        const [px, pz] = loc(x, z, a, 1.15 + rng.float(0, 0.45), rng.float(-0.42, 0.42));
        K.rock(b, { x: px, z: pz, r: rng.float(0.07, 0.14), color: rng.pick([C.carn, C.honey, '#8a8d8f', '#c9b9a0', '#6f8f7e']), rng, flat: 0.8 });
      }
      for (let r = 0; r < 3; r++) {
        const g = K.cyl(0.12, 0.12, 0.022, 14);
        K.at(g, 0, 0, 0, { rx: Math.PI / 2 - 0.22 });
        b.add(P2(x, z, a, -0.25 + r * 0.32, 0.47, 0.11, g, Math.PI / 2), rng.pick([C.carn, C.chryso, C.milk, C.honey, '#2a2627']), 'polished');
      }
      // two reels on the ridge, each holding a kite string
      const reels: THREE.Vector3[] = [];
      for (const ru of [-0.32, 0.5]) {
        const y0 = HALL_H + RIDGE - 0.02;
        for (const sv of [-0.09, 0.09]) b.add(P2(x, z, a, ru, sv, y0, K.box(0.03, 0.17, 0.02)), '#4a3a30', 'wood');
        const [rx, rz] = loc(x, z, a, ru, 0);
        reels.push(new THREE.Vector3(rx, y0 + 0.15, rz));
      }
      sheds.push({ a, x, z, reels });
    }
  }

  // ---- the promenade: balustrade, palms and cypresses, eight bronze hour marks
  {
    const BR = RIM - 0.32;
    const n = 420;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const [x, z] = xz(BR, a);
      b.add(K.at(K.lathe([[0.035, 0], [0.025, 0.08], [0.04, 0.16], [0.022, 0.24], [0.03, 0.27]], 6), x, 0, z), C.milk, 'stone');
    }
    const rail = revolve([[BR - 0.05, 0.27], [BR + 0.05, 0.27]], 360);
    flatUp(rail);
    b.add(rail, C.milk, 'stone');
    const rail2 = revolve([[BR + 0.05, 0.27], [BR + 0.05, 0.22]], 360);
    b.add(rail2, C.milk2, 'stone');
    const rail3 = revolve([[BR - 0.05, 0.22], [BR - 0.05, 0.27]], 360);
    b.add(rail3, C.milk2, 'stone');
    for (let i = 0; i < 8; i++) {
      const a = AV0 + (i + 0.5) * (TAU / 8);
      const [x, z] = xz(BR - 0.25, a);
      b.add(K.at(K.box(0.2, 0.12, 0.2), x, 0, z, { ry: -a }), C.milk2, 'stone');
      b.add(K.at(K.pyramid(0.12, 0.12, 0.5), x, 0.12, z, { ry: -a }), '#9c6b3d', 'bronze');
    }
    let placed = 0;
    for (let s = 0; s < 8; s++) {
      for (let k = 0; k < 7; k++) {
        const a = AV0 + (s + (k + 1) / 8) * (TAU / 8);
        const [x, z] = xz(20.95 + (k % 2) * 0.55, a);
        K.tree(b, { x, z, kind: k % 2 ? 'cypress' : 'palm', h: k % 2 ? rng.float(1.3, 1.8) : rng.float(1.4, 1.9), rng });
        placed++;
      }
    }
    void placed;
  }

  root.add(built(b, 'anastasia'));

  // ---- polished slices on the easels (canvas-painted agate, onyx, chrysoprase, chalcedony)
  {
    const SL = [
      ['#f3e3c8', '#dca85e', '#c95a2c', '#9c3d1f', '#efe6d6', '#b86a3a'],
      ['#f5f2ec', '#1f1b1c', '#f5f2ec', '#3a3536', '#d8d2c8', '#1f1b1c'],
      ['#d6f0e2', '#74c7a2', '#4f9e7c', '#a8dcc0', '#e9f6ef', '#3f876a'],
      ['#e6eef3', '#a9c1d4', '#7f9cb5', '#cfdde7', '#f2f5f7', '#6d8aa3'],
    ];
    const srng = rng.fork('slices');
    const tex = K.canvasTexture(512, 512, (g) => {
      for (let q = 0; q < 4; q++) {
        const ox = (q % 2) * 256 + 128, oy = Math.floor(q / 2) * 256 + 128;
        let r = 126, ci = 0;
        const ph = srng.float(0, 6);
        while (r > 3) {
          g.beginPath();
          for (let i = 0; i <= 72; i++) {
            const t = (i / 72) * TAU;
            const rr = r * (1 + 0.07 * Math.sin(3 * t + ph) + 0.035 * Math.sin(5 * t + r * 0.07));
            const px = ox + Math.cos(t) * rr, py = oy + Math.sin(t) * rr * 0.92;
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
          }
          g.fillStyle = SL[q][ci % SL[q].length];
          g.fill();
          ci++;
          r -= srng.float(2, 9);
        }
      }
    });
    const parts: THREE.BufferGeometry[] = [];
    for (const e of easels) {
      const g = new THREE.CircleGeometry(e.r, 20);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5 + (e.q % 2) * 0.5, uv.getY(i) * 0.5 + (1 - Math.floor(e.q / 2)) * 0.5);
      // stand upright facing the inner street (towards the centre)
      K.at(g, 0, 0, 0, { rx: -0.15 });
      K.at(g, e.x - Math.cos(e.a) * 0.02, 0.2, e.z - Math.sin(e.a) * 0.02, { ry: -e.a - Math.PI / 2 });
      parts.push(g);
    }
    const sliceMat = patch(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.18, side: THREE.DoubleSide }), { key: 'slice' });
    const slices = new THREE.Mesh(K.merge(parts, true), sliceMat);
    slices.castShadow = true;
    root.add(slices);
  }

  // ---- gems: banded agate, black and white onyx, apple green chrysoprase, milky chalcedony
  {
    const banded = (soft: boolean) => {
      const g = new THREE.OctahedronGeometry(1, 0);
      g.scale(1, 0.72, 1);
      return K.paintBy(g.toNonIndexed(), (_x, y, _z, c) => {
        const t = 0.5 + 0.5 * Math.sin(y * 7.0 + 0.6);
        c.setScalar(soft ? 0.45 + 0.55 * t : t > 0.5 ? 1 : 0.07);
      });
    };
    const plain = K.paint(new THREE.IcosahedronGeometry(1, 0).toNonIndexed(), '#ffffff');
    const gemMat = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.14, metalness: 0, envMapIntensity: 1.6, flatShading: true }), { key: 'gem' });
    const COLS = [['#e2873a', '#d9a35f', '#c4562a'], ['#f4f1ea'], ['#82d9aa', '#6cc79a', '#9fe3bd'], ['#a9c8e2', '#c4d8e8', '#93b6d3']];
    const groups = [gems.filter((g) => g.kind === 0), gems.filter((g) => g.kind === 1), gems.filter((g) => g.kind >= 2)];
    const geos = [banded(true), banded(false), plain];
    groups.forEach((list, gi) => {
      const m = K.instanced(geos[gi], gemMat, list.length, (i, o, c) => {
        const gm = list[i];
        o.position.set(gm.x, gm.y, gm.z);
        o.rotation.set(gm.rx, gm.ry, 0);
        o.scale.setScalar(gm.s);
        c.copy(K.jitter(rng.pick(COLS[gm.kind]), rng, 0.01, 0.05, 0.04));
      }, { castShadow: false, receiveShadow: true });
      root.add(m);
    });
  }

  // ---- sparkles: star glints over the stones, lit where desire looks
  const pointScale = (mat: THREE.ShaderMaterial) => (renderer: THREE.WebGLRenderer) => {
    const h = renderer.getRenderTarget()?.height ?? renderer.domElement.height;
    mat.uniforms.uScale.value = h * 0.9;
  };
  {
    const pick = gems.filter((_, i) => i % 3 === 0);
    const pos = new Float32Array(pick.length * 3), seed = new Float32Array(pick.length);
    pick.forEach((g, i) => {
      pos.set([g.x, g.y + g.s * 0.6, g.z], i * 3);
      seed[i] = rng.next();
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...DU, uTime: K.U.time, uScale: { value: 600 } },
      vertexShader: /* glsl */ `
        ${DESIRE}
        attribute float aSeed;
        uniform float uTime, uScale;
        varying float vA;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          float k = max(desireAt(w.xyz), 0.06);
          float tw = pow(0.5 + 0.5 * sin(uTime * (1.8 + aSeed * 4.0) + aSeed * 40.0), 8.0);
          vA = k * tw;
          vec4 mv = viewMatrix * w;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = 0.42 * uScale / max(0.001, -mv.z) * (0.3 + 0.7 * tw) * (0.5 + 0.5 * k);
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          vec2 q = gl_PointCoord - 0.5;
          float cr = max(exp(-abs(q.x) * 38.0) * exp(-abs(q.y) * 5.0), exp(-abs(q.y) * 38.0) * exp(-abs(q.x) * 5.0));
          float a = (cr + exp(-dot(q, q) * 90.0)) * vA;
          gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * a * 3.0, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.onBeforeRender = pointScale(mat);
    root.add(pts);
  }

  // ---- hearth halos (soft glow that swells with desire)
  {
    const pos = new Float32Array(hearths.length * 3);
    hearths.forEach((h, i) => pos.set([h.x, 0.32, h.z], i * 3));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...DU, uTime: K.U.time, uScale: { value: 600 } },
      vertexShader: /* glsl */ `
        ${DESIRE}
        uniform float uTime, uScale;
        varying float vA;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          float k = desireAt(w.xyz);
          vA = (0.18 + 0.82 * k) * (0.9 + 0.1 * sin(uTime * 9.0 + position.x * 3.0));
          vec4 mv = viewMatrix * w;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (0.9 + 1.6 * k) * uScale / max(0.001, -mv.z);
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d); a *= a;
          gl_FragColor = vec4(vec3(1.0, 0.62, 0.28) * a * vA * 1.6, a * vA);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.onBeforeRender = pointScale(mat);
    root.add(pts);
  }

  // ---- flames (instanced, flicker and flare with desire)
  const flameGeo = (() => {
    const parts: THREE.BufferGeometry[] = [];
    const cols = (g: THREE.BufferGeometry, hgt: number) =>
      K.paintBy(g, (_x, y, _z, c) => {
        const t = Math.min(1, Math.max(0, y / hgt));
        c.set('#ffd27a').lerp(new THREE.Color('#ff5a1e'), t).multiplyScalar(2.4 - t);
      });
    parts.push(cols(K.cone(0.11, 0.34, 7), 0.34));
    parts.push(cols(K.at(K.cone(0.07, 0.24, 6), 0.06, 0, 0.03), 0.24));
    parts.push(cols(K.at(K.cone(0.07, 0.22, 6), -0.05, 0, -0.04), 0.22));
    return K.merge(parts);
  })();
  const flames = K.instanced(flameGeo, finMat('glow'), hearths.length, undefined, { castShadow: false, receiveShadow: false, colors: false });
  root.add(flames);

  // ---- golden pheasants on the spits
  const pheasantGeo = (() => {
    const parts: THREE.BufferGeometry[] = [];
    parts.push(K.paint(K.at(K.sphere(0.075, 10, 8), 0, 0, 0, { s: [0.78, 0.66, 1.15] }), C.pheasant));
    parts.push(K.paint(K.at(K.sphere(0.05, 8, 6), 0, 0.03, 0.03, { s: [1.05, 0.8, 1] }), '#d99a3e'));
    for (const sx of [-1, 1]) {
      parts.push(K.paint(K.strut([sx * 0.04, -0.02, -0.04], [sx * 0.05, -0.05, -0.12], 0.02, 6), '#a8662a'));
      parts.push(K.paint(K.at(K.sphere(0.022, 6, 5), sx * 0.05, -0.05, -0.12), '#efe1c8'));
    }
    return K.merge(parts);
  })();
  const pheasantMat = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.05, envMapIntensity: 1.3 }), { key: 'lit' });
  const pheasants = K.instanced(pheasantGeo, pheasantMat, hearths.length * 2, undefined, { castShadow: true, receiveShadow: true, colors: false });
  root.add(pheasants);

  // ---- grinding wheels, cutters and reels (instanced, animated)
  const wheelGeo = K.paintBy(new THREE.CylinderGeometry(0.14, 0.14, 0.035, 20, 1).rotateX(Math.PI / 2).toNonIndexed(), (x, y, _z, c) => {
    const a = Math.atan2(y, x);
    const r = Math.hypot(x, y);
    c.set(r < 0.04 ? '#4a4038' : Math.sin(a * 3) > 0.6 ? '#6f7b85' : '#9aa6ae');
  });
  const wheelMat = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), { key: 'lit' });
  const wheels = K.instanced(wheelGeo, wheelMat, sheds.length * 2, undefined, { castShadow: false, receiveShadow: true, colors: false });
  root.add(wheels);
  const cutterGeo = K.personGeometry(0.25);
  const cutters = K.instanced(cutterGeo, figMat, sheds.length * 2, (_i, _o, c) => {
    c.set(rng.pick(['#6b5a4a', '#7d6b56', '#5c4f45', '#8a7560', '#4f5560']));
  }, { castShadow: true, receiveShadow: true });
  root.add(cutters);
  const reelGeo = (() => {
    const parts = [K.paint(K.at(K.cyl(0.06, 0.06, 0.14, 10), 0, -0.07, 0, { rx: 0 }), '#e8dcc0'), K.paint(K.at(K.cyl(0.075, 0.075, 0.015, 12), 0, -0.07, 0), '#5a4332'), K.paint(K.at(K.cyl(0.075, 0.075, 0.015, 12), 0, 0.055, 0), '#5a4332')];
    const g = K.merge(parts);
    g.rotateX(Math.PI / 2);
    return g;
  })();
  const reelMat = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), { key: 'lit' });
  const reels = K.instanced(reelGeo, reelMat, sheds.length * 2, undefined, { castShadow: false, receiveShadow: true, colors: false });
  root.add(reels);

  // sparks flying from the wheels
  const sparkMat = new THREE.ShaderMaterial({
    uniforms: { uTime: K.U.time, uScale: { value: 600 }, uSpark: { value: 0.4 } },
    vertexShader: /* glsl */ `
      attribute vec3 aDir;
      attribute float aSeed;
      uniform float uTime, uScale, uSpark;
      varying float vA;
      void main() {
        float age = fract(uTime * (1.3 + aSeed * 0.9) + aSeed * 17.0);
        vec3 p = position + aDir * age * 0.55 + vec3(0.0, -1.1 * age * age, 0.0);
        vA = (1.0 - age) * step(aSeed, uSpark);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 0.05 * uScale / max(0.001, -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vA;
        gl_FragColor = vec4(vec3(1.0, 0.7, 0.3) * 3.0 * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  {
    const per = hi ? 9 : 5;
    const n = sheds.length * 2 * per;
    const pos = new Float32Array(n * 3), dir = new Float32Array(n * 3), seed = new Float32Array(n);
    let k = 0;
    for (const s of sheds) {
      for (const sv of [-0.24, 0.24]) {
        const [cx, cz] = loc(s.x, s.z, s.a, -1.09, sv);
        for (let i = 0; i < per; i++, k++) {
          pos.set([cx, 0.33, cz], k * 3);
          const out = rng.float(0.4, 1.0), side = rng.float(-0.5, 0.5), up = rng.float(0.1, 0.9);
          const dx = -Math.cos(s.a) * out - Math.sin(s.a) * side;
          const dz = -Math.sin(s.a) * out + Math.cos(s.a) * side;
          dir.set([dx, up, dz], k * 3);
          seed[k] = rng.next();
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const pts = new THREE.Points(geo, sparkMat);
    pts.frustumCulled = false;
    pts.onBeforeRender = pointScale(sparkMat);
    root.add(pts);
  }

  // ---- people: diners, cooks, strollers
  root.add(K.instanced(K.personGeometry(0.22), figMat, diners.length, (i, o, c) => {
    o.position.set(diners[i][0], diners[i][1] - 0.06, diners[i][2]);
    o.rotation.y = rng.angle();
    c.set(rng.pick(['#7a3b2e', '#2f4b6e', '#c9a35a', '#e8e0d0', '#4a5d3a', '#6d3d5e', '#efe6d6']));
  }));
  root.add(K.instanced(K.personGeometry(0.25), figMat, cooks.length, (i, o, c) => {
    o.position.set(cooks[i][0], 0, cooks[i][2]);
    o.rotation.y = rng.angle();
    c.set('#f1ece2');
  }));
  const walkPaths: THREE.Vector3[][] = [];
  for (const rho of [2.0, 5.3, 7.3, 10.22, 12.3, 14.72, 20.75, 21.75]) {
    const p: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * TAU;
      const [x, z] = xz(rho, a);
      p.push(new THREE.Vector3(x, 0.01, z));
    }
    walkPaths.push(p);
  }
  const walkers = new K.Walkers({
    paths: walkPaths,
    count: hi ? 230 : 120,
    closed: true,
    rng: rng.fork('walkers'),
    speed: [0.14, 0.3],
    colors: ['#7a3b2e', '#2f4b6e', '#c9a35a', '#efe6d6', '#4a5d3a', '#8e4a2c', '#3b4a5e', '#d8c7a5'],
    material: figMat,
  });
  root.add(walkers.mesh);

  // ---- bathers in the garden pool (heads and shoulders)
  const batherGeo = (() => {
    const parts = [
      K.paint(K.at(K.sphere(0.06, 9, 6), 0, 0, 0, { s: [1.35, 0.42, 0.8] }), '#e8b48c'),
      K.paint(K.at(K.sphere(0.04, 9, 7), 0, 0.055, 0), '#ecbc94'),
      K.paint(K.at(K.sphere(0.043, 9, 6, ), 0, 0.068, -0.008, { s: [1, 0.8, 1.05] }), '#3a2a22'),
    ];
    return K.merge(parts);
  })();
  const bathers = K.instanced(batherGeo, figMat, 6, (i, _o, c) => {
    c.set(['#ffffff', '#f3e0d2', '#ffffff', '#e9d3c0', '#fff2e6', '#f0dccb'][i]);
  }, { castShadow: false, receiveShadow: true });
  root.add(bathers);
  // a passing stranger hesitates at the rim
  {
    const a = TH_CAM + 0.5;
    const [x, z] = xz(1.98, a);
    root.add(K.instanced(K.personGeometry(0.26), figMat, 1, (_i, o, c) => {
      o.position.set(x, 0, z);
      c.set('#4a3a5a');
    }));
  }
  // splashes in the pool
  const splashMat = new THREE.ShaderMaterial({
    uniforms: { uTime: K.U.time, uScale: { value: 600 }, uK: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uScale, uK;
      varying float vA;
      void main() {
        float age = fract(uTime * (0.9 + aSeed * 0.8) + aSeed * 9.0);
        vec3 p = position;
        p.y += age * (0.9 + aSeed) * 0.6 - age * age * 0.8;
        p.xz *= 1.0 + age * 0.25;
        vA = (1.0 - age) * uK * step(0.15, p.y + 0.1);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 0.05 * uScale / max(0.001, -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * vA;
        gl_FragColor = vec4(vec3(0.95, 1.0, 0.97) * a * 1.4, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  {
    const n = 140;
    const pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const [x, z] = rng.inDisc(1.3);
      pos.set([x, -0.07, z], i * 3);
      seed[i] = rng.next();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const pts = new THREE.Points(geo, splashMat);
    pts.frustumCulled = false;
    pts.onBeforeRender = pointScale(splashMat);
    root.add(pts);
  }

  // ---- boats on the canals
  interface Boat { rho: number; a0: number; dir: number; sp: number; lat: number }
  const boatsSpec: Boat[] = [];
  for (let c = 1; c < 4; c++) {
    const [ra, rb] = CANAL[c];
    const n = c === 3 ? 8 : 5;
    for (let i = 0; i < n; i++) boatsSpec.push({ rho: (ra + rb) / 2, a0: rng.angle(), dir: rng.sign(), sp: rng.float(0.18, 0.32), lat: rng.float(-0.15, 0.15) });
  }
  const boatGeo = K.boatGeometry(0.62, '#ffffff');
  const boats = K.instanced(boatGeo, figMat, boatsSpec.length, (_i, _o, c) => {
    c.set(rng.pick(['#5a3e2b', '#6b4a32', '#3f3a36', '#7a5236']));
  }, { castShadow: true, receiveShadow: true });
  root.add(boats);

  // ---- smoke of seasoned cherry wood
  const smoke = K.smoke({
    sources: hearths.map((h) => [h.x, 0.5, h.z] as V3),
    perSource: hi ? 12 : 7,
    height: 3.2,
    color: '#ece4da',
    opacity: 0.16,
    size: [0.25, 1.1],
    life: 6,
    wind: [wind.x * 0.5, wind.y * 0.5],
    rng: rng.fork('smoke'),
  });
  root.add(smoke);
  const smokeU = (smoke.material as THREE.ShaderMaterial).uniforms;

  // ---- kites: ninety six, two per workshop, tethered to reels on the shed roofs
  interface Kite {
    reel: THREE.Vector3;
    ax: number; ay: number; az: number;
    vr: number; vy: number; reelA: number;
    s: number; size: number; hex: boolean; idx: number;
    p: THREE.Vector3;
  }
  const kites: Kite[] = [];
  const krng = rng.fork('kites');
  let hexCount = 0, diaCount = 0;
  {
    // the canopy: blue-noise scatter over the whole city, drifting downwind and higher far away
    const reelsAll: THREE.Vector3[] = [];
    sheds.forEach((sh) => sh.reels.forEach((r) => reelsAll.push(r)));
    const spots: V3[] = [];
    for (let tries = 0; spots.length < reelsAll.length && tries < 6000; tries++) {
      const [x0, z0] = krng.inDisc(24.5);
      const x = x0 + wind.x * 3, z = z0 + wind.y * 3;
      const md = tries < 4000 ? 3.0 : 2.0;
      if (spots.some((p) => Math.hypot(p[0] - x, p[2] - z) < md)) continue;
      const down = (x * wind.x + z * wind.y) / 24;
      spots.push([x, 6.2 + krng.float(0, 6.5) + 3.2 * (down + 1) * 0.5, z]);
    }
    while (spots.length < reelsAll.length) spots.push([krng.float(-15, 15), krng.float(7, 14), krng.float(-15, 15)]);
    const byAng = (a: number, b2: number) => a - b2;
    spots.sort((p, q) => byAng(Math.atan2(p[2], p[0]), Math.atan2(q[2], q[0])));
    const order = reelsAll.map((r, i) => ({ r, i, a: Math.atan2(r.z, r.x) })).sort((p, q) => p.a - q.a);
    order.forEach((o, i) => {
      const sp = spots[i];
      const hex = krng.chance(0.38);
      kites.push({
        reel: o.r,
        ax: sp[0], ay: sp[1], az: sp[2],
        vr: krng.float(6.0, 12.5), vy: krng.float(6.0, 13.5), reelA: o.a,
        s: krng.next(), size: krng.float(1.05, 1.6), hex, idx: hex ? hexCount++ : diaCount++,
        p: new THREE.Vector3(),
      });
    });
  }

  const kiteGeometry = (hex: boolean) => {
    const pos: number[] = [], nrm: number[] = [], part: number[] = [], tail: number[] = [];
    const tri = (a: number[], b2: number[], c: number[], p: number, n: V3 = [0, 0, 1], t0 = 0, t1 = 0, t2 = 0) => {
      pos.push(...a, ...b2, ...c);
      for (let i = 0; i < 3; i++) {
        nrm.push(...n);
        part.push(p);
      }
      tail.push(t0, t1, t2);
    };
    const quad = (a: number[], b2: number[], c: number[], d: number[], p: number, n: V3, ta = 0, tb = 0) => {
      tri(a, b2, c, p, n, ta, ta, tb);
      tri(b2, d, c, p, n, ta, tb, tb);
    };
    let bottom: number[];
    if (!hex) {
      const T = [0, 0.72, 0], Lp = [-0.5, 0.2, -0.08], R = [0.5, 0.2, -0.08], B = [0, -0.55, 0], Cc = [0, 0.2, 0.015];
      tri(Cc, T, Lp, 0); tri(Cc, R, T, 1); tri(Cc, Lp, B, 1); tri(Cc, B, R, 0);
      const sw = 0.012;
      quad([-sw, -0.55, -0.012], [sw, -0.55, -0.012], [-sw, 0.72, -0.012], [sw, 0.72, -0.012], 2, [0, 0, 1]);
      quad([-0.5, 0.2 - sw, -0.09], [-0.5, 0.2 + sw, -0.09], [0, 0.2 - sw, -0.006], [0, 0.2 + sw, -0.006], 2, [0, 0, 1]);
      quad([0, 0.2 - sw, -0.006], [0, 0.2 + sw, -0.006], [0.5, 0.2 - sw, -0.09], [0.5, 0.2 + sw, -0.09], 2, [0, 0, 1]);
      bottom = B;
    } else {
      const ring = (r: number, z: number) => Array.from({ length: 6 }, (_, i) => {
        const a = Math.PI / 2 + (i / 6) * TAU;
        return [Math.cos(a) * r, Math.sin(a) * r * 1.12, z];
      });
      const inner = ring(0.3, 0.01), outer = ring(0.56, -0.05);
      const Cc = [0, 0, 0.02];
      for (let i = 0; i < 6; i++) {
        const j = (i + 1) % 6;
        tri(Cc, inner[i], inner[j], 0);
        tri(inner[i], outer[i], inner[j], 1);
        tri(inner[j], outer[i], outer[j], 1);
      }
      const sw = 0.012;
      for (let i = 0; i < 3; i++) {
        const A = outer[i], Bq = outer[i + 3];
        const dx = Bq[0] - A[0], dy = Bq[1] - A[1];
        const l = Math.hypot(dx, dy);
        const nx = (-dy / l) * sw, ny = (dx / l) * sw;
        quad([A[0] - nx, A[1] - ny, -0.06], [A[0] + nx, A[1] + ny, -0.06], [Bq[0] - nx, Bq[1] - ny, -0.06], [Bq[0] + nx, Bq[1] + ny, -0.06], 2, [0, 0, 1]);
      }
      bottom = outer[3];
    }
    // ribbon tail streaming away from the string, striped
    const N = 11, Ltail = 3.0;
    const tp = (s: number): V3 => [0, bottom[1] + s * Ltail * 0.08 - s * s * 0.6, -s * Ltail];
    for (let i = 0; i < N; i++) {
      const s0 = i / N, s1 = (i + 1) / N;
      const p0 = tp(s0), p1 = tp(s1);
      const w0 = 0.055 * (1 - s0 * 0.4), w1 = 0.055 * (1 - s1 * 0.4);
      quad([-w0, p0[1], p0[2]], [w0, p0[1], p0[2]], [-w1, p1[1], p1[2]], [w1, p1[1], p1[2]], i % 2, [0, 1, 0], s0 + 0.0001, s1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
    g.setAttribute('aTail', new THREE.Float32BufferAttribute(tail, 1));
    g.computeBoundingSphere();
    return g;
  };
  const kiteMat = patch(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 }), {
    key: 'kite',
    uniforms: { uTime: K.U.time, uSunDir: K.U.sunDir },
    vertPars: 'attribute vec3 aColA; attribute vec3 aColB; attribute float aSeed; attribute float aPart; attribute float aTail; uniform float uTime;',
    colorVert: 'vColor = vec4(aPart < 0.5 ? aColA : (aPart < 1.5 ? aColB : vec3(0.09, 0.06, 0.05)), 1.0);',
    vertMain: /* glsl */ `
      if (aTail > 0.0) {
        float ph = uTime * 3.2 + aSeed * 6.2831 - aTail * 7.5;
        transformed.x += sin(ph) * 0.34 * aTail;
        transformed.y += sin(ph * 0.7 + 1.3) * 0.14 * aTail;
      }`,
    fragPars: 'uniform vec3 uSunDir;',
    preOut: /* glsl */ `
      vec3 nWk = inverseTransformDirection(normal, viewMatrix);
      float back = max(0.0, dot(-nWk, normalize(uSunDir)));
      outgoingLight += diffuseColor.rgb * back * 0.55;
      outgoingLight += diffuseColor.rgb * dk * 0.28;`,
  });
  const KITE_PAIRS: [string, string][] = [
    [C.kcarn, C.kmilk], [C.saffron, C.kcarn], [C.chryso, C.kmilk], [C.kmilk, C.kcarn],
    [C.saffron, C.chryso], [C.konyx, C.kmilk], [C.kblue, C.kmilk], [C.kcarn, C.saffron], [C.kmilk, C.chryso],
  ];
  const makeKites = (hex: boolean, n: number) => {
    const geo = kiteGeometry(hex);
    const mesh = new THREE.InstancedMesh(geo, kiteMat, n);
    const ca = new Float32Array(n * 3), cb = new Float32Array(n * 3), sd = new Float32Array(n);
    const tmp = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const [A, B] = krng.pick(KITE_PAIRS);
      tmp.set(A);
      ca.set([tmp.r, tmp.g, tmp.b], i * 3);
      tmp.set(B);
      cb.set([tmp.r, tmp.g, tmp.b], i * 3);
      sd[i] = krng.next();
    }
    geo.setAttribute('aColA', new THREE.InstancedBufferAttribute(ca, 3));
    geo.setAttribute('aColB', new THREE.InstancedBufferAttribute(cb, 3));
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(sd, 1));
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    root.add(mesh);
    return mesh;
  };
  const kiteDia = makeKites(false, diaCount);
  const kiteHex = makeKites(true, hexCount);

  // the strings: visible only when the desires wake
  const SEGS = 14;
  const strPos = new Float32Array(kites.length * SEGS * 2 * 3);
  const strT = new Float32Array(kites.length * SEGS * 2);
  const strSeed = new Float32Array(kites.length * SEGS * 2);
  kites.forEach((k, i) => {
    for (let j = 0; j < SEGS; j++) {
      const o = (i * SEGS + j) * 2;
      strT[o] = j / SEGS;
      strT[o + 1] = (j + 1) / SEGS;
      strSeed[o] = strSeed[o + 1] = k.s;
    }
  });
  const strGeo = new THREE.BufferGeometry();
  const strAttr = new THREE.BufferAttribute(strPos, 3);
  strAttr.setUsage(THREE.DynamicDrawUsage);
  strGeo.setAttribute('position', strAttr);
  strGeo.setAttribute('aT', new THREE.BufferAttribute(strT, 1));
  strGeo.setAttribute('aSeed', new THREE.BufferAttribute(strSeed, 1));
  const strMat = new THREE.ShaderMaterial({
    uniforms: { ...DU, uTime: K.U.time, uStr: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aT;
      attribute float aSeed;
      varying float vT;
      varying float vSeed;
      varying vec3 vW;
      void main() {
        vT = aT; vSeed = aSeed;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      ${DESIRE}
      uniform float uTime, uStr;
      varying float vT;
      varying float vSeed;
      varying vec3 vW;
      void main() {
        float k = max(uStr, uPoolK * (1.0 - smoothstep(uPool.w * 0.3, uPool.w, length(vW - uPool.xyz))) * 0.55 * smoothstep(0.3, 1.0, vT));
        float g = pow(max(0.0, sin((vT * 2.0 - uTime * 0.42 + vSeed * 3.0) * 6.2831)), 16.0);
        vec3 c = vec3(1.0, 0.92, 0.74) * (0.7 + g * 3.0);
        gl_FragColor = vec4(c, k * (0.38 + 0.62 * g));
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const strings = new THREE.LineSegments(strGeo, strMat);
  strings.frustumCulled = false;
  root.add(strings);

  // the wisp of smoke when a desire is snuffed
  const puffMat = new THREE.ShaderMaterial({
    uniforms: { uTime: K.U.time, uScale: { value: 600 }, uT0: { value: -100 }, uPos: { value: new THREE.Vector3() }, uK: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uScale, uT0, uK;
      uniform vec3 uPos;
      varying float vA;
      void main() {
        float age = (uTime - uT0 - aSeed * 0.5) / 2.6;
        vec3 p = uPos + position * (0.3 + age * 1.2) + vec3(0.0, age * 2.2, 0.0);
        vA = (age > 0.0 && age < 1.0) ? sin(age * 3.14159) * uK : 0.0;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (0.35 + age * 0.9) * uScale / max(0.001, -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA * 0.22;
        gl_FragColor = vec4(vec3(0.86, 0.83, 0.86), a);
      }`,
    transparent: true,
    depthWrite: false,
  });
  {
    const n = 26;
    const pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const [x, y, z] = rng.onSphere();
      pos.set([x * 0.5, y * 0.3, z * 0.5], i * 3);
      seed[i] = rng.next();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const pts = new THREE.Points(geo, puffMat);
    pts.frustumCulled = false;
    pts.onBeforeRender = pointScale(puffMat);
    root.add(pts);
  }

  // ---- mist far below, morning motes
  root.add(K.cloudSea({ y: -16, color: '#f7f1e6', shadow: '#c3bcc4', opacity: 0.85, coverage: 0.5, scale: 0.035 }));
  root.add(K.particles({ count: hi ? 160 : 80, radius: 22, y0: 0.5, y1: 12, color: '#fff3d6', size: 0.05, opacity: 0.45, velocity: [wind.x * 0.6, 0, wind.y * 0.6], swirl: 0.5, twinkle: 0.6, rng: rng.fork('motes') }));

  // ---- lights that belong to desire
  const desireLight = new THREE.PointLight('#ffae55', 0, 9, 1.5);
  root.add(desireLight);
  const heartLight = new THREE.PointLight('#ffc27a', 0, 30, 1.1);
  heartLight.position.set(0, 4, 0);
  root.add(heartLight);
  const honey = new THREE.DirectionalLight('#ffcf8f', 0);
  honey.position.set(-12, 9, 14);
  root.add(honey);

  // ------------------------------------------------------------------ the order of desires
  type Kind = 'gems' | 'hearth' | 'pool' | 'kites';
  interface Desire { kind: Kind; c: THREE.Vector3; r: number }
  const angDiff = (a: number, b2: number) => Math.abs(((a - b2 + Math.PI * 3) % TAU) - Math.PI);
  const nearestStall = (a: number) => stalls.reduce((best, s) => (angDiff(s.a, a) < angDiff(best.a, a) ? s : best), stalls[0]);
  const nearestHearth = (a: number) => hearths.reduce((best, h) => (angDiff(h.a, a) < angDiff(best.a, a) ? h : best), hearths[0]);
  const kiteNear = (x: number, z: number) => kites.reduce((best, k) => (Math.hypot(k.ax - x, k.az - z) < Math.hypot(best.ax - x, best.az - z) ? k : best), kites[0]);
  const gemsAt = (a: number): Desire => { const s = nearestStall(a); return { kind: 'gems', c: new THREE.Vector3(s.x, 0.4, s.z), r: 3.1 }; };
  const hearthAt = (a: number): Desire => { const h = nearestHearth(a); return { kind: 'hearth', c: new THREE.Vector3(h.x, 0.5, h.z), r: 3.5 }; };
  const kitesAt = (x: number, z: number): Desire => { const k = kiteNear(x, z); return { kind: 'kites', c: new THREE.Vector3(k.ax, k.ay, k.az), r: 5.8 }; };
  const POOL_D: Desire = { kind: 'pool', c: new THREE.Vector3(0, 0.3, 0), r: 3.8 };
  const fwd = (u: number, v: number): [number, number] => [-wind.x * u + -wind.y * v, -wind.y * u + wind.x * v];
  const SEQ: Desire[] = [
    gemsAt(TH_CAM + 1.6),
    hearthAt(TH_CAM - 0.35),
    POOL_D,
    kitesAt(...fwd(-8, 6)),
    gemsAt(TH_CAM - 2.3),
    hearthAt(TH_CAM + 2.7),
    kitesAt(...fwd(-14, -8)),
    gemsAt(TH_CAM + 0.2),
    POOL_D,
    hearthAt(TH_CAM + 1.1),
  ];
  const PERIOD = 6.6, T0 = 3.4;
  const cycle = (t: number) => {
    const tt = t + T0;
    const n = Math.floor(tt / PERIOD);
    const u = tt - n * PERIOD;
    const d = SEQ[((n % SEQ.length) + SEQ.length) % SEQ.length];
    let s = 0, rf = 0;
    if (u < 1.3) {
      const k = u / 1.3;
      s = K.easeOut(k);
      rf = 0.4 + 0.6 * K.easeOut(k);
    } else if (u < 5.0) {
      s = 1;
      rf = 1 + 0.03 * Math.sin(u * 3);
    } else if (u < 6.2) {
      const k = (u - 5.0) / 1.2;
      s = (1 - K.easeIn(k)) * (1 + 0.25 * Math.sin(k * 30) * k);
      rf = Math.pow(1 - k, 0.6);
    }
    return { d, s: Math.max(0, s), r: d.r * Math.max(0.04, rf), n, u };
  };
  const desireJS = (x: number, y: number, z: number) => {
    const c = DU.uPool.value;
    const d = Math.hypot(x - c.x, y - c.y, z - c.z);
    const pool = DU.uPoolK.value * (1 - K.smoothstep(c.w * 0.3, c.w, d));
    return Math.min(1, Math.max(pool, DU.uWake.value));
  };

  // ------------------------------------------------------------------ animation state
  const tog = new K.Toggle(0.34);
  const dummy = new THREE.Object3D();
  dummy.rotation.order = 'YXZ';
  const setI = (mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, rx: number, ry: number, rz: number, s: number | V3 = 1) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(rx, ry, rz);
    if (typeof s === 'number') dummy.scale.setScalar(s);
    else dummy.scale.set(s[0], s[1], s[2]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  };
  let stroke = 0, wheelA = 0, reelA = 0, chase = 0;
  const tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();

  const update = (t: number, dt: number) => {
    tog.update(dt);
    const w = tog.value;
    DU.uWake.value = w;
    DU.uVeil.value = 0.42;

    // one desire at a time
    const cy = cycle(t);
    DU.uPool.value.set(cy.d.c.x, cy.d.c.y, cy.d.c.z, cy.r);
    DU.uPoolK.value = cy.s;
    desireLight.position.set(cy.d.c.x, cy.d.kind === 'kites' ? cy.d.c.y : 1.4, cy.d.c.z);
    desireLight.intensity = cy.d.kind === 'kites' ? 0 : cy.s * (1 - w) * 26;
    heartLight.intensity = w * 30;
    honey.intensity = w * 1.1;
    // the snuffed flame leaves a wisp
    {
      const snuffAt = (cy.n * PERIOD + 6.1) - T0;
      const prev = SEQ[(((cy.n - 1) % SEQ.length) + SEQ.length) % SEQ.length];
      if (t >= snuffAt) {
        puffMat.uniforms.uT0.value = snuffAt;
        (puffMat.uniforms.uPos.value as THREE.Vector3).copy(cy.d.c);
      } else {
        puffMat.uniforms.uT0.value = snuffAt - PERIOD;
        (puffMat.uniforms.uPos.value as THREE.Vector3).copy(prev.c);
      }
      puffMat.uniforms.uK.value = 1 - w;
    }

    // workshops: wheels, strokes, reels, sparks
    stroke += dt * THREE.MathUtils.lerp(3.6, 6.2, w);
    wheelA += dt * THREE.MathUtils.lerp(5.0, 11.0, w);
    reelA += dt * w * 1.6;
    sparkMat.uniforms.uSpark.value = 0.35 + 0.65 * w;
    for (let i = 0; i < sheds.length; i++) {
      const sh = sheds[i];
      for (let j = 0; j < 2; j++) {
        const sv = j ? 0.24 : -0.24;
        const idx = i * 2 + j;
        const [wx, wz] = loc(sh.x, sh.z, sh.a, -0.96, sv);
        setI(wheels, idx, wx, 0.37, wz, 0, -sh.a, wheelA + idx * 0.7);
        const [cx, cz] = loc(sh.x, sh.z, sh.a, -1.22, sv);
        const ph = stroke + idx * 0.37;
        const lean = 0.4 + 0.14 * Math.sin(ph);
        setI(cutters, idx, cx, 0.04, cz, lean, Math.PI / 2 - sh.a, 0, [1, 0.82, 1]);
        const rp = sh.reels[j];
        setI(reels, idx, rp.x, rp.y - 0.07, rp.z, 0, -sh.a, reelA + idx);
      }
    }
    wheels.instanceMatrix.needsUpdate = true;
    cutters.instanceMatrix.needsUpdate = true;
    reels.instanceMatrix.needsUpdate = true;

    // hearths: flames flare where desire looks; pheasants turn
    for (let i = 0; i < hearths.length; i++) {
      const h = hearths[i];
      const k = desireJS(h.x, 0.5, h.z);
      const fl = 1 + 0.16 * Math.sin(t * 13 + h.seed) + 0.1 * Math.sin(t * 23.7 + h.seed * 2);
      setI(flames, i, h.x, 0.04, h.z, 0, t * 0.6 + h.seed, 0, [0.7 + 0.4 * k, (0.28 + 1.0 * k) * fl, 0.7 + 0.4 * k]);
      for (let j = 0; j < 2; j++) {
        const [px, pz] = loc(h.x, h.z, h.a, 0, j ? 0.13 : -0.13);
        setI(pheasants, i * 2 + j, px, 0.43, pz, 0, -h.a, t * 0.9 + h.seed + j * 1.3);
      }
    }
    flames.instanceMatrix.needsUpdate = true;
    pheasants.instanceMatrix.needsUpdate = true;
    smokeU.uOpacity.value = 0.12 + 0.12 * w;

    // the garden pool: bathers chase each other in slow circles
    const kp = desireJS(0, 0.3, 0);
    chase += dt * (0.22 + 0.4 * kp);
    for (let i = 0; i < 6; i++) {
      const r = 0.55 + 0.38 * Math.sin(i * 2.1 + 0.4) + 0.08 * Math.sin(t * 0.7 + i);
      const a = chase * (i % 2 ? 1 : 0.92) + (i / 6) * TAU + 0.25 * Math.sin(t * 0.5 + i * 1.3);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      setI(bathers, i, x, -0.085 + 0.012 * Math.sin(t * 2.2 + i), z, 0, -a, 0);
      BATH[i].set(x, 0.18 + 0.5 * kp, z);
    }
    bathers.instanceMatrix.needsUpdate = true;
    splashMat.uniforms.uK.value = kp * 0.9;

    // boats
    for (let i = 0; i < boatsSpec.length; i++) {
      const bt = boatsSpec[i];
      const a = bt.a0 + (bt.dir * bt.sp * t) / bt.rho;
      const [x, z] = xz(bt.rho + bt.lat, a);
      const yaw = bt.dir > 0 ? -a : Math.PI - a;
      setI(boats, i, x, WATER_Y + 0.02, z, 0, yaw, 0.02 * Math.sin(t * 1.3 + i));
    }
    boats.instanceMatrix.needsUpdate = true;

    // kites: drifting canopy, or the slow vortex when every desire is awake
    const wE = K.smoothstep(0, 1, w);
    const twist = 1.05 + 0.3 * Math.sin(t * 0.13);
    let si = 0;
    for (const k of kites) {
      const ph = k.s * TAU;
      const cxk = k.ax + Math.sin(t * 0.21 + ph) * 0.7, cyk = k.ay + Math.sin(t * 0.33 + ph * 2) * 0.45, czk = k.az + Math.cos(t * 0.17 + ph * 1.5) * 0.7;
      const va = k.reelA + twist + 0.18 * Math.sin(t * 0.21 + ph);
      const loopA = t * 0.55 + ph;
      const vx = Math.cos(va) * k.vr + Math.cos(loopA) * 0.6, vz = Math.sin(va) * k.vr + Math.sin(loopA) * 0.6, vy = k.vy + Math.sin(loopA * 1.3) * 0.5;
      k.p.set(THREE.MathUtils.lerp(cxk, vx, wE), THREE.MathUtils.lerp(cyk, vy, wE), THREE.MathUtils.lerp(czk, vz, wE));
      // a tug on the string with every stroke of the wheel
      tmpV.subVectors(k.reel, k.p);
      const len = tmpV.length();
      tmpV.multiplyScalar(1 / len);
      const tug = Math.pow(Math.max(0, Math.sin(stroke + k.s * 2)), 6) * 0.3 * w;
      k.p.addScaledVector(tmpV, tug);
      const yawReel = Math.atan2(tmpV.x, tmpV.z);
      const dy = Math.atan2(Math.sin(yawReel - YAW_WIND), Math.cos(yawReel - YAW_WIND));
      const yaw = YAW_WIND + dy * wE + 0.12 * Math.sin(t * 0.37 + ph) * (1 - wE);
      const roll = 0.16 * Math.sin(t * 0.9 + ph * 3);
      setI(k.hex ? kiteHex : kiteDia, k.idx, k.p.x, k.p.y, k.p.z, -0.62 + 0.06 * Math.sin(t * 1.1 + ph), yaw, roll, k.size);
      // string from the reel to the bridle
      tmpS.copy(k.p).addScaledVector(tmpV, 0.12);
      const sag = len * 0.05;
      for (let j = 0; j < SEGS; j++) {
        for (let e = 0; e < 2; e++) {
          const tt = (j + e) / SEGS;
          const o = (si + j * 2 + e) * 3;
          strPos[o] = k.reel.x + (tmpS.x - k.reel.x) * tt;
          strPos[o + 1] = k.reel.y + (tmpS.y - k.reel.y) * tt - sag * 4 * tt * (1 - tt);
          strPos[o + 2] = k.reel.z + (tmpS.z - k.reel.z) * tt;
        }
      }
      si += SEGS * 2;
    }
    kiteDia.instanceMatrix.needsUpdate = true;
    kiteHex.instanceMatrix.needsUpdate = true;
    strAttr.needsUpdate = true;
    strMat.uniforms.uStr.value = K.smoothstep(0.35, 1, w);

    walkers.update(t);
  };
  update(0, 0);

  // ------------------------------------------------------------------ camera, light, interaction
  const target: V3 = [0, 1.5, 0];
  const camPos: V3 = [target[0] + camDir.x * CAM_D, target[1] + camDir.y * CAM_D, target[2] + camDir.z * CAM_D];
  const side = new THREE.Vector3(Math.cos(CAM_AZ), 0, -Math.sin(CAM_AZ)); // camera right
  const sunH = new THREE.Vector3().addScaledVector(side, -0.85).addScaledVector(new THREE.Vector3(camDir.x, 0, camDir.z).normalize(), 0.5).normalize();
  const sunDir: V3 = [sunH.x, 0.7, sunH.z];
  const heart = new THREE.Vector3(camDir.x, 0, camDir.z).normalize();
  const detailA = TH_CAM + 0.55;
  const [dsx, dsz] = xz(SHED_RHO - 2.6, detailA);
  const [dtx, dtz] = xz(SHED_RHO - 0.6, detailA - 0.06);

  return {
    root,
    env: {
      skyTop: '#4f93cf',
      skyHorizon: '#f5e6cf',
      skyBottom: '#ddd5c8',
      skyCurve: 0.55,
      fog: '#e8e2d6',
      fogNear: 95,
      fogFar: 280,
      sunDir,
      sunColor: '#fff0da',
      sunIntensity: 2.8,
      sunDisc: 0.6,
      sunGlow: 0.9,
      hemiSky: '#e3ecf3',
      hemiGround: '#a88d6c',
      hemiIntensity: 0.62,
      envIntensity: 0.7,
      clouds: 0.25,
      cloudColor: '#ffffff',
      bloomStrength: 0.55,
      bloomThreshold: 0.86,
      bloomRadius: 0.5,
      vignette: 0.3,
      saturation: 1.06,
      contrast: 1.05,
      tiltShift: 0.3,
      shadowRadius: 27,
    },
    camera: {
      position: camPos,
      target,
      fov: 40,
      minDistance: 12,
      maxDistance: 120,
      maxPolar: 1.3,
      autoRotate: 0.22,
      views: [
        { position: [camDir.x * 18, 80, camDir.z * 18], target: [0, 0, 0] },
        { position: [dsx, 1.7, dsz], target: [dtx, 0.7, dtz] },
      ],
    },
    interaction: {
      label: 'Wake All Desires',
      activeLabel: 'One Desire at a Time',
      hint: 'Every desire wakes at once and closes in. Follow the strings down to the wheels.',
      set: (on) => tog.set(on),
      camera: { position: [heart.x * 9.5, 4.2, heart.z * 9.5], target: [-heart.x * 4, 7.5, -heart.z * 4] },
    },
    update,
  };
};

export default build;
