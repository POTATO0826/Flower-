import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { isAppleWebKit, qualityScale, viewportSize } from "../utils/device";

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
  const { width, height } = viewportSize(container);

  const composer = new EffectComposer(renderer);
  composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));

  // Bloom is the most expensive effect on phones — run its internal render
  // targets at half resolution there. The glow is blurry by nature, so the
  // difference is invisible, but the GPU saving is big.
  const q = qualityScale();
  const resScale = q < 1 ? 0.5 : 1;
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(Math.round(width * resScale), Math.round(height * resScale)),
    bloom.strength * (0.85 + q * 0.15),
    bloom.radius,
    bloom.threshold,
  );

  // Scrub NaN / infinity before they enter the bloom blur. Apple GPUs
  // occasionally produce invalid pixels (e.g. at grazing angles of glossy
  // materials); the gaussian blur then smears a single bad texel into a
  // whole disc of random-colored dots around anything bright. Killing them
  // at the high-pass keeps the glow clean everywhere.
  const lumMat = bloomPass.materialHighPassFilter;
  lumMat.fragmentShader = lumMat.fragmentShader.replace(
    "vec4 texel = texture2D( tDiffuse, vUv );",
    [
      "vec4 texel = texture2D( tDiffuse, vUv );",
      "if (any(notEqual(texel, texel)) || any(greaterThan(abs(texel), vec4(65000.0)))) texel = vec4(0.0);",
      "texel = clamp(texel, 0.0, 16.0);",
    ].join("\n\t\t\t\t"),
  );
  lumMat.needsUpdate = true;

  // Apple WebKit GPUs keep finding new ways to corrupt the bloom buffers
  // (the rainbow-dot bug), so there the scene ships without the glow pass
  // entirely — brightness comes from plain lights instead. The bloomPass
  // object still exists so the tap-pulse animation code stays harmless.
  if (!isAppleWebKit()) composer.addPass(bloomPass);

  return { composer, bloomPass };
}
