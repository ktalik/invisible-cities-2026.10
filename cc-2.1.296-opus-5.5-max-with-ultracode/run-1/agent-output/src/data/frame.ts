// Frame texts (original paraphrases written for this atlas, not quotations).

export interface Interlude {
  chapter: number;
  title: string;
  text: string;
}

export const FRAME = {
  introTitle: 'Invisible Cities',
  introText:
    'In the garden of his summer palace, as the evening cools, the aging Kublai Khan listens to a young Venetian. Marco Polo has been sent to the farthest provinces of the empire and returns with cities: fifty-five of them, each stranger than the last, each perhaps the same one. The Khan does not believe everything he hears. He listens anyway. Wander the atlas as he did: city by city, or in the order of the telling.',
  chapterInterludes: [
    {
      chapter: 1,
      title: 'The emperor listens',
      text: 'Kublai Khan suspects that Marco Polo invents half of what he says, yet he listens to no envoy with more attention. Beyond the reports of conquest lies an empire too vast to hold; only in these accounts can he glimpse, through the walls of its decay, a pattern fine enough to escape the termites.',
    },
    {
      chapter: 2,
      title: 'Objects and gestures',
      text: 'Before he knew the language, Marco spoke with things drawn from his bags: ostrich plumes, quartz, a quiver, an hourglass; with leaps, cries of wonder and of horror. Each emblem could mean many cities. Later the words came, and the Khan found he missed the uncertainty that had held them all.',
    },
    {
      chapter: 3,
      title: 'Cities of the mind',
      text: 'Kublai begins to describe cities of his own, built from elements he combines in his head, and asks if they exist. Marco answers that one can combine endlessly, but a city is not only a sum of parts: it needs a thread that binds it, a desire or a fear, and a question to which it answers.',
    },
    {
      chapter: 4,
      title: 'Ashes and stones',
      text: 'The Khan notices that Marco speaks of cities as if he moved among them in a trance. Perhaps, he says, the garden and the palace are all that exist, and the journeys only a story told to pass the evening. Marco shrugs: whether they are dreamed or walked, the cities are made of the same stones.',
    },
    {
      chapter: 5,
      title: 'The bridge and the arch',
      text: 'Marco describes a bridge stone by stone. Which is the stone that bears the bridge? None, he says: the bridge is borne by the line of the arch. Then why speak of stones, asks the Khan; it is only the arch that matters. Without the stones, Marco answers, there is no arch.',
    },
    {
      chapter: 6,
      title: 'The one city',
      text: 'There is one city Marco never mentions. When the Khan presses him, he smiles: every time he describes a city he is speaking of Venice. He is afraid that if he names it he will lose it all at once; or perhaps, in speaking of the others, he has already been losing it little by little.',
    },
    {
      chapter: 7,
      title: 'What the traveller seeks',
      text: 'Do you travel to relive your past, the Khan asks, or to find your future? Marco answers that elsewhere is a mirror in reverse: the traveller recognizes the little that is his by discovering the much he has never had and never will. Each city he reaches holds a past he did not know he had.',
    },
    {
      chapter: 8,
      title: 'The chessboard',
      text: 'Kublai sets aside the descriptions and plays chess, believing the rules of the game might hold the order of his empire. Checkmate leaves only a square of bare planed wood. Marco reads it aloud: a knot of the tree, the year of a drought, the grain of forests, the river that floated the logs, a woman at a window.',
    },
    {
      chapter: 9,
      title: 'The atlas',
      text: 'The Khan owns an atlas that shows every city, those that are, those that were, and those not yet founded, along with the cities of the future: endless suburbs, cities like tents, cities of nightmare. He turns its pages and asks where the current is carrying them all. Marco speaks of the inferno, and of what is not.',
    },
  ] as Interlude[],
  epilogueText:
    'The inferno of the living, says Marco, is not something to come: it is already here, the one we live in every day, the one we make by being together. There are two ways not to suffer it. The first is easy: accept it and become part of it until you no longer see it. The second asks for vigilance and learning: to seek out who and what, in the midst of the inferno, is not inferno, and to make it last, and give it room.',
  veniceNote:
    'The one city Marco never names is the one he speaks of all the time. Venice is the ground every other city is measured against, the first city from which the traveller departs and to which each description returns. He fears that to name it would be to lose it at once; to describe the others is to lose it slowly, and to keep it.',
  atlasNote:
    'The eleven series of the book are the eleven sectors of this rose. Each series appears five times, in rings that grow outward from the centre as the book proceeds. A golden thread follows the order of the telling; its nine chapters wind across the sectors as spiral arms. At the centre, the Khan\'s chessboard: the city that holds all the others.',
  aboutText:
    'An homage to Italo Calvino\'s Invisible Cities (Le citta invisibili, 1972; English translation by William Weaver, 1974). Each of the fifty-five cities is a procedural diorama built in code with three.js: no models, no image textures. Captions, mottos and interludes are original paraphrases written for this atlas, not quotations from the book, which deserves to be read whole.',
};
