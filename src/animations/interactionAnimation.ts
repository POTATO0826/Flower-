import * as THREE from "three";

// Tap handling. We raycast against an (invisible) hit target placed at the
// flower so taps are reliable across every petal style. Pointer events with
// a small movement budget tell genuine taps apart from camera drags — a
// swipe that happens to start on the flower must not fire the burst.

export interface InteractionOptions {
  domElement: HTMLElement;
  camera: THREE.Camera;
  targets: THREE.Object3D[];
  /** Called when the flower is tapped. `first` is true only the first time. */
  onActivate: (first: boolean) => void;
}

const TAP_SLOP_PX = 12;

export function setupInteraction(options: InteractionOptions): () => void {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let activated = false;
  let downId = -1;
  let downX = 0;
  let downY = 0;

  const onDown = (e: PointerEvent) => {
    downId = e.pointerId;
    downX = e.clientX;
    downY = e.clientY;
  };

  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== downId) return;
    downId = -1;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > TAP_SLOP_PX) return;

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

  options.domElement.addEventListener("pointerdown", onDown);
  options.domElement.addEventListener("pointerup", onUp);
  return () => {
    options.domElement.removeEventListener("pointerdown", onDown);
    options.domElement.removeEventListener("pointerup", onUp);
  };
}
