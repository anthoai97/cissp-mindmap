import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** Below this the text gets too small to read; scroll sideways instead. */
const MIN_SCALE = 0.6;

/**
 * Renders children at least `minWidth` wide and scales them down to fit the
 * available width, so a wide mind map is visible in one view. When that would make
 * the text too small, it scrolls sideways and fades the edge that has more beyond it.
 */
export default function FitToWidth({ minWidth, children }: { minWidth: number; children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [edges, setEdges] = useState({ left: false, right: false });

  const fits = size.width > 0 && size.width / minWidth >= MIN_SCALE;
  const innerWidth = fits ? Math.max(size.width, minWidth) : minWidth;
  const scale = fits ? size.width / innerWidth : 1;

  const updateEdges = () => {
    const outer = outerRef.current;
    if (!outer) return;
    const left = outer.scrollLeft > 1;
    const right = outer.scrollLeft + outer.clientWidth < outer.scrollWidth - 1;
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  };

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      setSize({ width: outer.clientWidth, height: inner.offsetHeight });
      updateEdges();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(updateEdges, [fits, innerWidth]);

  const classes = ['fit', !fits && 'fit-scroll', !fits && edges.left && 'more-left', !fits && edges.right && 'more-right'];

  return (
    <div
      ref={outerRef}
      className={classes.filter(Boolean).join(' ')}
      style={fits ? { height: size.height * scale } : undefined}
      onScroll={fits ? undefined : updateEdges}
    >
      <div
        ref={innerRef}
        className="fit-inner"
        style={{ width: innerWidth, transform: scale < 1 ? `scale(${scale})` : undefined }}
      >
        {children}
      </div>
    </div>
  );
}
