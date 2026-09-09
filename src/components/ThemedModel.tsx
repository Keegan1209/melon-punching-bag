"use client";

import { useLayoutEffect, useRef } from "react";
import { Color, Mesh, MeshStandardMaterial, type Group } from "three";
import { Clone, useGLTF } from "@react-three/drei";

interface ThemedModelProps {
  url: string;
  /** Tint applied to every material's base colour, preserving any textures. */
  color: string;
  castShadow?: boolean;
}

/**
 * Loads a GLB and tints it from the theme.
 *
 * `deep="materialsOnly"` gives each instance its own materials, so tinting the
 * left glove cannot bleed into the right. Textures and maps on the source
 * model survive -- only the base colour is overridden, which is what lets a
 * custom bag keep its artwork while still obeying the theme.
 *
 * Meshopt is enabled by default in useGLTF and its decoder ships with drei, so
 * meshopt-compressed GLBs work with no extra files to host. Draco would need a
 * separate decoder served from /public.
 */
export function ThemedModel({ url, color, castShadow = true }: ThemedModelProps) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<Group>(null);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const tint = new Color(color);

    group.traverse((child) => {
      if (!(child instanceof Mesh)) return;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (material instanceof MeshStandardMaterial) {
          material.color.copy(tint);
        }
      }
    });
  }, [color]);

  return (
    <group ref={groupRef}>
      <Clone object={scene} deep="materialsOnly" castShadow={castShadow} />
    </group>
  );
}

/** Warm the cache for a model that is about to be needed. */
export function preloadModel(url: string | null): void {
  if (url) useGLTF.preload(url);
}
