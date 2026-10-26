// The Atlas of the Great Khan: a lacquered rose window on which every city has its
// medallion. Sectors are the eleven series, rings their five appearances; a golden
// thread follows the order in which Marco Polo tells them. At the centre lies the
// Khan's chessboard of ebony and maple, where every city is reduced to a square.

import * as THREE from 'three';
import * as K from '../kit';
import type { Stage, World } from '../core/stage';
import { resolveEnv } from '../core/sky';
import { disposeObject } from '../core/dispose';
import { CITIES } from '../data/cities';
import { SERIES, SERIES_BY_ID } from '../data/series';
import type { CameraView, CityMeta } from '../core/types';
import { BOARD_R, SLOTS, SLOT_BY_ID, sectorBounds, type Slot } from './layout';
import { drawBoard } from './board';

export interface AtlasApi {
  world: World;
  onHover: ((meta: CityMeta | null) => void) | null;
  onSelect: ((meta: CityMeta) => void) | null;
  onCenter: (() => void) | null;
  /** mark the city the visitor last saw */
  setCurrent(id: string | null): void;
  /** camera view that looks into a medallion (for the dive transition) */
  diveView(id: string): CameraView;
  /** world position of a medallion (for tooltips) */
  medalPosition(id: string): THREE.Vector3;
  /** the thread unrolls from the first city */
  revealThread(seconds?: number): void;
  /** epilogue: the cities sink into embers except those that are not inferno */
  setEpilogue(on: boolean): void;
}

const BASE = import.meta.env.BASE_URL;

function fallbackTexture(meta: CityMeta): THREE.CanvasTexture {
  const s = SERIES_BY_ID[meta.series];
  return K.canvasTexture(256, 256, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h / 2, w * 0.7);
    grd.addColorStop(0, s.color);
    grd.addColorStop(1, '#16110d');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,245,225,0.85)';
    g.font = `italic 500 150px ${K.DISPLAY_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(meta.name[0], w / 2, h / 2 - 10);
    g.font = `italic 500 34px ${K.DISPLAY_FONT}`;
    g.fillText(meta.name, w / 2, h * 0.8);
  });
}

/** The city's thumbnail with its name inscribed on a dark band, like a cameo. */
function cameo(img: HTMLImageElement, meta: CityMeta): THREE.CanvasTexture {
  return K.canvasTexture(512, 512, (g, w, h) => {
    const s = Math.max(w / img.width, h / img.height);
    g.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s);
    const grd = g.createLinearGradient(0, h * 0.62, 0, h);
    grd.addColorStop(0, 'rgba(10,8,6,0)');
    grd.addColorStop(0.45, 'rgba(10,8,6,0.55)');
    grd.addColorStop(1, 'rgba(10,8,6,0.8)');
    g.fillStyle = grd;
    g.fillRect(0, h * 0.62, w, h * 0.38);
    g.fillStyle = 'rgba(248,236,210,0.96)';
    g.font = `italic 500 64px ${K.DISPLAY_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,0,0,0.8)';
    g.shadowBlur = 10;
    g.fillText(meta.name, w / 2, h * 0.8);
  });
}

interface Medal {
  slot: Slot;
  group: THREE.Group;
  picture: THREE.Mesh;
  pictureMat: THREE.MeshBasicMaterial;
  bezelMat: THREE.MeshStandardMaterial;
  lift: number;
  hover: number;
}

export async function createAtlasWorld(stage: Stage, o: { shot?: boolean } = {}): Promise<AtlasApi> {
  const root = new THREE.Group();
  root.name = 'atlas';

  // ---- the board
  const { map, emissive } = drawBoard(o.shot ? 2048 : 2048);
  const topMat = new THREE.MeshStandardMaterial({
    map,
    emissiveMap: emissive,
    emissive: new THREE.Color('#ffd58a'),
    emissiveIntensity: 0.55,
    roughness: 0.32,
    metalness: 0.15,
  });
  const top = new THREE.Mesh(new THREE.CircleGeometry(BOARD_R, 160).rotateX(-Math.PI / 2), topMat);
  top.receiveShadow = true;
  root.add(top);
  const sideMat = new THREE.MeshStandardMaterial({ color: '#120d0a', roughness: 0.45, metalness: 0.2 });
  const side = new THREE.Mesh(new THREE.CylinderGeometry(BOARD_R, BOARD_R * 0.985, 1.6, 160, 1, true).translate(0, -0.8, 0), sideMat);
  root.add(side);
  const under = new THREE.Mesh(new THREE.CircleGeometry(BOARD_R * 0.985, 96).rotateX(Math.PI / 2).translate(0, -1.6, 0), sideMat);
  root.add(under);
  const rimGold = K.M.gold('#cfa654', 0.3);
  const rim = new THREE.Mesh(K.torus(BOARD_R + 0.02, 0.09, 8, 220), rimGold);
  rim.position.y = -0.02;
  root.add(rim);
  const rim2 = new THREE.Mesh(K.torus(BOARD_R * 0.99, 0.06, 6, 220), rimGold);
  rim2.position.y = -1.5;
  root.add(rim2);

  // ---- the chessboard at the centre (Venice, the city never named)
  const chess = new THREE.Group();
  const cb = new K.Batch();
  const sq = 0.5;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const dark = (i + j) % 2 === 0;
      cb.add(K.at(K.box(sq, 0.12, sq), (i - 3.5) * sq, 0, (j - 3.5) * sq), dark ? '#1b120c' : '#d8b886', dark ? 'polished' : 'wood');
    }
  }
  cb.add(K.at(K.box(sq * 8 + 0.3, 0.1, sq * 8 + 0.3), 0, -0.02, 0), '#3a2414', 'wood');
  // a few pieces of the Khan's game
  const piece = (x: number, z: number, h: number, dark: boolean, crown: 'king' | 'queen' | 'rook' | 'knight' | 'pawn') => {
    const col = dark ? '#1a1310' : '#efe2c6';
    const fin = dark ? 'polished' : 'ceramic';
    const px = (x - 3.5) * sq, pz = (z - 3.5) * sq;
    cb.add(K.at(K.lathe([[0.17, 0], [0.17, 0.05], [0.11, 0.09], [0.07, h * 0.6], [0.1, h * 0.68], [0.06, h * 0.75]], 16), px, 0.12, pz), col, fin);
    if (crown === 'king') {
      cb.add(K.at(K.box(0.04, 0.16, 0.04), px, 0.12 + h * 0.75, pz), col, fin);
      cb.add(K.at(K.box(0.12, 0.04, 0.04), px, 0.12 + h * 0.75 + 0.08, pz), col, fin);
    } else if (crown === 'queen') {
      cb.add(K.at(K.sphere(0.07, 10, 8), px, 0.12 + h * 0.8, pz), col, fin);
    } else if (crown === 'rook') {
      cb.add(K.at(K.cyl(0.1, 0.1, 0.08, 10), px, 0.12 + h * 0.72, pz), col, fin);
    } else if (crown === 'knight') {
      cb.add(K.at(K.box(0.08, 0.16, 0.18), px, 0.12 + h * 0.7, pz + 0.03, { rx: -0.4 }), col, fin);
    } else {
      cb.add(K.at(K.sphere(0.06, 10, 8), px, 0.12 + h * 0.78, pz), col, fin);
    }
  };
  piece(4, 0, 0.62, true, 'king');
  piece(3, 1, 0.55, true, 'queen');
  piece(6, 2, 0.42, true, 'knight');
  piece(1, 1, 0.3, true, 'pawn');
  piece(5, 6, 0.6, false, 'king');
  piece(2, 7, 0.42, false, 'rook');
  piece(4, 4, 0.42, false, 'knight');
  piece(6, 5, 0.3, false, 'pawn');
  piece(2, 4, 0.3, false, 'pawn');
  chess.add(cb.build({ name: 'chess' }));
  chess.rotation.y = Math.PI / 4;
  chess.position.y = 0.02;
  root.add(chess);
  const chessHit = new THREE.Mesh(new THREE.CircleGeometry(3.2, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false }));
  chessHit.position.y = 0.3;
  root.add(chessHit);

  // ---- medallions
  const imageLoader = new THREE.ImageLoader();
  const medals: Medal[] = [];
  const hits: THREE.Mesh[] = [];
  const bezelGeo = K.torus(1, 0.075, 10, 64);
  const socketGeo = K.cyl(1.04, 1.08, 0.16, 48);
  const pictureGeo = new THREE.CircleGeometry(0.97, 64).rotateX(-Math.PI / 2);
  const glassGeo = K.dome(0.97, 40, 1, 0.22);
  const glassMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 2.2, depthWrite: false });
  const socketMat = new THREE.MeshStandardMaterial({ color: '#0b0807', roughness: 0.6 });
  for (const slot of SLOTS) {
    const g = new THREE.Group();
    g.position.set(slot.x, 0, slot.z);
    g.scale.setScalar(slot.m);
    const bezelMat = new THREE.MeshStandardMaterial({ color: '#d6ad5c', roughness: 0.28, metalness: 1, emissive: new THREE.Color(SERIES_BY_ID[slot.meta.series].color), emissiveIntensity: 0 });
    const socket = new THREE.Mesh(socketGeo, socketMat);
    const bezel = new THREE.Mesh(bezelGeo, bezelMat);
    bezel.position.y = 0.16;
    bezel.castShadow = true;
    const pictureMat = new THREE.MeshBasicMaterial({ map: fallbackTexture(slot.meta), color: '#ffffff' });
    const picture = new THREE.Mesh(pictureGeo, pictureMat);
    picture.position.y = 0.17;
    picture.rotation.y = 0;
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.y = 0.17;
    g.add(socket, picture, glass, bezel);
    root.add(g);
    const hit = new THREE.Mesh(new THREE.CircleGeometry(1.15, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.3;
    hit.userData.id = slot.meta.id;
    g.add(hit);
    hits.push(hit);
    const medal: Medal = { slot, group: g, picture, pictureMat, bezelMat, lift: 0, hover: 0 };
    medals.push(medal);
    imageLoader.load(
      `${BASE}thumbs/${slot.meta.id}.jpg`,
      (img) => {
        const old = medal.pictureMat.map;
        medal.pictureMat.map = cameo(img, slot.meta);
        medal.pictureMat.needsUpdate = true;
        old?.dispose();
      },
      undefined,
      () => {},
    );
  }
  const medalById = new Map(medals.map((m) => [m.slot.meta.id, m]));

  // ---- the golden thread through the cities in the order of narration
  const ordered = [...CITIES].sort((a, b) => a.order - b.order).map((c) => SLOT_BY_ID[c.id]);
  const pts = ordered.map((s) => new THREE.Vector3(s.x, 0.34, s.z));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  const threadGeo = new THREE.TubeGeometry(curve, 1400, 0.045, 6, false);
  const threadMat = new THREE.ShaderMaterial({
    uniforms: { uTime: K.U.time, uReveal: { value: o.shot ? 1 : 0 }, uColor: { value: new THREE.Color('#ffcf73') }, uHi0: { value: -1 }, uHi1: { value: -1 } },
    vertexShader: /* glsl */ `
      varying float vT;
      void main() { vT = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uReveal, uHi0, uHi1;
      uniform vec3 uColor;
      varying float vT;
      void main() {
        if (vT > uReveal) discard;
        float pulse = 0.0;
        for (int i = 0; i < 3; i++) {
          float p = fract(uTime * 0.018 + float(i) / 3.0);
          pulse += smoothstep(0.035, 0.0, abs(vT - p)) ;
        }
        float hi = step(uHi0, vT) * step(vT, uHi1);
        float head = smoothstep(0.02, 0.0, abs(vT - uReveal)) * step(uReveal, 0.999);
        vec3 c = uColor * (0.55 + 1.8 * pulse + 1.4 * hi + 3.0 * head);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const thread = new THREE.Mesh(threadGeo, threadMat);
  root.add(thread);
  const chapterRange = (chapter: number): [number, number] => {
    const idx = ordered.map((s, i) => (s.meta.chapter === chapter ? i : -1)).filter((i) => i >= 0);
    const n = ordered.length - 1;
    return [Math.max(0, (idx[0] - 0.5) / n), Math.min(1, (idx[idx.length - 1] + 0.5) / n)];
  };

  // ---- sector highlight wedge (shown on hover)
  const wedgeMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const wedge = new THREE.Mesh(new THREE.RingGeometry(3.7, 24.9, 48, 1, 0, (Math.PI * 2) / 11), wedgeMat);
  wedge.rotation.x = -Math.PI / 2;
  wedge.position.y = 0.03;
  root.add(wedge);
  let wedgeTarget = 0;

  // ---- current-city marker
  const markerMat = new THREE.MeshBasicMaterial({ color: '#ffe2a0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const marker = new THREE.Mesh(K.torus(1, 0.03, 6, 64), markerMat);
  root.add(marker);
  let current: string | null = null;

  // ---- dust of gold in the air, and a dim glow over the centre
  root.add(K.particles({ count: 500, radius: 30, y0: 0.5, y1: 16, color: '#ffd896', size: 0.07, opacity: 0.5, swirl: 0.8, twinkle: 0.7, rng: new K.RNG('atlas-dust') }));
  const centreGlow = K.glowSprite('#ffcc80', 9, 0.18);
  centreGlow.position.set(0, 1.2, 0);
  root.add(centreGlow);

  // ---- picking
  let hovered: Medal | null = null;
  let chessHover = false;
  const api: AtlasApi = {
    world: null as unknown as World,
    onHover: null,
    onSelect: null,
    onCenter: null,
    setCurrent(id) {
      current = id;
    },
    diveView(id) {
      const s = SLOT_BY_ID[id];
      return { position: [s.x * 1.02, 2.2 + s.m * 2.2, s.z * 1.02 + s.m * 1.4], target: [s.x, 0, s.z] };
    },
    medalPosition(id) {
      const m = medalById.get(id);
      return m ? m.group.position.clone().setY(0.4 + m.lift) : new THREE.Vector3();
    },
    revealThread(seconds = 7) {
      revealSpeed = 1 / seconds;
      threadMat.uniforms.uReveal.value = 0;
    },
    setEpilogue(on) {
      epilogue = on;
    },
  };
  let revealSpeed = 0;
  let epilogue = false;
  let epi = 0;
  const ember = new THREE.Color('#ff6a3a');
  const white = new THREE.Color('#ffffff');

  const env = resolveEnv({
    skyTop: '#05070f',
    skyHorizon: '#161624',
    skyBottom: '#040406',
    skyCurve: 0.5,
    fog: '#0b0b13',
    fogNear: 70,
    fogFar: 190,
    sunDir: [0.35, 1, 0.55],
    sunColor: '#ffe6bf',
    sunIntensity: 2.3,
    sunDisc: 0,
    sunGlow: 0,
    hemiSky: '#46507a',
    hemiGround: '#1a1410',
    hemiIntensity: 0.35,
    envIntensity: 0.35,
    stars: 1,
    bloomStrength: 0.75,
    bloomThreshold: 0.7,
    bloomRadius: 0.7,
    vignette: 0.55,
    tiltShift: 0.25,
    shadowRadius: 30,
    saturation: 1.05,
    contrast: 1.05,
  });

  const world: World = {
    root,
    env,
    camera: {
      position: [0, 50, 44],
      target: [0, 0, 2.5],
      fov: 42,
      minDistance: 10,
      maxDistance: 95,
      maxPolar: 1.25,
      autoRotate: 0.12,
      views: [
        { position: [0, 72, 6], target: [0, 0, 0] },
        { position: [12, 14, 18], target: [0, 0, 0] },
      ],
    },
    update(t, dt) {
      if (revealSpeed > 0) {
        const u = threadMat.uniforms.uReveal;
        u.value = Math.min(1, (u.value as number) + dt * revealSpeed);
        if (u.value >= 1) revealSpeed = 0;
      }
      epi = K.damp(epi, epilogue ? 1 : 0, 0.8, dt);
      for (const m of medals) {
        const target = m === hovered ? 1 : 0;
        m.hover = K.damp(m.hover, target, 10, dt);
        const spared = m.slot.meta.series === 'hidden';
        const glowUp = spared ? epi * (0.6 + 0.4 * Math.sin(t * 1.3 + m.slot.ring)) : 0;
        m.lift = m.hover * 0.9 + glowUp * 0.8;
        m.group.position.y = m.lift;
        m.group.scale.setScalar(m.slot.m * (1 + m.hover * 0.12 + glowUp * 0.08));
        m.bezelMat.emissiveIntensity = m.hover * 1.6 + glowUp * 2.2;
        const base = 0.82 + m.hover * 0.35;
        if (spared) m.pictureMat.color.setScalar(base + glowUp * 0.4);
        else m.pictureMat.color.copy(white).lerp(ember, epi * 0.85).multiplyScalar(base * (1 - epi * 0.62));
      }
      wedgeMat.opacity = K.damp(wedgeMat.opacity, wedgeTarget, 8, dt);
      if (current && medalById.has(current)) {
        const m = medalById.get(current)!;
        marker.position.set(m.group.position.x, 0.12, m.group.position.z);
        const pulse = 1.12 + 0.1 * Math.sin(t * 3);
        marker.scale.setScalar(m.slot.m * pulse + 0.35);
        markerMat.opacity = 0.55 + 0.25 * Math.sin(t * 3);
      } else {
        markerMat.opacity = 0;
      }
      chess.rotation.y = Math.PI / 4 + (chessHover ? Math.sin(t * 2) * 0.03 : 0);
    },
    pointer(ray, kind) {
      const hit = ray.intersectObjects([...hits, chessHit], false)[0];
      const id = hit?.object.userData.id as string | undefined;
      const m = id ? medalById.get(id) ?? null : null;
      chessHover = !!hit && hit.object === chessHit;
      if (m !== hovered) {
        hovered = m;
        api.onHover?.(m ? m.slot.meta : null);
        if (m) {
          const s = SERIES_BY_ID[m.slot.meta.series];
          const [a0] = sectorBounds(s.index);
          wedge.rotation.z = -a0 - (Math.PI * 2) / 11;
          wedge.rotation.set(-Math.PI / 2, 0, -a0 - (Math.PI * 2) / 11);
          wedgeMat.color.set(s.color).multiplyScalar(0.12);
          wedgeTarget = 1;
          const [h0, h1] = chapterRange(m.slot.meta.chapter);
          threadMat.uniforms.uHi0.value = h0;
          threadMat.uniforms.uHi1.value = h1;
        } else {
          wedgeTarget = 0;
          threadMat.uniforms.uHi0.value = -1;
          threadMat.uniforms.uHi1.value = -1;
        }
      }
      if (kind === 'click') {
        if (m) api.onSelect?.(m.slot.meta);
        else if (chessHover) api.onCenter?.();
      }
      return !!m || chessHover;
    },
    dispose() {
      disposeObject(root);
      map.dispose();
      emissive.dispose();
    },
  };
  api.world = world;
  void stage;
  void SERIES;
  return api;
}
