"use client";

import dynamic from "next/dynamic";

/**
 * Client-side boundary for the canvas.
 *
 * `ssr: false` is only legal from a Client Component in the App Router, and it
 * is required here: the react-three-fiber reconciler declares
 * supportsHydration: false, so the scene must never be server-rendered.
 */
const Experience = dynamic(() => import("./Experience"), { ssr: false });

export function ExperienceLoader() {
  return <Experience />;
}
