import * as THREE from 'three';
import { B, getDotTexture, rngFrom } from './kit';

// Things that belong to the lagoon rather than to any city:
// Marco Polo's boat, the pools of light under the cities, the motes drifting over the water.

export function makeBoat() {
  const b = new B(rngFrom(1272));
  // hull
  const hull = new THREE.Shape();
  hull.moveTo(-1.5, 0.35);
  hull.quadraticCurveTo(-1.2, -0.25, 0, -0.32);
  hull.quadraticCurveTo(1.3, -0.25, 1.9, 0.5);
  hull.lineTo(-1.5, 0.35);
  b.extrude(hull, 0.9, new THREE.Matrix4().makeRotationY(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(-0.45, 0.3, 0)), '#5a3a22');
  b.box(0, 0.62, 0, 0.92, 0.05, 2.9, '#8a6a42', { ry: 0 });
  // mast, yard, a lateen sail
  b.cyl(0, 0.6, 0.15, 0.05, 3.0, '#3a2a1a', { seg: 5 });
  const sail = new THREE.Shape();
  sail.moveTo(0, 0);
  sail.lineTo(0, 2.4);
  sail.lineTo(1.9, 0.2);
  sail.closePath();
  b.extrude(sail, 0.02, new THREE.Matrix4().makeRotationY(-Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(0.02, 0.95, -0.9)), '#efe2c4', 'cloth');
  b.box(0, 3.55, 0.15, 0.25, 0.14, 0.02, '#a03030', { kind: 'cloth' });
  // a lantern at the stern, and a passenger
  b.sphere(0, 1.0, -1.45, 0.12, '#ffcf7a', { kind: 'glow', i: 2.4, seg: 8 });
  b.figure(0, 0.65, -0.9, 1.2, '#6e2430');
  b.finalize();
  b.group.scale.setScalar(0.9);
  const root = new THREE.Group();
  root.add(b.group);
  return root;
}

let poolTex: THREE.Texture | null = null;
function poolTexture() {
  if (poolTex) return poolTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 20, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,220,170,0.0)');
  grd.addColorStop(0.36, 'rgba(255,210,150,0.55)');
  grd.addColorStop(0.5, 'rgba(255,190,130,0.28)');
  grd.addColorStop(1, 'rgba(255,170,120,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  poolTex = new THREE.CanvasTexture(c);
  poolTex.colorSpace = THREE.SRGBColorSpace;
  return poolTex;
}

/** A soft pool of reflected light on the water around a city. */
export function makeLightPool(color: THREE.ColorRepresentation) {
  const m = new THREE.MeshBasicMaterial({
    map: poolTexture(),
    color: new THREE.Color(color).lerp(new THREE.Color('#ffd8a8'), 0.6),
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    fog: true,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(36, 36).rotateX(-Math.PI / 2), m);
  mesh.position.y = -0.03;
  mesh.renderOrder = 1;
  return mesh;
}

/** Faint motes drifting above the lagoon, which follow the viewer around. */
export function makeMotes() {
  const N = 1400;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  const rng = rngFrom(99);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (rng() - 0.5) * 400;
    pos[i * 3 + 1] = 0.5 + rng() * 26;
    pos[i * 3 + 2] = (rng() - 0.5) * 400;
    seed[i] = rng();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMap: { value: getDotTexture() }, uScale: { value: 400 }, uCenter: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform float uTime; uniform float uScale; uniform vec3 uCenter;
      varying float vA;
      void main(){
        vec3 p = position;
        p.x += sin(uTime * 0.05 + aSeed * 40.0) * 6.0 + uTime * 0.6;
        p.z += cos(uTime * 0.04 + aSeed * 30.0) * 6.0;
        p.y += sin(uTime * 0.3 + aSeed * 20.0) * 0.8;
        // wrap around the viewer
        p.xz = uCenter.xz + mod(p.xz - uCenter.xz + 200.0, 400.0) - 200.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float tw = 0.5 + 0.5 * sin(uTime * (0.6 + aSeed) + aSeed * 50.0);
        vA = tw * smoothstep(400.0, 30.0, -mv.z) * 0.55;
        gl_PointSize = (0.35 + aSeed * 0.4) * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; varying float vA;
      void main(){ float a = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(vec3(1.0, 0.86, 0.62) * 1.4, a * vA); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  return pts;
}
