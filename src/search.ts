import { escapeRegExp, type Card } from './quiz';

/** A word only matches at its start: "crypt" finds "Cryptography", and "ip" does not find "ship". */
const WORD_START = '(?<![\\p{L}\\p{N}])';

const wordsOf = (query: string) => query.trim().split(/\s+/).filter(Boolean);

/**
 * Topics whose title or description has every word of the query. Best first: the exact
 * title, titles that start with the query, other titles with every word, then the rest,
 * each group in map order.
 */
export function searchCards(cards: Card[], query: string): Card[] {
  const patterns = wordsOf(query).map((word) => new RegExp(WORD_START + escapeRegExp(word), 'iu'));
  if (patterns.length === 0) return [];
  const exact = query.trim().toLowerCase();
  const rankOf = ({ node }: Card) => {
    if (!patterns.every((p) => p.test(node.title) || p.test(node.description))) return undefined;
    const title = node.title.replace(/^\d+\.\s*/, '').toLowerCase();
    if (title === exact) return 0;
    if (!patterns.every((p) => p.test(node.title))) return 3;
    return title.startsWith(exact) ? 1 : 2;
  };
  return cards
    .flatMap((card) => {
      const rank = rankOf(card);
      return rank === undefined ? [] : [{ card, rank }];
    })
    .sort((a, b) => a.rank - b.rank)
    .map(({ card }) => card);
}

/** Any word of the query, captured so `split` keeps the matches for highlighting. */
export function matchPattern(query: string): RegExp {
  const words = wordsOf(query).sort((a, b) => b.length - a.length);
  return new RegExp(`${WORD_START}(${words.map(escapeRegExp).join('|')})`, 'iu');
}

/** The map page with the topic's pop-up open. */
export const topicPath = (card: Card) => `/map/${card.map.id}/${card.node.id}`;
