const BORDER = 8;

/** The walls around a map. The server and the client both need them: the client predicts movement with them. */
export const walls = (width: number, height: number) => [
  { id: "wall-top", x: 0, y: 0, width, height: BORDER },
  { id: "wall-bottom", x: 0, y: height - BORDER, width, height: BORDER },
  { id: "wall-left", x: 0, y: 0, width: BORDER, height },
  { id: "wall-right", x: width - BORDER, y: 0, width: BORDER, height },
];

export const MAP_SIZES: Record<string, [number, number]> = { forest: [960, 640], meadow: [800, 560] };
