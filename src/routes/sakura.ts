import * as THREE from "three";
import { createFlowerScene } from "./flowerScene";
import { createBlossom } from "../objects/flowers/blossom";
import { createSakuraTree } from "../objects/createSakuraTree";
import { createParticles } from "../objects/createParticles";
import { palettes } from "../utils/colors";
import {
  makePetalSpriteTexture,
  makeSoftCircleTexture,
} from "../utils/textures";
import { scaledCount } from "../utils/device";

// THE experience — "Sakura For You".
// Yozakura: cherry blossoms by night. A blossom blooms on a woody branch in
// a dark, moonlit garden — softly glowing sakura trees all around, petals
// drifting down, a little snow in the air, and a slow 3D orbit around the
// flower. No words; just the scene.

export function initSakura(container: HTMLElement): () => void {
  const p = palettes.sakura;

  return createFlowerScene(container, {
    themeClass: "theme-sakura",
    bgTop: p.bgTop,
    bgBottom: p.bgBottom,
    fog: p.fog,
    // Softer threshold at night so the blossom, moon and seed glow gently.
    bloom: { strength: 0.55, radius: 0.7, threshold: 0.62 },
    lighting: "sakura",
    environmentIntensity: 0.18, // night: barely-there reflections
    // A natural flowering branch: leans gracefully, tapers to the tip,
    // and carries two budding side twigs.
    branch: { height: 2.1, color: p.stem, radius: 0.07 },
    // Real sakura bloom on bare branches — no leaves.
    leaves: null,
    flower: createBlossom(),
    headScale: 1.35, // the blossom is the star — keep it big and clear
    particles: {
      // Falling sakura petals all around (negative rise = drift down).
      count: 220,
      color: p.particle,
      radius: 5,
      height: 5.5,
      size: 0.14,
      rise: -0.3,
      baseY: -1.3,
      texture: makePetalSpriteTexture(),
    },
    particleOpacity: 0.95,
    heartsColor: p.accent,
    // The slow turn around the blossom — parallax lets a finger-drag steer it.
    orbit: { radius: 4.4, height: 1.7, speed: 0.16, parallax: 0.5 },
    openStagger: 0.28, // five petals, each given its own moment
    openDuration: 2.0,
    headSpin: 0.05,

    dress: (scene) => {
      // --- dark moonlit ground ---------------------------------------------
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(30, 48),
        new THREE.MeshStandardMaterial({ color: 0x241a26, roughness: 1 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1.245; // a hair under the shadow catcher
      ground.receiveShadow = true;
      scene.add(ground);

      // --- the moon, low and soft ------------------------------------------
      const moon = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: makeSoftCircleTexture(),
          color: 0xfff3da,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
        }),
      );
      moon.position.set(-8, 6.5, -9);
      moon.scale.setScalar(3.4);
      scene.add(moon);

      // --- a quiet field of stars -------------------------------------------
      const starCount = scaledCount(350);
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const r = 16 + Math.random() * 10;
        const theta = Math.random() * Math.PI * 2;
        // Keep stars in the upper hemisphere of the sky.
        const phi = Math.random() * Math.PI * 0.45;
        starPos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = r * Math.cos(phi);
        starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      const stars = new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({
          size: 0.1,
          map: makeSoftCircleTexture(),
          color: 0xfff6ea,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      scene.add(stars);

      // --- a ring of sakura trees around the garden -----------------------
      const treeSpots = [
        { x: 5.5, z: -3.5, s: 1.15, r: 0.5 },
        { x: -5.0, z: -4.5, s: 1.3, r: 2.1 },
        { x: -4.5, z: 4.0, s: 1.0, r: 4.0 },
        { x: 4.0, z: 5.0, s: 1.2, r: 1.2 },
        { x: 0.5, z: -7.0, s: 1.45, r: 3.3 },
        { x: -7.5, z: 0.5, s: 1.1, r: 5.5 },
      ];
      for (const spot of treeSpots) {
        const tree = createSakuraTree();
        tree.position.set(spot.x, -1.3, spot.z);
        tree.scale.setScalar(spot.s);
        tree.rotation.y = spot.r;
        scene.add(tree);
      }

      // --- a little snow drifting through the air -------------------------
      const snow = createParticles({
        count: 110,
        color: 0xffffff,
        radius: 7,
        height: 6,
        size: 0.05,
        rise: -0.12,
        baseY: -1.3,
        texture: makeSoftCircleTexture(),
      });
      snow.material.opacity = 0.7; // snow falls from the very beginning
      scene.add(snow.points);

      // --- a soft halo of moon-pink light around the blossom ----------------
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: makeSoftCircleTexture(),
          color: 0xffc4da,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        }),
      );
      halo.position.set(0, 0.95, 0); // around the flower head
      halo.scale.setScalar(3.2);
      scene.add(halo);

      // (The unopened buds now live on the branch itself — see createBranch.)

      // Per-frame: keep the snow falling and the halo gently breathing.
      return (dt, elapsed) => {
        snow.update(dt, elapsed);
        const breath = 1 + Math.sin(elapsed * 0.7) * 0.06;
        halo.scale.setScalar(3.2 * breath);
      };
    },
  });
}
