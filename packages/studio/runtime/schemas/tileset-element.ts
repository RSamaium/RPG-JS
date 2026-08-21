export interface StudioTilesetElementRenderingOptions {
  /**
   * Split dark, translucent pixels from the lower part of the element image
   * into the ground-shadow layer below characters.
   */
  extractGroundShadow?: boolean;
}

/** Rendering fields exposed by the Studio tileset-element editor. */
export const studioTilesetElementRenderingSchema = {
  type: "object",
  properties: {
    extractGroundShadow: {
      type: "boolean",
      title: "Keep embedded ground shadow below characters",
      description:
        "Extract dark semi-transparent pixels from the lower part of this element and render them below characters.",
      default: false,
    },
  },
  additionalProperties: true,
} as const;
