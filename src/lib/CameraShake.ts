import { Vector3 } from "three";
import { IMPACT } from "@/config/scene";

/**
 * A short camera kick on impact.
 *
 * Positional rather than rotational: at this field of view a rotational shake
 * swings the whole room and reads as a glitch, while a small translation reads
 * as the hit landing.
 *
 * The three axes run at deliberately unrelated frequencies. Shaking them in
 * step produces a clean diagonal slide, which looks like a camera error; out of
 * step it looks like a jolt.
 */
export class CameraShake {
  private readonly offset = new Vector3();
  private energy = 0;
  private time = 0;

  /** `strength` is roughly 1 for a clean hit. */
  impulse(strength: number): void {
    this.energy = Math.min(1.5, this.energy + strength);
    this.time = 0;
  }

  update(delta: number): void {
    if (this.energy <= 0.0005) {
      this.energy = 0;
      this.offset.set(0, 0, 0);
      return;
    }

    this.time += delta;
    this.energy *= Math.exp(-IMPACT.shake.damping * delta);

    const amplitude = this.energy * IMPACT.shake.amplitude;
    const f = IMPACT.shake.frequency;

    this.offset.set(
      Math.sin(this.time * f) * amplitude,
      Math.sin(this.time * f * 1.7 + 1.3) * amplitude * 0.75,
      Math.sin(this.time * f * 0.6 + 2.1) * amplitude * 0.35
    );
  }

  get value(): Vector3 {
    return this.offset;
  }

  reset(): void {
    this.energy = 0;
    this.time = 0;
    this.offset.set(0, 0, 0);
  }
}
