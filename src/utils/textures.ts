import * as THREE from "three";

// Procedural textures so we never need to ship image files.

let softCircle: THREE.Texture | null = null;

/**
 * A soft round glow used for particles and sparkles.
 * Cached so all particle systems share one texture.
 */
export function makeSoftCircleTexture(): THREE.Texture {
  if (softCircle) return softCircle;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.85)");
  gradient.addColorStop(0.6, "rgba(255,255,255,0.25)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  softCircle = new THREE.CanvasTexture(canvas);
  softCircle.colorSpace = THREE.SRGBColorSpace;
  return softCircle;
}

/**
 * A vertical gradient used as a realistic sky / backdrop
 * (top colour fading to bottom colour).
 */
export function makeGradientTexture(top: number, bottom: number): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#" + top.toString(16).padStart(6, "0"));
  gradient.addColorStop(1, "#" + bottom.toString(16).padStart(6, "0"));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A small petal-shaped sprite (for falling sakura petals). */
export function makePetalSpriteTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.translate(size / 2, size / 2);
  ctx.rotate(0.6);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.32, size * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
