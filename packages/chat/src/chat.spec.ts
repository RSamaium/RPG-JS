import { describe, expect, test, vi } from "vitest";
import {
  CHAT_ERROR_EVENT,
  CHAT_MESSAGE_EVENT,
  normalizeChatClientOptions,
  normalizeChatServerOptions,
} from "./config";
import { createChatHandler } from "./server";
import type { ChatPlayerLike } from "./types";

const createPlayer = () => {
  const map = {
    id: "forest",
    broadcast: vi.fn(),
  };
  const player: ChatPlayerLike = {
    id: "player-1",
    name: "Ayla",
    getCurrentMap: () => map,
    emit: vi.fn(),
    on: vi.fn(),
  };
  return { player, map };
};

describe("@rpgjs/chat", () => {
  test("uses the stable v5 defaults", () => {
    expect(normalizeChatClientOptions()).toMatchObject({
      guiId: "rpg-chat",
      renderer: "canvas",
      autoOpen: true,
      maxMessages: 100,
    });
    expect(normalizeChatServerOptions()).toMatchObject({
      channels: ["map"],
      maxLength: 180,
      rateLimit: { maxMessages: 5, windowMs: 10_000 },
    });
  });

  test("accepts a replacement renderer without changing chat behavior", () => {
    const Replacement = { name: "CustomChat" };
    expect(normalizeChatClientOptions({
      component: Replacement,
      renderer: "vue",
    })).toMatchObject({
      component: Replacement,
      renderer: "vue",
    });
  });

  test("creates a server-authoritative map message", async () => {
    const { player, map } = createPlayer();
    const afterSend = vi.fn();
    const handle = createChatHandler(normalizeChatServerOptions({ afterSend }));

    const result = await handle(player, {
      text: "  Hello    map  ",
      channel: "map",
    });

    expect(result).toMatchObject({
      text: "Hello map",
      author: "Ayla",
      playerId: "player-1",
      channel: "map",
      mapId: "forest",
    });
    expect(map.broadcast).toHaveBeenCalledWith(CHAT_MESSAGE_EVENT, result);
    expect(afterSend).toHaveBeenCalledWith(result, player);
  });

  test("rejects invalid messages and enforces rate limiting", async () => {
    const { player } = createPlayer();
    const handle = createChatHandler(normalizeChatServerOptions({
      maxLength: 4,
      rateLimit: { maxMessages: 1, windowMs: 10_000 },
    }));

    await expect(handle(player, { text: "longer" })).resolves.toBeNull();
    expect(player.emit).toHaveBeenLastCalledWith(
      CHAT_ERROR_EVENT,
      expect.objectContaining({ key: "rpg.chat.error.too-long" }),
    );

    await expect(handle(player, { text: "ok" })).resolves.toMatchObject({ text: "ok" });
    await expect(handle(player, { text: "no" })).resolves.toBeNull();
    expect(player.emit).toHaveBeenLastCalledWith(
      CHAT_ERROR_EVENT,
      expect.objectContaining({ key: "rpg.chat.error.rate-limit" }),
    );
  });

  test("allows moderation and an optional global adapter", async () => {
    const { player } = createPlayer();
    const broadcastGlobal = vi.fn();
    const handle = createChatHandler(normalizeChatServerOptions({
      channels: ["map", "global"],
      rateLimit: false,
      beforeSend: ({ text }) => text.replace("bad", "***"),
      broadcastGlobal,
    }));

    const message = await handle(player, { text: "bad word", channel: "global" });

    expect(message).toMatchObject({ text: "*** word", channel: "global" });
    expect(broadcastGlobal).toHaveBeenCalledWith(message, player);
  });
});
