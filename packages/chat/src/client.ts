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
  CHAT_ERROR_EVENT,
  CHAT_MESSAGE_EVENT,
  CHAT_SEND_EVENT,
} from "./config";
import { normalizeChatClientOptions } from "./client-config";
import {
  addChatMessage,
  chatClientOptions,
  chatError,
  configureChatClient,
} from "./client-state";
import type {
  ChatClientOptions,
} from "./client-types";
import type {
  ChatErrorPayload,
  ChatMessage,
  ChatMessagePayload,
} from "./shared-types";
// @ts-ignore CanvasEngine components are compiled by @canvasengine/compiler.
import ChatComponent from "./components/chat.ce";

const boundSockets = new WeakSet<AbstractWebsocket>();

export const CHAT_CLIENT_I18N = {
  en: {
    "rpg.chat.placeholder": "Message…",
    "rpg.chat.send": "Send",
    "rpg.chat.error.empty": "Enter a message.",
    "rpg.chat.error.too-long": "The message cannot exceed {maxLength} characters.",
    "rpg.chat.error.rate-limit": "You are sending messages too quickly.",
    "rpg.chat.error.channel": "This chat channel is unavailable.",
    "rpg.chat.error.rejected": "The message was rejected.",
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
      chatError.set(null);
      addChatMessage(message);
    });
    socket.on(CHAT_ERROR_EVENT, (error: ChatErrorPayload) => {
      chatError.set(error);
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

export function sendChatMessage(text: string, channel: "map" | "global" = "map"): void {
  inject<AbstractWebsocket>(WebSocketToken).emit(CHAT_SEND_EVENT, {
    text,
    channel,
  } satisfies ChatMessagePayload);
}

export function openChat(): void {
  inject(RpgGui).display(chatClientOptions().guiId);
}

export default createChatClient();
