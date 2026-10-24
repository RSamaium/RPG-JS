import { defineModule } from "@rpgjs/common";
import type { RpgPlayer, RpgServer } from "@rpgjs/server";
import {
  CHAT_ERROR_EVENT,
  CHAT_MESSAGE_EVENT,
  CHAT_SEND_EVENT,
} from "./config";
import { normalizeChatServerOptions } from "./server-config";
import type {
  ChatAudience,
  ChatErrorPayload,
  ChatMessage,
  ChatMessagePayload,
} from "./shared-types";
import type {
  ChatChannelDefinition,
  ChatContext,
  ChatMiddleware,
  ChatPlayerLike,
  ChatServerOptions,
  ResolvedChatServerOptions,
} from "./server-types";

const createMessageId = (): string => {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
};

const resolveMapId = (player: ChatPlayerLike): string | undefined => {
  const id = player.getCurrentMap()?.id;
  return typeof id === "function" ? id() : id;
};

const normalizeText = (value: unknown): string => {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
};

const emitError = (
  player: ChatPlayerLike,
  key: string,
  params?: Record<string, unknown>,
): null => {
  player.emit(CHAT_ERROR_EVENT, { key, params } satisfies ChatErrorPayload);
  return null;
};

/** Thrown by `context.reject()` to refuse a message from anywhere in the chain. */
class ChatRejection extends Error {
  constructor(
    readonly key: string,
    readonly params?: Record<string, unknown>,
  ) {
    super(key);
    this.name = "ChatRejection";
  }
}

/** Runs the middleware as a chain around `last`; a step that neither continues nor refuses refuses the message. */
async function run(
  middleware: ChatMiddleware[],
  context: ChatContext,
  last: () => Promise<void>,
): Promise<void> {
  let reachedEnd = false;
  const step = async (index: number): Promise<void> => {
    const current = middleware[index];
    if (!current) {
      reachedEnd = true;
      await last();
      return;
    }
    let continued = false;
    await current(context, async () => {
      continued = true;
      await step(index + 1);
    });
    if (!continued) throw new ChatRejection("rpg.chat.error.rejected");
  };
  await step(0);
  if (!reachedEnd) throw new ChatRejection("rpg.chat.error.rejected");
}

const audienceOf = (
  channel: ChatChannelDefinition,
  message: ChatMessage,
  player: ChatPlayerLike,
): ChatAudience => {
  if (channel.audience) return channel.audience(message, player);
  return channel.id === "global" ? { type: "global" } : { type: "map" };
};

export function createChatHandler(options: ResolvedChatServerOptions) {
  const attempts = new WeakMap<object, number[]>();
  const defaultChannel = options.channels.includes("map") ? "map" : options.channels[0]!;

  return async (
    player: ChatPlayerLike,
    payload: ChatMessagePayload = {},
  ): Promise<ChatMessage | null> => {
    let channel: ChatChannelDefinition | undefined;
    const text = normalizeText(payload.text);

    const refuse = async (key: string, params?: Record<string, unknown>): Promise<null> => {
      emitError(player, key, params);
      try {
        await options.onRejected?.({ player, channel: channel?.id, text, key });
      } catch (hookError) {
        console.error("[chat] onRejected failed", hookError);
      }
      return null;
    };

    if (!text) return refuse("rpg.chat.error.empty");
    if (text.length > options.maxLength) {
      return refuse("rpg.chat.error.too-long", { maxLength: options.maxLength });
    }

    const requested = payload.channel === undefined ? defaultChannel : payload.channel;
    channel = typeof requested === "string"
      ? options.channelDefinitions.find((definition) => definition.id === requested)
      : undefined;
    if (!channel) return refuse("rpg.chat.error.channel");
    if (channel.canSend && !(await channel.canSend(player))) return refuse("rpg.chat.error.rejected");

    if (options.rateLimit) {
      const rateLimit = options.rateLimit;
      const now = Date.now();
      const recent = (attempts.get(player) || [])
        .filter((timestamp) => now - timestamp < rateLimit.windowMs);
      if (recent.length >= rateLimit.maxMessages) return refuse("rpg.chat.error.rate-limit");
      recent.push(now);
      attempts.set(player, recent);
    }

    const context: ChatContext = {
      player,
      channel,
      text,
      meta: {},
      reject(key, params) {
        throw new ChatRejection(key, params);
      },
    };
    const beforeSend = options.beforeSend;
    const steps: ChatMiddleware[] = [
      ...(beforeSend
        ? [async (current: ChatContext, next: () => Promise<void>) => {
            const result = await beforeSend({
              player: current.player,
              channel: current.channel.id,
              text: current.text,
            });
            if (result === false) current.reject("rpg.chat.error.rejected");
            current.text = normalizeText(result);
            await next();
          }]
        : []),
      ...options.middleware,
    ];

    let message: ChatMessage | null = null;
    try {
      await run(steps, context, async () => {
        const finalText = normalizeText(context.text);
        if (!finalText) throw new ChatRejection("rpg.chat.error.rejected");
        if (finalText.length > options.maxLength) {
          throw new ChatRejection("rpg.chat.error.too-long", { maxLength: options.maxLength });
        }

        const built: ChatMessage = {
          id: createMessageId(),
          text: finalText,
          author: options.formatAuthor(player),
          playerId: player.id,
          channel: channel!.id,
          mapId: resolveMapId(player),
          createdAt: Date.now(),
        };
        const audience = audienceOf(channel!, built, player);
        if (audience.type === "map") {
          const map = player.getCurrentMap();
          if (!map) throw new ChatRejection("rpg.chat.error.channel");
          map.broadcast(CHAT_MESSAGE_EVENT, built);
        } else if (options.deliver) {
          await options.deliver(audience, built, player);
        } else if (audience.type === "global" && options.broadcastGlobal) {
          await options.broadcastGlobal(built, player);
        } else {
          throw new ChatRejection("rpg.chat.error.channel");
        }
        message = built;
      });
    } catch (failure) {
      if (failure instanceof ChatRejection) return refuse(failure.key, failure.params);
      throw failure;
    }

    await options.afterSend?.(message!, player);
    return message;
  };
}

export function createChatServer(options: ChatServerOptions = {}): RpgServer {
  const resolved = normalizeChatServerOptions(options);
  const handle = createChatHandler(resolved);
  const boundPlayers = new WeakSet<object>();
  const bindPlayer = (player: RpgPlayer) => {
    if (boundPlayers.has(player)) return;
    boundPlayers.add(player);
    player.on<ChatMessagePayload>(CHAT_SEND_EVENT, async (payload) => {
      await handle(player as unknown as ChatPlayerLike, payload);
    });
  };

  return defineModule<RpgServer>({
    player: {
      onConnected(player: RpgPlayer) {
        bindPlayer(player);
      },
      onJoinMap(player: RpgPlayer) {
        bindPlayer(player);
      },
    },
  });
}

export default createChatServer();
