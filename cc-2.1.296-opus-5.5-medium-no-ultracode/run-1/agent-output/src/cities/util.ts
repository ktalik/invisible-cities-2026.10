import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { B, type Col } from '../engine/kit';

/**
 * Points whose brightness is recomputed every frame.
 * intensity(i, t, base) returns a multiplier for point i.
 */
export function animatedPoints(
  b: B,
  positions: THREE.Vector3[],
  color: (i: number) => Col,
  size: number,
  intensity?: (i: number, t: number, base: THREE.Color) => number,
): B {
  const s = b.sub();
  s.pointSize(size);
  const bases = positions.map((_, i) => new THREE.Color(color(i)));
  positions.forEach((p, i) => s.point(p.x, p.y, p.z, bases[i]));
  if (intensity) {
    s.on((t) => {
      const attr = s.points?.geometry.attributes.color as THREE.BufferAttribute | undefined;
      if (!attr) return;
      for (let i = 0; i < bases.length; i++) {
        const k = intensity(i, t, bases[i]);
        attr.setXYZ(i, bases[i].r * k, bases[i].g * k, bases[i].b * k);
      }
      attr.needsUpdate = true;
    });
  }
  return s;
}

let figureGeo: THREE.BufferGeometry | null = null;
function getFigureGeo() {
  if (figureGeo) return figureGeo;
  const body = new THREE.CylinderGeometry(0.054, 0.12, 0.55, 6).translate(0, 0.275, 0);
  const head = new THREE.SphereGeometry(0.1, 6, 4).translate(0, 0.66, 0);
  body.deleteAttribute('uv');
  head.deleteAttribute('uv');
  figureGeo = mergeGeometries([body.toNonIndexed(), head.toNonIndexed()])!;
  return figureGeo;
}

export interface Crowd {
  mesh: THREE.InstancedMesh;
  set(i: number, x: number, y: number, z: number, s?: number, ry?: number, sy?: number): void;
  commit(): void;
}

/** An instanced crowd of little people that can be moved every frame. */
export function crowd(b: B, n: number, color: (i: number) => Col, opts: { kind?: 'solid' | 'ghost' | 'glow'; opacity?: number; geo?: THREE.BufferGeometry } = {}): Crowd {
  let mat: THREE.Material;
  if (opts.kind === 'ghost')
    mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: opts.opacity ?? 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  else if (opts.kind === 'glow') mat = new THREE.MeshBasicMaterial({ toneMapped: false });
  else mat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
  const mesh = new THREE.InstancedMesh(opts.geo ?? getFigureGeo(), mat, n);
  mesh.castShadow = opts.kind !== 'ghost' && opts.kind !== 'glow';
  mesh.frustumCulled = false;
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    c.set(color(i));
    if (opts.kind === 'glow') c.multiplyScalar(1.6);
    mesh.setColorAt(i, c);
  }
  b.group.add(mesh);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < n; i++) mesh.setMatrixAt(i, hide);
  return {
    mesh,
    set(i, x, y, z, s = 1, ry = 0, sy?: number) {
      q.setFromAxisAngle(up, ry);
      p.set(x, y, z);
      sc.set(s, sy ?? s, s);
      m.compose(p, q, sc);
      mesh.setMatrixAt(i, m);
    },
    commit() {
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A faded sepia postcard of a provincial town that no longer exists. */
export function postcardTexture(k: number, rng: () => number) {
  return canvasTexture(384, 256, (g, w, h) => {
    g.fillStyle = '#f3e9d2';
    g.fillRect(0, 0, w, h);
    const ix = 16;
    const iy = 16;
    const iw = w - 32;
    const ih = h - 48;
    const sky = g.createLinearGradient(0, iy, 0, iy + ih);
    sky.addColorStop(0, '#d8c09a');
    sky.addColorStop(1, '#efdcb8');
    g.fillStyle = sky;
    g.fillRect(ix, iy, iw, ih);
    // distant hills
    g.fillStyle = '#c4a67c';
    g.beginPath();
    g.moveTo(ix, iy + ih * 0.55);
    for (let x = 0; x <= iw; x += 8) g.lineTo(ix + x, iy + ih * (0.5 + 0.06 * Math.sin(x * 0.02 + k) + 0.03 * Math.sin(x * 0.07)));
    g.lineTo(ix + iw, iy + ih);
    g.lineTo(ix, iy + ih);
    g.fill();
    // houses and a bell tower
    g.fillStyle = '#8a6a44';
    let x = ix + 6;
    while (x < ix + iw - 20) {
      const bw = 18 + rng() * 26;
      const bh = 20 + rng() * 34;
      const by = iy + ih * 0.78;
      g.fillRect(x, by - bh, bw, bh);
      g.beginPath();
      g.moveTo(x - 3, by - bh);
      g.lineTo(x + bw / 2, by - bh - 10 - rng() * 8);
      g.lineTo(x + bw + 3, by - bh);
      g.fill();
      g.fillStyle = '#f0dcb4';
      for (let wy = by - bh + 6; wy < by - 6; wy += 10) for (let wx = x + 4; wx < x + bw - 4; wx += 8) if (rng() < 0.4) g.fillRect(wx, wy, 3, 5);
      g.fillStyle = '#8a6a44';
      x += bw + 2 + rng() * 6;
    }
    const tx = ix + iw * (0.3 + 0.4 * rng());
    g.fillStyle = '#6e5234';
    g.fillRect(tx, iy + ih * 0.2, 16, ih * 0.6);
    g.beginPath();
    g.moveTo(tx - 4, iy + ih * 0.2);
    g.lineTo(tx + 8, iy + ih * 0.08);
    g.lineTo(tx + 20, iy + ih * 0.2);
    g.fill();
    // the square, and the hen
    g.fillStyle = '#d9c39c';
    g.fillRect(ix, iy + ih * 0.78, iw, ih * 0.22);
    g.fillStyle = '#5a4026';
    const hx = ix + iw * (0.15 + rng() * 0.7);
    const hy = iy + ih * 0.9;
    g.beginPath();
    g.ellipse(hx, hy, 8, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(hx + 7, hy - 6, 3.5, 0, Math.PI * 2);
    g.fill();
    // vignette and stain
    const v = g.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.7);
    v.addColorStop(0, 'rgba(120,80,40,0)');
    v.addColorStop(1, 'rgba(120,80,40,0.35)');
    g.fillStyle = v;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#7a5a3a';
    g.font = 'italic 16px Georgia, serif';
    const titles = ['Saluti da Maurilia', 'Maurilia, la piazza', 'Maurilia, il campanile', 'Maurilia, veduta', 'Ricordo di Maurilia'];
    g.fillText(titles[k % titles.length], 20, h - 16);
  });
}

/** A faceted boulder or cliff: a displaced icosahedron. */
export function rock(b: B, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: Col, detail = 1, rough = 0.25, kind: 'solid' | 'glass' | 'ghost' = 'solid') {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
  g = g.toNonIndexed();
  const pos = g.attributes.position as THREE.BufferAttribute;
  const seed = b.r(1000);
  const disp = (vx: number, vy: number, vz: number) =>
    1 + rough * (Math.sin(vx * 3.1 + seed) * Math.cos(vy * 2.7 + seed * 0.7) * Math.sin(vz * 3.7 + seed * 1.3) + 0.5 * Math.sin(vx * 7 + vz * 5 + seed));
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const d = disp(vx, vy, vz);
    pos.setXYZ(i, vx * d, vy * d, vz * d);
  }
  g.computeVertexNormals();
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, b.r(6.28), 0)), new THREE.Vector3(sx, sy, sz));
  return b.add(g, m, color, kind);
}

/** A rope ladder or rigid ladder between two points. */
export function ladder(b: B, a: THREE.Vector3, c: THREE.Vector3, w: number, color: Col, rungStep = 0.3) {
  const dir = c.clone().sub(a);
  const len = dir.length();
  const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(w / 2);
  if (side.lengthSq() < 1e-6) side.set(w / 2, 0, 0);
  b.line(a.clone().add(side), c.clone().add(side), color);
  b.line(a.clone().sub(side), c.clone().sub(side), color);
  const n = Math.max(2, Math.floor(len / rungStep));
  for (let i = 1; i < n; i++) {
    const p = a.clone().lerp(c, i / n);
    b.line(p.clone().add(side), p.clone().sub(side), color);
  }
}

/** A sagging plank walkway between two points. */
export function walkway(b: B, a: THREE.Vector3, c: THREE.Vector3, sag: number, w: number, color: Col, ropeColor: Col = '#3a2a1a') {
  const n = Math.max(4, Math.floor(a.distanceTo(c) / 0.35));
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(a.clone().lerp(c, t).add(new THREE.Vector3(0, -Math.sin(t * Math.PI) * sag, 0)));
  }
  const ang = Math.atan2(c.x - a.x, c.z - a.z);
  for (let i = 0; i < n; i++) {
    const p = pts[i].clone().lerp(pts[i + 1], 0.5);
    b.box(p.x, p.y - 0.03, p.z, w, 0.04, 0.26, color, { ry: ang });
  }
  const side = new THREE.Vector3(Math.cos(ang), 0, -Math.sin(ang)).multiplyScalar(w / 2);
  b.polyline(pts.map((p) => p.clone().add(side).add(new THREE.Vector3(0, 0.4, 0))), ropeColor);
  b.polyline(pts.map((p) => p.clone().sub(side).add(new THREE.Vector3(0, 0.4, 0))), ropeColor);
}

const wordCache = new Map<string, THREE.Texture>();
/** A sprite carrying a word in italic serif, for stories and names that float in the air. */
export function wordSprite(text: string, color = '#ffe8c0', height = 0.6): THREE.Sprite {
  let tex = wordCache.get(text + color);
  if (!tex) {
    const font = 'italic 500 64px "Cormorant Garamond", Georgia, serif';
    const c = document.createElement('canvas');
    const g = c.getContext('2d')!;
    g.font = font;
    const w = Math.ceil(g.measureText(text).width) + 40;
    c.width = w;
    c.height = 96;
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = color;
    g.shadowBlur = 16;
    g.fillStyle = color;
    g.fillText(text, w / 2, 50);
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    wordCache.set(text + color, tex);
  }
  const img = tex.image as HTMLCanvasElement;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, fog: true });
  const s = new THREE.Sprite(mat);
  s.scale.set((height * img.width) / img.height, height, 1);
  return s;
}

/** Dynamic line segments that can be rewritten every frame. */
export function dynamicLines(b: B, maxSegments: number, opacity = 0.8) {
  const pos = new Float32Array(maxSegments * 6);
  const col = new Float32Array(maxSegments * 6);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setDrawRange(0, 0);
  const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false });
  const lines = new THREE.LineSegments(g, mat);
  lines.frustumCulled = false;
  b.group.add(lines);
  let n = 0;
  return {
    lines,
    begin() {
      n = 0;
    },
    seg(ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number, gg: number, bb: number) {
      if (n >= maxSegments) return;
      pos.set([ax, ay, az, bx, by, bz], n * 6);
      col.set([r, gg, bb, r, gg, bb], n * 6);
      n++;
    },
    end() {
      g.setDrawRange(0, n * 2);
      g.attributes.position.needsUpdate = true;
      g.attributes.color.needsUpdate = true;
    },
  };
}
