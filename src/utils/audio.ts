// Lofi music for the music button. Two modes:
//
//  1. If a file exists in public/ as SONG.mp3 or lofi.mp3, it is played on
//     loop.
//  2. Otherwise a small procedural lofi engine takes over: a slow jazzy
//     chord loop, soft kick & snare, ticking hats, a lazy bass and vinyl
//     crackle — all generated live with the Web Audio API, no files needed.
//
// Playback is attempted as soon as the page opens; when the browser blocks
// autoplay (iOS always does), the very first tap anywhere starts it instead.

export interface AmbientMusic {
  /**
   * Try to start playing right now (used for autoplay on load). Resolves
   * false when the browser blocks it — retry from a user gesture then.
   */
  tryStart(): Promise<boolean>;
  /** Toggle play/pause. Returns the new playing state. */
  toggle(): boolean;
  playing(): boolean;
  dispose(): void;
}

const BPM = 72;
const SECONDS_PER_BEAT = 60 / BPM;
const CUSTOM_TRACK_URLS = ["/SONG.mp3", "/lofi.mp3"];

// A classic descending lofi progression: Fmaj7 → Em7 → Dm7 → Cmaj7.
// Notes are MIDI numbers; one chord per bar.
const CHORDS: number[][] = [
  [53, 57, 60, 64],
  [52, 55, 59, 62],
  [50, 53, 57, 60],
  [48, 52, 55, 59],
];
const BASS_ROOTS = [41, 40, 38, 36]; // F2, E2, D2, C2

const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export function createAmbientMusic(): AmbientMusic {
  let playing = false;

  // --- optional custom track -------------------------------------------------
  // Try custom MP3s from public/ first. If none can play, use the engine.
  let customTrack: HTMLAudioElement | null = null;
  let customTrackIndex = 0;
  let startToken = 0;

  const makeCustomTrack = (src: string): HTMLAudioElement => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.loop = true;
    audio.volume = 0.55;
    return audio;
  };

  // --- procedural engine state ----------------------------------------------
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let scheduler = 0;
  let noiseBuffer: AudioBuffer | null = null;
  let crackleSource: AudioBufferSourceNode | null = null;

  /** Reusable white-noise buffer for snare / hats. */
  const getNoise = (c: AudioContext): AudioBuffer => {
    if (noiseBuffer) return noiseBuffer;
    noiseBuffer = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  };

  // --- tiny instruments -------------------------------------------------------

  /** Mellow electric-piano-ish chord note. */
  const playKey = (t: number, freq: number, vel: number) => {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 1600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    osc.connect(tone).connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 1.7);
  };

  /** Soft round bass note. */
  const playBass = (t: number, freq: number, dur: number) => {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.1);
  };

  /** Soft thumpy kick: a sine that drops in pitch. */
  const playKick = (t: number) => {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 0.2);
  };

  /** Brushed snare: a short band-passed noise burst. */
  const playSnare = (t: number) => {
    if (!ctx || !master) return;
    const src = ctx.createBufferSource();
    src.buffer = getNoise(ctx);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(band).connect(g).connect(master);
    src.start(t);
    src.stop(t + 0.15);
  };

  /** Quiet ticking hat. */
  const playHat = (t: number) => {
    if (!ctx || !master) return;
    const src = ctx.createBufferSource();
    src.buffer = getNoise(ctx);
    const high = ctx.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 6500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.045, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(high).connect(g).connect(master);
    src.start(t);
    src.stop(t + 0.07);
  };

  /** Endless vinyl crackle: sparse random pops over a faint noise floor. */
  const startCrackle = (c: AudioContext, out: GainNode) => {
    const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.012;
    for (let p = 0; p < 90; p++) {
      const at = Math.floor(Math.random() * data.length);
      data[at] = (Math.random() * 2 - 1) * 0.35;
    }
    crackleSource = c.createBufferSource();
    crackleSource.buffer = buffer;
    crackleSource.loop = true;
    const g = c.createGain();
    g.gain.value = 0.5;
    crackleSource.connect(g).connect(out);
    crackleSource.start();
  };

  // --- the beat scheduler ------------------------------------------------------

  /** Schedule everything that happens on one beat. */
  const scheduleBeat = (beatIndex: number, t: number) => {
    const beat = beatIndex % 4; // position in the bar
    const bar = Math.floor(beatIndex / 4) % CHORDS.length;
    const chord = CHORDS[bar];
    const root = BASS_ROOTS[bar];

    // Drums: kick on 1 & 3, snare on 2 & 4, swung hat on every off-beat.
    if (beat === 0 || beat === 2) playKick(t);
    if (beat === 1 || beat === 3) playSnare(t);
    playHat(t + SECONDS_PER_BEAT * 0.5 + 0.06); // lazy swing

    // Chord stab on beat 1 (strummed) and a softer echo on beat 3.
    if (beat === 0 || beat === 2) {
      const vel = beat === 0 ? 0.07 : 0.045;
      chord.forEach((note, k) => playKey(t + k * 0.035, midiToFreq(note), vel));
    }

    // Bass: root on 1 (long) and 3 (shorter).
    if (beat === 0) playBass(t, midiToFreq(root), 1.4);
    if (beat === 2) playBass(t, midiToFreq(root), 0.7);

    // A gentle melody note now and then (top of the chord, up an octave).
    if (beat === 3 && Math.floor(beatIndex / 4) % 2 === 1) {
      const note = chord[2 + Math.floor(Math.random() * 2)] + 12;
      playKey(t + 0.1, midiToFreq(note), 0.05);
    }
  };

  const startEngine = () => {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new AudioCtx();

    // master -> warm lowpass -> speakers
    master = ctx.createGain();
    master.gain.value = 0;
    const warmth = ctx.createBiquadFilter();
    warmth.type = "lowpass";
    warmth.frequency.value = 3400;
    master.connect(warmth).connect(ctx.destination);

    startCrackle(ctx, master);

    // Look-ahead scheduling: every 120ms, queue all beats due in the next 0.3s.
    let nextBeatTime = ctx.currentTime + 0.1;
    let beatIndex = 0;
    scheduler = window.setInterval(() => {
      if (!ctx) return;
      while (nextBeatTime < ctx.currentTime + 0.3) {
        scheduleBeat(beatIndex, nextBeatTime);
        beatIndex++;
        nextBeatTime += SECONDS_PER_BEAT;
      }
    }, 120);

    // Fade in.
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 1.5);
  };

  const stopEngine = () => {
    if (!ctx || !master) return;
    window.clearInterval(scheduler);
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 0.7);
    const localCtx = ctx;
    const localCrackle = crackleSource;
    window.setTimeout(() => {
      try {
        localCrackle?.stop();
      } catch {
        /* already stopped */
      }
      void localCtx.close();
    }, 800);
    ctx = null;
    master = null;
    crackleSource = null;
  };

  // --- public API ----------------------------------------------------------------

  const playCustomTrack = async (token: number): Promise<boolean> => {
    if (customTrackIndex >= CUSTOM_TRACK_URLS.length) {
      startEngine();
      return true;
    }

    customTrack ??= makeCustomTrack(CUSTOM_TRACK_URLS[customTrackIndex]);

    try {
      await customTrack.play();
      return true;
    } catch (err) {
      if (token !== startToken) return false;
      // Autoplay blocked: the track itself is fine, the browser just wants a
      // user gesture first — keep it loaded and report failure so the caller
      // can retry from the first tap.
      if ((err as DOMException)?.name === "NotAllowedError") return false;
      // Anything else (404, decode error): fall through to the next source.
      customTrack = null;
      customTrackIndex++;
      return playCustomTrack(token);
    }
  };

  const start = () => {
    const token = ++startToken;
    void playCustomTrack(token);
  };

  const stop = () => {
    startToken++;
    if (customTrack && !customTrack.paused) customTrack.pause();
    else stopEngine();
  };

  return {
    async tryStart() {
      if (playing) return true;
      const token = ++startToken;
      const ok = await playCustomTrack(token);
      if (ok && token === startToken) {
        playing = true;
        return true;
      }
      return false;
    },
    toggle() {
      if (playing) stop();
      else start();
      playing = !playing;
      return playing;
    },
    playing: () => playing,
    dispose: () => {
      if (playing) stop();
    },
  };
}
