import * as THREE from "three";
import { makeSoftCircleTexture } from "../utils/textures";
import { scaledCount } from "../utils/device";

export interface ParticlesOptions {
  count?: number;
  color?: number;
  /** Radius of the cylindrical volume particles float within. */
  radius?: number;
  /** Height of that volume. */
  height?: number;
  size?: number;
  /** Drift speed. Positive = float up (dust), negative = fall (petals). */
  rise?: number;
  /** Start the volume below the flower (e.g. for ground mist). */
  baseY?: number;
  /** Custom sprite (e.g. a petal shape). Defaults to a soft glow circle. */
  texture?: THREE.Texture;
}

export interface ParticlesResult {
  points: THREE.Points;
  material: THREE.PointsMaterial;
  update(dt: number, elapsed: number): void;
}

// Soft floating sparkles/dust around the flower. Starts invisible (opacity 0)
// and the bloom timeline fades it in. Count auto-scales down on phones.
export function createParticles(options: ParticlesOptions = {}): ParticlesResult {
  const count = scaledCount(options.count ?? 320);
  const radius = options.radius ?? 3;
  const height = options.height ?? 5;
  const rise = options.rise ?? 0.35;
  const baseY = options.baseY ?? -1;

  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(Math.random()) * radius;
    const a = Math.random() * Math.PI * 2;
    positions[i * 3 + 0] = Math.cos(a) * r;
    positions[i * 3 + 1] = baseY + Math.random() * height;
    positions[i * 3 + 2] = Math.sin(a) * r;
    speeds[i] = 0.3 + Math.random() * 0.9;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    size: options.size ?? 0.07,
    map: options.texture ?? makeSoftCircleTexture(),
    color: options.color ?? 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, material);

  const update = (dt: number, elapsed: number) => {
    const arr = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      let y = arr[i * 3 + 1] + speeds[i] * rise * dt;
      // Wrap around the volume (works for rising dust and falling petals).
      if (rise >= 0 && y > baseY + height) y = baseY;
      if (rise < 0 && y < baseY) y = baseY + height;
      arr[i * 3 + 1] = y;
      // gentle sideways sway
      arr[i * 3 + 0] += Math.sin(elapsed * 0.6 + phases[i]) * 0.0009;
    }
    geo.attributes.position.needsUpdate = true;
  };

  return { points, material, update };
}
