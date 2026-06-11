import type * as THREE from "three";
import type { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { updateCameraForViewport } from "../core/camera";
import { cappedPixelRatio, viewportSize } from "./device";

// Keeps the renderer, camera and post-processing composer in sync with the
// window size. Also re-applies a sensible pixel ratio (important on phones
// that change orientation).

export function onResize(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  composer: EffectComposer | null,
  container: HTMLElement,
): () => void {
  let raf = 0;

  const handle = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const { width, height } = viewportSize(container);

      updateCameraForViewport(camera, width, height);

      renderer.setPixelRatio(cappedPixelRatio());
      renderer.setSize(width, height);
      composer?.setSize(width, height);
    });
  };

  window.addEventListener("resize", handle);
  window.addEventListener("orientationchange", handle);
  window.visualViewport?.addEventListener("resize", handle);
  handle();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", handle);
    window.removeEventListener("orientationchange", handle);
    window.visualViewport?.removeEventListener("resize", handle);
  };
}
