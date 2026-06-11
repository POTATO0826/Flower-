import * as THREE from "three";
import gsap from "gsap";
import { scaledCount } from "../utils/device";

export interface HeartsOptions {
  color?: number;
  count?: number;
}

export interface HeartsResult {
  group: THREE.Group;
  /** Spawn a burst of hearts rising from a world position. */
  burst(origin: THREE.Vector3): void;
  /**
   * Call once per frame: keeps the flat heart shapes facing the camera
   * (edge-on they'd vanish) and adds a gentle floating sway.
   */
  update(camera: THREE.Camera, elapsed: number): void;
}

function heartShape(): THREE.Shape {
  const s = new THREE.Shape();
  const x = 0;
  const y = 0;
  s.moveTo(x, y + 0.5);
  s.bezierCurveTo(x, y + 0.5, x - 0.5, y, x - 0.5, y - 0.25);
  s.bezierCurveTo(x - 0.5, y - 0.6, x, y - 0.75, x, y - 1.0);
  s.bezierCurveTo(x, y - 0.75, x + 0.5, y - 0.6, x + 0.5, y - 0.25);
  s.bezierCurveTo(x + 0.5, y, x, y + 0.5, x, y + 0.5);
  return s;
}

// A reusable pool of little hearts. On `burst` they fly up and out from the
// flower, then fade — used for the click/tap reveal moment.
export function createHearts(options: HeartsOptions = {}): HeartsResult {
  const color = options.color ?? 0xff5a8a;
  const count = scaledCount(options.count ?? 16);

  const geo = new THREE.ShapeGeometry(heartShape(), 20);
  geo.center();
  geo.scale(0.16, 0.16, 0.16);

  const group = new THREE.Group();
  const hearts: THREE.Mesh[] = [];

  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    group.add(mesh);
    hearts.push(mesh);
  }

  // Per-heart sway phase, so the floating wobble differs heart to heart.
  const phases = hearts.map(() => Math.random() * Math.PI * 2);

  const burst = (origin: THREE.Vector3) => {
    hearts.forEach((heart, i) => {
      const mat = heart.material as THREE.MeshBasicMaterial;
      const a = (i / hearts.length) * Math.PI * 2 + Math.random();
      const spread = 0.5 + Math.random() * 0.9;
      const size = 0.75 + Math.random() * 0.5;
      const delay = i * 0.05; // bloom outward one after another, not as a clap

      heart.visible = true;
      heart.position.copy(origin);
      heart.scale.setScalar(0.2);
      mat.opacity = 0;

      const tl = gsap.timeline({
        delay,
        onComplete: () => {
          heart.visible = false;
        },
      });
      tl.to(mat, { opacity: 0.95, duration: 0.35, ease: "sine.out" }, 0)
        .to(
          heart.scale,
          { x: size, y: size, z: size, duration: 0.6, ease: "back.out(1.8)" },
          0,
        )
        // A slow rise that keeps easing off, like a heart caught by the breeze.
        .to(
          heart.position,
          {
            x: origin.x + Math.cos(a) * spread,
            y: origin.y + 1.8 + Math.random() * 1.0,
            z: origin.z + Math.sin(a) * spread,
            duration: 2.6,
            ease: "power2.out",
          },
          0,
        )
        .to(mat, { opacity: 0, duration: 1.0, ease: "sine.in" }, 1.6);
    });
  };

  const update = (camera: THREE.Camera, elapsed: number) => {
    hearts.forEach((heart, i) => {
      if (!heart.visible) return;
      heart.quaternion.copy(camera.quaternion); // always face the viewer
      heart.rotation.z += Math.sin(elapsed * 2.4 + phases[i]) * 0.12; // sway
    });
  };

  return { group, burst, update };
}
