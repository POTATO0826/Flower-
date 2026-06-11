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

  const burst = (origin: THREE.Vector3) => {
    hearts.forEach((heart, i) => {
      const mat = heart.material as THREE.MeshBasicMaterial;
      const a = (i / hearts.length) * Math.PI * 2 + Math.random();
      const spread = 0.6 + Math.random() * 0.8;

      heart.visible = true;
      heart.position.copy(origin);
      heart.scale.setScalar(0.3);
      heart.rotation.z = (Math.random() - 0.5) * 0.6;
      mat.opacity = 0;

      const tl = gsap.timeline({
        onComplete: () => {
          heart.visible = false;
        },
      });
      tl.to(mat, { opacity: 1, duration: 0.4 }, 0)
        .to(heart.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "back.out(2)" }, 0)
        .to(
          heart.position,
          {
            x: origin.x + Math.cos(a) * spread,
            y: origin.y + 1.4 + Math.random() * 0.8,
            z: origin.z + Math.sin(a) * spread,
            duration: 1.8,
            ease: "power1.out",
          },
          0,
        )
        .to(mat, { opacity: 0, duration: 0.8 }, 1.0);
    });
  };

  return { group, burst };
}
