import Canvas from "./components/scenes/canvas.ce";
import { Context, inject } from "@signe/di";
import { signal, bootstrapCanvas } from "canvasengine";
import { AbstractWebsocket, WebSocketToken } from "./services/AbstractSocket";
import { LoadMapService, LoadMapToken } from "./services/loadMap";
import { Hooks, ModulesToken } from "@rpgjs/common";
import { load } from "@signe/sync";
import { RpgClientMap } from "./Game/Map"
import { RpgGui } from "./Gui/Gui";
import { AnimationManager } from "./Game/AnimationManager";
import { lastValueFrom, Observable } from "rxjs";
import { GlobalConfigToken } from "./module";
import * as PIXI from "pixi.js";
import { PrebuiltComponentAnimations } from "./components/animations";

export class RpgClientEngine<T = any> {
  private guiService: RpgGui;
  private webSocket: AbstractWebsocket;
  private loadMapService: LoadMapService;
  private hooks: Hooks;
  private sceneMap: RpgClientMap
  private selector: HTMLElement;
  public globalConfig: T;
  public sceneComponent: any;
  stopProcessingInput = false;
  width = signal("100%");
  height = signal("100%");
  spritesheets: Map<string, any> = new Map();
  sounds: Map<string, any> = new Map();
  componentAnimations: any[] = [];
  particleSettings: {
    emitters: any[]
  } = {
    emitters: []
  }
  renderer: PIXI.Renderer;
  tick: Observable<number>;
  playerIdSignal = signal<string | null>(null);
  spriteComponentsBehind = signal<any[]>([]);
  spriteComponentsInFront = signal<any[]>([]);

  constructor(public context: Context) {
    this.webSocket = inject(context, WebSocketToken);
    this.guiService = inject(context, RpgGui);
    this.loadMapService = inject(context, LoadMapToken);
    this.hooks = inject<Hooks>(context, ModulesToken);
    this.globalConfig = inject(context, GlobalConfigToken)

    this.addComponentAnimation({
      id: "animation",
      component: PrebuiltComponentAnimations.Animation
    })
  }

  async start() {
    this.sceneMap = new RpgClientMap()
    this.selector = document.body.querySelector("#rpg") as HTMLElement;

    const { app, canvasElement } = await bootstrapCanvas(this.selector, Canvas);
    this.renderer = app.renderer as PIXI.Renderer;
    this.tick = canvasElement?.propObservables?.context['tick'].observable


    this.hooks.callHooks("client-spritesheets-load", this).subscribe();
    this.hooks.callHooks("client-sounds-load", this).subscribe();
    this.hooks.callHooks("client-gui-load", this).subscribe();
    this.hooks.callHooks("client-particles-load", this).subscribe();
    this.hooks.callHooks("client-componentAnimations-load", this).subscribe();
    this.hooks.callHooks("client-sprite-load", this).subscribe();

    await lastValueFrom(this.hooks.callHooks("client-engine-onStart", this));

    // wondow is resize
    window.addEventListener('resize', () => {
      this.hooks.callHooks("client-engine-onWindowResize", this).subscribe();
    })

    this.tick.subscribe((tick) => {
      this.hooks.callHooks("client-engine-onStep", this, tick).subscribe();
    })

    await this.webSocket.connection(() => {
      this.initListeners()
      this.guiService._initialize()
    });
  }

  private initListeners() {
    this.webSocket.on("sync", (data) => {
      if (data.pId) this.playerIdSignal.set(data.pId)
      this.hooks.callHooks("client-sceneMap-onChanges", this.sceneMap, { partial: data }).subscribe();
      load(this.sceneMap, data, true);
    });

    this.webSocket.on("changeMap", (data) => {
      this.loadScene(data.mapId);
    });

    this.webSocket.on("showComponentAnimation", (data) => {
      const { params, object, position, id } = data;
      if (!object && position === undefined) {
        throw new Error("Please provide an object or x and y coordinates");
      }
      const player = object ? this.sceneMap.getObjectById(object) : undefined;
      this.getComponentAnimation(id).displayEffect(params, player || position)
    });

    this.webSocket.on("setAnimation", (data) => {
      const { animationName, nbTimes, object } = data;
      const player = this.sceneMap.getObjectById(object);
      player.setAnimation(animationName, nbTimes)
    })

    this.webSocket.on('open', () => {
      this.hooks.callHooks("client-engine-onConnected", this, this.socket).subscribe();
    })

    this.webSocket.on('close', () => {
      this.hooks.callHooks("client-engine-onDisconnected", this, this.socket).subscribe();
    })

    this.webSocket.on('error', (error) => {
      this.hooks.callHooks("client-engine-onConnectError", this, error, this.socket).subscribe();
    })
  }
  
  private async loadScene(mapId: string) {
    this.hooks.callHooks("client-sceneMap-onBeforeLoading", this.sceneMap).subscribe();
    this.webSocket.updateProperties({ room: mapId })
    await this.webSocket.reconnect(() => {
      this.initListeners()
      this.guiService._initialize()
    })
    const res = await this.loadMapService.load(mapId)
    this.sceneMap.data.set(res)
    this.hooks.callHooks("client-sceneMap-onAfterLoading", this.sceneMap).subscribe();
    //this.sceneMap.loadPhysic()
  }

  addSpriteSheet<T = any>(spritesheetClass: any, id?: string): any {
    this.spritesheets.set(id || spritesheetClass.id, spritesheetClass);
    return spritesheetClass as any;
  }

  addSound(sound: any, id?: string) {
    this.sounds.set(id || sound.id, sound);
    return sound;
  }

  addParticle(particle: any) {
    this.particleSettings.emitters.push(particle)
    return particle;
  }

  /**
   * Add a component to render behind sprites
   * Components added with this method will be displayed with a lower z-index than the sprite
   * 
   * @param component - The component to add behind sprites
   * @returns The added component
   * 
   * @example
   * ```ts
   * // Add a shadow component behind all sprites
   * engine.addSpriteComponentBehind(ShadowComponent);
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
   * @param component - The component to add in front of sprites
   * @returns The added component
   * 
   * @example
   * ```ts
   * // Add a health bar component in front of all sprites
   * engine.addSpriteComponentInFront(HealthBarComponent);
   * ```
   */
  addSpriteComponentInFront(component: any) {
    this.spriteComponentsInFront.update((components: any[]) => [...components, component])
    return component
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

  processInput({ input }: { input: number }) {
    this.hooks.callHooks("client-engine-onInput", this, { input, playerId: this.playerId }).subscribe();
    this.webSocket.emit('move', { input })
  }

  processAction({ action }: { action: number }) {
    if (this.stopProcessingInput) return;
    this.hooks.callHooks("client-engine-onInput", this, { input: 'action', playerId: this.playerId }).subscribe();
    this.webSocket.emit('action', { action })
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

  getCurrentPlayer() {
    return this.sceneMap.getCurrentPlayer()
  }
}
