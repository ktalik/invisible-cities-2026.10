// The face of the atlas, drawn once into a canvas: black lacquer with gold inlay,
// ring and sector lines, an eleven-pointed star, series names around the rim and
// every city's name engraved beneath its medallion.

import * as THREE from 'three';
import { BOARD_R, RING_R, SECTORS, SLOTS, sectorAngle, sectorBounds, ROMAN } from './layout';
import { SERIES } from '../data/series';
import { RNG } from '../kit/rng';
import { DISPLAY_FONT } from '../kit/text';

const GOLD = '#d4af62';

export function drawBoard(size = 2048): { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture } {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const e = document.createElement('canvas');
  e.width = e.height = size;
  const ge = e.getContext('2d')!;
  const S = size / (2 * BOARD_R); // pixels per world unit
  const P = (x: number, z: number): [number, number] => [size / 2 + x * S, size / 2 + z * S];
  const rng = new RNG('atlas-board');

  // lacquer background with a faint radial sheen and concentric grain
  const bg = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  bg.addColorStop(0, '#1d1814');
  bg.addColorStop(0.6, '#15110e');
  bg.addColorStop(1, '#0d0a08');
  g.fillStyle = bg;
  g.fillRect(0, 0, size, size);
  ge.fillStyle = '#000';
  ge.fillRect(0, 0, size, size);
  g.globalAlpha = 0.05;
  for (let i = 0; i < 260; i++) {
    const r = rng.float(0.5, BOARD_R) * S;
    g.strokeStyle = rng.chance(0.5) ? '#3a2b20' : '#060403';
    g.lineWidth = rng.float(0.5, 2.5);
    g.beginPath();
    const a0 = rng.angle();
    g.arc(size / 2, size / 2, r, a0, a0 + rng.float(0.4, 2.5));
    g.stroke();
  }
  g.globalAlpha = 1;

  const both = (fn: (ctx: CanvasRenderingContext2D, glow: boolean) => void) => {
    fn(g, false);
    fn(ge, true);
  };
  const circle = (r: number, w: number, alpha: number, dash: number[] = []) =>
    both((ctx, glow) => {
      ctx.save();
      ctx.strokeStyle = GOLD;
      ctx.globalAlpha = glow ? alpha * 0.55 : alpha;
      ctx.lineWidth = w;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, r * S, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

  // rings: a fine double line between each ring of medallions
  const between = [3.65, ...RING_R.slice(0, 4).map((r, i) => (r + RING_R[i + 1]) / 2), 24.95];
  between.forEach((r, i) => {
    circle(r, i === between.length - 1 ? 3 : 1.6, 0.75);
    circle(r + 0.12, 0.8, 0.4);
  });
  circle(BOARD_R - 0.35, 4, 0.9);
  circle(BOARD_R - 0.6, 1, 0.5);
  RING_R.forEach((r) => circle(r, 0.8, 0.25, [4, 10]));

  // sector spokes
  both((ctx, glow) => {
    ctx.save();
    ctx.strokeStyle = GOLD;
    ctx.globalAlpha = glow ? 0.35 : 0.6;
    ctx.lineWidth = 1.4;
    for (let k = 0; k < SECTORS; k++) {
      const [a0] = sectorBounds(k);
      const [x0, y0] = P(Math.cos(a0) * 3.65, Math.sin(a0) * 3.65);
      const [x1, y1] = P(Math.cos(a0) * 24.95, Math.sin(a0) * 24.95);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.restore();
  });

  // an eleven-pointed star {11/4} around the chessboard
  both((ctx, glow) => {
    ctx.save();
    ctx.strokeStyle = GOLD;
    ctx.globalAlpha = glow ? 0.4 : 0.7;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i <= SECTORS; i++) {
      const k = (i * 4) % SECTORS;
      const a = sectorAngle(k);
      const [x, y] = P(Math.cos(a) * 3.5, Math.sin(a) * 3.5);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  });

  // scattered stars and constellation lines in the empty spaces of the outer rings
  both((ctx, glow) => {
    ctx.save();
    ctx.fillStyle = GOLD;
    ctx.strokeStyle = GOLD;
    const r2 = new RNG('board-stars');
    const pts: [number, number][] = [];
    for (let i = 0; i < 420; i++) {
      const [x, z] = r2.inRing(4, 24.6);
      const near = SLOTS.some((s) => Math.hypot(s.x - x, s.z - z) < s.m + 0.9);
      if (near) continue;
      pts.push([x, z]);
      const [px, py] = P(x, z);
      ctx.globalAlpha = (glow ? 0.5 : 0.9) * r2.float(0.25, 1);
      const rad = r2.float(0.8, 2.6);
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = glow ? 0.12 : 0.22;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 70; i++) {
      const a = r2.pick(pts), b = r2.pick(pts);
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 3.2) continue;
      const [x0, y0] = P(a[0], a[1]);
      const [x1, y1] = P(b[0], b[1]);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.restore();
  });

  // text helpers
  const arcText = (ctx: CanvasRenderingContext2D, text: string, r: number, center: number, px: number, color: string, alpha: number, italic = false, spacing = 0.18) => {
    ctx.save();
    ctx.font = `${italic ? 'italic ' : ''}500 ${px}px ${DISPLAY_FONT}`;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // lower half of the board: write so that the text reads upright from outside-in
    const flip = Math.sin(center) > 0.05;
    const chars = [...text];
    const widths = chars.map((ch) => ctx.measureText(ch).width + px * spacing);
    const total = widths.reduce((s, w) => s + w, 0);
    let a = center - ((flip ? -1 : 1) * total) / 2 / (r * S);
    for (let i = 0; i < chars.length; i++) {
      const w = widths[i];
      const step = w / (r * S);
      const mid = a + ((flip ? -1 : 1) * step) / 2;
      const [x, y] = P(Math.cos(mid) * r, Math.sin(mid) * r);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(mid + (flip ? -Math.PI / 2 : Math.PI / 2));
      ctx.fillText(chars[i], 0, 0);
      ctx.restore();
      a += (flip ? -1 : 1) * step;
    }
    ctx.restore();
  };

  // series names around the rim, with numerals
  for (const s of SERIES) {
    const a = sectorAngle(s.index);
    both((ctx, glow) => {
      arcText(ctx, s.name.toUpperCase(), 26.15, a, 31, glow ? GOLD : '#e8cf96', glow ? 0.55 : 0.95, false, 0.22);
      arcText(ctx, ROMAN[s.index], 25.35, a, 20, GOLD, glow ? 0.3 : 0.6, false, 0.1);
    });
  }

  // sockets: dark recesses under each medallion with a gold engraved ring
  for (const s of SLOTS) {
    const [x, y] = P(s.x, s.z);
    g.save();
    g.fillStyle = '#070505';
    g.beginPath();
    g.arc(x, y, (s.m + 0.22) * S, 0, Math.PI * 2);
    g.fill();
    g.restore();
    both((ctx, glow) => {
      ctx.save();
      ctx.strokeStyle = GOLD;
      ctx.globalAlpha = glow ? 0.5 : 0.85;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, (s.m + 0.3) * S, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const emissive = new THREE.CanvasTexture(e);
  emissive.colorSpace = THREE.SRGBColorSpace;
  emissive.anisotropy = 8;
  return { map, emissive };
}
