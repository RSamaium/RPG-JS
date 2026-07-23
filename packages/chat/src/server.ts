import { defineModule } from "@rpgjs/common";
import type { RpgPlayer, RpgServer } from "@rpgjs/server";
import {
  CHAT_ERROR_EVENT,
  CHAT_MESSAGE_EVENT,
  CHAT_SEND_EVENT,
  normalizeChatServerOptions,
} from "./config";
import type {
  ChatChannel,
  ChatErrorPayload,
  ChatMessage,
  ChatMessagePayload,
  ChatPlayerLike,
  ChatServerOptions,
  ResolvedChatServerOptions,
} from "./types";

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

export function createChatHandler(options: ResolvedChatServerOptions) {
  const attempts = new WeakMap<object, number[]>();

  return async (
    player: ChatPlayerLike,
    payload: ChatMessagePayload = {},
  ): Promise<ChatMessage | null> => {
    const text = normalizeText(payload.text);
    if (!text) return emitError(player, "rpg.chat.error.empty");
    if (text.length > options.maxLength) {
      return emitError(player, "rpg.chat.error.too-long", {
        maxLength: options.maxLength,
      });
    }

    const channel: ChatChannel = payload.channel === "global" ? "global" : "map";
    if (!options.channels.includes(channel)) {
      return emitError(player, "rpg.chat.error.channel");
    }

    if (options.rateLimit) {
      const rateLimit = options.rateLimit;
      const now = Date.now();
      const recent = (attempts.get(player) || [])
        .filter((timestamp) => now - timestamp < rateLimit.windowMs);
      if (recent.length >= rateLimit.maxMessages) {
        return emitError(player, "rpg.chat.error.rate-limit");
      }
      recent.push(now);
      attempts.set(player, recent);
    }

    let moderatedText = text;
    if (options.beforeSend) {
      const result = await options.beforeSend({ player, channel, text });
      if (result === false) return emitError(player, "rpg.chat.error.rejected");
      moderatedText = normalizeText(result);
      if (!moderatedText) return emitError(player, "rpg.chat.error.rejected");
      if (moderatedText.length > options.maxLength) {
        return emitError(player, "rpg.chat.error.too-long", {
          maxLength: options.maxLength,
        });
      }
    }

    const map = player.getCurrentMap();
    if (!map && channel === "map") {
      return emitError(player, "rpg.chat.error.channel");
    }

    const message: ChatMessage = {
      id: createMessageId(),
      text: moderatedText,
      author: options.formatAuthor(player),
      playerId: player.id,
      channel,
      mapId: resolveMapId(player),
      createdAt: Date.now(),
    };

    if (channel === "global") {
      if (!options.broadcastGlobal) return emitError(player, "rpg.chat.error.channel");
      await options.broadcastGlobal(message, player);
    } else {
      map!.broadcast(CHAT_MESSAGE_EVENT, message);
    }
    await options.afterSend?.(message, player);
    return message;
  };
}

export function createChatServer(options: ChatServerOptions = {}): RpgServer {
  const resolved = normalizeChatServerOptions(options);
  const handle = createChatHandler(resolved);

  return defineModule<RpgServer>({
    player: {
      onConnected(player: RpgPlayer) {
        player.on<ChatMessagePayload>(CHAT_SEND_EVENT, async (payload) => {
          await handle(player as unknown as ChatPlayerLike, payload);
        });
      },
    },
  });
}

export default createChatServer();
