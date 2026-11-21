import { Link } from 'react-router-dom';
import { contextOf, type Card } from '../quiz';
import { matchPattern, topicPath } from '../search';

/** Most results listed at once; another word narrows the list. */
const LIMIT = 60;

/** The text with every part the pattern captures wrapped in <mark>. */
function Marked({ text, pattern }: { text: string; pattern: RegExp }) {
  return <>{text.split(pattern).map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))}</>;
}

/** The first description line with a match, cut so the match shows near the start. */
function snippetOf(description: string, pattern: RegExp): string {
  const lines = description.split('\n').map((line) => line.replace(/^(?:- |\d+\. )/, ''));
  const line = lines.find((l) => pattern.test(l)) ?? lines[0] ?? '';
  const at = line.search(pattern);
  return at < 80 ? line : `…${line.slice(line.lastIndexOf(' ', at - 30) + 1)}`;
}

export default function SearchResults({ query, results }: { query: string; results: Card[] }) {
  const pattern = matchPattern(query);

  return (
    <section className="search-results" aria-label="Search results">
      <p className="search-count" aria-live="polite">
        {results.length === 0
          ? `No topics match “${query.trim()}”.`
          : `${results.length} ${results.length === 1 ? 'topic' : 'topics'}`}
        {results.length > LIMIT && ` · showing the first ${LIMIT}, add a word to narrow the list`}
      </p>
      <ul className="cards">
        {results.slice(0, LIMIT).map((card) => (
          <li key={card.key}>
            <Link to={topicPath(card)} className="card result">
              <span className="result-context">
                Domain {card.map.domain} · {contextOf(card)}
              </span>
              <span className="card-title">
                {card.node.highlight === 'exam-key' && <span className="result-star">★ </span>}
                <Marked text={card.node.title} pattern={pattern} />
              </span>
              <span className="result-snippet">
                <Marked text={snippetOf(card.node.description, pattern)} pattern={pattern} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
