// Small helpers to detect the device and scale quality for phones.
// The whole site is designed mobile-first, so we lean on these everywhere.

/** True when the primary input is touch (phones / tablets). */
export function isTouchDevice(): boolean {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

/** True for narrow screens (phones in portrait, roughly). */
export function isMobileViewport(): boolean {
  return window.innerWidth < 768;
}

/**
 * A 0..1 "quality" factor. Phones get fewer particles, lower pixel ratio,
 * and simpler bloom so the experience stays smooth.
 */
export function qualityScale(): number {
  return isMobileViewport() || isTouchDevice() ? 0.6 : 1;
}

/** Pixel ratio capped so phones don't render at huge retina resolutions. */
export function cappedPixelRatio(): number {
  const cap = isMobileViewport() ? 2 : 2.5;
  return Math.min(window.devicePixelRatio || 1, cap);
}

/** Scale a particle/object count down on weaker devices. */
export function scaledCount(desktopCount: number): number {
  return Math.max(1, Math.round(desktopCount * qualityScale()));
}
