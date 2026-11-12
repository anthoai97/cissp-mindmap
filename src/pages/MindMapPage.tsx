import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import FitToWidth from '../components/FitToWidth';
import Icon from '../components/Icon';
import MapGrid, { gridMinWidth, nodeHues } from '../components/MapGrid';
import NodeModal from '../components/NodeModal';
import Page from '../components/Page';
import { findPath, getMindMap, mindmaps, type MindMap } from '../data';
import { rememberMap } from '../lastMap';
import NotFound from './NotFound';

/** Each grid a map renders: one per top-level node when stacked, otherwise one for the whole map. */
function gridsOf(map: MindMap) {
  return map.layout === 'stacked' ? map.nodes.map((node) => [node]) : [map.nodes];
}

export default function MindMapPage() {
  const { mapId = '', nodeId } = useParams();
  const navigate = useNavigate();
  const map = getMindMap(mapId);
  const path = map && nodeId ? findPath(map.nodes, nodeId) : undefined;
  const selected = path?.at(-1);
  const minWidth = useMemo(() => (map ? Math.max(...gridsOf(map).map(gridMinWidth)) : 0), [map]);
  const hues = useMemo(() => new Map(map ? gridsOf(map).flatMap((nodes) => [...nodeHues(nodes)]) : []), [map]);

  const open = (id: string) => navigate(`/map/${mapId}/${id}`);
  const close = () => navigate(`/map/${mapId}`);

  useEffect(() => {
    if (map) rememberMap(map.id);
  }, [map]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(`/map/${mapId}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, mapId, navigate]);

  if (!map || (nodeId && !selected)) return <NotFound />;

  const index = mindmaps.indexOf(map);
  const prev = mindmaps[index - 1];
  const next = mindmaps[index + 1];
  const domainMaps = mindmaps.filter((m) => m.domain === map.domain);

  return (
    <Page className="map-page">
      <header className="map-toolbar">
        <Link to="/" className="icon-btn" aria-label="All mind maps" title="All mind maps">
          <Icon name="back" />
        </Link>
        <span className="toolbar-divider" aria-hidden="true" />
        <div className="map-heading">
          <span className="map-eyebrow">
            Domain {map.domain} · Map {domainMaps.indexOf(map) + 1} of {domainMaps.length}
          </span>
          <h1>{map.title}</h1>
        </div>
        <ul className="legend">
          <li>
            <span className="legend-mark exam">★</span> Exam key
          </li>
          <li>
            <span className="legend-mark">↗</span> Own mind map
          </li>
        </ul>
        <nav className="map-pager" aria-label="Other mind maps">
          {prev && (
            <Link to={`/map/${prev.id}`} className="icon-btn" aria-label={prev.title} title={prev.title}>
              <Icon name="prev" />
            </Link>
          )}
          {next && (
            <Link to={`/map/${next.id}`} className="icon-btn" aria-label={next.title} title={next.title}>
              <Icon name="next" />
            </Link>
          )}
        </nav>
      </header>

      <div className="map-body">
        <FitToWidth minWidth={minWidth}>
          {gridsOf(map).map((nodes) => (
            <MapGrid
              key={nodes[0]?.id}
              nodes={nodes}
              sectionHeader={map.layout === 'stacked'}
              selectedId={selected?.id}
              onSelect={open}
            />
          ))}
        </FitToWidth>
      </div>

      <NodeModal node={selected} hue={selected && hues.get(selected.id)} onClose={close} />
    </Page>
  );
}
