# City builder's guide

This project is a three.js atlas of the 55 cities of Italo Calvino's *Invisible Cities*.
Every city is ONE TypeScript module, `src/cities/<id>.ts`, that procedurally builds a
3D diorama (no external models, images or textures: only code, primitives, instancing,
canvas textures and shaders). The engine supplies sky, fog, sun + shadows, image based
lighting from the sky, bloom, tilt-shift, grading, camera controls and UI.

Read `src/cities/diomira.ts` first: it is the reference implementation (API usage,
structure, level of ambition). Then skim `src/kit/*.ts` (the toolkit) and
`src/core/types.ts` (the contract).

## The contract

```ts
import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;              // deterministic RNG seeded by the city id: ALWAYS use it (never Math.random)
  const root = new THREE.Group();   // put everything in here
  ...
  return {
    root,
    env: { ... },                   // Partial<EnvSpec>: sky, fog, sun, bloom, grade (see core/types.ts and core/sky.ts DEFAULT_ENV)
    camera: { position, target, minDistance, maxDistance, maxPolar, autoRotate, views: [overview, detail] },
    update(t, dt) { ... },          // t = seconds since the city appeared (deterministic in screenshots)
    interaction: { label, activeLabel, hint, set(on) { toggle.set(on) } },   // optional, see below
    dispose() { ... },              // optional extra cleanup; geometries/materials/textures under root are disposed automatically
  };
};
export default build;
```

- Ground is y = 0. The city should fit within a radius of about 12 to 22 units. A person is ~0.25 units tall,
  a house 1 to 3 units. Keep the composition readable from the default camera.
- The engine disposes everything under `root` when leaving the city. Do not add things to the scene directly.
- `update` must be a pure function of `t` and/or accumulate with `dt` (both are deterministic in the harness).
  Do not use `Date.now()`, `performance.now()` or `Math.random()` anywhere.
- Shared cached materials (`K.M.*`, `K.finish(...)`, `K.std(...)`, `K.waterMaterial`) must NEVER be mutated
  (no `.color.set`, `.opacity =` on them). If you need to animate a material, create your own
  `new THREE.MeshStandardMaterial(...)` / `MeshBasicMaterial` / `ShaderMaterial`.
- Global shader time: `K.U.time` (a uniform object `{ value }`) is advanced by the engine; plug it into your
  own ShaderMaterials as `uTime: K.U.time` to animate on the GPU for free.
- Only edit YOUR file `src/cities/<id>.ts`. If you really need private helpers, put them in
  `src/cities/_<id>.ts` (files starting with `_` are not treated as cities). Never edit `src/kit`, `src/core`,
  other cities, configs or package.json. If the kit has a bug, work around it locally and report it.

## The toolkit (src/kit, imported as `K`)

- `K.Batch`: the workhorse. `b.add(geometry, colour, finish, intensity?)` then `root.add(b.build())`.
  Everything with the same finish merges into one draw call with vertex colours.
  Finishes: `matte plaster stone wood cloth ceramic polished metal gold silver bronze glass glow ghost`.
  `glow` is unlit; intensity > 1 makes it bloom (windows, lamps, embers, magic).
- Geometry (`K.box cyl cone pyramid sphere dome onion torus lathe plane disc ring wallPlane gableRoof hipRoof
  shedRoof extrudeUp extrudeZ prism ngon archWall archBand stairs spiralStair strut tube rope ropePoints
  crenelRing radial`): standing solids are base-anchored on y = 0; spheres/tori centred.
  Transform with `K.at(geo, x, y, z, { rx, ry, rz, s })` (scale, rotate, translate; returns the geometry).
  `K.paint`, `K.paintBy` (vertex colour by position: gradients, weathering), `K.merge`, `K.smooth`.
- Architecture (all add to a Batch): `K.house`, `K.tower`, `K.cityWall`, `K.column`, `K.temple`, `K.domeHall`,
  `K.minaret`, `K.bridge`, `K.lamp`, `K.arcade`, `K.flag`, `K.stall`, `K.chimney`, `K.well`, `K.statue`,
  `K.fountain`, `K.block`, `K.timber`, `K.roof`.
- Nature: `K.tree` (cypress round palm pine poplar olive willow shrub), `K.rock`, `K.forest`, `K.wobble`.
- Ground: `K.island` (floating island with flat buildable top, returns `{ mesh, heightAt, rimAt }`),
  `K.plinth`, `K.terrain` (heightfield), `K.groundDisc`.
- Water: `K.waterDisc`, `K.waterRect`, `K.waterMesh`, `K.waterMaterial` (animated normals, reflects the sky).
  For a true mirror use `Reflector` from `three/addons/objects/Reflector.js` (costly: one extra scene render).
- Inhabitants: `K.crowd` (static instanced people), `K.Walkers` (people walking along paths; call
  `walkers.update(t)`), `K.personGeometry`, `K.figureMaterial`, `K.quadruped` (dog/goat/camel/rat/cat via options),
  `K.Flock` (birds; `flock.update(t)`), `K.birdGeometry`, `K.boatGeometry`, `K.sailboatGeometry`.
- Instancing: `K.instanced(geo, mat, count, (i, obj, color) => {...})`, `K.instanceSetter(mesh)` for animation.
- Effects (GPU animated, no update needed): `K.particles` (dust, fireflies, snow, embers, petals),
  `K.smoke`, `K.cloudSea` (mist below floating cities), `K.glowSprite`, `K.glowPoints` (many halos, one draw call),
  `K.beam` (cone of light), `K.lines` / `K.polyline` (1px threads).
- Text and canvas: `K.textSprite`, `K.textPlane`, `K.textTexture`, `K.canvasTexture` (draw patterns, carpets, maps).
- Maths: `K.RNG`, `K.noise2 noise3 fbm2 fbm3 ridged2`, `K.GLSL_NOISE` (snoise/fbm3/hash for shaders),
  `K.lerp clamp smoothstep easeInOut damp wave pingpong fract`, `K.Toggle` (eased 0..1 for interactions),
  colours `K.col mix shade jitter hsl pickJitter`.

## Environment (`env`)

Every field of `EnvSpec` (src/core/types.ts) is optional; defaults are in `src/core/sky.ts` (`DEFAULT_ENV`).
Most important: `skyTop skyHorizon skyBottom skyCurve fog fogNear fogFar sunDir sunColor sunIntensity sunDisc
sunGlow moon hemiSky hemiGround hemiIntensity envIntensity stars clouds cloudColor exposure bloomStrength
bloomThreshold bloomRadius vignette grain saturation contrast tint tiltShift shadowRadius shadows`.
- `fog` defaults to `skyHorizon`; the scene background is the fog colour, so the city melts into its sky.
  Keep `fogNear` beyond the near side of the city (e.g. 60-100) unless haze is part of the idea; heavy fog
  makes everything milky.
- `shadowRadius` should just cover the city (e.g. 1.1 x city radius) for crisp shadows.
- Night scenes: low `sunIntensity` (moonlight 0.4-1.0, bluish), `stars` 0.6-1, lit windows via the `glow`
  finish, `bloomStrength` 0.6-1.0. Keep enough fill light (hemi/env) that forms still read.
- Tone mapping is Khronos PBR Neutral: colours stay close to the hex values you choose.

## Interaction (optional toggle)

If the brief proposes one, implement it with `const tog = new K.Toggle(speed)`; `set: (on) => tog.set(on)`;
in `update` call `tog.update(dt)` and use `tog.value` (0..1 eased) to animate the transformation smoothly
(2 to 4 seconds). It must be visually striking and express the city's idea. Optionally provide `camera`
(a view the engine flies to while active). The harness can render the toggled state with `--toggle`.

## Art direction

Each city is a precious miniature floating in its own weather: a diorama you could hold in your palm, crafted
with the care of an illuminated manuscript and the wit of Calvino. Aim for an image that would make a
beautiful print.
- ONE clear idea, legible at a glance from the default camera: the conceit of the city must be visible
  (a viewer who knows the book should recognise the city without its name).
- Faithful details: use the concrete objects, numbers, materials and colours from the brief.
- Strong composition: a focal point, a readable silhouette, layered depth, considered negative space.
- Light: choose a time of day and weather that suit the city; use the sun for form and shadow, HDR glow for
  lamps and magic. Distinct palette per city (from the brief), harmonious, not garish.
- Rich but disciplined detail: hundreds to thousands of elements through Batch and instancing, with
  variation (jitter colours, sizes, rotations). Avoid big flat empty surfaces and random noise clutter.
- Life: at least two kinds of motion (people, birds, water, smoke, light, the conceit itself animating).
- Craft: nothing floating by accident, no z-fighting (offset coplanar layers by 0.01+), no visible seams
  that look broken, no gigantic or microscopic elements by mistake.

## Performance budget (headless GTX 1060, 1280x800, reported by the harness)

- `frameMs` under 12 (ideally under 8), `triangles` under 1.5M, `calls` under 250, `buildMs` under 1500.
- Use Batch merging and instancing. Avoid thousands of separate meshes, per-frame geometry rebuilds,
  per-frame material creation, and more than a few real-time lights (PointLights are expensive; prefer glow).

## Verify your work (required)

The dev server runs on http://127.0.0.1:5173 (the harness starts its own if needed).

```bash
pnpm exec tsc --noEmit 2>&1 | grep "cities/<id>"          # must print nothing
node scripts/shot.mjs <id> --views 0,1,2                   # writes shots/<id>/<id>-v0.png ... and a JSON report
node scripts/shot.mjs <id> --views 0 --toggle              # the interaction's active state
node scripts/shot.mjs <id> --views 0 --t 20                # a later moment of the animation
```

Then LOOK at the PNGs with the Read tool and critique them harshly against the brief and this guide.
Iterate (at least three render-and-improve rounds). The JSON report lists runtime errors (must be empty),
`frameMs`, `triangles`, `calls`, `buildMs`.
