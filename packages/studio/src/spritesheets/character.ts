import { Animation, Direction } from "./types";

export const CharacterSpritesheet = (options: {
  id: string;
  imageSource: string;
  framesWidth: number;
  framesHeight: number;
  frameDurationMs?: number;
  lanes?: Array<{ id?: string; direction?: string }>;
  attackDurationMs?: number;
  scale?: [number, number];
  anchor?: [number, number];
}) => {
  const timelineTicksPerSecond = 60;

  const frameY = (direction: Direction) => {
    const lane = options.lanes?.findIndex((candidate) => {
      const laneDirection = candidate.direction
        ?? [Direction.Down, Direction.Left, Direction.Right, Direction.Up]
          .find((value) => candidate.id?.endsWith(`-${value}`));
      return laneDirection === direction;
    });
    if (lane !== undefined && lane >= 0) return lane;

    return {
      [Direction.Right]: 3,
      [Direction.Left]: 1,
      [Direction.Up]: 0,
      [Direction.Down]: 2
    }[direction];
  };

  const stand = (direction: Direction) => {
    return [
      { time: 0, frameX: 0, frameY: frameY(direction) },
    ];
  }

  const anim = (
    direction: Direction,
    framesWidth: number,
    speed: number = 10
  ) => {
    const array: any = [];
    let i = 0;
    for (i = 0; i < framesWidth; i++) {
      array.push({ time: i * speed, frameX: i, frameY: frameY(direction) });
    }
    array.push({ time: i * speed + 1 });
    return array;
  };

  const attackDurationMs = Math.max(1, options.attackDurationMs ?? 350);
  const walkFrameDurationTicks = Math.max(
    1,
    ((options.frameDurationMs ?? (10 / timelineTicksPerSecond) * 1_000) / 1_000)
      * timelineTicksPerSecond,
  );
  const attackDurationTicks =
    (attackDurationMs / 1_000) * timelineTicksPerSecond;
  const attackFrameSpeed = Math.max(
    1,
    (attackDurationTicks - 1) / options.framesWidth,
  );
  const scale = options.scale ?? [1, 1];

  return {
    id: options.id,
    image: options.imageSource,
    opacity: 1,
    scale: scale,
    ...(options.anchor ? { anchor: options.anchor } : {}),
    framesWidth: options.framesWidth,
    framesHeight: options.framesHeight,
    textures: {
      [Animation.Stand]: {
        animations: ({ direction }) => [stand(direction)],
      },
      [Animation.Walk]: {
        animations: ({ direction }) => [
          anim(direction, options.framesWidth, walkFrameDurationTicks),
        ],
      },
      [Animation.Attack]: {
        animations: ({ direction }) => [
          anim(direction, options.framesWidth, attackFrameSpeed),
        ],
      }
    },
  };
};
