# Invisible Cities

A three.js atlas of the fifty-five cities Marco Polo describes to Kublai Khan in Italo Calvino's *Le città invisibili* (1972).

Every city is a small, procedurally built model on a lagoon at eternal dusk. Each one is designed from its own text rather than drawn from a shared template: Octavia hangs in a net between two cliffs, Valdrada stands over its upside-down twin, Armilla is nothing but plumbing, Zemrude changes with the angle you look at it from, Penthesilea's center moves away as you approach, Olinda grows ring by ring from a pinpoint, and Berenice folds just and unjust cities inside one another.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # static site in dist/
pnpm preview
```

## How to travel

| Input | Action |
| --- | --- |
| Drag / scroll | orbit and approach |
| Click a city or its name | sail there and read about it |
| Space | start or pause the guided journey in reading order, with the interludes in the Khan's garden |
| Left / Right | previous or next city |
| 1 / 2 / 3 | arrange the cities as **Journey** (reading order, spiralling out from the garden), **Atlas** (eleven themes, five cities each) or **Structure** (the theme by number grid turned 45 degrees, so that each row is one chapter of the book) |
| I | index of chapters and themes; click a theme to raise its five cities |
| M | generative sound (a drone over the water, distant bells) |
| H | help |
| Esc | back to the whole atlas |

Each city has a deep link, for example `/#octavia` or `/#garden`.

## How it is made

- `src/data/cities.ts` holds the 55 cities in reading order with their chapter, theme and number. The descriptions and interludes are short original paraphrases written for this project, not quotations from the book.
- `src/engine/kit.ts` is a small construction kit. Primitives get per-vertex colors and are merged by material, so each city costs only a handful of draw calls. It also supports animated sub-groups, lines, points and a color tint, which Valdrada's reflection and Eusapia's city of the dead use.
- `src/cities/*.ts` has one generator per city, grouped by the eleven themes.
- `src/engine/world.ts` has the dusk sky shader (clouds, stars, moon), the lagoon shader (it can open shafts for cities that go underground), lights, shadows that follow the camera, and post-processing (bloom, grading, grain).
- `src/engine/layout.ts` defines the three arrangements; cities glide between them.
- `src/engine/ambience3d.ts` holds Marco's boat, which sails the dotted route and goes around the islands, plus the pools of light and the drifting motes.
- `src/audio.ts` synthesizes all of the sound with WebAudio. No samples are loaded.

Read the book.
