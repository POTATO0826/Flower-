import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { qualityScale } from "../utils/device";

export interface BloomOptions {
  strength: number;
  radius: number;
  threshold: number;
}

export interface PostProcessing {
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
}

// Sets up EffectComposer with a RenderPass + UnrealBloomPass so glowing parts
// (seed, petals, particles, neon lines) bloom softly. Bloom is dialled back a
// little on phones for performance.
export function createComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  bloom: BloomOptions,
  container: HTMLElement,
): PostProcessing {
  const w = container.clientWidth || window.innerWidth;
  const h = container.clientHeight || window.innerHeight;

  const composer = new EffectComposer(renderer);
  composer.setSize(w, h);
  composer.addPass(new RenderPass(scene, camera));

  // Bloom is the most expensive effect on phones — run its internal render
  // targets at half resolution there. The glow is blurry by nature, so the
  // difference is invisible, but the GPU saving is big.
  const q = qualityScale();
  const resScale = q < 1 ? 0.5 : 1;
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(Math.round(w * resScale), Math.round(h * resScale)),
    bloom.strength * (0.85 + q * 0.15),
    bloom.radius,
    bloom.threshold,
  );
  composer.addPass(bloomPass);

  return { composer, bloomPass };
}
