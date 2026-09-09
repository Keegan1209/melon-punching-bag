import { Euler, Vector3 } from "three";
import type { PunchZone } from "@/config/zones";
import { bezier2, easeInCubic, easeInOutCubic, easeOutCubic, easeOutQuad, lerp, remap } from "./easing";

/** Fraction of the pre-contact window spent winding up rather than striking. */
const WINDUP_SHARE = 0.45;
/** How long the fist stays buried in the bag after contact, normalised. */
const IMPACT_HOLD = 0.12;

export type ContactHandler = (zone: PunchZone) => void;

/**
 * Drives one glove through a single handcrafted punch.
 *
 * Deliberately imperative: it mutates `position` and `rotation` in place and is
 * read once per frame straight into an Object3D. Nothing here touches React
 * state, so a punch costs zero re-renders.
 */
export class PunchAnimator {
  readonly position = new Vector3();
  readonly rotation = new Euler();

  private zone: PunchZone | null = null;
  private elapsed = 0;
  private hasContacted = false;
  /** At most one punch waits behind the active one, so taps never stack up. */
  private queued: PunchZone | null = null;

  private readonly idlePosition = new Vector3();
  private readonly idleRotation = new Euler();
  private readonly windupPosition = new Vector3();
  private readonly contactPosition = new Vector3();
  private readonly overshootPosition = new Vector3();

  constructor(idlePosition: Vector3, idleRotation: Euler) {
    this.idlePosition.copy(idlePosition);
    this.idleRotation.copy(idleRotation);
    this.position.copy(idlePosition);
    this.rotation.copy(idleRotation);
  }

  get isBusy(): boolean {
    return this.zone !== null;
  }

  /**
   * Re-anchor the resting pose, e.g. after a viewport resize.
   * A punch already in flight keeps its trajectory and simply recovers to the
   * new idle, so a rotation mid-swing never snaps the glove.
   */
  setIdlePosition(position: Vector3): void {
    this.idlePosition.copy(position);
    if (this.zone === null) this.position.copy(position);
  }

  /**
   * Begin a punch, or hold it as the next one if this glove is mid-swing.
   * A second queued tap replaces the first -- the newest intent wins.
   */
  request(zone: PunchZone): void {
    if (this.zone === null) {
      this.begin(zone);
    } else {
      this.queued = zone;
    }
  }

  private begin(zone: PunchZone): void {
    this.zone = zone;
    this.elapsed = 0;
    this.hasContacted = false;

    this.windupPosition.set(
      this.idlePosition.x + zone.windupOffset[0],
      this.idlePosition.y + zone.windupOffset[1],
      this.idlePosition.z + zone.windupOffset[2]
    );

    this.contactPosition.set(zone.contactPoint[0], zone.contactPoint[1], zone.contactPoint[2]);

    // Follow through slightly past the surface so contact reads as weight.
    this.overshootPosition.set(
      this.contactPosition.x + zone.impulseDirection[0] * 0.05,
      this.contactPosition.y + zone.impulseDirection[1] * 0.05,
      this.contactPosition.z + zone.impulseDirection[2] * 0.05
    );
  }

  /**
   * Advance one frame. `onContact` fires exactly once per punch, on the frame
   * the fist reaches the bag -- physics and audio are slaved to the animation
   * clock, never to the tap that started it.
   */
  update(delta: number, onContact: ContactHandler): void {
    const zone = this.zone;
    if (!zone) return;

    this.elapsed += delta;
    const t = this.elapsed / zone.duration;

    const windupEnd = zone.contactAt * WINDUP_SHARE;
    const holdEnd = Math.min(zone.contactAt + IMPACT_HOLD, 0.98);

    if (t < windupEnd) {
      this.applyWindup(remap(t, 0, windupEnd), zone);
    } else if (t < zone.contactAt) {
      this.applyStrike(remap(t, windupEnd, zone.contactAt), zone);
    } else if (t < holdEnd) {
      if (!this.hasContacted) {
        this.hasContacted = true;
        onContact(zone);
      }
      this.applyImpact(remap(t, zone.contactAt, holdEnd), zone);
    } else if (t < 1) {
      this.applyRecovery(remap(t, holdEnd, 1), zone);
    } else {
      this.finish(onContact);
    }
  }

  private applyWindup(progress: number, zone: PunchZone): void {
    const eased = easeOutQuad(progress);
    this.position.lerpVectors(this.idlePosition, this.windupPosition, eased);

    // Rotate only slightly during windup; the snap happens on the strike.
    this.rotation.set(
      lerp(this.idleRotation.x, zone.wristRotation[0], eased * 0.25),
      lerp(this.idleRotation.y, zone.wristRotation[1], eased * 0.25),
      lerp(this.idleRotation.z, zone.wristRotation[2], eased * 0.25)
    );
  }

  private applyStrike(progress: number, zone: PunchZone): void {
    const eased = easeInCubic(progress);

    // Bow the path so the fist swings in rather than sliding down a rail.
    const controlX = (this.windupPosition.x + this.contactPosition.x) / 2 + zone.arc[0];
    const controlY = (this.windupPosition.y + this.contactPosition.y) / 2 + zone.arc[1];
    const controlZ = (this.windupPosition.z + this.contactPosition.z) / 2 + zone.arc[2];

    this.position.set(
      bezier2(this.windupPosition.x, controlX, this.contactPosition.x, eased),
      bezier2(this.windupPosition.y, controlY, this.contactPosition.y, eased),
      bezier2(this.windupPosition.z, controlZ, this.contactPosition.z, eased)
    );

    // Wrist leads the fist, settling into its final angle just before impact.
    const rotationEase = easeOutCubic(progress);
    this.rotation.set(
      lerp(this.idleRotation.x * 0.75, zone.wristRotation[0], rotationEase),
      lerp(this.idleRotation.y * 0.75, zone.wristRotation[1], rotationEase),
      lerp(this.idleRotation.z * 0.75, zone.wristRotation[2], rotationEase)
    );
  }

  private applyImpact(progress: number, zone: PunchZone): void {
    // Push in, then begin easing out -- a compressed sine reads as a thud.
    const push = Math.sin(progress * Math.PI);
    this.position.lerpVectors(this.contactPosition, this.overshootPosition, push);
    this.rotation.set(zone.wristRotation[0], zone.wristRotation[1], zone.wristRotation[2]);
  }

  private applyRecovery(progress: number, zone: PunchZone): void {
    const eased = easeInOutCubic(progress);
    this.position.lerpVectors(this.contactPosition, this.idlePosition, eased);
    this.rotation.set(
      lerp(zone.wristRotation[0], this.idleRotation.x, eased),
      lerp(zone.wristRotation[1], this.idleRotation.y, eased),
      lerp(zone.wristRotation[2], this.idleRotation.z, eased)
    );
  }

  private finish(onContact: ContactHandler): void {
    this.position.copy(this.idlePosition);
    this.rotation.copy(this.idleRotation);
    this.zone = null;

    const next = this.queued;
    if (next) {
      this.queued = null;
      this.begin(next);
      // Consume the leftover time so a queued punch does not drop a frame.
      this.update(0, onContact);
    }
  }
}
