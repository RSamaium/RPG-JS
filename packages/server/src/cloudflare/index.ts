import {
  SigneRoomDurableObject,
  createCloudflareRoomWorker,
  type CloudflareRoomWorkerOptions,
} from "@signe/room/cloudflare";
import type { RpgServerEngine } from "../RpgServerEngine";
import { MAP_UPDATE_TOKEN_ENV } from "../map-update";

/** Bindings and static values available to an RPGJS Cloudflare Worker. */
export type RpgServerWorkerEnv = Record<string, unknown>;

interface RpgDurableObject {
  fetch(request: Request): Promise<Response>;
  alarm(): Promise<void>;
}

const RpgDurableObjectBase = SigneRoomDurableObject as unknown as new (
  state: unknown,
  env: RpgServerWorkerEnv,
) => RpgDurableObject;

/**
 * Durable Object entry point used by an RPGJS Cloudflare Worker deployment.
 *
 * Export this class from the Worker module under the binding configured in
 * `createRpgServerWorker`.
 */
export class RpgServerDurableObject extends RpgDurableObjectBase {}

/** Options used to create an RPGJS Cloudflare Worker room router. */
export interface CreateRpgServerWorkerOptions {
  /** Durable Object binding that owns RPGJS room instances. */
  binding: string;
  /** URL prefix used for room routes. */
  partiesPath?: string;
  /** Additional room constructors exposed beside the main RPGJS server. */
  rooms?: Record<string, RpgServerWorkerConstructor>;
  /** Static values merged into each RPGJS room environment. */
  env?: Record<string, unknown>;
  /** Reject map administration requests when the secret is absent. @default true */
  requireMapUpdateToken?: boolean;
}

/** RPGJS server constructor accepted by the Cloudflare Worker adapter. */
export type RpgServerWorkerConstructor = new (room: unknown) => RpgServerEngine;

/**
 * Create a Cloudflare Worker that routes RPGJS rooms through the RPGJS room adapter.
 * Gameplay maps are initialized exclusively through the authenticated
 * `POST /parties/main/map-<id>/map/update` administration endpoint.
 */
export function createRpgServerWorker(
  serverModule: RpgServerWorkerConstructor,
  options: CreateRpgServerWorkerOptions,
) {
  const requireMapUpdateToken = options.requireMapUpdateToken ?? true;
  class RpgCloudflareServer extends serverModule {
    async onConnect(connection: any, context: any) {
      // Older Workerd versions can report CONNECTING immediately after
      // acceptWebSocket(), even though Durable Objects already permit sends.
      // @signe/room 3.1.0 guards on readyState and would otherwise discard the
      // initial sync, map stream, and connection acceptance packets.
      const acceptedSocket = connection?.rawWebSocket;
      if (acceptedSocket?.readyState === 0 && typeof acceptedSocket.send === "function") {
        connection.send = acceptedSocket.send.bind(acceptedSocket);
      }
      await super.onConnect?.(connection, context);
      await connection.send(JSON.stringify({
        type: "connected",
        id: connection.id,
        message: "Connected to RPG-JS server",
      }));
      await this.onConnectionAccepted?.(connection, context);
    }
  }
  const worker = createCloudflareRoomWorker(
    RpgCloudflareServer as any,
    options as CloudflareRoomWorkerOptions,
  );

  return {
    async fetch(request: Request, env: RpgServerWorkerEnv, ctx: unknown): Promise<Response> {
      if (requireMapUpdateToken && isAdministrationUpdateRequest(request)) {
        const token = env[MAP_UPDATE_TOKEN_ENV];
        if (typeof token !== "string" || token.length === 0) {
          return Response.json(
            { error: `Missing required Worker secret: ${MAP_UPDATE_TOKEN_ENV}` },
            { status: 503 },
          );
        }
      }

      return worker.fetch(request, env, ctx);
    },
  };
}

function isAdministrationUpdateRequest(request: Request): boolean {
  const url = new URL(request.url);
  if (request.method.toUpperCase() !== "POST") return false;
  return /(?:^|\/)map-[^/]+\/(?:map\/update|world\/[^/]+\/update)\/?$/.test(url.pathname);
}
