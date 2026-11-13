import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { MindMap } from '../data';
import type { Card, Run } from '../quiz';
import Description from './Description';
import Icon from './Icon';
import { closeTween, keepFadeInFramer, openSpring, originOf } from './modalMotion';

export type ReviewFilter = 'right' | 'wrong';

interface Props {
  /** Which answers to show; undefined keeps the pop-up closed. */
  filter?: ReviewFilter;
  run: Run;
  byKey: Map<string, Card>;
  hues: Map<string, string>;
  onFilter: (filter: ReviewFilter) => void;
  onClose: () => void;
}

interface Answered {
  card: Card;
  chosen?: Card;
  right: boolean;
}

interface Group {
  map: MindMap;
  items: Answered[];
}

/** The score counts in the quiz toolbar, which the pop-up grows out of. */
const tallyOf = () => document.querySelector('.quiz-tally');

/**
 * Answers grouped by map, the map with the most answers first so weak areas stand out.
 * Within a map, the most recent answer comes first.
 */
function groupByMap(answered: Answered[]): Group[] {
  const groups = new Map<string, Group>();
  for (const item of answered) {
    const group = groups.get(item.card.map.id) ?? { map: item.card.map, items: [] };
    group.items.push(item);
    groups.set(item.card.map.id, group);
  }
  return [...groups.values()].sort(
    (a, b) =>
      b.items.length - a.items.length || a.map.domain - b.map.domain || a.map.order - b.map.order,
  );
}

/** The questions answered so far in this run, split into right and wrong, grouped by map. */
export default function ReviewModal({ filter, run, byKey, hues, onFilter, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const isOpen = filter !== undefined;

  // Lock page scroll, move focus into the pop-up, and close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  // A new tab starts with every row closed.
  useEffect(() => setOpen(new Set()), [filter]);

  const answered = useMemo(
    () =>
      run.answers
        .flatMap((chosen, i): Answered[] => {
          const question = run.deck[i];
          const card = question && byKey.get(question.id);
          return card ? [{ card, chosen: byKey.get(chosen), right: chosen === question.id }] : [];
        })
        .reverse(),
    [run, byKey],
  );
  const counts = { right: answered.filter((a) => a.right).length, wrong: answered.filter((a) => !a.right).length };
  const groups = useMemo(
    () => groupByMap(answered.filter((a) => (filter === 'right' ? a.right : !a.right))),
    [answered, filter],
  );

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <AnimatePresence>
      {filter && (
        <motion.div
          key="review"
          className="modal-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } }}
          exit={{ opacity: 0, transition: { duration: 0.32, ease: 'easeIn' } }}
          onUpdate={keepFadeInFramer}
          onClick={onClose}
        >
          <motion.div
            className="modal review"
            role="dialog"
            aria-modal="true"
            aria-label="Review answers"
            initial={{ opacity: 0, scale: 0.35, ...originOf(tallyOf()) }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0, transition: openSpring }}
            exit={{ opacity: 0, scale: 0.35, ...originOf(tallyOf()), transition: closeTween }}
            onUpdate={keepFadeInFramer}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pinned: stays in view while the list scrolls. */}
            <header className="review-head">
              <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="Close">
                ×
              </button>
              <h2 className="modal-title">Review</h2>
              <div className="review-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={filter === 'wrong'}
                  className={`review-tab wrong ${filter === 'wrong' ? 'active' : ''}`}
                  onClick={() => onFilter('wrong')}
                >
                  ✗ Wrong <span>{counts.wrong}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filter === 'right'}
                  className={`review-tab right ${filter === 'right' ? 'active' : ''}`}
                  onClick={() => onFilter('right')}
                >
                  ✓ Correct <span>{counts.right}</span>
                </button>
              </div>
            </header>

            <div className="review-body">
              {groups.length === 0 ? (
                <p className="review-empty">
                  {filter === 'wrong' ? 'No wrong answers yet.' : 'No correct answers yet.'}
                </p>
              ) : (
                groups.map((group) => (
                  <section key={group.map.id} className="review-group">
                    <h3 className="review-group-title">
                      <span>
                        Domain {group.map.domain} · {group.map.title}
                      </span>
                      <span className={`review-group-count ${filter}`}>{group.items.length}</span>
                    </h3>
                    <ul className="review-rows">
                      {group.items.map(({ card, chosen, right }) => {
                        const expanded = open.has(card.key);
                        return (
                          <li
                            key={card.key}
                            className={`review-row ${expanded ? 'expanded' : ''}`}
                            style={{ '--hue': hues.get(card.key) ?? 'var(--mint)' } as CSSProperties}
                          >
                            <button
                              type="button"
                              className="review-row-head"
                              aria-expanded={expanded}
                              onClick={() => toggle(card.key)}
                            >
                              <span className="review-dot" aria-hidden="true" />
                              <span className="review-row-text">
                                <strong>{card.label}</strong>
                                {!right && chosen && (
                                  <span className="review-chosen" title="Your answer">
                                    ✗ {chosen.label}
                                  </span>
                                )}
                              </span>
                              <span className="review-chevron" aria-hidden="true">
                                <Icon name="next" size={16} />
                              </span>
                            </button>
                            <AnimatePresence initial={false}>
                              {expanded && (
                                <motion.div
                                  className="review-row-body"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                                >
                                  <Description text={card.node.description} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
