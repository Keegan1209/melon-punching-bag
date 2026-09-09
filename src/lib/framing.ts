import { Vector3, type PerspectiveCamera } from "three";

const forward = new Vector3();
const right = new Vector3();
const up = new Vector3();

/**
 * Resolve a viewport-relative anchor into a world position.
 *
 * Gloves are placed this way rather than at fixed world coordinates because a
 * fixed point that sits near the edge of a desktop frame falls clean outside a
 * portrait phone's much narrower frustum. Anchoring to the frustum itself
 * means the gloves land in the same place on screen on every device.
 *
 * `ndcX` / `ndcY` run -1..1 from the left/bottom of the frame.
 */
export function resolveViewportAnchor(
  camera: PerspectiveCamera,
  ndcX: number,
  ndcY: number,
  depth: number,
  target: Vector3
): Vector3 {
  camera.getWorldDirection(forward);
  right.crossVectors(forward, camera.up).normalize();
  up.crossVectors(right, forward).normalize();

  const halfHeight = depth * Math.tan((camera.fov * Math.PI) / 360);
  const halfWidth = halfHeight * camera.aspect;

  return target
    .copy(camera.position)
    .addScaledVector(forward, depth)
    .addScaledVector(right, ndcX * halfWidth)
    .addScaledVector(up, ndcY * halfHeight);
}
