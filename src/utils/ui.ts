import { createAmbientMusic } from "./audio";

// A minimal overlay: just a small round music button in the corner.
// No text anywhere; the scene speaks for itself.

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

  // Music starts by itself where the browser allows it; everywhere else
  // (iOS especially) the first tap anywhere starts it. The button still
  // toggles it manually.
  const music = createAmbientMusic();
  const musicBtn = document.createElement("button");
  musicBtn.className = "ui-button music";
  musicBtn.type = "button";
  musicBtn.setAttribute("aria-label", "Toggle music");

  const syncMusicButton = (on: boolean) => {
    musicBtn.textContent = on ? "\u266b" : "\u266a";
    musicBtn.classList.toggle("active", on);
  };

  const toggleMusic = () => {
    syncMusicButton(music.toggle());
  };

  const autoStartMusic = (e: Event) => {
    if (musicBtn.contains(e.target as Node)) return;
    if (!music.playing()) syncMusicButton(music.toggle());
    window.removeEventListener("pointerdown", autoStartMusic);
    window.removeEventListener("keydown", autoStartMusic);
  };

  syncMusicButton(false);
  musicBtn.addEventListener("click", toggleMusic);

  // First choice: just start. If the browser refuses (no gesture yet), the
  // very first tap or keypress anywhere becomes the play button.
  void music.tryStart().then((ok) => {
    if (ok) syncMusicButton(true);
  });
  window.addEventListener("pointerdown", autoStartMusic, { passive: true });
  window.addEventListener("keydown", autoStartMusic);

  root.append(musicBtn);
  container.appendChild(root);

  return {
    root,
    dispose() {
      window.removeEventListener("pointerdown", autoStartMusic);
      window.removeEventListener("keydown", autoStartMusic);
      musicBtn.removeEventListener("click", toggleMusic);
      music.dispose();
      root.remove();
    },
  };
}
