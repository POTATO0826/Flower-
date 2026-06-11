import "./style.css";

// The whole app is one experience now: the sakura garden.
// Whatever path is opened (/, /5, an old link...), the blossom blooms.
// The heavy Three.js code is still lazy-loaded so the first paint is instant.

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
