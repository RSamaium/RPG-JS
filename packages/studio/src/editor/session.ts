import { Container } from "pixi.js";
import { setStudioMapsPaused } from "./pause";
import { buildEditableMap, resolveLists, type RawElementLists, type StudioLayerName } from "./adapter";

/**
 * The game as an editor (MAP_BUILDER.md, section 17): when a Studio embeds the game in an iframe with `?editor`,
 * the placed elements of the map become a map builder map, the Studio joins it as a trusted session, and what it
 * changes is drawn again by the runtime. Nothing here runs for a player: without `?editor` it is never loaded.
 */
export const STUDIO_EDITOR_PLUGIN_ID = "studio.editor";

/** Whether this page was opened by a Studio to be edited. */
export function isStudioEditorMode(): boolean {
  return typeof window !== "undefined" && window.parent !== window && new URLSearchParams(window.location.search).has("editor");
}

export interface StudioEditorHandle {
  /** The map has been loaded: adopt it. Called again for every map the player goes to. */
  start(map: {
    readonly mapId: string;
    readonly size: readonly [number, number];
    readonly raw: RawElementLists;
    readonly resolveOne: (raw: any, layerNumber: number) => any | null;
  }): void;
}

interface EngineLike {
  globalConfig?: { studioPlugins?: any[] };
  sceneMap?: { data?: { (): any; set(value: any): void } };
  gamePause?: { set(value: boolean): void };
}

const handles = new WeakMap<object, StudioEditorHandle>();

/**
 * Makes room for the editor in the map component, synchronously, before it is drawn: a container in the layer the
 * characters are in, where selection frames will be shown. Returns what `loadMap` calls once it has the map.
 */
export function prepareStudioEditor(engine: EngineLike, options: { readonly allowedOrigins: readonly string[] }): StudioEditorHandle {
  const known = handles.get(engine);
  if (known) return known;
  const holder = new Container();
  holder.label = "studio-editor";
  // Above the characters and the elements: selection frames are never hidden.
  holder.zIndex = 2_147_483_000;
  const config = (engine.globalConfig ??= {});
  const plugins = (config.studioPlugins ??= []);
  if (!plugins.some((plugin) => plugin?.id === STUDIO_EDITOR_PLUGIN_ID)) {
    plugins.push({ id: STUDIO_EDITOR_PLUGIN_ID, eventLayerPixiChildren: () => [holder] });
  }

  let current: { stop(): void } | undefined;
  let generation = 0;

  const handle: StudioEditorHandle = {
    start(map) {
      const token = ++generation;
      current?.stop();
      current = undefined;
      void run(engine, holder, options.allowedOrigins, map)
        .then((started) => {
          if (token !== generation) return started.stop();
          current = started;
        })
        .catch((error) => console.error("[studio editor]", error));
    },
  };
  handles.set(engine, handle);
  return handle;
}

async function run(
  engine: EngineLike,
  holder: Container,
  allowedOrigins: readonly string[],
  map: Parameters<StudioEditorHandle["start"]>[0],
): Promise<{ stop(): void }> {
  const [{ createMapAuthority }, { connectInMemory, joinRemoteMap }, { elements, selection }, { createMapView, attachMapView }, { createEditorHost }] = await Promise.all([
    import("@rpgjs/map-builder/authority"),
    import("@rpgjs/map-builder/remote"),
    import("@rpgjs/map-builder/features"),
    import("@rpgjs/map-builder/renderer"),
    import("@rpgjs/map-builder/embed"),
  ]);

  const { definition, assets } = buildEditableMap({ id: map.mapId, size: map.size, raw: map.raw, resolveOne: map.resolveOne });

  // The game is the authority of its own map; only the Studio session may send raw patches (a form, an undo).
  const authority = createMapAuthority({
    definition,
    assets,
    trustPatches: (actor) => (actor as { editor?: boolean } | undefined)?.editor === true,
    onError: (error) => console.error("[studio editor]", error),
  });
  const connection = connectInMemory(authority, { id: "game" });
  const remote = await joinRemoteMap({ transport: connection.transport });

  // The runtime draws the elements; the map builder only brings selection, dragging and the model.
  const view = createMapView({
    model: remote.model,
    assets,
    features: [elements({ edit: true }), selection({ drag: { live: false }, remove: true })],
    draw: false,
    modes: ["play"],
    onError: (error) => console.error("[studio editor]", error),
  });
  const detach = attachMapView(holder, view);
  const syncPointer = (modes: readonly string[]): void => {
    // In play the game gets the pointer; in edit the map builder does.
    view.root.eventMode = modes.includes("edit") ? "static" : "none";
  };
  syncPointer(view.interaction.modes);
  const stopModes = view.interaction.state.subscribe((snapshot) => syncPointer(snapshot.modes));

  // What the model says is what the runtime draws: after every change, whoever made it.
  const redraw = (): void => {
    const lists = resolveLists(authority.model.state.elements, map.resolveOne);
    const scene = engine.sceneMap?.data;
    const current = scene?.();
    if (!scene || !current?.data) return;
    scene.set({
      ...current,
      data: { ...current.data, elementsAlwaysLow: lists.alwaysLow, elementsLow: lists.low, elementsHigh: lists.high },
    });
  };
  const stopRedraw = authority.model.subscribe(() => redraw());

  const host = createEditorHost({
    allowedOrigins,
    authority: () => ({ id: map.mapId, authority }),
    view: () => view as never,
    setPaused(paused) {
      setStudioMapsPaused(paused);
      engine.gamePause?.set(paused);
    },
    onError: (error) => console.error("[studio editor]", error),
  });

  return {
    stop() {
      stopRedraw();
      stopModes();
      host.dispose();
      detach();
      view.destroy();
      remote.disconnect();
      connection.disconnect();
      void authority.destroy();
    },
  };
}

export type { StudioLayerName };
