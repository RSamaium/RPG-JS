import {
  SigneRoomDurableObject,
  createCloudflareRoomWorker,
  type CloudflareRoomWorkerOptions,
} from "@signe/room/cloudflare";
import type { RpgServerEngine } from "../RpgServerEngine";
import { MAP_UPDATE_TOKEN_ENV } from "../map-update";
import { z } from 'zod';
import { PublicationRoom } from './publication-room';
import {
  authorizedPublication, configurePublications, publicationBindings, publicationHeaders,
  type RpgPublicationOptions,
} from './publication-coordinator';
export { RpgPublicationDurableObject } from './publication-coordinator';
export type { RpgPublicationOptions } from './publication-coordinator';
export { prepareRpgPublication } from './publication';
export type {
  RpgPublicationBucket, RpgPublicationHead, RpgPublicationManifest,
  RpgPublicationMap, RpgPublicationShared,
} from './publication';

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
  /** Enable private R2 versions and per-project activation/propagation. See the versioned publication guide. */
  publication?: RpgPublicationOptions;
}

/** RPGJS server constructor accepted by the Cloudflare Worker adapter. */
export type RpgServerWorkerConstructor = new (room: unknown) => RpgServerEngine;

/**
 * Create a Cloudflare Worker that routes RPGJS rooms through the RPGJS room adapter.
 * Gameplay maps are initialized through authenticated map administration, or
 * hydrated from private R2 artifacts when versioned publication is enabled.
 */
export function createRpgServerWorker(
  serverModule: RpgServerWorkerConstructor,
  options: CreateRpgServerWorkerOptions,
) {
  const requireMapUpdateToken = options.requireMapUpdateToken ?? true;
  const partiesPath = options.partiesPath ?? '/parties/main';
  configurePublications(options.publication ? {
    ...options.publication, rooms: options.binding, partiesPath,
  } : undefined);
  class RpgCloudflareServer extends serverModule {
    private publication?: PublicationRoom;

    constructor(room: unknown) {
      super(room);
      const runtime = this.room as typeof this.room & {
        env: Record<string, unknown>;
        getConnections(): Iterable<unknown>;
      };
      if (options.publication && runtime.id?.startsWith('map-')) {
        this.publication = new PublicationRoom(runtime, runtime.env, async source => {
          const response = await super.onRequest(new Request(
            `https://publication.internal${partiesPath}/${runtime.id}/map/update`, {
              method: 'POST', headers: publicationHeaders(runtime.env), body: JSON.stringify(source),
            },
          ));
          if (!response.ok) throw new Error('Published map application failed');
          await response.body?.cancel();
        }, () => Array.from(runtime.getConnections()).length > 0);
      }
    }

    async onRequest(request: Request): Promise<Response> {
      if (this.publication && new URL(request.url).pathname.endsWith('/publication/update')) {
        const env = (this.room as typeof this.room & { env: Record<string, unknown> }).env;
        if (request.method !== 'POST' || !authorizedPublication(request, env)) {
          return new Response('Unauthorized', { status: 401 });
        }
        try {
          const notification = z.object({ session: z.string().uuid() }).parse(await request.json());
          await this.publication.refresh(notification.session);
          return new Response(null, { status: 204 });
        }
        catch { return new Response('Publication application failed', { status: 503 }); }
      }
      if (this.publication && isAdministrationUpdateRequest(request) && await this.publication.isManaged()) {
        return new Response('Use project publication for this map', { status: 409 });
      }
      return super.onRequest(request);
    }

    async onMessage(message: string, sender: unknown): Promise<void> {
      await this.publication?.ready();
      await super.onMessage(message, sender);
    }

    async onClose(connection: unknown): Promise<void> {
      try { await super.onClose(connection); }
      finally { await this.publication?.disconnect(); }
    }

    async onConnect(connection: any, context: any) {
      try { await this.publication?.connect(); }
      catch (error) { connection.close?.(1011, 'Publication unavailable'); throw error; }
      // Older Workerd versions can report CONNECTING immediately after
      // acceptWebSocket(), even though Durable Objects already permit sends.
      // @signe/room 3.1.0 guards on readyState and would otherwise discard the
      // initial sync, map stream, and connection acceptance packets.
      const acceptedSocket = connection?.rawWebSocket;
      if (acceptedSocket?.readyState === 0 && typeof acceptedSocket.send === "function") {
        connection.send = acceptedSocket.send.bind(acceptedSocket);
      }
      try { await super.onConnect?.(connection, context); }
      catch (error) {
        connection.close?.(1011, 'Connection unavailable');
        await this.publication?.disconnect().catch(() => undefined);
        throw error;
      }
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
      if (options.publication && new URL(request.url).pathname.startsWith('/publications/')) {
        if (!authorizedPublication(request, env)) return new Response('Unauthorized', { status: 401 });
        const match = new URL(request.url).pathname.match(/^\/publications\/([a-zA-Z0-9_-]{1,200})(?:\/activate)?$/);
        if (!match) return new Response('Not found', { status: 404 });
        const { coordinator } = publicationBindings(env);
        return coordinator.get(coordinator.idFromName(match[1])).fetch(request);
      }
      // Notifications and membership management are private DO-to-DO operations.
      if (new URL(request.url).pathname.endsWith('/publication/update')) {
        return new Response('Not found', { status: 404 });
      }
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
