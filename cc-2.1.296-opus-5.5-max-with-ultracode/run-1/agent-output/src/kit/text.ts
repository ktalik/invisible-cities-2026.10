// In-world lettering: shop signs, inscriptions, labels. Canvas-rendered textures.

import * as THREE from 'three';

export interface TextOpts {
  /** CSS font family (default the display serif) */
  family?: string;
  /** pixel size on the canvas (resolution) */
  px?: number;
  weight?: string | number;
  italic?: boolean;
  color?: string;
  background?: string | null;
  padding?: number;
  /** letter spacing in px */
  tracking?: number;
  /** uppercase small caps look */
  upper?: boolean;
}

export const DISPLAY_FONT = '"Cormorant Garamond", "EB Garamond", Georgia, serif';
export const BODY_FONT = '"EB Garamond", Georgia, serif';

/** Render text into a CanvasTexture. Returns the texture and its aspect ratio (w/h). */
export function textTexture(text: string, o: TextOpts = {}): { texture: THREE.CanvasTexture; aspect: number } {
  const px = o.px ?? 96;
  const pad = o.padding ?? px * 0.25;
  const str = o.upper ? text.toUpperCase() : text;
  const font = `${o.italic ? 'italic ' : ''}${o.weight ?? 500} ${px}px ${o.family ?? DISPLAY_FONT}`;
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  g.font = font;
  const tracking = o.tracking ?? 0;
  const w = Math.ceil(g.measureText(str).width + tracking * str.length + pad * 2);
  const h = Math.ceil(px * 1.35 + pad * 2);
  c.width = Math.max(4, w);
  c.height = Math.max(4, h);
  const g2 = c.getContext('2d')!;
  if (o.background) {
    g2.fillStyle = o.background;
    g2.fillRect(0, 0, c.width, c.height);
  }
  g2.font = font;
  g2.fillStyle = o.color ?? '#f4ead6';
  g2.textBaseline = 'middle';
  if (tracking) {
    let x = pad;
    for (const ch of str) {
      g2.fillText(ch, x, c.height / 2);
      x += g2.measureText(ch).width + tracking;
    }
  } else {
    g2.fillText(str, pad, c.height / 2);
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: c.width / c.height };
}

/** A camera-facing text sprite of the given world height. */
export function textSprite(text: string, height = 1, o: TextOpts = {}): THREE.Sprite {
  const { texture, aspect } = textTexture(text, o);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(height * aspect, height, 1);
  s.name = 'text:' + text;
  return s;
}

/** A flat text plane (double sided) of the given world height, facing +z. */
export function textPlane(text: string, height = 1, o: TextOpts = {}): THREE.Mesh {
  const { texture, aspect } = textTexture(text, o);
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(height * aspect, height), mat);
  m.name = 'text:' + text;
  return m;
}

/** A canvas texture drawn by a callback (for patterns, carpets, maps, signs). */
export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
