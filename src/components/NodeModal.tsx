import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { getMindMap, type MindNode } from '../data';
import Description from './Description';

const openSpring = { type: 'spring', stiffness: 380, damping: 32 } as const;

/** Closing mirrors opening: the pop-up shrinks back into its card, fading out near the end. */
const closeTween = {
  duration: 0.32,
  ease: [0.4, 0, 1, 1],
  opacity: { duration: 0.2, ease: 'easeIn', delay: 0.12 },
} as const;

/**
 * Passing onUpdate keeps Framer Motion from handing the fade to the browser's animation
 * engine, which drops the final opacity for one frame and flashes the pop-up at the end of
 * closing. Framer then animates every frame itself and holds the value until removal.
 */
const keepFadeInFramer = () => {};

/** Offset from the viewport centre to the clicked box, so the pop-up grows out of it. */
function originOf(id: string): { x: number; y: number } {
  const box = document.querySelector(`[data-id="${CSS.escape(id)}"]`)?.getBoundingClientRect();
  if (!box) return { x: 0, y: 0 };
  return {
    x: box.left + box.width / 2 - window.innerWidth / 2,
    y: box.top + box.height / 2 - window.innerHeight / 2,
  };
}

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
            initial={{ opacity: 0, scale: 0.35, ...originOf(node.id) }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0, transition: openSpring }}
            exit={{ opacity: 0, scale: 0.35, ...originOf(node.id), transition: closeTween }}
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
