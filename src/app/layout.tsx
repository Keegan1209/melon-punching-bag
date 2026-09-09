import type { CSSProperties, ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { STAGE_ASPECT } from "@/config/scene";
import "./globals.css";

export const metadata: Metadata = {
  title: "Punching Bag",
  description: "Tap to punch. A lightweight 3D heavy bag you can hit in the browser.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#171310",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Exposed as a custom property so the portrait frame's one source of truth
  // stays in config, not duplicated in the stylesheet.
  const stageVars = { "--stage-aspect": STAGE_ASPECT } as CSSProperties;

  return (
    <html lang="en">
      <body style={stageVars}>{children}</body>
    </html>
  );
}
