"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Box3, Color, DoubleSide, Mesh, MeshStandardMaterial, Vector3, type Group } from "three";
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
  /** Scale so the model's largest dimension equals this, centred on origin. */
  fitToSize?: number;
  /** Orientation offset applied before fitting, to point an asset the right way. */
  rotation?: readonly [number, number, number];
  /** Render both faces. Required when an instance is mirrored by negative scale. */
  doubleSided?: boolean;
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
  fitToSize,
  rotation,
  doubleSided = false,
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
    scene.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());

    // Hung from a fixed point: pin the model's top and bottom to the span.
    if (fitToSpan) {
      if (size.y <= 0) return null;
      const scale = (fitToSpan.top - fitToSpan.bottom) / size.y;
      return {
        scale,
        position: [
          -center.x * scale,
          fitToSpan.top - box.max.y * scale,
          -center.z * scale,
        ] as [number, number, number],
      };
    }

    // Held and swung: size it and centre it, so it rotates about itself.
    if (fitToSize) {
      const largest = Math.max(size.x, size.y, size.z);
      if (largest <= 0) return null;
      const scale = fitToSize / largest;
      return {
        scale,
        position: [-center.x * scale, -center.y * scale, -center.z * scale] as [
          number,
          number,
          number,
        ],
      };
    }

    return null;
  }, [scene, fitToSpan, fitToSize]);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const tint = new Color(color);

    group.traverse((child) => {
      if (!(child instanceof Mesh)) return;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!(material instanceof MeshStandardMaterial)) continue;
        if (doubleSided) material.side = DoubleSide;
        if (tintMaterials && !tintMaterials.includes(material.name)) continue;
        material.color.copy(tint);
      }
    });
  }, [color, tintMaterials, doubleSided]);

  /*
   * Two groups, because order matters: the inner one centres and scales the
   * model in its own frame, the outer one then turns the whole thing about the
   * origin. Collapsing them would apply the centring offset in the rotated
   * frame and throw the model off its pivot.
   */
  return (
    <group ref={groupRef} rotation={rotation ? [...rotation] : [0, 0, 0]}>
      <group scale={fit?.scale ?? 1} position={fit?.position ?? [0, 0, 0]}>
        <Clone object={scene} deep="materialsOnly" castShadow={castShadow} />
      </group>
    </group>
  );
}

/** Warm the cache for a model that is about to be needed. */
export function preloadModel(url: string | null): void {
  if (url) useGLTF.preload(url);
}
