// Colours of the night sakura garden (yozakura).

export interface Palette {
  /** Sky gradient (top -> bottom). */
  bgTop: number;
  bgBottom: number;
  fog?: { color: number; near: number; far: number };
  stem: number;
  particle: number;
  /** Accent for hearts / glow pulses. */
  accent: number;
}

export const palettes: Record<string, Palette> = {
  sakura: {
    bgTop: 0x0b0c1d, // deep night blue...
    bgBottom: 0x2c1a2c, // ...sinking into dark plum
    fog: { color: 0x1f1524, near: 8, far: 24 },
    stem: 0x715741, // woody branch brown, light enough to read at night
    particle: 0xffb9d2, // falling petals
    accent: 0xff8fb5,
  },
};
