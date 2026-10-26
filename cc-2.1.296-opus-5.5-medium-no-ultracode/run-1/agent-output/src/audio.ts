// A quiet generative soundscape: a slow drone over the water and,
// now and then, a distant bell. Everything is synthesized; nothing is loaded.

export class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private timer = 0;
  private droneVoices: OscillatorNode[] = [];
  private filter: BiquadFilterNode | null = null;
  on = false;
  private mood = 0; // shifts the harmony per city

  private build() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    // impulse response: a long dark hall
    const len = ctx.sampleRate * 5;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    const reverb = ctx.createConvolver();
    reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.7;
    reverb.connect(wet).connect(master);
    this.reverb = reverb;

    // drone: detuned low voices through a breathing lowpass
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.7;
    this.filter = filter;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.11;
    filter.connect(droneGain);
    droneGain.connect(master);
    droneGain.connect(reverb);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 220;
    lfo.connect(lfoAmt).connect(filter.frequency);
    lfo.start();
    const base = 55;
    [1, 1.5, 2, 2.0034, 3, 4.01].forEach((m, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'sine' : 'triangle';
      o.frequency.value = base * m;
      const g = ctx.createGain();
      g.gain.value = 0.32 / (1 + i * 0.6);
      o.connect(g).connect(filter);
      o.start();
      this.droneVoices.push(o);
    });

    // sea: filtered noise swelling slowly
    const nlen = ctx.sampleRate * 4;
    const nb = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    let last = 0;
    for (let i = 0; i < nlen; i++) {
      last = last * 0.985 + (Math.random() * 2 - 1) * 0.015;
      nd[i] = last * 6;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = nb;
    noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 500;
    nf.Q.value = 0.5;
    const ng = ctx.createGain();
    ng.gain.value = 0.05;
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.09;
    const swellAmt = ctx.createGain();
    swellAmt.gain.value = 0.04;
    swell.connect(swellAmt).connect(ng.gain);
    swell.start();
    noise.connect(nf).connect(ng).connect(master);
    noise.start();
  }

  private bell() {
    const ctx = this.ctx!;
    const scales = [
      [0, 2, 4, 7, 9],
      [0, 3, 5, 7, 10],
      [0, 2, 5, 7, 9],
      [0, 1, 5, 7, 8],
    ];
    const scale = scales[this.mood % scales.length];
    const note = scale[Math.floor(Math.random() * scale.length)] + 12 * Math.floor(Math.random() * 2);
    const f = 220 * Math.pow(2, note / 12) * (this.mood % 2 ? 1 : 1.5);
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.06 + Math.random() * 0.04, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 5);
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    g.connect(pan);
    pan.connect(this.reverb!);
    pan.connect(this.master!);
    for (const [m, a] of [
      [1, 1],
      [2.76, 0.35],
      [5.4, 0.12],
    ]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * m;
      const og = ctx.createGain();
      og.gain.value = a;
      o.connect(og).connect(g);
      o.start(now);
      o.stop(now + 5.2);
    }
  }

  setMood(n: number) {
    this.mood = n;
    if (!this.ctx) return;
    const roots = [55, 49, 58.27, 51.91, 61.74, 46.25];
    const base = roots[n % roots.length];
    const mults = [1, 1.5, 2, 2.0034, 3, 4.01];
    const now = this.ctx.currentTime;
    this.droneVoices.forEach((o, i) => o.frequency.setTargetAtTime(base * mults[i], now, 2.5));
  }

  async toggle(force?: boolean) {
    const want = force ?? !this.on;
    if (want && !this.ctx) this.build();
    if (!this.ctx) return;
    if (want) await this.ctx.resume();
    this.on = want;
    const now = this.ctx.currentTime;
    this.master!.gain.cancelScheduledValues(now);
    this.master!.gain.setTargetAtTime(want ? 0.9 : 0, now, 1.2);
    clearTimeout(this.timer);
    if (want) {
      const loop = () => {
        if (!this.on) return;
        this.bell();
        if (Math.random() < 0.4) setTimeout(() => this.on && this.bell(), 400 + Math.random() * 900);
        this.timer = window.setTimeout(loop, 3500 + Math.random() * 6000);
      };
      this.timer = window.setTimeout(loop, 1500);
    }
  }
}
