import { motion } from 'framer-motion';
import { useLayoutEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AUTHOR } from '../author';
import Icon from '../components/Icon';
import Page from '../components/Page';
import SearchResults from '../components/SearchResults';
import { countNodes, DOMAIN_NAMES, mindmaps, type MindMap } from '../data';
import { lastMap } from '../lastMap';
import { cardsOf } from '../quiz';
import { searchCards, topicPath } from '../search';

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const cards = cardsOf(mindmaps);

function groupByDomain(maps: MindMap[]): [number, MindMap[]][] {
  const groups = new Map<number, MindMap[]>();
  for (const map of maps) groups.set(map.domain, [...(groups.get(map.domain) ?? []), map]);
  return [...groups.entries()];
}

const updated = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
  new Date(__BUILD_DATE__),
);

export default function Home() {
  const recentId = lastMap();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  // Copied to the URL so Back from a topic returns to the same results.
  const [query, setQuery] = useState(() => params.get('q') ?? '');
  const results = useMemo(() => searchCards(cards, query), [query]);

  const search = (value: string) => {
    setQuery(value);
    setParams(value.trim() ? { q: value } : {}, { replace: true });
  };

  // Coming back from a map: bring its card into view.
  useLayoutEffect(() => {
    if (!recentId) return;
    document.querySelector(`[data-map-id="${CSS.escape(recentId)}"]`)?.scrollIntoView({ block: 'center' });
  }, [recentId]);

  return (
    <Page className="home">
      <div className="container">
        <form
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (results[0]) navigate(topicPath(results[0]));
          }}
        >
          <Icon name="search" />
          <input
            type="search"
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Search topics by name or keyword"
            aria-label="Search topics"
            autoComplete="off"
            spellCheck={false}
          />
        </form>
        {query.trim() ? (
          <SearchResults query={query} results={results} />
        ) : (
          groupByDomain(mindmaps).map(([domain, maps]) => (
            <section key={domain} className="domain">
              <h2>
                <span className="domain-num">{domain}</span>
                {DOMAIN_NAMES[domain]}
              </h2>
              <ul className="cards">
                {maps.map((map, i) => (
                  <motion.li
                    key={map.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.07, duration: 0.4, ease }}
                  >
                    <Link
                      to={`/map/${map.id}`}
                      className={map.id === recentId ? 'card recent' : 'card'}
                      data-map-id={map.id}
                    >
                      <span className="card-title">{map.title}</span>
                      <span className="card-count">{countNodes(map.nodes)} topics</span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </section>
          ))
        )}
        <footer className="home-footer">
          <nav className="author" aria-label="Author">
            <a href={AUTHOR.website} target="_blank" rel="noopener">
              by <strong>{AUTHOR.name}</strong>
            </a>
            <a className="pill" href={AUTHOR.github} target="_blank" rel="noopener">
              GitHub
            </a>
            <a className="pill" href={AUTHOR.linkedin} target="_blank" rel="noopener">
              LinkedIn
            </a>
          </nav>
          <p className="source-note">
            Updated {updated} · Source: Destination Certification CISSP MindMap videos.
          </p>
        </footer>
      </div>
    </Page>
  );
}
