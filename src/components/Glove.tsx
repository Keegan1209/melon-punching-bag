"use client";

import { memo, useEffect, useRef } from "react";
import type { Group } from "three";
import { Euler } from "three";
import { GLOVE } from "@/config/scene";
import { theme } from "@/config/theme";
import type { GloveSide } from "@/config/zones";
import { useGameEngine } from "./GameProvider";
import { ThemedModel } from "./ThemedModel";

interface GloveProps {
  side: GloveSide;
}

/**
 * Built-in glove, used whenever theme.gloves.model is null.
 *
 * Knuckles point along +Y -- the same convention the GLB uses, so one set of
 * idle and wrist poses drives either glove. At rest that reads as a fist held
 * up in guard; a zone's wrist rotation pitches it forward to lead the punch.
 *
 * `mirror` flips the thumb so the two hands are not identical copies.
 */
function ProceduralGlove({ color, mirror }: { color: string; mirror: 1 | -1 }) {
  return (
    <>
      <mesh castShadow>
        <sphereGeometry args={[0.5, 20, 16]} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.05} />
      </mesh>

      {/* Knuckle face, flattened upward to give the fist a striking surface. */}
      <mesh position={[0, 0.26, 0.04]} scale={[0.92, 0.6, 0.78]} castShadow>
        <sphereGeometry args={[0.5, 20, 16]} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.05} />
      </mesh>

      <mesh position={[0.34 * mirror, 0.16, 0.18]} rotation={[0, 0, -0.7 * mirror]} castShadow>
        <capsuleGeometry args={[0.15, 0.22, 4, 12]} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.05} />
      </mesh>

      <mesh position={[0, -0.5, -0.1]} castShadow>
        <cylinderGeometry args={[0.34, 0.38, 0.42, 18]} />
        <meshStandardMaterial color={theme.gloves.cuffColor} roughness={0.7} />
      </mesh>
    </>
  );
}

/**
 * One boxing glove.
 *
 * The component only ever renders a pose; the engine owns the animation and
 * writes straight into this group's transform each frame. That is why a punch
 * costs zero React re-renders.
 */
function GloveImpl({ side }: GloveProps) {
  const engine = useGameEngine();
  const groupRef = useRef<Group>(null);

  const idle = GLOVE.idle[side];
  const color = side === "left" ? theme.gloves.leftColor : theme.gloves.rightColor;
  const mirror = side === "left" ? 1 : -1;

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    engine.bindGlove(side, group, new Euler(idle.rotation[0], idle.rotation[1], idle.rotation[2]));

    return () => engine.unbindGlove(side);
  }, [engine, side, idle]);

  // Position is owned by the engine and written every frame; the rotation here
  // is only the pose before the first tick.
  return (
    <group ref={groupRef} rotation={[idle.rotation[0], idle.rotation[1], idle.rotation[2]]}>
      {theme.gloves.model ? (
        /* Mirrored for the left hand. Negative scale inverts winding, so the
           material has to render both faces or the glove looks inside out. */
        <group scale={[mirror, 1, 1]}>
          <ThemedModel
            url={theme.gloves.model}
            color={color}
            tintMaterials={theme.gloves.tintMaterials}
            fitToSize={theme.gloves.modelSize}
            rotation={theme.gloves.modelRotation}
            doubleSided
          />
        </group>
      ) : (
        <group scale={GLOVE.scale}>
          <ProceduralGlove color={color} mirror={mirror} />
        </group>
      )}
    </group>
  );
}

export const Glove = memo(GloveImpl);
