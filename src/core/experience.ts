import * as THREE from "three";
import type { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import type { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createRenderer } from "./renderer";
import { createCamera } from "./camera";
import { createScene } from "./createScene";
import { createComposer, type BloomOptions } from "./postprocessing";
import { onResize } from "../utils/resize";

// The "experience" ties the whole render stack together: renderer, scene,
// camera, bloom composer, a clock, the animation loop, and tidy disposal.
// Each design just builds its world and registers update callbacks.

export interface ExperienceOptions {
  background: number | THREE.Texture;
  fog?: { color: number; near: number; far: number };
  bloom: BloomOptions;
  /** Image-based lighting strength (subtle realistic reflections). */
  environmentIntensity?: number;
}

export type UpdateCallback = (dt: number, elapsed: number) => void;

export interface Experience {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
  clock: THREE.Clock;
  onUpdate(cb: UpdateCallback): void;
  start(): void;
  dispose(): void;
}

export function createExperience(
  container: HTMLElement,
  options: ExperienceOptions,
): Experience {
  const renderer = createRenderer(container);
  const scene = createScene({ background: options.background, fog: options.fog });
  const camera = createCamera(container);

  // Image-based lighting: a neutral "room" environment gives petals and
  // glass-like materials realistic soft reflections without any HDR files.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = options.environmentIntensity ?? 0.45;
  pmrem.dispose();
  const { composer, bloomPass } = createComposer(
    renderer,
    scene,
    camera,
    options.bloom,
    container,
  );

  const clock = new THREE.Clock();
  const updates: UpdateCallback[] = [];
  const disposeResize = onResize(renderer, camera, composer, container);

  let raf = 0;
  let running = false;
  let disposed = false;

  const loop = () => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05); // clamp for tab-switch jumps
    const elapsed = clock.getElapsedTime();
    for (const cb of updates) cb(dt, elapsed);
    composer.render();
  };

  return {
    scene,
    camera,
    renderer,
    composer,
    bloomPass,
    clock,
    onUpdate(cb) {
      updates.push(cb);
    },
    start() {
      if (running) return;
      running = true;
      clock.start();
      loop();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      disposeResize();

      // Free GPU memory so switching routes doesn't leak.
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });

      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
