// Post-processing: HDR scene -> bloom -> final grade (tilt-shift, tone mapping,
// colour grade, vignette, grain, ink-dissolve transition).

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const FinalShader = {
  name: 'FinalGrade',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uExposure: { value: 1 },
    uToneMap: { value: 0 },
    uVignette: { value: 0.35 },
    uGrain: { value: 0.035 },
    uSaturation: { value: 1.05 },
    uContrast: { value: 1.04 },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uTilt: { value: 0.45 },
    uFocusY: { value: 0.48 },
    uFade: { value: 0 },
    uFadeColor: { value: new THREE.Color('#0d0b0a') },
    uFadeSeed: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uTime, uExposure, uToneMap, uVignette, uGrain, uSaturation, uContrast, uTilt, uFocusY, uFade, uFadeSeed;
    uniform vec3 uTint, uFadeColor;
    varying vec2 vUv;

    float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*0.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
    float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
      return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x),mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),f.x),f.y);}

    vec3 RRTAndODTFit(vec3 v){vec3 a=v*(v+0.0245786)-0.000090537;vec3 b=v*(0.983729*v+0.4329510)+0.238081;return a/b;}
    vec3 aces(vec3 c){
      const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777));
      const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602));
      c=I*(c/0.6);c=RRTAndODTFit(c);c=O*c;return clamp(c,0.0,1.0);}
    vec3 neutral(vec3 color){
      const float S=0.8-0.04;const float D=0.15;
      float x=min(color.r,min(color.g,color.b));
      float off=x<0.08?x-6.25*x*x:0.04;
      color-=off;
      float peak=max(color.r,max(color.g,color.b));
      if(peak<S)return color;
      float d=1.0-S;
      float np=1.0-d*d/(peak+d-S);
      color*=np/peak;
      float g=1.0-1.0/(D*(peak-np)+1.0);
      return mix(color,vec3(np),g);}
    vec3 toSRGB(vec3 c){c=max(c,0.0);return mix(c*12.92,1.055*pow(c,vec3(1.0/2.4))-0.055,step(0.0031308,c));}

    void main() {
      vec2 uv = vUv;
      vec3 col = texture2D(tDiffuse, uv).rgb;
      // tilt-shift: blur away from a horizontal focus band
      float band = smoothstep(0.12, 0.5, abs(uv.y - uFocusY));
      float blur = uTilt * band;
      if (blur > 0.01) {
        vec2 px = 1.0 / uResolution;
        float rad = blur * 9.0;
        vec3 acc = col; float wsum = 1.0;
        for (int i = 0; i < 12; i++) {
          float a = float(i) * 2.39996 + 0.5;
          float r = sqrt(float(i) + 0.5) / sqrt(12.0);
          vec2 o = vec2(cos(a), sin(a)) * r * rad * px * uResolution.y / 900.0 * 1.6;
          acc += texture2D(tDiffuse, uv + o * 1.0).rgb;
          wsum += 1.0;
        }
        col = acc / wsum;
      }
      col *= uExposure;
      col = uToneMap < 0.5 ? neutral(col) : aces(col);
      col = clamp(col, 0.0, 1.0);
      col = toSRGB(col);
      // grade (display space)
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSaturation);
      col = (col - 0.5) * uContrast + 0.5;
      col *= uTint;
      // vignette
      vec2 q = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
      float v = smoothstep(1.05, 0.25, length(q));
      col *= mix(1.0, v, uVignette);
      // grain + dither
      float g = hash12(uv * uResolution + fract(uTime * 7.31) * 100.0) - 0.5;
      col += g * uGrain + (hash12(uv * uResolution * 1.37) - 0.5) / 255.0;
      // ink dissolve transition
      if (uFade > 0.0) {
        float n = vnoise(uv * vec2(uResolution.x / uResolution.y, 1.0) * 3.0 + uFadeSeed) * 0.65
                + vnoise(uv * 11.0 + uFadeSeed * 2.0) * 0.35;
        float t = uFade * 1.2 - 0.1;
        float k = smoothstep(n - 0.06, n + 0.06, t);
        float edge = k * (1.0 - k) * 4.0;
        col = mix(col, uFadeColor, k);
        col = mix(col, uFadeColor * 0.4, edge * 0.35);
      }
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
};

export class Post {
  readonly composer: EffectComposer;
  readonly renderPass: RenderPass;
  readonly bloom: UnrealBloomPass;
  readonly final: ShaderPass;

  constructor(private renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, samples = 4) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples });
    this.composer = new EffectComposer(renderer, rt);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.35, 0.6, 0.92);
    this.composer.addPass(this.bloom);
    this.final = new ShaderPass(FinalShader);
    this.composer.addPass(this.final);
  }

  get u() {
    return this.final.uniforms as unknown as typeof FinalShader.uniforms;
  }

  setSize(w: number, h: number, pixelRatio: number) {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);
    this.u.uResolution.value.set(w * pixelRatio, h * pixelRatio);
  }

  render(dt: number) {
    this.composer.render(dt);
  }
}
