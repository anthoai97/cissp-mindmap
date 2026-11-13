import type { MindMap, MindNode } from './data';

/** A topic that can be asked about, with its map and the topics above it for context. */
export interface Card {
  /** Unique across maps: "<map id>/<node id>". Node ids are only unique within a map. */
  key: string;
  map: MindMap;
  node: MindNode;
  parents: MindNode[];
  /**
   * The answer as shown to the reader: the title, or "Parent › Title" when other topics share
   * the title ("Wi-Fi › Protocols"), so a generic answer says which one it is.
   */
  label: string;
}

/** One question in a run: the card asked about and the four options, as card keys. */
export interface Question {
  id: string;
  options: string[];
}

/** A pass through every card, saved so it can be resumed. */
export interface Run {
  deck: Question[];
  /** Chosen card key per answered question, in deck order. */
  answers: string[];
  /** Index of the question on screen; equals deck.length once the summary shows. */
  position: number;
}

export interface Stats {
  runs: number;
  best: number;
  last: number;
}

export const OPTION_COUNT = 4;

export function cardsOf(maps: MindMap[]): Card[] {
  const cards: Card[] = [];
  for (const map of maps) {
    const walk = (nodes: MindNode[], parents: MindNode[]) => {
      for (const node of nodes) {
        if (node.description.trim()) cards.push({ key: `${map.id}/${node.id}`, map, node, parents, label: node.title });
        walk(node.children, [...parents, node]);
      }
    };
    walk(map.nodes, []);
  }
  const uses = new Map<string, number>();
  for (const card of cards) uses.set(titleKey(card), (uses.get(titleKey(card)) ?? 0) + 1);
  for (const card of cards) {
    const parent = card.parents.at(-1);
    if (parent && (uses.get(titleKey(card)) ?? 0) > 1) card.label = `${parent.title} › ${card.node.title}`;
  }
  return cards;
}

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

const titleKey = (card: Card) => card.node.title.trim().toLowerCase();
const topBranch = (card: Card) => (card.parents[0] ?? card.node).id;

/**
 * Wrong answers, nearest first so they are hard to tell apart: siblings, then the same
 * branch, then the same map, and only then other maps. No two options share a title.
 */
function distractors(card: Card, cards: Card[]): Card[] {
  const sameMap = cards.filter((c) => c.map === card.map);
  const parent = card.parents.at(-1);
  const pools = [
    sameMap.filter((c) => c.parents.at(-1) === parent),
    sameMap.filter((c) => topBranch(c) === topBranch(card)),
    sameMap,
    cards,
  ];
  const taken = new Set([titleKey(card)]);
  const picked: Card[] = [];
  for (const pool of pools) {
    for (const c of shuffle(pool)) {
      if (picked.length === OPTION_COUNT - 1) return picked;
      if (taken.has(titleKey(c))) continue;
      taken.add(titleKey(c));
      picked.push(c);
    }
  }
  return picked;
}

/**
 * The cards that make fair questions. A card is left out when, once the answer is blanked
 * out, too little of its description remains ("The layer 3 _____."), or when another card in
 * the same map has the same description (ITSEC E1 to E5), so nothing tells them apart.
 * Cards left out still appear as wrong answers.
 */
export function askableCards(cards: Card[]): Card[] {
  const sameText = new Map<string, number>();
  const textKey = (card: Card) => `${card.map.id}\n${card.node.description.trim()}`;
  for (const card of cards) sameText.set(textKey(card), (sameText.get(textKey(card)) ?? 0) + 1);
  return cards.filter(
    (card) =>
      sameText.get(textKey(card)) === 1 &&
      maskedDescription(card.node).replace(/_____|[\s.,;:()-]/g, '').length >= 12,
  );
}

/** A fresh run: every askable card once, in a new random order, each with newly picked options. */
export function newRun(cards: Card[]): Run {
  const deck = shuffle(askableCards(cards)).map((card) => ({
    id: card.key,
    options: shuffle([card.key, ...distractors(card, cards).map((c) => c.key)]),
  }));
  return { deck, answers: [], position: 0 };
}

export const score = (run: Run) => run.answers.filter((answer, i) => answer === run.deck[i]?.id).length;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Word endings that would still give the answer away: "shared", "encryption", "worms". */
const ENDINGS = '(?:s|es|d|ed|ing|ion|ions|er|ers|rs|ly)?';

/** Small words an acronym may or may not take a letter from ("Time-of-check to time-of-use"). */
const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

/**
 * Phrases in `text` that spell out an acronym in `title`: for "TOCTOU", "Time-of-check to
 * time-of-use"; for "KPIs", "Key Performance Indicators". A phrase matches when its words'
 * initials spell the acronym, where small words may be skipped. Used to blank expansions in
 * questions, since an expansion gives the answer away as surely as the acronym does.
 */
export function acronymExpansions(title: string, text: string): string[] {
  const acronyms = [...title.matchAll(/\b([A-Z][A-Z0-9]{1,7})s?\b/g)].map((m) => (m[1] ?? '').replace(/\d/g, ''));
  const words = [...text.matchAll(/[A-Za-z][A-Za-z']*/g)].map((m) => ({ word: m[0], start: m.index ?? 0 }));
  const found = new Set<string>();
  for (const acronym of acronyms) {
    if (acronym.length < 2) continue;
    const letters = acronym.toLowerCase();
    for (let i = 0; i < words.length; i++) {
      const first = words[i];
      if (!first || first.word[0] !== first.word[0]?.toUpperCase()) continue;
      // Walk forward, taking one letter per word; small words may also be skipped.
      const match = (w: number, l: number): number | undefined => {
        if (l === letters.length) return w;
        const current = words[w];
        if (!current) return undefined;
        const initial = current.word[0]?.toLowerCase();
        // Two-letter acronyms are short enough to match by chance, so their words must be capitalised.
        const capitalOk = letters.length > 2 || current.word[0] === current.word[0]?.toUpperCase();
        // A small word can supply a letter or be skipped; keep whichever reading runs longer,
        // so "Annualized Rate of Occurrence" is matched in full for ARO.
        const taken = initial === letters[l] && capitalOk ? match(w + 1, l + 1) : undefined;
        const skipped = l > 0 && SMALL_WORDS.has(current.word.toLowerCase()) ? match(w + 1, l) : undefined;
        return Math.max(taken ?? -1, skipped ?? -1) >= 0 ? Math.max(taken ?? -1, skipped ?? -1) : undefined;
      };
      const end = match(i, 0);
      const last = end !== undefined ? words[end - 1] : undefined;
      if (last) found.add(text.slice(first.start, last.start + last.word.length));
    }
  }
  return [...found];
}

/**
 * The description with the answer blanked out, so the question does not give it away.
 * Covers the full title and its parts: "1. Asset Valuation" → "Asset Valuation",
 * "Security Information and Event Management (SIEM)" → the name and "SIEM",
 * "PII / SPI / PHI / PI" → each acronym, "Linear & Differential" → each word,
 * "Diffie-Hellman (key exchange)" → "Diffie-Hellman", and the spelled-out form of an acronym.
 */
export function maskedDescription(node: MindNode): string {
  const title = node.title.replace(/^\d+\.\s*/, '');
  const terms = new Set([node.title, title]);
  // A numbered title ("2. Risk Analysis") is given away by "Step 2" in its description.
  const number = /^(\d+)\./.exec(node.title)?.[1];
  if (number) terms.add(`Step ${number}`);
  for (const part of [title, ...title.split(/\s*(?:[/,&]|\bvs\.?)\s*/i)]) {
    terms.add(part);
    terms.add(part.replace(/\s*\([^)]*\)/g, '').trim());
    for (const match of part.matchAll(/\(([^)]+)\)/g)) if (match[1]) terms.add(match[1]);
  }
  // Every acronym in the title on its own ("ALE", "SLE", "ARO"), and its spelled-out form.
  for (const match of node.title.matchAll(/\b[A-Z][A-Z0-9]{1,7}s?\b/g)) terms.add(match[0]);
  for (const expansion of acronymExpansions(node.title, node.description)) terms.add(expansion);
  const sorted = [...terms].filter((t) => t.length >= 2).sort((a, b) => b.length - a.length);
  return sorted.reduce(
    (text, term) => text.replace(new RegExp(`(?<![\\w-])${escapeRegExp(term)}${ENDINGS}(?![\\w-])`, 'gi'), '_____'),
    node.description,
  );
}

// ---------- Saving in the browser ----------

const RUN_KEY = 'cissp:quiz:run';
const STATS_KEY = 'cissp:quiz:stats';

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable or full: the quiz still works, it just is not saved.
  }
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/**
 * The saved run, or undefined when there is none or it no longer matches the cards
 * (for example after a map's data changed).
 */
export function loadRun(cards: Card[]): Run | undefined {
  const keys = new Set(cards.map((card) => card.key));
  const askable = askableCards(cards).length;
  const saved = read(RUN_KEY);
  if (typeof saved !== 'object' || saved === null) return undefined;
  const { deck, answers, position } = saved as Record<string, unknown>;
  if (!Array.isArray(deck) || !isStringArray(answers) || typeof position !== 'number') return undefined;
  const validDeck =
    deck.length === askable &&
    deck.every(
      (q) =>
        typeof q === 'object' &&
        q !== null &&
        keys.has((q as Question).id) &&
        isStringArray((q as Question).options) &&
        (q as Question).options.every((key) => keys.has(key)),
    );
  if (!validDeck || answers.length > deck.length || !answers.every((key) => keys.has(key))) return undefined;
  return { deck: deck as Question[], answers, position: Math.min(Math.max(position, 0), answers.length) };
}

export const saveRun = (run: Run) => write(RUN_KEY, run);

export function loadStats(): Stats | undefined {
  const saved = read(STATS_KEY);
  if (typeof saved !== 'object' || saved === null) return undefined;
  const { runs, best, last } = saved as Record<string, unknown>;
  return typeof runs === 'number' && typeof best === 'number' && typeof last === 'number'
    ? { runs, best, last }
    : undefined;
}

/** Records a finished run's score (percent) and returns the updated stats. */
export function recordRun(percent: number): Stats {
  const previous = loadStats();
  const stats = {
    runs: (previous?.runs ?? 0) + 1,
    best: Math.max(previous?.best ?? 0, percent),
    last: percent,
  };
  write(STATS_KEY, stats);
  return stats;
}

/** Answered / total of the saved run while it is part-way through, otherwise undefined. */
export function runProgress(): { answered: number; total: number } | undefined {
  const saved = read(RUN_KEY);
  if (typeof saved !== 'object' || saved === null) return undefined;
  const { deck, answers } = saved as Record<string, unknown>;
  if (!Array.isArray(deck) || !Array.isArray(answers)) return undefined;
  const progress = { answered: answers.length, total: deck.length };
  return progress.answered > 0 && progress.answered < progress.total ? progress : undefined;
}
