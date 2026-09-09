import { useEffect, useState } from "react";
import { CanvasTexture, SRGBColorSpace, type Texture } from "three";

/**
 * Rasterise an SVG into a texture.
 *
 * Handing an .svg straight to TextureLoader uploads it at its intrinsic size --
 * 128px wide here, which is visibly soft on a wall. Drawing it to a canvas
 * first lets us pick the resolution.
 *
 * The SVG must be same-origin (serve it from /public). A cross-origin image
 * taints the canvas, and WebGL refuses to upload a tainted canvas.
 */
export function useSvgTexture(url: string | null, pixelWidth = 512): Texture | null {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    if (!url) {
      setTexture(null);
      return;
    }

    let cancelled = false;
    let created: CanvasTexture | null = null;

    const image = new Image();
    image.onload = () => {
      if (cancelled) return;

      const aspect = image.width && image.height ? image.width / image.height : 1;
      const canvas = document.createElement("canvas");
      canvas.width = pixelWidth;
      canvas.height = Math.max(1, Math.round(pixelWidth / aspect));

      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      created = new CanvasTexture(canvas);
      created.colorSpace = SRGBColorSpace;
      created.anisotropy = 4;
      setTexture(created);
    };
    image.src = url;

    return () => {
      cancelled = true;
      created?.dispose();
    };
  }, [url, pixelWidth]);

  return texture;
}
