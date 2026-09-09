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
  /** Gap left between the bottom of the bag and the floor. */
  floorClearance: 0.35,

  /**
   * The bag body's envelope, in world units.
   *
   * A GLB is scaled automatically to hang between `pivotY` and
   * `floorClearance`, so these describe the bag *that fitting produces* -- they
   * are measured from the shipped model, whose chain and bracket occupy the
   * space above the body. Swap in a bag with different proportions and these
   * three numbers need re-measuring; everything else derives from them.
   */
  radius: 0.2884,
  height: 1.7538,
  /** Pivot down to the top of the bag body: the chain and bracket. */
  suspension: 0.8962,

  /**
   * How far past the bag's surface a fist travels to make contact. Roughly the
   * distance from a glove's centre to its knuckle face.
   */
  contactOffset: 0.14,
} as const;

/** Total bag height. */
export const BAG_HEIGHT = BAG.height;

export const BAG_HALF_HEIGHT = BAG.height / 2;

/** Offset from the pivot down to the bag's centre of mass. */
export const BAG_COM_OFFSET = BAG.suspension + BAG_HALF_HEIGHT;

/** World-space Y of the bag's centre at rest. */
export const BAG_CENTER_Y = BAG.pivotY - BAG_COM_OFFSET;

/** Z of every contact point: just clear of the camera-facing surface. */
export const CONTACT_Z = BAG.radius + BAG.contactOffset;

/** Cylinder length for the procedural fallback bag, excluding its caps. */
export const PROCEDURAL_BODY_LENGTH = BAG.height - BAG.radius * 2;

export const PHYSICS = {
  /** Pendulum arm length, drives the natural swing period. */
  armLength: BAG_COM_OFFSET,
  gravity: 9.81,
  /**
   * Rotational inertia, in the region of m*L^2 for a ~40kg bag. Folds mass and
   * radius of gyration into one knob: higher = heavier, less responsive.
   * Tuned so a clean body shot swings roughly 9 degrees -- a real heavy bag
   * barely moves, and the brief asks for weight rather than arcade flailing.
   * Retuned when the GLB replaced the capsule: the model's body hangs lower
   * and narrower, which changes every lever arm, so the swing had to be
   * measured again rather than carried over.
   */
  inertia: 205,
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
  lookAt: [0, 1.38, 0] as const,
  fov: 45,
  /**
   * Framing budget, in world units, measured from the view centre. The rig
   * dollies back until both are satisfied.
   *
   * The width budget is deliberately slack: gloves are anchored to the
   * viewport, so they cannot fall off the sides, and the only thing it still
   * guards is the bag filling an ultra-narrow screen. Keeping it slack means
   * height decides the distance at every realistic aspect, so the bag is the
   * same size on screen on a phone and on a desktop.
   */
  frameHalfHeight: 1.52,
  frameHalfWidth: 0.55,
  minDistance: 3.6,
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
   *
   * Raised far enough that the whole glove, cuff included, sits inside the
   * frame at rest. The cuff only looked like a stray object when the bottom
   * edge cut through it; shown whole, it reads as the wrist it is.
   *
   * The roll leans each glove inward, toward the bag, the way a guard sits.
   * Rolling the other way splays the knuckles apart and reads as a shrug.
   * Only the resting pose: each zone's wrist rotation still owns the impact.
   */
  idle: {
    left: {
      screen: [-0.84, -0.58] as const,
      depth: 1.75,
      rotation: [-0.33, 0.5, -0.33] as const,
    },
    right: {
      screen: [0.84, -0.64] as const,
      depth: 1.75,
      rotation: [-0.33, -0.5, 0.33] as const,
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
