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
  private pendingId?: string;
  private mapId?: string;
  private mapSound?: any;
  private readonly sounds = new Map<string, any>();
  private revision = 0;
  private outputGain = 1;
  private currentBaseVolume = 0.8;
  private timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(private readonly host: MusicHost) {}

  get overrideId(): string | undefined {
    return this.currentId;
  }

  /** Play the map BGM through the same Howler owner as temporary music. */
  setMap(src: string | null | undefined): void {
    const normalized = src?.trim();
    if (!normalized) {
      this.mapSound?.stop?.();
      this.mapSound = undefined;
      this.mapId = undefined;
      return;
    }
    if (normalized === this.mapId && this.mapSound) return;

    const previous = this.mapSound;
    const sound = this.host.createSound(normalized, {
      loop: true,
      volume: this.mapVolume() * this.outputGain,
    });
    previous?.stop?.();
    this.mapId = normalized;
    this.mapSound = sound;
    this.setLoop(sound, true);
    this.setVolume(sound, this.mapVolume() * this.outputGain);
    sound?.play?.();
  }

  async enter(
    id: string | undefined,
    options: RpgMusicTransitionOptions = {},
  ): Promise<void> {
    if (id && id === this.pendingId) return;
    const revision = ++this.revision;
    this.clearTimers();
    this.pendingId = undefined;
    const fadeInMs = Math.max(0, options.fadeInMs ?? 600);
    const fadeOutMs = Math.max(0, options.fadeOutMs ?? fadeInMs);
    const volume = clampVolume(options.volume ?? 0.8);
    this.currentBaseVolume = volume;
    const outputVolume = volume * this.outputGain;
    const mapVolume = clampVolume(options.mapVolume ?? 0);

    if (!id) {
      this.fadeOutThenRestoreMap(fadeOutMs, revision);
      return;
    }
    if (id === this.currentId && this.currentSound) {
      this.fadeMapVolume(mapVolume, fadeOutMs, revision);
      this.fade(this.currentSound, this.readVolume(this.currentSound), outputVolume, fadeInMs);
      return;
    }

    const previous = this.currentSound;
    const sound = await this.resolve(id);
    if (revision !== this.revision || !sound) return;

    this.pendingId = id;
    const startNextTrack = () => {
      this.pendingId = undefined;
      this.currentId = id;
      this.currentSound = sound;
      this.setLoop(sound, true);
      this.setVolume(sound, 0);
      sound.play?.();
      this.fade(sound, 0, outputVolume, fadeInMs);
    };
    const finishFadeOut = () => {
      previous?.stop?.();
      this.setMapVolume(mapVolume);
      this.schedule(startNextTrack, 16, revision);
    };
    const fadeMapFirst = Boolean(this.mapSound) && this.mapVolume() > mapVolume;
    const fadePreviousFirst = Boolean(previous && previous !== sound);
    if (fadeMapFirst) this.fadeMapVolume(mapVolume, fadeOutMs, revision);
    if (fadePreviousFirst) {
      this.fade(previous, this.readVolume(previous), 0, fadeOutMs);
    }
    if ((fadeMapFirst || fadePreviousFirst) && fadeOutMs > 0) {
      this.schedule(finishFadeOut, fadeOutMs, revision);
    } else {
      this.setMapVolume(mapVolume);
      startNextTrack();
    }
  }

  leave(options: RpgMusicTransitionOptions = {}): void {
    const revision = ++this.revision;
    this.clearTimers();
    this.pendingId = undefined;
    const delay = Math.max(0, options.exitDelayMs ?? 1500);
    this.schedule(() => {
      const fadeOutMs = Math.max(0, options.fadeOutMs ?? 900);
      this.fadeOutThenRestoreMap(fadeOutMs, revision);
    }, delay, revision);
  }

  reset(): void {
    this.mapSound?.stop?.();
    this.mapSound = undefined;
    this.mapId = undefined;
    this.resetOverride();
  }

  /** Clear title or battle music while preserving the current map track. */
  resetOverride(): void {
    this.revision += 1;
    this.clearTimers();
    this.currentSound?.stop?.();
    this.currentSound = undefined;
    this.currentId = undefined;
    this.pendingId = undefined;
    this.contextId = undefined;
    this.setMapVolume(1);
  }

  setOutputGain(value: number): void {
    this.outputGain = clampVolume(value);
    if (this.currentSound) this.setVolume(this.currentSound, this.currentBaseVolume * this.outputGain);
    if (this.mapSound) this.setVolume(this.mapSound, this.mapVolume() * this.outputGain);
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

  private fadeOutThenRestoreMap(duration: number, revision: number): void {
    const sound = this.currentSound;
    if (!sound) {
      this.fadeMapVolume(1, duration, revision);
      return;
    }
    this.fade(sound, this.readVolume(sound), 0, duration);
    this.schedule(() => {
      sound.stop?.();
      if (revision === this.revision && this.currentSound === sound) {
        this.currentSound = undefined;
        this.currentId = undefined;
        this.fadeMapVolume(1, duration, revision);
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

  private fadeMapVolume(target: number, duration: number, revision: number) {
    const normalized = clampVolume(target);
    const outputVolume = normalized * this.outputGain;
    this.mapVolume.set(normalized);
    if (!this.mapSound) return;
    this.fade(this.mapSound, this.readVolume(this.mapSound), outputVolume, duration);
    if (duration > 0) {
      this.schedule(
        () => this.setVolume(this.mapSound, normalized * this.outputGain),
        duration,
        revision,
      );
    }
  }

  private setMapVolume(value: number) {
    const normalized = clampVolume(value);
    this.mapVolume.set(normalized);
    this.setVolume(this.mapSound, normalized * this.outputGain);
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
