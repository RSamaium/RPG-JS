/** Serializable data for the CinematicComponent GUI. */
export interface CinematicData {
  /** Video URL resolved by the game. */
  src: string;
  /** Allow pressing Escape or clicking the on-screen button to skip. Defaults to true. */
  allowSkip?: boolean;
  /** Music treatment during this clip. Defaults to duck. */
  bgm?: 'duck' | 'pause';
  /** Following clips, played without revealing the game between them. */
  clips?: Omit<CinematicData, 'clips'>[];
}

/** Completion returned to the waiting server GUI. */
export type CinematicResult = { reason: "ended" | "skipped" | "error" };

type PlaybackOptions = {
  source: () => string | Promise<string>;
  allowSkip: boolean;
  volume: number;
  translate: (key: string) => string;
  finish: (result: CinematicResult) => void;
  clips?: { source: () => string | Promise<string>; allowSkip: boolean; bgm?: 'duck' | 'pause' }[];
  beforeClip?: (bgm: 'duck' | 'pause') => void;
};

// Owned by the CanvasEngine component; DOM media is needed for mobile autoplay
// recovery and accessible controls. No gameplay state is owned by this player.
export class CinematicPlayback {
  readonly element = document.createElement("section");
  private readonly video = document.createElement("video");
  private readonly status = document.createElement("p");
  private readonly action = document.createElement("button");
  private readonly skip = document.createElement("button");
  private readonly abort = new AbortController();
  private readonly previousFocus = document.activeElement;
  private loadTimer?: ReturnType<typeof setTimeout>;
  private finishTimer?: ReturnType<typeof setTimeout>;
  private revealTimer?: ReturnType<typeof setTimeout>;
  private done = false;
  private disposed = false;
  private failed = false;
  private clipIndex = 0;
  private nextVideo?: HTMLVideoElement;
  private get clip() { return this.options.clips?.[this.clipIndex] ?? this.options; }

  constructor(private readonly options: PlaybackOptions) {
    const t = options.translate;
    this.element.className = "rpg-ui-cinematic";
    this.element.dataset.state = "loading";
    this.element.setAttribute("role", "dialog");
    this.element.setAttribute("aria-modal", "true");
    this.element.setAttribute("aria-label", t("rpg.cinematic.title"));
    this.element.tabIndex = -1;
    this.video.className = "rpg-ui-cinematic-video";
    this.video.crossOrigin = "anonymous";
    this.video.playsInline = true;
    this.video.preload = "auto";
    this.video.volume = Math.max(0, Math.min(1, options.volume));
    this.video.setAttribute("aria-label", t("rpg.cinematic.title"));
    this.status.className = "rpg-ui-cinematic-status";
    this.status.setAttribute("role", "status");
    this.status.textContent = t("rpg.cinematic.loading");
    this.action.className = "rpg-ui-btn rpg-ui-cinematic-action";
    this.action.type = this.skip.type = "button";
    this.action.hidden = true;
    this.skip.className = "rpg-ui-btn rpg-ui-cinematic-skip";
    this.skip.textContent = t("rpg.cinematic.skip");
    this.skip.hidden = !this.clip.allowSkip;
    this.element.append(this.video, this.status, this.action, this.skip);
    const signal = this.abort.signal;
    this.video.addEventListener("playing", () => {
      if (this.done || this.failed) return;
      clearTimeout(this.loadTimer);
      this.status.hidden = this.action.hidden = true;
      this.element.dataset.state = "playing";
    }, { signal });
    this.video.addEventListener("waiting", () => this.watchLoading(), { signal });
    this.video.addEventListener("ended", () => this.complete("ended"), { signal });
    this.video.addEventListener("error", () => this.fail(), { signal });
    this.action.addEventListener("click", () => this.failed ? this.complete("error") : void this.play(), { signal });
    this.skip.addEventListener("click", () => {
      if (this.clip.allowSkip) this.complete("skipped");
    }, { signal });
    window.addEventListener("keydown", this.onKeyDown, { capture: true, signal });
    window.addEventListener("keyup", this.onKeyUp, { capture: true, signal });
    this.element.addEventListener("pointerdown", (event) => event.stopPropagation(), { signal });
    this.element.addEventListener("click", (event) => event.stopPropagation(), { signal });
  }

  async start(): Promise<void> {
    const index = this.clipIndex;
    this.element.focus();
    this.options.beforeClip?.(('bgm' in this.clip && this.clip.bgm) || 'duck');
    this.skip.hidden = !this.clip.allowSkip;
    this.watchLoading();
    try {
      const src = await this.clip.source();
      if (this.disposed || this.done || this.failed || index !== this.clipIndex) return;
      if (!src) return this.fail();
      this.video.src = src;
      this.preloadNext();
      this.revealTimer = setTimeout(() => {
        if (!this.done) void this.play();
      }, this.clipIndex === 0 ? this.fadeDuration : 0);
    } catch {
      if (index === this.clipIndex) this.fail();
    }
  }

  private get fadeDuration(): number {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 200;
  }

  private preloadNext(): void {
    this.nextVideo?.removeAttribute('src');
    this.nextVideo?.load();
    this.nextVideo = undefined;
    const next = this.options.clips?.[this.clipIndex + 1];
    const index = this.clipIndex;
    if (!next) return;
    void Promise.resolve().then(next.source).then(src => {
      if (!src || this.disposed || this.done || index !== this.clipIndex) return;
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.src = src;
      this.nextVideo = video;
      video.load();
    }).catch(() => {});
  }

  private watchLoading(): void {
    if (this.done || this.failed) return;
    clearTimeout(this.loadTimer);
    this.loadTimer = setTimeout(() => this.fail(), 20_000);
  }

  private async play(): Promise<void> {
    if (this.done || this.failed) return;
    const index = this.clipIndex;
    this.action.hidden = true;
    this.watchLoading();
    try {
      await this.video.play();
    } catch (error) {
      if (this.done || this.failed || this.disposed || index !== this.clipIndex) return;
      if (error && typeof error === "object" && "name" in error && error.name === "NotAllowedError") {
        clearTimeout(this.loadTimer);
        this.status.hidden = true;
        this.action.textContent = this.options.translate("rpg.cinematic.play");
        this.action.hidden = false;
        this.action.focus();
      } else this.fail();
    }
  }

  private fail(): void {
    if (this.done || this.disposed) return;
    this.failed = true;
    clearTimeout(this.loadTimer);
    this.video.pause();
    this.element.dataset.state = "error";
    this.status.hidden = false;
    this.status.textContent = this.options.translate("rpg.cinematic.error");
    this.action.textContent = this.options.translate("rpg.cinematic.close");
    this.action.hidden = false;
    this.action.focus();
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    event.stopImmediatePropagation();
    if (event.key === "Tab") {
      event.preventDefault();
      const buttons = [this.action, this.skip].filter(button => !button.hidden);
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = (current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
      (buttons[next] ?? this.element).focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (!event.repeat && (this.failed || this.clip.allowSkip)) this.complete(this.failed ? "error" : "skipped");
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    // Let gameplay controls clear keys held before the cinematic opened.
    if (event.key === "Escape") {
      event.stopImmediatePropagation();
    }
  };

  private complete(reason: CinematicResult["reason"]): void {
    if (this.done || this.disposed) return;
    if (this.options.clips && this.clipIndex + 1 < this.options.clips.length) {
      clearTimeout(this.loadTimer);
      clearTimeout(this.revealTimer);
      this.video.pause();
      this.clipIndex++;
      this.failed = false;
      this.element.dataset.state = 'loading';
      this.status.textContent = this.options.translate('rpg.cinematic.loading');
      this.status.hidden = false;
      this.action.hidden = true;
      void this.start();
      return;
    }
    this.done = true;
    clearTimeout(this.loadTimer);
    clearTimeout(this.revealTimer);
    this.video.pause();
    this.element.dataset.state = "closing";
    this.finishTimer = setTimeout(() => {
      if (!this.disposed) this.options.finish({ reason });
    }, this.fadeDuration);
  }

  dispose(): void {
    this.disposed = true;
    this.abort.abort();
    clearTimeout(this.loadTimer);
    clearTimeout(this.revealTimer);
    clearTimeout(this.finishTimer);
    this.video.pause();
    this.video.removeAttribute("src");
    this.video.load();
    this.nextVideo?.removeAttribute('src');
    this.nextVideo?.load();
    if (this.previousFocus instanceof HTMLElement && this.previousFocus.isConnected) this.previousFocus.focus();
  }
}
