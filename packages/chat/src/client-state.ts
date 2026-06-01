import { signal } from "canvasengine";
import type { ChatMessage, ResolvedChatOptions } from "./types";
import { DEFAULT_CHAT_OPTIONS } from "./config";

export const chatMessages = signal<ChatMessage[]>([]);
export const chatOptions = signal<ResolvedChatOptions>(DEFAULT_CHAT_OPTIONS);

export function configureChatClient(options: ResolvedChatOptions) {
  chatOptions.set(options);
  chatMessages.set([]);
}

export function addChatMessage(message: ChatMessage) {
  const maxMessages = chatOptions().maxMessages;
  const nextMessages = [...chatMessages(), message];
  chatMessages.set(nextMessages.slice(Math.max(0, nextMessages.length - maxMessages)));
}

export function clearChatMessages() {
  chatMessages.set([]);
}
