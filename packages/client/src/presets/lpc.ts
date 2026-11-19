import { Animation, Direction } from "@rpgjs/common";

export const LPCSpritesheetPreset = (options: {
    id: string;
    imageSource: string;
    width: number;
    height: number;
    ratio?: number;
  }) => {
    const ratio = options.ratio ?? 1;

    const frameY = (direction: Direction) => {
      return {
        [Direction.Down]: 2,
        [Direction.Left]: 1,
        [Direction.Right]: 3,
        [Direction.Up]: 0,
      }[direction];
    };
  
    const stand = (direction: Direction) => [
      { time: 0, frameX: 0, frameY: frameY(direction) },
    ];
    const anim = (
      direction: Direction,
      framesWidth: number,
      speed: number = 5
    ) => {
      const array: any = [];
      for (let i = 0; i < framesWidth; i++) {
        array.push({ time: i * speed, frameX: i, frameY: frameY(direction) });
      }
      return array;
    };
  
    return {
      id: options.id,
      image: options.imageSource,
      width: options.width,
      height: options.height,
      opacity: 1,
      rectWidth: 64 * ratio,
      rectHeight: 64 * ratio,
      framesWidth: 6,
      framesHeight: 4,
      spriteRealSize: {
        width: 48 * ratio,
        height: 52 * ratio,
      },
      textures: {
        [Animation.Stand]: {
          offset: {
            x: 0,
            y: 512 * ratio,
          },
          animations: ({ direction }) => [stand(direction)],
        },
        [Animation.Walk]: {
          offset: {
            x: 0,
            y: 512 * ratio,
          },
          framesWidth: 9,
          framesHeight: 4,
          animations: ({ direction }) => [anim(direction, 9)],
        },
        [Animation.Attack]: {
          offset: {
            x: 0,
            y: 768 * ratio,
          },
          framesWidth: 6,
          framesHeight: 4,
          animations: ({ direction }) => [anim(direction, 6, 3)],
        },
        [Animation.Skill]: {
          framesWidth: 7,
          framesHeight: 4,
          animations: ({ direction }) => [anim(direction, 7, 3)],
        },
        // Bow shot of the LPC layout: the arrow leaves around the ninth frame.
        shoot: {
          offset: {
            x: 0,
            y: 1024 * ratio,
          },
          framesWidth: 13,
          framesHeight: 4,
          animations: ({ direction }) => [anim(direction, 13, 3)],
        },
        attack2: {
          offset: {
            x: 0,
            y: 256 * ratio,
          },
          framesWidth: 7,
          framesHeight: 8,
          animations: ({ direction }) => [anim(direction, 7, 3)],
        },
        ...(options.height > 3000
          ? {
              attack3: {
                offset: {
                  x: 0,
                  y: 5568 - 288 * 4,
                },
                rectWidth: 288,
                rectHeight: 288,
                framesWidth: 6,
                framesHeight: 4,
                animations: ({ direction }) => [anim(direction, 6, 3)],
              },
            }
          : {}),
      },
    };
  };
  