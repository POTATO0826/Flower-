import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createFlowerScene } from "./flowerScene";
import { createBlossom } from "../objects/flowers/blossom";
import { createPetalGeometry } from "../objects/flowers/petalGeometry";
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

/**
 * One tiny five-petal flower as a single merged geometry, so hundreds can be
 * scattered over the snow with one InstancedMesh draw call.
 */
function makeTinyFlowerGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const petal = new THREE.CircleGeometry(0.045, 6);
    petal.scale(0.6, 1, 1);
    petal.translate(0, 0.05, 0); // pivot at the flower centre
    petal.rotateX(-Math.PI / 2 + 0.35); // lie almost flat, tips lifted
    petal.rotateY((i / 5) * Math.PI * 2);
    parts.push(petal);
  }
  const heart = new THREE.SphereGeometry(0.016, 6, 6);
  heart.translate(0, 0.02, 0);
  parts.push(heart);
  return mergeGeometries(parts);
}

export function initSakura(container: HTMLElement): () => void {
  const p = palettes.sakura;

  return createFlowerScene(container, {
    themeClass: "theme-sakura",
    bgTop: p.bgTop,
    bgBottom: p.bgBottom,
    fog: p.fog,
    // Softer threshold at night so the blossom, moon and seed glow gently.
    bloom: { strength: 0.42, radius: 0.7, threshold: 0.66 },
    lighting: "sakura",
    environmentIntensity: 0.12, // night: barely-there reflections
    // A natural flowering branch: leans gracefully, tapers to the tip,
    // and carries two budding side twigs.
    branch: { height: 2.1, color: p.stem, radius: 0.07 },
    // Real sakura bloom on bare branches — no leaves.
    leaves: null,
    flower: createBlossom(),
    headScale: 1.18, // the star of the scene, but no lollipop-on-a-stick
    // Smaller sisters along the bough and beside the twig buds, so the
    // branch blooms as a whole cluster instead of one lonely flower.
    // Kept small and low so the hero blossom clearly stands on its own.
    extraFlowers: {
      make: () => createBlossom({ stamens: 10 }),
      scales: [0.62, 0.55, 0.52, 0.48, 0.5, 0.45],
    },
    particles: {
      // A few sakura petals drifting down from the trees — calm, not a storm
      // (negative rise = fall). The wide radius keeps most near the treeline.
      count: 80,
      color: p.particle,
      radius: 6.5,
      height: 5.5,
      size: 0.13,
      rise: -0.25,
      baseY: -1.3,
      texture: makePetalSpriteTexture(),
    },
    particleOpacity: 0.85,
    heartsColor: p.accent,
    // The slow turn around the blossom — a finger-drag spins it the full 360°.
    orbit: { radius: 4.4, height: 1.7, speed: 0.16 },
    openStagger: 0.28, // five petals, each given its own moment
    openDuration: 2.0,
    headSpin: 0.05,

    dress: (scene) => {
      // --- dark moonlit ground ---------------------------------------------
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(30, 48),
        new THREE.MeshStandardMaterial({ color: 0x2a1d2e, roughness: 1 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1.245; // a hair under the shadow catcher
      ground.receiveShadow = true;
      scene.add(ground);

      // --- a carpet of fallen petals around the branch ----------------------
      // One instanced mesh = one draw call, even for hundreds of petals.
      const carpetGeo = createPetalGeometry({
        length: 0.16,
        width: 0.13,
        cup: 0.07,
        notch: 0.04,
        baseColor: 0xc97e9d,
        midColor: 0xe3a8bf,
        tipColor: 0xf3d3e0,
        edgeDarken: 0.08,
      });
      const carpetCount = scaledCount(260);
      const carpet = new THREE.InstancedMesh(
        carpetGeo,
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
        carpetCount,
      );
      const mat4 = new THREE.Matrix4();
      const quat = new THREE.Quaternion();
      const euler = new THREE.Euler();
      const pos = new THREE.Vector3();
      const scl = new THREE.Vector3();
      for (let i = 0; i < carpetCount; i++) {
        // sqrt-free power keeps more petals near the flower, thinning outward
        const r = 0.4 + Math.pow(Math.random(), 0.65) * 7.5;
        const a = Math.random() * Math.PI * 2;
        pos.set(Math.cos(a) * r, -1.238 + Math.random() * 0.012, Math.sin(a) * r);
        euler.set(
          -Math.PI / 2 + (Math.random() - 0.5) * 0.45,
          Math.random() * Math.PI * 2,
          (Math.random() - 0.5) * 0.35,
        );
        quat.setFromEuler(euler);
        const s = 0.45 + Math.random() * 0.55;
        scl.set(s, s, s);
        mat4.compose(pos, quat, scl);
        carpet.setMatrixAt(i, mat4);
      }
      scene.add(carpet);

      // --- tiny wildflowers peeking out of the snow --------------------------
      const tinyCount = scaledCount(110);
      const tinyFlowers = new THREE.InstancedMesh(
        makeTinyFlowerGeometry(),
        new THREE.MeshStandardMaterial({
          color: 0xfff2f7,
          roughness: 0.8,
          side: THREE.DoubleSide,
          emissive: 0xff9cc0,
          emissiveIntensity: 0.18, // a faint glow so they read at night
        }),
        tinyCount,
      );
      for (let i = 0; i < tinyCount; i++) {
        // Right up to the branch's foot, thinning into the distance.
        const r = 0.5 + Math.pow(Math.random(), 0.8) * 9;
        const a = Math.random() * Math.PI * 2;
        pos.set(Math.cos(a) * r, -1.235, Math.sin(a) * r);
        euler.set(0, Math.random() * Math.PI * 2, 0);
        quat.setFromEuler(euler);
        const s = 0.8 + Math.random() * 0.9;
        scl.set(s, s, s);
        mat4.compose(pos, quat, scl);
        tinyFlowers.setMatrixAt(i, mat4);
      }
      scene.add(tinyFlowers);

      // --- low moonlit mist hugging the ground -------------------------------
      const mistMat = new THREE.SpriteMaterial({
        map: makeSoftCircleTexture(),
        color: 0xcdb9d8,
        transparent: true,
        opacity: 0.07,
        depthWrite: false,
      });
      const mists: THREE.Sprite[] = [];
      for (let i = 0; i < 5; i++) {
        const mist = new THREE.Sprite(mistMat);
        const a = (i / 5) * Math.PI * 2;
        mist.position.set(Math.cos(a) * (2 + i), -0.95, Math.sin(a) * (2 + i));
        mist.scale.set(4.5 + i, 1.6, 1);
        scene.add(mist);
        mists.push(mist);
      }

      // --- the moon, low and soft ------------------------------------------
      const moon = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: makeSoftCircleTexture(),
          color: 0xfff3da,
          transparent: true,
          opacity: 0.8,
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
        // a second, deeper ring so every camera angle finds blossoms
        { x: 8.5, z: -7.0, s: 1.6, r: 2.7 },
        { x: -8.5, z: -8.0, s: 1.7, r: 0.9 },
        { x: 8.0, z: 3.5, s: 1.3, r: 4.6 },
        { x: -3.0, z: 8.5, s: 1.2, r: 1.8 },
        { x: 3.5, z: 9.0, s: 1.4, r: 5.1 },
      ];
      for (const spot of treeSpots) {
        const tree = createSakuraTree();
        tree.position.set(spot.x, -1.3, spot.z);
        tree.scale.setScalar(spot.s);
        tree.rotation.y = spot.r;
        scene.add(tree);
      }

      // --- snow drifting steadily through the night ------------------------
      const snow = createParticles({
        count: 420,
        color: 0xffffff,
        radius: 8,
        height: 6,
        size: 0.06,
        rise: -0.15,
        baseY: -1.3,
        texture: makeSoftCircleTexture(),
      });
      snow.material.opacity = 0.8; // snow falls from the very beginning
      scene.add(snow.points);

      // --- a soft halo of moon-pink light around the blossom ----------------
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: makeSoftCircleTexture(),
          color: 0xffc4da,
          transparent: true,
          opacity: 0.12, // dim — a whisper of glow, not a spotlight
          depthWrite: false,
        }),
      );
      halo.position.set(0, 0.95, 0); // around the flower head
      halo.scale.setScalar(3.2);
      scene.add(halo);

      // (The unopened buds now live on the branch itself — see createBranch.)

      // Per-frame: keep the snow falling, the halo breathing and the mist
      // drifting in a slow circle.
      return (dt, elapsed) => {
        snow.update(dt, elapsed);
        const breath = 1 + Math.sin(elapsed * 0.7) * 0.06;
        halo.scale.setScalar(3.2 * breath);
        mists.forEach((mist, i) => {
          const a = (i / 5) * Math.PI * 2 + elapsed * 0.02;
          mist.position.x = Math.cos(a) * (2 + i);
          mist.position.z = Math.sin(a) * (2 + i);
        });
      };
    },
  });
}
