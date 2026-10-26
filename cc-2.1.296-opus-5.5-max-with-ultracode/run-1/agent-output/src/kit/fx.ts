// Atmospheric effects: particles (dust, fireflies, snow, embers, petals), smoke,
// cloud seas, glow sprites, light beams and line helpers. All animation runs on
// the GPU from the shared time uniform, so there is nothing to update per frame.

import * as THREE from 'three';
import type { ColorLike } from './color';
import { U } from './globals';
import { RNG } from './rng';
import { GLSL_NOISE } from './noise';
import { v3, type V3 } from './geo';

export interface ParticleOpts {
  count: number;
  /** centre of the box region */
  center?: [number, number, number];
  /** half-size of the region in x/z */
  radius: number;
  /** vertical extent of the region */
  y0: number;
  y1: number;
  color: ColorLike;
  /** extra colours to pick from per particle */
  colors?: ColorLike[];
  /** approximate world-space size of a particle */
  size: number;
  opacity?: number;
  /** constant velocity (units/s); particles wrap inside the region */
  velocity?: [number, number, number];
  /** amplitude of a sinusoidal wander (units) */
  swirl?: number;
  /** 0..1 twinkle amount */
  twinkle?: number;
  additive?: boolean;
  /** restrict to a disc of this radius instead of the square region */
  disc?: boolean;
  rng?: RNG;
}

/** GPU-animated particle field (one draw call). */
export function particles(o: ParticleOpts): THREE.Points {
  const rng = o.rng ?? new RNG(31);
  const n = o.count;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  const colors = new Float32Array(n * 3);
  const palette = [o.color, ...(o.colors ?? [])].map((c) => new THREE.Color(c));
  for (let i = 0; i < n; i++) {
    let x: number, z: number;
    if (o.disc) [x, z] = rng.inDisc(o.radius);
    else {
      x = rng.float(-o.radius, o.radius);
      z = rng.float(-o.radius, o.radius);
    }
    pos[i * 3] = x;
    pos[i * 3 + 1] = rng.float(o.y0, o.y1);
    pos[i * 3 + 2] = z;
    seed[i] = rng.next();
    const c = rng.pick(palette);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  const c = o.center ?? [0, 0, 0];
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: U.time,
      uSize: { value: o.size },
      uOpacity: { value: o.opacity ?? 0.8 },
      uVel: { value: new THREE.Vector3(...(o.velocity ?? [0, 0, 0])) },
      uSwirl: { value: o.swirl ?? 0.3 },
      uTwinkle: { value: o.twinkle ?? 0 },
      uR: { value: o.radius },
      uY0: { value: o.y0 },
      uY1: { value: o.y1 },
      uScale: { value: 600 },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      attribute vec3 aColor;
      uniform float uTime, uSize, uSwirl, uTwinkle, uR, uY0, uY1, uScale;
      uniform vec3 uVel;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec3 p = position + uVel * uTime;
        float h = uY1 - uY0;
        p.y = uY0 + mod(p.y - uY0, h);
        p.x = -uR + mod(p.x + uR, 2.0 * uR);
        p.z = -uR + mod(p.z + uR, 2.0 * uR);
        float s = aSeed * 6.2831;
        p.x += sin(uTime * 0.37 + s) * uSwirl;
        p.z += cos(uTime * 0.29 + s * 1.3) * uSwirl;
        p.y += sin(uTime * 0.23 + s * 2.1) * uSwirl * 0.5;
        float yn = (p.y - uY0) / h;
        float edge = smoothstep(0.0, 0.12, yn) * smoothstep(1.0, 0.88, yn);
        edge *= smoothstep(uR, uR * 0.85, abs(p.x)) * smoothstep(uR, uR * 0.85, abs(p.z));
        vAlpha = edge * mix(1.0, 0.5 + 0.5 * sin(uTime * (1.5 + aSeed * 3.0) + s * 3.0), uTwinkle);
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uScale / max(0.001, -mv.z) * (0.75 + 0.5 * aSeed);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        a *= a;
        gl_FragColor = vec4(vColor, a * vAlpha * uOpacity);
      }`,
    transparent: true,
    depthWrite: false,
    blending: o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.position.set(c[0], c[1], c[2]);
  pts.frustumCulled = false;
  pts.name = 'particles';
  pts.onBeforeRender = (renderer) => {
    // keep point sizes consistent across resolutions
    const h = renderer.getRenderTarget()?.height ?? renderer.domElement.height;
    (mat.uniforms.uScale.value as number) = h * 0.9;
  };
  return pts;
}

export interface SmokeOpts {
  /** emitter positions */
  sources: V3[];
  /** particles per source */
  perSource?: number;
  height?: number;
  color?: ColorLike;
  opacity?: number;
  size?: [number, number];
  /** seconds for a puff to rise */
  life?: number;
  wind?: [number, number];
  additive?: boolean;
  rng?: RNG;
}

/** Rising smoke / steam / incense columns (GPU animated). */
export function smoke(o: SmokeOpts): THREE.Points {
  const rng = o.rng ?? new RNG(41);
  const per = o.perSource ?? 24;
  const n = o.sources.length * per;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  let k = 0;
  for (const s of o.sources) {
    const p = v3(s);
    for (let i = 0; i < per; i++, k++) {
      pos[k * 3] = p.x;
      pos[k * 3 + 1] = p.y;
      pos[k * 3 + 2] = p.z;
      seed[k] = (i + rng.next()) / per;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: U.time,
      uColor: { value: new THREE.Color(o.color ?? '#d9d4cc') },
      uOpacity: { value: o.opacity ?? 0.35 },
      uH: { value: o.height ?? 3 },
      uS0: { value: (o.size ?? [0.25, 1.2])[0] },
      uS1: { value: (o.size ?? [0.25, 1.2])[1] },
      uLife: { value: o.life ?? 6 },
      uWind: { value: new THREE.Vector2(...(o.wind ?? [0.4, 0.1])) },
      uScale: { value: 600 },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uH, uS0, uS1, uLife, uScale;
      uniform vec2 uWind;
      varying float vAge;
      void main() {
        float age = fract(uTime / uLife + aSeed);
        vAge = age;
        vec3 p = position;
        p.y += age * uH;
        p.xz += uWind * age * age * uH * 0.5;
        p.x += sin(age * 6.0 + aSeed * 40.0) * 0.15 * age;
        p.z += cos(age * 5.0 + aSeed * 30.0) * 0.15 * age;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = mix(uS0, uS1, age) * uScale / max(0.001, -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAge;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d);
        a *= smoothstep(0.0, 0.1, vAge) * (1.0 - vAge);
        gl_FragColor = vec4(uColor, a * uOpacity);
      }`,
    transparent: true,
    depthWrite: false,
    blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.name = 'smoke';
  pts.onBeforeRender = (renderer) => {
    const h = renderer.getRenderTarget()?.height ?? renderer.domElement.height;
    (mat.uniforms.uScale.value as number) = h * 0.9;
  };
  return pts;
}

export interface CloudSeaOpts {
  y: number;
  radius?: number;
  color?: ColorLike;
  shadow?: ColorLike;
  opacity?: number;
  /** noise scale (default 0.05) */
  scale?: number;
  speed?: number;
  /** coverage 0..1 (default 0.55) */
  coverage?: number;
}

/** A soft sea of clouds / mist below (or above) a floating city. */
export function cloudSea(o: CloudSeaOpts): THREE.Mesh {
  const r = o.radius ?? 220;
  const geo = new THREE.CircleGeometry(r, 64).rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: U.time,
      uColor: { value: new THREE.Color(o.color ?? '#f3ece2') },
      uShadow: { value: new THREE.Color(o.shadow ?? '#a9a2b4') },
      uOpacity: { value: o.opacity ?? 0.9 },
      uScale: { value: o.scale ?? 0.05 },
      uSpeed: { value: o.speed ?? 0.01 },
      uCover: { value: o.coverage ?? 0.55 },
      uR: { value: r },
      uSunDir: U.sunDir,
    },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      #include <fog_pars_vertex>
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uOpacity, uScale, uSpeed, uCover, uR;
      uniform vec3 uColor, uShadow, uSunDir;
      varying vec3 vW;
      #include <fog_pars_fragment>
      ${GLSL_NOISE}
      void main() {
        vec2 p = vW.xz * uScale;
        float t = uTime * uSpeed;
        float n = fbm3(vec3(p + vec2(t, t * 0.6), t * 2.0)) * 0.5 + 0.5;
        float n2 = fbm3(vec3(p * 2.3 - vec2(t * 1.7, 0.0), t * 3.0)) * 0.5 + 0.5;
        float d = smoothstep(1.0 - uCover - 0.2, 1.0 - uCover + 0.25, n * 0.75 + n2 * 0.25);
        float lit = clamp(0.55 + (n2 - 0.5) * 1.2 + uSunDir.y * 0.2, 0.0, 1.0);
        vec3 c = mix(uShadow, uColor, lit);
        float edge = smoothstep(uR, uR * 0.55, length(vW.xz));
        gl_FragColor = vec4(c, d * edge * uOpacity);
        #include <fog_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.y = o.y;
  m.renderOrder = -1;
  m.name = 'cloudSea';
  return m;
}

let glowTex: THREE.Texture | null = null;
/** Shared radial-gradient texture for glow sprites. */
export function glowTexture(): THREE.Texture {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.2, 'rgba(255,255,255,0.55)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

/** A soft additive halo sprite (lamps, stars, lanterns, magic). */
export function glowSprite(color: ColorLike, size = 1, opacity = 0.9): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: glowTexture(),
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, size);
  s.name = 'glow';
  return s;
}

/** Many glow halos as a single Points object (cheap lamps / lanterns / stars). */
export function glowPoints(positions: V3[], color: ColorLike, size = 0.8, opacity = 0.8, colors?: ColorLike[]): THREE.Points {
  const pos = new Float32Array(positions.length * 3);
  const col = new Float32Array(positions.length * 3);
  const base = new THREE.Color(color);
  const pal = colors?.map((c) => new THREE.Color(c));
  positions.forEach((p, i) => {
    const v = v3(p);
    pos.set([v.x, v.y, v.z], i * 3);
    const c = pal ? pal[i % pal.length] : base;
    col.set([c.r, c.g, c.b], i * 3);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size,
    map: glowTexture(),
    vertexColors: true,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const pts = new THREE.Points(geo, mat);
  pts.name = 'glowPoints';
  return pts;
}

/** A soft cone of light (additive), from `from` pointing to `to`. */
export function beam(from: V3, to: V3, r0: number, r1: number, color: ColorLike, opacity = 0.25): THREE.Mesh {
  const A = v3(from), B = v3(to);
  const len = A.distanceTo(B);
  const geo = new THREE.CylinderGeometry(r0, r1, len, 24, 1, true);
  geo.translate(0, -len / 2, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uLen: { value: len } },
    vertexShader: /* glsl */ `
      varying float vT; varying vec3 vN; varying vec3 vV;
      uniform float uLen;
      void main() {
        vT = -position.y / uLen;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity;
      varying float vT; varying vec3 vN; varying vec3 vV;
      void main() {
        float rim = pow(abs(dot(vN, vV)), 1.5);
        float a = (1.0 - vT) * (1.0 - vT) * rim * uOpacity;
        gl_FragColor = vec4(uColor, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(A);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), B.clone().sub(A).normalize());
  m.name = 'beam';
  return m;
}

/** 1px line segments from pairs of points (threads, strings, constellations). */
export function lines(pairs: [V3, V3][], color: ColorLike, opacity = 1, vertexColors?: ColorLike[]): THREE.LineSegments {
  const pos = new Float32Array(pairs.length * 6);
  pairs.forEach(([a, b], i) => {
    const A = v3(a), B = v3(b);
    pos.set([A.x, A.y, A.z, B.x, B.y, B.z], i * 6);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  let mat: THREE.LineBasicMaterial;
  if (vertexColors) {
    const col = new Float32Array(pairs.length * 6);
    pairs.forEach((_, i) => {
      const c = new THREE.Color(vertexColors[i % vertexColors.length]);
      col.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    });
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: opacity < 1, opacity });
  } else {
    mat = new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: opacity < 1, opacity });
  }
  const ls = new THREE.LineSegments(geo, mat);
  ls.name = 'lines';
  return ls;
}

/** A 1px polyline through points. */
export function polyline(points: V3[], color: ColorLike, opacity = 1): THREE.Line {
  const geo = new THREE.BufferGeometry().setFromPoints(points.map(v3));
  const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: opacity < 1, opacity });
  const l = new THREE.Line(geo, mat);
  l.name = 'polyline';
  return l;
}
