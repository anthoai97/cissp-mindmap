/**
 * The last mind map the viewer opened, so the home page can scroll back to its card.
 * Session storage can be unavailable (private mode, blocked storage); the site works without it.
 */
const KEY = 'cissp:last-map';

export function rememberMap(id: string): void {
  try {
    sessionStorage.setItem(KEY, id);
  } catch {
    // Storage unavailable: the home page just starts at the top.
  }
}

export function lastMap(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}
