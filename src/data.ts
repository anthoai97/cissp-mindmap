export type Highlight = 'own-mindmap' | 'exam-key';

export interface MindNode {
  id: string;
  title: string;
  description: string;
  highlight?: Highlight;
  /** id of another mind map that covers this topic in detail */
  mindmap?: string;
  children: MindNode[];
}

export interface MindMap {
  id: string;
  title: string;
  description: string;
  domain: number;
  order: number;
  source: string;
  /** "stacked" renders each top-level node as its own section */
  layout?: 'columns' | 'stacked';
  nodes: MindNode[];
}

const modules = import.meta.glob<MindMap>('../data/*.json', { eager: true, import: 'default' });

export const mindmaps: MindMap[] = Object.values(modules).sort(
  (a, b) => a.domain - b.domain || a.order - b.order,
);

export const DOMAIN_NAMES: Record<number, string> = {
  1: 'Security and Risk Management',
  2: 'Asset Security',
  3: 'Security Architecture and Engineering',
  4: 'Communication and Network Security',
  5: 'Identity and Access Management',
  6: 'Security Assessment and Testing',
  7: 'Security Operations',
  8: 'Software Development Security',
};

/** Each grid a map renders: one per top-level node when stacked, otherwise one for the whole map. */
export function gridsOf(map: MindMap): MindNode[][] {
  return map.layout === 'stacked' ? map.nodes.map((node) => [node]) : [map.nodes];
}

export function getMindMap(id: string): MindMap | undefined {
  return mindmaps.find((m) => m.id === id);
}

export function countNodes(nodes: MindNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children), 0);
}

/** The chain of nodes from a top-level node down to `id`, or undefined if not found. */
export function findPath(nodes: MindNode[], id: string): MindNode[] | undefined {
  for (const node of nodes) {
    if (node.id === id) return [node];
    const rest = findPath(node.children, id);
    if (rest) return [node, ...rest];
  }
  return undefined;
}

export interface Cell {
  node: MindNode;
  /** ids from the top-level node down to this node */
  path: string[];
  row: number;
  col: number;
  span: number;
}

export interface Layout {
  cells: Cell[];
  columns: number;
  rows: number;
}

/**
 * Icicle layout: each node sits one grid row below its parent and spans
 * the columns of all the leaves beneath it.
 */
export function layoutTree(nodes: MindNode[]): Layout {
  const cells: Cell[] = [];
  let rows = 0;

  const place = (node: MindNode, row: number, col: number, parentPath: string[]): number => {
    const path = [...parentPath, node.id];
    let span = 0;
    for (const child of node.children) span += place(child, row + 1, col + span, path);
    span = Math.max(span, 1);
    cells.push({ node, path, row, col, span });
    rows = Math.max(rows, row + 1);
    return span;
  };

  let columns = 0;
  for (const node of nodes) columns += place(node, 0, columns, []);
  cells.sort((a, b) => a.row - b.row || a.col - b.col);
  return { cells, columns, rows };
}
