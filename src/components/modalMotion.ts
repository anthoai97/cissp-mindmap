/** Motion shared by the centred pop-ups: grow out of what was clicked, shrink back into it. */

export const openSpring = { type: 'spring', stiffness: 380, damping: 32 } as const;

/** Closing mirrors opening: the pop-up shrinks back into its origin, fading out near the end. */
export const closeTween = {
  duration: 0.32,
  ease: [0.4, 0, 1, 1],
  opacity: { duration: 0.2, ease: 'easeIn', delay: 0.12 },
} as const;

/**
 * Passing onUpdate keeps Framer Motion from handing the fade to the browser's animation
 * engine, which drops the final opacity for one frame and flashes the pop-up at the end of
 * closing. Framer then animates every frame itself and holds the value until removal.
 */
export const keepFadeInFramer = () => {};

/** Offset from the viewport centre to an element, so a pop-up can grow out of it. */
export function originOf(element: Element | null): { x: number; y: number } {
  const box = element?.getBoundingClientRect();
  if (!box) return { x: 0, y: 0 };
  return {
    x: box.left + box.width / 2 - window.innerWidth / 2,
    y: box.top + box.height / 2 - window.innerHeight / 2,
  };
}
