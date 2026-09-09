/** Easing curves and interpolation helpers. All operate on normalised t. */

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Maps t from [start, end] onto [0, 1], clamped at both ends. */
export const remap = (t: number, start: number, end: number): number =>
  clamp01((t - start) / (end - start));

export const easeOutQuad = (t: number): number => t * (2 - t);

/** Accelerating -- the right shape for a fist travelling into contact. */
export const easeInCubic = (t: number): number => t * t * t;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Quadratic bezier on one axis, used to bow the strike into an arc. */
export const bezier2 = (a: number, control: number, b: number, t: number): number => {
  const inv = 1 - t;
  return inv * inv * a + 2 * inv * t * control + t * t * b;
};
