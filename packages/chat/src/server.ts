import { createModule, defineModule } from "@rpgjs/common";
import type { RpgServer } from "@rpgjs/server";
import {
  CHAT_SEND_EVENT,
  CHAT_MESSAGE_EVENT,
  normalizeChatOptions,
  setChatOptions,
} from "./config";
import type {
  ChatMessage,
  ChatMessagePayload,
  ChatOptions,
  ChatPlayerLike,
  ChatServerOptions,
  ResolvedChatOptions,
} from "./types";

const createChatMessageId = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

const resolveMapId = (map: any) => {
  if (!map) return "";
  if (typeof map.id === "function") return map.id();
  return map.id ?? "";
};

export async function createMapChatMessage(
  player: ChatPlayerLike,
  payload: ChatMessagePayload,
  options: ResolvedChatOptions
): Promise<ChatMessage | null> {
  const rawText = typeof payload?.text === "string" ? payload.text : "";
  let text = rawText.trim().replace(/\s+/g, " ");
  if (!text) return null;
  if (text.length > options.maxLength) {
    text = text.slice(0, options.maxLength);
  }
  if (options.sanitize) {
    const sanitized = await options.sanitize(text, player);
    if (sanitized === false) return null;
    text = sanitized.trim().replace(/\s+/g, " ");
    if (!text) return null;
    if (text.length > options.maxLength) {
      text = text.slice(0, options.maxLength);
    }
  }

  const map = player.getCurrentMap();
  if (!map) return null;

  return {
    id: createChatMessageId(),
    text,
    author: options.formatAuthor(player),
    playerId: player.id,
    mapId: resolveMapId(map),
    createdAt: Date.now(),
    scope: "map",
  };
}

export async function handleChatSend(
  player: ChatPlayerLike,
  payload: ChatMessagePayload,
  options: ResolvedChatOptions
): Promise<ChatMessage | null> {
  const message = await createMapChatMessage(player, payload, options);
  if (!message) return null;
  player.getCurrentMap()?.broadcast(CHAT_MESSAGE_EVENT, message);
  return message;
}

export function createChatServer(options: ChatServerOptions = {}) {
  const normalized = normalizeChatOptions(options);
  setChatOptions(normalized);

  return defineModule<RpgServer>({
    player: {
      onConnected(player) {
        player.on(CHAT_SEND_EVENT, async (payload) => {
          await handleChatSend(player, payload, normalized);
        });
      },
    },
  });
}

export function provideChat(options: ChatOptions = {}) {
  return createModule("Chat", [
    {
      server: createChatServer(options),
    },
  ]);
}

export default createChatServer();
