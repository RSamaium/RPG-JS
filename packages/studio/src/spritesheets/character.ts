import { Animation, Direction } from "./types";

export const CharacterSpritesheet = (options: {
  id: string;
  imageSource: string;
  framesWidth: number;
  framesHeight: number;
  attackDurationMs?: number;
  scale?: [number, number];
  anchor?: [number, number];
}) => {
  const timelineTicksPerSecond = 60;

  const frameY = (direction: Direction) => {
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
        animations: ({ direction }) => [anim(direction, options.framesWidth)],
      },
      [Animation.Attack]: {
        animations: ({ direction }) => [
          anim(direction, options.framesWidth, attackFrameSpeed),
        ],
      }
    },
  };
};
