// Lazy registry of city modules: src/cities/<id>.ts (files starting with '_' are helpers).

import type { CityBuilder } from '../core/types';

const modules = import.meta.glob<{ default: CityBuilder }>(['./*.ts', '!./_*.ts', '!./registry.ts']);

const byId = new Map<string, () => Promise<{ default: CityBuilder }>>();
for (const [path, loader] of Object.entries(modules)) {
  const id = path.replace('./', '').replace('.ts', '');
  byId.set(id, loader);
}

export function hasCity(id: string): boolean {
  return byId.has(id);
}

export async function loadCity(id: string): Promise<CityBuilder | null> {
  const loader = byId.get(id);
  if (!loader) return null;
  const mod = await loader();
  return mod.default;
}
