import { isTouchDevice } from "./device";

// Tracks a normalised pointer position in the range [-1, 1] on each axis.
// Used for subtle camera parallax. On phones we read touch movement instead
// of the mouse, and fall back to gentle automatic motion when idle.

export interface PointerTracker {
  /** -1 (left) .. 1 (right) */
  x: number;
  /** -1 (bottom) .. 1 (top) */
  y: number;
  /** True on touch devices — designs add gentle auto-motion in this case. */
  touch: boolean;
  dispose(): void;
}

export function createPointerTracker(el: HTMLElement): PointerTracker {
  const tracker: PointerTracker = {
    x: 0,
    y: 0,
    touch: isTouchDevice(),
    dispose: () => {},
  };

  const setFromClient = (clientX: number, clientY: number) => {
    tracker.x = (clientX / window.innerWidth) * 2 - 1;
    tracker.y = -((clientY / window.innerHeight) * 2 - 1);
  };

  const onMouseMove = (e: MouseEvent) => setFromClient(e.clientX, e.clientY);

  const onTouchMove = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t) setFromClient(t.clientX, t.clientY);
  };

  el.addEventListener("mousemove", onMouseMove);
  el.addEventListener("touchmove", onTouchMove, { passive: true });

  tracker.dispose = () => {
    el.removeEventListener("mousemove", onMouseMove);
    el.removeEventListener("touchmove", onTouchMove);
  };

  return tracker;
}
