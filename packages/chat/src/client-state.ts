import { signal } from "canvasengine";
import type {
  ResolvedChatClientOptions,
} from "./client-types";
import type {
  ChatErrorPayload,
  ChatMessage,
} from "./shared-types";
import { normalizeChatClientOptions } from "./client-config";

export const chatMessages = signal<ChatMessage[]>([]);
export const chatError = signal<ChatErrorPayload | null>(null);
export const chatClientOptions = signal<ResolvedChatClientOptions>(
  normalizeChatClientOptions(),
);

export function configureChatClient(options: ResolvedChatClientOptions): void {
  chatClientOptions.set(options);
  chatMessages.set([]);
  chatError.set(null);
}

export function addChatMessage(message: ChatMessage): void {
  const next = [...chatMessages(), message];
  chatMessages.set(next.slice(-chatClientOptions().maxMessages));
}

export function clearChatMessages(): void {
  chatMessages.set([]);
}
