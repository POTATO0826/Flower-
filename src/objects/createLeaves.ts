import * as THREE from "three";

export interface LeavesOptions {
  color?: number;
  stemHeight?: number;
  count?: number;
}

export interface LeavesResult {
  group: THREE.Group;
  /** Each leaf's pivot — scale from ~0 to 1 to "grow" it. */
  leaves: THREE.Group[];
}

// Builds a curved leaf shape and attaches a few along the stem.
export function createLeaves(options: LeavesOptions = {}): LeavesResult {
  const color = options.color ?? 0x4e9a5e;
  const stemHeight = options.stemHeight ?? 2.2;
  const count = options.count ?? 2;

  // Leaf outline (a soft pointed oval).
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.32, 0.18, 0.34, 0.62, 0, 0.95);
  shape.bezierCurveTo(-0.34, 0.62, -0.32, 0.18, 0, 0);

  const geo = new THREE.ShapeGeometry(shape, 18);

  // Cup the leaf slightly and fold it along the midrib so it reads as a real
  // 3D leaf, not a flat card.
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    let z = -Math.cos(x * Math.PI) * 0.06 + Math.sin(y * Math.PI) * 0.03;
    z += Math.abs(x) * 0.12; // midrib fold
    pos.setZ(i, z);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color,
    side: THREE.DoubleSide,
    roughness: 0.75,
    metalness: 0,
  });

  const group = new THREE.Group();
  const leaves: THREE.Group[] = [];

  for (let i = 0; i < count; i++) {
    const h = stemHeight * (0.28 + 0.32 * i);
    const pivot = new THREE.Group();
    pivot.position.y = h;
    pivot.rotation.y = i * Math.PI + 0.4;
    pivot.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.7; // angle out from stem

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.scale.setScalar(0.8 + i * 0.1);
    pivot.add(mesh);

    pivot.scale.setScalar(0.0001); // start ungrown
    group.add(pivot);
    leaves.push(pivot);
  }

  return { group, leaves };
}
