import * as THREE from "three";
import { qualityScale } from "../utils/device";

// Lighting moods. The garden is lit like a calm spring night:
// cool moonlight, a faint sky glow, and the gentlest pink bounce.
export type LightingPreset = "sakura";

/** A directional key light that casts soft shadows over the flower area. */
function makeKeyLight(
  color: number,
  intensity: number,
  position: THREE.Vector3,
): THREE.DirectionalLight {
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.copy(position);
  light.castShadow = true;
  // Smaller shadow map on phones — soft shadows hide the difference.
  const mapSize = qualityScale() < 1 ? 512 : 1024;
  light.shadow.mapSize.set(mapSize, mapSize);
  light.shadow.camera.left = -4;
  light.shadow.camera.right = 4;
  light.shadow.camera.top = 4;
  light.shadow.camera.bottom = -4;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 20;
  light.shadow.bias = -0.0004;
  light.shadow.radius = 4;
  return light;
}

export function addLighting(
  scene: THREE.Scene,
  _preset: LightingPreset,
): THREE.Light[] {
  const lights: THREE.Light[] = [];
  const add = (light: THREE.Light) => {
    scene.add(light);
    lights.push(light);
    return light;
  };

  // Night-sky ambience (cool above, plum below) — bright enough to carry
  // the scene without any bloom glow.
  add(new THREE.HemisphereLight(0x3a4168, 0x2c1d30, 0.62));
  // Moonlight: cool and clear, casting the soft shadow.
  add(makeKeyLight(0xc7d4ff, 1.05, new THREE.Vector3(-3, 5.5, 2.5)));
  // A gentle pink lantern-glow near the blossom.
  const pink = add(new THREE.PointLight(0xff9ec4, 0.5, 10));
  pink.position.set(1.5, 1.5, 2);

  return lights;
}
