# Invisible Cities

An atlas of the fifty-five cities of Italo Calvino's *Invisible Cities* (*Le città invisibili*, 1972),
built with three.js. Every city is a procedural diorama written in code (no models, no image textures),
floating in its own weather; the cities are gathered on the Great Khan's atlas, a lacquered rose window
whose eleven sectors are the book's thematic series and whose five rings are their appearances, joined by
a golden thread that follows the order in which Marco Polo tells them.

## Run

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # typecheck + production build into dist/
pnpm preview      # serve the production build
```

## Use

- **Atlas**: hover a medallion to read it, click to enter the city. The chessboard at the centre is Venice.
- **City**: drag to orbit, scroll to approach. Many cities have a transformation (button or `Space`):
  Valdrada's mirror, Zemrude's up and down, Moriana's other face, Despina seen from the sea...
- **Journey** (`J`): all fifty-five cities in the book's order, with the chapters' interludes between them,
  ending with the epilogue.
- Keys: `Left/Right` previous/next city, `Esc` atlas, `H` hide text, `M` sound, `F` fullscreen.
- Sound: a generative ambient score (Web Audio), different for each series and for day and night.

## Structure

- `src/core`: stage (renderer, sky, light, image based lighting, post-processing, transitions), city loader, audio.
- `src/kit`: the procedural toolkit shared by all cities (geometry, batching, architecture, nature,
  terrain, water, inhabitants, particles, lettering).
- `src/cities/<id>.ts`: one module per city (lazy loaded). `docs/CITY_GUIDE.md` describes the contract.
- `src/atlas`: the Khan's atlas. `src/app`, `src/ui`: the experience and its interface.
- `scripts/shot.mjs`: deterministic screenshots of a city (headless Chromium) with render stats.
  `scripts/thumbs.mjs`: renders the medallion thumbnails into `public/thumbs`.

## Texts

Captions, mottos and interludes are original paraphrases written for this atlas; no passages of the book
are reproduced. *Invisible Cities* is by Italo Calvino (English translation by William Weaver, 1974).
