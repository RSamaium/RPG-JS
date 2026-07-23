import { Hooks, ModulesToken, RpgCommonPlayer } from "@rpgjs/common";
import { trigger, signal, type Trigger } from "canvasengine";
import { combineLatest, from, map, of, startWith, Subscription, switchMap, type Observable } from "rxjs";
import { inject } from "../core/inject";
import { RpgClientEngine } from "../RpgClientEngine";
type Frame = { x: number; y: number; ts: number };

type AnimationRestoreOptions = {
  restoreAnimationName?: string;
  restoreGraphics?: any[];
  timeoutMs?: number;
};

type FlashType = 'alpha' | 'tint' | 'both';

type FlashOptions = {
  type?: FlashType;
  duration?: number;
  cycles?: number;
  alpha?: number;
  tint?: number | string;
};

type FlashTriggerOptions = Omit<FlashOptions, "tint"> & {
  tint: number;
};

type ConfigurableTrigger<T> = Omit<Trigger<T>, "start"> & {
  start(config?: T): Promise<void>;
};

const toFiniteScale = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const normalizeGraphicScale = (value: unknown, fallback: [number, number] = [1, 1]): [number, number] => {
  if (typeof value === "number" || typeof value === "string") {
    const scale = toFiniteScale(value, fallback[0]);
    return [scale, scale];
  }
  if (Array.isArray(value)) {
    const x = toFiniteScale(value[0], fallback[0]);
    const y = toFiniteScale(value[1] ?? value[0], x);
    return [x, y];
  }
  if (value && typeof value === "object") {
    const scale = value as { x?: unknown; y?: unknown };
    const x = toFiniteScale(scale.x, fallback[0]);
    const y = toFiniteScale(scale.y ?? scale.x, x);
    return [x, y];
  }
  return fallback;
};

export const multiplyGraphicDisplayScale = (
  baseScale: unknown,
  instanceScale: unknown,
): [number, number] => {
  const base = normalizeGraphicScale(baseScale);
  const instance = normalizeGraphicScale(instanceScale);
  return [base[0] * instance[0], base[1] * instance[1]];
};

export const withGraphicDisplayScale = (spritesheet: any, scale: unknown): any => {
  if (!spritesheet || typeof spritesheet !== "object") return spritesheet;
  if (scale === undefined || scale === null) return spritesheet;
  return {
    ...spritesheet,
    displayScale: multiplyGraphicDisplayScale(spritesheet.displayScale, scale),
  };
};

export const appendFramePayload = (current: unknown, items: unknown): Frame[] => {
  const frameItems = Array.isArray(items) ? items : items ? [items] : [];
  const nextFrames = frameItems.flatMap((item): Frame[] =>
    Array.isArray(item) ? item : [item as Frame]
  );
  const currentFrames = Array.isArray(current) ? current as Frame[] : [];
  return currentFrames.concat(nextFrames);
};

export const getFrameTimestamp = (frame: Frame): number => {
  const timestamp = Number(frame.ts);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const mergeFreshFramePayload = (
  current: unknown,
  items: unknown,
  lastAppliedFrameTs = 0,
): Frame[] => {
  return appendFramePayload(current, items)
    .filter((frame) => {
      const timestamp = getFrameTimestamp(frame);
      return timestamp === 0 || timestamp > lastAppliedFrameTs;
    })
    .sort((a, b) => getFrameTimestamp(a) - getFrameTimestamp(b));
};

export abstract class RpgClientObject extends RpgCommonPlayer {
  abstract _type: string;
  emitParticleTrigger = trigger();
  particleName = signal("");
  animationCurrentIndex = signal(0);
  animationIsPlaying = signal(false);
  _param = signal({});
  frames: Frame[] = [];
  graphicsSignals = signal<any[]>([]);
  flashTrigger: ConfigurableTrigger<FlashTriggerOptions> = trigger<FlashTriggerOptions>();
  private lastAppliedFrameTs = 0;
  private animationRestoreState?: {
    animationName: string;
    graphics: any[];
  };

  constructor() {
    super();
    const engine = this.engine;
    this.hooks.callHooks("client-sprite-onInit", this).subscribe();

    (this._frames as any).observable.subscribe(({ items }) => {
      if (!this.id) return;
      //if (this.id == this.engine.playerIdSignal()!) return;
      this.frames = mergeFreshFramePayload(
        this.frames,
        items,
        this.lastAppliedFrameTs,
      );
    });

    const graphics$: Observable<unknown> = (this.graphics as any).observable.pipe(map(({ items }) => items));
    const graphicScale$: Observable<unknown> = (this._graphicScale as any).observable.pipe(
      startWith({ value: this._graphicScale() }),
      map((payload: any) => payload?.value ?? payload),
    );

    combineLatest([graphics$, graphicScale$])
    .pipe(
      switchMap(([graphics, scale]) => {
        const graphicRefs = Array.isArray(graphics) ? graphics : [];
        if (graphicRefs.length === 0) return of([]);
        return from(Promise.all(graphicRefs.map(async (graphic) => {
          const spritesheet = await engine.getSpriteSheet(graphic);
          return withGraphicDisplayScale(spritesheet, scale);
        })));
      })
    )
    .subscribe((sheets) => {  
      this.graphicsSignals.set(sheets);
    });

    engine.tick
      .pipe
      //throttleTime(10)
      ()
      .subscribe(() => {
        const frame = this.frames.shift();
        if (frame) {
          if (typeof frame.x !== "number" || typeof frame.y !== "number") return;
          const frameTs = this.getFrameTimestamp(frame);
          if (frameTs > 0 && frameTs <= this.lastAppliedFrameTs) return;
          engine.scene.setBodyPosition(
            this.id,
            frame.x,
            frame.y,
            "top-left"
          );
          if (frameTs > this.lastAppliedFrameTs) {
            this.lastAppliedFrameTs = frameTs;
          }
        }
      });
  }

  private getFrameTimestamp(frame: Frame): number {
    return getFrameTimestamp(frame);
  }

  /**
   * Access the shared client hook registry.
   *
   * @returns The hook service used to register and trigger client-side hooks.
   */
  get hooks() {
    return inject<Hooks>(ModulesToken);
  }

  /**
   * Access the current client engine instance.
   *
   * @returns The active {@link RpgClientEngine} instance.
   */
  get engine() {
    return inject(RpgClientEngine);
  }

  setHitbox(width: number, height: number): void {
    if (typeof width !== "number" || width <= 0) {
      throw new Error("setHitbox: width must be a positive number");
    }
    if (typeof height !== "number" || height <= 0) {
      throw new Error("setHitbox: height must be a positive number");
    }

    this.hitbox.set({
      w: width,
      h: height,
    });

    const sceneMap = (this.engine as any)?.sceneMap;
    if (sceneMap && this.id) {
      sceneMap.updateHitbox?.(this.id, this.x(), this.y(), width, height);
    }
  }

  private animationSubscription?: Subscription;
  private animationResetTimeout?: ReturnType<typeof setTimeout>;
  private animationWaitResolve?: () => void;

  private clearAnimationControls() {
    if (this.animationSubscription) {
      this.animationSubscription.unsubscribe();
      this.animationSubscription = undefined;
    }
    if (this.animationResetTimeout) {
      clearTimeout(this.animationResetTimeout);
      this.animationResetTimeout = undefined;
    }
  }

  private resolveAnimationWait() {
    const resolve = this.animationWaitResolve;
    this.animationWaitResolve = undefined;
    resolve?.();
  }

  private finishTemporaryAnimation() {
    const restoreState = this.animationRestoreState;
    this.clearAnimationControls();
    this.animationCurrentIndex.set(0);
    this.animationRestoreState = undefined;
    this.animationIsPlaying.set(false);
    if (restoreState) {
      this.animationName.set(restoreState.animationName);
      this.graphics.set([...restoreState.graphics]);
    }
    this.resolveAnimationWait();
  }

  /**
   * Trigger a flash animation on this sprite
   * 
   * This method triggers a flash effect using CanvasEngine's flash directive.
   * The flash can be configured with various options including type (alpha, tint, or both),
   * duration, cycles, and color.
   * 
   * ## Design
   * 
   * The flash uses a trigger system that is connected to the flash directive in the
   * character component. This allows for flexible configuration and can be triggered
   * from both server events and client-side code.
   * 
   * @param options - Flash configuration options
   * @param options.type - Type of flash effect: 'alpha' (opacity), 'tint' (color), or 'both' (default: 'alpha')
   * @param options.duration - Duration of the flash animation in milliseconds (default: 300)
   * @param options.cycles - Number of flash cycles (flash on/off) (default: 1)
   * @param options.alpha - Alpha value when flashing, from 0 to 1 (default: 0.3)
   * @param options.tint - Tint color when flashing as hex value or color name (default: 0xffffff - white)
   * 
   * @example
   * ```ts
   * // Simple flash with default settings (alpha flash)
   * player.flash();
   * 
   * // Flash with red tint
   * player.flash({ type: 'tint', tint: 0xff0000 });
   * 
   * // Flash with both alpha and tint
   * player.flash({ 
   *   type: 'both', 
   *   alpha: 0.5, 
   *   tint: 0xff0000,
   *   duration: 200,
   *   cycles: 2
   * });
   * 
   * // Quick damage flash
   * player.flash({ 
   *   type: 'tint', 
   *   tint: 0xff0000, 
   *   duration: 150,
   *   cycles: 1
   * });
   * ```
   */
  flash(options?: FlashOptions): void {
    const flashOptions = {
      type: options?.type || 'alpha',
      duration: options?.duration ?? 300,
      cycles: options?.cycles ?? 1,
      alpha: options?.alpha ?? 0.3,
      tint: options?.tint ?? 0xffffff,
    };
    
    // Convert color name to hex if needed
    let tintValue = flashOptions.tint;
    if (typeof tintValue === 'string') {
      // Common color name to hex mapping
      const colorMap: Record<string, number> = {
        'white': 0xffffff,
        'red': 0xff0000,
        'green': 0x00ff00,
        'blue': 0x0000ff,
        'yellow': 0xffff00,
        'cyan': 0x00ffff,
        'magenta': 0xff00ff,
        'black': 0x000000,
      };
      tintValue = colorMap[tintValue.toLowerCase()] ?? 0xffffff;
    }
    
    this.flashTrigger.start({
      ...flashOptions,
      tint: tintValue,
    });
  }

  /**
   * Reset animation state when animation changes externally
   *
   * This method should be called when the animation changes due to movement
   * or other external factors to ensure the animation system doesn't get stuck
   *
   * @example
   * ```ts
   * // Reset when player starts moving
   * player.resetAnimationState();
   * ```
   */
  resetAnimationState() {
    if (this.animationRestoreState) {
      this.finishTemporaryAnimation();
      return;
    }
    this.animationIsPlaying.set(false);
    this.animationCurrentIndex.set(0);
    this.clearAnimationControls();
    this.resolveAnimationWait();
  }

  /**
   * Set a custom animation for a specific number of times
   *
   * Plays a custom animation for the specified number of repetitions.
   * The animation system prevents overlapping animations and automatically
   * returns to the previous animation when complete.
   *
   * @param animationName - Name of the animation to play
   * @param nbTimes - Number of times to repeat the animation (default: Infinity for continuous)
   * @param options - Restore and timeout options
   * @returns A promise resolved when a finite animation finishes, is interrupted, or times out
   *
   * @example
   * ```ts
   * // Play attack animation 3 times
   * await player.setAnimation('attack', 3);
   *
   * // Play continuous spell animation
   * player.setAnimation('spell');
   * ```
   */
  setAnimation(animationName: string, nbTimes?: number, options?: AnimationRestoreOptions): Promise<void>;
  /**
   * Set a custom animation with temporary graphic change
   *
   * Plays a custom animation for the specified number of repetitions and temporarily
   * changes the player's graphic (sprite sheet) during the animation. The graphic
   * is automatically reset when the animation finishes.
   *
   * @param animationName - Name of the animation to play
   * @param graphic - The graphic(s) to temporarily use during the animation
   * @param nbTimes - Number of times to repeat the animation (default: Infinity for continuous)
   * @param options - Restore and timeout options
   * @returns A promise resolved when a finite animation finishes, is interrupted, or times out
   *
   * @example
   * ```ts
   * // Play attack animation with temporary graphic change
   * await player.setAnimation('attack', 'hero_attack', 3);
   * ```
   */
  setAnimation(animationName: string, graphic?: string | string[], nbTimes?: number, options?: AnimationRestoreOptions): Promise<void>;
  setAnimation(
    animationName: string,
    graphicOrNbTimes?: string | string[] | number,
    nbTimesOrOptions?: number | AnimationRestoreOptions,
    options?: AnimationRestoreOptions
  ): Promise<void> {
    let graphic: string | string[] | undefined;
    let finalNbTimes: number = Infinity;
    let restoreOptions: AnimationRestoreOptions | undefined = options;

    // Handle overloads
    if (typeof graphicOrNbTimes === 'number') {
      // setAnimation(animationName, nbTimes)
      finalNbTimes = graphicOrNbTimes;
      restoreOptions = typeof nbTimesOrOptions === 'object' ? nbTimesOrOptions : options;
    } else if (graphicOrNbTimes !== undefined) {
      // setAnimation(animationName, graphic, nbTimes)
      graphic = graphicOrNbTimes;
      if (typeof nbTimesOrOptions === 'number') {
        finalNbTimes = nbTimesOrOptions;
      } else {
        finalNbTimes = Infinity;
        restoreOptions = nbTimesOrOptions ?? options;
      }
    } else {
      // setAnimation(animationName) - nbTimes remains Infinity
      finalNbTimes = Infinity;
    }

    if (this.animationIsPlaying()) {
      this.finishTemporaryAnimation();
    }

    const waitPromise =
      finalNbTimes === Infinity
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            this.animationWaitResolve = resolve;
          });

    this.animationIsPlaying.set(true);
    const previousAnimationName =
      restoreOptions?.restoreAnimationName ?? this.animationName();
    const previousGraphics = restoreOptions?.restoreGraphics
      ? [...restoreOptions.restoreGraphics]
      : [...this.graphics()];
    this.animationRestoreState = {
      animationName: previousAnimationName,
      graphics: previousGraphics,
    };
    this.animationCurrentIndex.set(0);

    // Temporarily change graphic if provided
    if (graphic !== undefined) {
      if (Array.isArray(graphic)) {
        this.graphics.set(graphic);
      } else {
        this.graphics.set([graphic]);
      }
    }

    this.clearAnimationControls();

    this.animationSubscription =
      this.animationCurrentIndex.observable.subscribe((index) => {
        if (index >= finalNbTimes) {
          this.finishTemporaryAnimation();
        }
      });

    if (finalNbTimes !== Infinity) {
      this.animationResetTimeout = setTimeout(() => {
        if (this.animationIsPlaying()) {
          this.finishTemporaryAnimation();
        }
      }, restoreOptions?.timeoutMs ?? Math.max(1000, finalNbTimes * 1000));
    }

    this.animationName.set(animationName);

    return waitPromise;
  }

  /**
   * Display a registered component animation effect on this object.
   *
   * @param id - Identifier of the component animation to play.
   * @param params - Parameters forwarded to the animation effect.
   * @returns A promise resolved when the animation component calls `onFinish`.
   */
  showComponentAnimation(id: string, params: any): Promise<void> {
    const engine = inject(RpgClientEngine);
    return engine.getComponentAnimation(id).displayEffect(params, this);
  }

  /**
   * Display a registered spritesheet animation effect on this object.
   *
   * @param graphic - Identifier of the spritesheet to use.
   * @param animationName - Name of the animation inside the spritesheet.
   * @returns A promise resolved when the animation component calls `onFinish`.
   */
  showAnimation(graphic: string, animationName: string = 'default'): Promise<void> {
    return this.showComponentAnimation('animation', {
      graphic,
      animationName,
    });
  }
  
  /**
   * Check whether this client object represents an event.
   *
   * @returns `true` if the object type is `event`, otherwise `false`.
   */
  isEvent(): boolean {
    return this._type === 'event';
  }

  /**
   * Check whether this client object represents a player.
   *
   * @returns `true` if the object type is `player`, otherwise `false`.
   */
  isPlayer(): boolean {
    return this._type === 'player';
  }
}
