import * as THREE from "three";

// The hero plant: a graceful flowering sakura branch.
// Not a straight "joystick" stick — it leans and curves like a real branch,
// with two side twigs that end in unopened buds.
//
// Growth is animated with draw-ranges: the tube is revealed triangle by
// triangle along its own curve, so the branch visibly *extends* from the
// ground to the tip (instead of stretching like rubber). Twigs sprout only
// after the main branch has grown past their joint, and the buds pop in
// at the twig tips.

export interface BranchOptions {
  height?: number;
  /** Radius at the base — tapers strongly toward the tip. */
  radius?: number;
  color?: number;
}

export interface BranchAttachPoint {
  position: THREE.Vector3;
  /** Outward direction the spot faces — extra blossoms lean this way. */
  direction: THREE.Vector3;
  /** Timeline seconds-offset hint: 0 = available as soon as the wood there
   *  has grown, larger = later spots (twig tips finish growing last). */
  order: number;
}

export interface BranchResult {
  group: THREE.Group;
  /** Where the main blossom sits (the branch tip). */
  top: THREE.Vector3;
  /** Spots along the wood where extra blossoms can sprout (cluster look). */
  attachPoints: BranchAttachPoint[];
  /** Drive this from 0 -> 1 to grow the whole branch. */
  setGrowth(t: number): void;
  /** Continuous idle motion (buds bobbing in the breeze). */
  update(dt: number, elapsed: number): void;
}

/** A tube along a curve, tapered from baseRadius down to tipRadius. */
function makeTaperedTube(
  curve: THREE.CatmullRomCurve3,
  baseRadius: number,
  tipRadius: number,
  material: THREE.Material,
  tubularSegments = 40,
): THREE.Mesh {
  const radialSegments = 8;
  const geo = new THREE.TubeGeometry(
    curve,
    tubularSegments,
    baseRadius,
    radialSegments,
    false,
  );

  // Pull each ring of vertices toward the centre line to taper the tube.
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const ringSize = radialSegments + 1;
  const centre = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.floor(i / ringSize) / tubularSegments;
    curve.getPoint(t, centre);
    const factor = 1 - (1 - tipRadius / baseRadius) * t;
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(centre);
    v.multiplyScalar(factor).add(centre);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  return mesh;
}

/** Reveal an indexed tube from its base up to `t` (0..1). */
function setTubeGrowth(mesh: THREE.Mesh, t: number): void {
  const index = mesh.geometry.index!;
  mesh.geometry.setDrawRange(0, Math.floor(THREE.MathUtils.clamp(t, 0, 1) * index.count));
}

export function createBranch(options: BranchOptions = {}): BranchResult {
  const height = options.height ?? 2.1;
  const radius = options.radius ?? 0.07;
  const s = height / 2.1; // scale factor for all the hand-tuned coordinates

  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({
    color: options.color ?? 0x4a3a2c,
    roughness: 0.9,
    metalness: 0,
  });

  // --- main branch: a gentle balanced S — it curves, but the tip comes back
  // almost directly above the base so the plant never looks like it's
  // tipping over.
  const mainCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.14 * s, 0.5 * s, 0.04 * s),
    new THREE.Vector3(0.28 * s, 1.1 * s, -0.06 * s),
    new THREE.Vector3(0.16 * s, 1.65 * s, 0.05 * s),
    new THREE.Vector3(0.04 * s, 2.1 * s, 0),
  ]);
  const main = makeTaperedTube(mainCurve, radius, radius * 0.3, woodMat, 48);
  group.add(main);

  // --- two side twigs, sprouting from joints along the branch --------------
  const makeTwig = (
    attachT: number,
    dir: THREE.Vector3,
  ): { mesh: THREE.Mesh; tip: THREE.Vector3 } => {
    const p0 = mainCurve.getPoint(attachT);
    // Long reach: the twigs carry their blossoms well clear of the trunk so
    // open petals never sink into the wood.
    const p1 = p0.clone().addScaledVector(dir, 0.7);
    const p2 = p0.clone().addScaledVector(dir, 1.4).add(new THREE.Vector3(0, 0.14 * s, 0));
    const curve = new THREE.CatmullRomCurve3([p0, p1, p2]);
    // Chunky enough to read as wood at night — hairline twigs disappear
    // against the dark sky and leave their flowers looking parentless.
    const mesh = makeTaperedTube(curve, radius * 0.55, radius * 0.22, woodMat, 20);
    return { mesh, tip: p2 };
  };

  // Twigs stay well below the tip and reach sideways, never up — nothing is
  // allowed to stand in front of the hero blossom.
  const twig1 = makeTwig(0.55, new THREE.Vector3(0.32 * s, 0.12 * s, 0.2 * s));
  const twig2 = makeTwig(0.66, new THREE.Vector3(-0.3 * s, 0.1 * s, -0.16 * s));
  // A third twig low down fills the bottom half and widens the silhouette.
  const twig3 = makeTwig(0.3, new THREE.Vector3(-0.3 * s, 0.14 * s, 0.26 * s));
  group.add(twig1.mesh, twig2.mesh, twig3.mesh);

  // --- growth choreography ---------------------------------------------------
  // main branch: 0 -> 0.7 of the growth parameter
  // twigs sprout once the branch has grown past their joints.
  const phase = (t: number, from: number, to: number) =>
    THREE.MathUtils.clamp((t - from) / (to - from), 0, 1);

  const setGrowth = (t: number) => {
    setTubeGrowth(main, phase(t, 0, 0.7));
    setTubeGrowth(twig1.mesh, phase(t, 0.5, 0.8));
    setTubeGrowth(twig2.mesh, phase(t, 0.62, 0.92));
    setTubeGrowth(twig3.mesh, phase(t, 0.34, 0.62)); // low joint: sprouts early
  };
  setGrowth(0); // start invisible

  // The wood itself sits still; the blossoms carry all the idle motion.
  const update = () => {};

  // Spots for extra blossoms: two right on the bough (sakura flowers sprout
  // straight from the bark) and one beside each twig-tip bud, so every twig
  // ends in a bud-plus-flower cluster like a real branch.
  // Kept low on the bough so the hero blossom at the tip stands alone, and
  // pointed to four different sides so the cluster never bunches up.
  const attachPoints: BranchAttachPoint[] = [
    {
      position: mainCurve.getPoint(0.45).add(new THREE.Vector3(0.02 * s, 0.02, 0.06 * s)),
      direction: new THREE.Vector3(0.15, 0.2, 0.95).normalize(), // front
      order: 0,
    },
    {
      position: mainCurve.getPoint(0.58).add(new THREE.Vector3(-0.05 * s, 0, 0.04 * s)),
      direction: new THREE.Vector3(-0.85, 0.2, 0.45).normalize(), // left
      order: 1,
    },
    {
      position: twig1.tip.clone(),
      direction: new THREE.Vector3(0.6, 0.3, 0.35).normalize(), // right
      order: 2,
    },
    {
      position: twig2.tip.clone(),
      direction: new THREE.Vector3(-0.45, 0.3, -0.6).normalize(), // back-left
      order: 3,
    },
    {
      position: twig3.tip.clone(),
      direction: new THREE.Vector3(-0.5, 0.25, 0.65).normalize(), // front-left, low
      order: 4,
    },
    {
      position: mainCurve.getPoint(0.24).add(new THREE.Vector3(0.04 * s, 0.02, -0.04 * s)),
      direction: new THREE.Vector3(0.7, 0.3, -0.6).normalize(), // back-right, low
      order: 5,
    },
  ];

  return { group, top: mainCurve.getPoint(1), attachPoints, setGrowth, update };
}
