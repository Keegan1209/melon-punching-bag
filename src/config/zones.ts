import { BAG_CENTER_Y } from "./scene";

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

export interface PunchZone {
  id: string;
  /** Which hand throws this punch. */
  glove: GloveSide;
  /** Zone centre in bag-local space, used for nearest-zone classification. */
  localAnchor: Vec3;
  /** World-space point the fist arrives at, on the camera-facing bag surface. */
  contactPoint: Vec3;
  /** Where the glove pulls back to before firing, relative to its idle pose. */
  windupOffset: Vec3;
  /** Fist orientation at the moment of contact. */
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

/** Bag-local Y for each tier. Local space is centred on the bag's midpoint. */
const TIER_Y = {
  top: BAG_CENTER_Y + 0.62,
  middle: BAG_CENTER_Y,
  bottom: BAG_CENTER_Y - 0.55,
} as const;

const LOCAL_TIER_Y = {
  top: 0.62,
  middle: 0,
  bottom: -0.55,
} as const;

export const PUNCH_ZONES: readonly PunchZone[] = [
  {
    id: "top-left",
    glove: "left",
    localAnchor: [-0.22, LOCAL_TIER_Y.top, 0.3],
    contactPoint: [-0.24, TIER_Y.top, 0.46],
    windupOffset: [-0.16, -0.1, 0.34],
    wristRotation: [-0.5, 0.34, 0.16],
    arc: [-0.16, 0.28, 0],
    impulseDirection: [0.3, -0.1, -1],
    impulseStrength: 0.92,
    duration: 0.44,
    contactAt: 0.48,
  },
  {
    id: "top-right",
    glove: "right",
    localAnchor: [0.22, LOCAL_TIER_Y.top, 0.3],
    contactPoint: [0.24, TIER_Y.top, 0.46],
    windupOffset: [0.16, -0.1, 0.34],
    wristRotation: [-0.5, -0.34, -0.16],
    arc: [0.16, 0.28, 0],
    impulseDirection: [-0.3, -0.1, -1],
    impulseStrength: 0.92,
    duration: 0.44,
    contactAt: 0.48,
  },
  {
    id: "middle-left",
    glove: "left",
    localAnchor: [-0.26, LOCAL_TIER_Y.middle, 0.3],
    contactPoint: [-0.26, TIER_Y.middle, 0.48],
    windupOffset: [-0.2, -0.04, 0.38],
    wristRotation: [-0.2, 0.22, 0.1],
    arc: [-0.22, 0.16, 0],
    impulseDirection: [0.36, 0, -1],
    impulseStrength: 1.0,
    duration: 0.4,
    contactAt: 0.48,
  },
  {
    id: "middle-right",
    glove: "right",
    localAnchor: [0.26, LOCAL_TIER_Y.middle, 0.3],
    contactPoint: [0.26, TIER_Y.middle, 0.48],
    windupOffset: [0.2, -0.04, 0.38],
    wristRotation: [-0.2, -0.22, -0.1],
    arc: [0.22, 0.16, 0],
    impulseDirection: [-0.36, 0, -1],
    impulseStrength: 1.0,
    duration: 0.4,
    contactAt: 0.48,
  },
  {
    id: "bottom-left",
    glove: "left",
    localAnchor: [-0.22, LOCAL_TIER_Y.bottom, 0.3],
    contactPoint: [-0.22, TIER_Y.bottom, 0.46],
    windupOffset: [-0.22, 0.06, 0.32],
    wristRotation: [0.24, 0.16, 0.34],
    arc: [-0.18, -0.06, 0],
    impulseDirection: [0.28, 0.12, -1],
    impulseStrength: 1.06,
    duration: 0.42,
    contactAt: 0.5,
  },
  {
    id: "bottom-right",
    glove: "right",
    localAnchor: [0.22, LOCAL_TIER_Y.bottom, 0.3],
    contactPoint: [0.22, TIER_Y.bottom, 0.46],
    windupOffset: [0.22, 0.06, 0.32],
    wristRotation: [0.24, -0.16, -0.34],
    arc: [0.18, -0.06, 0],
    impulseDirection: [-0.28, 0.12, -1],
    impulseStrength: 1.06,
    duration: 0.42,
    contactAt: 0.5,
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
