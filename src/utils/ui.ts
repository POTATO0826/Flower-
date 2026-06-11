import { createAmbientMusic } from "./audio";

// A minimal overlay: just a small round music button in the corner.
// No text anywhere — the scene speaks for itself.

export interface OverlayOptions {
  /** Theme class for styling (e.g. "theme-sakura"). */
  themeClass?: string;
}

export interface Overlay {
  root: HTMLDivElement;
  dispose(): void;
}

export function createOverlay(
  container: HTMLElement,
  options: OverlayOptions = {},
): Overlay {
  const root = document.createElement("div");
  root.className = "overlay";
  if (options.themeClass) root.classList.add(options.themeClass);

  // Music button (icon only — never autoplays).
  const music = createAmbientMusic();
  const musicBtn = document.createElement("button");
  musicBtn.className = "ui-button music";
  musicBtn.type = "button";
  musicBtn.setAttribute("aria-label", "Toggle music");
  musicBtn.textContent = "♪";
  musicBtn.addEventListener("click", () => {
    const on = music.toggle();
    musicBtn.textContent = on ? "♫" : "♪";
    musicBtn.classList.toggle("active", on);
  });

  root.append(musicBtn);
  container.appendChild(root);

  return {
    root,
    dispose() {
      music.dispose();
      root.remove();
    },
  };
}
