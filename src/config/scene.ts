/**
 * Scene geometry and physics tuning.
 *
 * These describe *where things are* and *how the bag behaves*. They are
 * separate from `theme.ts`, which describes *how things look*. Rebranding
 * touches the theme; changing the feel touches this file.
 */

export const BAG = {
  /** World-space point the bag swings around (top of the chain). */
  pivotY: 3.0,
  /** Distance from pivot down to the top cap of the bag. */
  chainLength: 0.5,
  radius: 0.32,
  /** Length of the cylindrical section, excluding the two rounded caps. */
  bodyLength: 1.5,
} as const;

/** Total bag height including both rounded caps. */
export const BAG_HEIGHT = BAG.bodyLength + BAG.radius * 2;

/** Offset from the pivot down to the bag's centre of mass. */
export const BAG_COM_OFFSET = BAG.chainLength + BAG_HEIGHT / 2;

/** World-space Y of the bag's centre at rest. */
export const BAG_CENTER_Y = BAG.pivotY - BAG_COM_OFFSET;

export const PHYSICS = {
  /** Pendulum arm length, drives the natural swing period. */
  armLength: BAG_COM_OFFSET,
  gravity: 9.81,
  /**
   * Rotational inertia, in the region of m*L^2 for a ~40kg bag. Folds mass and
   * radius of gyration into one knob: higher = heavier, less responsive.
   * Tuned so a clean body shot swings roughly 12 degrees -- a real heavy bag
   * barely moves, and the brief asks for weight rather than arcade flailing.
   */
  inertia: 180,
  /** Viscous damping on the swing. Higher = settles sooner. */
  damping: 1.15,
  /**
   * Hard ceiling on swing angle. Leverage means a low punch swings the bag far
   * more than a high one, and rapid repeat hits accumulate velocity; without a
   * clamp a flurry can put the bag over its own pivot.
   */
  maxAngle: 0.55,
  /**
   * Angle and rate below which the bag counts as stopped. Set at the threshold
   * of visibility rather than at true zero: an exponential decay never quite
   * reaches zero, and chasing it just burns frames on invisible motion.
   */
  restAngle: 0.004,
  /** Fast, low-amplitude shudder layered on top of the swing. */
  wobble: {
    frequency: 21,
    damping: 7.5,
    amplitude: 0.02,
  },
} as const;

export const CAMERA = {
  height: 1.55,
  lookAt: [0, 1.35, 0] as const,
  fov: 45,
  /**
   * Framing budget, in world units, measured from the view centre. The rig
   * dollies back until both are satisfied, so a tall phone and a wide desktop
   * both keep the bag and the gloves on screen without per-device tweaking.
   */
  frameHalfHeight: 1.5,
  frameHalfWidth: 0.8,
  minDistance: 3.2,
  maxDistance: 6.0,
} as const;

export const GLOVE = {
  scale: 0.26,
  /**
   * Resting pose, anchored to the viewport rather than to world coordinates.
   *
   * `screen` is -1..1 from the left/bottom edge of the frame and `depth` is
   * metres in front of the camera. Expressing it this way keeps both gloves in
   * the same on-screen position whether the frame is a tall phone or a wide
   * desktop -- fixed world positions fall outside a portrait frustum.
   */
  idle: {
    left: {
      screen: [-0.8, -0.78] as const,
      depth: 1.75,
      rotation: [-0.35, 0.45, 0.25] as const,
    },
    right: {
      screen: [0.8, -0.92] as const,
      depth: 1.75,
      rotation: [-0.35, -0.45, -0.25] as const,
    },
  },
} as const;

/**
 * Generously oversized on purpose: the camera must never see past the room's
 * edges into empty space, at any viewport aspect. It is a single box, so the
 * extra size costs nothing.
 */
export const ROOM = {
  width: 16,
  depth: 16,
  height: 8,
  /** Floor plane height. The room box extends below it to avoid seams. */
  floorY: -0.5,
  /**
   * Visible ceiling, set just above the bag's pivot so the chain reads as
   * bolted into it. Independent of `height`, which only sizes the shell.
   */
  ceilingY: 3.06,
} as const;
