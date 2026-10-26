// Private helpers for Hypatia (src/cities/hypatia.ts): the gilt sign-glyphs and GPU fountain jets.

import * as THREE from 'three';
import * as K from '../kit';

export type P2 = [number, number];

// ---------------------------------------------------------------- the gilt sign-glyphs

const V2 = (x: number, y: number) => new THREE.Vector2(x, y);

function ex(shape: THREE.Shape, depth = 0.1, bevel = 0.025): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 14 });
  g.translate(0, 0, -depth / 2);
  return g;
}
function wire(pts: P2[], r = 0.05, seg = 48): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');
  return new THREE.TubeGeometry(curve, seg, r, 7, false);
}
function bar(x0: number, y0: number, x1: number, y1: number, r: number): THREE.BufferGeometry {
  return K.strut([x0, y0, 0], [x1, y1, 0], r, 8);
}
function knob(x: number, y: number, r: number): THREE.BufferGeometry {
  return K.at(K.sphere(r, 10, 8), x, y, 0);
}
function wavy(y: number, w: number, amp: number, freq: number, ph: number, r: number): THREE.BufferGeometry[] {
  const pts: P2[] = [];
  for (let i = 0; i <= 28; i++) {
    const x = -w + (2 * w * i) / 28;
    pts.push([x, y + amp * Math.sin(x * freq + ph)]);
  }
  return [wire(pts, r, 72), knob(pts[0][0], pts[0][1], r * 1.05), knob(pts[28][0], pts[28][1], r * 1.05)];
}

export interface GlyphGeo {
  gold: THREE.BufferGeometry;
  ink?: THREE.BufferGeometry;
}

/** The bather: a woman waist deep in waves, arms raised to her hair. */
export function glyphBather(): GlyphGeo {
  const parts: THREE.BufferGeometry[] = [];
  const s = new THREE.Shape();
  s.moveTo(-0.07, 0.62);
  s.quadraticCurveTo(-0.13, 0.55, -0.3, 0.5);
  s.quadraticCurveTo(-0.34, 0.41, -0.25, 0.34);
  s.quadraticCurveTo(-0.29, 0.18, -0.2, 0.05);
  s.quadraticCurveTo(-0.15, -0.05, -0.19, -0.12);
  s.quadraticCurveTo(-0.28, -0.25, -0.28, -0.36);
  s.lineTo(0.28, -0.36);
  s.quadraticCurveTo(0.28, -0.25, 0.19, -0.12);
  s.quadraticCurveTo(0.15, -0.05, 0.2, 0.05);
  s.quadraticCurveTo(0.29, 0.18, 0.25, 0.34);
  s.quadraticCurveTo(0.34, 0.41, 0.3, 0.5);
  s.quadraticCurveTo(0.13, 0.55, 0.07, 0.62);
  s.lineTo(-0.07, 0.62);
  parts.push(ex(s, 0.12, 0.03));
  parts.push(K.at(K.sphere(0.16, 18, 12), 0, 0.8, 0, { s: [1, 1.08, 0.7] }));
  parts.push(K.at(K.sphere(0.09, 12, 8), 0.07, 0.99, 0, { s: [1, 1, 0.7] }));
  parts.push(wire([[-0.27, 0.47], [-0.46, 0.66], [-0.5, 0.87], [-0.32, 1.01], [-0.12, 0.97]], 0.05));
  parts.push(wire([[0.27, 0.47], [0.46, 0.68], [0.48, 0.9], [0.29, 1.05], [0.1, 1.0]], 0.05));
  parts.push(knob(-0.12, 0.97, 0.055), knob(0.1, 1.0, 0.055));
  for (let k = 0; k < 3; k++) parts.push(...wavy(-0.3 - k * 0.25, 1.05 - k * 0.14, 0.065, 7.5, k * 1.4, 0.048));
  // droplets falling from the raised hands
  parts.push(K.at(K.sphere(0.035, 8, 6), -0.62, 0.62, 0), K.at(K.sphere(0.03, 8, 6), -0.66, 0.42, 0), K.at(K.sphere(0.035, 8, 6), 0.64, 0.56, 0));
  return { gold: K.merge(parts) };
}

/** Scales of justice in three parts: fixed post, tilting beam, hanging pan. */
export function glyphScales(): { post: THREE.BufferGeometry; beam: THREE.BufferGeometry; pan: THREE.BufferGeometry; pivotY: number } {
  const base = new THREE.Shape([V2(-0.44, -1.12), V2(0.44, -1.12), V2(0.17, -0.97), V2(-0.17, -0.97)]);
  const post = K.merge([
    bar(0, -0.98, 0, 0.7, 0.058),
    ex(base, 0.18, 0.03),
    K.at(K.torus(0.11, 0.035, 6, 16), 0, -0.6, 0, { rx: Math.PI / 2 }),
    K.at(K.sphere(0.1, 12, 8), 0, 0.98, 0),
    K.at(K.cone(0.05, 0.25, 8), 0, 1.03, 0),
    bar(0, 0.7, 0, 0.92, 0.042),
  ]);
  const beam = K.merge([
    bar(-1.02, 0, 1.02, 0, 0.045),
    knob(-1.02, 0, 0.065),
    knob(1.02, 0, 0.065),
    K.at(K.sphere(0.09, 12, 8), 0, 0, 0),
    K.at(K.cone(0.045, 0.3, 6), 0, 0.03, 0),
    K.at(K.torus(0.09, 0.022, 5, 14), 0, 0, 0, { rx: Math.PI / 2 }),
  ]);
  const pan = K.merge([
    K.strut([0, 0, 0], [-0.37, -0.8, 0.0], 0.015, 5),
    K.strut([0, 0, 0], [0.37, -0.8, 0.0], 0.015, 5),
    K.strut([0, 0, 0], [0, -0.8, -0.3], 0.015, 5),
    K.strut([0, 0, 0], [0, -0.8, 0.3], 0.015, 5),
    knob(0, 0, 0.04),
    K.at(K.lathe([[0.001, -0.16], [0.18, -0.145], [0.33, -0.08], [0.41, 0.0], [0.39, 0.012]], 22), 0, -0.8, 0),
  ]);
  return { post, beam, pan, pivotY: 0.72 };
}

/** An open book: ivory gilt pages in a V, porphyry lines of script, ribbon. */
export function glyphBook(): GlyphGeo {
  const gold: THREE.BufferGeometry[] = [];
  const ink: THREE.BufferGeometry[] = [];
  const page = (sx: number, grow = 0) => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.5 - grow);
    s.quadraticCurveTo(sx * 0.5, -0.64 - grow, sx * (1.0 + grow), -0.48 - grow);
    s.lineTo(sx * (1.0 + grow), 0.5 + grow);
    s.quadraticCurveTo(sx * 0.5, 0.64 + grow, 0, 0.45 + grow);
    s.lineTo(0, -0.5 - grow);
    return s;
  };
  for (const sx of [-1, 1]) {
    const rot = sx < 0 ? 0.32 : -0.32;
    const pg = K.paint(ex(page(sx), 0.07, 0.018), '#fff2cf');
    K.at(pg, 0, 0, 0.04, { ry: rot });
    gold.push(pg);
    const cover = K.paint(ex(page(sx, 0.06), 0.05, 0.02), '#ffffff');
    K.at(cover, 0, 0, -0.04, { ry: rot });
    gold.push(cover);
    // lines of an unknown script
    for (let k = 0; k < 6; k++) {
      const y = 0.32 - k * 0.13;
      const pts: P2[] = [];
      const x0 = 0.14, x1 = k === 5 ? 0.55 : 0.86;
      for (let i = 0; i <= 6; i++) {
        const u = x0 + ((x1 - x0) * i) / 6;
        pts.push([sx * u, y + 0.1 * Math.sin((u / 1.0) * Math.PI) * 0.6 + 0.012 * Math.sin(i * 2.7 + k)]);
      }
      const ln = wire(pts, 0.018, 18);
      K.at(ln, 0, 0, 0.09, { ry: rot });
      ink.push(ln);
    }
  }
  gold.push(K.at(K.cyl(0.05, 0.05, 1.04, 10), 0, -0.56, -0.02));
  const ribbon = wire([[0.02, -0.5], [0.05, -0.68], [0.0, -0.84], [0.06, -0.98]], 0.028, 16);
  ink.push(K.at(ribbon, 0, 0, 0.06));
  return { gold: K.merge(gold), ink: K.merge(ink) };
}

/** A sailing ship on two waves. */
export function glyphShip(): GlyphGeo {
  const gold: THREE.BufferGeometry[] = [];
  const ink: THREE.BufferGeometry[] = [];
  const hull = new THREE.Shape();
  hull.moveTo(-1.02, 0.24);
  hull.lineTo(-0.84, 0.24);
  hull.lineTo(-0.8, 0.07);
  hull.lineTo(0.7, 0.07);
  hull.quadraticCurveTo(0.95, 0.1, 1.14, 0.32);
  hull.quadraticCurveTo(0.98, -0.14, 0.7, -0.27);
  hull.lineTo(-0.72, -0.27);
  hull.quadraticCurveTo(-0.98, -0.16, -1.02, 0.24);
  gold.push(ex(hull, 0.18, 0.03));
  for (let i = 0; i < 4; i++) ink.push(K.at(K.cyl(0.04, 0.04, 0.05, 10), -0.45 + i * 0.3, -0.1, 0.11, { rx: Math.PI / 2 }));
  gold.push(bar(0.05, 0.07, 0.05, 1.46, 0.036), bar(0.64, 0.07, 0.64, 1.02, 0.03), bar(-0.6, 0.24, -0.6, 0.98, 0.03));
  gold.push(bar(0.95, 0.24, 1.42, 0.46, 0.024));
  const sail = (cx: number, y0: number, y1: number, w: number) => {
    const s = new THREE.Shape();
    s.moveTo(cx - w, y0);
    s.quadraticCurveTo(cx, y0 - 0.09, cx + w, y0);
    s.quadraticCurveTo(cx + w * 1.08, (y0 + y1) / 2, cx + w * 0.86, y1);
    s.quadraticCurveTo(cx, y1 + 0.04, cx - w * 0.86, y1);
    s.quadraticCurveTo(cx - w * 1.08, (y0 + y1) / 2, cx - w, y0);
    return K.paint(K.at(ex(s, 0.04, 0.015), 0, 0, 0.06), '#fff3d6');
  };
  gold.push(sail(0.05, 0.36, 0.86, 0.44), sail(0.05, 0.95, 1.32, 0.33), sail(0.64, 0.34, 0.9, 0.24));
  for (const [cx, y, w] of [[0.05, 0.88, 0.42], [0.05, 1.34, 0.31], [0.64, 0.92, 0.22]] as const) gold.push(bar(cx - w, y, cx + w, y, 0.022));
  const lateen = new THREE.Shape([V2(-0.6, 0.95), V2(-0.6, 0.32), V2(-0.98, 0.34)]);
  gold.push(K.paint(K.at(ex(lateen, 0.04, 0.015), 0, 0, 0.06), '#fff3d6'));
  const jib = new THREE.Shape([V2(0.7, 0.98), V2(1.36, 0.45), V2(0.72, 0.3)]);
  gold.push(K.paint(K.at(ex(jib, 0.035, 0.012), 0, 0, 0.05), '#fff3d6'));
  const pennant = new THREE.Shape();
  pennant.moveTo(0.05, 1.46);
  pennant.quadraticCurveTo(0.3, 1.5, 0.52, 1.4);
  pennant.quadraticCurveTo(0.3, 1.38, 0.05, 1.36);
  ink.push(ex(pennant, 0.03, 0.01));
  gold.push(...wavy(-0.42, 1.2, 0.06, 6.0, 0.4, 0.045), ...wavy(-0.64, 0.95, 0.055, 6.0, 2.0, 0.042));
  return { gold: K.merge(gold), ink: K.merge(ink) };
}

/** A lyre: sound box, two horned arms, yoke and strings. */
export function glyphLyre(): GlyphGeo {
  const gold: THREE.BufferGeometry[] = [];
  const ink: THREE.BufferGeometry[] = [];
  const sb = new THREE.Shape();
  sb.moveTo(-0.52, -0.6);
  sb.quadraticCurveTo(-0.6, -1.04, 0, -1.06);
  sb.quadraticCurveTo(0.6, -1.04, 0.52, -0.6);
  sb.lineTo(-0.52, -0.6);
  gold.push(ex(sb, 0.18, 0.03));
  ink.push(K.at(K.torus(0.11, 0.022, 6, 20), 0, -0.82, 0.12, { rx: Math.PI / 2 }));
  for (const sx of [-1, 1]) {
    gold.push(wire([[sx * 0.42, -0.64], [sx * 0.6, -0.3], [sx * 0.5, 0.14], [sx * 0.6, 0.56], [sx * 0.82, 0.86], [sx * 0.93, 1.02]], 0.068, 56));
    gold.push(knob(sx * 0.93, 1.02, 0.085));
  }
  gold.push(bar(-0.66, 0.6, 0.66, 0.6, 0.052), knob(-0.69, 0.6, 0.07), knob(0.69, 0.6, 0.07));
  for (let i = 0; i < 5; i++) gold.push(knob(-0.36 + i * 0.18, 0.66, 0.03));
  gold.push(bar(-0.34, -0.66, 0.34, -0.66, 0.04));
  for (let i = 0; i < 5; i++) {
    const x = -0.28 + i * 0.14;
    gold.push(bar(x, -0.66, x * 1.25, 0.6, 0.014));
  }
  return { gold: K.merge(gold), ink: K.merge(ink) };
}

// ---------------------------------------------------------------- fountain jets (GPU)

export function fountainJets(nozzles: THREE.Vector3[], per: number, rng: K.RNG, o: { color?: string; size?: number; h?: number; spread?: number; life?: number } = {}): THREE.Points {
  const n = nozzles.length * per;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  let k = 0;
  for (const p of nozzles) {
    for (let i = 0; i < per; i++, k++) {
      pos[k * 3] = p.x;
      pos[k * 3 + 1] = p.y;
      pos[k * 3 + 2] = p.z;
      seed[k] = rng.next();
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: K.U.time,
      uColor: { value: new THREE.Color(o.color ?? '#eaf6ff') },
      uSize: { value: o.size ?? 0.035 },
      uH: { value: o.h ?? 0.22 },
      uSpread: { value: o.spread ?? 0.22 },
      uLife: { value: o.life ?? 1.2 },
      uScale: { value: 600 },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uSize, uH, uSpread, uLife, uScale;
      varying float vA;
      void main() {
        float age = fract(uTime / uLife + aSeed * 7.13);
        float ang = aSeed * 6.2831 * 13.0;
        float sp = uSpread * (0.65 + 0.35 * fract(aSeed * 31.7));
        vec3 p = position;
        p.x += cos(ang) * sp * age;
        p.z += sin(ang) * sp * age;
        p.y += uH * (4.0 * age - 4.6 * age * age);
        vA = smoothstep(0.0, 0.08, age) * (1.0 - smoothstep(0.75, 1.0, age));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uScale / max(0.001, -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * vA;
        gl_FragColor = vec4(uColor, a * 0.85);
      }`,
    transparent: true,
    depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.name = 'jets';
  pts.onBeforeRender = (renderer) => {
    const h = renderer.getRenderTarget()?.height ?? renderer.domElement.height;
    mat.uniforms.uScale.value = h * 0.9;
  };
  return pts;
}

