"use client";

import { memo } from "react";
import { BackSide } from "three";
import { BAG, ROOM } from "@/config/scene";
import { theme } from "@/config/theme";

/**
 * The room. Entirely static, so it renders once and is memoised away.
 *
 * The shell is an inside-out box rather than five separate walls: one draw
 * call, no corner seams, and nothing to keep in sync. It is deliberately much
 * larger than the visible room so the camera can never see past its edges at
 * any aspect ratio; the floor and ceiling planes below define what you
 * actually see, and the shell only ever supplies the walls between them.
 */
function GymImpl() {
  const { floorColor, wallColor, ceilingColor } = theme.environment;

  return (
    <group>
      <mesh position={[0, ROOM.height / 2 + ROOM.floorY, 0]}>
        <boxGeometry args={[ROOM.width, ROOM.height, ROOM.depth]} />
        <meshStandardMaterial color={wallColor} side={BackSide} roughness={0.95} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, ROOM.floorY, 0]} receiveShadow>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color={floorColor} roughness={0.8} metalness={0.05} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.ceilingY, 0]}>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color={ceilingColor} roughness={1} />
      </mesh>

      {/* Mounting plate the chain bolts into. */}
      <mesh position={[0, ROOM.ceilingY - 0.02, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.04, 16]} />
        <meshStandardMaterial
          color={theme.environment.chainColor}
          metalness={0.85}
          roughness={0.4}
        />
      </mesh>

      <mesh position={[0, (ROOM.ceilingY + BAG.pivotY) / 2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, ROOM.ceilingY - BAG.pivotY, 8]} />
        <meshStandardMaterial
          color={theme.environment.chainColor}
          metalness={0.85}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

export const Gym = memo(GymImpl);
