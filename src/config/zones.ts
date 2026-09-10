import { BAG, BAG_CENTER_Y, BAG_HALF_HEIGHT, CONTACT_Z } from "./scene";

/**
 * Impact zones.
 *
 * The raycast against the bag is only ever used to pick the nearest zone --
 * never to drive the glove directly. Each zone owns a handcrafted punch, so
 * every hit lands on a trajectory an animator chose rather than one the
 * player's thumb happened to describe.
 *
 * Adding a zone is pure data: append an entry and it is immediately hittable.
 */

export type GloveSide = "left" | "right";
export type Vec3 = readonly [number, number, number];

/**
 * The shape of a punch, decided by which tier of the bag was hit.
 *
 * Low on the bag is where a fighter throws an uppercut, the middle is where a
 * straight lands, and high is hook range. Mapping the tiers this way means the
 * punch you get is the one the tap implies, without the player choosing.
 */
export type PunchArchetype = "cross" | "hook" | "uppercut";

export interface PunchZone {
  id: string;
  archetype: PunchArchetype;
  /** Which hand throws this punch. */
  glove: GloveSide;
  /** Zone centre in bag-local space, used for nearest-zone classification. */
  localAnchor: Vec3;
  /** World-space point the fist arrives at, on the camera-facing bag surface. */
  contactPoint: Vec3;
  /** Where the glove pulls back to before firing, relative to its idle pose. */
  windupOffset: Vec3;
  /**
   * Fist orientation at contact.
   *
   * A glove's knuckles point along its local +Y, so this is mostly a pitch of
   * about -90 degrees, bringing the fist down and forward out of its guard.
   * The per-zone variation is the angle of attack: hooks carry more roll,
   * uppercuts to the base of the bag more pitch.
   */
  wristRotation: Vec3;
  /** Lateral bow of the strike arc. Signed, in world units. */
  arc: Vec3;
  /** Unit-ish direction the force is delivered in. -Z pushes the bag away. */
  impulseDirection: Vec3;
  /** Per-zone force multiplier, on top of theme.bag.swingStrength. */
  impulseStrength: number;
  /** Total animation length in seconds. */
  duration: number;
  /** Normalised time within `duration` at which the fist meets the bag. */
  contactAt: number;
}

/**
 * Tier heights as a fraction of the bag's half-height, and contact offsets as
 * a fraction of its radius.
 *
 * Expressed proportionally so the zones follow the bag's envelope rather than
 * a set of magic world coordinates. Swapping in a taller or thinner bag moves
 * every zone with it, instead of leaving punches landing in mid-air.
 */
const TIER_FRACTION = { top: 0.58, middle: 0, bottom: -0.51 } as const;
const SPREAD_FRACTION = { top: 0.75, middle: 0.81, bottom: 0.69 } as const;

/** Bag-local Y for each tier. Local space is centred on the bag's midpoint. */
const LOCAL_TIER_Y = {
  top: TIER_FRACTION.top * BAG_HALF_HEIGHT,
  middle: TIER_FRACTION.middle * BAG_HALF_HEIGHT,
  bottom: TIER_FRACTION.bottom * BAG_HALF_HEIGHT,
} as const;

/** The same tiers in world space, where the gloves have to reach them. */
const TIER_Y = {
  top: BAG_CENTER_Y + LOCAL_TIER_Y.top,
  middle: BAG_CENTER_Y + LOCAL_TIER_Y.middle,
  bottom: BAG_CENTER_Y + LOCAL_TIER_Y.bottom,
} as const;

/** Horizontal offset of a contact point, per tier. */
const SPREAD = {
  top: SPREAD_FRACTION.top * BAG.radius,
  middle: SPREAD_FRACTION.middle * BAG.radius,
  bottom: SPREAD_FRACTION.bottom * BAG.radius,
} as const;

export const PUNCH_ZONES: readonly PunchZone[] = [
  /*
   * HOOKS -- high on the bag.
   *
   * Swing wide outside, arc back in across the body, wrist rolling over so the
   * palm finishes downward. The contact sits round the shoulder of the bag
   * rather than square on its face, and the impulse is mostly lateral, which
   * is what sets the bag turning as well as swinging.
   */
  {
    id: "top-left",
    archetype: "hook",
    glove: "left",
    localAnchor: [-SPREAD.top, LOCAL_TIER_Y.top, BAG.radius],
    contactPoint: [-SPREAD.top * 1.25, TIER_Y.top, CONTACT_Z * 0.82],
    windupOffset: [-0.34, 0.02, 0.26],
    wristRotation: [-1.35, 0.62, -0.3],
    arc: [-0.38, 0.16, 0.06],
    impulseDirection: [0.8, -0.05, -0.62],
    impulseStrength: 1.18,
    duration: 0.46,
    contactAt: 0.5,
  },
  {
    id: "top-right",
    archetype: "hook",
    glove: "right",
    localAnchor: [SPREAD.top, LOCAL_TIER_Y.top, BAG.radius],
    contactPoint: [SPREAD.top * 1.25, TIER_Y.top, CONTACT_Z * 0.82],
    windupOffset: [0.34, 0.02, 0.26],
    wristRotation: [-1.35, -0.62, 0.3],
    arc: [0.38, 0.16, 0.06],
    impulseDirection: [-0.8, -0.05, -0.62],
    impulseStrength: 1.18,
    duration: 0.46,
    contactAt: 0.5,
  },

  /*
   * CROSSES -- the middle of the bag. Left untouched: this is the straight
   * punch the movement was tuned around, and the other two are built to differ
   * from it rather than to replace it.
   */
  {
    id: "middle-left",
    archetype: "cross",
    glove: "left",
    localAnchor: [-SPREAD.middle, LOCAL_TIER_Y.middle, BAG.radius],
    contactPoint: [-SPREAD.middle, TIER_Y.middle, CONTACT_Z],
    windupOffset: [-0.2, -0.04, 0.38],
    wristRotation: [-1.46, 0.2, 0.1],
    arc: [-0.22, 0.16, 0],
    impulseDirection: [0.36, 0, -1],
    impulseStrength: 1.0,
    duration: 0.4,
    contactAt: 0.48,
  },
  {
    id: "middle-right",
    archetype: "cross",
    glove: "right",
    localAnchor: [SPREAD.middle, LOCAL_TIER_Y.middle, BAG.radius],
    contactPoint: [SPREAD.middle, TIER_Y.middle, CONTACT_Z],
    windupOffset: [0.2, -0.04, 0.38],
    wristRotation: [-1.46, -0.2, -0.1],
    arc: [0.22, 0.16, 0],
    impulseDirection: [-0.36, 0, -1],
    impulseStrength: 1.0,
    duration: 0.4,
    contactAt: 0.48,
  },

  /*
   * UPPERCUTS -- low on the bag.
   *
   * Drop the hand, then drive up under the bag with the knuckles still facing
   * skyward, so the wrist barely pitches over. Most of the force goes upward,
   * which swings the bag less than a straight does but kicks it up the chain --
   * without that vertical give an uppercut would land softer than a jab.
   */
  {
    id: "bottom-left",
    archetype: "uppercut",
    glove: "left",
    localAnchor: [-SPREAD.bottom, LOCAL_TIER_Y.bottom, BAG.radius],
    contactPoint: [-SPREAD.bottom * 0.55, TIER_Y.bottom - 0.06, CONTACT_Z * 0.9],
    windupOffset: [-0.1, -0.34, 0.26],
    wristRotation: [-0.55, 0.16, 0.1],
    arc: [-0.04, 0.5, 0.12],
    impulseDirection: [0.16, 0.62, -0.82],
    impulseStrength: 1.08,
    duration: 0.48,
    contactAt: 0.54,
  },
  {
    id: "bottom-right",
    archetype: "uppercut",
    glove: "right",
    localAnchor: [SPREAD.bottom, LOCAL_TIER_Y.bottom, BAG.radius],
    contactPoint: [SPREAD.bottom * 0.55, TIER_Y.bottom - 0.06, CONTACT_Z * 0.9],
    windupOffset: [0.1, -0.34, 0.26],
    wristRotation: [-0.55, -0.16, -0.1],
    arc: [0.04, 0.5, 0.12],
    impulseDirection: [-0.16, 0.62, -0.82],
    impulseStrength: 1.08,
    duration: 0.48,
    contactAt: 0.54,
  },
];

/**
 * Classify a bag-local hit into the nearest zone.
 *
 * Squared distance is enough here -- we only need the ordering, and every
 * candidate is compared in the same space.
 */
export function findNearestZone(localX: number, localY: number): PunchZone {
  let best = PUNCH_ZONES[0]!;
  let bestDistance = Infinity;

  for (const zone of PUNCH_ZONES) {
    const dx = localX - zone.localAnchor[0];
    const dy = localY - zone.localAnchor[1];
    const distance = dx * dx + dy * dy;

    if (distance < bestDistance) {
      bestDistance = distance;
      best = zone;
    }
  }

  return best;
}
