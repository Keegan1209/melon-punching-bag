"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { CAMERA } from "@/config/scene";
import { theme } from "@/config/theme";
import { GameProvider } from "./GameProvider";
import { Scene } from "./Scene";

/**
 * The single WebGL canvas.
 *
 * dpr is capped at 2: past that a phone burns fill rate for pixels nobody can
 * resolve, and this is the cheapest meaningful win for the 60 FPS target.
 */
export default function Experience() {
  return (
    <GameProvider>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: CAMERA.fov, near: 0.1, far: 60 }}
        style={{ background: theme.environment.background, touchAction: "none" }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </GameProvider>
  );
}
