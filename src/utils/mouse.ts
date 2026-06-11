// One-finger (or mouse) drag spins the camera around the flower — a real
// 360° orbit instead of the old hover parallax. Drags integrate into an
// angle offset; a flick keeps the world turning with inertia and friction
// settles it. Pointer Events cover mouse, touch and pen with one code path.

export interface OrbitDrag {
  /** Extra orbit angle (radians) added by the user's drags. */
  angle: number;
  /** Vertical camera offset (world units) from dragging up / down. */
  lift: number;
  /** True while a finger or mouse button is down. */
  dragging: boolean;
  /** Advance flick inertia & friction; call once per frame. */
  update(dt: number): void;
  dispose(): void;
}

export function createOrbitDrag(el: HTMLElement): OrbitDrag {
  let velocity = 0; // rad/s left over from a flick
  let lastX = 0;
  let lastY = 0;
  let lastT = 0;
  let pointerId: number | null = null;

  // A full screen-width swipe turns the scene ~3/4 of the way round.
  const radPerPx = () => (Math.PI * 1.5) / Math.max(320, window.innerWidth);

  const drag: OrbitDrag = {
    angle: 0,
    lift: 0,
    dragging: false,
    update(dt: number) {
      if (!drag.dragging) {
        // Flick inertia with exponential friction, then settle to a stop.
        drag.angle += velocity * dt;
        velocity *= Math.pow(0.1, dt);
        if (Math.abs(velocity) < 0.001) velocity = 0;
        // The vertical offset eases back to the framed composition.
        drag.lift += -drag.lift * Math.min(1, dt * 0.6);
      }
    },
    dispose() {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    },
  };

  const onDown = (e: PointerEvent) => {
    if (pointerId !== null) return; // one finger steers; ignore extra touches
    pointerId = e.pointerId;
    drag.dragging = true;
    velocity = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = performance.now();
    el.setPointerCapture?.(e.pointerId);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    const da = -dx * radPerPx();
    drag.angle += da;
    drag.lift = Math.min(0.9, Math.max(-0.45, drag.lift + dy * 0.003));

    // Smoothed flick speed so the release inherits the gesture's motion.
    const now = performance.now();
    const dtSec = Math.max(now - lastT, 1) / 1000;
    lastT = now;
    velocity = velocity * 0.4 + (da / dtSec) * 0.6;
  };

  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    drag.dragging = false;
    // Stale flicks feel broken: only keep inertia from a fresh movement.
    if (performance.now() - lastT > 80) velocity = 0;
  };

  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);

  return drag;
}
