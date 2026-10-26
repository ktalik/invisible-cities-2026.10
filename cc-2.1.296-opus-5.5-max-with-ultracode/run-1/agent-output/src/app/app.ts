// The application: intro, the Khan's atlas, the fifty-five cities, the journey
// (all cities in the book's order with the chapters' interludes) and the epilogue.

import * as THREE from 'three';
import { Stage } from '../core/stage';
import { createCityWorld } from '../core/cityWorld';
import { createAtlasWorld, type AtlasApi } from '../atlas/atlas';
import { loadCity } from '../cities/registry';
import { CITIES, CITY_BY_ID } from '../data/cities';
import { SERIES_BY_ID } from '../data/series';
import { FRAME } from '../data/frame';
import { UI, type Action } from '../ui/ui';
import type { CityBuilder, CityInstance, CityMeta, CameraView } from '../core/types';
import type { Ambient } from '../core/audio';

type Mode = 'intro' | 'atlas' | 'city' | 'epilogue';

const FAST = Number(new URLSearchParams(location.search).get('fast') ?? 1) || 1; // test hook: ?fast=8
const JOURNEY_CITY_SECONDS = 34 / FAST;
const INTERLUDE_SECONDS = 10 / FAST;
const FADE = '#0e0b09';

function storage<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function store(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* private mode */
  }
}

class App {
  stage: Stage;
  ui = new UI();
  atlas!: AtlasApi;
  mode: Mode = 'intro';
  city: CityMeta | null = null;
  instance: CityInstance | null = null;
  interactionOn = false;
  busy = false;
  pending: (() => Promise<void>) | null = null;
  visited = new Set<string>(storage<string[]>('ic-visited', []));
  journey = { on: false, t: 0, interlude: false, toggled: false };
  audio: Ambient | null = null;
  soundOn = false;
  quality: 'low' | 'high';
  tipCity: CityMeta | null = null;

  constructor() {
    const canvas = document.getElementById('stage') as HTMLCanvasElement;
    const weak = /Mobi|Android/i.test(navigator.userAgent) || (navigator.hardwareConcurrency ?? 8) <= 4;
    this.quality = new URLSearchParams(location.search).get('quality') === 'low' || weak ? 'low' : 'high';
    this.stage = new Stage({ canvas, quality: this.quality });
    this.stage.setFadeColor(FADE);
    this.ui.onAction = (a) => this.action(a);
    this.ui.onBead = (c) => this.goCity(c, { stopJourney: false });
    this.ui.setVisited(this.visited);
    this.stage.onFrame = (dt) => this.tick(dt);
    window.addEventListener('keydown', (e) => this.key(e));
    window.addEventListener('hashchange', () => this.route());
    // a visitor who enabled sound before gets it back on the first gesture (autoplay rules)
    if (storage<boolean>('ic-sound', false)) {
      const resume = (e: Event) => {
        window.removeEventListener('pointerdown', resume);
        window.removeEventListener('keydown', resume);
        const isMuteKey = e instanceof KeyboardEvent && e.key.toLowerCase() === 'm';
        const isSoundButton = e.target instanceof Element && !!e.target.closest('.tools button[title^="Sound"]');
        if (!this.soundOn && !isMuteKey && !isSoundButton) void this.toggleSound();
      };
      window.addEventListener('pointerdown', resume);
      window.addEventListener('keydown', resume);
    }
  }

  async start() {
    this.atlas = await createAtlasWorld(this.stage);
    this.atlas.world.keep = true;
    this.atlas.onHover = (m) => {
      this.tipCity = m;
      this.ui.showTooltip(m);
    };
    this.atlas.onSelect = (m) => this.goCity(m, { fromAtlas: true });
    this.atlas.onCenter = () => this.goVenice();
    this.stage.setWorld(this.atlas.world);
    this.stage.start();
    await this.route(true);
  }

  // ------------------------------------------------------------- routing

  private setHash(h: string) {
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  async route(initial = false) {
    const h = location.hash.replace(/^#\/?/, '');
    const [kind, id] = h.split('/');
    if (kind === 'city' && CITY_BY_ID[id]) return this.goCity(CITY_BY_ID[id], { instant: initial });
    if (kind === 'journey') return this.startJourney(CITY_BY_ID[id] ?? CITIES[0]);
    if (kind === 'atlas') return this.goAtlas(initial);
    if (kind === 'epilogue') return this.goEpilogue();
    if (kind === 'venice') return this.goVenice();
    return this.goIntro();
  }

  /** Serialise transitions: the newest request wins. */
  private run(task: () => Promise<void>) {
    if (this.busy) {
      this.pending = task;
      return;
    }
    this.busy = true;
    task()
      .catch((e) => console.error(e))
      .finally(async () => {
        this.busy = false;
        const next = this.pending;
        this.pending = null;
        if (next) this.run(next);
      });
  }

  // ------------------------------------------------------------- modes

  goIntro() {
    this.mode = 'intro';
    this.ui.setMode('intro');
    this.setHash('#/');
    this.run(async () => {
      if (this.stage.world !== this.atlas.world) {
        await this.stage.fadeTo(1, 2.2);
        this.stage.setWorld(this.atlas.world, false);
      }
      this.stage.applyCamera(this.atlas.world.camera, false);
      this.stage.camera.position.set(-6, 9, 44);
      this.stage.controls.target.set(0, 2, 0);
      this.stage.flyTo({ position: [0, 13, 52], target: [0, 1.5, 0] }, 6);
      this.atlas.revealThread(9);
      await this.stage.fadeTo(0, 0.5);
    });
  }

  goAtlas(initial = false) {
    this.stopJourney();
    this.atlas.setEpilogue(false);
    this.mode = 'atlas';
    this.ui.setMode('atlas');
    this.setHash('#/atlas');
    this.document(null);
    this.run(async () => {
      const wasAtlas = this.stage.world === this.atlas.world;
      if (!wasAtlas) {
        await this.stage.fadeTo(1, 2.4);
        this.stage.setWorld(this.atlas.world, false);
        this.instance = null;
      }
      this.atlas.setCurrent(this.city?.id ?? null);
      const cam = this.atlas.world.camera;
      if (!wasAtlas || initial) {
        if (this.city) {
          const v = this.atlas.diveView(this.city.id);
          this.stage.camera.position.set(...v.position);
          this.stage.controls.target.set(...v.target);
        } else {
          this.stage.camera.position.set(0, 80, 60);
          this.stage.controls.target.set(0, 0, 0);
        }
      }
      this.stage.flyTo({ position: cam.position, target: cam.target }, wasAtlas ? 2.6 : 3);
      if (wasAtlas && this.stage.fadeValue > 0) await this.stage.fadeTo(0, 0.8);
      else if (!wasAtlas) await this.stage.fadeTo(0, 0.9);
      this.mood(null);
    });
  }

  goEpilogue() {
    this.stopJourney();
    this.mode = 'epilogue';
    this.ui.setMode('epilogue');
    this.setHash('#/epilogue');
    this.document(null);
    this.run(async () => {
      if (this.stage.world !== this.atlas.world) {
        await this.stage.fadeTo(1, 1.2);
        this.stage.setWorld(this.atlas.world, false);
        this.instance = null;
      }
      this.atlas.setCurrent(null);
      this.atlas.setEpilogue(true);
      this.stage.camera.position.set(0, 28, 30);
      this.stage.controls.target.set(0, 0, 0);
      this.stage.flyTo({ position: [0, 70, 22], target: [0, 0, 0] }, 14);
      this.atlas.revealThread(9);
      await this.stage.fadeTo(0, 0.5);
    });
  }

  goVenice() {
    this.stopJourney();
    void import('../venice/venice').then((v) => this.goCity(v.VENICE, { fromAtlas: this.mode === 'atlas', builder: v.default }));
  }

  goCity(meta: CityMeta, o: { fromAtlas?: boolean; instant?: boolean; stopJourney?: boolean; builder?: CityBuilder } = {}) {
    if (o.stopJourney !== false && this.journey.on && !o.instant) this.stopJourney();
    this.atlas.setEpilogue(false);
    this.mode = 'city';
    this.ui.setMode('city');
    this.ui.interlude.classList.remove('show');
    this.setHash(meta.order === 0 ? '#/venice' : '#/city/' + meta.id);
    this.run(async () => {
      this.ui.cityPanel.classList.remove('show');
      if (o.fromAtlas && this.stage.world === this.atlas.world) {
        this.stage.flyTo(meta.order === 0 ? { position: [0, 6, 7], target: [0, 0, 0] } : this.atlas.diveView(meta.id), 1.3);
        await new Promise((r) => setTimeout(r, 450));
      }
      await this.stage.fadeTo(1, o.fromAtlas ? 1.5 : 2.2);
      const slow = setTimeout(() => this.ui.setLoading(meta.name), 250);
      const cw = await createCityWorld(meta, this.stage, this.quality, o.builder);
      clearTimeout(slow);
      this.ui.setLoading(null);
      this.city = meta;
      this.instance = cw.instance;
      this.interactionOn = false;
      this.stage.setWorld(cw.world, true);
      // arrive from further away and higher, then settle on the city's own view
      const cam = cw.world.camera;
      const t = new THREE.Vector3(...cam.target);
      const p = new THREE.Vector3(...cam.position);
      const start = p.clone().sub(t).multiplyScalar(1.45).add(t);
      start.y += 4;
      this.stage.camera.position.copy(start);
      this.stage.controls.target.copy(t);
      this.stage.controls.update();
      this.stage.flyTo({ position: cam.position, target: cam.target }, 4.2);
      this.visited.add(meta.id);
      store('ic-visited', [...this.visited]);
      this.ui.setVisited(this.visited);
      this.ui.showCity(meta, cw.instance.interaction ?? null, false);
      this.document(meta);
      this.mood(meta);
      this.audio?.chime();
      this.ui.titleCard(meta);
      await this.stage.fadeTo(0, 0.85);
      setTimeout(() => {
        if (this.city === meta && this.mode === 'city') this.ui.cityPanel.classList.add('show');
      }, 1900);
      this.journey.t = 0;
      this.journey.toggled = false;
      this.prefetch(meta);
    });
  }

  private prefetch(meta: CityMeta) {
    if (meta.order === 0) return;
    const i = meta.order - 1;
    for (const j of [i + 1, i - 1]) {
      const c = CITIES[(j + CITIES.length) % CITIES.length];
      loadCity(c.id).catch(() => {});
    }
  }

  private document(meta: CityMeta | null) {
    document.title = meta ? `${meta.name} - Invisible Cities` : 'Invisible Cities';
  }

  // ------------------------------------------------------------- journey

  startJourney(from?: CityMeta) {
    this.journey.on = true;
    this.journey.t = 0;
    this.ui.setJourney(true);
    const first = from ?? (this.city && this.mode === 'city' ? this.city : CITIES[0]);
    if (this.mode === 'city' && this.city === first) return;
    if (first.order === 1 || (from && first.chapter !== CITIES[first.order - 2]?.chapter)) {
      this.interludeThen(first);
    } else {
      this.goCity(first, { stopJourney: false });
    }
  }

  stopJourney() {
    if (!this.journey.on) return;
    this.journey.on = false;
    this.journey.interlude = false;
    this.ui.setJourney(false);
    this.ui.interlude.classList.remove('show');
  }

  private interludeThen(next: CityMeta) {
    const text = FRAME.chapterInterludes.find((c) => c.chapter === next.chapter);
    if (!text) {
      this.goCity(next, { stopJourney: false });
      return;
    }
    this.journey.interlude = true;
    this.run(async () => {
      this.ui.cityPanel.classList.remove('show');
      await this.stage.fadeTo(1, 1.0);
      this.ui.showInterlude(next.chapter, text.title, text.text);
      this.mode = 'city';
      this.ui.setMode('city');
    });
    window.setTimeout(() => {
      if (!this.journey.on || !this.journey.interlude) return;
      this.journey.interlude = false;
      this.ui.interlude.classList.remove('show');
      this.goCity(next, { stopJourney: false });
    }, INTERLUDE_SECONDS * 1000);
  }

  private tick(dt: number) {
    // tooltip follows the hovered medallion
    if (this.mode === 'atlas' && this.tipCity) {
      const p = this.atlas.medalPosition(this.tipCity.id).project(this.stage.camera);
      const r = this.stage.renderer.domElement.getBoundingClientRect();
      this.ui.moveTooltip((p.x * 0.5 + 0.5) * r.width, (-p.y * 0.5 + 0.5) * r.height - 10);
    }
    if (!this.journey.on || this.journey.interlude || this.busy || this.mode !== 'city' || !this.city) return;
    if (document.hidden) return;
    const j = this.journey;
    j.t += dt;
    this.ui.setJourneyProgress(j.t / JOURNEY_CITY_SECONDS);
    // cinematic choreography through the city's extra views
    const views = this.stage.world?.camera.views ?? [];
    const prevT = j.t - dt;
    const interCam = !!this.instance?.interaction?.camera;
    const D = JOURNEY_CITY_SECONDS;
    const at = (f: number) => prevT < D * f && j.t >= D * f;
    if (views[0] && at(0.32)) this.stage.flyTo(views[0], 6.5 / FAST);
    if (views[1] && !interCam && at(0.62)) this.stage.flyTo(views[1], 5.5 / FAST);
    const cam = this.stage.world?.camera;
    if (cam && views.length && at(0.84)) this.stage.flyTo({ position: cam.position, target: cam.target }, 5 / FAST);
    const inter = this.instance?.interaction;
    if (inter && !j.toggled && j.t > JOURNEY_CITY_SECONDS * 0.42) {
      j.toggled = true;
      this.toggleInteraction(true);
    }
    if (inter && this.interactionOn && j.t > JOURNEY_CITY_SECONDS * 0.82) this.toggleInteraction(false);
    if (j.t >= JOURNEY_CITY_SECONDS) {
      j.t = 0;
      const i = this.city.order;
      if (i >= CITIES.length) {
        this.goEpilogue();
        return;
      }
      const next = CITIES[i];
      if (next.chapter !== this.city.chapter) this.interludeThen(next);
      else this.goCity(next, { stopJourney: false });
    }
  }

  // ------------------------------------------------------------- actions

  toggleInteraction(force?: boolean) {
    const inter = this.instance?.interaction;
    if (!inter || this.mode !== 'city') return;
    this.interactionOn = force ?? !this.interactionOn;
    inter.set(this.interactionOn);
    this.ui.setInteraction(inter, this.interactionOn);
    this.ui.hint.textContent = this.interactionOn ? inter.hint ?? '' : '';
    const cam = this.stage.world?.camera;
    if (inter.camera && this.interactionOn) this.stage.flyTo(inter.camera, 3);
    else if (inter.camera && cam) this.stage.flyTo({ position: cam.position, target: cam.target }, 3);
    this.stage.poke();
  }

  step(dir: 1 | -1) {
    const cur = this.city && this.mode === 'city' && this.city.order > 0 ? this.city.order - 1 : dir > 0 ? -1 : CITIES.length;
    const next = CITIES[(cur + dir + CITIES.length) % CITIES.length];
    if (this.journey.on) {
      this.journey.interlude = false;
      this.ui.interlude.classList.remove('show');
    }
    this.goCity(next, { stopJourney: false });
  }

  async toggleSound() {
    this.soundOn = !this.soundOn;
    this.ui.setSound(this.soundOn);
    store('ic-sound', this.soundOn);
    if (this.soundOn) {
      if (!this.audio) {
        const { Ambient } = await import('../core/audio');
        this.audio = new Ambient();
      }
      this.mood(this.mode === 'city' ? this.city : null);
      await this.audio.start();
    } else {
      this.audio?.stop();
    }
  }

  private mood(meta: CityMeta | null) {
    if (!this.audio) return;
    if (!meta) {
      this.audio.setMood({ series: 8, night: 0.9, energy: 0.2, seed: 0 });
      return;
    }
    const env = this.stage.world?.env;
    const top = new THREE.Color(env?.skyTop ?? '#888888');
    const lum = 0.2126 * top.r + 0.7152 * top.g + 0.0722 * top.b;
    const night = Math.max(env?.stars ?? 0, 1 - Math.min(1, lum * 3));
    this.audio.setMood({ series: SERIES_BY_ID[meta.series].index, night, energy: 0.35 + (meta.order % 5) * 0.1, seed: meta.order });
  }

  action(a: Action) {
    switch (a) {
      case 'home':
        this.stopJourney();
        this.goIntro();
        break;
      case 'atlas':
      case 'enter-atlas':
      case 'epilogue-atlas':
        this.goAtlas();
        break;
      case 'journey':
        if (this.journey.on) this.stopJourney();
        else this.startJourney();
        break;
      case 'begin':
      case 'epilogue-again':
        this.startJourney(CITIES[0]);
        break;
      case 'sound':
        void this.toggleSound();
        break;
      case 'hide':
        document.body.classList.toggle('ui-hidden');
        this.ui.tools.hide.classList.toggle('on', document.body.classList.contains('ui-hidden'));
        break;
      case 'full':
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen?.();
        break;
      case 'about':
        this.ui.about.classList.add('show');
        break;
      case 'index':
        this.ui.index.classList.add('show');
        break;
      case 'prev':
        this.step(-1);
        break;
      case 'next':
        this.step(1);
        break;
      case 'interact':
        this.toggleInteraction();
        break;
    }
  }

  private key(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const modal = [this.ui.about, this.ui.venice, this.ui.index].find((m) => m.classList.contains('show'));
    if (modal) {
      if (e.key === 'Escape') modal.classList.remove('show');
      return;
    }
    switch (e.key) {
      case 'ArrowRight':
        this.step(1);
        break;
      case 'ArrowLeft':
        this.step(-1);
        break;
      case 'Escape':
        if (this.mode === 'city' || this.mode === 'epilogue') this.goAtlas();
        break;
      case ' ':
        e.preventDefault();
        this.toggleInteraction();
        break;
      case 'j':
      case 'J':
        this.action('journey');
        break;
      case 'h':
      case 'H':
        this.action('hide');
        break;
      case 'm':
      case 'M':
        this.action('sound');
        break;
      case 'f':
      case 'F':
        this.action('full');
        break;
      case 'i':
      case 'I':
        this.action('index');
        break;
      case 'Enter':
        if (this.mode === 'intro') this.goAtlas();
        break;
    }
  }
}

export async function startApp() {
  await document.fonts.ready;
  const app = new App();
  (window as unknown as { __app: App }).__app = app;
  await app.start();
}

export type { CameraView };
