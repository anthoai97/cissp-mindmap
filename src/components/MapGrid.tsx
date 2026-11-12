import { motion } from 'framer-motion';
import { useMemo, useState, type CSSProperties } from 'react';
import { layoutTree, type Cell, type Layout, type MindNode } from '../data';

/** Soft hues for dark backgrounds; each branch of the map gets one, cycling if needed. */
const BRANCH_HUES = [
  '#7fd1ae', // mint
  '#7cc4f2', // sky
  '#b4a3f5', // lavender
  '#f4a77a', // peach
  '#f29bb6', // rose
  '#5fd4d0', // teal
  '#b8d97a', // lime
  '#8fa8f5', // periwinkle
  '#e3c08f', // sand
  '#f28b82', // coral
];

/**
 * The branch row is the first row with more than one box. Rows above it are the
 * shared trunk; every box from that row down takes the hue of its branch.
 */
function branchHues(cells: Cell[]): { branchRow: number; hueOf: (cell: Cell) => string | undefined } {
  const counts = new Map<number, number>();
  for (const cell of cells) counts.set(cell.row, (counts.get(cell.row) ?? 0) + 1);
  const rows = [...counts.keys()].sort((a, b) => a - b);
  const branchRow = rows.find((row) => (counts.get(row) ?? 0) > 1) ?? Infinity;
  const branchIds = cells.filter((c) => c.row === branchRow).map((c) => c.node.id);
  return {
    branchRow,
    hueOf: (cell) => {
      const id = cell.path[branchRow];
      return id === undefined ? undefined : BRANCH_HUES[branchIds.indexOf(id) % BRANCH_HUES.length];
    },
  };
}

const COL_MIN = 44;
const GAP = 6;
/** Roughly how many characters of a sideways label fit in one column unit. */
const CHARS_PER_COLUMN = 36;

/**
 * Width weight of each column: 1 for a normal label, up to 3 for a long one, so long
 * sideways labels get room to wrap instead of spilling into the next box.
 */
function columnWeights(layout: Layout): number[] {
  const weights = Array<number>(layout.columns).fill(1);
  for (const cell of layout.cells) {
    if (cell.span !== 1) continue;
    const weight = Math.min(3, Math.ceil(cell.node.title.length / CHARS_PER_COLUMN));
    weights[cell.col] = Math.max(weights[cell.col] ?? 1, weight);
  }
  return weights;
}

/** Narrowest width, in px, of a column with the given weight. */
const columnMin = (weight: number) => weight * COL_MIN + (weight - 1) * GAP;

/** Sideways label metrics at 14px: line height and a conservative average character width. */
const LABEL_LINE = 16.8;
const CHAR_WIDTH = 7.6;

/** Lines the text needs when wrapped word by word into lines of the given length (px). */
function wrappedLines(words: string[], lineLength: number): number {
  let lines = 1;
  let used = 0;
  for (const word of words) {
    const width = word.length * CHAR_WIDTH;
    if (used > 0 && used + CHAR_WIDTH + width > lineLength) {
      lines += 1;
      used = width;
    } else {
      used += (used > 0 ? CHAR_WIDTH : 0) + width;
    }
  }
  return lines;
}

/**
 * Height for a sideways label. Browsers size sideways text from the row, not the text, so
 * long labels wrap into more lines than the column is wide. Find the shortest height at
 * which the text, wrapped word by word, fits in the lines that fit across the column.
 */
function labelHeight(title: string, weight: number): number {
  const lines = Math.max(1, Math.floor((columnMin(weight) - 10) / LABEL_LINE));
  const words = title.split(/\s+/);
  let height = Math.max(...words.map((word) => word.length * CHAR_WIDTH));
  while (wrappedLines(words, height) > lines) height += 4;
  return Math.ceil(height) + 4;
}

/** Branch hue of every coloured node in a grid, keyed by node id. */
export function nodeHues(nodes: MindNode[]): Map<string, string> {
  const { cells } = layoutTree(nodes);
  const { hueOf } = branchHues(cells);
  const hues = new Map<string, string>();
  for (const cell of cells) {
    const hue = hueOf(cell);
    if (hue) hues.set(cell.node.id, hue);
  }
  return hues;
}

/** Narrowest width at which every column of a grid stays readable. */
export function gridMinWidth(nodes: MindNode[]): number {
  const weights = columnWeights(layoutTree(nodes));
  return weights.reduce((sum, w) => sum + columnMin(w), 0) + (weights.length - 1) * GAP;
}

interface Props {
  nodes: MindNode[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Style the top row as a section banner (used by stacked maps). */
  sectionHeader?: boolean;
}

export default function MapGrid({ nodes, selectedId, onSelect, sectionHeader }: Props) {
  const layout = useMemo(() => layoutTree(nodes), [nodes]);
  const weights = useMemo(() => columnWeights(layout), [layout]);
  const { branchRow, hueOf } = useMemo(() => branchHues(layout.cells), [layout]);
  const [hoveredId, setHoveredId] = useState<string>();

  // Trace the hovered branch, or the selected one when nothing is hovered.
  const focusId = hoveredId ?? selectedId;
  const focus = layout.cells.find((c) => c.node.id === focusId);
  const inFocus = (cell: Cell) =>
    !focus || focus.path.includes(cell.node.id) || cell.path.includes(focus.node.id);

  // Single-column boxes in a wide map are too narrow for horizontal text.
  const vertical = (cell: Cell) => cell.span === 1 && layout.columns > 8;

  return (
    <div
      className="map-grid"
      style={{
        gridTemplateColumns: weights.map((w) => `minmax(${columnMin(w)}px, ${w}fr)`).join(' '),
        gap: GAP,
        gridTemplateRows: `repeat(${layout.rows}, auto)`,
      }}
    >
      {layout.cells.map((cell) => {
        const { node } = cell;
        const isVertical = vertical(cell);
        const classes = [
          'box',
          `depth-${Math.min(cell.row, 2)}`,
          cell.row < branchRow ? 'trunk' : node.children.length > 0 ? 'group' : 'leaf',
          isVertical ? 'vertical' : cell.span <= 2 && layout.columns > 8 && 'narrow',
          sectionHeader && cell.row === 0 && 'section',
          node.highlight,
          node.id === selectedId && 'selected',
          !inFocus(cell) && 'dimmed',
        ];
        return (
          <motion.div
            key={node.id}
            className={isVertical ? 'cell turnable' : 'cell'}
            style={
              {
                gridColumn: `${cell.col + 1} / span ${cell.span}`,
                gridRow: cell.row + 1,
                '--hue': hueOf(cell),
              } as CSSProperties
            }
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: cell.row * 0.08 + cell.col * 0.012,
              duration: 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
            // Hover and click live on the fixed slot, not the button, so a card that
            // turns on hover does not slip out from under the pointer.
            // Trace branches for mouse and pen only: a touch tap has no "leave", so it would stay dimmed.
            onPointerEnter={(e) => e.pointerType !== 'touch' && setHoveredId(node.id)}
            onPointerLeave={() => setHoveredId((current) => (current === node.id ? undefined : current))}
            onClick={() => onSelect(node.id)}
          >
            <button
              type="button"
              data-id={node.id}
              className={classes.filter(Boolean).join(' ')}
              aria-pressed={node.id === selectedId}
              onFocus={() => setHoveredId(node.id)}
              onBlur={() => setHoveredId(undefined)}
            >
              <span
                className="box-label"
                style={isVertical ? { height: labelHeight(node.title, weights[cell.col] ?? 1) } : undefined}
              >
                {node.title}
              </span>
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
