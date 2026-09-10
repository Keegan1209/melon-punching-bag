import { Vector3, type Camera, type Euler, type Object3D } from "three";
import { BAG } from "@/config/scene";
import { theme } from "@/config/theme";
import { findNearestZone, type GloveSide, type PunchZone } from "@/config/zones";
import { useGameStore } from "@/store/useGameStore";
import { AudioEngine } from "./audio";
import { BagPendulum } from "./BagPendulum";
import { CameraShake } from "./CameraShake";
import { triggerHaptic } from "./haptics";
import { PunchAnimator } from "./PunchAnimator";

/**
 * Scales a zone's unit-ish impulse direction into a world-space force.
 * Paired with PHYSICS.inertia; the two together set how hard a punch lands.
 */
const BASE_FORCE = 60;

interface GloveBinding {
  animator: PunchAnimator;
  object: Object3D;
}

/**
 * Wires the pieces together: a tap becomes a zone, a zone becomes a punch, and
 * the punch -- not the tap -- becomes force, sound and haptic feedback.
 *
 * The engine also owns the frame order. Gloves are advanced first so that a
 * contact lands before the bag integrates it in the same frame; doing it the
 * other way round would delay every impulse by one frame.
 */
export class GameEngine {
  readonly bag = new BagPendulum();
  readonly audio = new AudioEngine();
  readonly shake = new CameraShake();

  private readonly gloves = new Map<GloveSide, GloveBinding>();
  private bagPivot: Object3D | null = null;
  /** Separate from the pivot so hit-testing is never done against a squashed
   *  bag: compression is applied below the group the raycast resolves into. */
  private bagSquash: Object3D | null = null;
  private camera: Camera | null = null;
  /** The rig's framing position; shake is applied as an offset from it. */
  private readonly cameraBase = new Vector3();
  private readonly squashScale = { x: 1, y: 1, z: 1 };

  /**
   * Idle poses resolved from the viewport by the camera rig.
   *
   * Held here because the rig computes them before the gloves mount, and they
   * are recomputed on every resize. Storing them means a glove picks up the
   * current anchor whenever it happens to bind.
   */
  private readonly idlePositions = new Map<GloveSide, Vector3>();

  bindGlove(side: GloveSide, object: Object3D, idleRotation: Euler): void {
    const idlePosition = this.idlePositions.get(side) ?? new Vector3();
    this.gloves.set(side, {
      animator: new PunchAnimator(idlePosition, idleRotation),
      object,
    });
  }

  /** Called by the camera rig on mount and on every viewport change. */
  setGloveIdlePosition(side: GloveSide, position: Vector3): void {
    const stored = this.idlePositions.get(side);
    if (stored) {
      stored.copy(position);
    } else {
      this.idlePositions.set(side, position.clone());
    }

    this.gloves.get(side)?.animator.setIdlePosition(position);
  }

  unbindGlove(side: GloveSide): void {
    this.gloves.delete(side);
  }

  bindBagPivot(object: Object3D | null): void {
    this.bagPivot = object;
  }

  bindBagSquash(object: Object3D | null): void {
    this.bagSquash = object;
  }

  /** Called by the camera rig whenever it re-frames the scene. */
  bindCamera(camera: Camera | null, basePosition?: Vector3): void {
    this.camera = camera;
    if (basePosition) this.cameraBase.copy(basePosition);
  }

  /**
   * Route a hit on the bag, given in bag-local coordinates, to the right glove.
   * The raycast result only ever chooses a zone -- it never aims the fist.
   */
  punchAt(localX: number, localY: number): void {
    const zone = findNearestZone(localX, localY);
    this.gloves.get(zone.glove)?.animator.request(zone);

    // Prime audio here rather than at contact: this call sits inside the tap's
    // gesture, the only moment iOS will let us resume an AudioContext.
    this.audio.unlock();
  }

  /** Called by the animator on the exact frame a fist reaches the bag. */
  private handleContact = (zone: PunchZone): void => {
    const strength = BASE_FORCE * zone.impulseStrength * theme.bag.swingStrength;

    this.bag.applyImpulse(
      zone.contactPoint,
      [
        zone.impulseDirection[0] * strength,
        zone.impulseDirection[1] * strength,
        zone.impulseDirection[2] * strength,
      ],
      BAG.pivotY
    );

    this.audio.play(zone.impulseStrength);
    this.shake.impulse(zone.impulseStrength * theme.bag.swingStrength);
    triggerHaptic();
    useGameStore.getState().registerPunch(zone.id);
  };

  /** Single per-frame tick for the whole experience. */
  update(delta: number): void {
    for (const { animator, object } of this.gloves.values()) {
      animator.update(delta, this.handleContact);
      object.position.copy(animator.position);
      object.rotation.copy(animator.rotation);
    }

    this.bag.update(delta);
    this.shake.update(delta);

    if (this.bagPivot) {
      this.bagPivot.rotation.x = this.bag.angleX + this.bag.wobble;
      this.bagPivot.rotation.z = this.bag.angleZ;
      this.bagPivot.rotation.y = this.bag.angleY;
      this.bagPivot.position.y = BAG.pivotY + this.bag.liftOffset;
    }

    if (this.bagSquash) {
      this.bag.getSquashScale(this.squashScale);
      this.bagSquash.scale.set(this.squashScale.x, this.squashScale.y, this.squashScale.z);
    }

    if (this.camera) {
      this.camera.position.copy(this.cameraBase).add(this.shake.value);
    }
  }

  dispose(): void {
    this.audio.dispose();
    this.gloves.clear();
    this.bagPivot = null;
    this.bagSquash = null;
    this.camera = null;
  }
}
