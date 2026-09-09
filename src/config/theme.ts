/**
 * Single source of truth for branding, assets and feel.
 *
 * Nothing in `src/components` or `src/lib` may hardcode a colour, a model path
 * or a tuning number. Reskinning the experience should only ever mean editing
 * this file (or swapping the files it points at).
 *
 * Asset credits -- see CREDITS.md. Both models are CC BY 4.0:
 * "Punching bag from Poly by Google" by IronEqual, and "Boxing Glove" by
 * Incg5764 (http://creativecommons.org/licenses/by/4.0/).
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
    /** Empty array keeps a textured model's own colours. */
    tintMaterials?: readonly string[];
    /**
     * Largest dimension of the glove model, in world units.
     *
     * Sized together with the idle anchors: big enough that the fist reads at
     * the bottom of the frame, while the long cuff below it still falls off
     * the bottom edge rather than being clipped into a stray-looking lump.
     */
    modelSize: number;
    /**
     * Orientation offset for the model, so its knuckles lead the punch.
     * A glove travels along -Z into the bag, so that is the way it must face.
     */
    modelRotation: readonly [number, number, number];
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
  /** Signage on the gym's back wall. Set `logo` to null to remove it. */
  branding: {
    logo: string | null;
    /** Logo width in world units; its height follows the artwork's aspect. */
    logoWidth: number;
    /** Where the logo sits on the back wall, as [x, y] in world units. */
    logoPosition: readonly [number, number];
    /** The painted band the logo sits on. Keep it near wallColor: a dark
     *  slab reads as a hole in the wall rather than paint on it. */
    bandColor: string;
    bandHeight: number;
    /** Pinstripe along the band's lower edge. */
    accentColor: string;
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
    model: "/models/glove.glb",
    // The model is textured, so tinting would multiply colour over artwork.
    tintMaterials: [],
    modelSize: 0.52,
    modelRotation: [0, 0, 0],
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
  branding: {
    logo: "/branding/logo.svg",
    logoWidth: 1.15,
    // Offset left of centre: the bag hides the middle of the wall from the
    // camera, so anything centred would be permanently behind it.
    logoPosition: [-1.45, 2.16],
    bandColor: "#7F6F63",
    bandHeight: 0.74,
    accentColor: "#ED174C",
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
