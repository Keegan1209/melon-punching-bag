"use client";

import { useLayoutEffect, useMemo } from "react";
import { PerspectiveCamera, Vector3 } from "three";
import { useThree } from "@react-three/fiber";
import { CAMERA, GLOVE } from "@/config/scene";
import { resolveViewportAnchor } from "@/lib/framing";
import { useGameEngine } from "./GameProvider";

/**
 * Frames the scene and anchors the gloves.
 *
 * Vertical FOV is fixed, so a tall phone loses width rather than height. The
 * camera dollies back until the framing budget in CAMERA is met on both axes,
 * then the gloves are resolved from the resulting frustum so they sit in the
 * same screen position regardless of device.
 */
export function CameraRig() {
  const engine = useGameEngine();
  const camera = useThree((state) => state.camera);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  const scratch = useMemo(() => new Vector3(), []);

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || height === 0) return;

    const aspect = width / height;
    const halfFovTangent = Math.tan((CAMERA.fov * Math.PI) / 360);

    const distanceForHeight = CAMERA.frameHalfHeight / halfFovTangent;
    const distanceForWidth = CAMERA.frameHalfWidth / (halfFovTangent * aspect);

    const distance = Math.min(
      CAMERA.maxDistance,
      Math.max(CAMERA.minDistance, distanceForHeight, distanceForWidth)
    );

    camera.fov = CAMERA.fov;
    camera.aspect = aspect;
    camera.position.set(0, CAMERA.height, distance);
    camera.lookAt(CAMERA.lookAt[0], CAMERA.lookAt[1], CAMERA.lookAt[2]);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    // The engine owns the camera's position from here on, adding shake as an
    // offset from this base; the rig only decides where the base is.
    engine.bindCamera(camera, camera.position);

    for (const side of ["left", "right"] as const) {
      const anchor = GLOVE.idle[side];
      resolveViewportAnchor(camera, anchor.screen[0], anchor.screen[1], anchor.depth, scratch);
      engine.setGloveIdlePosition(side, scratch);
    }
  }, [camera, width, height, engine, scratch]);

  return null;
}
