// DOM overlay: top bar, city panel, the bead thread, atlas panel, intro,
// interludes, epilogue, modals. Pure view; the app wires the behaviour.

import { CITIES } from '../data/cities';
import { SERIES, SERIES_BY_ID } from '../data/series';
import { FRAME } from '../data/frame';
import type { CityMeta } from '../core/types';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

const ICON = {
  atlas: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9c1.5 1.5 1.5 4.5 0 6M18.5 6.5c3 3 3 8 0 11"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10z"/><path d="M17 10l4 4M21 10l-4 4"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></svg>',
  full: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export type Action = 'index' | 'atlas' | 'journey' | 'sound' | 'hide' | 'full' | 'about' | 'prev' | 'next' | 'interact' | 'enter-atlas' | 'begin' | 'home' | 'epilogue-atlas' | 'epilogue-again';

export class UI {
  readonly root = document.getElementById('ui') as HTMLDivElement;
  readonly topbar: HTMLElement;
  readonly tools: Record<string, HTMLButtonElement> = {};
  readonly cityPanel: HTMLElement;
  readonly kicker: HTMLElement;
  readonly name: HTMLElement;
  readonly motto: HTMLElement;
  readonly caption: HTMLElement;
  readonly interactBtn: HTMLButtonElement;
  readonly hint: HTMLElement;
  readonly thread: HTMLElement;
  readonly beads = new Map<string, HTMLElement>();
  readonly beadTip: HTMLElement;
  readonly atlasPanel: HTMLElement;
  readonly tooltip: HTMLElement;
  readonly intro: HTMLElement;
  readonly interlude: HTMLElement;
  readonly epilogue: HTMLElement;
  readonly about: HTMLElement;
  readonly venice: HTMLElement;
  readonly index: HTMLElement;
  readonly loading: HTMLElement;
  readonly titleCardEl: HTMLElement;
  private titleTimer = 0;
  readonly journeyBar: HTMLElement;
  onAction: (a: Action) => void = () => {};
  onBead: (meta: CityMeta) => void = () => {};

  constructor() {
    const r = this.root;
    // top bar
    this.topbar = el('header', 'topbar');
    const word = el('button', 'wordmark', 'Invisible Cities<span>after Italo Calvino</span>');
    word.setAttribute('aria-label', 'Invisible Cities: home');
    word.onclick = () => this.onAction('home');
    const tools = el('nav', 'tools');
    const tool = (key: string, icon: string, title: string, act: Action) => {
      const b = el('button', '', icon);
      b.title = title;
      b.setAttribute('aria-label', title);
      b.onclick = () => this.onAction(act);
      tools.appendChild(b);
      this.tools[key] = b;
    };
    tool('atlas', ICON.atlas, 'The atlas (Esc)', 'atlas');
    tool('index', ICON.list, 'Index of the cities (I)', 'index');
    tool('journey', ICON.play, 'Journey through all cities (J)', 'journey');
    tool('sound', ICON.mute, 'Sound (M)', 'sound');
    tool('hide', ICON.eye, 'Hide the text (H)', 'hide');
    tool('full', ICON.full, 'Fullscreen (F)', 'full');
    tool('about', ICON.info, 'About', 'about');
    this.topbar.append(word, tools);

    // city panel
    this.cityPanel = el('section', 'city-panel');
    this.kicker = el('div', 'kicker');
    this.name = el('h1', 'city-name');
    this.motto = el('p', 'motto');
    this.caption = el('p', 'caption');
    this.interactBtn = el('button', 'interact', '<span class="glyph"></span><span class="label"></span>');
    this.interactBtn.onclick = () => this.onAction('interact');
    this.hint = el('p', 'hint');
    this.cityPanel.append(this.kicker, this.name, this.motto, this.caption, this.interactBtn, this.hint);
    this.cityPanel.onclick = (e) => {
      if (e.target === this.name || e.target === this.motto) this.cityPanel.classList.toggle('read');
    };

    // thread
    this.thread = el('nav', 'thread');
    this.thread.setAttribute('aria-label', 'The cities in the order of the book');
    const prev = el('button', 'arrow', ICON.prev);
    prev.title = 'Previous city (Left arrow)';
    prev.setAttribute('aria-label', prev.title);
    prev.onclick = () => this.onAction('prev');
    const next = el('button', 'arrow', ICON.next);
    next.title = 'Next city (Right arrow)';
    next.setAttribute('aria-label', next.title);
    next.onclick = () => this.onAction('next');
    const beads = el('div', 'beads');
    this.beadTip = el('div', 'bead-tip');
    for (let ch = 1; ch <= 9; ch++) {
      const group = el('div', 'chapter');
      const row = el('div', 'row');
      for (const c of CITIES.filter((x) => x.chapter === ch)) {
        const b = el('button', 'bead');
        b.style.setProperty('--c', SERIES_BY_ID[c.series].color);
        b.setAttribute('aria-label', `${c.name}, ${SERIES_BY_ID[c.series].name} ${c.number}`);
        b.onclick = () => this.onBead(c);
        b.onmouseenter = () => {
          const rr = b.getBoundingClientRect();
          const tr = this.thread.getBoundingClientRect();
          this.beadTip.innerHTML = `${esc(c.name)}<small>${esc(SERIES_BY_ID[c.series].name)} ${c.number}</small>`;
          this.beadTip.style.left = `${rr.left + rr.width / 2 - tr.left}px`;
          this.beadTip.classList.add('show');
        };
        b.onmouseleave = () => this.beadTip.classList.remove('show');
        row.appendChild(b);
        this.beads.set(c.id, b);
      }
      group.append(row, el('span', 'roman', ROMAN[ch - 1]));
      beads.appendChild(group);
    }
    this.thread.append(prev, beads, next, this.beadTip);

    // atlas panel
    this.atlasPanel = el('section', 'atlas-panel');
    const legend = SERIES.map((s) => `<span style="--c:${s.color}"><i></i>${esc(s.name)}</span>`).join('');
    this.atlasPanel.innerHTML = `<h2>The Atlas of the Great Khan</h2><p class="note"></p><div class="legend">${legend}</div>`;
    const begin = el('button', 'btn primary', 'Begin the journey');
    begin.onclick = () => this.onAction('begin');
    this.atlasPanel.appendChild(begin);

    this.tooltip = el('div', 'tooltip passive');

    // intro
    this.intro = el('section', 'intro');
    this.intro.innerHTML = `<div class="intro-inner">
      <p class="pre">Italo Calvino</p>
      <h1>Invisible Cities</h1>
      <p class="sub">fifty-five cities, as Marco Polo described them to Kublai Khan</p>
      <div class="rule"></div>
      <p class="text"></p>
      <div class="actions"></div>
      <p class="small">Drag to look around, scroll to approach. Sound can be enabled in the top bar.</p>
    </div>`;
    const actions = this.intro.querySelector('.actions')!;
    const b1 = el('button', 'btn primary', 'Open the atlas');
    b1.onclick = () => this.onAction('enter-atlas');
    const b2 = el('button', 'btn', 'Begin the journey');
    b2.onclick = () => this.onAction('begin');
    actions.append(b1, b2);

    // interlude, epilogue
    this.interlude = el('section', 'interlude passive', '<div class="inner"><p class="ch"></p><h2></h2><p class="text"></p></div>');
    this.epilogue = el('section', 'epilogue', '<div class="inner"><p class="ch">The end of the journey</p><h2>The inferno of the living</h2><p class="text"></p><div class="actions"></div></div>');
    const ea = this.epilogue.querySelector('.actions')!;
    const e1 = el('button', 'btn primary', 'Return to the atlas');
    e1.onclick = () => this.onAction('epilogue-atlas');
    const e2 = el('button', 'btn', 'Begin again');
    e2.onclick = () => this.onAction('epilogue-again');
    ea.append(e1, e2);

    // modals
    this.about = this.modal('About this atlas', '');
    this.venice = this.modal('Venice', '');
    this.index = this.modal('The fifty-five cities', '');
    this.index.classList.add('index-modal');
    const cols = [1, 2, 3, 4, 5, 6, 7, 8, 9]
      .map((ch) => {
        const items = CITIES.filter((c) => c.chapter === ch)
          .map((c) => `<li><button data-id="${c.id}" style="--c:${SERIES_BY_ID[c.series].color}"><i></i>${esc(c.name)}<small>${esc(SERIES_BY_ID[c.series].name)} ${c.number}</small></button></li>`)
          .join('');
        return `<div class="col"><h3>${ROMAN[ch - 1]}</h3><ol>${items}</ol></div>`;
      })
      .join('');
    (this.index.querySelector('.body') as HTMLElement).innerHTML = `<div class="index-grid">${cols}</div>`;
    this.index.querySelectorAll<HTMLButtonElement>('button[data-id]').forEach((b) => {
      b.onclick = () => {
        this.index.classList.remove('show');
        const c = CITIES.find((x) => x.id === b.dataset.id);
        if (c) this.onBead(c);
      };
    });

    this.loading = el('div', 'loading passive');
    this.titleCardEl = el('div', 'title-card passive', '<p class="tc-kicker"></p><h2 class="tc-name"></h2>');
    this.journeyBar = el('div', 'journey-bar passive', '<div class="fill"></div>');

    r.append(this.titleCardEl, this.intro, this.atlasPanel, this.cityPanel, this.thread, this.tooltip, this.interlude, this.epilogue, this.loading, this.journeyBar, this.topbar, this.about, this.venice, this.index);
    this.fillTexts();
  }

  private modal(title: string, body: string): HTMLElement {
    const m = el('section', 'modal');
    m.innerHTML = `<div class="card"><div class="card-head"><h2>${esc(title)}</h2><button class="x" aria-label="Close">&times;</button></div><div class="body">${body}</div></div>`;
    m.onclick = (e) => {
      if (e.target === m || (e.target as HTMLElement).classList.contains('x')) m.classList.remove('show');
    };
    return m;
  }

  fillTexts() {
    (this.intro.querySelector('.text') as HTMLElement).textContent = FRAME.introText;
    (this.atlasPanel.querySelector('.note') as HTMLElement).textContent = FRAME.atlasNote;
    (this.epilogue.querySelector('.text') as HTMLElement).textContent = FRAME.epilogueText;
    (this.venice.querySelector('.body') as HTMLElement).innerHTML = `<p>${esc(FRAME.veniceNote)}</p>`;
    (this.about.querySelector('.body') as HTMLElement).innerHTML = `<p>${esc(FRAME.aboutText)}</p>
      <div class="keys">
        <kbd>&larr; &rarr;</kbd><span>previous / next city, in the order of the book</span>
        <kbd>Space</kbd><span>the city's transformation, when it has one</span>
        <kbd>J</kbd><span>the journey: all cities in order, with the chapters' interludes</span>
        <kbd>Esc</kbd><span>back to the atlas</span>
        <kbd>I</kbd><span>the index of all cities, chapter by chapter</span>
        <kbd>H</kbd><span>hide the text and look</span>
        <kbd>M</kbd><span>sound on or off</span>
        <kbd>F</kbd><span>fullscreen</span>
      </div>`;
  }

  showCity(meta: CityMeta, interaction: { label: string; activeLabel?: string } | null, active: boolean) {
    const s = SERIES_BY_ID[meta.series];
    this.cityPanel.style.setProperty('--series', meta.order === 0 ? '#d6b166' : s.color);
    this.kicker.innerHTML =
      meta.order === 0
        ? `<span class="dot"></span><span>The city never named</span>`
        : `<span class="dot"></span><span>${esc(s.name)}</span><span class="num">${meta.number}</span><span class="sep">&middot;</span><span>Chapter ${ROMAN[meta.chapter - 1]}</span>`;
    this.name.textContent = meta.name;
    this.motto.textContent = meta.motto;
    this.caption.textContent = meta.caption;
    this.setInteraction(interaction, active);
    this.hint.textContent = '';
    for (const [id, b] of this.beads) b.classList.toggle('current', id === meta.id);
  }

  setInteraction(interaction: { label: string; activeLabel?: string } | null, active: boolean) {
    this.interactBtn.hidden = !interaction;
    if (interaction) {
      (this.interactBtn.querySelector('.label') as HTMLElement).textContent = active ? interaction.activeLabel ?? interaction.label : interaction.label;
      this.interactBtn.classList.toggle('active', active);
    }
  }

  setVisited(ids: Set<string>) {
    for (const [id, b] of this.beads) b.classList.toggle('visited', ids.has(id));
  }

  setJourney(on: boolean) {
    this.tools.journey.innerHTML = on ? ICON.pause : ICON.play;
    this.tools.journey.classList.toggle('on', on);
    this.journeyBar.classList.toggle('show', on);
  }

  setJourneyProgress(f: number) {
    (this.journeyBar.firstElementChild as HTMLElement).style.width = `${Math.max(0, Math.min(1, f)) * 100}%`;
  }

  setSound(on: boolean) {
    this.tools.sound.innerHTML = on ? ICON.sound : ICON.mute;
    this.tools.sound.classList.toggle('on', on);
  }

  showTooltip(meta: CityMeta | null, x = 0, y = 0) {
    if (!meta) {
      this.tooltip.classList.remove('show');
      return;
    }
    const s = SERIES_BY_ID[meta.series];
    this.tooltip.innerHTML = `<div class="t-name">${esc(meta.name)}</div><div class="t-meta">${esc(s.name)} ${meta.number} &middot; Chapter ${ROMAN[meta.chapter - 1]}</div>${meta.motto ? `<div class="t-motto">${esc(meta.motto)}</div>` : ''}`;
    this.moveTooltip(x, y);
    this.tooltip.classList.add('show');
  }

  moveTooltip(x: number, y: number) {
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  showInterlude(chapter: number, title: string, text: string) {
    (this.interlude.querySelector('.ch') as HTMLElement).textContent = `Chapter ${ROMAN[chapter - 1]}`;
    (this.interlude.querySelector('h2') as HTMLElement).textContent = title;
    (this.interlude.querySelector('.text') as HTMLElement).textContent = text;
    this.interlude.classList.add('show');
  }

  /** A centred title that announces the city on arrival, then gives way to the panel. */
  titleCard(meta: CityMeta) {
    const s = SERIES_BY_ID[meta.series];
    (this.titleCardEl.querySelector('.tc-kicker') as HTMLElement).textContent =
      meta.order === 0 ? 'The city never named' : `${s.name}  ${meta.number}`;
    (this.titleCardEl.querySelector('.tc-name') as HTMLElement).textContent = meta.name;
    this.titleCardEl.style.setProperty('--series', meta.order === 0 ? '#d6b166' : s.color);
    this.titleCardEl.classList.remove('show');
    void this.titleCardEl.offsetWidth;
    this.titleCardEl.classList.add('show');
    clearTimeout(this.titleTimer);
    this.titleTimer = window.setTimeout(() => this.titleCardEl.classList.remove('show'), 2600);
  }

  setLoading(name: string | null) {
    if (name) this.loading.innerHTML = `<small>Marco Polo describes</small>${esc(name)}`;
    this.loading.classList.toggle('show', !!name);
  }

  setMode(mode: 'intro' | 'atlas' | 'city' | 'epilogue') {
    document.body.classList.remove('mode-intro', 'mode-atlas', 'mode-city', 'mode-epilogue');
    document.body.classList.add('mode-' + mode);
    this.intro.classList.toggle('show', mode === 'intro');
    this.atlasPanel.classList.toggle('show', mode === 'atlas');
    this.epilogue.classList.toggle('show', mode === 'epilogue');
    if (mode !== 'city') this.cityPanel.classList.remove('show');
    if (mode !== 'atlas') this.showTooltip(null);
  }
}
