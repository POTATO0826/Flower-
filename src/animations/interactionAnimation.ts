import * as THREE from "three";

// Click / tap handling. We raycast against an (invisible) hit target placed at
// the flower so taps are reliable across every petal style — including the neon
// wireframe flower, which is hard to hit directly.

export interface InteractionOptions {
  domElement: HTMLElement;
  camera: THREE.Camera;
  targets: THREE.Object3D[];
  /** Called when the flower is tapped. `first` is true only the first time. */
  onActivate: (first: boolean) => void;
}

export function setupInteraction(options: InteractionOptions): () => void {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let activated = false;

  const handle = (e: MouseEvent) => {
    const rect = options.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    raycaster.setFromCamera(ndc, options.camera);
    const hits = raycaster.intersectObjects(options.targets, true);
    if (hits.length > 0) {
      options.onActivate(!activated);
      activated = true;
    }
  };

  // `click` fires for both mouse clicks and taps, so it covers phones too.
  options.domElement.addEventListener("click", handle);
  return () => options.domElement.removeEventListener("click", handle);
}
