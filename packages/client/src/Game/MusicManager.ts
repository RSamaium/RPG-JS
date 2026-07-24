import { signal } from "canvasengine";

export interface RpgMusicTransitionOptions {
  volume?: number;
  mapVolume?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
  exitDelayMs?: number;
}

type MusicHost = {
  getSound(id: string): any | Promise<any>;
  createSound(src: string, options: { loop: boolean; volume: number }): any;
};

const clampVolume = (value: number) => Math.max(0, Math.min(1, value));
const isSource = (value: string) =>
  /^(https?:\/\/|\/|data:|blob:)/.test(value) ||
  /\.(aac|flac|m4a|mp3|oga|ogg|opus|wav|webm)(\?.*)?$/i.test(value);

/**
 * Controls temporary music layers without stopping map ambience or sound
 * effects. The map renderer consumes `mapVolume` reactively.
 */
export class RpgMusicManager {
  readonly mapVolume = signal(1);
  /** Optional owner key used by systems when several sources have equal priority. */
  contextId?: string;
  private currentId?: string;
  private currentSound?: any;
  private readonly sounds = new Map<string, any>();
  private revision = 0;
  private timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(private readonly host: MusicHost) {}

  get overrideId(): string | undefined {
    return this.currentId;
  }

  async enter(
    id: string | undefined,
    options: RpgMusicTransitionOptions = {},
  ): Promise<void> {
    const revision = ++this.revision;
    this.clearTimers();
    const fadeInMs = Math.max(0, options.fadeInMs ?? 600);
    const fadeOutMs = Math.max(0, options.fadeOutMs ?? fadeInMs);
    const volume = clampVolume(options.volume ?? 0.8);
    const mapVolume = clampVolume(options.mapVolume ?? 0);

    this.tweenMapVolume(mapVolume, fadeInMs, revision);
    if (!id) {
      await this.fadeOutCurrent(fadeOutMs, revision);
      return;
    }
    if (id === this.currentId && this.currentSound) {
      this.fade(this.currentSound, this.readVolume(this.currentSound), volume, fadeInMs);
      return;
    }

    const previous = this.currentSound;
    const sound = await this.resolve(id);
    if (revision !== this.revision || !sound) return;

    this.currentId = id;
    this.currentSound = sound;
    this.setLoop(sound, true);
    this.setVolume(sound, 0);
    sound.play?.();
    this.fade(sound, 0, volume, fadeInMs);
    if (previous && previous !== sound) {
      this.fade(previous, this.readVolume(previous), 0, fadeOutMs);
      this.schedule(() => previous.stop?.(), fadeOutMs, revision);
    }
  }

  leave(options: RpgMusicTransitionOptions = {}): void {
    const revision = ++this.revision;
    this.clearTimers();
    const delay = Math.max(0, options.exitDelayMs ?? 1500);
    this.schedule(() => {
      const fadeOutMs = Math.max(0, options.fadeOutMs ?? 900);
      this.tweenMapVolume(1, fadeOutMs, revision);
      void this.fadeOutCurrent(fadeOutMs, revision);
    }, delay, revision);
  }

  reset(): void {
    this.revision += 1;
    this.clearTimers();
    this.currentSound?.stop?.();
    this.currentSound = undefined;
    this.currentId = undefined;
    this.contextId = undefined;
    this.mapVolume.set(1);
  }

  private async resolve(id: string): Promise<any> {
    if (this.sounds.has(id)) return this.sounds.get(id);
    const value = isSource(id) ? { src: id } : await this.host.getSound(id);
    if (!value) return undefined;
    if (typeof value.play === "function") {
      this.sounds.set(id, value);
      return value;
    }
    const src = typeof value === "string" ? value : value.src ?? value.file;
    const sound = typeof src === "string"
      ? this.host.createSound(src, { loop: true, volume: 0 })
      : undefined;
    if (sound) this.sounds.set(id, sound);
    return sound;
  }

  private async fadeOutCurrent(duration: number, revision: number) {
    const sound = this.currentSound;
    if (!sound) return;
    this.fade(sound, this.readVolume(sound), 0, duration);
    this.schedule(() => {
      sound.stop?.();
      if (revision === this.revision && this.currentSound === sound) {
        this.currentSound = undefined;
        this.currentId = undefined;
      }
    }, duration, revision);
  }

  private fade(sound: any, from: number, to: number, duration: number) {
    if (duration > 0 && typeof sound.fade === "function") {
      sound.fade(from, to, duration);
    } else {
      this.setVolume(sound, to);
    }
  }

  private readVolume(sound: any): number {
    const value = sound?.volume?.();
    return typeof value === "number" ? value : 0;
  }

  private setVolume(sound: any, volume: number) {
    sound?.volume?.(clampVolume(volume));
  }

  private setLoop(sound: any, loop: boolean) {
    sound?.loop?.(loop);
  }

  private tweenMapVolume(target: number, duration: number, revision: number) {
    const start = this.mapVolume();
    if (duration === 0) {
      this.mapVolume.set(target);
      return;
    }
    const startedAt = Date.now();
    const step = () => {
      if (revision !== this.revision) return;
      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      this.mapVolume.set(start + (target - start) * progress);
      if (progress < 1) this.schedule(step, 16, revision);
    };
    step();
  }

  private schedule(callback: () => void, delay: number, revision: number) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (revision === this.revision) callback();
    }, delay);
    this.timers.add(timer);
  }

  private clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }
}
