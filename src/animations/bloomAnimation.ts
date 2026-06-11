import gsap from "gsap";
import type { Petal } from "../objects/flowers/types";
import type * as THREE from "three";

// Reusable GSAP building blocks for the "grow & bloom" sequence.
// Each design assembles a timeline from these so the flow stays consistent
// while the flowers themselves differ.

/** Pop the leaves out one after another. */
export function growLeaves(
  tl: gsap.core.Timeline,
  leaves: THREE.Group[],
  at: number,
  stagger = 0.18,
): void {
  leaves.forEach((leaf, i) => {
    tl.to(
      leaf.scale,
      { x: 1, y: 1, z: 1, duration: 0.7, ease: "back.out(1.6)" },
      at + i * stagger,
    );
  });
}

export interface BloomPetalOptions {
  /** Delay between each petal starting to open. */
  stagger?: number;
  /** How long one petal takes to unfurl. */
  duration?: number;
}

/**
 * Realistic two-phase bloom:
 *   1. "bud" — all petals quickly scale up while still closed, forming a bud
 *   2. "open" — petals unfurl one by one (array order = open order)
 * Returns the time at which the last petal finishes opening.
 */
export function bloomPetals(
  tl: gsap.core.Timeline,
  petals: Petal[],
  budAt: number,
  openAt: number,
  options: BloomPetalOptions = {},
): number {
  const stagger = options.stagger ?? 0.05;
  const duration = options.duration ?? 1.5;

  petals.forEach((petal, i) => {
    // Phase 1: the bud forms (petals appear, still wrapped shut).
    tl.to(
      petal.object.scale,
      {
        x: petal.scale,
        y: petal.scale,
        z: petal.scale,
        duration: 0.7,
        ease: "back.out(1.2)",
      },
      budAt + i * 0.012,
    );
    // Phase 2: each petal slowly leans open — a real unfurl, not a pop.
    tl.to(
      petal.pivot.rotation,
      { x: petal.openTilt, duration, ease: "power2.inOut" },
      openAt + i * stagger,
    );
  });

  return openAt + (petals.length - 1) * stagger + duration;
}

/** Fade a material (particles, glow) from invisible to a target opacity. */
export function fadeInMaterial(
  tl: gsap.core.Timeline,
  material: { opacity: number },
  at: number,
  opacity = 0.85,
  duration = 1.6,
): void {
  tl.to(material, { opacity, duration, ease: "power2.out" }, at);
}
