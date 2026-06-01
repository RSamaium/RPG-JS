import { beforeEach, describe, expect, test } from "vitest";
import { normalizeChatOptions } from "./config";
import {
  addChatMessage,
  chatMessages,
  clearChatMessages,
  configureChatClient,
} from "./client-state";
import type { ChatMessage } from "./types";

const message = (id: string): ChatMessage => ({
  id,
  text: `message ${id}`,
  author: "Ada",
  playerId: "player-1",
  mapId: "map-1",
  createdAt: Number(id),
  scope: "map",
});

describe("chat client state", () => {
  beforeEach(() => {
    configureChatClient(normalizeChatOptions({ maxMessages: 2 }));
  });

  test("adds received messages", () => {
    addChatMessage(message("1"));

    expect(chatMessages()).toEqual([message("1")]);
  });

  test("keeps only maxMessages entries", () => {
    addChatMessage(message("1"));
    addChatMessage(message("2"));
    addChatMessage(message("3"));

    expect(chatMessages()).toEqual([message("2"), message("3")]);
  });

  test("clears messages", () => {
    addChatMessage(message("1"));
    clearChatMessages();

    expect(chatMessages()).toEqual([]);
  });
});
