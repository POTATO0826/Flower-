import * as THREE from "three";
import type { Petal } from "./types";

// The heart of the realistic flowers: a parametric petal.
//
// We start from a flat plane and sculpt it vertex by vertex:
//   - a width profile gives the petal its silhouette (broad rose, narrow lily…)
//   - "cup" curves it across its width (petals cradle the flower centre)
//   - "arch" + "curl" bend it backwards along its length (open petals relax)
//   - "ruffle" adds the slightly wavy edges real petals have
//   - "notch" cuts the little dip in a cherry-blossom petal tip
//   - vertex colours paint a base -> mid -> tip gradient like a real petal

export interface PetalGeometryOptions {
  length: number;
  width: number;
  /** Relative half-width along the petal (t: 0 = base, 1 = tip). */
  widthProfile?: (t: number) => number;
  /** Crosswise cupping (positive = edges curve toward the flower centre). */
  cup?: number;
  /** Lengthwise backwards lean. */
  arch?: number;
  /** Extra curl-back of the tip (lilies recurve strongly). */
  curl?: number;
  /** Wavy edge amplitude. */
  ruffle?: number;
  ruffleFreq?: number;
  /** Depth of the notch at the tip (cherry blossom). */
  notch?: number;
  baseColor: number;
  midColor?: number;
  tipColor: number;
  /** Slightly darken the very edges for depth (0..1). */
  edgeDarken?: number;
}

const defaultProfile = (t: number) => Math.sin(Math.PI * Math.min(t, 1)) ** 0.6;

export function createPetalGeometry(
  o: PetalGeometryOptions,
): THREE.BufferGeometry {
  const segsW = 10;
  const segsL = 18;
  const geo = new THREE.PlaneGeometry(1, 1, segsW, segsL);

  const cup = o.cup ?? 0.2;
  const arch = o.arch ?? 0.15;
  const curl = o.curl ?? 0.1;
  const ruffle = o.ruffle ?? 0;
  const ruffleFreq = o.ruffleFreq ?? 3;
  const profile = o.widthProfile ?? defaultProfile;

  const base = new THREE.Color(o.baseColor);
  const mid = new THREE.Color(o.midColor ?? o.tipColor);
  const tip = new THREE.Color(o.tipColor);
  const edgeDarken = o.edgeDarken ?? 0.15;

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const xn = pos.getX(i) * 2; // -1 .. 1 across the width
    let t = pos.getY(i) + 0.5; //  0 .. 1 base -> tip

    // Cherry-blossom notch: pull the tip centre down a little.
    if (o.notch && t > 0.8) {
      t -= o.notch * (1 - Math.abs(xn)) * ((t - 0.8) / 0.2) ** 2;
    }

    const w = profile(THREE.MathUtils.clamp(t, 0, 1));
    const x = xn * 0.5 * o.width * w;
    const y = t * o.length;

    // Sculpt depth: cup across, lean back along, curl the tip, ruffle edges.
    let z = -cup * xn * xn * (0.35 + 0.65 * t); // concave side faces centre
    z += arch * t * t;
    if (t > 0.6) z += curl * ((t - 0.6) / 0.4) ** 2;
    z += ruffle * Math.sin(xn * Math.PI * ruffleFreq) * t * t;

    pos.setXYZ(i, x, y, z);

    // Base -> mid -> tip colour gradient with darkened edges.
    if (t < 0.5) c.lerpColors(base, mid, THREE.MathUtils.smoothstep(t * 2, 0, 1));
    else c.lerpColors(mid, tip, THREE.MathUtils.smoothstep((t - 0.5) * 2, 0, 1));
    const edge = 1 - edgeDarken * Math.abs(xn) ** 3;
    colors[i * 3 + 0] = c.r * edge;
    colors[i * 3 + 1] = c.g * edge;
    colors[i * 3 + 2] = c.b * edge;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/** A soft, slightly silky material that reads as a living petal. */
export function createPetalMaterial(
  sheenColor: number,
  roughness = 0.55,
  /** Optional faint self-glow so the flower stays visible in a night scene. */
  emissive?: number,
  emissiveIntensity = 0.12,
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness,
    metalness: 0,
    sheen: 1,
    sheenColor: new THREE.Color(sheenColor),
    sheenRoughness: 0.5,
    emissive: new THREE.Color(emissive ?? 0x000000),
    emissiveIntensity: emissive ? emissiveIntensity : 0,
  });
}

// ---- ring assembly -------------------------------------------------------

export interface RingConfig {
  count: number;
  /** Distance of each petal's base from the centre axis. */
  radius: number;
  y?: number;
  /** Final outward lean (radians). Small = still cupped, large = wide open. */
  openTilt: number;
  closedTilt?: number;
  scale?: number;
  /** Rotate the whole ring (offsets layers so petals interleave). */
  spin?: number;
  /** 0..1 organic randomness in tilt / twist / scale. */
  jitter?: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Place one ring of petals around the centre axis and record each petal
 * so the bloom timeline can animate it individually.
 * Call rings in the order they should open (sepals/outer first).
 */
export function addPetalRing(
  parent: THREE.Group,
  out: Petal[],
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  cfg: RingConfig,
): void {
  const closed = cfg.closedTilt ?? 0.08;
  const jitter = cfg.jitter ?? 0.6;

  for (let i = 0; i < cfg.count; i++) {
    const angle = (i / cfg.count) * Math.PI * 2 + (cfg.spin ?? 0);

    const ring = new THREE.Group(); // rotates the petal around the axis
    ring.rotation.y = angle;
    ring.position.y = cfg.y ?? 0;

    const holder = new THREE.Group(); // the bloom tilts this outward
    holder.position.z = cfg.radius;
    holder.rotation.x = closed + rand(-1, 1) * 0.03 * jitter;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.rotation.y = rand(-1, 1) * 0.08 * jitter; // slight natural twist
    mesh.scale.setScalar(0.0001); // grows in during the bud phase

    holder.add(mesh);
    ring.add(holder);
    parent.add(ring);

    out.push({
      pivot: holder,
      object: mesh,
      openTilt: cfg.openTilt + rand(-1, 1) * 0.08 * jitter,
      closedTilt: closed,
      scale: (cfg.scale ?? 1) * (1 + rand(-1, 1) * 0.06 * jitter),
    });
  }
}
