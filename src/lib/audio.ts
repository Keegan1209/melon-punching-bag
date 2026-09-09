import { theme } from "@/config/theme";

/**
 * Punch audio.
 *
 * Sampled files from `theme.audio.punch` are preferred. If none decode -- the
 * default for a fresh checkout, which ships no audio assets -- every punch is
 * synthesised instead, so the experience is never silent and the repo stays
 * small. Dropping mp3s into /public/sounds is all it takes to switch over.
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private buffers: AudioBuffer[] = [];
  private master: GainNode | null = null;
  private lastIndex = -1;
  private loading: Promise<void> | null = null;

  /**
   * Must be called from a user gesture. iOS Safari starts every AudioContext
   * suspended and only a gesture may resume it.
   */
  unlock(): void {
    if (!this.context) {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return;

      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = theme.audio.volume;
      this.master.connect(this.context.destination);
      this.loading = this.loadSamples();
    }

    if (this.context.state === "suspended") {
      void this.context.resume();
    }
  }

  private async loadSamples(): Promise<void> {
    const context = this.context;
    if (!context) return;

    const results = await Promise.allSettled(
      theme.audio.punch.map(async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Missing sound: ${url}`);
        return context.decodeAudioData(await response.arrayBuffer());
      })
    );

    this.buffers = results
      .filter((r): r is PromiseFulfilledResult<AudioBuffer> => r.status === "fulfilled")
      .map((r) => r.value);
  }

  /** Play a punch, avoiding an immediate repeat of the previous sample. */
  play(intensity = 1): void {
    this.unlock();
    const context = this.context;
    if (!context) return;

    void this.loading;

    if (this.buffers.length > 0) {
      this.playSample(context, intensity);
    } else {
      this.playSynthesised(context, intensity);
    }
  }

  private pickIndex(): number {
    if (this.buffers.length === 1) return 0;

    let index = Math.floor(Math.random() * this.buffers.length);
    if (index === this.lastIndex) index = (index + 1) % this.buffers.length;
    this.lastIndex = index;
    return index;
  }

  private playSample(context: AudioContext, intensity: number): void {
    const buffer = this.buffers[this.pickIndex()];
    if (!buffer || !this.master) return;

    const source = context.createBufferSource();
    source.buffer = buffer;
    // Slight pitch variation stops repeated hits sounding mechanical.
    source.playbackRate.value = 0.94 + Math.random() * 0.12;

    const gain = context.createGain();
    gain.gain.value = intensity;

    source.connect(gain).connect(this.master);
    source.start();
  }

  /** Noise slap layered over a pitch-dropping sine thud. */
  private playSynthesised(context: AudioContext, intensity: number): void {
    if (!this.master) return;

    const now = context.currentTime;
    const variation = 0.9 + Math.random() * 0.2;

    const noiseLength = Math.floor(context.sampleRate * 0.12);
    const noiseBuffer = context.createBuffer(1, noiseLength, context.sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i++) {
      channel[i] = (Math.random() * 2 - 1) * (1 - i / noiseLength);
    }

    const noise = context.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 1400 * variation;

    const noiseGain = context.createGain();
    noiseGain.gain.setValueAtTime(0.5 * intensity, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

    noise.connect(noiseFilter).connect(noiseGain).connect(this.master);
    noise.start(now);
    noise.stop(now + 0.12);

    const thump = context.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(150 * variation, now);
    thump.frequency.exponentialRampToValueAtTime(46 * variation, now + 0.16);

    const thumpGain = context.createGain();
    thumpGain.gain.setValueAtTime(0.9 * intensity, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    thump.connect(thumpGain).connect(this.master);
    thump.start(now);
    thump.stop(now + 0.24);
  }

  dispose(): void {
    void this.context?.close();
    this.context = null;
    this.master = null;
    this.buffers = [];
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
