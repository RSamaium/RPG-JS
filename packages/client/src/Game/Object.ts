import { Hooks, ModulesToken, RpgCommonPlayer } from "@rpgjs/common";
import { sync } from "@signe/sync";
import { trigger, signal } from "canvasengine";
import { Subscription } from "rxjs";
import { inject } from "../core/inject";
import { RpgClientEngine } from "../RpgClientEngine";

export abstract class RpgClientObject extends RpgCommonPlayer {
  abstract type: string;
  emitParticleTrigger = trigger()
  particleName = signal('')
  animationCurrentIndex = signal(0)
  animationIsPlaying = signal(false)
  _param = signal({})

  constructor() {
    super()
    this.hooks.callHooks("client-sprite-onInit", this).subscribe();
  }

  get hooks() {
    return inject<Hooks>(ModulesToken);
  }
  
  private animationSubscription?: Subscription

  flash(color: string, duration: number = 100) {
    return new Promise((resolve) => {
      const lastTint = this.tint()
      this.tint.set(color);
      setTimeout(() => {
        this.tint.set(lastTint)
        resolve(true)
      }, duration)
    })
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
    this.animationIsPlaying.set(false);
    this.animationCurrentIndex.set(0);
    if (this.animationSubscription) {
      this.animationSubscription.unsubscribe();
      this.animationSubscription = undefined;
    }
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
   * 
   * @example
   * ```ts
   * // Play attack animation 3 times
   * player.setAnimation('attack', 3);
   * 
   * // Play continuous spell animation
   * player.setAnimation('spell');
   * ```
   */
  setAnimation(animationName: string, nbTimes: number = Infinity) {
    if (this.animationIsPlaying()) return;
    this.animationIsPlaying.set(true);
    const previousAnimationName = this.animationName();
    this.animationCurrentIndex.set(0);
    
    // Clean up any existing subscription
    if (this.animationSubscription) {
      this.animationSubscription.unsubscribe();
    }
    
    this.animationSubscription = this.animationCurrentIndex.observable.subscribe(index => {
      if (index >= nbTimes) {
        this.animationCurrentIndex.set(0);
        this.animationName.set(previousAnimationName);
        this.animationIsPlaying.set(false);
        if (this.animationSubscription) {
          this.animationSubscription.unsubscribe();
          this.animationSubscription = undefined;
        }
      }
    })
    this.animationName.set(animationName);
  }

  showComponentAnimation(id: string, params: any) {
    const engine = inject(RpgClientEngine)
    engine.getComponentAnimation(id).displayEffect(params, this)
  }

  /**
   * Display a notification message
   * 
   * Shows a temporary notification with optional icon and sound.
   * The notification appears in the top-right corner of the screen
   * and automatically disappears after the specified time.
   * 
   * @param message - The message to display in the notification
   * @param options - Configuration options for the notification
   * @param options.time - Duration to show the notification in milliseconds (default: 3000)
   * @param options.icon - ID of the icon sprite to display (optional)
   * @param options.sound - ID of the sound to play when showing (optional)
   * 
   * @example
   * ```ts
   * // Simple notification
   * player.showNotification('You have unlocked the secret passage');
   * 
   * // Notification with custom duration
   * player.showNotification('Item received!', { time: 2000 });
   * 
   * // Notification with icon and sound
   * player.showNotification('Level up!', {
   *   time: 4000,
   *   icon: 'level-up-icon',
   *   sound: 'level-up-sound'
   * });
   * ```
   */
  async showNotification(
    message: string, 
    options: { time?: number; icon?: string; sound?: string } = {}
  ): Promise<any> {
    const engine = inject(RpgClientEngine);
    const gui = (engine as any).guiService;
    
    if (!gui) {
      console.warn('GUI service not available');
      return Promise.resolve();
    }

    const data = {
      message,
      time: options.time || 3000,
      icon: options.icon,
      sound: options.sound
    };

    return new Promise((resolve) => {
      gui.display('rpg-notification', data);
      
      // Auto-resolve after the notification time
      setTimeout(() => {
        resolve(null);
      }, data.time);
    });
  }
}   