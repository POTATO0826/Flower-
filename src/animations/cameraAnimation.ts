import * as THREE from "three";

// Places the camera on its orbit each frame. The angle is the sum of the
// slow automatic turn (which only starts once the flower has bloomed) and
// whatever the user has dragged; flowerScene owns both numbers.

export interface OrbitFrame {
  target: THREE.Vector3;
  radius: number;
  height: number;
}

export function updateOrbitCamera(
  camera: THREE.PerspectiveCamera,
  o: OrbitFrame,
  angle: number,
  lift: number,
): void {
  camera.position.x = o.target.x + Math.sin(angle) * o.radius;
  camera.position.z = o.target.z + Math.cos(angle) * o.radius;
  camera.position.y = o.height + lift;
  camera.lookAt(o.target);
}
