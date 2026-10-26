// Interludes in the Khan's garden, one before each chapter. Original paraphrases.

export interface Interlude {
  chapter: number;
  title: string;
  text: string;
}

export const INTERLUDES: Interlude[] = [
  {
    chapter: 1,
    title: 'The envoy',
    text: 'Kublai Khan does not believe everything the young Venetian tells him. Still, he listens to Marco Polo more closely than to any other envoy. His empire is too vast to be known and already beginning to rot; in these reports he hopes to glimpse a pattern fine enough to escape the termites.',
  },
  {
    chapter: 2,
    title: 'Gestures and objects',
    text: 'At first Marco knew none of the languages of the East. He spoke with gestures, leaps and cries, and with things pulled from his bags: feathers, shells, a quartz, a toy. The Khan read them like emblems. Later, when they shared words, the emblems were missed; the words said less.',
  },
  {
    chapter: 3,
    title: 'The negative mirror',
    text: 'Every new city Marco reaches teaches him something about the cities behind him. Arriving, the traveler finds a past he did not know he had. Elsewhere is a mirror in negative: it shows the little that is his, and the great deal he has never had and never will.',
  },
  {
    chapter: 4,
    title: 'The Khan describes',
    text: 'The Khan begins to describe cities himself and asks Marco whether they exist. Marco answers that the cities the Khan imagines are made like dreams, of desires and fears, their rules absurd and their perspectives deceptive. And a city, like a dream, must hide a question or a fear inside it.',
  },
  {
    chapter: 5,
    title: 'The arch',
    text: 'Marco describes a bridge, stone by stone. Which stone holds it up, the Khan asks. No single stone, says Marco, but the line of the arch they form together. Then why tell me of the stones, the Khan replies. It is only the arch that matters. Without stones, says Marco, there is no arch.',
  },
  {
    chapter: 6,
    title: 'Venice',
    text: 'There is one city you never speak of, the Khan says. Marco smiles. Every time he describes a city, he is saying something about Venice. He fears to lose it all at once if he speaks of it, or perhaps, by speaking of other cities, he has already been losing it little by little.',
  },
  {
    chapter: 7,
    title: 'The garden',
    text: 'Perhaps the garden exists only in the shadow of their lowered eyelids, the Khan wonders. Perhaps they have never left it, and the cities are only words. Or perhaps they are two beggars on a rubbish heap, and the garden and the empire are what they imagine there among the rags.',
  },
  {
    chapter: 8,
    title: 'The chessboard',
    text: 'The Khan stops listening to cities and studies chess instead, hoping the game will hold the order of his empire. Every conquest ends on a single square of planed wood. Then Marco reads the square: the grain of a branch that budded early, the hole of a larva, the forest and the logs on the river, until the plain wood holds the whole world.',
  },
  {
    chapter: 9,
    title: 'The atlas',
    text: 'The Khan owns an atlas that holds every city: those that exist, those that are gone, and those not yet founded, cities of promise and cities of nightmare. Marco turns its pages: the cities he has described are all there, and many he has not, and some whose names nobody yet knows. The Khan asks where the journey leads, and fears the last landing place is the city of hell.',
  },
];

export const EPILOGUE: Interlude = {
  chapter: 10,
  title: 'The inferno of the living',
  text: 'If there is a hell, Marco says, it is not waiting at the end; we already live in it together, every day. One may escape it by sinking into it until it can no longer be seen. Or one may keep watch, learning to tell apart the people and things within it that are not hell, and help them last, and make room for them.',
};
