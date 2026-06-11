import * as THREE from "three";
import { viewportSize } from "../utils/device";

// A perspective camera tuned for portrait phones as much as wide desktops.
export function createCamera(container: HTMLElement): THREE.PerspectiveCamera {
  const { width, height } = viewportSize(container);

  const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
  camera.position.set(0, 1.6, 6);
  updateCameraForViewport(camera, width, height);
  return camera;
}

export function updateCameraForViewport(
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
): void {
  const portrait = height > width;

  // Keep the same composition, but use a wider lens on tall/narrow phones so
  // the blossom and branch do not clip at the edges.
  camera.fov = portrait ? 58 : 46;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
