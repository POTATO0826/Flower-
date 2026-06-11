import type * as THREE from "three";

// Shared types for the realistic flower builders.

export interface Petal {
  /** The group the bloom timeline rotates (rotation.x: closed -> open). */
  pivot: THREE.Group;
  /** The petal mesh the bloom timeline scales up from ~0. */
  object: THREE.Object3D;
  /** Final outward lean once bloomed (radians). */
  openTilt: number;
  /** Starting lean while still a closed bud. */
  closedTilt: number;
  /** Final scale once bloomed. */
  scale: number;
}

export interface RealFlower {
  /** The whole flower head. The scene places it on top of the stem. */
  group: THREE.Group;
  /**
   * All petals, ordered by when they should open
   * (first in the array = first to unfurl).
   */
  petals: Petal[];
  /** Stamens / pistil / seed disc — scaled in when the bud forms. */
  center?: THREE.Object3D;
  /** Optional per-frame motion (e.g. swaying stamens). */
  update?: (dt: number, elapsed: number) => void;
}
