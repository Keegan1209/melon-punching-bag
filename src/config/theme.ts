/**
 * Single source of truth for branding, assets and feel.
 *
 * Nothing in `src/components` or `src/lib` may hardcode a colour, a model path
 * or a tuning number. Reskinning the experience should only ever mean editing
 * this file (or swapping the files it points at).
 *
 * Asset credit -- see CREDITS.md:
 * "Punching bag from Poly by Google" (https://skfb.ly/6YvUS) by IronEqual,
 * licensed under CC BY 4.0 (http://creativecommons.org/licenses/by/4.0/).
 */

export interface Theme {
  bag: {
    /** Optional GLB. When null, the built-in procedural bag is used. */
    model: string | null;
    color: string;
    /**
     * Material names the bag colour is applied to. Omit to tint everything.
     * A bag model usually carries its chain and bracket as separate materials,
     * which should keep their own colours.
     */
    tintMaterials?: readonly string[];
    /** Global multiplier on every punch impulse. Higher = swingier. */
    swingStrength: number;
  };
  gloves: {
    model: string | null;
    tintMaterials?: readonly string[];
    leftColor: string;
    rightColor: string;
    cuffColor: string;
  };
  environment: {
    background: string;
    floorColor: string;
    wallColor: string;
    ceilingColor: string;
    chainColor: string;
    /** Distance fog, in world units. Far must clear the room's back wall or
     *  the walls crush to the background colour at the screen edges. */
    fogNear: number;
    fogFar: number;
    /** Optional .hdr for image-based lighting. Null = analytic lights only. */
    hdri: string | null;
  };
  audio: {
    /** Sampled punches. Missing/failed files silently fall back to synthesis. */
    punch: string[];
    volume: number;
  };
  haptics: {
    enabled: boolean;
    /** Vibration pattern in ms. Android only — iOS has no Web Vibration API. */
    pattern: number[];
  };
}

export const theme: Theme = {
  bag: {
    model: "/models/bag.glb",
    color: "#288C28",
    // The shipped model's three materials: lambert2SG is the bag body,
    // lambert3SG its chain and straps, lambert4SG the ceiling bracket.
    tintMaterials: ["lambert2SG"],
    swingStrength: 1.0,
  },
  gloves: {
    model: null,
    leftColor: "#D82E2E",
    rightColor: "#D82E2E",
    cuffColor: "#8E1B1B",
  },
  environment: {
    background: "#171310",
    floorColor: "#7A5334",
    wallColor: "#8B7A6E",
    ceilingColor: "#7C6E62",
    chainColor: "#9AA0A6",
    fogNear: 11,
    fogFar: 34,
    hdri: null,
  },
  audio: {
    punch: ["/sounds/punch1.mp3", "/sounds/punch2.mp3", "/sounds/punch3.mp3"],
    volume: 0.8,
  },
  haptics: {
    enabled: true,
    pattern: [18],
  },
};
