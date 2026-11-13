import { motion } from 'framer-motion';
import { useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { AUTHOR } from '../author';
import Page from '../components/Page';
import { countNodes, DOMAIN_NAMES, mindmaps, type MindMap } from '../data';
import { lastMap } from '../lastMap';

const ease = [0.25, 0.46, 0.45, 0.94] as const;

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

  // Coming back from a map: bring its card into view.
  useLayoutEffect(() => {
    if (!recentId) return;
    document.querySelector(`[data-map-id="${CSS.escape(recentId)}"]`)?.scrollIntoView({ block: 'center' });
  }, [recentId]);

  return (
    <Page className="home">
      <div className="container">
        {groupByDomain(mindmaps).map(([domain, maps]) => (
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
        ))}
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
