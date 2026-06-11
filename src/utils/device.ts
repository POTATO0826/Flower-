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
 * True on Apple's WebKit GPU stack: iPhone / iPad (every iOS browser is
 * WebKit) and Safari on macOS. These GPUs have known WebGL bugs around
 * MSAA + post-processing render targets that show up as rainbow pixel
 * garbage, so a few effects are toned down there.
 */
export function isAppleWebKit(): boolean {
  const ua = navigator.userAgent;
  const iDevice =
    /iPhone|iPad|iPod/.test(ua) ||
    // iPadOS 13+ masquerades as a Mac but is the only "Mac" with touch.
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const macSafari =
    /Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua);
  return iDevice || macSafari;
}

/** Current viewport size, preferring the visual viewport on mobile browsers. */
export function viewportSize(container?: HTMLElement): { width: number; height: number } {
  const visualViewport = window.visualViewport;
  const width =
    container?.clientWidth ||
    Math.round(visualViewport?.width ?? 0) ||
    window.innerWidth;
  const height =
    container?.clientHeight ||
    Math.round(visualViewport?.height ?? 0) ||
    window.innerHeight;

  return { width, height };
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
