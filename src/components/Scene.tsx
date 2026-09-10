"use client";

import { memo } from "react";
import { useFrame } from "@react-three/fiber";
import { theme } from "@/config/theme";
import { CameraRig } from "./CameraRig";
import { Glove } from "./Glove";
import { useGameEngine } from "./GameProvider";
import { Gym } from "./Gym";
import { PunchingBag } from "./PunchingBag";
import { WallBranding } from "./WallBranding";

/**
 * The one place the simulation advances.
 *
 * A single useFrame for the whole experience keeps ordering explicit and
 * deterministic: the engine resolves glove contacts before integrating the
 * bag, so an impulse lands on the frame it was generated.
 */
function GameLoop() {
  const engine = useGameEngine();

  useFrame((_, delta) => {
    engine.update(delta);
  });

  return null;
}

function SceneImpl() {
  return (
    <>
      <CameraRig />
      <GameLoop />

      <ambientLight intensity={0.72} />
      <hemisphereLight intensity={0.5} groundColor={theme.environment.floorColor} />
      {/* normalBias offsets the shadow lookup along the surface normal, which
          is what stops a large flat floor stippling itself as the camera
          moves; the tighter shadow camera raises texel density for free. */}
      <directionalLight
        position={[2.6, 4.6, 3.2]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
        shadow-camera-left={-2.6}
        shadow-camera-right={2.6}
        shadow-camera-top={3.6}
        shadow-camera-bottom={-1}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
      />
      {/* Cool rim from behind so the bag separates from the back wall. */}
      <pointLight position={[-2.4, 2.6, -2.2]} intensity={14} color="#9fb4ff" distance={11} />
      {/* Both sit below the ceiling: a directional light can never reach a
          downward-facing plane, so without these it renders black. Two of them
          because one leaves the far half of the ceiling unlit. */}
      <pointLight position={[0, 2.72, 1.4]} intensity={14} color="#ffe9cf" distance={10} />
      <pointLight position={[0, 2.72, -2.2]} intensity={12} color="#ffe4c4" distance={10} />

      <Gym />
      <WallBranding />
      <PunchingBag />
      <Glove side="left" />
      <Glove side="right" />

      <fog
        attach="fog"
        args={[
          theme.environment.background,
          theme.environment.fogNear,
          theme.environment.fogFar,
        ]}
      />
    </>
  );
}

export const Scene = memo(SceneImpl);
