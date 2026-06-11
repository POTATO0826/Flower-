import * as THREE from "three";
import {
  createPetalGeometry,
  createPetalMaterial,
  addPetalRing,
} from "./petalGeometry";
import type { Petal, RealFlower } from "./types";

// A clean, classic cherry blossom (sakura):
//   - five broad, overlapping petals with the soft notch at each tip
//   - white petals blushing to pink at the heart
//   - a neat ring of fine stamens with golden anthers
//   - a small brown calyx cupping the flower from below
// Kept deliberately simple and symmetric so it reads instantly as a sakura.

export interface BlossomOptions {
  /** Fewer stamens keep the small cluster blossoms cheap on phones. */
  stamens?: number;
}

export function createBlossom(options: BlossomOptions = {}): RealFlower {
  const group = new THREE.Group();
  const petals: Petal[] = [];

  // Broad rounded petal so the five overlap into a full blossom.
  const sakuraProfile = (t: number) =>
    Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.08)) ** 0.5;

  const petalGeo = createPetalGeometry({
    length: 0.62,
    width: 0.56, // narrow enough that the five petals stay distinct
    widthProfile: sakuraProfile,
    cup: 0.1, // soft and nearly flat — real sakura petals barely cup
    arch: 0.05,
    curl: 0.02,
    // Kept shallow: a deep notch folds the mesh over itself and the fold
    // shows up as black blobs on the petal tips.
    notch: 0.05,
    baseColor: 0xff85b0, // pink heart...
    midColor: 0xffcfe0,
    tipColor: 0xfff6f9, // ...fading to white tips
    edgeDarken: 0.04,
  });

  // The faint pink self-glow keeps the blossom luminous under the moon.
  const petalMat = createPetalMaterial(0xffe2ec, 0.5, 0xff6a9a, 0.14);

  // One neat ring of five — spaced out so each petal reads on its own.
  addPetalRing(group, petals, petalGeo, petalMat, {
    count: 5,
    radius: 0.09,
    y: 0,
    openTilt: 1.22, // opens wide and flat, like a pressed blossom
    scale: 1,
    spin: 0,
    jitter: 0.3,
  });

  // --- stamens: a tidy ring of fine filaments with golden tips -------------
  const center = new THREE.Group();

  const filamentGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.15, 5);
  filamentGeo.translate(0, 0.075, 0); // pivot at the base
  const filamentMat = new THREE.MeshStandardMaterial({
    color: 0xfff0f5,
    roughness: 0.8,
  });
  const antherGeo = new THREE.SphereGeometry(0.014, 8, 8);
  const antherMat = new THREE.MeshStandardMaterial({
    color: 0xffc83a,
    roughness: 0.6,
    emissive: 0x4a3000,
    emissiveIntensity: 0.35,
  });

  const stamenCount = options.stamens ?? 16;
  for (let i = 0; i < stamenCount; i++) {
    const a = (i / stamenCount) * Math.PI * 2;
    const stamen = new THREE.Group();
    stamen.rotation.y = a;
    stamen.rotation.x = 0.3 + (i % 3) * 0.12; // even, slightly varied splay

    const filament = new THREE.Mesh(filamentGeo, filamentMat);
    const anther = new THREE.Mesh(antherGeo, antherMat);
    anther.position.y = 0.155;

    stamen.add(filament, anther);
    center.add(stamen);
  }

  // A tiny pistil in the very middle.
  const pistil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.12, 5),
    filamentMat,
  );
  pistil.position.y = 0.06;
  center.add(pistil);

  // --- calyx: the little brown cup under the blossom -----------------------
  // Warm light bark tone — dark brown reads as a black spike at night.
  const calyx = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.11, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a6850, roughness: 0.95 }),
  );
  calyx.rotation.x = Math.PI; // point downward
  calyx.position.y = -0.06;
  center.add(calyx);

  center.scale.setScalar(0.0001); // scales in with the bud
  group.add(center);

  // The blossom faces gently outward (not straight up) like on a real branch.
  group.rotation.x = 0.4;

  return { group, petals, center };
}
