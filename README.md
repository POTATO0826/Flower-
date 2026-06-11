# 🌸 Sakura

A romantic 3D cherry-blossom gift that feels like a phone app. One single,
quiet experience — *yozakura*, cherry blossoms by night: a sakura blossom
blooms on a woody branch in a dark moonlit garden, softly glowing blossom
trees all around, petals drifting down, a little snow in the air, and a slow
camera orbit that carries you around the flower in 3D. No words on screen —
the scene speaks for itself.

Built with **Bun + Vite + TypeScript + Three.js + GSAP**. Everything is
procedural — no 3D models, no image files.

## Run it

```bash
bun install
bun dev
```

Open the URL Vite prints. Every path shows the experience (old links like
`/5` still work). On a phone, "Add to Home Screen" installs it as a
full-screen app with its own sakura icon.

## The experience

1. Snow and sakura petals drift through the moonlit garden, stars above
2. A glowing seed floats down and lands
3. A woody branch grows, a leaf unfolds
4. A bud forms, then five petals open one by one into a softly glowing blossom
5. The camera slowly turns around the flower (drag / move to steer it)
6. **Tap the blossom** → it glows brighter and hearts burst around it

♪ The small round button plays **lofi** — never autoplays. By default it's a
tiny generated lofi engine (jazzy chord loop, soft drums, lazy bass, vinyl
crackle). Want a real track instead? Drop any `lofi.mp3` into `public/` and
the button plays that on loop automatically.

## Project structure

```
public/
  manifest.webmanifest   # installable PWA (standalone, portrait)
  icon.svg               # sakura app icon

src/
  main.ts                # tiny bootstrap: every path loads the sakura
  style.css              # mobile-first overlay styling

  routes/
    sakura.ts            # THE experience: night garden, trees, moon, stars,
                         # snow, halo, buds
    flowerScene.ts       # the shared seed→bloom→tap journey

  objects/
    flowers/
      petalGeometry.ts   # parametric petal sculpting + ring assembly
      blossom.ts         # the cherry blossom (5 notched petals, stamens)
      types.ts
    createSakuraTree.ts  # background blossom trees (instanced, phone-cheap)
    createSeed.ts createStem.ts createLeaves.ts
    createParticles.ts   # falling petals / snow / dust
    createHearts.ts      # tap heart-burst

  core/                  # renderer, camera, scene, spring lighting,
                         # EffectComposer + UnrealBloomPass, experience loop
  animations/            # bloom timeline, orbit camera, tap raycasting
  utils/                 # palette, device scaling, audio, textures, overlay
```

## Build

```bash
bun run build      # type-checks then bundles to dist/
bun run preview    # preview the production build
```
