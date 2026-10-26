import type { Gen } from './types';
import { memory } from './memory';
import { desire } from './desire';
import { signs } from './signs';
import { thin } from './thin';
import { trading } from './trading';
import { eyes } from './eyes';
import { names } from './names';
import { dead } from './dead';
import { sky } from './sky';
import { continuous } from './continuous';
import { hidden } from './hidden';

export const GENERATORS: Record<string, Gen> = {
  ...memory,
  ...desire,
  ...signs,
  ...thin,
  ...trading,
  ...eyes,
  ...names,
  ...dead,
  ...sky,
  ...continuous,
  ...hidden,
};
