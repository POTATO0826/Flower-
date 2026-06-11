import * as THREE from "three";
import { scaledCount } from "../utils/device";

// A background sakura tree: a dark woody trunk with a few branches, crowned
// by clusters of tiny five-petal blossoms (one InstancedMesh, so hundreds of
// flowers stay cheap on phones). Several of these around the scene turn the
// orbiting camera into a walk through a night blossom garden.

/** A small flat five-petal blossom silhouette (a classic "rose curve"). */
function makeMiniBlossomGeometry(): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];
  const STEPS = 60;
  for (let i = 0; i <= STEPS; i++) {
    const a = (i / STEPS) * Math.PI * 2;
    // r(θ) with five lobes -> five petals.
    const r = 0.17 * (0.55 + 0.45 * Math.cos(5 * a));
    points.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  const geo = new THREE.ShapeGeometry(new THREE.Shape(points));

  // Cup the flower slightly so it catches light from different angles.
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, (x * x + y * y) * 1.4);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createSakuraTree(): THREE.Group {
  const tree = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x4a3526,
    roughness: 1,
  });

  // Trunk, leaning just a little — sakura trunks are rarely straight.
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.22, 2.4, 8),
    woodMat,
  );
  trunk.position.y = 1.2;
  trunk.rotation.z = 0.06;
  tree.add(trunk);

  // A few branches reaching up and out.
  const branchGeo = new THREE.CylinderGeometry(0.05, 0.09, 1.5, 6);
  const branchSpecs = [
    { y: 2.1, rz: 0.85, ry: 0.3 },
    { y: 2.3, rz: -0.75, ry: 2.4 },
    { y: 2.0, rz: 0.55, ry: 4.2 },
  ];
  for (const s of branchSpecs) {
    const branch = new THREE.Mesh(branchGeo, woodMat);
    const holder = new THREE.Group();
    holder.position.y = s.y;
    holder.rotation.set(0, s.ry, s.rz);
    branch.position.y = 0.7; // grow from the joint
    holder.add(branch);
    tree.add(holder);
  }

  // --- the canopy: clusters of tiny five-petal blossoms ---------------------
  const clusterCenters = [
    new THREE.Vector3(0, 3.2, 0),
    new THREE.Vector3(1.1, 2.7, 0.4),
    new THREE.Vector3(-1.0, 2.8, -0.3),
    new THREE.Vector3(0.4, 2.9, -1.0),
    new THREE.Vector3(-0.4, 2.6, 0.9),
  ];

  const count = scaledCount(210);
  const blossoms = new THREE.InstancedMesh(
    makeMiniBlossomGeometry(),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      side: THREE.DoubleSide,
      // A whisper of self-glow so the canopies read softly in the night.
      emissive: 0x4a2034,
      emissiveIntensity: 0.5,
    }),
    count,
  );

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const deepPink = new THREE.Color(0xf6a3c4);
  const palePink = new THREE.Color(0xfff0f5);

  for (let i = 0; i < count; i++) {
    const c = clusterCenters[i % clusterCenters.length];
    // Random point inside a squashed sphere around the cluster centre.
    const r = 0.85 * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    dummy.position.set(
      c.x + r * Math.sin(phi) * Math.cos(theta),
      c.y + r * Math.cos(phi) * 0.7,
      c.z + r * Math.sin(phi) * Math.sin(theta),
    );
    // Each little flower faces its own random direction.
    dummy.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    );
    dummy.scale.setScalar(0.8 + Math.random() * 0.7);
    dummy.updateMatrix();
    blossoms.setMatrixAt(i, dummy.matrix);

    color.lerpColors(deepPink, palePink, Math.random());
    blossoms.setColorAt(i, color);
  }
  tree.add(blossoms);

  return tree;
}
