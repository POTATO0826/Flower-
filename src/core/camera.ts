import * as THREE from "three";

// A perspective camera tuned for portrait phones as much as wide desktops.
export function createCamera(container: HTMLElement): THREE.PerspectiveCamera {
  const w = container.clientWidth || window.innerWidth;
  const h = container.clientHeight || window.innerHeight;

  // Slightly wider field of view on tall/narrow phone screens so the whole
  // flower stays comfortably in frame.
  const portrait = h > w;
  const fov = portrait ? 58 : 46;

  const camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 100);
  camera.position.set(0, 1.6, 6);
  return camera;
}
