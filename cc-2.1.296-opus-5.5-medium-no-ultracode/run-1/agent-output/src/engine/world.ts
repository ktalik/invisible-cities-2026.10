import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Eternal dusk over a lagoon: every city is, in some way, Venice.

export const SKY = {
  zenith: new THREE.Color('#0a0f2a'),
  mid: new THREE.Color('#33305a'),
  horizon: new THREE.Color('#e49a76'),
  glow: new THREE.Color('#ffcf98'),
  fog: new THREE.Color('#3b3150'),
};

export const SUN_DIR = new THREE.Vector3(-0.62, 0.3, -0.72).normalize();
export const MOON_DIR = new THREE.Vector3(0.5, 0.55, 0.67).normalize();

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const skyFrag = /* glsl */ `
uniform vec3 uZenith; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uGlow;
uniform vec3 uSun; uniform vec3 uMoon; uniform float uTime; uniform float uStars;
varying vec3 vDir;
float hash(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.03; a*=0.5;} return s; }
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  float hs = max(h, 0.0);
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.28, hs));
  col = mix(col, uZenith, smoothstep(0.22, 0.85, hs));
  // warm bloom toward the setting sun
  float sd = max(dot(d, uSun), 0.0);
  col += uGlow * pow(sd, 6.0) * 0.55 * (1.0 - smoothstep(0.0, 0.5, hs));
  col += uGlow * pow(sd, 60.0) * 0.6;
  // below horizon: dim
  if (h < 0.0) col = mix(mix(uHorizon * 0.62, uMid * 0.55, 0.35), uMid * 0.4, smoothstep(0.0, -0.25, h));
  // drifting cloud bands
  vec2 uv = d.xz / (h + 0.18);
  float c = fbm(vec3(uv * 1.3 + vec2(uTime * 0.004, 0.0), uTime * 0.002));
  c = smoothstep(0.52, 0.86, c) * smoothstep(0.0, 0.08, h) * (1.0 - smoothstep(0.35, 0.8, h));
  vec3 cloudCol = mix(vec3(0.95, 0.62, 0.55), vec3(0.32, 0.27, 0.45), smoothstep(0.03, 0.4, h));
  cloudCol += uGlow * pow(sd, 3.0) * 0.4;
  col = mix(col, cloudCol, c * 0.55);
  // stars
  vec3 sp = d * 420.0;
  vec3 cell = floor(sp);
  float st = hash(cell);
  float tw = 0.6 + 0.4 * sin(uTime * (1.0 + st * 3.0) + st * 40.0);
  float star = step(0.9975, st) * smoothstep(0.08, 0.45, h) * tw * (1.0 - c);
  vec3 fp = fract(sp) - 0.5;
  star *= smoothstep(0.5, 0.0, length(fp));
  col += vec3(1.0, 0.95, 0.85) * star * 1.4 * uStars;
  // moon
  float md = dot(d, uMoon);
  float moon = smoothstep(0.99955, 0.99975, md);
  float halo = pow(max(md, 0.0), 200.0) * 0.35 + pow(max(md, 0.0), 18.0) * 0.06;
  float maria = fbm(d * 900.0) * 0.25;
  col = mix(col, vec3(1.0, 0.96, 0.86) * (1.05 - maria), moon);
  col += vec3(0.8, 0.82, 1.0) * halo;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export function makeSky() {
  const mat = new THREE.ShaderMaterial({
    vertexShader: skyVert,
    fragmentShader: skyFrag,
    uniforms: {
      uZenith: { value: SKY.zenith },
      uMid: { value: SKY.mid },
      uHorizon: { value: SKY.horizon },
      uGlow: { value: SKY.glow },
      uSun: { value: SUN_DIR },
      uMoon: { value: MOON_DIR },
      uTime: { value: 0 },
      uStars: { value: 1 },
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return mesh;
}

const waterVert = /* glsl */ `
varying vec3 vWorld;
#include <fog_pars_vertex>
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const waterFrag = /* glsl */ `
uniform float uTime; uniform vec3 uSun; uniform vec3 uMoon;
uniform vec3 uHoles[8];
uniform vec3 uZenith; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uGlow;
varying vec3 vWorld;
#include <fog_pars_fragment>
vec2 waveGrad(vec2 p, float t){
  vec2 g = vec2(0.0);
  float a = 0.0;
  float f = 0.06;
  float amp = 0.07;
  for (int i = 0; i < 9; i++) {
    a += 2.39996;
    vec2 d = vec2(cos(a), sin(a));
    float ph = dot(d, p) * f + t * sqrt(f * 9.8) * 0.9 + float(i) * 1.7;
    g += d * amp * cos(ph);
    f *= 1.41;
    amp *= 0.86;
  }
  return g;
}
void main(){
  vec2 p = vWorld.xz;
  for (int i = 0; i < 8; i++) {
    if (uHoles[i].z > 0.0 && length(p - uHoles[i].xy) < uHoles[i].z) discard;
  }
  float dist = length(cameraPosition - vWorld);
  vec2 g = waveGrad(p, uTime) * mix(1.0, 0.25, smoothstep(80.0, 900.0, dist));
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 R = reflect(-V, n);
  float rh = max(R.y, 0.0);
  vec3 sky = mix(uHorizon, uMid, smoothstep(0.0, 0.28, rh));
  sky = mix(sky, uZenith, smoothstep(0.22, 0.85, rh));
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
  vec3 deep = vec3(0.025, 0.04, 0.07);
  vec3 col = mix(deep, sky * 0.85, fres);
  float sunSpec = pow(max(dot(R, uSun), 0.0), 220.0);
  float sunGlit = pow(max(dot(R, uSun), 0.0), 18.0);
  col += uGlow * (sunSpec * 1.4 + sunGlit * 0.07);
  float moonSpec = pow(max(dot(R, uMoon), 0.0), 600.0);
  col += vec3(0.9, 0.92, 1.0) * moonSpec * 2.0;
  // a faint grid of the atlas, like the lines on an old map
  vec2 gg = abs(fract(p / 40.0 - 0.5) - 0.5) * 40.0;
  float gl = 1.0 - smoothstep(0.0, 0.18, min(gg.x, gg.y));
  col += vec3(0.9, 0.7, 0.45) * gl * 0.035 * smoothstep(900.0, 60.0, dist);
  // far water melts into the horizon glow instead of the fog
  float far = smoothstep(260.0, 2600.0, dist);
  col = mix(col, mix(uHorizon * 0.62, uMid * 0.55, 0.35), far * 0.92);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function makeOcean() {
  const mat = new THREE.ShaderMaterial({
    vertexShader: waterVert,
    fragmentShader: waterFrag,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uSun: { value: SUN_DIR },
        uMoon: { value: MOON_DIR },
        uZenith: { value: SKY.zenith },
        uMid: { value: SKY.mid },
        uHorizon: { value: SKY.horizon },
        uGlow: { value: SKY.glow },
        uHoles: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
      },
    ]),
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 1, 1).rotateX(-Math.PI / 2), mat);
  mesh.position.y = -0.05;
  mesh.receiveShadow = false;
  return mesh;
}

const gradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 1.0 },
    uFade: { value: 0 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse; uniform float uTime; uniform float uVignette; uniform float uFade;
varying vec2 vUv;
float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec2 uv = vUv;
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  // a whisper of chromatic separation toward the edges
  float ca = 0.0016 * r2 * 4.0;
  vec3 col;
  col.r = texture2D(tDiffuse, uv + c * ca).r;
  col.g = texture2D(tDiffuse, uv).g;
  col.b = texture2D(tDiffuse, uv - c * ca).b;
  // warm, slightly faded print
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(l) * vec3(1.06, 0.98, 0.86), 0.12);
  col = col * vec3(1.02, 1.0, 0.97) + vec3(0.012, 0.008, 0.02);
  float vig = smoothstep(0.85, 0.18, sqrt(r2) * 1.25);
  col *= mix(1.0, vig, 0.55 * uVignette);
  col += (rand(uv * 1000.0 + uTime) - 0.5) * 0.028;
  col = mix(col, vec3(0.02, 0.018, 0.03), uFade);
  gl_FragColor = vec4(col, 1.0);
}`,
};

export function makeComposer(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.55, 0.55, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(gradeShader);
  composer.addPass(grade);
  return { composer, bloom, grade };
}

export function makeLights(scene: THREE.Scene) {
  const hemi = new THREE.HemisphereLight('#b4bcec', '#5a3e2e', 1.25);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffc996', 3.2);
  sun.position.copy(SUN_DIR).multiplyScalar(200);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.12;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 600;
  scene.add(sun);
  scene.add(sun.target);
  const moon = new THREE.DirectionalLight('#8fa4ff', 0.55);
  moon.position.copy(MOON_DIR).multiplyScalar(200);
  scene.add(moon);
  return { hemi, sun, moon };
}

export function updateShadowFrustum(sun: THREE.DirectionalLight, target: THREE.Vector3, size: number) {
  sun.target.position.copy(target);
  sun.position.copy(target).addScaledVector(SUN_DIR, 260);
  const cam = sun.shadow.camera;
  if (Math.abs(cam.right - size) > 0.5) {
    cam.left = -size;
    cam.right = size;
    cam.top = size;
    cam.bottom = -size;
    cam.updateProjectionMatrix();
  }
}

/** Environment map baked from the dusk sky so metal and water reflect it. */
export function makeEnvironment(renderer: THREE.WebGLRenderer) {
  const envScene = new THREE.Scene();
  const sky = makeSky();
  (sky.material as THREE.ShaderMaterial).uniforms.uStars.value = 0;
  sky.scale.setScalar(0.01);
  envScene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(envScene, 0.02);
  pmrem.dispose();
  return rt.texture;
}
