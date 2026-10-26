// Generative ambient soundtrack: Web Audio only, no samples, no libraries, no network.
//
//   drone   four slow oscillators on the root and fifth through a breathing lowpass
//   plucks  Karplus-Strong strings (oud, qanun) rendered once into small buffers and
//           played as sparse seeded phrases, in a mode chosen by the city's series
//   wind    looped noise through a wandering bandpass, louder and darker at night
//   pulse   a distant frame drum that only busy cities hear
//   chime   a soft two-strike bell for UI moments
//   space   a generated 3.5 s stereo impulse response, wetter at night
//
// Everything meets in a gentle compressor and a master gain that peaks well below
// 0 dBFS. Melodic choices come from a seeded PRNG, so a city sounds alike on every
// visit; only timing jitter uses Math.random. Mood changes glide every parameter
// with setTargetAtTime, which can be redirected at any moment without clicks.

export interface AmbientMood {
  /** 0..10: the city's thematic series (memory, desire, signs, thin, trading, eyes, names, dead, sky, continuous, hidden) */
  series: number;
  /** 0 = bright day .. 1 = deep night (affects filter darkness, reverb, density) */
  night: number;
  /** 0..1 how busy the city is (pluck density, slight rhythmic pulse) */
  energy: number;
  /** a deterministic seed for melodic variation (e.g. the city's order 1..55; 0 = the atlas) */
  seed: number;
}

const FADE_IN = 3;
const FADE_OUT = 1.5;
/** time constant of mood crossfades: ~95% there after 3.3 s, ~99% after 5 s */
const GLIDE = 1.1;
const TICK_MS = 200;
/** seconds of audio scheduled ahead of the clock */
const LOOKAHEAD = 0.8;
/** cap on one-shot voices sounding at once */
const MAX_VOICES = 24;
/** sample rate of generated buffers that need no top octave (strings, wind noise) */
const LOW_RATE = 22050;

// Levels before the compressor; OUTPUT is the master gain at volume 1.
const DRONE = 0.15;
const PLUCK = 0.22;
const WIND_DAY = 0.07;
const WIND_NIGHT = 0.2;
const DRUM = 0.16;
const BELL = 0.07;
const OUTPUT = 0.5;

/**
 * One series' musical identity. Scales are semitones above the tonic; the .5
 * steps are the quarter tones of the maqamat (rast, bayati).
 */
interface Palette {
  scale: readonly number[];
  /** MIDI note of the drone root, kept within A2..F3 so mood glides stay short */
  tonic: number;
  /** upper drone voice above the tonic: a fifth, or a ninth where the mode has none */
  upper: number;
  /** 0..1 openness of the filters */
  bright: number;
  /** 0..1 how long plucked notes ring: 0 a damped oud, 1 a qanun left to sing */
  ring: number;
  /** pluck rate multiplier */
  density: number;
}

const PALETTES: readonly Palette[] = [
  // memory: D dorian, wistful
  { scale: [0, 2, 3, 5, 7, 9, 10], tonic: 50, upper: 7, bright: 0.55, ring: 0.5, density: 1 },
  // desire: E hijaz, the longing of the caravan road
  { scale: [0, 1, 4, 5, 7, 8, 10], tonic: 52, upper: 7, bright: 0.6, ring: 0.35, density: 1.05 },
  // signs: C rast, neutral third and seventh
  { scale: [0, 2, 3.5, 5, 7, 9, 10.5], tonic: 48, upper: 7, bright: 0.5, ring: 0.45, density: 1 },
  // thin: Bb whole-tone, weightless (no fifth, so the drone holds a ninth)
  { scale: [0, 2, 4, 6, 8, 10], tonic: 46, upper: 14, bright: 0.8, ring: 0.95, density: 0.8 },
  // trading: A bayati, the bazaar
  { scale: [0, 1.5, 3, 5, 7, 8, 10], tonic: 45, upper: 7, bright: 0.62, ring: 0.25, density: 1.25 },
  // eyes: Eb major pentatonic, clear
  { scale: [0, 2, 4, 7, 9], tonic: 51, upper: 7, bright: 0.72, ring: 0.7, density: 0.9 },
  // names: B suspended pentatonic, neither major nor minor
  { scale: [0, 2, 5, 7, 10], tonic: 47, upper: 7, bright: 0.5, ring: 0.55, density: 0.95 },
  // dead: C# phrygian, dark and slow
  { scale: [0, 1, 3, 5, 7, 8, 10], tonic: 49, upper: 7, bright: 0.28, ring: 0.6, density: 0.7 },
  // sky: F lydian, high and open
  { scale: [0, 2, 4, 6, 7, 9, 11], tonic: 53, upper: 7, bright: 0.85, ring: 0.9, density: 0.85 },
  // continuous: A aeolian, the endless sprawl
  { scale: [0, 2, 3, 5, 7, 8, 10], tonic: 45, upper: 7, bright: 0.45, ring: 0.4, density: 1.15 },
  // hidden: D hirajoshi, secretive
  { scale: [0, 2, 3, 7, 8], tonic: 50, upper: 7, bright: 0.38, ring: 0.65, density: 0.8 },
];

/** Probability of a stroke on each eighth of a slow maqsum-like bar: dum on 1 and 5, tek elsewhere. */
const PULSE = [0.95, 0.12, 0, 0.5, 0.7, 0, 0.45, 0.1];
/** Frame-drum membrane modes: [frequency ratio, amplitude]. */
const MEMBRANE: readonly (readonly [number, number])[] = [
  [1, 1],
  [1.59, 0.45],
];
/** Bell partials: [frequency ratio, amplitude, seconds to -60 dB]. 1.002 beats slowly against 1. */
const PARTIALS: readonly (readonly [number, number, number])[] = [
  [1, 1, 4.2],
  [1.002, 0.5, 3.4],
  [2, 0.24, 2.2],
  [2.76, 0.1, 1.2],
  [5.4, 0.04, 0.6],
];

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const mtof = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/** mulberry32: a tiny seeded PRNG returning floats in [0, 1). */
function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mixes integers into one 32-bit seed. */
function hash(...xs: number[]): number {
  let h = 0x811c9dc5;
  for (const x of xs) {
    h = Math.imul(h ^ (x | 0), 0x01000193);
    h ^= h >>> 15;
  }
  return h >>> 0;
}

function sanitize(m: AmbientMood): AmbientMood {
  const unit = (v: number, fallback: number): number => (Number.isFinite(v) ? clamp(v, 0, 1) : fallback);
  return {
    series: Number.isFinite(m.series) ? clamp(Math.round(m.series), 0, PALETTES.length - 1) : 0,
    night: unit(m.night, 0.5),
    energy: unit(m.energy, 0.3),
    seed: Number.isFinite(m.seed) ? Math.round(m.seed) : 0,
  };
}

function sameMood(a: AmbientMood, b: AmbientMood): boolean {
  return (
    a.series === b.series &&
    a.seed === b.seed &&
    Math.abs(a.night - b.night) < 0.004 &&
    Math.abs(a.energy - b.energy) < 0.004
  );
}

/** How much frame drum a mood gets: none below energy 0.3, a little less at night. */
const pulseOf = (m: AmbientMood): number => smoothstep(0.3, 1, m.energy) * (1 - 0.35 * m.night);

/** What a mood sounds like: its series palette, nudged per city by the seed. */
interface Character {
  pal: Palette;
  bright: number;
  ring: number;
  /** tempo of the pulse grid */
  bpm: number;
}

function character(m: AmbientMood): Character {
  const r = prng(hash(m.series, m.seed, 0x7c3));
  const pal = PALETTES[m.series];
  return {
    pal,
    bright: clamp(pal.bright + (r() - 0.5) * 0.16, 0, 1),
    ring: clamp(pal.ring + (r() - 0.5) * 0.3, 0, 1),
    bpm: 62 + 14 * r() + 10 * m.energy,
  };
}

// ---------------------------------------------------------------------------
// Graph helpers

function gain(ctx: BaseAudioContext, value: number, to?: AudioNode): GainNode {
  const g = ctx.createGain();
  g.gain.value = value;
  if (to) g.connect(to);
  return g;
}

/** Note: for lowpass and highpass the Web Audio Q is a resonance in dB (-3 is flat). */
function filter(ctx: BaseAudioContext, type: BiquadFilterType, frequency: number, q: number, to?: AudioNode): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = q;
  if (to) f.connect(to);
  return f;
}

function panner(ctx: BaseAudioContext, pan: number, to: AudioNode): StereoPannerNode {
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  p.connect(to);
  return p;
}

/** A slow sine LFO added onto `target`; returns its depth gain so the depth can glide too. */
function lfo(ctx: BaseAudioContext, hz: number, depth: number, target: AudioParam): GainNode {
  const osc = ctx.createOscillator();
  osc.frequency.value = hz;
  const g = gain(ctx, depth);
  osc.connect(g);
  g.connect(target);
  osc.start();
  return g;
}

/** Glides a parameter toward v with time constant tau (0 jumps, for silent moments). */
function glide(p: AudioParam, v: number, t: number, tau: number): void {
  if (tau > 0) p.setTargetAtTime(v, t, tau);
  else p.setValueAtTime(v, t);
}

// ---------------------------------------------------------------------------
// Generated buffers

/**
 * One plucked string: Karplus-Strong with a first-order allpass for exact tuning,
 * rendered offline. The noise burst is softened and comb-filtered as if plucked
 * near the bridge; `hard` gives a brighter attack and livelier overtones.
 */
function renderString(ctx: BaseAudioContext, midi: number, hard: boolean): AudioBuffer {
  const sr = LOW_RATE;
  const f = mtof(midi);
  const t60 = clamp(3.2 * (220 / f) ** 0.45, 1.2, 4.5);
  const len = Math.ceil(sr * Math.min(2.8, t60 * 0.75));
  const buffer = ctx.createBuffer(1, len, sr);
  const y = buffer.getChannelData(0);
  // loop: y[i] = exc[i] + allpass(loss * ((1 - w) y[i - n] + w y[i - n - 1]))
  // whose delay n + w + frac equals one period
  const period = sr / f;
  // The two-tap lowpass damps harmonic k about k^2 times faster than the fundamental.
  // Let it cause at most a fixed share of the fundamental's decay (less when hard, so
  // overtones last longer), or high notes would die within a fraction of a second.
  const cosw = Math.cos((2 * Math.PI * f) / sr);
  const ww = Math.min(0.25, ((hard ? 0.2 : 0.4) * 6.9) / (t60 * f) / (1 - cosw)); // w (1 - w)
  const w = 0.5 - Math.sqrt(0.25 - ww);
  const n = Math.floor(period - w - 0.1);
  const frac = period - w - n;
  const c = (1 - frac) / (1 + frac);
  // per-period loss for the rest, so the fundamental reaches -60 dB after t60 (below 1: stable)
  const loss = Math.min(0.9999, 0.001 ** (1 / (t60 * f)) / Math.sqrt(1 - 2 * ww * (1 - cosw)));
  const rnd = prng(hash(midi, hard ? 2 : 1));
  const exc = new Float32Array(n);
  const soft = hard ? 0.6 : 0.32;
  let s = 0;
  for (let i = 0; i < n; i++) {
    s += soft * (rnd() * 2 - 1 - s);
    exc[i] = s;
  }
  const pick = Math.max(1, Math.round(n * 0.13));
  for (let i = n - 1; i >= pick; i--) exc[i] -= exc[i - pick];
  let mean = 0;
  for (let i = 0; i < n; i++) mean += exc[i] / n;
  let x1 = 0;
  let y1 = 0;
  for (let i = 0; i < len; i++) {
    const a = i >= n ? y[i - n] : 0;
    const b = i > n ? y[i - n - 1] : 0;
    const v = loss * ((1 - w) * a + w * b);
    y1 = c * v + x1 - c * y1;
    x1 = v;
    y[i] = (i < n ? exc[i] - mean : 0) + y1;
  }
  // even loudness across the register (RMS of the first 0.2 s, peak at most 0.95),
  // a softened first 1.5 ms, and a tail faded to silence
  const early = Math.min(len, Math.round(sr * 0.2));
  let power = 0;
  let peak = 0;
  for (let i = 0; i < len; i++) {
    if (i < early) power += y[i] * y[i];
    peak = Math.max(peak, Math.abs(y[i]));
  }
  const rms = Math.sqrt(power / early);
  const norm = rms > 0 ? Math.min(0.2 / rms, 0.95 / peak) : 0;
  const fadeIn = Math.round(sr * 0.0015);
  const fadeOut = Math.round(sr * 0.04);
  for (let i = 0; i < len; i++) y[i] *= norm * Math.min(1, i / fadeIn, (len - i) / fadeOut);
  return buffer;
}

/** Stereo reverb tail: decaying noise that darkens as it fades (gentle high damping). */
function impulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const ir = ctx.createBuffer(2, len, sr);
  const decay = Math.exp(-6.9 / (0.85 * len)); // -60 dB at 85% of the length
  const bloom = 0.012 * sr; // a soft onset instead of a hard first reflection
  const tail = 0.05 * sr;
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let env = 1;
    let lp = 0;
    let k = 0;
    for (let i = 0; i < len; i++) {
      // one-pole lowpass sliding from 7 kHz to 1.5 kHz over the tail
      if ((i & 63) === 0) k = 1 - Math.exp((-2 * Math.PI * 7000 * (1500 / 7000) ** (i / len)) / sr);
      lp += k * (Math.random() * 2 - 1 - lp);
      d[i] = lp * env * Math.min(1, i / bloom, (len - i) / tail);
      env *= decay;
    }
  }
  return ir;
}

/** Stereo white noise for the wind; at a low rate since it is filtered well below 3 kHz. */
function noise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(LOW_RATE * seconds);
  const b = ctx.createBuffer(2, len, LOW_RATE);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return b;
}

/** String buffers rendered on demand every 3 semitones and transposed by playback rate. */
class Strings {
  private readonly ctx: BaseAudioContext;
  private readonly cache = new Map<number, AudioBuffer>();

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
  }

  get(midi: number, hard: boolean): { buffer: AudioBuffer; rate: number } {
    const base = 3 * Math.round(midi / 3);
    const key = base * 2 + (hard ? 1 : 0);
    let buffer = this.cache.get(key);
    if (!buffer) {
      buffer = renderString(this.ctx, base, hard);
      this.cache.set(key, buffer);
    }
    return { buffer, rate: 2 ** ((midi - base) / 12) };
  }
}

// ---------------------------------------------------------------------------
// Continuous layers

/** A sub, a detuned stereo pair on the root, and a breathing upper voice. */
class Drone {
  private readonly level: GainNode;
  private readonly lp: BiquadFilterNode;
  private readonly sweep: GainNode;
  private readonly sub: OscillatorNode;
  private readonly left: OscillatorNode;
  private readonly right: OscillatorNode;
  private readonly upper: OscillatorNode;

  constructor(ctx: BaseAudioContext, out: AudioNode) {
    this.level = gain(ctx, 0, out);
    this.lp = filter(ctx, 'lowpass', 800, -3, this.level);
    this.lp.frequency.automationRate = 'k-rate'; // slow LFO only: spare per-sample coefficients
    const voice = (type: OscillatorType, amp: number, pan: number, cents: number) => {
      const g = gain(ctx, amp, panner(ctx, pan, this.lp));
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.detune.value = cents;
      osc.connect(g);
      osc.start();
      return { osc, amp: g };
    };
    this.sub = voice('sine', 0.42, 0, 0).osc;
    this.left = voice('triangle', 0.26, -0.55, -4).osc;
    this.right = voice('triangle', 0.26, 0.55, 4).osc;
    const upper = voice('sine', 0.15, 0.2, 2);
    this.upper = upper.osc;
    // slow wander: detunes drift apart and back, the upper voice breathes, the lowpass opens and closes
    lfo(ctx, 0.031, 3, this.sub.detune);
    lfo(ctx, 0.067, 4, this.left.detune);
    lfo(ctx, 0.053, 4, this.right.detune);
    lfo(ctx, 0.043, 3, this.upper.detune);
    lfo(ctx, 0.019, 0.08, upper.amp.gain);
    this.sweep = lfo(ctx, 0.027, 0, this.lp.frequency);
  }

  set(m: AmbientMood, ch: Character, t: number, tau: number): void {
    const f = mtof(ch.pal.tonic);
    glide(this.sub.frequency, f / 2, t, tau);
    glide(this.left.frequency, f, t, tau);
    glide(this.right.frequency, f, t, tau);
    glide(this.upper.frequency, mtof(ch.pal.tonic + ch.pal.upper), t, tau);
    const cutoff = lerp(420, 1500, ch.bright) * lerp(1, 0.5, m.night);
    glide(this.lp.frequency, cutoff, t, tau);
    glide(this.sweep.gain, cutoff * 0.35, t, tau);
    glide(this.level.gain, DRONE * lerp(0.95, 1.1, m.night), t, tau);
  }
}

/** Air: looped stereo noise through a wandering bandpass, swelling in slow gusts. */
class Wind {
  private readonly level: GainNode;
  private readonly band: BiquadFilterNode;
  private readonly lp: BiquadFilterNode;
  private readonly sweepA: GainNode;
  private readonly sweepB: GainNode;

  constructor(ctx: BaseAudioContext, out: AudioNode) {
    this.level = gain(ctx, 0, out);
    const gust = gain(ctx, 0.6, this.level);
    this.lp = filter(ctx, 'lowpass', 2000, -3, gust);
    this.band = filter(ctx, 'bandpass', 500, 0.9, this.lp);
    this.band.frequency.automationRate = 'k-rate';
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx, 6);
    src.loop = true;
    src.connect(this.band);
    src.start();
    this.sweepA = lfo(ctx, 0.023, 0, this.band.frequency);
    this.sweepB = lfo(ctx, 0.061, 0, this.band.frequency);
    lfo(ctx, 0.037, 0.22, gust.gain);
    lfo(ctx, 0.089, 0.12, gust.gain);
  }

  set(m: AmbientMood, ch: Character, t: number, tau: number): void {
    const center = lerp(700, 280, m.night) * lerp(0.85, 1.15, ch.bright);
    glide(this.band.frequency, center, t, tau);
    glide(this.sweepA.gain, center * 0.4, t, tau);
    glide(this.sweepB.gain, center * 0.15, t, tau);
    glide(this.lp.frequency, lerp(2400, 1000, m.night), t, tau);
    glide(this.level.gain, lerp(WIND_DAY, WIND_NIGHT, m.night), t, tau);
  }
}

// ---------------------------------------------------------------------------
// The audio graph

class Engine {
  readonly ctx: AudioContext;
  private readonly fade: GainNode;
  private readonly volume: GainNode;
  private readonly wet: GainNode;
  private readonly tone: BiquadFilterNode;
  private readonly plucks: GainNode;
  private readonly drums: GainNode;
  private readonly bells: GainNode;
  private readonly drone: Drone;
  private readonly wind: Wind;
  private readonly strings: Strings;
  private voices = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    // master: mix -> rumble filter -> gentle compressor -> volume -> start/stop fade
    this.fade = gain(ctx, 0, ctx.destination);
    this.fade.gain.setValueAtTime(0, ctx.currentTime);
    this.volume = gain(ctx, 0, this.fade);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 14;
    comp.ratio.value = 2.5;
    comp.attack.value = 0.03;
    comp.release.value = 0.4;
    comp.connect(this.volume);
    const mix = filter(ctx, 'highpass', 30, -3, comp);
    // reverb: a send cleared of lows, a generated hall, a return that grows at night
    this.wet = gain(ctx, 0, mix);
    const hall = ctx.createConvolver();
    hall.buffer = impulse(ctx, 3.5);
    hall.connect(this.wet);
    const send = filter(ctx, 'highpass', 170, -3, hall);
    const bus = (reverb: number): GainNode => {
      const g = gain(ctx, 1, mix);
      g.connect(gain(ctx, reverb, send));
      return g;
    };
    this.drone = new Drone(ctx, bus(0.3));
    this.wind = new Wind(ctx, bus(0.35));
    this.tone = filter(ctx, 'lowpass', 4000, -3, bus(0.75));
    this.plucks = gain(ctx, 0, this.tone);
    this.drums = gain(ctx, 0, filter(ctx, 'lowpass', 900, -3, bus(0.4)));
    this.bells = gain(ctx, BELL, bus(0.9));
    this.strings = new Strings(ctx);
  }

  /** Glides every mood-dependent parameter; tau 0 jumps (used while silent). */
  setMood(m: AmbientMood, ch: Character, tau: number): void {
    const t = this.ctx.currentTime;
    this.drone.set(m, ch, t, tau);
    this.wind.set(m, ch, t, tau);
    glide(this.wet.gain, lerp(0.5, 0.95, m.night), t, tau);
    glide(this.tone.frequency, lerp(5200, 2300, m.night) * lerp(0.8, 1.15, ch.bright), t, tau);
    glide(this.plucks.gain, PLUCK * lerp(1, 0.8, m.night), t, tau);
    glide(this.drums.gain, DRUM * pulseOf(m), t, tau);
  }

  /** Volume on a perceptual (squared) curve. */
  setVolume(v: number, instant: boolean): void {
    glide(this.volume.gain, OUTPUT * v * v, this.ctx.currentTime, instant ? 0 : 0.08);
  }

  /** Linear fade of the whole output, starting from wherever the previous fade had got to. */
  fadeTo(v: number, seconds: number): void {
    const p = this.fade.gain;
    const t = this.ctx.currentTime;
    const from = p.value;
    // hold atomically where supported, so no render quantum sees a cancelled ramp
    if (typeof p.cancelAndHoldAtTime === 'function') p.cancelAndHoldAtTime(t);
    else p.cancelScheduledValues(t);
    p.setValueAtTime(from, t);
    p.linearRampToValueAtTime(v, t + seconds);
  }

  /** One plucked note: a string buffer, a velocity-dependent lowpass and a damping envelope. */
  pluck(t: number, midi: number, vel: number, pan: number, tone: number, ring: number): void {
    if (this.voices >= MAX_VOICES) return;
    const ctx = this.ctx;
    const { buffer, rate } = this.strings.get(midi, vel > 0.75);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const out = panner(ctx, pan, this.plucks);
    const env = gain(ctx, 0, out);
    const lp = filter(ctx, 'lowpass', tone, -3, env);
    src.connect(lp);
    // oud notes are damped early, qanun notes ring on
    const hold = 0.3 + 1.5 * ring;
    const tau = 0.18 + 0.42 * ring;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vel, t + 0.005);
    env.gain.setTargetAtTime(0, t + hold, tau);
    src.start(t);
    src.stop(Math.min(t + buffer.duration / rate, t + hold + 7 * tau));
    this.release(src, [src, lp, env, out]);
  }

  /** A frame-drum stroke, dum (low) or tek: two membrane modes settling slightly in pitch. */
  drum(t: number, low: boolean, vel: number): void {
    if (this.voices >= MAX_VOICES) return;
    const ctx = this.ctx;
    const f = low ? 72 : 190;
    const decay = low ? 0.16 : 0.06;
    const end = t + 0.01 + decay * 8;
    const out = gain(ctx, 0, this.drums);
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(vel, t + 0.008);
    out.gain.setTargetAtTime(0, t + 0.008, decay);
    const nodes: AudioNode[] = [out];
    let last: OscillatorNode | null = null;
    for (const [ratio, amp] of MEMBRANE) {
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(f * ratio * 1.4, t);
      osc.frequency.exponentialRampToValueAtTime(f * ratio, t + 0.06);
      osc.connect(gain(ctx, amp, out));
      osc.start(t);
      osc.stop(end);
      nodes.push(osc);
      last = osc;
    }
    if (last) this.release(last, nodes);
  }

  /** A soft bell: a few partials with a gentle attack and long, uneven decays. */
  bell(t: number, midi: number, amp: number, pan: number): void {
    if (this.voices >= MAX_VOICES) return;
    const ctx = this.ctx;
    const f = mtof(midi);
    const out = panner(ctx, pan, this.bells);
    const mix = gain(ctx, amp, out);
    const nodes: AudioNode[] = [out, mix];
    const end = t + 4.8;
    let last: OscillatorNode | null = null;
    for (const [ratio, a, t60] of PARTIALS) {
      const osc = ctx.createOscillator();
      osc.frequency.value = f * ratio;
      const g = gain(ctx, 0, mix);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a, t + 0.01);
      g.gain.setTargetAtTime(0, t + 0.01, t60 / 6.9);
      osc.connect(g);
      osc.start(t);
      osc.stop(end);
      nodes.push(osc, g);
      last = osc;
    }
    if (last) this.release(last, nodes);
  }

  /** Counts a one-shot voice and disconnects its nodes once its source has ended. */
  private release(src: AudioScheduledSourceNode, nodes: readonly AudioNode[]): void {
    this.voices++;
    src.onended = () => {
      this.voices--;
      for (const node of nodes) node.disconnect();
    };
  }
}

// ---------------------------------------------------------------------------
// Melody

interface Note {
  /** seconds after the phrase onset */
  at: number;
  midi: number;
  vel: number;
}

/**
 * A seeded melodic line: a scale degree wandering around a home register, a
 * per-city motif that returns now and then, phrases of one to three notes with
 * the occasional grace note or repeated stroke, cadences onto the root or fifth.
 */
class Composer {
  private rng = prng(1);
  private pal: Palette = PALETTES[0];
  private key = -1;
  private deg = 4;
  private home = 4;
  private hi = 12;
  private motif: readonly number[] = [1, 1];
  private count = 0;

  /** Re-seeds when the city changes, so each city replays its own line on every visit. */
  setMood(m: AmbientMood): void {
    const key = hash(m.series, m.seed);
    if (key === this.key) return;
    this.key = key;
    this.rng = prng(hash(key, 0x51ed27));
    this.pal = PALETTES[m.series];
    const n = this.pal.scale.length;
    this.home = Math.round(n * 0.6);
    this.hi = 2 * n - 2;
    this.count = 0;
    this.deg = this.home + Math.floor(this.rng() * 3) - 1;
    const steps = [-2, -1, -1, 1, 1, 2];
    this.motif = Array.from({ length: this.rng() < 0.6 ? 2 : 3 }, () => steps[Math.floor(this.rng() * steps.length)]);
  }

  /** The next phrase, and the time from its onset to the next one. */
  next(m: AmbientMood): { notes: Note[]; gap: number } {
    const r = this.rng;
    const e = m.energy;
    this.count++;
    const x = r();
    const size = x < 0.6 - 0.25 * e ? 1 : x < 0.88 - 0.1 * e ? 2 : 3;
    const notes: Note[] = [];
    let deg = this.walk(this.deg);
    let at = 0;
    if (r() < 0.14) {
      // slide in from a neighbouring degree
      notes.push({ at: 0, midi: this.pitch(deg + (r() < 0.5 ? -1 : 1)), vel: 0.3 });
      at = 0.07;
    }
    notes.push({ at, midi: this.pitch(deg), vel: 0.68 + 0.32 * r() });
    const motif = size > 1 && r() < 0.35;
    const pace = (0.16 + 0.3 * r()) * (1 - 0.3 * e);
    for (let i = 1; i < size; i++) {
      if (i === 1 && !motif && r() < 0.12) {
        at += 0.11; // a quick repeated stroke on the same note
      } else {
        at += pace * (0.75 + 0.5 * r());
        deg = motif ? this.clamp(deg + this.motif[(i - 1) % this.motif.length]) : this.walk(deg);
        if (i === size - 1 && r() < 0.55) deg = this.settle(deg);
      }
      notes.push({ at, midi: this.pitch(deg), vel: 0.48 + 0.32 * r() });
    }
    this.deg = deg;
    // Poisson-like spacing: 1.5 s plus an exponential wait, shorter in busy cities,
    // longer at night, with a slow ebb and flow of activity over a few minutes
    const swell = 1 + 0.25 * Math.sin(this.count * 0.29);
    const mean = (lerp(3.8, 1, e) * (1 + 0.5 * m.night)) / (this.pal.density * swell);
    const gap = clamp(1.5 - mean * Math.log(1 - r()), at + 1.2, 7);
    return { notes, gap };
  }

  private walk(deg: number): number {
    const x = this.rng();
    let step = x < 0.3 ? 1 : x < 0.6 ? -1 : x < 0.71 ? 2 : x < 0.82 ? -2 : x < 0.9 ? 0 : x < 0.95 ? 3 : -3;
    // the home register itself drifts a little over the minutes
    const home = this.home + Math.round(1.5 * Math.sin(this.count * 0.21));
    const off = deg - home;
    if (off * step > 0 && Math.abs(off) > 2 && this.rng() < 0.7) step = -step;
    return this.clamp(deg + step);
  }

  private clamp(deg: number): number {
    return clamp(deg, -2, this.hi);
  }

  /** The nearest degree resting on the root or the drone's upper note. */
  private settle(deg: number): number {
    const n = this.pal.scale.length;
    const rest = this.pal.upper % 12;
    for (let d = 0; d <= 3; d++) {
      for (const c of [deg - d, deg + d]) {
        const off = this.pal.scale[((c % n) + n) % n];
        if (c >= -2 && c <= this.hi && (off === 0 || off === rest)) return c;
      }
    }
    return deg;
  }

  /** MIDI pitch of a degree; degree 0 is the tonic an octave above the drone. */
  private pitch(deg: number): number {
    const s = this.pal.scale;
    const oct = Math.floor(deg / s.length);
    return this.pal.tonic + 12 * (oct + 1) + s[deg - oct * s.length];
  }
}

// ---------------------------------------------------------------------------
// Public API

type AudioContextCtor = new (options?: AudioContextOptions) => AudioContext;

function findAudioContext(): AudioContextCtor | null {
  try {
    const g: { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor } = globalThis;
    return g.AudioContext ?? g.webkitAudioContext ?? null;
  } catch {
    return null;
  }
}

export class Ambient {
  private readonly Ctor: AudioContextCtor | null;
  private ctx: AudioContext | null = null;
  private engine: Engine | null = null;
  private readonly composer = new Composer();
  private mood: AmbientMood = { series: 0, night: 0.5, energy: 0.3, seed: 0 };
  private ch: Character = character(this.mood);
  /** the mood last pushed into the graph */
  private applied: AmbientMood | null = null;
  private volume = 0.7;
  private on = false;
  /** bumped by start and stop, so stale async continuations can tell */
  private gen = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private sleep: ReturnType<typeof setTimeout> | null = null;
  // scheduler clocks, in AudioContext time
  private phraseAt = 0;
  private beatAt = 0;
  private eighth = 0.4;
  private step = 0;
  private drumRng = prng(1);
  private lastChime = -Infinity;

  constructor() {
    this.Ctor = findAudioContext();
  }

  get playing(): boolean {
    return this.on;
  }

  /** Must be called from a user gesture: creates or resumes the AudioContext and fades in over ~3 s. */
  async start(): Promise<void> {
    const Ctor = this.Ctor;
    if (this.on || !Ctor) return;
    this.on = true;
    const gen = ++this.gen;
    if (this.sleep !== null) {
      clearTimeout(this.sleep);
      this.sleep = null;
    }
    try {
      const ctx = this.ctx ?? new Ctor({ latencyHint: 'playback' });
      this.ctx = ctx;
      const silent = !this.engine || ctx.state !== 'running';
      const engine = this.engine ?? new Engine(ctx);
      this.engine = engine;
      await ctx.resume(); // nothing above awaits, so this still runs inside the gesture
      if (gen !== this.gen) return; // stopped while waking up
      engine.setVolume(this.volume, silent);
      this.flush(silent);
      engine.fadeTo(1, FADE_IN);
      if (silent) {
        const now = ctx.currentTime;
        this.beatAt = now + 0.2;
        this.step = 0;
        this.phraseAt = now + 1.4 + Math.random();
      }
      this.tick();
    } catch {
      // audio refused (blocked, interrupted, unsupported): stay a silent no-op
      if (gen === this.gen) this.on = false;
    }
  }

  /** Fades out over ~1.5 s, then suspends the context. */
  stop(): void {
    if (!this.on) return;
    this.on = false;
    const gen = ++this.gen;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const { ctx, engine } = this;
    if (!ctx || !engine) return;
    engine.fadeTo(0, FADE_OUT);
    this.sleep = setTimeout(() => {
      this.sleep = null;
      if (gen === this.gen) ctx.suspend().catch(() => undefined);
    }, FADE_OUT * 1000 + 150);
  }

  /** Crossfades (4-6 s) to a new mood; safe any time, and kept for start() while silent. */
  setMood(m: AmbientMood): void {
    this.mood = sanitize(m);
    this.ch = character(this.mood);
    // applied by the next scheduler tick, so per-frame calls cost nothing
  }

  /** A soft bell-like chime for UI moments; a no-op unless playing. */
  chime(): void {
    const engine = this.engine;
    if (!this.on || !engine) return;
    const now = engine.ctx.currentTime;
    if (now - this.lastChime < 0.25) return;
    this.lastChime = now;
    // the new city's root two octaves above the drone, then its fifth (a third in whole-tone)
    const { tonic, scale } = this.ch.pal;
    const root = tonic + 24;
    try {
      engine.bell(now + 0.03, root, 1, -0.2);
      engine.bell(now + 0.21, root + (scale.includes(7) ? 7 : 4), 0.6, 0.25);
    } catch {
      // a UI sound must never break the UI
    }
  }

  /** Master volume 0..1 (default 0.7). */
  setVolume(v: number): void {
    this.volume = Number.isFinite(v) ? clamp(v, 0, 1) : 0.7;
    this.engine?.setVolume(this.volume, false);
  }

  /** Pushes the stored mood into the graph: glides normally, jumps while silent. */
  private flush(instant: boolean): void {
    const engine = this.engine;
    if (!engine) return;
    const m = this.mood;
    const prev = this.applied;
    if (!instant && prev && sameMood(prev, m)) return;
    this.applied = m;
    engine.setMood(m, this.ch, instant ? 0 : GLIDE);
    this.eighth = 30 / this.ch.bpm;
    if (!prev || prev.series !== m.series || prev.seed !== m.seed) {
      this.composer.setMood(m);
      this.drumRng = prng(hash(m.series, m.seed, 0xd2));
      // let the drone glide most of the way before the new city speaks
      if (!instant) this.phraseAt = Math.max(this.phraseAt, engine.ctx.currentTime + 2.4);
    }
  }

  private readonly tick = (): void => {
    this.timer = null;
    const engine = this.engine;
    if (!this.on || !engine) return;
    try {
      this.flush(false);
      this.schedule(engine, engine.ctx.currentTime);
    } catch (err) {
      console.warn('[audio] ambient scheduler stopped', err);
      return;
    }
    this.timer = setTimeout(this.tick, TICK_MS);
  };

  private schedule(engine: Engine, now: number): void {
    const m = this.mood;
    const ch = this.ch;
    const horizon = now + LOOKAHEAD;
    const pulse = pulseOf(m);
    // after a stall (a throttled background tab) skip ahead rather than burst
    if (this.beatAt < now) this.beatAt = now + 0.05;
    if (this.phraseAt < now) this.phraseAt = now + 0.1 + Math.random() * 0.4;
    // the pulse grid, a slow bar of eight eighths, sounds only in busy cities
    while (this.beatAt < horizon) {
      if (pulse > 0.01 && this.drumRng() < PULSE[this.step] * (0.55 + 0.45 * m.energy)) {
        const low = this.step % 4 === 0;
        const vel = (low ? 0.85 : 0.4) + 0.15 * this.drumRng();
        engine.drum(this.beatAt + Math.random() * 0.01, low, vel);
      }
      this.beatAt += this.eighth;
      this.step = (this.step + 1) % 8;
    }
    // plucked phrases at Poisson-like intervals; busy cities lean on the grid
    while (this.phraseAt < horizon) {
      const { notes, gap } = this.composer.next(m);
      const t0 = Math.random() < pulse * 0.85 ? this.snap(this.phraseAt, now) : this.phraseAt;
      for (const n of notes) {
        const tone = (900 + 3400 * ch.bright * (0.5 + 0.5 * n.vel)) * lerp(1, 0.55, m.night);
        const pan = clamp((n.midi - 67) / 28 + (Math.random() - 0.5) * 0.3, -0.6, 0.6);
        engine.pluck(t0 + n.at + Math.random() * 0.008, n.midi, n.vel, pan, tone, ch.ring);
      }
      this.phraseAt += gap;
    }
  }

  /** The pulse-grid time nearest to t that is still safely in the future. */
  private snap(t: number, now: number): number {
    let s = this.beatAt + Math.round((t - this.beatAt) / this.eighth) * this.eighth;
    while (s < now + 0.02) s += this.eighth;
    return s;
  }
}
