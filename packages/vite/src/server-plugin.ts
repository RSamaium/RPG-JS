import { createRpgServerTransport } from "@rpgjs/server/node";
import type { RpgTransportServerConstructor, RpgWebSocketServer } from "@rpgjs/server/node";
import type { ViteDevServer } from "vite";
import colors from "picocolors";

export interface RpgjsDevServerOptions {
  /** Remote Node or Wrangler origin. When omitted, Vite hosts the Node transport. */
  target?: string;
  /** Map ids published to the remote administration endpoint. */
  mapIds?: string[];
  mapUpdateToken?: string;
  tiledBasePaths?: string[];
  /** Build a provider-specific authoritative payload before remote publication. */
  resolveMapPayload?: (context: { mapId: string; defaultPayload: unknown }) => unknown | Promise<unknown>;
}

class MapPublicationError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}

async function importWebSocketServer(): Promise<any> {
  if (typeof process === "undefined" || !process.versions?.node) {
    console.warn("Not in Node.js environment, WebSocket server not available");
    return null;
  }

  try {
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    const ws = require("ws");
    return ws.WebSocketServer || ws.default?.WebSocketServer || ws;
  } catch (error) {
    console.warn("Failed to load ws module:", error);
    return null;
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function serverPlugin(serverModule: RpgTransportServerConstructor, options: RpgjsDevServerOptions = {}) {
  let wsServer: RpgWebSocketServer | null = null;
  const isRemote = Boolean(options.target);
  const transport = createRpgServerTransport(serverModule, {
    initializeMaps: !isRemote,
    mapUpdateToken: options.mapUpdateToken,
    tiledBasePaths: options.tiledBasePaths,
  });
  let publishTimer: ReturnType<typeof setTimeout> | undefined;

  const publishMaps = async () => {
    if (!options.target) return;
    await Promise.all(
      (options.mapIds ?? []).map(async (mapId) => {
        const response = await transport.publishMap(mapId, {
          target: options.target!,
          transformPayload: options.resolveMapPayload
            ? (defaultPayload, normalizedMapId) =>
                options.resolveMapPayload!({
                  mapId: normalizedMapId,
                  defaultPayload,
                })
            : undefined,
        });
        if (!response.ok) {
          const retryable = response.status === 408 || response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504;
          throw new MapPublicationError(`Unable to publish map ${mapId}: ${response.status} ${await response.text()}`, retryable);
        }
      }),
    );
  };

  const logPublication = (server: ViteDevServer, action: string) => {
    const count = options.mapIds?.length ?? 0;
    if (count === 0) return;
    server.config.logger.info(
      `${colors.magenta("[rpgjs]")} ${count === 1 ? "1 map" : `${count} maps`} ${action} to ${colors.cyan(options.target!)}`,
      { timestamp: true },
    );
  };

  const publishMapsWithRetry = async (attempts = 20, delayMs = 250): Promise<void> => {
    try {
      await publishMaps();
    } catch (error) {
      if (attempts <= 1 || (error instanceof MapPublicationError && !error.retryable)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await publishMapsWithRetry(attempts - 1, delayMs);
    }
  };

  return {
    name: "server-plugin",

    config() {
      if (!options.target) return;
      return {
        server: {
          proxy: {
            "/parties": {
              target: options.target,
              ws: true,
              changeOrigin: true,
            },
          },
        },
      };
    },

    async configureServer(server: ViteDevServer) {
      if (isRemote) {
        server.httpServer?.once("listening", () => {
          void publishMapsWithRetry().then(
            () => logPublication(server, "published"),
            (error) => server.config.logger.error(`[rpgjs] Map publication failed: ${formatError(error)}`, { timestamp: true }),
          );
        });
        server.watcher.on("change", (file) => {
          const normalizedFile = file.replaceAll("\\", "/");
          if (/(?:^|\/)(?:\.git|\.wrangler|dist|node_modules)(?:\/|$)/.test(normalizedFile)) {
            return;
          }
          if (publishTimer) clearTimeout(publishTimer);
          publishTimer = setTimeout(() => {
            void publishMapsWithRetry(5).then(
              () => logPublication(server, "republished"),
              (error) => server.config.logger.error(`[rpgjs] Map republication failed: ${formatError(error)}`, { timestamp: true }),
            );
          }, 100);
        });
        return;
      }

      try {
        const WebSocketServerClass = await importWebSocketServer();
        if (WebSocketServerClass) {
          wsServer = new WebSocketServerClass({
            noServer: true,
          });
        } else {
          server.config.logger.warn("[rpgjs] WebSocket server not available in this environment");
        }
      } catch (error) {
        server.config.logger.warn(`[rpgjs] WebSocket server not available: ${formatError(error)}`);
        wsServer = null;
      }

      server.middlewares.use("/parties", async (req, res, next) => {
        await transport.handleNodeRequest(req, res, next, {
          mountedPath: "/parties",
        });
      });

      if (wsServer) {
        server.httpServer?.on("upgrade", (request, socket, head) => {
          void transport.handleUpgrade(wsServer!, request, socket, head);
        });
      }
    },

    buildEnd() {
      if (publishTimer) clearTimeout(publishTimer);
      if (wsServer) {
        wsServer.close();
      }
    },
  };
}
