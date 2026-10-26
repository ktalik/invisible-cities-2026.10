// Screenshot mode: ?shot=<cityId>&view=0&t=6&w=1280&h=800&toggle=1
// Renders one city deterministically and exposes window.__shot for the harness.

import { Stage } from './core/stage';
import { createCityWorld, derivedView } from './core/cityWorld';
import { CITY_BY_ID } from './data/cities';

declare global {
  interface Window {
    __shot?: { ready: boolean; error?: string; stats?: unknown; buildMs?: number; hasInteraction?: boolean };
  }
}

export async function runShot(id: string, params: URLSearchParams) {
  window.__shot = { ready: false };
  const canvas = document.getElementById('stage') as HTMLCanvasElement;
  const w = Number(params.get('w') ?? 1280);
  const h = Number(params.get('h') ?? 800);
  document.body.classList.add('shot');
  const stage = new Stage({ canvas, shot: true, quality: 'high' });
  stage.setSize(w, h);
  try {
    await document.fonts.ready;
    if (id === 'atlas') {
      const { createAtlasWorld } = await import('./atlas/atlas');
      const atlas = await createAtlasWorld(stage, { shot: true });
      stage.setWorld(atlas.world);
      stage.simulate(Number(params.get('t') ?? 4));
      stage.renderOnce();
      stage.renderOnce();
      window.__shot = { ready: true, stats: stage.stats() };
      return;
    }
    let direct: import('./core/types').CityBuilder | undefined;
    let meta = CITY_BY_ID[id];
    if (id === 'venice') {
      const v = await import('./venice/venice');
      meta = v.VENICE;
      direct = v.default;
    }
    if (id === 'kittest') {
      direct = (await import('./dev/kittest')).default;
      meta = { ...CITY_BY_ID.diomira, id: 'kittest', name: 'Kit test' };
    }
    if (!meta) throw new Error('unknown city ' + id);
    const { world, instance, buildMs } = await createCityWorld(meta, stage, 'high', direct);
    stage.setWorld(world);
    const view = Number(params.get('view') ?? 0);
    const v = derivedView(world.camera, view);
    stage.camera.position.set(...v.position);
    stage.controls.target.set(...v.target);
    if (params.get('thumb') === '1') {
      // square medallion: step back a little so the whole city fits
      const t = stage.controls.target;
      stage.camera.position.sub(t).multiplyScalar(1.12).add(t);
    }
    stage.controls.update();
    if (params.get('toggle') === '1' && instance.interaction) {
      instance.interaction.set(true);
      if (instance.interaction.camera && view === 0) {
        stage.camera.position.set(...instance.interaction.camera.position);
        stage.controls.target.set(...instance.interaction.camera.target);
      }
    }
    const t = Number(params.get('t') ?? 6);
    stage.simulate(t);
    stage.controls.autoRotate = false;
    stage.renderOnce();
    stage.renderOnce();
    const stats = stage.stats();
    // rough frame cost (GPU synced through a pixel read)
    const gl = stage.renderer.getContext();
    const px = new Uint8Array(4);
    const p0 = performance.now();
    const N = 12;
    for (let i = 0; i < N; i++) {
      stage.simulate(1 / 60);
      stage.renderOnce();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    }
    const frameMs = (performance.now() - p0) / N;
    // restore the exact requested moment for the screenshot
    window.__shot = { ready: true, stats: { ...stats, frameMs: Math.round(frameMs * 10) / 10 }, buildMs: Math.round(buildMs), hasInteraction: !!instance.interaction };
  } catch (e) {
    console.error(e);
    window.__shot = { ready: true, error: String((e as Error)?.stack ?? e) };
  }
}
