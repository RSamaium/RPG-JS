import {
  RpgClientEngine,
  RpgGui,
  WebSocketToken,
  inject,
  type AbstractWebsocket,
  type RpgClient,
} from "@rpgjs/client";
import { defineModule } from "@rpgjs/common";
import {
  CHAT_DELETE_EVENT,
  CHAT_ERROR_EVENT,
  CHAT_MESSAGE_EVENT,
  CHAT_SEND_EVENT,
} from "./config";
import { normalizeChatClientOptions } from "./client-config";
import {
  addChatMessage,
  chatClientOptions,
  chatSelectedChannel,
  configureChatClient,
  removeChatMessage,
  showChatError,
} from "./client-state";
import type {
  ChatClientOptions,
} from "./client-types";
import type {
  ChatChannel,
  ChatErrorPayload,
  ChatMessage,
  ChatMessagePayload,
} from "./shared-types";
// @ts-ignore CanvasEngine components are compiled by @canvasengine/compiler.
import ChatComponent from "./components/chat.ce";

const boundSockets = new WeakSet<AbstractWebsocket>();

export const CHAT_CLIENT_I18N = {
  en: {
    "rpg.chat.title": "Chat",
    "rpg.chat.placeholder": "Message…",
    "rpg.chat.placeholder.channel": "Message ({channel})…",
    "rpg.chat.send": "Send",
    "rpg.chat.sending": "Sending…",
    "rpg.chat.channel.label": "Channel",
    "rpg.chat.channel.map": "Map",
    "rpg.chat.channel.global": "Everyone",
    "rpg.chat.collapse": "Reduce the chat",
    "rpg.chat.open": "Open the chat",
    "rpg.chat.grow": "Make the chat taller",
    "rpg.chat.shrink": "Make the chat smaller",
    "rpg.chat.error.empty": "Enter a message.",
    "rpg.chat.error.too-long": "The message cannot exceed {maxLength} characters.",
    "rpg.chat.error.rate-limit": "You are sending messages too quickly.",
    "rpg.chat.error.channel": "This chat channel is unavailable.",
    "rpg.chat.error.rejected": "The message was rejected.",
  },
  fr: {
    "rpg.chat.title": "Chat",
    "rpg.chat.placeholder": "Message…",
    "rpg.chat.placeholder.channel": "Message ({channel})…",
    "rpg.chat.send": "Envoyer",
    "rpg.chat.sending": "Envoi…",
    "rpg.chat.channel.label": "Canal",
    "rpg.chat.channel.map": "Carte",
    "rpg.chat.channel.global": "Tous",
    "rpg.chat.collapse": "Réduire le chat",
    "rpg.chat.open": "Ouvrir le chat",
    "rpg.chat.grow": "Agrandir le chat",
    "rpg.chat.shrink": "Réduire la hauteur du chat",
    "rpg.chat.error.empty": "Saisissez un message.",
    "rpg.chat.error.too-long": "Le message ne peut pas dépasser {maxLength} caractères.",
    "rpg.chat.error.rate-limit": "Vous envoyez des messages trop vite.",
    "rpg.chat.error.channel": "Ce canal de discussion est indisponible.",
    "rpg.chat.error.rejected": "Le message a été refusé.",
  },
};

export function createChatClient(options: ChatClientOptions = {}): RpgClient {
  const resolved = normalizeChatClientOptions({
    ...options,
    component: options.component || ChatComponent,
  });
  configureChatClient(resolved);
  const bindSocket = () => {
    const socket = inject<AbstractWebsocket>(WebSocketToken);
    if (boundSockets.has(socket)) return;
    boundSockets.add(socket);
    socket.on(CHAT_MESSAGE_EVENT, (message: ChatMessage) => {
      const selfId = inject(RpgClientEngine).playerId;
      // Their own message went through: the error that was shown is not the news any more.
      if (message.playerId === selfId) showChatError(null);
      addChatMessage(message, selfId);
    });
    socket.on(CHAT_ERROR_EVENT, (error: ChatErrorPayload) => {
      showChatError(error);
    });
    socket.on(CHAT_DELETE_EVENT, (payload: { id?: unknown }) => {
      if (typeof payload?.id === "string") removeChatMessage(payload.id);
    });
  };

  return defineModule<RpgClient>({
    i18n: CHAT_CLIENT_I18N,
    gui: [{
      id: resolved.guiId,
      component: resolved.component,
      renderer: resolved.renderer,
      autoDisplay: resolved.autoOpen,
      data: {
        position: resolved.position,
        maxLength: resolved.maxLength,
        channels: resolved.channels,
      },
      dependencies: () => [inject(RpgClientEngine).scene.currentPlayer],
    }],
    engine: {
      onStart() {
        bindSocket();
      },
      onConnected() {
        bindSocket();
      },
    },
  });
}

/**
 * Sends a message to the server, on the channel chosen in the selector when none is given.
 * The server owns the author, the time, the map and who receives it.
 *
 * @title sendChatMessage
 * @method sendChatMessage(text, channel?)
 * @param {string} text The text of the message.
 * @param {ChatChannel} [channel] A channel id; the selected channel by default.
 * @memberof ChatModule
 * @example
 * ```ts
 * sendChatMessage('Hello', 'guild')
 * ```
 */
export function sendChatMessage(text: string, channel: ChatChannel = chatSelectedChannel()): void {
  inject<AbstractWebsocket>(WebSocketToken).emit(CHAT_SEND_EVENT, {
    text,
    channel,
  } satisfies ChatMessagePayload);
}

export function openChat(): void {
  inject(RpgGui).display(chatClientOptions().guiId);
}

export default createChatClient();
