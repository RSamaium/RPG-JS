import Canvas from "./components/scenes/canvas.ce";
import BuiltinSceneMap from "./components/scenes/draw-map.ce";
import { inject } from './core/inject'
import { signal, bootstrapCanvas, Howl, Howler, trigger, type Trigger } from "canvasengine";
import { AbstractWebsocket, WebSocketToken } from "./services/AbstractSocket";
import { LoadMapService, LoadMapToken } from "./services/loadMap";
import { RpgSound } from "./Sound";
import { RpgResource } from "./Resource";
import { getOrCreateI18nService, Hooks, ModulesToken, Direction, normalizeLightingState, Vector2, type I18nParams, type I18nService } from "@rpgjs/common";
import type { EventComponentConfig } from "./RpgClient";
import type { RpgClientEvent } from "./Game/Event";
import { load } from "@signe/sync";
import { RpgClientMap } from "./Game/Map"
import { RpgGui } from "./Gui/Gui";
import { AnimationManager } from "./Game/AnimationManager";
import { lastValueFrom, Observable, combineLatest, BehaviorSubject, filter, switchMap, take } from "rxjs";
import { GlobalConfigToken } from "./module";
import * as PIXI from "pixi.js";
import { PrebuiltComponentAnimations } from "./components/animations";
import TextComponent from "./components/dynamics/text.ce";
import BarComponent from "./components/dynamics/bar.ce";
import ShapeComponent from "./components/dynamics/shape.ce";
import ImageComponent from "./components/dynamics/image.ce";
import {
  PredictionController,
  type PredictionHistoryEntry,
  type PredictionState,
  type RpgActionInput,
  type RpgActionName,
  type RpgDashInput,
  type RpgMovementInput,
} from "@rpgjs/common";
import { NotificationManager } from "./Gui/NotificationManager";
import { SaveClientService } from "./services/save";
import { getCanMoveValue } from "./utils/readPropValue";
import { ProjectileManager, type ClientProjectileImpact, type ClientProjectileSpawn } from "./Game/ProjectileManager";
import { ClientVisualRegistry, type ClientVisualHandler, type ClientVisualMap, type ClientVisualPacket } from "./Game/ClientVisuals";
import { normalizeActionInput } from "./services/actionInput";
import { createClientPointerContext, type ClientPointerContext } from "./services/pointerContext";
import { RpgClientInteractions } from "./services/interactions";
import { normalizeRoomMapId } from "./utils/mapId";
import { applySyncedHitboxPayload } from "./utils/syncHitbox";
import { applySyncedParamPayload } from "./utils/syncParams";
import { EventComponentResolverRegistry, type EventComponentResolver } from "./Game/EventComponentResolver";
import { RpgClientBuiltinI18n } from "./i18n";
import { clearCameraFollowPlugins, type CameraFollowSmoothMove } from "./services/cameraFollow";
import { RpgMusicManager } from "./Game/MusicManager";
import {
  RpgAudioManager,
  type RpgAudioChannel,
  type RpgPlaySoundOptions,
  type RpgSoundConfiguration,
  type RpgUiAudioEvent,
} from "./Game/AudioManager";
import { routePredictedLocalPlayerSync } from "./services/localPlayerSync";
export type {
  CameraFollowEase,
  CameraFollowSmoothMove,
  CameraFollowSmoothMoveOptions,
} from "./services/cameraFollow";

interface MovementTrajectoryPoint {
  frame: number;
  tick: number;
  timestamp: number;
  input: RpgMovementInput;
  x: number;
  y: number;
  direction?: Direction;
}

interface CanvasResizeSize {
  width: number;
  height: number;
}

const DEFAULT_DASH_ADDITIONAL_SPEED = 8;
const DEFAULT_DASH_DURATION_MS = 180;
const DEFAULT_DASH_COOLDOWN_MS = 450;

const isDashInput = (input: RpgMovementInput): input is RpgDashInput =>
  typeof input === "object" && input !== null && input.type === "dash";

const isMoveInput = (
  input: RpgMovementInput
): input is { type: "move"; direction: Direction } =>
  typeof input === "object" && input !== null && input.type === "move";

const resolveMoveDirection = (input: RpgMovementInput): Direction | undefined => {
  if (isMoveInput(input)) return input.direction;
  if (typeof input === "string" || typeof input === "number") {
    return input as Direction;
  }
  return undefined;
};

const directionToVector = (direction: Direction | undefined) => {
  switch (direction) {
    case Direction.Left:
      return { x: -1, y: 0 };
    case Direction.Right:
      return { x: 1, y: 0 };
    case Direction.Up:
      return { x: 0, y: -1 };
    case Direction.Down:
    default:
      return { x: 0, y: 1 };
  }
};

const vectorToDirection = (direction: { x: number; y: number }): Direction => {
  if (Math.abs(direction.x) > Math.abs(direction.y)) {
    return direction.x < 0 ? Direction.Left : Direction.Right;
  }
  return direction.y < 0 ? Direction.Up : Direction.Down;
};

const normalizeDashInput = (
  input: Partial<RpgDashInput>,
  fallbackDirection: Direction | undefined
): RpgDashInput | null => {
  const rawDirection = input.direction ?? directionToVector(fallbackDirection);
  const rawX = Number(rawDirection?.x ?? 0);
  const rawY = Number(rawDirection?.y ?? 0);
  const magnitude = Math.hypot(rawX, rawY);
  if (!Number.isFinite(magnitude) || magnitude <= 0) return null;

  const additionalSpeed =
    typeof input.additionalSpeed === "number" && Number.isFinite(input.additionalSpeed)
      ? Math.max(0, Math.min(input.additionalSpeed, 64))
      : DEFAULT_DASH_ADDITIONAL_SPEED;
  const duration =
    typeof input.duration === "number" && Number.isFinite(input.duration)
      ? Math.max(1, Math.min(input.duration, 1000))
      : DEFAULT_DASH_DURATION_MS;
  const cooldown =
    typeof input.cooldown === "number" && Number.isFinite(input.cooldown)
      ? Math.max(0, Math.min(input.cooldown, 5000))
      : DEFAULT_DASH_COOLDOWN_MS;

  return {
    type: "dash",
    direction: {
      x: rawX / magnitude,
      y: rawY / magnitude,
    },
    additionalSpeed,
    duration,
    cooldown,
  };
};

type ConfigurableTrigger<T> = Omit<Trigger<T>, "start"> & {
  start(config?: T): Promise<void>;
};

type MapShakeOptions = {
  intensity?: number;
  duration?: number;
  frequency?: number;
  direction?: string;
};

export class RpgClientEngine<T = any> {
  /** Runtime defaults used by modules that specialize the built-in dash. */
  dashDefaults: Partial<RpgDashInput> = {};
  private guiService: RpgGui;
  private webSocket: AbstractWebsocket;
  private loadMapService: LoadMapService;
  private hooks: Hooks;
  private sceneMap: RpgClientMap
  private selector: HTMLElement;
  public globalConfig: T;
  public sceneComponent: any;
  public sceneMapComponent: any = BuiltinSceneMap;
  stopProcessingInput = false;
  width = signal("100%");
  height = signal("100%");
  spritesheets: Map<string | number, any> = new Map();
  private spritesheetPromises: Map<string | number, Promise<any>> = new Map();
  sounds: Map<string, any> = new Map();
  /** Internal mixer behind the established sound API. */
  private readonly audio = new RpgAudioManager({
    getSound: (id) => this.getSound(id),
    addSound: (sound) => this.addSound(sound),
    onPreferencesChange: (preferences) => {
      (Howler as any).volume(preferences.master);
      this.music?.setOutputGain(preferences.music);
    },
  });
  /** Client-only controller for temporary looping music and map BGM crossfades. */
  music = new RpgMusicManager({
    getSound: (id) => this.getSound(id),
    createSound: (src, options) =>
      new (Howl as any).Howl({ src: [src], ...options }),
  });
  componentAnimations: any[] = [];
  clientVisuals = new ClientVisualRegistry();
  projectiles: ProjectileManager;
  /**
   * Read the latest pointer position tracked by the client canvas. World
   * coordinates are suitable for action payloads and map interactions.
   *
   * @title pointer
   * @prop pointer: ClientPointerContext
   * @memberof RpgClientEngine
   * @example
   * ```ts
   * const target = engine.pointer.world()
   * if (target) engine.processAction('projectile:shoot', { target })
   * ```
   */
  pointer: ClientPointerContext = createClientPointerContext();
  /**
   * Register client-only pointer behaviors for map sprites. Interactions remain
   * local unless a behavior explicitly sends an action to the server.
   *
   * See the [client interactions guide](../../guide/interactions.md) for hover,
   * selection, hit testing, drag-and-drop, overlays, and network rules.
   *
   * @title interactions
   * @prop interactions: RpgClientInteractions
   * @memberof RpgClientEngine
   * @example
   * ```ts
   * engine.interactions.use('Guard', {
   *   cursor: 'pointer',
   *   click(ctx) {
   *     ctx.action('guard:talk', { eventId: ctx.target.id })
   *   }
   * })
   * ```
   */
  interactions: RpgClientInteractions = new RpgClientInteractions(this);
  private spritesheetResolver?: (id: string | number) => any | Promise<any>;
  private soundResolver?: (id: string) => any | Promise<any>;
  particleSettings: {
    emitters: any[]
  } = {
      emitters: []
    }
  renderer: PIXI.Renderer;
  tick: Observable<number>;
  private canvasApp?: any;
  private canvasElement?: any;
  playerIdSignal = signal<string | null>(null);
  spriteComponentsBehind = signal<any[]>([]);
  spriteComponentsInFront = signal<any[]>([]);
  spriteComponents: Map<string, any> = new Map();
  private eventComponentResolvers = new EventComponentResolverRegistry();
  /** ID of the sprite that the camera should follow. null means follow the current player */
  cameraFollowTargetId = signal<string | null>(null);
  /** Camera follow transition options used by character components when the target changes */
  cameraFollowSmoothMove: CameraFollowSmoothMove = false;
  /** Incremented for each camera follow command so repeated commands on the same target are applied */
  cameraFollowRevision = signal(0);
  /** Trigger for map shake animation */
  mapShakeTrigger: ConfigurableTrigger<MapShakeOptions> = trigger<MapShakeOptions>();

  controlsReady = signal<boolean | undefined>(undefined); 
  gamePause = signal(false);
  /**
   * Freezes map rendering for short presentation-only beats such as combat
   * hit-stop. It is deliberately separate from menu/gameplay pause ownership.
   */
  visualPause = signal(false);

  private predictionEnabled = false;
  private prediction?: PredictionController<RpgMovementInput, Direction>;
  private readonly SERVER_CORRECTION_THRESHOLD = 30;
  private localMovementAuthority = false;
  private lastLocalMovementInputAt = 0;
  private readonly LOCAL_MOVEMENT_AUTHORITY_ACK_GRACE_MS = 250;
  private inputFrameCounter = 0;
  private pendingPredictionFrames: number[] = [];
  private lastClientPhysicsStepAt = 0;
  private frameOffset = 0;
  private latestServerTick?: number;
  private latestServerTickAt = 0;
  private dashLockedUntil = 0;
  // Ping/Pong for RTT measurement
  private rtt: number = 0; // Round-trip time in ms
  private pingInterval: any = null;
  private readonly PING_INTERVAL_MS = 5000; // Send ping every 5 seconds
  private lastInputTime = 0;
  private latestDirectionalInput?: RpgMovementInput;
  private pendingMapTransferInput?: RpgMovementInput;
  private readonly MOVE_PATH_RESEND_INTERVAL_MS = 120;
  private readonly MAX_MOVE_TRAJECTORY_POINTS = 240;
  private lastMovePathSentAt = 0;
  private lastMovePathSentFrame = 0;
  // Track map loading state for onAfterLoading hook using RxJS
  private mapLoadCompleted$ = new BehaviorSubject<boolean>(false);
  private playerIdReceived$ = new BehaviorSubject<boolean>(false);
  private playersReceived$ = new BehaviorSubject<boolean>(false);
  private eventsReceived$ = new BehaviorSubject<boolean>(false);
  private onAfterLoadingSubscription?: any;
  private sceneResetQueued = false;
  private mapTransitionInProgress = false;
  private currentMapRoomId?: string;
  private activeMapStreamController?: { attach(map: RpgClientMap): void; detach(): void };
  private socketListenersInitialized = false;
  private clientReadyForMapChanges = false;
  private pendingMapChanges: any[] = [];
  
  // Store subscriptions and event listeners for cleanup
  private tickSubscriptions: any[] = [];
  private resizeHandler?: () => void;
  private pointerMoveHandler?: (event: PointerEvent) => void;
  private pointerUpHandler?: (event: PointerEvent) => void;
  private pointerCancelHandler?: (event: PointerEvent) => void;
  private pointerCanvas?: HTMLCanvasElement;
  private pendingSyncPackets: any[] = [];
  private notificationManager: NotificationManager = new NotificationManager();
  private i18nService: I18nService;
  private locale?: string;

  constructor(public context) {
    this.webSocket = inject(WebSocketToken);
    this.guiService = inject(RpgGui);
    this.loadMapService = inject(LoadMapToken);
    this.hooks = inject<Hooks>(ModulesToken);
    this.i18nService = getOrCreateI18nService(context);
    this.i18nService.addMessages(RpgClientBuiltinI18n, "rpgjs-client", 0);
    this.projectiles = new ProjectileManager(
      this.hooks,
      (projectile) => this.predictProjectileImpact(projectile),
    );
    this.globalConfig = inject(GlobalConfigToken)

    if (!this.globalConfig) {
      this.globalConfig = {} as T
    }
    if (!(this.globalConfig as any).box) {
      (this.globalConfig as any).box = {
        styles: {
          backgroundColor: "#1a1a2e",
          backgroundOpacity: 0.9
        },
        sounds: {}
      }
    }
    this.audio.configure({
      projectId: (this.globalConfig as any).projectId ?? (this.globalConfig as any)._id,
      ui: (this.globalConfig as any).audio?.ui,
    });
    this.music.setOutputGain(this.audio.channelGain("music"));

    this.addComponentAnimation({
      id: "animation",
      component: PrebuiltComponentAnimations.Animation
    })

    this.registerSpriteComponent("rpg:text", TextComponent);
    this.registerSpriteComponent("rpg:hpBar", BarComponent);
    this.registerSpriteComponent("rpg:spBar", BarComponent);
    this.registerSpriteComponent("rpg:bar", BarComponent);
    this.registerSpriteComponent("rpg:shape", ShapeComponent);
    this.registerSpriteComponent("rpg:image", ImageComponent);

    this.predictionEnabled = (this.globalConfig as any)?.prediction?.enabled !== false;
    this.localMovementAuthority = this.resolveLocalMovementAuthority();
    this.initializePredictionController();
  }

  private resolveLocalMovementAuthority(): boolean {
    const predictionConfig = (this.globalConfig as any)?.prediction;
    const configured =
      (this.globalConfig as any)?.movementAuthority ??
      predictionConfig?.movementAuthority ??
      predictionConfig?.authority ??
      predictionConfig?.mode;

    if (
      configured === "server" ||
      configured === "network" ||
      configured === false
    ) {
      return false;
    }
    if (
      configured === "client" ||
      configured === "local" ||
      configured === true
    ) {
      return true;
    }

    return this.webSocket.mode === "standalone";
  }

  setLocale(locale: string) {
    this.locale = locale;
  }

  getLocale(): string {
    return this.locale || this.i18nService.defaultLocale;
  }

  t(key: string, params?: I18nParams): string {
    return this.i18nService.t(key, params, this.getLocale());
  }

  i18n() {
    return {
      locale: this.getLocale(),
      t: (key: string, params?: I18nParams) => this.t(key, params),
    };
  }

  /**
   * Assigns a CanvasEngine KeyboardControls instance to the dependency injection context
   * 
   * This method registers a KeyboardControls instance from CanvasEngine into the DI container,
   * making it available for injection throughout the application. The particularity is that
   * this method is automatically called when a sprite is displayed on the map, allowing the
   * controls to be automatically associated with the active sprite.
   * 
   * ## Design
   * 
   * - The instance is stored in the DI context under the `KeyboardControls` token
   * - It's automatically assigned when a sprite component mounts (in `character.ce`)
   * - The controls instance comes from the CanvasEngine component's directives
   * - Once registered, it can be retrieved using `inject(KeyboardControls)` from anywhere
   * 
   * @param controlInstance - The CanvasEngine KeyboardControls instance to register
   * 
   * @example
   * ```ts
   * // The method is automatically called when a sprite is displayed:
   * // client.setKeyboardControls(element.directives.controls)
   * 
   * // Later, retrieve and use the controls instance:
   * import { Input, inject, KeyboardControls } from '@rpgjs/client'
   * 
   * const controls = inject(KeyboardControls)
   * const control = controls.getControl(Input.Enter)
   * 
   * if (control) {
   *   console.log(control.actionName) // 'action'
   * }
   * ```
   */
  setKeyboardControls(controlInstance: any) {
    const currentValues = this.context.values['inject:' + 'KeyboardControls']
    this.context.values['inject:' + 'KeyboardControls'] = {
      ...currentValues,
      values: new Map([['__default__', controlInstance]])
    }
    this.controlsReady.set(true);
  }

  async start() {
    this.sceneMap = new RpgClientMap()
    this.sceneMap.configureClientPrediction(this.predictionEnabled);
    this.sceneMap.loadPhysic();
    this.resolveSceneMapComponent();

    this.loadMapService.initialize?.();
    const saveClient = inject(SaveClientService);
    saveClient.initialize();
    this.initListeners();
    this.guiService._initialize();

    try {
      await this.webSocket.connection();
    }
    catch (error) {
      this.stopPingPong();
      await this.callConnectError(error);
      throw error;
    }

    this.selector = document.body.querySelector("#rpg") as HTMLElement;

    const bootstrapOptions = (this.globalConfig as any)?.bootstrapCanvasOptions;
    const { app, canvasElement } = await bootstrapCanvas(
      this.selector,
      Canvas,
      bootstrapOptions
    );
    this.installCanvasResizeGuard(app);
    this.canvasApp = app;
    this.canvasElement = canvasElement;
    this.renderer = app.renderer as unknown as PIXI.Renderer;
    this.setupPointerTracking();
    this.tick = canvasElement?.propObservables?.context['tick'].observable

    const inputCheckSubscription = this.tick.subscribe(() => {
      if (Date.now() - this.lastInputTime > 100) {
        const player = this.getCurrentPlayer();
        if (!player) return;
        (this.sceneMap as any).stopMovement(player);
      }
    });
    this.tickSubscriptions.push(inputCheckSubscription);


    this.hooks.callHooks("client-spritesheets-load", this).subscribe();
    this.hooks.callHooks("client-spritesheetResolver-load", this).subscribe();
    this.flushPendingSyncPackets();
    this.hooks.callHooks("client-sounds-load", this).subscribe();
    this.hooks.callHooks("client-soundResolver-load", this).subscribe();

    RpgSound.init(this);
    RpgResource.init(this);
    this.hooks.callHooks("client-gui-load", this).subscribe();
    this.hooks.callHooks("client-particles-load", this).subscribe();
    this.hooks.callHooks("client-componentAnimations-load", this).subscribe();
    this.hooks.callHooks("client-clientVisuals-load", this).subscribe();
    this.hooks.callHooks("client-projectiles-load", this).subscribe();
    this.hooks.callHooks("client-interactions-load", this).subscribe();
    this.hooks.callHooks("client-sprite-load", this).subscribe();

    await lastValueFrom(this.hooks.callHooks("client-engine-onStart", this));
    this.clientReadyForMapChanges = true;
    this.flushPendingMapChanges();

    // wondow is resize
    this.resizeHandler = () => {
      this.hooks.callHooks("client-engine-onWindowResize", this).subscribe();
    };
    window.addEventListener('resize', this.resizeHandler);

    const tickSubscription = this.tick.subscribe((tick) => {
      this.stepClientPhysicsTick();
      this.projectiles.step();
      this.flushPendingMovePath();
      this.hooks.callHooks("client-engine-onStep", this, tick).subscribe();

      // Clean up old prediction states and input history every 60 ticks (approximately every second at 60fps)
      if (tick % 60 === 0) {
        const now = Date.now();
        this.prediction?.cleanup(now);
        this.prediction?.tryApplyPendingSnapshot();
      }
    });
    this.tickSubscriptions.push(tickSubscription);

    this.startPingPong();
  }

  private installCanvasResizeGuard(app: any) {
    if (!app || typeof app.resize !== "function") return;

    const originalResize = app.resize.bind(app);
    app.resize = () => {
      const targetSize = this.readCanvasResizeTargetSize(app);
      const rendererSize = this.readCanvasRendererSize(app);

      if (
        targetSize &&
        rendererSize &&
        targetSize.width === rendererSize.width &&
        targetSize.height === rendererSize.height
      ) {
        this.cancelCanvasResizeFrame(app);
        return;
      }

      originalResize();
    };
  }

  private readCanvasResizeTargetSize(app: any): CanvasResizeSize | null {
    const resizeTarget = app?.resizeTo;
    if (!resizeTarget || typeof window === "undefined") return null;

    const rawWidth = resizeTarget === window ? window.innerWidth : resizeTarget.clientWidth;
    const rawHeight = resizeTarget === window ? window.innerHeight : resizeTarget.clientHeight;
    const width = Math.round(Number(rawWidth));
    const height = Math.round(Number(rawHeight));

    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 0 || height < 0) return null;
    return { width, height };
  }

  private readCanvasRendererSize(app: any): CanvasResizeSize | null {
    const screen = app?.renderer?.screen;
    const width = Math.round(Number(screen?.width));
    const height = Math.round(Number(screen?.height));

    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
    return { width, height };
  }

  private cancelCanvasResizeFrame(app: any) {
    if (typeof app?._cancelResize === "function") {
      app._cancelResize();
    }
  }

  private resolveSceneMapComponent() {
    const components = this.hooks.getHookFunctions("client-sceneMap-component");
    const component = components[components.length - 1];
    if (component) {
      this.sceneMapComponent = component;
    }
  }

  private setupPointerTracking() {
    const renderer = this.renderer as any;
    const canvas = renderer?.canvas ?? renderer?.view ?? (this.canvasApp as any)?.canvas;

    if (!canvas || typeof canvas.addEventListener !== "function") {
      return;
    }

    this.pointerCanvas = canvas;
    const updatePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const screen = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const viewport = this.findViewportInstance();
      let world = screen;

      if (viewport && typeof viewport.toWorld === "function") {
        const point = viewport.toWorld(screen.x, screen.y);
        world = { x: Number(point.x), y: Number(point.y) };
      } else if (viewport && typeof viewport.toLocal === "function") {
        const point = viewport.toLocal(screen);
        world = { x: Number(point.x), y: Number(point.y) };
      }

      this.pointer.update(screen, world);
    };

    this.pointerMoveHandler = (event: PointerEvent) => {
      updatePointer(event);
      this.interactions.handlePointerMove(event);
    };
    this.pointerUpHandler = (event: PointerEvent) => {
      updatePointer(event);
      this.interactions.handlePointerUp(event);
    };
    this.pointerCancelHandler = (event: PointerEvent) => {
      updatePointer(event);
      this.interactions.cancelDrag(event);
    };

    canvas.addEventListener("pointermove", this.pointerMoveHandler);
    canvas.addEventListener("pointerdown", this.pointerMoveHandler);
    canvas.addEventListener("pointerup", this.pointerUpHandler);
    canvas.addEventListener("pointercancel", this.pointerCancelHandler);
    canvas.addEventListener("pointerleave", this.pointerCancelHandler);
  }

  updatePointerFromInteractionEvent(event: any): void {
    const global = event?.global ?? event?.data?.global;

    if (!global) {
      this.pointer.updateFromEvent(event);
      return;
    }

    const screen = {
      x: Number(global.x),
      y: Number(global.y),
    };
    if (!Number.isFinite(screen.x) || !Number.isFinite(screen.y)) {
      this.pointer.updateFromEvent(event);
      return;
    }

    const viewport = this.findViewportInstance();
    if (viewport && typeof viewport.toWorld === "function") {
      const point = viewport.toWorld(screen.x, screen.y);
      this.pointer.update(screen, { x: Number(point.x), y: Number(point.y) });
      return;
    }

    this.pointer.update(screen);
  }

  private findViewportInstance(): any {
    const find = (node: any): any => {
      if (!node) return undefined;
      if (typeof node?.toWorld === "function" || node?.constructor?.name === "Viewport") {
        return node;
      }
      for (const child of node.children ?? []) {
        const viewport = find(child);
        if (viewport) return viewport;
      }
      return undefined;
    };

    return find((this.canvasApp as any)?.stage);
  }

  private clearCameraFollowViewportPlugins(): void {
    const viewport = this.findViewportInstance();
    clearCameraFollowPlugins(viewport);
  }

  private prepareSyncPayload(
    data: any,
    ack?: { frame: number; serverTick?: number; x?: number; y?: number; direction?: Direction },
  ): {
    payload: any;
    localPredictionSnapshot?: PredictionState<Direction>;
  } {
    const payload = { ...(data ?? {}) };
    delete payload.ack;
    delete payload.timestamp;

    const myId = this.playerIdSignal();
    if (this.predictionEnabled && this.prediction) {
      const currentPlayer = this.sceneMap?.getCurrentPlayer?.();
      const currentState = currentPlayer ? this.getLocalPlayerState() : undefined;
      const routed = routePredictedLocalPlayerSync<Direction>(payload, myId, currentState, ack);
      if (routed.payload !== payload) {
        return {
          payload: routed.payload,
          ...(routed.snapshot ? { localPredictionSnapshot: routed.snapshot } : {}),
        };
      }
    }

    const players = payload.players;
    const localPatch = myId && players ? players[myId] : undefined;
    const shouldMaskLocalPosition = this.shouldPreserveLocalPlayerPosition(localPatch);
    if (shouldMaskLocalPosition && myId && players && players[myId]) {
      const localPatch = { ...players[myId] };
      delete localPatch.x;
      delete localPatch.y;
      delete localPatch.direction;
      delete localPatch._frames;
      payload.players = {
        ...players,
        [myId]: localPatch,
      };
    }

    return { payload };
  }

  private shouldPreserveLocalPlayerPosition(localPatch?: any): boolean {
    if (!localPatch) {
      return false;
    }
    if (this.predictionEnabled && !!this.prediction?.hasPendingInputs()) {
      return true;
    }
    return this.shouldKeepLocalPlayerMovement();
  }

  private shouldKeepLocalPlayerMovement(): boolean {
    if (!this.localMovementAuthority || this.mapTransitionInProgress) {
      return false;
    }
    const myId = this.playerIdSignal();
    const player = myId ? this.sceneMap?.players?.()?.[myId] : undefined;
    if (!player) {
      return false;
    }
    if (this.prediction?.hasPendingInputs()) {
      return true;
    }
    return Date.now() - this.lastLocalMovementInputAt <= this.LOCAL_MOVEMENT_AUTHORITY_ACK_GRACE_MS;
  }

  private initListeners() {
    if (this.socketListenersInitialized) return;
    this.socketListenersInitialized = true;

    this.webSocket.on("sync", (data) => {
      if (!this.tick) {
        this.pendingSyncPackets.push(data);
        return;
      }
      this.applySyncPacket(data);
    });

    // Handle pong responses for RTT measurement
    this.webSocket.on("pong", (data: { serverTick: number; clientFrame: number; clientTime: number }) => {
      const now = Date.now();
      this.rtt = now - data.clientTime;

      // Calculate frame offset: how many ticks ahead the server is compared to our frame counter
      // This helps us estimate which server tick corresponds to each client input frame
      const estimatedTicksInFlight = Math.floor(this.rtt / 2 / (1000 / 60)); // Estimate ticks during half RTT
      const estimatedServerTickNow = data.serverTick + estimatedTicksInFlight;
      this.updateServerTickEstimate(estimatedServerTickNow, now);

      // Update frame offset (only if we have inputs to calibrate with)
      if (this.inputFrameCounter > 0) {
        this.frameOffset = estimatedServerTickNow - data.clientFrame;
      }

      console.debug(`[Ping/Pong] RTT: ${this.rtt}ms, ServerTick: ${data.serverTick}, FrameOffset: ${this.frameOffset}`);
    });

    this.webSocket.on("changeMap", (data) => {
      if (!this.clientReadyForMapChanges) {
        this.pendingMapChanges.push(data);
        return;
      }
      this.handleChangeMap(data);
    });

    this.webSocket.on("showComponentAnimation", (data) => {
      const { params, object, position, id } = data;
      if (!object && position === undefined) {
        throw new Error("Please provide an object or x and y coordinates");
      }
      const player = object ? this.sceneMap.getObjectById(object) : undefined;
      this.getComponentAnimation(id).displayEffect(params, player || position)
    });

    this.webSocket.on("clientVisual", (data) => {
      this.playClientVisual(data);
    });

    this.webSocket.on("projectile:spawnBatch", (data) => {
      if (!this.shouldProcessProjectilePacket(data)) return;
      this.projectiles.spawnBatch(data?.projectiles ?? [], {
        mapId: data?.mapId,
        currentServerTick: this.estimateServerTick(),
        tickDurationMs: this.getPhysicsTickDurationMs(),
      });
    });

    this.webSocket.on("projectile:impactBatch", (data) => {
      if (!this.shouldProcessProjectilePacket(data)) return;
      this.projectiles.impactBatch(data?.impacts ?? [], {
        mapId: data?.mapId,
      });
    });

    this.webSocket.on("projectile:destroyBatch", (data) => {
      if (!this.shouldProcessProjectilePacket(data)) return;
      this.projectiles.destroyBatch(data?.projectiles ?? [], {
        mapId: data?.mapId,
      });
    });

    this.webSocket.on("projectile:clear", (data) => {
      if (!this.shouldProcessProjectilePacket(data)) return;
      this.projectiles.clear();
    });

    this.webSocket.on("notification", (data) => {
      this.notificationManager.add(data);
    });

    this.webSocket.on("setAnimation", (data) => {
      const {
        animationName,
        nbTimes,
        object,
        graphic,
        restoreAnimationName,
        restoreGraphics,
      } = data;
      const player = object ? this.sceneMap.getObjectById(object) : undefined;
      if (!player) return;
      const restoreOptions = {
        restoreAnimationName,
        restoreGraphics,
      };
      if (graphic !== undefined) {
        player.setAnimation(animationName, graphic, nbTimes, restoreOptions);
      } else {
        player.setAnimation(animationName, nbTimes, restoreOptions);
      }
    })

    this.webSocket.on("playSound", (data) => {
      const { soundId, volume, loop } = data;
      this.playSound(soundId, { volume, loop });
    });

    this.webSocket.on("stopSound", (data) => {
      const { soundId } = data;
      this.stopSound(soundId);
    });

    this.webSocket.on("stopAllSounds", () => {
      this.stopAllSounds();
    });

    this.webSocket.on("cameraFollow", (data) => {
      const { targetId, smoothMove } = data;
      this.setCameraFollow(targetId, smoothMove);
    });

    this.webSocket.on("flash", (data) => {
      const { object, type, duration, cycles, alpha, tint } = data;
      const sprite = object ? this.sceneMap.getObjectById(object) : undefined;
      if (sprite && typeof sprite.flash === 'function') {
        sprite.flash({ type, duration, cycles, alpha, tint });
      }
    });

    this.webSocket.on("shakeMap", (data) => {
      const { intensity, duration, frequency, direction } = data || {};
      this.mapShakeTrigger.start({
        intensity,
        duration,
        frequency,
        direction
      });
    });

    this.webSocket.on("weatherState", (data) => {
      const raw = (data && typeof data === "object" && "value" in data)
        ? (data as any).value
        : data;

      if (raw === null) {
        this.sceneMap.weatherState.set(null);
        return;
      }

      const validEffects = ["rain", "snow", "fog", "cloud"];
      if (!raw || !validEffects.includes((raw as any).effect)) {
        return;
      }

      this.sceneMap.weatherState.set({
        effect: (raw as any).effect,
        preset: (raw as any).preset,
        params: (raw as any).params,
        transitionMs: (raw as any).transitionMs,
        durationMs: (raw as any).durationMs,
        startedAt: (raw as any).startedAt,
        seed: (raw as any).seed,
      });
    });

    this.webSocket.on("lightingState", (data) => {
      const raw = (data && typeof data === "object" && "value" in data)
        ? (data as any).value
        : data;

      this.sceneMap.lightingState.set(normalizeLightingState(raw));
    });

    this.webSocket.on('open', () => {
      this.hooks.callHooks("client-engine-onConnected", this, this.socket).subscribe();
      // Start ping/pong for synchronization
      this.startPingPong();
    })

    this.webSocket.on('close', () => {
      this.hooks.callHooks("client-engine-onDisconnected", this, this.socket).subscribe();
      // Stop ping/pong when disconnected
      this.stopPingPong();
    })

    this.webSocket.on('error', (error) => {
      void this.callConnectError(error);
    })
  }

  private beginMapTransfer(
    nextMapId?: string,
    continueMovement = false,
  ) {
    this.pendingMapTransferInput = continueMovement
      ? this.latestDirectionalInput
      : undefined;
    this.mapTransitionInProgress = true;
    this.currentMapRoomId = nextMapId;
    this.sceneResetQueued = false;
    this.clearMapTransferPredictionStates();
  }

  private resetSceneForMapTransfer(nextMapId?: string) {
    // The before-loading hook has now covered the previous scene. Unmount it
    // before reconnecting so stale map content cannot appear behind the loader.
    this.sceneMap.data.set(null);
    this.sceneMap.weatherState.set(null);
    this.sceneMap.lightingState.set(null);
    this.sceneMap.clearLightSpots();
    this.clearComponentAnimations();
    this.projectiles.setMapId(nextMapId);
    this.resetCameraFollow(false);
    this.sceneMap.reset();
    this.sceneMap.loadPhysic();
  }

  private clearComponentAnimations() {
    this.componentAnimations.forEach((componentAnimation) => {
      componentAnimation.instance?.clear?.();
    });
  }

  private shouldProcessProjectilePacket(data: any): boolean {
    if (this.mapTransitionInProgress) return false;
    const packetMapId = normalizeRoomMapId(
      typeof data?.mapId === "string" ? data.mapId : undefined,
    );
    const currentMapId = normalizeRoomMapId(this.currentMapRoomId);
    return !packetMapId || !currentMapId || packetMapId === currentMapId;
  }

  private async callConnectError(error: any) {
    await lastValueFrom(this.hooks.callHooks("client-engine-onConnectError", this, error, this.socket));
  }

  private flushPendingSyncPackets() {
    const packets = this.pendingSyncPackets;
    this.pendingSyncPackets = [];
    packets.forEach((packet) => this.applySyncPacket(packet));
  }

  private flushPendingMapChanges() {
    const packets = this.pendingMapChanges;
    this.pendingMapChanges = [];
    packets.forEach((packet) => this.handleChangeMap(packet));
  }

  private handleChangeMap(data: any) {
    const nextMapId = typeof data?.mapId === "string" ? data.mapId : undefined;
    this.beginMapTransfer(nextMapId, data?.continueMovement === true);
    const transferToken = typeof data?.transferToken === "string" ? data.transferToken : undefined;
    this.loadScene(data.mapId, transferToken);
  }

  private applySyncPacket(data: any) {
    if (data.pId) {
      this.playerIdSignal.set(data.pId);
      // Signal that player ID was received
      this.playerIdReceived$.next(true);
    }

    if (this.sceneResetQueued) {
      const weatherState = this.sceneMap.weatherState();
      const lightingState = this.sceneMap.lightingState();
      this.sceneMap.reset();
      this.sceneMap.weatherState.set(weatherState);
      this.sceneMap.lightingState.set(lightingState);
      this.sceneMap.loadPhysic();
      this.sceneResetQueued = false;
    }

    // Apply client-side prediction filtering and server reconciliation
    this.hooks.callHooks("client-sceneMap-onChanges", this.sceneMap, { partial: data }).subscribe();

    const ack = data?.ack;
    const normalizedAck =
      ack && typeof ack.frame === "number" && Number.isFinite(ack.frame)
        ? ack
        : undefined;
    const { payload, localPredictionSnapshot } = this.prepareSyncPayload(data, normalizedAck);
    load(this.sceneMap, payload, true);
    applySyncedHitboxPayload(this.sceneMap, payload);

    if (normalizedAck) {
      this.applyServerAck(normalizedAck);
    }
    if (localPredictionSnapshot) {
      this.prediction?.queueServerSnapshot(localPredictionSnapshot);
    }

    applySyncedParamPayload(this.sceneMap, payload);

    // Check if players and events are present in sync data
    const players = payload.players || this.sceneMap.players();
    if (players && Object.keys(players).length > 0) {
      this.playersReceived$.next(true);
    }

    const events = payload.events || this.sceneMap.events();
    if (events !== undefined) {
      this.eventsReceived$.next(true);
    }
  }

  /**
   * Start periodic ping/pong for client-server synchronization
   * 
   * Sends ping requests to the server to measure round-trip time (RTT) and
   * calculate the frame offset between client and server ticks.
   * 
   * ## Design
   * 
   * - Sends ping every 5 seconds
   * - Measures RTT for latency compensation
   * - Calculates frame offset to map client frames to server ticks
   * - Used for accurate server reconciliation
   * 
   * @example
   * ```ts
   * // Called automatically when connection opens
   * this.startPingPong();
   * ```
   */
  private startPingPong(): void {
    // Stop existing interval if any
    this.stopPingPong();

    // Send initial ping immediately
    this.sendPing();

    // Set up periodic pings
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, this.PING_INTERVAL_MS);
  }

  /**
   * Stop periodic ping/pong
   * 
   * Stops the ping interval when disconnecting or changing maps.
   * 
   * @example
   * ```ts
   * // Called automatically when connection closes
   * this.stopPingPong();
   * ```
   */
  private stopPingPong(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Send a ping request to the server
   * 
   * Sends current client time and frame counter to the server,
   * which will respond with its server tick for synchronization.
   * 
   * @example
   * ```ts
   * // Send a ping to measure RTT
   * this.sendPing();
   * ```
   */
  private sendPing(): void {
    const clientTime = Date.now();
    const clientFrame = this.getPhysicsTick();

    this.webSocket.emit('ping', {
      clientTime,
      clientFrame
    });
  }

  private async loadScene(mapId: string, transferToken?: string) {
    // Keep the previous scene mounted while async before-loading hooks install
    // and animate their transition UI. The hook contract is awaited, allowing
    // modules to report when the old scene is fully covered.
    await lastValueFrom(this.hooks.callHooks("client-sceneMap-onBeforeLoading", this.sceneMap));

    this.activeMapStreamController?.detach();
    this.activeMapStreamController = undefined;
    if (this.mapTransitionInProgress) {
      this.resetSceneForMapTransfer(mapId);
    }

    // A session-transferred player keeps the last acknowledged input frame on
    // the server. Preserve the client's monotonic frame sequence so movement
    // sent in the destination room is not discarded as stale.
    if (this.mapTransitionInProgress) {
      this.clearMapTransferPredictionStates();
    } else {
      this.clearClientPredictionStates();
    }

    // Reset all conditions for new map loading
    this.mapLoadCompleted$.next(false);
    this.playerIdReceived$.next(false);
    this.playersReceived$.next(false);
    this.eventsReceived$.next(false);

    // Unsubscribe previous subscription if exists
    if (this.onAfterLoadingSubscription) {
      this.onAfterLoadingSubscription.unsubscribe();
    }

    // Setup RxJS observable to wait for all conditions
    this.setupOnAfterLoadingObserver();

    this.webSocket.updateProperties({
      room: mapId,
      query: transferToken ? { transferToken } : undefined,
    })
    try {
      await this.webSocket.reconnect()
    }
    catch (error) {
      this.mapTransitionInProgress = false;
      this.pendingMapTransferInput = undefined;
      this.stopPingPong();
      await this.callConnectError(error);
      throw error;
    }
    const res = await this.loadMapService.load(mapId)
    const loadedLighting = typeof res?.lighting !== "undefined"
      ? res.lighting
      : res?.data?.lighting;
    if (typeof loadedLighting !== "undefined") {
      this.sceneMap.lightingState.set(normalizeLightingState(loadedLighting));
    }
    this.sceneMap.data.set(res)
    
    // Check if playerId is already present
    if (this.playerIdSignal()) {
      this.playerIdReceived$.next(true);
    }
    
    // Check if players and events are already present in sceneMap
    const players = this.sceneMap.players();
    if (players && Object.keys(players).length > 0) {
      this.playersReceived$.next(true);
    }
    
    const events = this.sceneMap.events();
    if (events !== undefined) {
      this.eventsReceived$.next(true);
    }
    
    // Signal that map loading is completed (this should be last to ensure other checks are done)
    this.mapLoadCompleted$.next(true);
    this.currentMapRoomId = mapId;
    this.mapTransitionInProgress = false;
    this.sceneMap.configureClientPrediction(this.predictionEnabled);
    this.sceneMap.loadPhysic()
    if (res?.streamController) {
      const controller = res.streamController;
      this.activeMapStreamController = controller;
      controller.attach(this.sceneMap);
    }
    const transferInput = this.pendingMapTransferInput;
    this.pendingMapTransferInput = undefined;
    if (transferInput !== undefined) {
      void this.resumeMapTransferMovement(transferInput, mapId);
    }
  }

  private async resumeMapTransferMovement(
    input: RpgMovementInput,
    mapId: string,
  ): Promise<void> {
    const repeatCount = 4;
    const repeatIntervalMs = 50;
    for (let index = 0; index < repeatCount; index += 1) {
      if (this.mapTransitionInProgress || this.currentMapRoomId !== mapId) return;
      await this.processInput({ input });
      if (index < repeatCount - 1) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, repeatIntervalMs),
        );
      }
    }
  }

  addSpriteSheet<T = any>(spritesheetClass: any, id?: string): any {
    this.spritesheets.set(id || spritesheetClass.id, spritesheetClass);
    return spritesheetClass as any;
  }

  /**
   * Set a resolver function for spritesheets
   * 
   * The resolver is called when a spritesheet is requested but not found in the cache.
   * It can be synchronous (returns directly) or asynchronous (returns a Promise).
   * The resolved spritesheet is automatically cached for future use.
   * 
   * @param resolver - Function that takes a spritesheet ID and returns a spritesheet or Promise of spritesheet
   * 
   * @example
   * ```ts
   * // Synchronous resolver
   * engine.setSpritesheetResolver((id) => {
   *   if (id === 'dynamic-sprite') {
   *     return { id: 'dynamic-sprite', image: 'path/to/image.png', framesWidth: 32, framesHeight: 32 };
   *   }
   *   return undefined;
   * });
   * 
   * // Asynchronous resolver (loading from API)
   * engine.setSpritesheetResolver(async (id) => {
   *   const response = await fetch(`/api/spritesheets/${id}`);
   *   const data = await response.json();
   *   return data;
   * });
   * ```
   */
  setSpritesheetResolver(resolver: (id: string | number) => any | Promise<any>): void {
    this.spritesheetResolver = resolver;
  }

  /**
   * Get a spritesheet by ID, using resolver if not found in cache
   * 
   * This method first checks if the spritesheet exists in the cache.
   * If not found and a resolver is set, it calls the resolver to create the spritesheet.
   * The resolved spritesheet is automatically cached for future use.
   * 
   * @param id - The spritesheet ID or legacy tile ID to retrieve
   * @returns The spritesheet if found or created, or undefined if not found and no resolver
   * @returns Promise<any> if the resolver is asynchronous
   * 
   * @example
   * ```ts
   * // Synchronous usage
   * const spritesheet = engine.getSpriteSheet('my-sprite');
   * 
   * // Asynchronous usage (when resolver returns Promise)
   * const spritesheet = await engine.getSpriteSheet('dynamic-sprite');
   * ```
   */
  getSpriteSheet(id: string | number): any | Promise<any> {
    // Check cache first
    if (this.spritesheets.has(id)) {
      return this.spritesheets.get(id);
    }

    // If not in cache and resolver exists, use it
    if (this.spritesheetResolver) {
      if (this.spritesheetPromises.has(id)) {
        return this.spritesheetPromises.get(id);
      }

      const result = this.spritesheetResolver(id);

      // Check if result is a Promise
      if (result instanceof Promise) {
        const promise = result
          .then((spritesheet) => {
            if (spritesheet) {
              // Cache the resolved spritesheet
              this.spritesheets.set(id, spritesheet);
            }
            this.spritesheetPromises.delete(id);
            return spritesheet;
          })
          .catch((error) => {
            this.spritesheetPromises.delete(id);
            throw error;
          });
        this.spritesheetPromises.set(id, promise);
        return promise;
      } else {
        // Synchronous result
        if (result) {
          // Cache the resolved spritesheet
          this.spritesheets.set(id, result);
        }
        return result;
      }
    }

    // No resolver and not in cache
    return undefined;
  }

  /**
   * Add a sound to the engine
   * 
   * Adds a sound to the engine's sound cache. The sound can be:
   * - A simple object with `id` and `src` properties
   * - A Howler instance
   * - An object with a `play()` method
   * 
   * If the sound has a `src` property, a Howler instance will be created automatically.
   * 
   * @param sound - The sound object or Howler instance
   * @param id - Optional sound ID (if not provided, uses sound.id)
   * @returns The added sound
   * 
   * @example
   * ```ts
   * // Simple sound object
   * engine.addSound({ id: 'click', src: 'click.mp3' });
   * 
   * // With explicit ID
   * engine.addSound({ src: 'music.mp3' }, 'background-music');
   * ```
   */
  addSound(sound: any, id?: string): any {
    const soundId = id || sound.id;
    
    if (!soundId) {
      console.warn('Sound added without an ID. It will not be retrievable.');
      return sound;
    }

    // If sound has a src property, create a Howler instance
    if (sound.src && typeof sound.src === 'string') {
      const howlOptions: any = {
        src: [sound.src],
        loop: sound.loop || false,
        volume: sound.volume !== undefined ? sound.volume : 1.0,
      };

      const howl = new (Howl as any).Howl(howlOptions);
      this.sounds.set(soundId, howl);
      return howl;
    }

    // If sound already has a play method (Howler instance or custom), use it directly
    if (sound && typeof sound.play === 'function') {
      this.sounds.set(soundId, sound);
      return sound;
    }

    // Otherwise, store as-is
    this.sounds.set(soundId, sound);
    return sound;
  }

  /**
   * Set a resolver function for sounds
   * 
   * The resolver is called when a sound is requested but not found in the cache.
   * It can be synchronous (returns directly) or asynchronous (returns a Promise).
   * The resolved sound is automatically cached for future use.
   * 
   * @param resolver - Function that takes a sound ID and returns a sound or Promise of sound
   * 
   * @example
   * ```ts
   * // Synchronous resolver
   * engine.setSoundResolver((id) => {
   *   if (id === 'dynamic-sound') {
   *     return { id: 'dynamic-sound', src: 'path/to/sound.mp3' };
   *   }
   *   return undefined;
   * });
   * 
   * // Asynchronous resolver (loading from API)
   * engine.setSoundResolver(async (id) => {
   *   const response = await fetch(`/api/sounds/${id}`);
   *   const data = await response.json();
   *   return data;
   * });
   * ```
   */
  setSoundResolver(resolver: (id: string) => any | Promise<any>): void {
    this.soundResolver = resolver;
  }

  /**
   * Get a sound by ID, using resolver if not found in cache
   * 
   * This method first checks if the sound exists in the cache.
   * If not found and a resolver is set, it calls the resolver to create the sound.
   * The resolved sound is automatically cached for future use.
   * 
   * @param id - The sound ID to retrieve
   * @returns The sound if found or created, or undefined if not found and no resolver
   * @returns Promise<any> if the resolver is asynchronous
   * 
   * @example
   * ```ts
   * // Synchronous usage
   * const sound = engine.getSound('my-sound');
   * 
   * // Asynchronous usage (when resolver returns Promise)
   * const sound = await engine.getSound('dynamic-sound');
   * ```
   */
  getSound(id: string): any | Promise<any> {
    // Check cache first
    if (this.sounds.has(id)) {
      return this.sounds.get(id);
    }

    // If not in cache and resolver exists, use it
    if (this.soundResolver) {
      const result = this.soundResolver(id);

      // Check if result is a Promise
      if (result instanceof Promise) {
        return result.then((sound) => {
          if (sound) {
            // Cache the resolved sound
            this.sounds.set(id, sound);
          }
          return sound;
        });
      } else {
        // Synchronous result
        if (result) {
          // Cache the resolved sound
          this.sounds.set(id, result);
        }
        return result;
      }
    }

    // No resolver and not in cache
    return undefined;
  }

  /** @internal Configure project-owned preferences and semantic cues for framework modules. */
  private configureSound(configuration: RpgSoundConfiguration = {}): void {
    this.audio.configure(configuration);
  }

  /** @internal Play a semantic sound used by RPGJS native interfaces. */
  private playUiSound(event: RpgUiAudioEvent): void {
    void this.audio.playUi(event);
  }

  /**
   * Set the persisted volume of one sound channel for the current project.
   * Master volume is applied through Howler, including sounds controlled through
   * the legacy `RpgSound.global` facade. This client-owned preference behaves the
   * same in standalone and MMORPG games and never changes server state.
   *
   * @title setSoundVolume
   * @method setSoundVolume(channel: RpgAudioChannel, value: number): void
   * @param {RpgAudioChannel} channel - Channel to update.
   * @param {number} value - Volume between 0 and 1; out-of-range values are clamped.
   * @returns {void}
   * @memberof RpgClientEngine
   * @example
   * ```ts
   * engine.setSoundVolume('music', 0.6)
   * engine.setSoundVolume('master', 0.8)
   * ```
   */
  setSoundVolume(channel: RpgAudioChannel, value: number): void {
    this.audio.setVolume(channel, value);
  }

  /**
   * Read the persisted volume of one sound channel for the current project.
   * Calls made inside a CanvasEngine computed value remain reactive.
   *
   * @title getSoundVolume
   * @method getSoundVolume(channel: RpgAudioChannel): number
   * @param {RpgAudioChannel} channel - Channel to read.
   * @returns {number} Volume between 0 and 1.
   * @memberof RpgClientEngine
   * @example
   * ```ts
   * const musicVolume = engine.getSoundVolume('music')
   * ```
   */
  getSoundVolume(channel: RpgAudioChannel): number {
    return this.audio.getVolume(channel);
  }

  /**
   * Play a sound by its ID
   * 
   * This method retrieves a sound from the cache or resolver and plays it.
   * If the sound is not found, it will attempt to resolve it using the soundResolver.
   * Uses Howler.js for audio playback instead of native Audio elements.
   * 
   * The existing API remains the single entry point for ordinary, channel-aware,
   * and spatial sounds. Playback is client-owned in both standalone and MMORPG
   * games; server calls only ask the receiving client to play a registered ID.
   * 
   * @example
   * ```ts
   * // Play a sound synchronously
   * engine.playSound('item-pickup');
   * 
   * // Play a sound with volume and loop
   * engine.playSound('background-music', { volume: 0.5, loop: true });
   * 
   * // Play a sound asynchronously (when resolver returns Promise)
   * await engine.playSound('dynamic-sound', { volume: 0.8 });
   *
   * // Play a spatial sound without exposing CanvasEngine signals
   * await engine.playSound('enemy-hit', {
   *   channel: 'sfx',
   *   position: { x: enemy.x(), y: enemy.y() },
   *   listener: { x: player.x(), y: player.y() },
   * });
   * ```
   * @title playSound
   * @method playSound(soundId: string, options?: RpgPlaySoundOptions): Promise<void>
   * @param {string} soundId - Registered sound ID or ID handled by the sound resolver.
   * @param {RpgPlaySoundOptions} [options] - Playback, channel, and spatial options.
   * @returns {Promise<void>} Resolves after the sound has been resolved and started when available.
   * @memberof RpgClientEngine
   */
  async playSound(soundId: string, options: RpgPlaySoundOptions = {}): Promise<void> {
    const played = await this.audio.play(soundId, options);
    if (played === undefined) {
      console.warn(`Sound with id "${soundId}" not found or cannot be played`);
    }
  }

  /**
   * Stop a sound that is currently playing
   * 
   * This method stops a sound that was previously started with `playSound()`.
   * 
   * @param soundId - The sound ID to stop
   * 
   * @example
   * ```ts
   * // Start a looping sound
   * engine.playSound('background-music', { loop: true });
   * 
   * // Later, stop it
   * engine.stopSound('background-music');
   * ```
   */
  stopSound(soundId: string): void {
    const sound = this.sounds.get(soundId);
    if (sound && sound.stop) {
      sound.stop();
    } else {
      console.warn(`Sound with id "${soundId}" not found or cannot be stopped`);
    }
  }

  /**
   * Stop all currently playing sounds
   * 
   * This method stops all sounds that are currently playing.
   * Useful when changing maps to prevent sound overlap.
   * 
   * @example
   * ```ts
   * // Stop all sounds
   * engine.stopAllSounds();
   * ```
   */
  stopAllSounds(): void {
    this.sounds.forEach((sound) => {
      if (sound && sound.stop) {
        sound.stop();
      }
    });
  }

  /**
   * Set the camera to follow a specific sprite
   * 
   * This method changes which sprite the camera viewport should follow.
   * The camera can smoothly animate to the target sprite before continuous follow starts.
   * 
   * ## Design
   * 
   * The camera follow target is stored in a signal that is read by sprite components.
   * Each sprite checks if it should be followed by comparing its ID with the target ID.
   * When smoothMove options are provided, the transition is handled by pixi-viewport's
   * animation plugin, then continuous follow is handled by CanvasEngine's viewport system.
   * 
   * @param targetId - The ID of the sprite to follow. Set to null to follow the current player
   * @param smoothMove - Animation options. Can be a boolean (default: true) or an object with time and ease
   * @param smoothMove.time - Duration of the animation in milliseconds (optional)
   * @param smoothMove.ease - Easing function name from https://easings.net (optional)
   * @param smoothMove.speed - Continuous follow speed after the transition (optional)
   * @param smoothMove.acceleration - Continuous follow acceleration after the transition (optional)
   * @param smoothMove.radius - Center radius where the target can move without moving the viewport (optional)
   * 
   * @example
   * ```ts
   * // Follow another player with default smooth animation
   * engine.setCameraFollow(otherPlayerId, true);
   * 
   * // Follow an event with custom smooth animation
   * engine.setCameraFollow(eventId, {
   *   time: 1000,
   *   ease: "easeInOutQuad"
   * });
   * 
   * // Follow without animation (instant)
   * engine.setCameraFollow(targetId, false);
   * 
   * // Return to following current player
   * engine.setCameraFollow(null);
   * ```
   */
  setCameraFollow(
    targetId: string | null,
    smoothMove?: CameraFollowSmoothMove
  ): void {
    this.clearCameraFollowViewportPlugins();
    this.cameraFollowSmoothMove = smoothMove ?? true;
    this.cameraFollowTargetId.set(targetId);
    this.cameraFollowRevision.set(this.cameraFollowRevision() + 1);
  }

  private resetCameraFollow(smoothMove: CameraFollowSmoothMove = false): void {
    this.clearCameraFollowViewportPlugins();
    this.cameraFollowSmoothMove = smoothMove;
    this.cameraFollowTargetId.set(null);
    this.cameraFollowRevision.set(this.cameraFollowRevision() + 1);
  }

  addParticle(particle: any) {
    this.particleSettings.emitters.push(particle)
    return particle;
  }

  /**
   * Add a component to render behind sprites
   * Components added with this method will be displayed with a lower z-index than the sprite
   * 
   * Supports multiple formats:
   * 1. Direct component: `ShadowComponent`
   * 2. Configuration object: `{ component: LightHalo, props: {...} }`
   * 3. With dynamic props: `{ component: LightHalo, props: (object) => {...} }`
   * 4. With dependencies: `{ component: HealthBar, dependencies: (object) => [object.hp, object.param.maxHp] }`
   * 
   * Components with dependencies will only be displayed when all dependencies are resolved (!= undefined).
   * The object (sprite) is passed to the dependencies function to allow sprite-specific dependency resolution.
   * 
   * @param component - The component to add behind sprites, or a configuration object
   * @param component.component - The component function to render
   * @param component.props - Static props object or function that receives the sprite object and returns props
   * @param component.dependencies - Function that receives the sprite object and returns an array of Signals
   * @returns The added component or configuration
   * 
   * @example
   * ```ts
   * // Add a shadow component behind all sprites
   * engine.addSpriteComponentBehind(ShadowComponent);
   * 
   * // Add a component with static props
   * engine.addSpriteComponentBehind({ 
   *   component: LightHalo, 
   *   props: { radius: 30 } 
   * });
   * 
   * // Add a component with dynamic props and dependencies
   * engine.addSpriteComponentBehind({ 
   *   component: HealthBar, 
   *   props: (object) => ({ hp: object.hp(), maxHp: object.param.maxHp() }),
   *   dependencies: (object) => [object.hp, object.param.maxHp]
   * });
   * ```
   */
  addSpriteComponentBehind(component: any) {
    this.spriteComponentsBehind.update((components: any[]) => [...components, component])
    return component
  }

  /**
   * Add a component to render in front of sprites
   * Components added with this method will be displayed with a higher z-index than the sprite
   * 
   * Supports multiple formats:
   * 1. Direct component: `HealthBarComponent`
   * 2. Configuration object: `{ component: StatusIndicator, props: {...} }`
   * 3. With dynamic props: `{ component: HealthBar, props: (object) => {...} }`
   * 4. With dependencies: `{ component: HealthBar, dependencies: (object) => [object.hp, object.param.maxHp] }`
   * 
   * Components with dependencies will only be displayed when all dependencies are resolved (!= undefined).
   * The object (sprite) is passed to the dependencies function to allow sprite-specific dependency resolution.
   * 
   * @param component - The component to add in front of sprites, or a configuration object
   * @param component.component - The component function to render
   * @param component.props - Static props object or function that receives the sprite object and returns props
   * @param component.dependencies - Function that receives the sprite object and returns an array of Signals
   * @returns The added component or configuration
   * 
   * @example
   * ```ts
   * // Add a health bar component in front of all sprites
   * engine.addSpriteComponentInFront(HealthBarComponent);
   * 
   * // Add a component with static props
   * engine.addSpriteComponentInFront({ 
   *   component: StatusIndicator, 
   *   props: { type: 'poison' } 
   * });
   * 
   * // Add a component with dynamic props and dependencies
   * engine.addSpriteComponentInFront({ 
   *   component: HealthBar, 
   *   props: (object) => ({ hp: object.hp(), maxHp: object.param.maxHp() }),
   *   dependencies: (object) => [object.hp, object.param.maxHp]
   * });
   * ```
   */
  addSpriteComponentInFront(component: any | { component: any, props: (object: any) => any, dependencies?: (object: any) => any[] }) {
    this.spriteComponentsInFront.update((components: any[]) => [...components, component])
    return component
  }

  /**
   * Register a reusable sprite component that can be addressed by the server.
   *
   * Server-side component definitions only carry the component id and
   * serializable props. The client registry maps that id to the CanvasEngine
   * component that performs the actual rendering.
   *
   * @param id - Stable component id used by server component definitions
   * @param component - CanvasEngine component to render for this id
   * @returns The registered component
   *
   * @example
   * ```ts
   * engine.registerSpriteComponent('guildBadge', GuildBadgeComponent);
   * ```
   */
  registerSpriteComponent(id: string, component: any) {
    this.spriteComponents.set(id, component);
    return component;
  }

  /**
   * Get a reusable sprite component by id.
   *
   * @param id - Component id registered on the client
   * @returns The CanvasEngine component, or undefined when missing
   */
  getSpriteComponent(id: string) {
    return this.spriteComponents.get(id);
  }

  /**
   * Register a custom event component resolver.
   *
   * The last resolver returning a component wins. This lets later modules
   * override earlier defaults without replacing the whole map scene.
   *
   * @param resolver - Function receiving the synced event object
   * @returns The registered resolver
   */
  addEventComponentResolver(resolver: EventComponentResolver) {
    return this.eventComponentResolvers.add(resolver);
  }

  /**
   * Resolve the custom CanvasEngine component for an event, if any.
   *
   * @param event - Synced client event object
   * @returns The component/config returned by the last matching resolver
   */
  resolveEventComponent(event: RpgClientEvent): EventComponentConfig | null {
    return this.eventComponentResolvers.resolve(event);
  }

  registerProjectileComponent(type: string, component: any) {
    return this.projectiles.register(type, component);
  }

  getProjectileComponent(type: string) {
    return this.projectiles.get(type);
  }

  /**
   * Register a named client visual macro.
   *
   * Client visuals are small client-side functions that group existing visual
   * primitives such as flash, sound, component animations, sprite animation, or
   * map shake. The server sends only the visual name and a serializable payload.
   *
   * @param name - Stable visual name sent by the server
   * @param handler - Client-side visual handler
   * @returns The registered handler
   */
  registerClientVisual(name: string, handler: ClientVisualHandler) {
    return this.clientVisuals.register(name, handler);
  }

  /**
   * Register several named client visual macros.
   *
   * @param visuals - Map of visual names to client-side handlers
   */
  registerClientVisuals(visuals: ClientVisualMap) {
    this.clientVisuals.registerMany(visuals);
  }

  /**
   * Play a registered client visual locally.
   *
   * This is also used by the websocket listener when the server calls
   * `player.clientVisual()` or `map.clientVisual()`.
   *
   * @param packet - Visual name and serializable payload
   */
  playClientVisual(packet: ClientVisualPacket) {
    return this.clientVisuals.play(packet, this);
  }

  /**
   * Add a component animation to the engine
   * 
   * Component animations are temporary visual effects that can be displayed
   * on sprites or objects, such as hit indicators, spell effects, or status animations.
   * 
   * @param componentAnimation - The component animation configuration
   * @param componentAnimation.id - Unique identifier for the animation
   * @param componentAnimation.component - The component function to render
   * @returns The added component animation configuration
   * 
   * @example
   * ```ts
   * // Add a hit animation component
   * engine.addComponentAnimation({
   *   id: 'hit',
   *   component: HitComponent
   * });
   * 
   * // Add an explosion effect component
   * engine.addComponentAnimation({
   *   id: 'explosion',
   *   component: ExplosionComponent
   * });
   * ```
   */
  addComponentAnimation(componentAnimation: {
    component: any,
    id: string
  }) {
    const instance = new AnimationManager()
    this.componentAnimations.push({
      id: componentAnimation.id,
      component: componentAnimation.component,
      instance: instance,
      current: instance.current
    })
    return componentAnimation;
  }

  /**
   * Get a component animation by its ID
   * 
   * Retrieves the EffectManager instance for a specific component animation,
   * which can be used to display the animation on sprites or objects.
   * 
   * @param id - The unique identifier of the component animation
   * @returns The EffectManager instance for the animation
   * @throws Error if the component animation is not found
   * 
   * @example
   * ```ts
   * // Get the hit animation and display it
   * const hitAnimation = engine.getComponentAnimation('hit');
   * hitAnimation.displayEffect({ text: "Critical!" }, player);
   * ```
   */
  getComponentAnimation(id: string): AnimationManager {
    const componentAnimation = this.componentAnimations.find((componentAnimation) => componentAnimation.id === id)
    if (!componentAnimation) {
      throw new Error(`Component animation with id ${id} not found`)
    }
    return componentAnimation.instance
  }

  /**
   * Start a transition
   * 
   * Convenience method to display a transition by its ID using the GUI system.
   * 
   * @param id - The unique identifier of the transition to start
   * @param props - Props to pass to the transition component
   * 
   * @example
   * ```ts
   * // Start a fade transition
   * engine.startTransition('fade', { duration: 1000, color: 'black' });
   * 
   * // Start with onFinish callback
   * engine.startTransition('fade', {
   *   duration: 1000,
   *   onFinish: () => console.log('Fade complete')
   * });
   *
   * // Wait until the transition component calls onFinish
   * await engine.startTransition('fade', { duration: 1000 });
   * ```
   */
  startTransition(id: string, props: any = {}): Promise<void> {
    if (!this.guiService.exists(id)) {
      throw new Error(`Transition with id ${id} not found. Make sure to add it using engine.addTransition() or in your module's transitions property.`);
    }
    return new Promise<void>((resolve) => {
      let finished = false;
      const finish = (data?: any) => {
        if (finished) return;
        finished = true;
        props?.onFinish?.(data);
        resolve();
      };

      this.guiService.display(id, {
        ...props,
        onFinish: finish,
      });
    });
  }

  async processInput({ input }: { input: RpgMovementInput }) {
    if (this.stopProcessingInput) return;

    const currentPlayer = this.sceneMap.getCurrentPlayer() as any;
    const canMove =
      !currentPlayer ||
      getCanMoveValue(currentPlayer);
    if (!canMove) {
      this.interruptCurrentPlayerMovement(currentPlayer);
      return;
    }

    const timestamp = Date.now();
    const movementInput = isDashInput(input)
      ? normalizeDashInput(input, currentPlayer?.direction?.())
      : input;
    if (!movementInput) return;
    if (!isDashInput(movementInput)) {
      this.latestDirectionalInput = movementInput;
    }
    if (isDashInput(movementInput)) {
      const cooldown = movementInput.cooldown ?? DEFAULT_DASH_COOLDOWN_MS;
      if (timestamp < this.dashLockedUntil) return;
      this.dashLockedUntil = timestamp + cooldown;
    }
    this.lastLocalMovementInputAt = timestamp;

    let frame: number;
    let tick: number;
    if (this.predictionEnabled && this.prediction) {
      const meta = this.prediction.recordInput(movementInput, timestamp);
      frame = meta.frame;
      tick = meta.tick;
    } else {
      frame = ++this.inputFrameCounter;
      tick = this.getPhysicsTick();
    }
    this.inputFrameCounter = frame;
    this.hooks.callHooks("client-engine-onInput", this, { input: movementInput, playerId: this.playerId }).subscribe();

    const bodyReady = this.ensureCurrentPlayerBody();
    let waitsForPredictionStep = false;
    if (currentPlayer && bodyReady) {
      this.applyPredictedMovementInput(currentPlayer, movementInput);
      if (this.predictionEnabled && this.prediction) {
        this.pendingPredictionFrames.push(frame);
        if (this.pendingPredictionFrames.length > 240) {
          this.pendingPredictionFrames = this.pendingPredictionFrames.slice(-240);
        }
        waitsForPredictionStep = true;
      }
    }

    // Prediction input can be sampled more often than the fixed physics loop.
    // Wait for that loop to attach the resulting state so every input sharing
    // one client tick is sent to the server as one complete batch.
    if (!waitsForPredictionStep) {
      this.emitMovePacket(movementInput, frame, tick, timestamp, true);
    }
    this.lastInputTime = isDashInput(movementInput)
      ? Date.now() + (movementInput.duration ?? DEFAULT_DASH_DURATION_MS)
      : Date.now();
  }

  /**
   * Start a predicted dash for the current player and send it through the
   * authoritative movement channel.
   *
   * @title processDash
   * @method processDash(input?: Partial<RpgDashInput>): Promise<void>
   * @param input - Optional direction, speed, duration, and cooldown overrides.
   * @returns A promise resolved after the dash input has been processed locally.
   * @memberof RpgClientEngine
   * @example
   * ```ts
   * await engine.processDash({
   *   direction: { x: 1, y: 0 },
   *   additionalSpeed: 10,
   *   duration: 220,
   *   cooldown: 600,
   * })
   * ```
   */
  async processDash(input: Partial<RpgDashInput> = {}): Promise<void> {
    const currentPlayer = this.sceneMap.getCurrentPlayer() as any;
    const fallbackDirection =
      typeof currentPlayer?.direction === "function"
        ? currentPlayer.direction()
        : currentPlayer?.direction;
    const dashInput = normalizeDashInput(
      { ...this.dashDefaults, ...input },
      fallbackDirection
    );
    if (!dashInput) return;
    await this.processInput({ input: dashInput });
  }

  /**
   * Send an action intent to the authoritative server. Client-provided data
   * must be validated by the receiving player input handler or action.
   *
   * @title processAction
   * @method processAction(action: RpgActionName | RpgActionInput, data?: any): void
   * @param action - Action name/control value, or a normalized action object.
   * @param data - Optional serializable context sent with an action name.
   * @returns Nothing.
   * @memberof RpgClientEngine
   * @example
   * ```ts
   * engine.processAction('projectile:shoot', {
   *   target: engine.pointer.world(),
   *   source: 'map-click',
   * })
   * ```
   */
  processAction(action: RpgActionName, data?: any): void;
  processAction(action: RpgActionInput): void;
  processAction(action: RpgActionName | RpgActionInput, data?: any): void {
    if (this.stopProcessingInput) return;
    const currentPlayer = this.sceneMap.getCurrentPlayer() as any;
    const canMove =
      !currentPlayer ||
      getCanMoveValue(currentPlayer);
    if (!canMove) return;

    const payload = normalizeActionInput(action as any, data);

    this.hooks.callHooks("client-engine-onInput", this, {
      input: payload.action,
      action: payload.action,
      data: payload.data,
      playerId: this.playerId,
    }).subscribe();
    this.webSocket.emit('action', payload)
  }

  get PIXI() {
    return PIXI
  }

  get socket() {
    return this.webSocket
  }

  get playerId() {
    return this.playerIdSignal()
  }

  get scene() {
    return this.sceneMap
  }

  getObjectById(id: string) {
    return this.sceneMap?.getObjectById(id);
  }

  private getPhysicsTick(): number {
    return (this.sceneMap as any)?.getTick?.() ?? 0;
  }

  private getPhysicsTickDurationMs(): number {
    const timeStep = (this.sceneMap as any)?.physic?.getWorld?.()?.getTimeStep?.();
    return typeof timeStep === "number" && Number.isFinite(timeStep) && timeStep > 0
      ? timeStep * 1000
      : 1000 / 60;
  }

  private updateServerTickEstimate(serverTick: number | undefined, now = Date.now()): void {
    if (typeof serverTick !== "number" || !Number.isFinite(serverTick)) {
      return;
    }
    this.latestServerTick = serverTick;
    this.latestServerTickAt = now;
  }

  private estimateServerTick(now = Date.now()): number | undefined {
    if (typeof this.latestServerTick !== "number" || this.latestServerTickAt <= 0) {
      return undefined;
    }
    const elapsedTicks = Math.max(0, (now - this.latestServerTickAt) / this.getPhysicsTickDurationMs());
    return this.latestServerTick + elapsedTicks;
  }

  private predictProjectileImpact(projectile: ClientProjectileSpawn): ClientProjectileImpact | null {
    if (projectile.predictImpact === false) {
      return null;
    }
    const sceneMap = this.sceneMap as any;
    if (!sceneMap?.physic || !Number.isFinite(projectile.range) || projectile.range <= 0) {
      return null;
    }
    const origin = projectile.origin;
    const direction = projectile.direction;
    if (
      !origin ||
      !direction ||
      !Number.isFinite(origin.x) ||
      !Number.isFinite(origin.y) ||
      !Number.isFinite(direction.x) ||
      !Number.isFinite(direction.y) ||
      (direction.x === 0 && direction.y === 0)
    ) {
      return null;
    }

    const hit = sceneMap.physic.raycast(
      new Vector2(origin.x, origin.y),
      new Vector2(direction.x, direction.y),
      projectile.range,
      projectile.collisionMask,
      (entity) => projectile.ignoreOwner === false || !projectile.ownerId || entity.uuid !== projectile.ownerId,
    );
    if (!hit) {
      return null;
    }
    return {
      id: projectile.id,
      targetId: hit.entity.uuid,
      x: hit.point.x,
      y: hit.point.y,
      distance: hit.distance,
    };
  }

  private ensureCurrentPlayerBody(): boolean {
    const player = this.sceneMap?.getCurrentPlayer();
    const myId = this.playerIdSignal();
    if (!player || !myId) {
      return false;
    }
    if (!player.id) {
      player.id = myId;
    }
    if (this.sceneMap.getBody(myId)) {
      return true;
    }
    try {
      this.sceneMap.loadPhysic();
    } catch (error) {
      console.error("[RPGJS] Unable to initialize client physics before input:", error);
      return false;
    }
    return !!this.sceneMap.getBody(myId);
  }

  private stepClientPhysicsTick(): void {
    if (!this.predictionEnabled || !this.sceneMap) {
      return;
    }
    const now = Date.now();
    if (this.lastClientPhysicsStepAt === 0) {
      this.lastClientPhysicsStepAt = now;
    }
    const deltaMs = Math.max(1, Math.min(100, now - this.lastClientPhysicsStepAt));
    this.lastClientPhysicsStepAt = now;
    this.sceneMap.stepClientPhysics(deltaMs, {
      // A slow render can execute several fixed physics steps at once. An input
      // frame belongs to the first of those steps, which is also where the
      // authoritative server captures its matching ACK position.
      afterStep: () => this.flushPendingPredictedStates(),
    });
  }

  private flushPendingPredictedStates(): void {
    if (!this.predictionEnabled || !this.prediction || this.pendingPredictionFrames.length === 0) {
      return;
    }
    const state = this.getLocalPlayerState();
    let latestFlushedFrame: number | undefined;
    while (this.pendingPredictionFrames.length > 0) {
      const frame = this.pendingPredictionFrames.shift();
      if (typeof frame === "number") {
        this.prediction.attachPredictedState(frame, state);
        latestFlushedFrame = frame;
      }
    }
    if (typeof latestFlushedFrame !== "number") {
      return;
    }
    const latest = this.prediction
      .getPendingInputs()
      .find((entry) => entry.frame === latestFlushedFrame);
    if (latest?.state) {
      this.emitMovePacket(
        latest.direction,
        latest.frame,
        latest.tick,
        latest.timestamp,
        true,
      );
    }
  }

  private buildPendingMoveTrajectory(): MovementTrajectoryPoint[] {
    if (!this.predictionEnabled || !this.prediction) {
      return [];
    }
    const pendingInputs = this.prediction.getPendingInputs();
    const trajectory: MovementTrajectoryPoint[] = [];
    for (const entry of pendingInputs) {
      const state = entry.state;
      if (!state) continue;
      if (typeof state.x !== "number" || typeof state.y !== "number") continue;
      trajectory.push({
        frame: entry.frame,
        tick: entry.tick,
        timestamp: entry.timestamp,
        input: entry.direction,
        x: state.x,
        y: state.y,
        direction: state.direction ?? resolveMoveDirection(entry.direction),
      });
    }
    if (trajectory.length > this.MAX_MOVE_TRAJECTORY_POINTS) {
      return trajectory.slice(-this.MAX_MOVE_TRAJECTORY_POINTS);
    }
    return trajectory;
  }

  private emitMovePacket(
    input: RpgMovementInput,
    frame: number,
    tick: number,
    timestamp: number,
    force = false,
  ): void {
    const trajectory = this.buildPendingMoveTrajectory();
    const latestTrajectoryFrame =
      trajectory.length > 0 ? trajectory[trajectory.length - 1].frame : frame;
    const shouldThrottle =
      !force &&
      latestTrajectoryFrame <= this.lastMovePathSentFrame &&
      timestamp - this.lastMovePathSentAt < this.MOVE_PATH_RESEND_INTERVAL_MS;
    if (shouldThrottle) {
      return;
    }

    this.webSocket.emit("move", {
      input,
      timestamp,
      frame,
      tick,
      trajectory,
    });
    this.lastMovePathSentAt = timestamp;
    this.lastMovePathSentFrame = Math.max(this.lastMovePathSentFrame, latestTrajectoryFrame, frame);
  }

  private flushPendingMovePath(): void {
    if (!this.predictionEnabled || !this.prediction) {
      return;
    }
    const player = this.sceneMap?.getCurrentPlayer?.() as any;
    if (
      player &&
      !getCanMoveValue(player)
    ) {
      this.interruptCurrentPlayerMovement(player);
      return;
    }
    const pendingInputs = this.prediction.getPendingInputs();
    if (pendingInputs.length === 0) {
      return;
    }
    let latest: PredictionHistoryEntry<RpgMovementInput, Direction> | undefined;
    for (let index = pendingInputs.length - 1; index >= 0; index -= 1) {
      if (pendingInputs[index].state) {
        latest = pendingInputs[index];
        break;
      }
    }
    if (!latest?.state) {
      return;
    }
    const now = Date.now();
    if (now - this.lastMovePathSentAt < this.MOVE_PATH_RESEND_INTERVAL_MS) {
      return;
    }
    this.emitMovePacket(latest.direction, latest.frame, latest.tick, now, false);
  }

  private applyPredictedMovementInput(
    player: any,
    input: RpgMovementInput
  ): boolean {
    if (isDashInput(input)) {
      const direction = vectorToDirection(input.direction);
      player.changeDirection(direction);
      return Boolean((this.sceneMap as any).dashBody?.(player, input));
    }

    const direction = resolveMoveDirection(input);
    if (!direction) return false;
    player.changeDirection(direction);
    return Boolean((this.sceneMap as any).moveBody?.(player, direction));
  }

  private getLocalPlayerState(): PredictionState<Direction> {
    const currentPlayer = this.sceneMap?.getCurrentPlayer();
    if (!currentPlayer) {
      return { x: 0, y: 0, direction: Direction.Down };
    }
    const topLeft = this.sceneMap.getBodyPosition(currentPlayer.id, "top-left");
    const x = topLeft?.x ?? currentPlayer.x();
    const y = topLeft?.y ?? currentPlayer.y();
    const direction = currentPlayer.direction();
    return { x, y, direction };
  }

  private resolveHitboxDimension(source: unknown, fallback: number): number {
    const value = typeof source === "string" ? Number(source) : source;
    return typeof value === "number" && Number.isFinite(value) && value > 0
      ? value
      : fallback;
  }

  private resolveObjectHitboxSize(object: any): { width: number; height: number } {
    const hitbox = typeof object?.hitbox === "function" ? object.hitbox() : object?.hitbox;
    return {
      width: this.resolveHitboxDimension(hitbox?.w ?? hitbox?.width, 0),
      height: this.resolveHitboxDimension(hitbox?.h ?? hitbox?.height, 0),
    };
  }

  private applyAuthoritativeState(state: PredictionState<Direction>): void {
    const player = this.sceneMap?.getCurrentPlayer();
    if (!player) return;
    const { width, height } = this.resolveObjectHitboxSize(player);
    const updated = this.sceneMap.updateHitbox(player.id, state.x, state.y, width, height);
    if (!updated) {
      this.sceneMap.setBodyPosition(player.id, state.x, state.y, "top-left");
    }
    player.x.set(Math.round(state.x));
    player.y.set(Math.round(state.y));
    if (state.direction) {
      player.changeDirection(state.direction);
    }
  }

  private initializePredictionController(): void {
    if (!this.predictionEnabled) {
      this.prediction = undefined;
      this.sceneMap?.configureClientPrediction?.(false);
      return;
    }
    const configuredTtl = (this.globalConfig as any)?.prediction?.historyTtlMs;
    const historyTtlMs = typeof configuredTtl === "number" ? configuredTtl : 10000;
    const configuredMaxEntries = (this.globalConfig as any)?.prediction?.maxHistoryEntries;
    const maxHistoryEntries =
      typeof configuredMaxEntries === "number"
        ? configuredMaxEntries
        : Math.max(600, Math.ceil(historyTtlMs / 16) + 120);
    this.sceneMap?.configureClientPrediction?.(true);
    this.prediction = new PredictionController<RpgMovementInput, Direction>({
      correctionThreshold: (this.globalConfig as any)?.prediction?.correctionThreshold ?? this.SERVER_CORRECTION_THRESHOLD,
      historyTtlMs,
      maxHistoryEntries,
      getPhysicsTick: () => this.getPhysicsTick(),
      getCurrentState: () => this.getLocalPlayerState(),
      setAuthoritativeState: (state) => this.applyAuthoritativeState(state),
    });
  }

  getCurrentPlayer() {
    return this.sceneMap.getCurrentPlayer()
  }

  emitSceneMapHook(hookName: string, ...args: any[]): void {
    this.hooks.callHooks(`client-sceneMap-${hookName}`, ...args).subscribe();
  }

  /**
   * Setup RxJS observer to wait for all conditions before calling onAfterLoading hook
   * 
   * This method uses RxJS `combineLatest` to wait for all conditions to be met,
   * regardless of the order in which they arrive:
   * 1. The map loading is completed (loadMapService.load is finished)
   * 2. We received a player ID (pId)
   * 3. Players array has at least one element
   * 4. Events property is present in the sync data
   * 
   * Once all conditions are met, it uses `switchMap` to call the onAfterLoading hook once.
   * 
   * ## Design
   * 
   * Uses BehaviorSubjects to track each condition state, allowing events to arrive
   * in any order. The `combineLatest` operator waits until all observables emit `true`,
   * then `take(1)` ensures the hook is called only once, and `switchMap` handles
   * the hook execution.
   * 
   * @example
   * ```ts
   * // Called automatically in loadScene to setup the observer
   * this.setupOnAfterLoadingObserver();
   * ```
   */
  private setupOnAfterLoadingObserver(): void {
    this.onAfterLoadingSubscription = combineLatest([
      this.mapLoadCompleted$.pipe(filter(completed => completed === true)),
      this.playerIdReceived$.pipe(filter(received => received === true)),
      this.playersReceived$.pipe(filter(received => received === true)),
      this.eventsReceived$.pipe(filter(received => received === true))
    ]).pipe(
      take(1), // Only execute once when all conditions are met
      switchMap(() => {
        // Call the hook and return the observable
        return this.hooks.callHooks("client-sceneMap-onAfterLoading", this.sceneMap);
      })
    ).subscribe();
  }

  /**
   * Clear client prediction states for cleanup
   * 
   * Removes old prediction states and input history to prevent memory leaks.
   * Should be called when changing maps or disconnecting.
   * 
   * @example
   * ```ts
   * // Clear prediction states when changing maps
   * engine.clearClientPredictionStates();
   * ```
   */
  clearClientPredictionStates() {
    this.initializePredictionController();
    this.frameOffset = 0;
    this.inputFrameCounter = 0;
    this.pendingPredictionFrames = [];
    this.lastClientPhysicsStepAt = 0;
    this.lastMovePathSentAt = 0;
    this.lastMovePathSentFrame = 0;
  }

  private clearMapTransferPredictionStates(): void {
    this.prediction?.clearPendingInputs();
    this.frameOffset = 0;
    this.pendingPredictionFrames = [];
    this.lastClientPhysicsStepAt = 0;
    this.lastMovePathSentAt = 0;
    this.lastMovePathSentFrame = this.inputFrameCounter;
  }

  /**
   * Stop local movement immediately and discard pending predicted movement.
   *
   * Use this before a blocking action such as an A-RPG attack, dialog, dash
   * startup, or any client-side state where already buffered movement inputs
   * must not be replayed after server reconciliation.
   *
   * @param player - Player object to stop. Defaults to the current player.
   * @returns `true` when a player was found and interrupted.
   *
   * @example
   * ```ts
   * engine.interruptCurrentPlayerMovement();
   * ```
   */
  interruptCurrentPlayerMovement(player: any = this.sceneMap?.getCurrentPlayer?.()): boolean {
    if (!player) {
      return false;
    }
    (this.sceneMap as any)?.stopMovement?.(player);
    this.prediction?.clearPendingInputs();
    this.pendingPredictionFrames = [];
    this.lastInputTime = 0;
    this.lastMovePathSentAt = Date.now();
    this.lastMovePathSentFrame = this.inputFrameCounter;
    return true;
  }

  /**
   * Trigger a flash animation on a sprite
   * 
   * This method allows you to trigger a flash effect on any sprite from client-side code.
   * The flash can be configured with various options including type (alpha, tint, or both),
   * duration, cycles, and color.
   * 
   * ## Design
   * 
   * The flash is applied directly to the sprite object using its flash trigger.
   * This is useful for client-side visual feedback, UI interactions, or local effects
   * that don't need to be synchronized with the server.
   * 
   * @param spriteId - The ID of the sprite to flash. If not provided, flashes the current player
   * @param options - Flash configuration options
   * @param options.type - Type of flash effect: 'alpha' (opacity), 'tint' (color), or 'both' (default: 'alpha')
   * @param options.duration - Duration of the flash animation in milliseconds (default: 300)
   * @param options.cycles - Number of flash cycles (flash on/off) (default: 1)
   * @param options.alpha - Alpha value when flashing, from 0 to 1 (default: 0.3)
   * @param options.tint - Tint color when flashing as hex value or color name (default: 0xffffff - white)
   * 
   * @example
   * ```ts
   * // Flash the current player with default settings
   * engine.flash();
   * 
   * // Flash a specific sprite with red tint
   * engine.flash('sprite-id', { type: 'tint', tint: 0xff0000 });
   * 
   * // Flash with both alpha and tint for dramatic effect
   * engine.flash(undefined, { 
   *   type: 'both', 
   *   alpha: 0.5, 
   *   tint: 0xff0000,
   *   duration: 200,
   *   cycles: 2
   * });
   * 
   * // Quick damage flash on current player
   * engine.flash(undefined, { 
   *   type: 'tint', 
   *   tint: 'red', 
   *   duration: 150,
   *   cycles: 1
   * });
   * ```
   */
  flash(
    spriteId?: string,
    options?: {
      type?: 'alpha' | 'tint' | 'both';
      duration?: number;
      cycles?: number;
      alpha?: number;
      tint?: number | string;
    }
  ): void {
    const targetId = spriteId || this.playerId;
    if (!targetId) return;

    const sprite = this.sceneMap.getObjectById(targetId);
    if (sprite && typeof sprite.flash === 'function') {
      sprite.flash(options);
    }
  }

  private applyServerAck(ack: { frame: number; serverTick?: number; x?: number; y?: number; direction?: Direction }) {
    this.updateServerTickEstimate(ack.serverTick);
    if (this.predictionEnabled && this.prediction) {
      const result = this.prediction.applyServerAck({
        frame: ack.frame,
        serverTick: ack.serverTick,
        state:
          typeof ack.x === "number" && Number.isFinite(ack.x)
            && typeof ack.y === "number" && Number.isFinite(ack.y)
            ? { x: ack.x, y: ack.y, direction: ack.direction }
            : undefined,
      });
      if (result.state && result.needsReconciliation) {
        this.reconcilePrediction(result.state, result.pendingInputs);
      }
      return;
    }

    const keepLocalMovement = this.shouldKeepLocalPlayerMovement();
    if (typeof ack.x !== "number" || typeof ack.y !== "number") {
      return;
    }
    if (keepLocalMovement) {
      return;
    }
    const player = this.getCurrentPlayer() as any;
    const myId = this.playerIdSignal();
    if (!player || !myId) {
      return;
    }
    const { width, height } = this.resolveObjectHitboxSize(player);
    const updated = this.sceneMap.updateHitbox(myId, ack.x, ack.y, width, height);
    if (!updated) {
      this.sceneMap.setBodyPosition(myId, ack.x, ack.y, "top-left");
    }
    player.x.set(Math.round(ack.x));
    player.y.set(Math.round(ack.y));
    if (ack.direction) {
      player.changeDirection(ack.direction);
    }
  }

  private reconcilePrediction(
    authoritativeState: PredictionState<Direction>,
    pendingInputs: PredictionHistoryEntry<RpgMovementInput, Direction>[],
  ): void {
    const player = this.getCurrentPlayer() as any;
    if (!player) {
      return;
    }
    if (!getCanMoveValue(player)) {
      this.interruptCurrentPlayerMovement(player);
      return;
    }

    (this.sceneMap as any).stopMovement(player);
    this.applyAuthoritativeState(authoritativeState);

    // Keep replay bounded while still tolerating high-latency links. Inputs
    // sampled during the same fixed client tick must update velocity together
    // and then share the one resulting physics state.
    const replayInputs = pendingInputs.slice(-600);
    for (let index = 0; index < replayInputs.length;) {
      const first = replayInputs[index];
      const tick = first.tick;
      const group: PredictionHistoryEntry<RpgMovementInput, Direction>[] = [];
      while (index < replayInputs.length && replayInputs[index].tick === tick) {
        group.push(replayInputs[index]);
        index += 1;
      }
      for (const entry of group) {
        if (entry?.direction) {
          this.applyPredictedMovementInput(player, entry.direction);
        }
      }
      this.sceneMap.stepPredictionTick();
      const state = this.getLocalPlayerState();
      for (const entry of group) {
        this.prediction?.attachPredictedState(entry.frame, state);
      }
    }
  }

  /**
   * Replay unacknowledged inputs from a given frame to resimulate client prediction
   * after applying server authority at a certain frame.
   * 
   * @param startFrame - The last server-acknowledged frame
   * 
   * @example
   * ```ts
   * // After applying a server correction at frame N
   * this.replayUnackedInputsFromFrame(N);
   * ```
   */
  private async replayUnackedInputsFromFrame(_startFrame: number): Promise<void> {
    // Prediction controller handles replay internally. Kept for backwards compatibility.
  }

  /**
   * Clear all client resources and reset state
   * 
   * This method should be called to clean up all client-side resources when
   * shutting down or resetting the client engine. It:
   * - Destroys the PIXI renderer
   * - Stops all sounds
   * - Cleans up subscriptions and event listeners
   * - Resets scene map
   * - Stops ping/pong interval
   * - Clears prediction states
   * 
   * ## Design
   * 
   * This method is used primarily in testing environments to ensure clean
   * state between tests. In production, the client engine typically persists
   * for the lifetime of the application.
   * 
   * @example
   * ```ts
   * // In test cleanup
   * afterEach(() => {
   *   clientEngine.clear();
   * });
   * ```
   */
  clear(): void {
    try {
      // First, unsubscribe from all tick subscriptions to stop rendering attempts
      for (const subscription of this.tickSubscriptions) {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      }
      this.tickSubscriptions = [];

      // Stop ping/pong interval
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      // Clean up onAfterLoading subscription
      if (this.onAfterLoadingSubscription && typeof this.onAfterLoadingSubscription.unsubscribe === 'function') {
        this.onAfterLoadingSubscription.unsubscribe();
        this.onAfterLoadingSubscription = undefined;
      }

      // Clean up canvasElement (CanvasEngine) BEFORE destroying PIXI app
      // This prevents CanvasEngine from trying to render after PIXI is destroyed
      // CanvasEngine manages its own render loop which could try to access PIXI after destruction
      if (this.canvasElement) {
        try {
          // Try to stop or cleanup canvasElement if it has cleanup methods
          if (typeof (this.canvasElement as any).destroy === 'function') {
            (this.canvasElement as any).destroy();
          }
          // Clear the reference
          this.canvasElement = undefined;
        } catch (error) {
          // Ignore errors during canvasElement cleanup
        }
      }

      // Reset scene map if it exists (this should stop any ongoing animations/renders)
      if (this.sceneMap && typeof (this.sceneMap as any).reset === 'function') {
        (this.sceneMap as any).reset(true);
      }

      // Stop all sounds
      this.stopAllSounds();

      // Remove resize event listener
      if (this.resizeHandler && typeof window !== 'undefined') {
        window.removeEventListener('resize', this.resizeHandler);
        this.resizeHandler = undefined;
      }

      if (this.pointerMoveHandler && this.pointerCanvas) {
        this.pointerCanvas.removeEventListener('pointermove', this.pointerMoveHandler);
        this.pointerCanvas.removeEventListener('pointerdown', this.pointerMoveHandler);
        if (this.pointerUpHandler) {
          this.pointerCanvas.removeEventListener('pointerup', this.pointerUpHandler);
        }
        if (this.pointerCancelHandler) {
          this.pointerCanvas.removeEventListener('pointercancel', this.pointerCancelHandler);
          this.pointerCanvas.removeEventListener('pointerleave', this.pointerCancelHandler);
        }
        this.pointerMoveHandler = undefined;
        this.pointerUpHandler = undefined;
        this.pointerCancelHandler = undefined;
        this.pointerCanvas = undefined;
      }

      // Destroy PIXI app and renderer if they exist
      // Destroy the app first, which will destroy the renderer
      // Store renderer reference before destroying app (since app.destroy() will destroy the renderer)
      const rendererStillExists = this.renderer && typeof this.renderer.destroy === 'function';
      
      if (this.canvasApp && typeof this.canvasApp.destroy === 'function') {
        try {
          // Stop the ticker first to prevent any render calls during destruction
          if (this.canvasApp.ticker) {
            if (typeof this.canvasApp.ticker.stop === 'function') {
              this.canvasApp.ticker.stop();
            }
            // Also remove all listeners from ticker to prevent callbacks
            if (typeof this.canvasApp.ticker.removeAll === 'function') {
              this.canvasApp.ticker.removeAll();
            }
          }
          
          // Stop the renderer's ticker if it exists separately
          if (this.renderer && (this.renderer as any).ticker) {
            if (typeof (this.renderer as any).ticker.stop === 'function') {
              (this.renderer as any).ticker.stop();
            }
            if (typeof (this.renderer as any).ticker.removeAll === 'function') {
              (this.renderer as any).ticker.removeAll();
            }
          }
          
          // Remove the canvas from DOM before destroying to prevent render attempts
          if (this.canvasApp.canvas && this.canvasApp.canvas.parentNode) {
            this.canvasApp.canvas.parentNode.removeChild(this.canvasApp.canvas);
          }
          
          // Destroy with minimal options to avoid issues
          // Don't pass options that might trigger additional cleanup that could fail
          this.canvasApp.destroy(true);
        } catch (error) {
          // Ignore errors during destruction
        }
        this.canvasApp = undefined;
        // canvasApp.destroy() already destroyed the renderer, so just null it
        this.renderer = null as any;
      } else if (rendererStillExists) {
        // Fallback: destroy renderer directly only if app doesn't exist or wasn't destroyed
        try {
          // Stop the renderer's ticker if it has one
          if ((this.renderer as any).ticker) {
            if (typeof (this.renderer as any).ticker.stop === 'function') {
              (this.renderer as any).ticker.stop();
            }
            if (typeof (this.renderer as any).ticker.removeAll === 'function') {
              (this.renderer as any).ticker.removeAll();
            }
          }
          
          this.renderer.destroy(true);
        } catch (error) {
          // Ignore errors during destruction
        }
        this.renderer = null as any;
      }

      // Clean up prediction controller
      if (this.prediction) {
        // Prediction controller cleanup is handled internally when destroyed
        this.prediction = undefined;
      }

      // Reset signals
      this.playerIdSignal.set(null);
      this.resetCameraFollow(false);
      this.spriteComponentsBehind.set([]);
      this.spriteComponentsInFront.set([]);
      this.eventComponentResolvers.clear();
      
      // Clear maps and arrays
      this.spritesheets.clear();
      this.sounds.clear();
      this.componentAnimations = [];
      this.particleSettings.emitters = [];

      // Reset state
      this.stopProcessingInput = false;
      this.lastInputTime = 0;
      this.inputFrameCounter = 0;
      this.frameOffset = 0;
      this.rtt = 0;
      this.lastMovePathSentAt = 0;
      this.lastMovePathSentFrame = 0;

      // Reset behavior subjects
      this.mapLoadCompleted$.next(false);
      this.playerIdReceived$.next(false);
      this.playersReceived$.next(false);
      this.eventsReceived$.next(false);
    } catch (error) {
      console.warn('Error during client engine cleanup:', error);
    }
  }
}
