import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { getMindMap, type MindNode } from '../data';
import Description from './Description';
import { closeTween, keepFadeInFramer, openSpring, originOf } from './modalMotion';

/** The clicked map box, so the pop-up grows out of it. */
const boxOf = (id: string) => document.querySelector(`[data-id="${CSS.escape(id)}"]`);

interface Props {
  node?: MindNode;
  /** Branch colour of the picked card; the pop-up takes the same colour. */
  hue?: string;
  onClose: () => void;
}

export default function NodeModal({ node, hue, onClose }: Props) {
  const isOpen = node !== undefined;
  const closeRef = useRef<HTMLButtonElement>(null);

  // Lock page scroll and move focus into the pop-up while it is open.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const linkedMap = node?.mindmap ? getMindMap(node.mindmap) : undefined;

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          key="modal"
          className="modal-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } }}
          exit={{ opacity: 0, transition: { duration: 0.32, ease: 'easeIn' } }}
          onUpdate={keepFadeInFramer}
          onClick={onClose}
        >
          <motion.div
            className="modal"
            style={hue ? ({ '--hue': hue } as CSSProperties) : undefined}
            role="dialog"
            aria-modal="true"
            aria-label={node.title}
            initial={{ opacity: 0, scale: 0.35, ...originOf(boxOf(node.id)) }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0, transition: openSpring }}
            exit={{ opacity: 0, scale: 0.35, ...originOf(boxOf(node.id)), transition: closeTween }}
            onUpdate={keepFadeInFramer}
            onClick={(e) => e.stopPropagation()}
          >
            <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
            <h2 className="modal-title">{node.title}</h2>
            {node.highlight === 'exam-key' && <span className="tag">★ Exam key</span>}
            <Description text={node.description} />
            {linkedMap && (
              <Link className="pill filled" to={`/map/${linkedMap.id}`}>
                Open the {linkedMap.title} mind map →
              </Link>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
