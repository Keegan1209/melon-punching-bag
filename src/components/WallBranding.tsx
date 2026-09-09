"use client";

import { memo } from "react";
import { ROOM } from "@/config/scene";
import { theme } from "@/config/theme";
import { useSvgTexture } from "@/lib/useSvgTexture";

/** Distance the signage stands proud of the wall, to avoid z-fighting. */
const RELIEF = 0.02;

/**
 * Painted signage on the gym's back wall.
 *
 * A painted band with the brand tag mounted on it, the way a gym paints its
 * livery across a wall. The band is tinted close to the wall so it reads as
 * paint rather than a hole cut in it; the logo and a thin accent line are the
 * only things meant to carry contrast.
 *
 * The logo is deliberately off-centre: from the camera the bag occupies the
 * middle of the wall, so a centred mark would never be visible.
 */
function WallBrandingImpl() {
  const { logo, logoWidth, logoPosition, bandColor, bandHeight, accentColor } = theme.branding;
  const texture = useSvgTexture(logo, 512);

  const wallZ = -ROOM.depth / 2;
  const [logoX, logoY] = logoPosition;

  // Height follows the artwork so the logo is never stretched.
  const aspect = texture?.image instanceof HTMLCanvasElement
    ? texture.image.width / texture.image.height
    : 128 / 59;
  const logoHeight = logoWidth / aspect;

  return (
    <group position={[0, 0, wallZ]}>
      <mesh position={[0, logoY, RELIEF]}>
        <planeGeometry args={[ROOM.width, bandHeight]} />
        <meshStandardMaterial color={bandColor} roughness={0.9} />
      </mesh>

      <mesh position={[0, logoY - bandHeight / 2 + 0.03, RELIEF * 1.5]}>
        <planeGeometry args={[ROOM.width, 0.035]} />
        <meshStandardMaterial
          color={accentColor}
          roughness={0.55}
          emissive={accentColor}
          emissiveIntensity={0.12}
        />
      </mesh>

      {texture && (
        <mesh position={[logoX, logoY, RELIEF * 2]}>
          <planeGeometry args={[logoWidth, logoHeight]} />
          {/* Slight emissive so the mark stays legible across the wall's
              falloff without looking like a flat sticker. */}
          <meshStandardMaterial
            map={texture}
            transparent
            roughness={0.8}
            emissiveMap={texture}
            emissive="#ffffff"
            emissiveIntensity={0.3}
          />
        </mesh>
      )}
    </group>
  );
}

export const WallBranding = memo(WallBrandingImpl);
