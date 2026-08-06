import { mergeConfig } from "@signe/di";
import type { RpgProvider } from "@rpgjs/common";
import {
  provideRpg,
  startGame,
  provideClientModules,
  provideLoadMap,
  provideClientGlobalConfig,
  inject,
  WebSocketToken,
  AbstractWebsocket,
  RpgClientEngine,
  RpgClient,
  LoadMapToken,
} from "@rpgjs/client";
import {
  createServer,
  provideServerModules,
  RpgServer,
  RpgPlayer,
  getRpgRoomMetadata,
} from "@rpgjs/server";
import { h, Container } from "canvasengine";
import { clearInject as clearClientInject } from "@rpgjs/client";
import { clearInject as clearServerInject } from "@rpgjs/server";
import { combineLatest, filter, take, firstValueFrom, Subject, map, throwError, race, timer, switchMap } from "rxjs";

/**
 * Provides a default map loader for testing environments
 *
 * This function returns a `provideLoadMap` provider that creates mock maps
 * with default dimensions (1024x768) and a minimal component. It's automatically
 * used by `testing()` if no custom `provideLoadMap` is provided in `clientConfig.providers`.
 *
 * @returns A provider function that can be used with `provideLoadMap`
 * @example
 * ```ts
 * // Used automatically by testing()
 * const fixture = await testing([myModule])
 *
 * // Or use directly in clientConfig
 * const fixture = await testing([myModule], {
 *   providers: [provideTestingLoadMap()]
 * })
 * ```
 */
export function provideTestingLoadMap(): RpgProvider[] {
  return provideLoadMap((id: string) => {
    return {
      id,
      data: {
        width: 1024,
        height: 768,
        hitboxes: [],
        params: {},
      },
      component: h(Container),
      width: 1024,
      height: 768,
    };
  });
}

/**
 * Normalizes direct runtime module definitions and advanced composed providers.
 *
 * @param modules - Array of modules that can be either:
 *   - Direct module objects: { server: RpgServer, client: RpgClient }
 *   - Providers returned by createModule(): Provider[] with meta.server/client and useValue
 * @returns Object with separate arrays for server and client modules
 * @example
 * ```ts
 * // Direct modules
 * normalizeModules([{ server: serverModule, client: clientModule }])
 *
 * // Advanced createModule providers remain supported
 * const providers = createModule('MyModule', [{ server: serverModule, client: clientModule }])
 * normalizeModules(providers)
 * ```
 */
function normalizeModules(modules: any[]): {
  serverModules: RpgServer[];
  clientModules: RpgClient[];
} {
  if (!modules || modules.length === 0) {
    return { serverModules: [], clientModules: [] };
  }

  // Check if first item is a provider (has meta and useValue properties)
  const isProviderArray = modules.some(
    (item: any) =>
      item && typeof item === "object" && "meta" in item && "useValue" in item
  );

  const serverModules: RpgServer[] = [];
  const clientModules: RpgClient[] = [];

  if (!isProviderArray) {
    // Direct module objects, extract server and client separately
    modules.forEach((module: any) => {
      if (module && typeof module === "object") {
        if (module.server) {
          serverModules.push(module.server);
        }
        if (module.client) {
          clientModules.push(module.client);
        }
      }
    });
    return { serverModules, clientModules };
  }

  // Extract modules from createModule providers
  // createModule returns providers where useValue contains the original { server, client } object
  // We need to group providers by their useValue to reconstruct the original modules
  const seenUseValues = new Set<any>();

  modules.forEach((provider: any) => {
    if (
      !provider ||
      typeof provider !== "object" ||
      !("meta" in provider) ||
      !("useValue" in provider)
    ) {
      return;
    }

    const { useValue } = provider;

    // Skip if we've already processed this useValue (same module, different provider for server/client)
    if (seenUseValues.has(useValue)) {
      return;
    }

    // Check if useValue has server or client properties (it's a module object)
    if (
      useValue &&
      typeof useValue === "object" &&
      ("server" in useValue || "client" in useValue)
    ) {
      seenUseValues.add(useValue);
      if (useValue.server) {
        serverModules.push(useValue.server);
      }
      if (useValue.client) {
        clientModules.push(useValue.client);
      }
    }
  });

  return { serverModules, clientModules };
}

// Global storage for all created fixtures and clients (for clear() function)
const globalFixtures: Array<{
  context: any;
  clientEngine: RpgClientEngine;
  websocket: AbstractWebsocket;
  server?: any;
}> = [];

export interface TestingFixture {
  createClient(): Promise<{
    socket: AbstractWebsocket;
    client: RpgClientEngine;
    playerId: string;
    player: RpgPlayer;
    waitForMapChange(expectedMapId: string, timeout?: number): Promise<RpgPlayer>;
    waitForRoomChange(expectedKind: string, timeout?: number): Promise<RpgPlayer>;
  }>;
  server: RpgServer;
  clear(): Promise<void>;
  applySyncToClient(): Promise<void>;
  nextTick(timestamp?: number): Promise<void>;
  nextTickTimes(times: number, timestamp?: number): Promise<void>;
  wait(ms: number): Promise<void>;
  waitUntil(promise: Promise<any>): Promise<void>;
}

/**
 * Testing utility function to set up server and client instances for unit testing
 *
 * This function creates a test environment with both server and client instances,
 * allowing you to test player interactions, server hooks, and game mechanics.
 *
 * @param modules - Array of modules that can be either:
 *   - Direct module objects: { server: RpgServer, client: RpgClient }
 *   - Advanced providers returned by createModule()
 * @param clientConfig - Optional client configuration
 * @param serverConfig - Optional server configuration
 * @returns Testing fixture with createClient method
 * @example
 * ```ts
 * // Using direct modules
 * const fixture = await testing([{
 *   server: serverModule,
 *   client: clientModule
 * }])
 *
 * // Advanced composed providers are also accepted
 * const myModule = createModule('MyModule', [{
 *   server: serverModule,
 *   client: clientModule
 * }])
 * const fixture = await testing(myModule)
 * ```
 */
export async function testing(
  modules: ({ server?: RpgServer; client?: RpgClient } | RpgProvider)[] = [],
  clientConfig: any = {},
  serverConfig: any = {}
): Promise<TestingFixture> {
  // Normalize modules to extract server/client from providers if needed
  const { serverModules, clientModules } = normalizeModules(modules as any[]);

  // Subject to emit map change events when onJoinMap is triggered
  const mapChangeSubject = new Subject<{ mapId: string; player: RpgPlayer }>();

  const serverClass = createServer({
    ...serverConfig,
    providers: [
      provideServerModules([
        ...serverModules,
        {
          player: {
            onJoinMap(player: RpgPlayer, map: any) {
              // Emit map change event to RxJS Subject
              const mapId = map?.id;
              if (mapId) {
                mapChangeSubject.next({ mapId, player });
              }
            }
          }
        },
      ]),
      ...(serverConfig.providers || []),
    ],
  });

  // Check if LoadMapToken is already provided in clientConfig.providers
  // (provideLoadMap returns an array with LoadMapToken)
  const hasLoadMap =
    clientConfig.providers?.some((provider: any) => {
      if (Array.isArray(provider)) {
        return provider.some((p: any) => p?.provide === LoadMapToken);
      }
      return provider?.provide === LoadMapToken;
    }) || false;

  await startGame(
    mergeConfig(
      {
        ...clientConfig,
        providers: [
          provideClientGlobalConfig({
            bootstrapCanvasOptions: {
              enableLayout: false,
            },
          }),
          ...(hasLoadMap ? [] : [provideTestingLoadMap()]), // Add only if not already provided
          provideClientModules(clientModules),
          ...(clientConfig.providers || []),
        ],
      },
      {
        providers: [provideRpg(serverClass, { env: { TEST: "true" } })],
      }
    )
  );
  const websocket = inject<AbstractWebsocket>(WebSocketToken) as any;
  const clientEngine = inject<RpgClientEngine>(RpgClientEngine);
  globalFixtures.push({
    context: undefined,
    clientEngine,
    websocket,
    server: websocket.getServer(),
  });

  return {
    async createClient() {
      const getCurrentPlayers = () => {
        const server = websocket.getServer();
        const room = server?.getCurrentRoom?.() ?? server?.subRoom;
        return typeof room?.players === "function" ? room.players() : {};
      };

      const clientObj = {
        get socket() {
          return websocket.getSocket();
        },
        client: clientEngine,
        get playerId() {
          return Object.keys(getCurrentPlayers())[0];
        },
        get player(): RpgPlayer {
          return getCurrentPlayers()[clientObj.playerId] as RpgPlayer;
        },
        /**
         * Wait for player to be on a specific map
         *
         * This utility function waits for the `onJoinMap` hook to be triggered
         * when the player joins the expected map, or throws an error if the timeout is exceeded.
         *
         * ## Design
         *
         * Uses RxJS to listen for map change events emitted by `onJoinMap`. The function:
         * 1. Checks if the player is already on the expected map
         * 2. Subscribes to the `mapChangeSubject` observable
         * 3. Filters events to match the expected map ID
         * 4. Uses `race` operator with a timer to implement timeout handling
         * 5. Resolves with the player when the map change event is received
         *
         * @param expectedMapId - The expected map ID (without 'map-' prefix, e.g. 'map1')
         * @param timeout - Maximum time to wait in milliseconds (default: 5000)
         * @returns Promise that resolves when player is on the expected map
         * @throws Error if timeout is exceeded
         * @example
         * ```ts
         * const client = await fixture.createClient()
         * await client.waitForMapChange('map1')
         * ```
         */
        async waitForMapChange(
          expectedMapId: string,
          timeout = 5000
        ): Promise<RpgPlayer> {
          // Check if already on the expected map
          const currentMap = clientObj.player?.getCurrentMap();
          if (currentMap?.id === expectedMapId) {
            return clientObj.player;
          }

          // Create observable that filters map changes for the expected map ID
          const mapChange$ = mapChangeSubject.pipe(
            filter((event) => event.mapId === expectedMapId),
            take(1),
            map((event) => event.player)
          );

          // Create timeout observable that throws an error
          const timeout$ = timer(timeout).pipe(
            take(1),
            switchMap(() => {
              const currentMap = clientObj.player?.getCurrentMap();
              return throwError(() => new Error(
                `Timeout: Player did not reach map ${expectedMapId} within ${timeout}ms. ` +
                  `Current map: ${currentMap?.id || "null"}`
              ));
            })
          );

          // Race between map change and timeout
          try {
            const result = await firstValueFrom(race([mapChange$, timeout$]));
            return result as RpgPlayer;
          } catch (error) {
            if (error instanceof Error) {
              throw error;
            }
            const currentMap = clientObj.player?.getCurrentMap();
            throw new Error(
              `Timeout: Player did not reach map ${expectedMapId} within ${timeout}ms. ` +
                `Current map: ${currentMap?.id || "null"}`
            );
          }
        },

        /** Wait until the player joins a registered room kind. */
        async waitForRoomChange(
          expectedKind: string,
          timeout = 5000,
        ): Promise<RpgPlayer> {
          const currentRoom = clientObj.player?.getCurrentRoom();
          if (currentRoom && getRpgRoomMetadata(currentRoom.constructor as any)?.kind === expectedKind) {
            return clientObj.player;
          }

          const roomChange$ = timer(0, 10).pipe(
            map(() => clientObj.player),
            filter((player): player is RpgPlayer => {
              const room = player?.getCurrentRoom();
              return Boolean(room && getRpgRoomMetadata(room.constructor as any)?.kind === expectedKind);
            }),
            take(1),
          );
          const timeout$ = timer(timeout).pipe(
            take(1),
            switchMap(() => throwError(() => new Error(
              `Timeout: Player did not reach room kind ${expectedKind} within ${timeout}ms`,
            ))),
          );
          return firstValueFrom(race([roomChange$, timeout$])) as Promise<RpgPlayer>;
        },
        
      };
      return clientObj;
    },
    get server() {
        return websocket.getServer();
    },
    /**
     * Clear all server, client instances and reset the DOM
     *
     * This method should be called in afterEach to clean up test state.
     * It destroys all created client instances, clears the server, and resets the DOM.
     *
     * @example
     * ```ts
     * const fixture = await testing([myModule])
     *
     * afterEach(() => {
     *   fixture.clear()
     * })
     * ```
     */
    clear() {
      return clear();
    },
    async applySyncToClient() {
      websocket.getServer().subRoom.applySyncToClient();
      await waitForSync(clientEngine);
    },
    /**
     * Manually trigger a game tick for processing inputs and physics
     *
     * This method is a convenience wrapper around the exported nextTick() function.
     * It uses the clientEngine from the fixture, so no client parameter is needed.
     *
     * @param timestamp - Optional timestamp to use for the tick (default: Date.now())
     * @returns Promise that resolves when the tick is complete
     *
     * @example
     * ```ts
     * const fixture = await testing([myModule])
     *
     * // Manually advance the game by one tick
     * await fixture.nextTick()
     * ```
     */
    async nextTick(timestamp?: number): Promise<void> {
      return nextTick(clientEngine, timestamp);
    },
    async nextTickTimes(times: number, timestamp?: number): Promise<void> {
      for (let i = 0; i < times; i++) {
        await nextTick(clientEngine, timestamp);
      }
    },
    async wait(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
    async waitUntil<T = any>(promise: Promise<T>): Promise<T> {
      let settled = false;
      let resolvedValue: T | undefined;
      let rejectedError: unknown;

      promise
        .then((value: T) => {
          settled = true;
          resolvedValue = value;
        })
        .catch((error) => {
          settled = true;
          rejectedError = error;
        });

      while (!settled) {
        await nextTick(clientEngine, Date.now());
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      if (typeof rejectedError !== "undefined") {
        throw rejectedError;
      }

      return resolvedValue as T;
    },
  };
}

/**
 * Clear all caches and reset test state
 *
 * This function should be called after the end of each test to clean up
 * all server and client instances, clear caches, and reset the DOM.
 *
 * ## Design
 *
 * Cleans up all created fixtures, client engines, server instances, and resets
 * the DOM to a clean state. This ensures no state leaks between tests.
 *
 * @returns void
 *
 * @example
 * ```ts
 * import { clear } from '@rpgjs/testing'
 *
 * afterEach(() => {
 *   clear()
 * })
 * ```
 */
export async function clear(): Promise<void> {
  // Clean up all created client and server instances from all fixtures
  for (const client of globalFixtures) {
    try {
      // Clear client engine
      if (
        client.clientEngine &&
        typeof (client.clientEngine as any).clear === "function"
      ) {
        (client.clientEngine as any).clear();
      }

      // Clear server map (subRoom)
      const serverMap = client.server?.subRoom as any;
      if (serverMap && typeof serverMap.clear === "function") {
        serverMap.clear();
      }
    } catch (error) {
      // Silently ignore cleanup errors
      console.warn("Error during cleanup:", error);
    }
  }

  // Clear the global fixtures array
  globalFixtures.length = 0;

  // Let CanvasEngine callbacks scheduled during teardown flush before removing
  // the DI context they may still read.
  await new Promise((resolve) => setTimeout(resolve, 0));

  // Clear client context injection
  try {
    clearClientInject();
  } catch (error) {
    console.warn("Error clearing client inject:", error);
  }

  // Clear server context injection
  try {
    clearServerInject();
  } catch (error) {
    console.warn("Error clearing server inject:", error);
  }

  // Reset DOM
  if (typeof window !== "undefined" && window.document) {
    window.document.body.innerHTML = `<div id="rpg"></div>`;
  }
}

/**
 * Manually trigger a game tick for processing inputs and physics
 *
 * This function allows you to manually advance the game by one tick.
 * It performs the following operations:
 * 1. On server: processes pending inputs and advances physics
 * 2. Server sends data to client
 * 3. Client retrieves data and performs inputs (move, etc.) and server reconciliation
 * 4. A tick is performed on the client
 * 5. A tick is performed on VueJS (if Vue is used)
 *
 * @param client - The RpgClientEngine instance
 * @param timestamp - Optional timestamp to use for the tick (default: Date.now())
 * @returns Promise that resolves when the tick is complete
 *
 * @example
 * ```ts
 * import { nextTick } from '@rpgjs/testing'
 *
 * const client = await fixture.createClient()
 *
 * // Manually advance the game by one tick
 * await nextTick(client.client, Date.now())
 * ```
 */
export async function nextTick(
  client: RpgClientEngine,
  timestamp?: number
): Promise<void> {
  if (!client) {
    throw new Error("nextTick: client parameter is required");
  }

  const tickTimestamp = timestamp ?? Date.now();
  const delta = 16; // Legacy fallback delta for maps without nextTickAsync()

  // Get server instance from client context
  const websocket = (client as any).webSocket;
  if (!websocket) {
    throw new Error("nextTick: websocket not found in client");
  }

  const server = websocket.getServer();
  if (!server) {
    throw new Error("nextTick: server not found");
  }

  // Get server map (subRoom)
  const serverMap = server.subRoom as any;
  if (!serverMap) {
    return;
  }

  if (typeof serverMap.nextTickAsync === "function") {
    await serverMap.nextTickAsync();
  } else {
    // 1. On server: Process inputs for all players
    for (const player of serverMap.getPlayers()) {
      if (player.pendingInputs && player.pendingInputs.length > 0) {
        await serverMap.processInput(player.id);
      }
    }

    serverMap.nextTick(delta);
  }

  // 3. Server sends data to client - trigger sync for all players
  // The sync is triggered by calling syncChanges() on each player
  for (const player of serverMap.getPlayers()) {
    if (player && typeof (player as any).syncChanges === "function") {
      (player as any).syncChanges();
    }
  }

  // 4. Client retrieves data and performs reconciliation
  // The sync data will be received by the client through the websocket
  // We need to wait a bit for the sync data to be processed
  await new Promise((resolve) => setTimeout(resolve, 0));

  // 5. Run physics tick on client map (performs client-side prediction)
  const sceneMap = (client as any).sceneMap;
  if (sceneMap && typeof sceneMap.stepPredictionTick === "function") {
    sceneMap.stepPredictionTick();
  }

  // 6. Trigger VueJS tick if Vue is used (handled by CanvasEngine internally)
  // CanvasEngine handles this automatically through its tick system
}

/**
 * Wait for synchronization to complete on the client
 *
 * This function waits for the client to receive and process synchronization data
 * from the server. It monitors the `playersReceived$` and `eventsReceived$` observables
 * in the RpgClientEngine to determine when synchronization is complete.
 *
 * ## Design
 *
 * - Uses `combineLatest` to wait for both `playersReceived$` and `eventsReceived$` to be `true`
 * - Filters to only proceed when both are `true`
 * - Includes a timeout to prevent waiting indefinitely
 * - Resets the observables to `false` before waiting to ensure we catch the next sync
 *
 * @param client - The RpgClientEngine instance
 * @param timeout - Maximum time to wait in milliseconds (default: 1000ms)
 * @returns Promise that resolves when synchronization is complete
 * @throws Error if timeout is exceeded
 *
 * @example
 * ```ts
 * import { waitForSync } from '@rpgjs/testing'
 *
 * const client = await fixture.createClient()
 *
 * // Wait for sync to complete
 * await waitForSync(client.client)
 *
 * // Now you can safely test client-side state
 * expect(client.client.sceneMap.players()).toBeDefined()
 * ```
 */
export async function waitForSync(
  client: RpgClientEngine,
  timeout: number = 1000
): Promise<void> {
  if (!client) {
    throw new Error("waitForSync: client parameter is required");
  }

  // Access private observables via type assertion
  const playersReceived$ = (client as any).playersReceived$ as any;
  const eventsReceived$ = (client as any).eventsReceived$ as any;

  if (!playersReceived$ || !eventsReceived$) {
    throw new Error(
      "waitForSync: playersReceived$ or eventsReceived$ not found in client"
    );
  }

  // Check if observables are already true - if so, sync has already arrived, don't reset
  const playersAlreadyTrue = playersReceived$.getValue
    ? playersReceived$.getValue() === true
    : false;
  const eventsAlreadyTrue = eventsReceived$.getValue
    ? eventsReceived$.getValue() === true
    : false;

  // If both observables are already true, sync has already completed - return immediately
  if (playersAlreadyTrue && eventsAlreadyTrue) {
    return;
  }

  // Reset observables to false to ensure we catch the next sync
  // Note: This is only needed when waitForSync is called standalone.
  // When called from waitForSyncComplete, observables are already reset before nextTick
  playersReceived$.next(false);
  eventsReceived$.next(false);

  // Wait for both observables to be true
  const syncComplete$ = combineLatest([
    playersReceived$.pipe(filter((received) => received === true)),
    eventsReceived$.pipe(filter((received) => received === true)),
  ]).pipe(take(1));

  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `waitForSync: Timeout after ${timeout}ms. Synchronization did not complete.`
        )
      );
    }, timeout);
  });

  // Race between sync completion and timeout
  await Promise.race([firstValueFrom(syncComplete$), timeoutPromise]);
}

/**
 * Wait for complete synchronization cycle (server sync + client receive)
 *
 * This function performs a complete synchronization cycle:
 * 1. Triggers a game tick using `nextTick()` which calls `syncChanges()` on all players
 * 2. Waits for the client to receive and process the synchronization data
 *
 * This is useful when you need to ensure that server-side changes are fully
 * synchronized to the client before testing client-side state.
 *
 * ## Design
 *
 * - Calls `nextTick()` to trigger server-side sync
 * - Waits for client to receive sync data using `waitForSync()`
 * - Ensures complete synchronization cycle is finished
 *
 * @param player - The RpgPlayer instance (optional, will sync all players if not provided)
 * @param client - The RpgClientEngine instance
 * @param timeout - Maximum time to wait in milliseconds (default: 1000ms)
 * @returns Promise that resolves when synchronization is complete
 * @throws Error if timeout is exceeded
 *
 * @example
 * ```ts
 * import { waitForSyncComplete } from '@rpgjs/testing'
 *
 * const client = await fixture.createClient()
 * const player = client.player
 *
 * // Make a server-side change
 * player.addItem('potion', 5)
 *
 * // Wait for sync to complete
 * await waitForSyncComplete(player, client.client)
 *
 * // Now you can safely test client-side state
 * const clientPlayer = client.client.sceneMap.players()[player.id]
 * expect(clientPlayer.items()).toBeDefined()
 * ```
 */
export async function waitForSyncComplete(
  player: RpgPlayer | null,
  client: RpgClientEngine,
  timeout: number = 1000
): Promise<void> {
  if (!client) {
    throw new Error("waitForSyncComplete: client parameter is required");
  }

  // Reset observables BEFORE calling nextTick to ensure we catch the sync that will be sent
  // This prevents race condition where sync arrives before we start waiting
  const playersReceived$ = (client as any).playersReceived$ as any;
  const eventsReceived$ = (client as any).eventsReceived$ as any;
  if (playersReceived$ && eventsReceived$) {
    playersReceived$.next(false);
    eventsReceived$.next(false);
  }

  // Trigger sync by calling nextTick (which calls syncChanges on all players)
  await nextTick(client);

  // Wait for client to receive and process the sync
  await waitForSync(client, timeout);
}
