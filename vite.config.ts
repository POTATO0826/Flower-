import { defineConfig } from "vite";

// Minimal Vite config.
// `appType: "spa"` (the default) makes the dev server fall back to index.html
// for unknown paths like /1, /2 ... so our client-side router can take over.
export default defineConfig({
  server: {
    port: 5173,
    open: false,
  },
  build: {
    // Three.js is a large library; the warning is expected and harmless.
    chunkSizeWarningLimit: 700,
  },
});
