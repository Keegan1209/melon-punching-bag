import { IMPACT, PHYSICS } from "@/config/scene";
import type { Vec3 } from "@/config/zones";

/**
 * A two-axis damped pendulum standing in for a full rigid-body solver.
 *
 * The bag is one body with two meaningful degrees of freedom, so a spring-
 * damper is both cheaper and easier to tune by feel than a constraint solver.
 * Rapier could be swapped in later without touching callers: everything
 * outside this class only uses `applyImpulse` and reads `angleX` / `angleZ`.
 */
export class BagPendulum {
  /** Tilt about world X. Positive swings the bag's base away from camera. */
  angleX = 0;
  /** Tilt about world Z. Positive swings the bag's base to -X. */
  angleZ = 0;

  private velocityX = 0;
  private velocityZ = 0;

  /** Rotation about the vertical. A hook spins the bag; a straight does not. */
  angleY = 0;
  private velocityY = 0;

  /** Vertical displacement on the chain, so an uppercut can kick the bag up. */
  liftOffset = 0;
  private liftVelocity = 0;

  /** Fast decaying shudder applied on top of the swing. */
  private wobblePhase = 0;
  private wobbleEnergy = 0;

  /** Compression from the last hit, and the axis it arrived along. */
  private squashEnergy = 0;
  private squashPhase = 0;
  private squashLateral = 0;

  /**
   * Deliver a force at a world-space point.
   *
   * Torque comes out of an honest r x F cross product, so a punch low on the
   * bag naturally swings it more than one near the chain -- leverage is a
   * consequence of the geometry, not a hand-tuned per-zone number.
   */
  applyImpulse(point: Vec3, force: Vec3, pivotY: number): void {
    const rx = point[0];
    const ry = point[1] - pivotY;
    const rz = point[2];

    const [fx, fy, fz] = force;

    const torqueX = ry * fz - rz * fy;
    const torqueY = rz * fx - rx * fz;
    const torqueZ = rx * fy - ry * fx;

    this.velocityX += torqueX / PHYSICS.inertia;
    this.velocityZ += torqueZ / PHYSICS.inertia;
    this.velocityY += torqueY / PHYSICS.twist.inertia;

    // Only upward force lifts the bag; a downward component just loads the
    // chain, which is already rigid.
    if (fy > 0) this.liftVelocity += fy / PHYSICS.lift.mass;

    this.wobbleEnergy = Math.min(1, this.wobbleEnergy + 0.6);
    this.wobblePhase = 0;

    // Squash along the direction of travel. The lateral share decides whether
    // the bag is driven back (a straight) or across (a hook).
    const magnitude = Math.hypot(fx, fy, fz);
    if (magnitude > 0) {
      this.squashEnergy = Math.min(1.4, this.squashEnergy + magnitude / 90);
      this.squashPhase = 0;
      this.squashLateral = Math.abs(fx) / magnitude;
    }
  }

  /**
   * Advance the simulation.
   *
   * `dt` is clamped because a backgrounded tab can hand us a huge delta, which
   * would otherwise fling the bag on the frame the user returns.
   */
  update(delta: number): void {
    const dt = Math.min(delta, 1 / 30);
    const restoring = PHYSICS.gravity / PHYSICS.armLength;

    // sin() rather than the small-angle approximation, so hard punches that
    // swing the bag wide still decelerate correctly.
    const accelX = -restoring * Math.sin(this.angleX) - PHYSICS.damping * this.velocityX;
    const accelZ = -restoring * Math.sin(this.angleZ) - PHYSICS.damping * this.velocityZ;

    this.velocityX += accelX * dt;
    this.velocityZ += accelZ * dt;
    this.angleX += this.velocityX * dt;
    this.angleZ += this.velocityZ * dt;

    this.angleX = this.clampSwing(this.angleX, "velocityX");
    this.angleZ = this.clampSwing(this.angleZ, "velocityZ");

    // Twist unwinds against a soft spring rather than gravity: a chain resists
    // rotation, but only weakly, so it keeps turning well after the hit.
    const twistAccel =
      -PHYSICS.twist.stiffness * this.angleY - PHYSICS.twist.damping * this.velocityY;
    this.velocityY += twistAccel * dt;
    this.angleY += this.velocityY * dt;
    if (Math.abs(this.angleY) > PHYSICS.twist.maxAngle) {
      this.angleY = Math.sign(this.angleY) * PHYSICS.twist.maxAngle;
      this.velocityY *= -0.2;
    }

    // Vertical kick, and the drop back onto the chain.
    const liftAccel =
      -PHYSICS.lift.stiffness * this.liftOffset - PHYSICS.lift.damping * this.liftVelocity;
    this.liftVelocity += liftAccel * dt;
    this.liftOffset += this.liftVelocity * dt;
    if (this.liftOffset > PHYSICS.lift.maxOffset) {
      this.liftOffset = PHYSICS.lift.maxOffset;
      this.liftVelocity = 0;
    }

    if (this.squashEnergy > 0.0001) {
      this.squashPhase += dt;
      this.squashEnergy *= Math.exp(-IMPACT.squash.damping * dt);
    } else {
      this.squashEnergy = 0;
    }

    if (this.wobbleEnergy > 0.0001) {
      this.wobblePhase += dt;
      this.wobbleEnergy *= Math.exp(-PHYSICS.wobble.damping * dt);
    } else {
      this.wobbleEnergy = 0;
    }

    // Snap fully to zero once motion is below the visible threshold, so the
    // bag actually stops instead of drifting on floating-point residue.
    if (this.isAtRest) {
      this.angleX = 0;
      this.angleZ = 0;
      this.angleY = 0;
      this.velocityX = 0;
      this.velocityZ = 0;
      this.velocityY = 0;
      this.liftOffset = 0;
      this.liftVelocity = 0;
    }
  }

  /**
   * Hold the swing inside its limit, killing most of the velocity rather than
   * reversing it -- a bag that hits the end of its range should thud to a stop,
   * not bounce.
   */
  private clampSwing(angle: number, velocityKey: "velocityX" | "velocityZ"): number {
    if (angle > PHYSICS.maxAngle) {
      this[velocityKey] *= -0.15;
      return PHYSICS.maxAngle;
    }
    if (angle < -PHYSICS.maxAngle) {
      this[velocityKey] *= -0.15;
      return -PHYSICS.maxAngle;
    }
    return angle;
  }

  /** Small oscillation to overlay on the swing so impacts read as impacts. */
  get wobble(): number {
    if (this.wobbleEnergy <= 0) return 0;
    return (
      Math.sin(this.wobblePhase * PHYSICS.wobble.frequency) *
      PHYSICS.wobble.amplitude *
      this.wobbleEnergy
    );
  }

  /**
   * Compression as a scale vector, to be applied to the bag's mesh.
   *
   * Cosine rather than a plain decay so the bag rebounds slightly past its
   * resting shape before settling, which is what sells it as springy rather
   * than merely dented.
   */
  getSquashScale(target: { x: number; y: number; z: number }): void {
    if (this.squashEnergy <= 0) {
      target.x = 1;
      target.y = 1;
      target.z = 1;
      return;
    }

    const amount =
      this.squashEnergy *
      IMPACT.squash.amplitude *
      Math.cos(this.squashPhase * IMPACT.squash.frequency);

    const lateral = this.squashLateral;
    target.x = 1 - amount * lateral + amount * (1 - lateral) * 0.55;
    target.y = 1 - amount * 0.18;
    target.z = 1 - amount * (1 - lateral) + amount * lateral * 0.55;
  }

  /** True once the bag has effectively stopped, so renderers can idle. */
  get isAtRest(): boolean {
    return (
      Math.abs(this.angleX) < PHYSICS.restAngle &&
      Math.abs(this.angleZ) < PHYSICS.restAngle &&
      Math.abs(this.angleY) < PHYSICS.restAngle &&
      Math.abs(this.velocityX) < PHYSICS.restAngle &&
      Math.abs(this.velocityZ) < PHYSICS.restAngle &&
      Math.abs(this.velocityY) < PHYSICS.restAngle &&
      Math.abs(this.liftOffset) < PHYSICS.restAngle &&
      this.wobbleEnergy === 0 &&
      this.squashEnergy === 0
    );
  }

  reset(): void {
    this.angleX = 0;
    this.angleZ = 0;
    this.angleY = 0;
    this.velocityX = 0;
    this.velocityZ = 0;
    this.velocityY = 0;
    this.liftOffset = 0;
    this.liftVelocity = 0;
    this.wobbleEnergy = 0;
    this.wobblePhase = 0;
    this.squashEnergy = 0;
    this.squashPhase = 0;
  }
}
