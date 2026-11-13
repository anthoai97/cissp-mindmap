import type { MindMap, MindNode } from './data';

/** A topic that can be asked about, with its map and the topics above it for context. */
export interface Card {
  /** Unique across maps: "<map id>/<node id>". Node ids are only unique within a map. */
  key: string;
  map: MindMap;
  node: MindNode;
  parents: MindNode[];
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
        if (node.description.trim()) cards.push({ key: `${map.id}/${node.id}`, map, node, parents });
        walk(node.children, [...parents, node]);
      }
    };
    walk(map.nodes, []);
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
 * Whether a card makes a fair question: once the answer is blanked out, enough of the
 * description must remain to recognise it ("The layer 3 _____." does not qualify).
 * Cards that do not qualify still appear as wrong answers.
 */
export const isAskable = (card: Card) => maskedDescription(card.node).replace(/_____|[\s.,;:()-]/g, '').length >= 12;

/** A fresh run: every askable card once, in a new random order, each with newly picked options. */
export function newRun(cards: Card[]): Run {
  const deck = shuffle(cards.filter(isAskable)).map((card) => ({
    id: card.key,
    options: shuffle([card.key, ...distractors(card, cards).map((c) => c.key)]),
  }));
  return { deck, answers: [], position: 0 };
}

export const score = (run: Run) => run.answers.filter((answer, i) => answer === run.deck[i]?.id).length;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Word endings that would still give the answer away: "shared", "encryption", "worms". */
const ENDINGS = '(?:s|es|d|ed|ing|ion|ions|er|ers|rs|ly)?';

/**
 * The description with the answer blanked out, so the question does not give it away.
 * Covers the full title and its parts: "1. Asset Valuation" → "Asset Valuation",
 * "Security Information and Event Management (SIEM)" → the name and "SIEM",
 * "PII / SPI / PHI / PI" → each acronym.
 */
export function maskedDescription(node: MindNode): string {
  const title = node.title.replace(/^\d+\.\s*/, '');
  const terms = new Set([node.title, title, title.replace(/\s*\([^)]*\)/g, '').trim()]);
  // A numbered title ("2. Risk Analysis") is given away by "Step 2" in its description.
  const number = /^(\d+)\./.exec(node.title)?.[1];
  if (number) terms.add(`Step ${number}`);
  for (const match of title.matchAll(/\(([^)]+)\)/g)) if (match[1]) terms.add(match[1]);
  for (const part of title.split(/\s*[/,]\s*/)) terms.add(part);
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
  const askable = cards.filter(isAskable).length;
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
