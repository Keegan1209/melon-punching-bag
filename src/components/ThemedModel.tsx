"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Box3, Color, Mesh, MeshStandardMaterial, Vector3, type Group } from "three";
import { Clone, useGLTF } from "@react-three/drei";

/** Scale and offset that hang a model between two heights in its parent. */
interface FitSpan {
  /** Parent-local Y the top of the model is pinned to. */
  top: number;
  /** Parent-local Y the bottom of the model is pinned to. */
  bottom: number;
}

interface ThemedModelProps {
  url: string;
  /** Tint applied to a material's base colour, preserving any textures. */
  color: string;
  /**
   * Material names to tint. Omit to tint every material.
   *
   * Real models arrive as several materials -- a bag, its chain, its bracket --
   * and tinting all of them turns the hardware the same colour as the bag.
   */
  tintMaterials?: readonly string[];
  /** Scale and position the model to span these heights. */
  fitToSpan?: FitSpan;
  castShadow?: boolean;
}

/**
 * Loads a GLB, fits it to the scene, and tints it from the theme.
 *
 * `deep="materialsOnly"` gives each instance its own materials, so tinting the
 * left glove cannot bleed into the right. Textures and maps on the source
 * model survive -- only the base colour is overridden, which lets a custom bag
 * keep its artwork while still obeying the theme.
 *
 * Meshopt is enabled by default in useGLTF and its decoder ships with drei, so
 * meshopt-compressed GLBs work with no extra files to host. Draco would need a
 * separate decoder served from /public.
 */
export function ThemedModel({
  url,
  color,
  tintMaterials,
  fitToSpan,
  castShadow = true,
}: ThemedModelProps) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<Group>(null);

  /**
   * Fit from the source model's bounds rather than hand-tuned numbers, so any
   * replacement bag hangs from the same pivot and clears the same floor
   * without someone having to measure it first.
   */
  const fit = useMemo(() => {
    if (!fitToSpan) return null;

    scene.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    if (size.y <= 0) return null;

    const scale = (fitToSpan.top - fitToSpan.bottom) / size.y;
    const center = box.getCenter(new Vector3());

    return {
      scale,
      position: [
        -center.x * scale,
        fitToSpan.top - box.max.y * scale,
        -center.z * scale,
      ] as [number, number, number],
    };
  }, [scene, fitToSpan]);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const tint = new Color(color);

    group.traverse((child) => {
      if (!(child instanceof Mesh)) return;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!(material instanceof MeshStandardMaterial)) continue;
        if (tintMaterials && !tintMaterials.includes(material.name)) continue;
        material.color.copy(tint);
      }
    });
  }, [color, tintMaterials]);

  return (
    <group ref={groupRef} scale={fit?.scale ?? 1} position={fit?.position ?? [0, 0, 0]}>
      <Clone object={scene} deep="materialsOnly" castShadow={castShadow} />
    </group>
  );
}

/** Warm the cache for a model that is about to be needed. */
export function preloadModel(url: string | null): void {
  if (url) useGLTF.preload(url);
}
