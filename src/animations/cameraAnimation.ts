import * as THREE from "three";
import type { PointerTracker } from "../utils/mouse";

// Drives the camera every frame: a slow orbit around the flower, plus subtle
// parallax from the pointer. On touch devices there's no mouse, so the orbit
// itself provides the gentle automatic motion the brief asks for.

export interface OrbitOptions {
  target: THREE.Vector3;
  radius: number;
  height: number;
  /** Orbit speed (radians/sec). */
  speed: number;
  /** How much the pointer nudges the orbit angle. */
  parallax: number;
  /** How much the pointer nudges the camera height. */
  parallaxHeight?: number;
}

// A smoothed pointer so parallax feels soft, not jittery.
export class SmoothedPointer {
  x = 0;
  y = 0;
  update(tracker: PointerTracker, lerp = 0.05): void {
    this.x += (tracker.x - this.x) * lerp;
    this.y += (tracker.y - this.y) * lerp;
  }
}

export function updateOrbitCamera(
  camera: THREE.PerspectiveCamera,
  o: OrbitOptions,
  elapsed: number,
  pointer: SmoothedPointer,
): void {
  const angle = elapsed * o.speed + pointer.x * o.parallax;
  camera.position.x = o.target.x + Math.sin(angle) * o.radius;
  camera.position.z = o.target.z + Math.cos(angle) * o.radius;
  camera.position.y = o.height + pointer.y * (o.parallaxHeight ?? 0.6);
  camera.lookAt(o.target);
}
