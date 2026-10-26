import * as THREE from 'three';
import { CITIES } from '../data/cities';

export type LayoutMode = 'journey' | 'atlas' | 'structure';

export interface Layout {
  positions: THREE.Vector3[]; // index 0 = garden, then cities in reading order
  overview: { pos: THREE.Vector3; target: THREE.Vector3 };
}

function journey(): Layout {
  // An Archimedean spiral outward from the Khan's garden, in reading order.
  const positions: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0)];
  const gap = 38;
  const k = gap / (Math.PI * 2);
  let theta = Math.PI * 0.5 + (44 / k);
  let lastChapter = 1;
  for (const c of CITIES) {
    let r = k * theta;
    if (c.chapter !== lastChapter) {
      theta += 6 / r; // a breath between chapters
      lastChapter = c.chapter;
      r = k * theta;
    }
    positions.push(new THREE.Vector3(Math.cos(theta) * r, 0, Math.sin(theta) * r));
    theta += 33 / r;
  }
  return { positions, overview: { pos: new THREE.Vector3(24, 150, 372), target: new THREE.Vector3(0, 0, -36) } };
}

function atlas(): Layout {
  // Category columns, numbered rows: the book as a catalogue.
  const sx = 34;
  const sz = 34;
  const positions: THREE.Vector3[] = [new THREE.Vector3(0, 0, 3 * sz + 26)];
  for (const c of CITIES) positions.push(new THREE.Vector3((c.cat - 5) * sx, 0, (c.num - 3) * sz - 20 + (c.num - 1) * 0));
  return { positions, overview: { pos: new THREE.Vector3(0, 165, 395), target: new THREE.Vector3(0, 0, -20) } };
}

// Theme against number, turned 45 degrees: each row is then a chapter of the book.
export const STRUCT = { s: 19.5, u0: 8.5, v0: 3 };
export const structPos = (cat: number, num: number) =>
  new THREE.Vector3((cat - num - STRUCT.v0) * STRUCT.s, 0, (cat + num - STRUCT.u0) * STRUCT.s);

function structure(): Layout {
  const positions: THREE.Vector3[] = [structPos(-1.6, 1.6)];
  for (const c of CITIES) positions.push(structPos(c.cat, c.num));
  return { positions, overview: { pos: new THREE.Vector3(-20, 175, 360), target: new THREE.Vector3(0, 0, -22) } };
}

export const LAYOUTS: Record<LayoutMode, Layout> = {
  journey: journey(),
  atlas: atlas(),
  structure: structure(),
};
