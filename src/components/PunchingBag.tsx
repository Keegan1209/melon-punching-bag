"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import { Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { BAG, BAG_CENTER_Y, BAG_COM_OFFSET, PROCEDURAL_BODY_LENGTH } from "@/config/scene";
import { theme } from "@/config/theme";
import { useGameEngine } from "./GameProvider";
import { ThemedModel } from "./ThemedModel";

/** Chain links for the procedural bag, which has no chain of its own. */
const CHAIN_LINKS = 4;

/** Scratch vector reused on every tap so hit-testing allocates nothing. */
const localHit = new Vector3();

/** Built-in bag, used whenever theme.bag.model is null. */
function ProceduralBag() {
  return (
    <mesh castShadow>
      <capsuleGeometry args={[BAG.radius, PROCEDURAL_BODY_LENGTH, 8, 24]} />
      <meshStandardMaterial color={theme.bag.color} roughness={0.62} metalness={0.06} />
    </mesh>
  );
}

/** The chain the procedural bag hangs from. A GLB brings its own. */
function ProceduralChain() {
  const spacing = BAG.suspension / CHAIN_LINKS;

  return (
    <>
      {Array.from({ length: CHAIN_LINKS }, (_, index) => (
        <mesh
          key={index}
          position={[0, -spacing * (index + 0.5), 0]}
          rotation={[Math.PI / 2, 0, index % 2 === 0 ? 0 : Math.PI / 2]}
        >
          <torusGeometry args={[spacing * 0.5, 0.014, 6, 14]} />
          <meshStandardMaterial
            color={theme.environment.chainColor}
            metalness={0.9}
            roughness={0.35}
          />
        </mesh>
      ))}
    </>
  );
}

function PunchingBagImpl() {
  const engine = useGameEngine();
  const pivotRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const squashRef = useRef<Group>(null);

  useEffect(() => {
    engine.bindBagPivot(pivotRef.current);
    engine.bindBagSquash(squashRef.current);
    return () => {
      engine.bindBagPivot(null);
      engine.bindBagSquash(null);
    };
  }, [engine]);

  /**
   * Where a GLB is hung, expressed in the body group's own space: from the
   * pivot above it down to the floor clearance below. The model's chain and
   * bracket occupy whatever of that span its body does not.
   */
  const fitToSpan = useMemo(
    () => ({ top: BAG_COM_OFFSET, bottom: BAG.floorClearance - BAG_CENTER_Y }),
    []
  );

  /**
   * Convert the world-space hit into the bag's own space before classifying.
   * Judging the hit in local space means it is measured against the bag as it
   * is right now -- mid-swing, tilted -- not against where it hangs at rest.
   */
  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const body = bodyRef.current;
      if (!body) return;

      event.stopPropagation();
      localHit.copy(event.point);
      body.worldToLocal(localHit);

      engine.punchAt(localHit.x, localHit.y);
    },
    [engine]
  );

  return (
    <group position={[0, BAG.pivotY, 0]} ref={pivotRef}>
      {!theme.bag.model && <ProceduralChain />}

      {/* Compression lives on an inner group so the group the raycast resolves
          into is never scaled -- otherwise a tap during a squash would be
          classified against a distorted bag. */}
      <group ref={bodyRef} position={[0, -BAG_COM_OFFSET, 0]} onPointerDown={handlePointerDown}>
        <group ref={squashRef}>
          {theme.bag.model ? (
            <ThemedModel
              url={theme.bag.model}
              color={theme.bag.color}
              tintMaterials={theme.bag.tintMaterials}
              fitToSpan={fitToSpan}
            />
          ) : (
            <ProceduralBag />
          )}
        </group>
      </group>
    </group>
  );
}

export const PunchingBag = memo(PunchingBagImpl);
