// Procedural sky dome: gradient, sun disc and halo, moon, stars, drifting clouds.
// The same material is rendered into a PMREM environment map so that every
// metal, glass and water surface reflects the city's own sky.

import * as THREE from 'three';
import { U } from '../kit/globals';
import { GLSL_NOISE } from '../kit/noise';
import type { EnvSpec } from './types';

export function createSkyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uBottom: { value: new THREE.Color() },
      uCurve: { value: 0.6 },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color() },
      uSunDisc: { value: 1 },
      uSunGlow: { value: 1 },
      uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
      uMoonColor: { value: new THREE.Color() },
      uMoonSize: { value: 0 },
      uStars: { value: 0 },
      uClouds: { value: 0 },
      uCloudColor: { value: new THREE.Color() },
      uTime: U.time,
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uHorizon, uBottom, uSunDir, uSunColor, uMoonDir, uMoonColor, uCloudColor;
      uniform float uCurve, uSunDisc, uSunGlow, uMoonSize, uStars, uClouds, uTime;
      varying vec3 vDir;
      ${GLSL_NOISE}
      float starLayer(vec3 d, float scale, float density) {
        vec3 p = d * scale;
        vec3 cell = floor(p);
        float r = hash13(cell);
        if (r > density) return 0.0;
        vec3 sp = cell + vec3(hash13(cell + 1.7), hash13(cell + 7.3), hash13(cell + 3.1));
        float dist = length(p - sp);
        float tw = 0.65 + 0.35 * sin(uTime * (1.0 + r * 40.0) + r * 100.0);
        return smoothstep(0.16, 0.0, dist) * tw * (0.4 + 0.6 * hash13(cell + 9.9));
      }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uTop, pow(smoothstep(0.0, 1.0, max(h, 0.0)), uCurve));
        col = mix(col, uBottom, smoothstep(0.0, 0.45, -h));
        vec3 sd3 = normalize(uSunDir);
        float sd = max(dot(d, sd3), 0.0);
        // clouds (above the horizon)
        if (uClouds > 0.0 && h > 0.0) {
          vec2 uv = d.xz / (h + 0.18) * 1.4 + vec2(uTime * 0.004, uTime * 0.002);
          float n = fbm3(vec3(uv, uTime * 0.01)) * 0.5 + 0.5;
          float c = smoothstep(0.62 - uClouds * 0.3, 0.9 - uClouds * 0.2, n) * smoothstep(0.0, 0.18, h);
          vec3 cc = mix(uCloudColor * 0.75, uCloudColor * 1.15 + uSunColor * 0.25 * pow(sd, 4.0), n);
          col = mix(col, cc, c * 0.85);
        }
        // stars
        if (uStars > 0.0 && h > -0.1) {
          float s = starLayer(d, 140.0, 0.035 * uStars) + starLayer(d, 290.0, 0.05 * uStars) * 0.6;
          col += vec3(s) * (0.6 + 1.6 * uStars) * smoothstep(-0.1, 0.25, h);
        }
        // sun halo and disc
        col += uSunColor * uSunGlow * (0.18 * pow(sd, 5.0) + 0.45 * pow(sd, 60.0));
        col += uSunColor * uSunDisc * smoothstep(0.99945, 0.99965, sd) * 5.0;
        // moon
        if (uMoonSize > 0.0) {
          vec3 md3 = normalize(uMoonDir);
          float md = dot(d, md3);
          float rr = 1.0 - uMoonSize * 0.00035;
          float m = smoothstep(rr - 0.00004, rr + 0.00004, md);
          // terminator for a crescent-ish look
          float lit = smoothstep(-0.2, 0.6, dot(normalize(d - md3 + vec3(0.002, 0.001, 0.0)), vec3(0.7, 0.3, 0.0)) + 0.4);
          col = mix(col, uMoonColor * (0.6 + 1.4 * lit), m);
          col += uMoonColor * 0.2 * pow(max(md, 0.0), 300.0) + uMoonColor * 0.08 * pow(max(md, 0.0), 30.0);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });
}

export function applySkyUniforms(mat: THREE.ShaderMaterial, env: EnvSpec) {
  const u = mat.uniforms;
  (u.uTop.value as THREE.Color).set(env.skyTop);
  (u.uHorizon.value as THREE.Color).set(env.skyHorizon);
  (u.uBottom.value as THREE.Color).set(env.skyBottom);
  u.uCurve.value = env.skyCurve;
  (u.uSunDir.value as THREE.Vector3).set(...env.sunDir).normalize();
  (u.uSunColor.value as THREE.Color).set(env.sunColor);
  u.uSunDisc.value = env.sunDisc;
  u.uSunGlow.value = env.sunGlow;
  if (env.moon) {
    (u.uMoonDir.value as THREE.Vector3).set(...env.moon.dir).normalize();
    (u.uMoonColor.value as THREE.Color).set(env.moon.color);
    u.uMoonSize.value = env.moon.size;
  } else {
    u.uMoonSize.value = 0;
  }
  u.uStars.value = env.stars;
  u.uClouds.value = env.clouds;
  (u.uCloudColor.value as THREE.Color).set(env.cloudColor);
}

/** Default environment: a soft late-afternoon dream. */
export const DEFAULT_ENV: EnvSpec = {
  skyTop: '#5d7fa6',
  skyHorizon: '#e9d9c0',
  skyBottom: '#b9aea4',
  skyCurve: 0.6,
  fog: null,
  fogNear: 90,
  fogFar: 320,
  sunDir: [0.55, 0.55, 0.35],
  sunColor: '#fff0d8',
  sunIntensity: 2.6,
  sunDisc: 1,
  sunGlow: 1,
  moon: null,
  hemiSky: '#c8d6e8',
  hemiGround: '#6b5e50',
  hemiIntensity: 0.55,
  envIntensity: 0.55,
  stars: 0,
  clouds: 0,
  cloudColor: '#ffffff',
  exposure: 1,
  bloomStrength: 0.35,
  bloomRadius: 0.6,
  bloomThreshold: 0.92,
  vignette: 0.35,
  grain: 0.035,
  saturation: 1.05,
  contrast: 1.06,
  tint: '#ffffff',
  tiltShift: 0.4,
  shadowRadius: 30,
  shadowBias: -0.0004,
  shadows: true,
};

export function resolveEnv(partial?: Partial<EnvSpec>): EnvSpec {
  const e: EnvSpec = { ...DEFAULT_ENV, ...(partial ?? {}) };
  return e;
}
