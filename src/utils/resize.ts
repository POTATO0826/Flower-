import type * as THREE from "three";
import type { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { cappedPixelRatio } from "./device";

// Keeps the renderer, camera and post-processing composer in sync with the
// window size. Also re-applies a sensible pixel ratio (important on phones
// that change orientation).

export function onResize(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  composer: EffectComposer | null,
  container: HTMLElement,
): () => void {
  const handle = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(cappedPixelRatio());
    renderer.setSize(w, h);
    composer?.setSize(w, h);
  };

  window.addEventListener("resize", handle);
  window.addEventListener("orientationchange", handle);
  handle();

  return () => {
    window.removeEventListener("resize", handle);
    window.removeEventListener("orientationchange", handle);
  };
}
