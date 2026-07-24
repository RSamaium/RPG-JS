import { generateUID, RpgCommonPlayer } from "@rpgjs/common";
import { signal } from "canvasengine";

type EffectTarget = RpgCommonPlayer | {
  x: number | (() => number);
  y: number | (() => number);
};

const readCoordinate = (value: number | (() => number)): number => {
  const resolved = typeof value === "function" ? value() : value;
  return Number.isFinite(resolved) ? resolved : 0;
};

export class AnimationManager {
  current = signal<any[]>([]);

  clear(): void {
    this.current.set([]);
  }

  displayEffect(params: any, player: EffectTarget): Promise<void> {
    const id = generateUID();
    const effectParams = params ?? {};
    return new Promise<void>((resolve) => {
      let finished = false;
      const finish = (data?: any) => {
        if (finished) return;
        finished = true;
        const index = this.current().findIndex((value) => value.id === id);
        if (index !== -1) {
          this.current().splice(index, 1);
        }
        effectParams.onFinish?.(data);
        resolve();
      };

      this.current().push({
        ...effectParams,
        id,
        // Component animations live in map/world space. Client objects expose
        // coordinates as CanvasEngine signals, while plain positions use
        // numbers, so snapshot both forms before passing them to a component.
        x: readCoordinate(player.x),
        y: readCoordinate(player.y),
        object: player,
        onFinish: finish,
      });
    });
  }
}
