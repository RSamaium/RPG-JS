import { signal } from "canvasengine";

export type RpgAudioChannel = "master" | "music" | "sfx" | "ui";
export type RpgUiAudioEvent = "navigate" | "confirm" | "cancel" | "open" | "close" | "error";

export type RpgAudioCue =
  | string
  | string[]
  | false
  | {
      id: string | string[];
      volume?: number;
      cooldownMs?: number;
    };

export interface RpgAudioPreferences {
  master: number;
  music: number;
  sfx: number;
  ui: number;
}

export interface RpgUiAudioTheme {
  navigate?: RpgAudioCue;
  confirm?: RpgAudioCue;
  cancel?: RpgAudioCue;
  open?: RpgAudioCue;
  close?: RpgAudioCue;
  error?: RpgAudioCue;
}

export interface RpgAudioPosition {
  x: number;
  y: number;
}

/** Options accepted by the established `engine.playSound()` API. */
export interface RpgPlaySoundOptions {
  /** Per-play volume between 0 and 1, before channel and master gains. */
  volume?: number;
  /** Repeat the sound until it is stopped. */
  loop?: boolean;
  /** Mixer channel used for this sound. Defaults to `sfx`. */
  channel?: Exclude<RpgAudioChannel, "master">;
  /** World-space source position used for attenuation and stereo panning. */
  position?: RpgAudioPosition;
  /** World-space listener position, normally the current player. */
  listener?: RpgAudioPosition;
  /** Distance at which the sound becomes silent. Defaults to 640 pixels. */
  maxDistance?: number;
  /** Maximum stereo pan between 0 and 1. Defaults to 0.75. */
  panStrength?: number;
}

/** Internal project configuration shared by RPGJS and Studio. */
export interface RpgSoundConfiguration {
  projectId?: string;
  ui?: RpgUiAudioTheme;
}

type AudioStorage = Pick<Storage, "getItem" | "setItem">;
type AudioHost = {
  getSound(id: string): any | Promise<any>;
  addSound(sound: { id: string; src: string }): any;
  onPreferencesChange?(preferences: RpgAudioPreferences): void;
};

const DEFAULT_PREFERENCES: RpgAudioPreferences = {
  master: 1,
  music: 1,
  sfx: 1,
  ui: 1,
};

const DEFAULT_UI_CUES: Record<RpgUiAudioEvent, string> = {
  navigate: "rpgjs-ui-navigate",
  confirm: "rpgjs-ui-confirm",
  cancel: "rpgjs-ui-cancel",
  open: "rpgjs-ui-open",
  close: "rpgjs-ui-close",
  error: "rpgjs-ui-error",
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const isConfiguredCue = (cue: RpgAudioCue | undefined): cue is RpgAudioCue => {
  if (cue === false) return true;
  if (typeof cue === "string") return cue.trim().length > 0;
  if (Array.isArray(cue)) return cue.some((id) => id.trim().length > 0);
  if (!cue) return false;
  return Array.isArray(cue.id)
    ? cue.id.some((id) => id.trim().length > 0)
    : cue.id.trim().length > 0;
};
const isBrowserStorageAvailable = () => typeof window !== "undefined" && Boolean(window.localStorage);

const encodeBase64 = (bytes: Uint8Array): string => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    output += alphabet[a >> 2];
    output += alphabet[((a & 3) << 4) | ((b ?? 0) >> 4)];
    output += index + 1 < bytes.length ? alphabet[((b & 15) << 2) | ((c ?? 0) >> 6)] : "=";
    output += index + 2 < bytes.length ? alphabet[c & 63] : "=";
  }
  return output;
};

/** Creates tiny original UI sounds without adding network requests or licensed assets. */
const createTone = (frequency: number, durationMs: number, slide = 0): string => {
  const sampleRate = 8000;
  const sampleCount = Math.max(1, Math.floor((durationMs / 1000) * sampleRate));
  const bytes = new Uint8Array(44 + sampleCount * 2);
  const view = new DataView(bytes.buffer);
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };
  writeText(0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeText(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, sampleCount * 2, true);
  for (let index = 0; index < sampleCount; index += 1) {
    const progress = index / sampleCount;
    const currentFrequency = frequency + slide * progress;
    const envelope = Math.pow(1 - progress, 2);
    const sample = Math.sin(2 * Math.PI * currentFrequency * (index / sampleRate)) * envelope * 0.28;
    view.setInt16(44 + index * 2, Math.round(sample * 32767), true);
  }
  return `data:audio/wav;base64,${encodeBase64(bytes)}`;
};

const DEFAULT_SOUNDS = {
  "rpgjs-ui-navigate": createTone(660, 45, 80),
  "rpgjs-ui-confirm": createTone(740, 85, 260),
  "rpgjs-ui-cancel": createTone(420, 90, -160),
  "rpgjs-ui-open": createTone(520, 110, 300),
  "rpgjs-ui-close": createTone(620, 100, -260),
  "rpgjs-ui-error": createTone(190, 150, -30),
  "rpgjs-combat-attack": createTone(180, 95, 420),
  "rpgjs-combat-cast": createTone(440, 180, 480),
  "rpgjs-combat-hit": createTone(150, 85, -80),
  "rpgjs-combat-hurt": createTone(260, 130, -170),
  "rpgjs-combat-die": createTone(240, 300, -210),
} as const;

/** Central audio controller for channels, semantic UI cues and spatial SFX. */
export class RpgAudioManager {
  private readonly preferences = signal<RpgAudioPreferences>({ ...DEFAULT_PREFERENCES });
  private readonly cooldowns = new Map<string, number>();
  private storageKey = "rpgjs:audio:default";
  private uiTheme: RpgUiAudioTheme = {};

  constructor(
    private readonly host: AudioHost,
    private readonly storage: AudioStorage | undefined = isBrowserStorageAvailable() ? window.localStorage : undefined,
  ) {
    Object.entries(DEFAULT_SOUNDS).forEach(([id, src]) => this.host.addSound({ id, src }));
    this.load();
  }

  configure(config: RpgSoundConfiguration = {}): void {
    this.storageKey = `rpgjs:audio:${config.projectId || "default"}`;
    this.uiTheme = config.ui ?? {};
    this.load();
  }

  channelGain(channel: RpgAudioChannel): number {
    const values = this.preferences();
    return channel === "master" ? values.master : values[channel];
  }

  getVolume(channel: RpgAudioChannel): number {
    return this.preferences()[channel];
  }

  setVolume(channel: RpgAudioChannel, value: number): void {
    this.preferences.update((current) => ({ ...current, [channel]: clamp(value) }));
    this.persist();
    this.host.onPreferencesChange?.(this.preferences());
  }

  async playUi(event: RpgUiAudioEvent): Promise<number | true | undefined> {
    const projectCue = this.uiTheme[event];
    const cue = isConfiguredCue(projectCue) ? projectCue : DEFAULT_UI_CUES[event];
    return this.play(cue, { channel: "ui" });
  }

  async play(
    cue: RpgAudioCue | undefined,
    options: RpgPlaySoundOptions = {},
  ): Promise<number | true | undefined> {
    if (cue === false || cue == null) return undefined;
    const value = typeof cue === "object" && !Array.isArray(cue) ? cue : { id: cue };
    const ids = (Array.isArray(value.id) ? value.id : [value.id])
      .filter((id) => id.trim().length > 0);
    const id = ids[Math.floor(Math.random() * ids.length)];
    if (!id) return undefined;
    const now = Date.now();
    const cooldownMs = Math.max(0, value.cooldownMs ?? 0);
    if (now - (this.cooldowns.get(id) ?? -Infinity) < cooldownMs) return undefined;
    this.cooldowns.set(id, now);

    let sound = await this.host.getSound(id);
    if (!sound?.play && typeof sound?.src === "string") {
      sound = this.host.addSound({ id, src: sound.src });
    }
    if (!sound?.play) return undefined;
    const channel = options.channel ?? "sfx";
    const spatial = this.resolveSpatial(options.position, options.listener, options.maxDistance, options.panStrength);
    const configuredVolume = sound.volume?.();
    const baseVolume = options.volume
      ?? value.volume
      ?? (typeof configuredVolume === "number" ? configuredVolume : 1);
    const volume = clamp(baseVolume * this.channelGain(channel) * spatial.volume);
    const instanceId = sound.play();
    sound.volume?.(volume, instanceId);
    if (options.loop !== undefined) sound.loop?.(options.loop, instanceId);
    if (spatial.pan !== 0) sound.stereo?.(spatial.pan, instanceId);
    return typeof instanceId === "number" ? instanceId : true;
  }

  private resolveSpatial(
    position?: RpgAudioPosition,
    listener?: RpgAudioPosition,
    maxDistance = 640,
    panStrength = 0.75,
  ): { volume: number; pan: number } {
    if (!position || !listener) return { volume: 1, pan: 0 };
    const dx = position.x - listener.x;
    const dy = position.y - listener.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const fullVolumeDistance = 64;
    const volume = distance <= fullVolumeDistance
      ? 1
      : clamp(1 - (distance - fullVolumeDistance) / Math.max(1, maxDistance - fullVolumeDistance));
    return {
      volume,
      pan: clamp(Math.abs(dx) / Math.max(1, maxDistance)) * Math.sign(dx) * clamp(panStrength),
    };
  }

  private load(): void {
    try {
      const stored = this.storage?.getItem(this.storageKey);
      if (!stored) {
        this.applyPreferences(DEFAULT_PREFERENCES);
        return;
      }
      const parsed = JSON.parse(stored) as Partial<RpgAudioPreferences>;
      this.applyPreferences({
        master: clamp(parsed.master ?? 1),
        music: clamp(parsed.music ?? 1),
        sfx: clamp(parsed.sfx ?? 1),
        ui: clamp(parsed.ui ?? 1),
      });
    } catch {
      this.applyPreferences(DEFAULT_PREFERENCES);
    }
  }

  private applyPreferences(preferences: RpgAudioPreferences): void {
    this.preferences.set({ ...preferences });
    this.host.onPreferencesChange?.(this.preferences());
  }

  private persist(): void {
    try {
      this.storage?.setItem(this.storageKey, JSON.stringify(this.preferences()));
    } catch {
      // Audio preferences must never prevent the game from running.
    }
  }
}
