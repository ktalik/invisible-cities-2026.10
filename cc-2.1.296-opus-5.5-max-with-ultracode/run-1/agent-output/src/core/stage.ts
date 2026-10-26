// The stage: one renderer, one scene, one camera. It shows one "world" at a time
// (a city or the atlas), applies its environment (sky, fog, light, IBL, grade),
// drives its animation and handles camera controls and transitions.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { U } from '../kit/globals';
import { easeInOut } from '../kit/anim';
import { Post } from './post';
import { applySkyUniforms, createSkyMaterial } from './sky';
import type { CameraSpec, CameraView, EnvSpec } from './types';

export interface World {
  root: THREE.Object3D;
  env: EnvSpec;
  camera: CameraSpec;
  update?(t: number, dt: number): void;
  /** pointer hover / click (ray in world space). Return true if handled (cursor: pointer). */
  pointer?(ray: THREE.Raycaster, kind: 'move' | 'click', ndc: THREE.Vector2): boolean;
  /** keep alive when replaced (the atlas): the stage only detaches it */
  keep?: boolean;
  dispose(): void;
}

export interface StageOpts {
  canvas: HTMLCanvasElement;
  shot?: boolean;
  quality: 'low' | 'high';
}

const TONE: Record<string, number> = { neutral: 0, aces: 1 };

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 4000);
  readonly controls: OrbitControls;
  readonly post: Post;
  readonly sun = new THREE.DirectionalLight('#ffffff', 2.5);
  readonly hemi = new THREE.HemisphereLight('#ffffff', '#444444', 0.5);
  private sky: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private envScene = new THREE.Scene();
  private envSkyMat: THREE.ShaderMaterial;
  private pmrem: THREE.PMREMGenerator;
  private envRT: THREE.WebGLRenderTarget | null = null;

  world: World | null = null;
  worldTime = 0;
  private clock = new THREE.Timer();
  private running = false;
  private flight: { from: CameraView; to: CameraView; t: number; dur: number; done?: () => void } | null = null;
  private lastInteraction = -1e9;
  private autoRotateSpeed = 0.35;
  private targetClamp = 18;
  private homeTarget = new THREE.Vector3();
  private pixelRatio = 1;
  private maxPixelRatio = 1.5;
  private perf = { acc: 0, n: 0, cool: 0 };
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private downAt = new THREE.Vector2();
  private fade = { value: 1, target: 0, speed: 1.6 };
  onFrame: ((dt: number) => void) | null = null;
  timeScale = 1;

  constructor(private o: StageOpts) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: o.canvas,
      antialias: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: !!o.shot,
      alpha: false,
    });
    if (o.shot) this.fade.value = 0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.info.autoReset = false;
    this.renderer.toneMapping = THREE.NoToneMapping; // done in the final pass
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.maxPixelRatio = o.shot ? 1 : Math.min(window.devicePixelRatio || 1, o.quality === 'high' ? 1.75 : 1);
    this.pixelRatio = this.maxPixelRatio;
    this.renderer.setPixelRatio(this.pixelRatio);

    this.camera.position.set(0, 20, 50);

    this.skyMat = createSkyMaterial();
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), this.skyMat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1000;
    this.sky.name = 'sky';
    this.scene.add(this.sky);

    this.envSkyMat = createSkyMaterial();
    const envSky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), this.envSkyMat);
    this.envScene.add(envSky);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);

    this.sun.castShadow = true;
    const sm = o.quality === 'high' ? 2048 : 1024;
    this.sun.shadow.mapSize.set(sm, sm);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 300;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target, this.hemi);

    this.post = new Post(this.renderer, this.scene, this.camera, o.quality === 'high' ? 4 : 0);

    this.controls = new OrbitControls(this.camera, o.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.8;
    this.controls.panSpeed = 0.6;
    this.controls.screenSpacePanning = false;
    this.controls.addEventListener('start', () => {
      this.lastInteraction = this.clock.getElapsed();
      this.flight = null;
    });

    this.resize();
    if (!o.shot) {
      window.addEventListener('resize', () => this.resize());
      o.canvas.addEventListener('pointermove', (e) => this.onPointer(e, 'move'));
      o.canvas.addEventListener('pointerdown', (e) => this.downAt.set(e.clientX, e.clientY));
      o.canvas.addEventListener('pointerup', (e) => {
        if (this.downAt.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) < 6) this.onPointer(e, 'click');
      });
    }
  }

  resize() {
    const w = this.o.canvas.clientWidth || window.innerWidth;
    const h = this.o.canvas.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h, this.pixelRatio);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Force a size (screenshot harness). */
  setSize(w: number, h: number) {
    this.o.canvas.style.width = w + 'px';
    this.o.canvas.style.height = h + 'px';
    this.resize();
  }

  private onPointer(e: PointerEvent, kind: 'move' | 'click') {
    if (!this.world?.pointer) return;
    const r = this.o.canvas.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.world.pointer(this.raycaster, kind, this.ndc);
    this.o.canvas.style.cursor = hit ? 'pointer' : '';
  }

  /** Apply sky, fog, lights, IBL and grade from an environment spec. */
  applyEnv(env: EnvSpec) {
    applySkyUniforms(this.skyMat, env);
    applySkyUniforms(this.envSkyMat, env);
    const fogColor = new THREE.Color(env.fog ?? env.skyHorizon);
    this.scene.fog = new THREE.Fog(fogColor, env.fogNear, env.fogFar);
    this.scene.background = fogColor;
    const sd = new THREE.Vector3(...env.sunDir).normalize();
    U.sunDir.value.copy(sd);
    U.sunColor.value.set(env.sunColor);
    this.sun.color.set(env.sunColor);
    this.sun.intensity = env.sunIntensity;
    this.sun.position.copy(sd).multiplyScalar(120);
    this.sun.target.position.set(0, 0, 0);
    this.sun.castShadow = env.shadows;
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -env.shadowRadius;
    sc.right = sc.top = env.shadowRadius;
    sc.updateProjectionMatrix();
    this.sun.shadow.bias = env.shadowBias;
    this.sun.shadow.needsUpdate = true;
    this.hemi.color.set(env.hemiSky);
    this.hemi.groundColor.set(env.hemiGround);
    this.hemi.intensity = env.hemiIntensity;
    // environment map from the sky itself
    const prev = this.envRT;
    this.envRT = this.pmrem.fromScene(this.envScene, 0, 0.1, 100);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = env.envIntensity;
    prev?.dispose();
    // post
    const u = this.post.u;
    u.uExposure.value = env.exposure;
    u.uToneMap.value = TONE[(env as EnvSpec & { toneMap?: string }).toneMap ?? 'neutral'] ?? 0;
    u.uVignette.value = env.vignette;
    u.uGrain.value = env.grain;
    u.uSaturation.value = env.saturation;
    u.uContrast.value = env.contrast;
    u.uTint.value.set(env.tint);
    u.uTilt.value = env.tiltShift;
    this.post.bloom.strength = env.bloomStrength;
    this.post.bloom.radius = env.bloomRadius;
    this.post.bloom.threshold = env.bloomThreshold;
  }

  /** Configure camera + controls from a spec. */
  applyCamera(spec: CameraSpec, jump = true) {
    this.camera.fov = spec.fov ?? 40;
    this.camera.updateProjectionMatrix();
    const c = this.controls;
    c.minDistance = spec.minDistance ?? 6;
    c.maxDistance = spec.maxDistance ?? 140;
    c.minPolarAngle = spec.minPolar ?? 0.05;
    c.maxPolarAngle = spec.maxPolar ?? 1.48;
    this.autoRotateSpeed = spec.autoRotate ?? 0.35;
    this.homeTarget.set(...spec.target);
    if (jump) {
      this.camera.position.set(...spec.position);
      c.target.set(...spec.target);
      this.camera.lookAt(c.target);
      c.update();
    }
  }

  /** Smoothly move the camera to a view. */
  flyTo(view: CameraView, dur = 2.2, done?: () => void) {
    this.flight = {
      from: { position: this.camera.position.toArray() as [number, number, number], target: this.controls.target.toArray() as [number, number, number] },
      to: view,
      t: 0,
      dur,
      done,
    };
  }

  /** Swap the displayed world. The previous world is disposed. */
  setWorld(world: World, jumpCamera = true) {
    const old = this.world;
    if (old) {
      this.scene.remove(old.root);
      if (!old.keep && old !== world) old.dispose();
    }
    this.world = world;
    this.scene.add(world.root);
    this.applyEnv(world.env);
    this.applyCamera(world.camera, jumpCamera);
    this.worldTime = 0;
    this.lastInteraction = -1e9;
  }

  /** Ink transition: fade to cover (1) or reveal (0). Resolves when done. */
  fadeTo(target: 0 | 1, speed = 1.6): Promise<void> {
    this.fade.target = target;
    this.fade.speed = speed;
    this.post.u.uFadeSeed.value = Math.random() * 100;
    return new Promise((res) => {
      const check = () => {
        if (Math.abs(this.fade.value - this.fade.target) < 1e-3) res();
        else requestAnimationFrame(check);
      };
      check();
    });
  }

  setFadeColor(c: THREE.ColorRepresentation) {
    this.post.u.uFadeColor.value.set(c);
  }

  /** Advance world animation without rendering (deterministic, for screenshots). */
  simulate(seconds: number, step = 1 / 30) {
    let t = 0;
    while (t < seconds - 1e-6) {
      const dt = Math.min(step, seconds - t);
      t += dt;
      this.worldTime += dt;
      U.time.value = this.worldTime;
      this.world?.update?.(this.worldTime, dt);
    }
  }

  renderOnce() {
    this.sky.position.copy(this.camera.position);
    this.post.u.uTime.value = this.worldTime;
    this.post.u.uFade.value = this.fade.value;
    this.controls.update();
    this.renderer.info.reset();
    this.post.render(1 / 60);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.reset();
    const loop = () => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      this.frame();
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }

  private frame() {
    this.clock.update();
    const rawDt = Math.min(this.clock.getDelta(), 0.1);
    const dt = rawDt * this.timeScale;
    const now = this.clock.getElapsed();
    this.worldTime += dt;
    U.time.value = this.worldTime;
    // fade
    const f = this.fade;
    if (f.value !== f.target) {
      const step = f.speed * rawDt;
      f.value = Math.abs(f.target - f.value) <= step ? f.target : f.value + Math.sign(f.target - f.value) * step;
    }
    // camera flight
    if (this.flight) {
      const fl = this.flight;
      fl.t += rawDt;
      const k = easeInOut(Math.min(1, fl.t / fl.dur));
      this.camera.position.lerpVectors(new THREE.Vector3(...fl.from.position), new THREE.Vector3(...fl.to.position), k);
      this.controls.target.lerpVectors(new THREE.Vector3(...fl.from.target), new THREE.Vector3(...fl.to.target), k);
      if (fl.t >= fl.dur) {
        this.flight = null;
        fl.done?.();
      }
    }
    // idle auto-rotation
    const idle = now - this.lastInteraction > 7;
    this.controls.autoRotate = idle && !this.flight && this.autoRotateSpeed !== 0;
    this.controls.autoRotateSpeed = this.autoRotateSpeed;
    // keep the target near the city
    const t = this.controls.target;
    const off = t.clone().sub(this.homeTarget);
    if (off.length() > this.targetClamp) {
      off.setLength(this.targetClamp);
      t.copy(this.homeTarget).add(off);
    }
    this.world?.update?.(this.worldTime, dt);
    this.onFrame?.(rawDt);
    this.renderOnce();
    this.adapt(rawDt);
  }

  /** Adaptive resolution: keep the frame rate smooth on weaker GPUs. */
  private adapt(dt: number) {
    const p = this.perf;
    p.acc += dt;
    p.n++;
    if (p.acc < 2) return;
    const avg = p.acc / p.n;
    p.acc = 0;
    p.n = 0;
    if (p.cool > 0) {
      p.cool--;
      return;
    }
    let next = this.pixelRatio;
    if (avg > 1 / 42 && this.pixelRatio > 0.6) next = Math.max(0.6, this.pixelRatio - 0.15);
    else if (avg < 1 / 58 && this.pixelRatio < this.maxPixelRatio) next = Math.min(this.maxPixelRatio, this.pixelRatio + 0.1);
    if (next !== this.pixelRatio) {
      this.pixelRatio = next;
      this.resize();
      p.cool = 2;
    }
  }

  get fadeValue() {
    return this.fade.value;
  }

  /** For the journey: mark the user as active (stops auto-rotate for a while). */
  poke() {
    this.lastInteraction = this.clock.getElapsed();
  }

  stats() {
    const info = this.renderer.info;
    return {
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
    };
  }
}
