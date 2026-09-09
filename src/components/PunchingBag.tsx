"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import type { Group } from "three";
import { Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { BAG, BAG_COM_OFFSET } from "@/config/scene";
import { theme } from "@/config/theme";
import { useGameEngine } from "./GameProvider";
import { ThemedModel } from "./ThemedModel";

/** Chain links bridging the ceiling mount and the top of the bag. */
const CHAIN_LINKS = 4;

/** Scratch vector reused on every tap so hit-testing allocates nothing. */
const localHit = new Vector3();

/** Built-in bag, used whenever theme.bag.model is null. */
function ProceduralBag() {
  return (
    <mesh castShadow>
      <capsuleGeometry args={[BAG.radius, BAG.bodyLength, 8, 24]} />
      <meshStandardMaterial color={theme.bag.color} roughness={0.62} metalness={0.06} />
    </mesh>
  );
}

function PunchingBagImpl() {
  const engine = useGameEngine();
  const pivotRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);

  useEffect(() => {
    engine.bindBagPivot(pivotRef.current);
    return () => engine.bindBagPivot(null);
  }, [engine]);

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

  const linkSpacing = BAG.chainLength / CHAIN_LINKS;

  return (
    <group position={[0, BAG.pivotY, 0]} ref={pivotRef}>
      {Array.from({ length: CHAIN_LINKS }, (_, index) => (
        <mesh
          key={index}
          position={[0, -linkSpacing * (index + 0.5), 0]}
          rotation={[Math.PI / 2, 0, index % 2 === 0 ? 0 : Math.PI / 2]}
        >
          <torusGeometry args={[linkSpacing * 0.5, 0.014, 6, 14]} />
          <meshStandardMaterial
            color={theme.environment.chainColor}
            metalness={0.9}
            roughness={0.35}
          />
        </mesh>
      ))}

      <group ref={bodyRef} position={[0, -BAG_COM_OFFSET, 0]} onPointerDown={handlePointerDown}>
        {theme.bag.model ? (
          <ThemedModel url={theme.bag.model} color={theme.bag.color} />
        ) : (
          <ProceduralBag />
        )}
      </group>
    </group>
  );
}

export const PunchingBag = memo(PunchingBagImpl);
