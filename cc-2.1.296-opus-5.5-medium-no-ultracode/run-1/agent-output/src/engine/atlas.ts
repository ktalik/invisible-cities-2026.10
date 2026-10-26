import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { B, hashString, rngFrom, type Updater } from './kit';
import { CATEGORIES, CITIES, type City } from '../data/cities';
import { GENERATORS } from '../cities';
import { buildGarden } from '../cities/garden';
import type { Ctx, CityView } from '../cities/types';

export const CITY_RADIUS = 12.5;

export interface CityNode {
  city: City | null; // null = the Khan's garden
  root: THREE.Group;
  content: THREE.Group;
  ring: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  hit: THREE.Mesh;
  label: CSS2DObject;
  labelEl: HTMLDivElement;
  updaters: Updater[];
  height: number;
  focus: { value: number };
  view: CityView;
  below: number;
  target: THREE.Vector3; // layout target
  from: THREE.Vector3;
  lift: number; // highlight lift
  liftTarget: number;
}

const plinthGeo = (() => {
  const pts: THREE.Vector2[] = [];
  const R = CITY_RADIUS;
  pts.push(new THREE.Vector2(0, -0.7));
  pts.push(new THREE.Vector2(R - 0.6, -0.7));
  pts.push(new THREE.Vector2(R, -0.45));
  pts.push(new THREE.Vector2(R + 0.15, -0.15));
  pts.push(new THREE.Vector2(R, -0.08));
  pts.push(new THREE.Vector2(0, -0.08));
  return new THREE.LatheGeometry(pts, 72);
})();

const plinthMat = new THREE.MeshStandardMaterial({ color: '#2a2630', roughness: 0.7, metalness: 0.15 });
const shaftMat = new THREE.MeshStandardMaterial({ color: '#2a2430', roughness: 0.9, side: THREE.BackSide });
const shaftFloorMat = new THREE.MeshStandardMaterial({ color: '#141018', roughness: 1 });
const hitGeo = new THREE.CylinderGeometry(CITY_RADIUS, CITY_RADIUS, 16, 16).translate(0, 8, 0);
const hitMat = new THREE.MeshBasicMaterial({ visible: false });

function makeLabel(city: City | null) {
  const el = document.createElement('div');
  el.className = 'city-label';
  if (city) {
    const cat = CATEGORIES[city.cat];
    el.style.setProperty('--accent', cat.color);
    el.innerHTML = `<span class="n">${city.name}</span><span class="c">${cat.title} ${city.num}</span>`;
    el.dataset.id = city.id;
  } else {
    el.style.setProperty('--accent', '#f3d9a4');
    el.innerHTML = `<span class="n">The Khan's Garden</span><span class="c">where the stories are told</span>`;
    el.dataset.id = 'garden';
  }
  return el;
}

export function buildNode(city: City | null): CityNode {
  const root = new THREE.Group();
  const content = new THREE.Group();
  root.add(content);

  const seed = hashString(city ? city.id : 'garden');
  const b = new B(rngFrom(seed));
  const accent = new THREE.Color(city ? CATEGORIES[city.cat].color : '#f3d9a4');
  const focus = { value: 0 };
  const view: CityView = {};
  let below = 0;
  if (city) {
    const gen = GENERATORS[city.id];
    const ctx: Ctx = { city, accent, focus, view, below: 0 };
    if (gen) gen(b, ctx);
    else b.box(0, 0, 0, 4, 4, 4, '#888');
    below = ctx.below;
  } else {
    buildGarden(b, focus);
  }
  b.finalize();
  content.add(b.group);

  if (below > 0) {
    // a shaft opens in the lagoon: stone walls going down to a dark floor
    const R = CITY_RADIUS;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, below, 64, 1, true).translate(0, -below / 2 - 0.08, 0), shaftMat);
    wall.receiveShadow = true;
    root.add(wall);
    const rim = new THREE.Mesh(new THREE.RingGeometry(R - 0.3, R + 0.15, 72).rotateX(-Math.PI / 2), plinthMat);
    rim.position.y = -0.06;
    root.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 48).rotateX(-Math.PI / 2), shaftFloorMat);
    floor.position.y = -below - 0.08;
    root.add(floor);
  } else {
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.receiveShadow = true;
    root.add(plinth);
  }

  const ringMat = new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0.9 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(CITY_RADIUS + 0.08, 0.05, 4, 128).rotateX(Math.PI / 2), ringMat);
  ring.position.y = -0.12;
  root.add(ring);

  const hit = new THREE.Mesh(hitGeo, hitMat);
  hit.userData.city = city;
  root.add(hit);

  const box = new THREE.Box3().setFromObject(b.group);
  const height = Math.min(Math.max(box.max.y, 4), 40);

  const labelEl = makeLabel(city);
  const label = new CSS2DObject(labelEl);
  label.position.set(0, height + 2.5, 0);
  root.add(label);

  return {
    city,
    root,
    content,
    ring,
    ringMat,
    hit,
    label,
    labelEl,
    updaters: b.allUpdaters(),
    height,
    focus,
    view,
    below,
    target: new THREE.Vector3(),
    from: new THREE.Vector3(),
    lift: 0,
    liftTarget: 0,
  };
}

export function buildAtlas(onProgress?: (i: number, n: number) => void) {
  const nodes: CityNode[] = [];
  nodes.push(buildNode(null));
  for (const c of CITIES) {
    nodes.push(buildNode(c));
    onProgress?.(nodes.length, CITIES.length + 1);
  }
  return nodes;
}

/** Async build that yields to the browser so a loading bar can animate. */
export async function buildAtlasAsync(onProgress: (i: number, n: number, name: string) => void) {
  const nodes: CityNode[] = [];
  const list: (City | null)[] = [null, ...CITIES];
  for (let i = 0; i < list.length; i++) {
    onProgress(i, list.length, list[i]?.name ?? "the Khan's garden");
    await new Promise((r) => setTimeout(r, 0));
    nodes.push(buildNode(list[i]));
  }
  onProgress(list.length, list.length, '');
  return nodes;
}
