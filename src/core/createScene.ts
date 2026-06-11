import * as THREE from "three";

export interface SceneOptions {
  /** A solid colour or a gradient texture (see utils/textures.ts). */
  background: number | THREE.Texture;
  fog?: { color: number; near: number; far: number };
}

// Creates the scene with a background (colour or gradient) and optional fog.
export function createScene(options: SceneOptions): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background =
    typeof options.background === "number"
      ? new THREE.Color(options.background)
      : options.background;
  if (options.fog) {
    scene.fog = new THREE.Fog(
      options.fog.color,
      options.fog.near,
      options.fog.far,
    );
  }
  return scene;
}
