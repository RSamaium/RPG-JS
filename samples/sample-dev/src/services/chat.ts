import { hasGoldenName, isPremium } from "./premium";

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
  isGolden: boolean;
  isPremium: boolean;
}

const MAX_HISTORY = 100;
const chatHistory: ChatMessage[] = [];

export function createChatMessage(
  playerId: string,
  playerName: string,
  text: string
): ChatMessage {
  const msg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    playerId,
    playerName,
    text: sanitize(text).slice(0, 500),
    timestamp: Date.now(),
    isGolden: hasGoldenName(playerId),
    isPremium: isPremium(playerId),
  };

  chatHistory.push(msg);
  if (chatHistory.length > MAX_HISTORY) {
    chatHistory.shift();
  }

  return msg;
}

export function getChatHistory(): ChatMessage[] {
  return [...chatHistory];
}

function sanitize(text: string): string {
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
