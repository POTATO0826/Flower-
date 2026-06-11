import * as THREE from "three";
import gsap from "gsap";
import { createExperience } from "../core/experience";
import { addLighting, type LightingPreset } from "../core/lighting";
import type { BloomOptions } from "../core/postprocessing";
import { createOrbitDrag } from "../utils/mouse";
import { createOverlay } from "../utils/ui";
import { makeGradientTexture } from "../utils/textures";
import {
  createPetalGeometry,
  createPetalMaterial,
} from "../objects/flowers/petalGeometry";
import { createBranch, type BranchOptions } from "../objects/createBranch";
import { createLeaves } from "../objects/createLeaves";
import { createParticles, type ParticlesOptions } from "../objects/createParticles";
import { createHearts } from "../objects/createHearts";
import type { RealFlower } from "../objects/flowers/types";
import { setupInteraction } from "../animations/interactionAnimation";
import { viewportSize } from "../utils/device";
import {
  growLeaves,
  bloomPetals,
  fadeInMaterial,
} from "../animations/bloomAnimation";
import { updateOrbitCamera } from "../animations/cameraAnimation";

// The shared "flower experience". The config decides which flower, lighting,
// sky and particles; this builds the whole journey:
//   a single petal flutters down -> where it lands, a branch grows -> a bud
//   forms -> petals unfurl one by one -> particles -> slow orbit; tapping
//   the flower makes it glow and burst.
// No text — the scene speaks for itself.

export interface FlowerSceneConfig {
  themeClass: string;
  /** Sky gradient. */
  bgTop: number;
  bgBottom: number;
  fog?: { color: number; near: number; far: number };
  bloom: BloomOptions;
  lighting: LightingPreset;
  environmentIntensity?: number;
  branch: BranchOptions;
  /** Set to null for flowers without big leaves (e.g. a blossom branch). */
  leaves: { color: number; count: number } | null;
  flower: RealFlower;
  /** Scale of the flower head. */
  headScale?: number;
  /**
   * Extra smaller blossoms sprouting from the branch's attach points, so the
   * branch carries a whole flowering cluster instead of a single bloom.
   */
  extraFlowers?: {
    make: () => RealFlower;
    /** Scale per attach point (falls back to 0.75). */
    scales?: number[];
  };
  /** Y of the ground / flower base. */
  flowerY?: number;
  particles: ParticlesOptions;
  particleOpacity?: number;
  heartsColor: number;
  orbit: { radius: number; height: number; speed: number };
  /** Petal open pacing. */
  openStagger?: number;
  openDuration?: number;
  /** Idle spin of the head once bloomed (0 to disable). */
  headSpin?: number;
  /** Extra scene dressing; may return a per-frame update. */
  dress?: (scene: THREE.Scene) => ((dt: number, elapsed: number) => void) | void;
}

function responsiveOrbit(
  container: HTMLElement,
  orbit: FlowerSceneConfig["orbit"],
): FlowerSceneConfig["orbit"] {
  const { width, height } = viewportSize(container);
  const narrow = width < 768;
  const compact = Math.min(width, height) < 520;
  const radiusScale = compact ? 1.16 : narrow ? 1.08 : 1;

  return {
    radius: orbit.radius * radiusScale,
    height: orbit.height,
    speed: orbit.speed,
  };
}

export function createFlowerScene(
  container: HTMLElement,
  cfg: FlowerSceneConfig,
): () => void {
  const flowerY = cfg.flowerY ?? -1.25;

  const exp = createExperience(container, {
    background: makeGradientTexture(cfg.bgTop, cfg.bgBottom),
    fog: cfg.fog,
    bloom: cfg.bloom,
    environmentIntensity: cfg.environmentIntensity,
  });
  addLighting(exp.scene, cfg.lighting);
  const baseBloom = exp.bloomPass.strength;

  // --- ground: an invisible plane that only shows the flower's soft shadow
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(3.5, 48),
    new THREE.ShadowMaterial({ opacity: 0.22 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = flowerY + 0.01;
  ground.receiveShadow = true;
  exp.scene.add(ground);

  // --- plant -----------------------------------------------------------------
  const plant = new THREE.Group();
  plant.position.y = flowerY;
  exp.scene.add(plant);

  // The intro: one lone petal that flutters down from the sky. Where it
  // lands, the flower grows — no bright magic particle, just a quiet petal.
  const introPetal = new THREE.Mesh(
    createPetalGeometry({
      length: 0.34,
      width: 0.34,
      cup: 0.12,
      notch: 0.05,
      baseColor: 0xff85b0,
      midColor: 0xffc9dc,
      tipColor: 0xfff6f9,
    }),
    createPetalMaterial(0xffe2ec, 0.5, 0xff6a9a, 0.18),
  );
  introPetal.position.set(0.8, 4.6, 0.4);
  plant.add(introPetal);

  const branch = createBranch(cfg.branch);
  plant.add(branch.group);

  const leaves = cfg.leaves
    ? createLeaves({
        color: cfg.leaves.color,
        stemHeight: cfg.branch.height ?? 2.2,
        count: cfg.leaves.count,
      })
    : null;
  if (leaves) plant.add(leaves.group);

  // The flower head sits on the branch tip.
  const head = new THREE.Group();
  head.add(cfg.flower.group);
  head.scale.setScalar(cfg.headScale ?? 1);
  head.position.copy(branch.top);
  plant.add(head);

  // Invisible tap target covering the head (reliable on phones).
  const hitbox = new THREE.Mesh(
    new THREE.SphereGeometry(1.3, 8, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  head.add(hitbox);

  // Extra blossoms along the wood — the branch blooms as a cluster.
  const up = new THREE.Vector3(0, 1, 0);
  const clusterFlowers: RealFlower[] = [];
  if (cfg.extraFlowers) {
    branch.attachPoints.forEach((spot, i) => {
      const flower = cfg.extraFlowers!.make();
      const holder = new THREE.Group();
      // Sit right on the wood — floating a flower off its twig reads as a
      // missing branch.
      holder.position.copy(spot.position).addScaledVector(spot.direction, 0.04);
      // Lean outward (halfway between "up" and the spot's facing direction).
      holder.quaternion.setFromUnitVectors(
        up,
        spot.direction.clone().lerp(up, 0.45).normalize(),
      );
      holder.rotateY(Math.random() * Math.PI * 2);
      holder.scale.setScalar(cfg.extraFlowers!.scales?.[i] ?? 0.75);
      holder.add(flower.group);
      plant.add(holder);
      clusterFlowers.push(flower);
    });
  }

  const particles = createParticles(cfg.particles);
  exp.scene.add(particles.points);

  const hearts = createHearts({ color: cfg.heartsColor });
  exp.scene.add(hearts.group);

  const dressUpdate = cfg.dress?.(exp.scene) ?? null;

  // --- overlay (just the music button) ---------------------------------------
  const overlay = createOverlay(container, { themeClass: cfg.themeClass });

  // --- the grow & bloom timeline -------------------------------------------
  let bloomed = false;
  let introLanded = false;

  const tl = gsap.timeline({ delay: 0.4 });
  // 1-2: the lone petal flutters down and lands (rotation flutter happens
  // in the per-frame update below).
  tl.to(introPetal.position, { y: 0.04, duration: 2.4, ease: "sine.in" }, 0)
    .to(introPetal.position, { x: 0, z: 0, duration: 2.4, ease: "sine.inOut" }, 0)
    .add(() => {
      introLanded = true;
    }, 2.3)
    // ...then melts into the ground as the branch takes over.
    .to(introPetal.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.6 }, 2.5);
  // 3: the branch grows from where the petal landed — revealed along its own
  // curve (twigs sprout on the way, buds pop at their tips).
  const growth = { t: 0 };
  tl.to(
    growth,
    {
      t: 1,
      duration: 2.4,
      ease: "power1.inOut",
      onUpdate: () => branch.setGrowth(growth.t),
    },
    2.35,
  );
  // 4: leaves (if this flower has any).
  if (leaves) growLeaves(tl, leaves.leaves, 3.3);
  // 5: once the branch tip arrives, the bud forms and petals unfurl.
  if (cfg.flower.center) {
    tl.to(
      cfg.flower.center.scale,
      { x: 1, y: 1, z: 1, duration: 0.8, ease: "back.out(1.5)" },
      4.25,
    );
  }
  const openEnd = bloomPetals(tl, cfg.flower.petals, 4.15, 5.05, {
    stagger: cfg.openStagger ?? 0.05,
    duration: cfg.openDuration ?? 1.5,
  });
  // 5b: the cluster blossoms follow one by one, each after the wood at its
  // spot has finished growing.
  clusterFlowers.forEach((flower, i) => {
    const at = 4.4 + branch.attachPoints[i].order * 0.45;
    if (flower.center) {
      tl.to(
        flower.center.scale,
        { x: 1, y: 1, z: 1, duration: 0.7, ease: "back.out(1.5)" },
        at + 0.1,
      );
    }
    bloomPetals(tl, flower.petals, at, at + 0.8, { stagger: 0.1, duration: 1.6 });
  });
  // 6: particles drift in while the flower opens.
  fadeInMaterial(tl, particles.material, 5.5, cfg.particleOpacity ?? 0.75);
  // The flower starts its idle sway once fully open.
  tl.add(() => {
    bloomed = true;
  }, openEnd - 0.4);

  // --- tap the flower: glow pulse + heart burst -------------------------------
  const activate = (_first: boolean) => {
    hearts.burst(head.getWorldPosition(new THREE.Vector3()));
    gsap.fromTo(
      exp.bloomPass,
      { strength: baseBloom },
      {
        strength: baseBloom + 1.1,
        duration: 0.4,
        yoyo: true,
        repeat: 1,
        ease: "power2.out",
      },
    );
  };
  const disposeInteraction = setupInteraction({
    domElement: exp.renderer.domElement,
    camera: exp.camera,
    targets: [hitbox],
    onActivate: activate,
  });

  // --- 7: orbit camera: drag to spin 360°, slow auto-turn after the bloom ---
  const orbitDrag = createOrbitDrag(exp.renderer.domElement);
  const target = new THREE.Vector3(0, flowerY + branch.top.y * 0.85, 0);
  const headSpin = cfg.headSpin ?? 0.08;
  let autoAngle = 0;
  let spinRamp = 0; // 0 while the flower opens; eases to 1 once bloomed

  exp.onUpdate((dt, elapsed) => {
    orbitDrag.update(dt);
    // The intro petal tumbles gently while it falls.
    if (!introLanded) {
      introPetal.rotation.x = Math.sin(elapsed * 2.2) * 0.7;
      introPetal.rotation.y += dt * 1.6;
      introPetal.rotation.z = Math.cos(elapsed * 1.7) * 0.5;
    }
    // The camera holds still for the bloom, then the slow turn fades in.
    if (bloomed) spinRamp = Math.min(1, spinRamp + dt / 2.5);
    const ease = spinRamp * spinRamp * (3 - 2 * spinRamp);
    const orbit = responsiveOrbit(container, cfg.orbit);
    autoAngle += orbit.speed * ease * dt;
    updateOrbitCamera(
      exp.camera,
      { target, radius: orbit.radius, height: orbit.height },
      autoAngle + orbitDrag.angle,
      orbitDrag.lift,
    );
    particles.update(dt, elapsed);
    branch.update(dt, elapsed);
    cfg.flower.update?.(dt, elapsed);
    for (const flower of clusterFlowers) flower.update?.(dt, elapsed);
    dressUpdate?.(dt, elapsed);
    if (bloomed) {
      // The whole plant sways gently, like a light breeze.
      plant.rotation.z = Math.sin(elapsed * 0.5) * 0.02;
      head.position.y = branch.top.y + Math.sin(elapsed * 0.8) * 0.025;
      head.rotation.y += dt * headSpin;
    }
  });

  exp.start();

  // --- cleanup ---------------------------------------------------------------
  return () => {
    tl.kill();
    disposeInteraction();
    orbitDrag.dispose();
    overlay.dispose();
    exp.dispose();
  };
}
