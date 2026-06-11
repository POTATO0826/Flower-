import * as THREE from "three";
import { cappedPixelRatio, isAppleWebKit, viewportSize } from "../utils/device";

// Creates the WebGL renderer and attaches its canvas to the container.
export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const { width, height } = viewportSize(container);
  const renderer = new THREE.WebGLRenderer({
    // MSAA + the bloom composer triggers a WebKit bug on Apple GPUs that
    // sprays rainbow pixels around bright objects — render without it there
    // (the retina pixel ratio hides the missing AA anyway).
    antialias: !isAppleWebKit(),
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(cappedPixelRatio());
  renderer.setSize(width, height);

  // Nicer colour + tone mapping for the soft, photographic look.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // Real soft shadows — a big part of why the flowers read as "real".
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);
  return renderer;
}
