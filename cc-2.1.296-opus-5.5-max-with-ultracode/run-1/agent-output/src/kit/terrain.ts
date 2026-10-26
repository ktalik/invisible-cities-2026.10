// Ground and diorama bases: floating islands, plinths, heightfields.

import * as THREE from 'three';
import type { ColorLike } from './color';
import { finish } from './materials';
import { fbm2, noise2, noise3 } from './noise';
import { paintBy } from './geo';

export interface IslandOpts {
  /** radius of the top surface */
  radius: number;
  /** radius of the perfectly flat buildable area (default 0.82 * radius) */
  flat?: number;
  /** depth of the rocky underside below y = 0 (default radius * 0.55) */
  depth?: number;
  /** colours */
  top?: ColorLike;
  edge?: ColorLike;
  cliff?: ColorLike;
  under?: ColorLike;
  /** strata band colour on the cliff */
  strata?: ColorLike;
  /** outline irregularity 0..1 (default 0.12) */
  rough?: number;
  /** gentle hills outside the flat area (default 0.4) */
  hills?: number;
  seg?: number;
  seed?: number;
}

export interface Island {
  mesh: THREE.Mesh;
  /** terrain height at (x, z); 0 in the flat area */
  heightAt(x: number, z: number): number;
  /** outline radius at angle a (radians) */
  rimAt(a: number): number;
}

/**
 * A floating island: flat buildable top at y = 0, rounded rim, cliff with strata,
 * and a rocky underside tapering to a point. One mesh, vertex coloured.
 */
export function island(o: IslandOpts): Island {
  const R = o.radius;
  const flat = o.flat ?? R * 0.82;
  const depth = o.depth ?? R * 0.55;
  const rough = o.rough ?? 0.12;
  const hills = o.hills ?? 0.4;
  const seed = o.seed ?? 3;
  const seg = o.seg ?? 128;
  const top = new THREE.Color(o.top ?? '#9aa36a');
  const edge = new THREE.Color(o.edge ?? '#b59c72');
  const cliff = new THREE.Color(o.cliff ?? '#8d7a62');
  const under = new THREE.Color(o.under ?? '#4f4439');
  const strata = new THREE.Color(o.strata ?? '#a8916f');

  const rimAt = (a: number) => R * (1 + rough * (0.6 * noise2(Math.cos(a) * 1.3 + seed, Math.sin(a) * 1.3) + 0.4 * noise2(Math.cos(a) * 4 + seed, Math.sin(a) * 4)));
  const heightAt = (x: number, z: number) => {
    const d = Math.hypot(x, z);
    if (d <= flat) return 0;
    const a = Math.atan2(z, x);
    const rim = rimAt(a);
    const t = Math.min(1, (d - flat) / Math.max(0.001, rim - flat));
    const bump = hills * (0.5 + 0.5 * fbm2(x * 0.25 + seed, z * 0.25, 3)) * Math.sin(Math.PI * Math.min(1, t * 1.1));
    const fall = -0.35 * Math.pow(t, 3);
    return bump + fall;
  };

  // Profile rings: [radial fraction of rim (or absolute for top), y, kind]
  type Ring = { f: number; y: number; kind: 'top' | 'cliff' | 'under' };
  const rings: Ring[] = [];
  const topRings = 10;
  for (let i = 0; i <= topRings; i++) rings.push({ f: i / topRings, y: NaN, kind: 'top' });
  const cliffYs = [-0.18, -0.45, -0.8, -1.25];
  for (const y of cliffYs) rings.push({ f: 1, y, kind: 'cliff' });
  const underN = 9;
  for (let i = 1; i <= underN; i++) {
    const t = i / underN;
    rings.push({ f: Math.pow(1 - t, 0.9) * 0.97, y: -1.25 - (depth - 1.25) * Math.pow(t, 1.3), kind: 'under' });
  }

  const cols = seg + 1;
  const positions: number[] = [];
  const colors: number[] = [];
  const c = new THREE.Color();
  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const rim = rimAt(a);
      let x: number, y: number, z: number;
      if (ring.kind === 'top') {
        // top: from centre (f = 0) to rim; flat inside `flat`
        const d = ring.f * rim;
        x = Math.cos(a) * d;
        z = Math.sin(a) * d;
        y = heightAt(x, z);
        const t = Math.max(0, (d - flat) / Math.max(0.001, rim - flat));
        c.copy(top).lerp(edge, Math.min(1, t * t * 1.2));
      } else {
        const wob = ring.kind === 'cliff' ? 0.05 : 0.14;
        const n = noise3(Math.cos(a) * 2 + seed, ring.y * 0.5, Math.sin(a) * 2);
        const d = ring.f * rim * (1 + wob * n) * (ring.kind === 'cliff' ? 1 - 0.02 * -ring.y : 1);
        x = Math.cos(a) * d;
        z = Math.sin(a) * d;
        y = ring.y + (ring.kind === 'under' ? 0.6 * noise3(x * 0.4, ring.y * 0.3, z * 0.4) : 0);
        if (ring.kind === 'cliff') {
          const band = 0.5 + 0.5 * Math.sin(y * 9 + noise2(a * 3, 1) * 2);
          c.copy(cliff).lerp(strata, band * 0.5);
        } else {
          const t = (-y - 1.25) / Math.max(0.001, depth - 1.25);
          c.copy(cliff).lerp(under, Math.min(1, t * 1.3));
        }
      }
      positions.push(x, y, z);
      colors.push(c.r, c.g, c.b);
    }
  }
  // tip
  const tipIndex = positions.length / 3;
  positions.push(0, -depth - 0.4, 0);
  colors.push(under.r, under.g, under.b);

  const index: number[] = [];
  for (let r = 0; r < rings.length - 1; r++) {
    for (let j = 0; j < seg; j++) {
      const a = r * cols + j, b = r * cols + j + 1, c2 = (r + 1) * cols + j, d = (r + 1) * cols + j + 1;
      // outward-facing winding (top faces up, sides face out, underside faces down)
      index.push(a, b, c2, b, d, c2);
    }
  }
  const last = (rings.length - 1) * cols;
  for (let j = 0; j < seg; j++) index.push(last + j, last + j + 1, tipIndex);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  // top centre ring is degenerate; force up normals on the flat area for clean shading
  const nrm = geo.attributes.normal;
  for (let i = 0; i < cols * 4; i++) nrm.setXYZ(i, 0, 1, 0);
  const mesh = new THREE.Mesh(geo, finish('stone'));
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.name = 'island';
  return { mesh, heightAt, rimAt };
}

export interface PlinthOpts {
  radius: number;
  height?: number;
  color?: ColorLike;
  rim?: ColorLike;
  /** gilded rim ring */
  gilded?: boolean;
  seg?: number;
}

/** A museum-like round plinth whose top is at y = 0. */
export function plinth(o: PlinthOpts): THREE.Group {
  const g = new THREE.Group();
  const h = o.height ?? 1.2;
  const seg = o.seg ?? 96;
  const body = new THREE.Mesh(
    paintBy(new THREE.CylinderGeometry(o.radius, o.radius * 0.97, h, seg, 1).translate(0, -h / 2, 0), (_x, y, _z, out) => {
      out.set(o.color ?? '#3a3029').multiplyScalar(0.75 + 0.25 * (1 + y / h));
    }),
    finish('stone'),
  );
  body.receiveShadow = true;
  body.castShadow = true;
  g.add(body);
  if (o.gilded !== false) {
    const rim = new THREE.Mesh(
      paintBy(new THREE.TorusGeometry(o.radius + 0.02, 0.06, 6, seg).rotateX(Math.PI / 2).translate(0, -0.06, 0), (_x, _y, _z, out) => out.set(o.rim ?? '#c9a24c')),
      finish('gold'),
    );
    g.add(rim);
  }
  g.name = 'plinth';
  return g;
}

export interface TerrainOpts {
  width: number;
  depth: number;
  seg?: number;
  height: (x: number, z: number) => number;
  color: (x: number, y: number, z: number, out: THREE.Color) => void;
  finishKind?: Parameters<typeof finish>[0];
}

/** Heightfield plane (vertex coloured) centred on the origin. */
export function terrain(o: TerrainOpts): THREE.Mesh {
  const seg = o.seg ?? 128;
  const geo = new THREE.PlaneGeometry(o.width, o.depth, seg, seg).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, o.height(x, z));
  }
  geo.computeVertexNormals();
  paintBy(geo, o.color);
  geo.deleteAttribute('uv');
  const mesh = new THREE.Mesh(geo, finish(o.finishKind ?? 'matte'));
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

/** A flat ground disc at y = 0 with radial colour falloff into the fog. */
export function groundDisc(radius: number, center: ColorLike, outer: ColorLike, seg = 96): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, seg, 0, Math.PI * 2).rotateX(-Math.PI / 2);
  const a = new THREE.Color(center), b = new THREE.Color(outer);
  paintBy(geo, (x, _y, z, out) => {
    out.copy(a).lerp(b, Math.min(1, Math.hypot(x, z) / radius));
  });
  geo.deleteAttribute('uv');
  const mesh = new THREE.Mesh(geo, finish('matte'));
  mesh.receiveShadow = true;
  mesh.name = 'ground';
  return mesh;
}
