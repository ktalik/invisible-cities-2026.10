// Small animation helpers.

export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, x: number) => clamp((x - a) / (b - a));
export const remap = (x: number, a: number, b: number, c: number, d: number) => lerp(c, d, invLerp(a, b, x));
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const smootherstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t: number) => clamp(t) ** 3;
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2;

/** Frame-rate independent exponential approach of `current` towards `target`. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

/** Triangle wave 0..1..0 with the given period. */
export const pingpong = (t: number, period = 1) => {
  const x = (t / period) % 2;
  return x < 1 ? x : 2 - x;
};

/** Smooth 0..1 oscillation with the given period (seconds) and phase (0..1). */
export const wave = (t: number, period = 1, phase = 0) => 0.5 - 0.5 * Math.cos(((t / period) + phase) * Math.PI * 2);

/** Fractional part. */
export const fract = (x: number) => x - Math.floor(x);

/**
 * A toggle helper for city interactions: call set(true/false), then read `value`
 * (0..1, eased) inside update(dt). `speed` is in units per second.
 */
export class Toggle {
  target = 0;
  raw = 0;
  constructor(public speed = 0.6) {}
  set(on: boolean) {
    this.target = on ? 1 : 0;
  }
  update(dt: number) {
    const d = this.target - this.raw;
    const step = this.speed * dt;
    this.raw = Math.abs(d) <= step ? this.target : this.raw + Math.sign(d) * step;
  }
  /** Eased value 0..1. */
  get value() {
    return easeInOut(this.raw);
  }
}
