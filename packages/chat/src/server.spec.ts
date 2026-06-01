import { describe, expect, test, vi } from "vitest";
import {
  CHAT_MESSAGE_EVENT,
  normalizeChatOptions,
} from "./config";
import {
  createMapChatMessage,
  handleChatSend,
} from "./server";

const createPlayer = (overrides: Record<string, any> = {}) => {
  const map = {
    id: "map-1",
    broadcast: vi.fn(),
  };
  const player = {
    id: "player-1",
    name: "Ada",
    getCurrentMap: vi.fn(() => map),
    ...overrides,
  };
  return { player: player as any, map };
};

describe("chat server", () => {
  test("rejects empty messages", async () => {
    const { player } = createPlayer();
    const options = normalizeChatOptions();

    await expect(
      createMapChatMessage(player, { text: "   " }, options)
    ).resolves.toBeNull();
  });

  test("trims whitespace and clips to maxLength", async () => {
    const { player } = createPlayer();
    const options = normalizeChatOptions({ maxLength: 8 });

    const message = await createMapChatMessage(
      player,
      { text: "  hello     world  " },
      options
    );

    expect(message).toMatchObject({
      text: "hello wo",
      author: "Ada",
      playerId: "player-1",
      mapId: "map-1",
      scope: "map",
    });
    expect(typeof message?.id).toBe("string");
    expect(typeof message?.createdAt).toBe("number");
  });

  test("uses sanitize to reject a message", async () => {
    const { player } = createPlayer();
    const options = normalizeChatOptions({
      sanitize: () => false,
    });

    await expect(
      createMapChatMessage(player, { text: "blocked" }, options)
    ).resolves.toBeNull();
  });

  test("uses sanitize to transform a message", async () => {
    const { player } = createPlayer();
    const options = normalizeChatOptions({
      sanitize: (text) => text.replace("bad", "ok"),
    });

    const message = await createMapChatMessage(
      player,
      { text: "bad message" },
      options
    );

    expect(message?.text).toBe("ok message");
  });

  test("broadcasts accepted messages on the current map", async () => {
    const { player, map } = createPlayer();
    const options = normalizeChatOptions();

    const message = await handleChatSend(player, { text: "hello" }, options);

    expect(message?.text).toBe("hello");
    expect(map.broadcast).toHaveBeenCalledWith(CHAT_MESSAGE_EVENT, message);
  });

  test("does not broadcast when the player is not on a map", async () => {
    const { player, map } = createPlayer({
      getCurrentMap: vi.fn(() => undefined),
    });
    const options = normalizeChatOptions();

    await expect(
      handleChatSend(player, { text: "hello" }, options)
    ).resolves.toBeNull();
    expect(map.broadcast).not.toHaveBeenCalled();
  });
});
