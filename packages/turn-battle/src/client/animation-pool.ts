/** An animation of a skill (a sprite sheet of the project) playing where a hit lands. */
export interface SkillAnimation {
  key: number;
  /** The id of the sprite sheet in the engine (the media of the animation). */
  sheet: string;
  x: number;
  y: number;
  scale: number;
}

/** Longest an animation stays: a sheet that never says it ended must not hide the battle. */
const MAX_MS = 4000;

let keys = 0;

/**
 * The animations on the stage, as a list the scene shows. An animation goes away when its sprite says it ended (`end`), or
 * after a few seconds when it does not.
 */
export class AnimationPool {
  private items: SkillAnimation[] = [];
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor(private readonly show: (items: SkillAnimation[]) => void) {}

  play(sheet: string, x: number, y: number, scale: number): number {
    const key = ++keys;
    this.items = [...this.items, { key, sheet, x, y, scale }];
    this.timers.set(key, setTimeout(() => this.end(key), MAX_MS));
    this.show(this.items);
    return key;
  }

  end(key: number) {
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
    if (!this.items.some((item) => item.key === key)) return;
    this.items = this.items.filter((item) => item.key !== key);
    this.show(this.items);
  }

  clear() {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.items = [];
    this.show(this.items);
  }
}
