import "./style.css";

// The whole app is one experience now: the sakura garden.
// Whatever path is opened (/, /5, an old link...), the blossom blooms.
// The heavy Three.js code is still lazy-loaded so the first paint is instant.

// iOS Safari fires its own non-standard gesture events for pinch-zoom that
// ignore touch-action; blocking them keeps two-finger touches from zooming
// the page mid-scene.
document.addEventListener("gesturestart", (e) => e.preventDefault());

const app = document.getElementById("app") as HTMLDivElement;
let cleanup: (() => void) | null = null;

function showLoading(): void {
  app.innerHTML = `<div class="loading"><span class="loading-flower">🌸</span></div>`;
}

async function render(): Promise<void> {
  cleanup?.();
  cleanup = null;
  showLoading();

  const { initSakura } = await import("./routes/sakura");

  app.innerHTML = "";
  cleanup = initSakura(app);
}

void render();
