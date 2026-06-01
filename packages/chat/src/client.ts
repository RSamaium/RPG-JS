import {
  inject,
  RpgClientEngine,
  RpgGui,
  WebSocketToken,
  type AbstractWebsocket,
  type RpgClient,
} from "@rpgjs/client";
import { createModule, defineModule } from "@rpgjs/common";
import {
  CHAT_MESSAGE_EVENT,
  CHAT_SEND_EVENT,
  getChatOptions,
  normalizeChatOptions,
  setChatOptions,
} from "./config";
import {
  addChatMessage,
  configureChatClient,
} from "./client-state";
import type { ChatClientOptions, ChatMessage, ChatOptions } from "./types";
// @ts-ignore CanvasEngine components are compiled by @canvasengine/compiler.
import ChatComponent from "./components/chat.ce";

const boundSockets = new WeakSet<AbstractWebsocket>();

export function createChatClient(options: ChatClientOptions = {}) {
  const normalized = normalizeChatOptions(options);
  setChatOptions(normalized);
  configureChatClient(normalized);

  const module = defineModule<RpgClient>({
    gui: [
      {
        id: normalized.guiId,
        component: ChatComponent,
        autoDisplay: normalized.autoOpen,
        data: {
          placeholder: normalized.placeholder,
          position: normalized.position,
        },
        dependencies: () => {
          const engine = inject(RpgClientEngine);
          return [engine.scene.currentPlayer];
        },
      },
    ],
    engine: {
      onConnected() {
        const socket = inject<AbstractWebsocket>(WebSocketToken);
        if (boundSockets.has(socket)) return;
        boundSockets.add(socket);
        socket.on(CHAT_MESSAGE_EVENT, (message: ChatMessage) => {
          addChatMessage(message);
        });
      },
    },
  });

  return module;
}

export function provideChat(options: ChatOptions = {}) {
  return createModule("Chat", [
    {
      client: createChatClient(options),
    },
  ]);
}

export function sendChatMessage(text: string) {
  const socket = inject<AbstractWebsocket>(WebSocketToken);
  socket.emit(CHAT_SEND_EVENT, { text });
}

export function openChat() {
  const gui = inject(RpgGui);
  gui.display(getChatOptions().guiId);
}

export { ChatComponent };
export {
  addChatMessage,
  chatMessages,
  chatOptions,
  clearChatMessages,
  configureChatClient,
} from "./client-state";

export default createChatClient();
