import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { normalizeChatClientOptions } from "./client-config";
import {
  addChatMessage,
  chatChannels,
  chatError,
  chatExpanded,
  chatMessages,
  chatSelectedChannel,
  chatSending,
  chatTall,
  chatUnread,
  configureChatClient,
  removeChatMessage,
  selectChatChannel,
  setChatExpanded,
  setChatTall,
  showChatError,
  startChatSending,
} from "./client-state";
import type { ChatMessage } from "./shared-types";

const message = (id: string, playerId = "other", channel = "map"): ChatMessage => ({
  id,
  text: `text ${id}`,
  author: "Someone",
  playerId,
  channel,
  createdAt: 1,
});

describe("channels of the client", () => {
  test("is the map alone by default, with no selector to draw", () => {
    expect(normalizeChatClientOptions().channels).toEqual([
      { id: "map", label: "rpg.chat.channel.map", color: "slate" },
    ]);
  });

  test("knows the built-in channels by their id, and takes a definition of the server as it is", () => {
    const guild = { id: "guild", label: "game.chat.guild", color: "violet", canSend: () => true, audience: () => ({ type: "global" as const }) };

    expect(normalizeChatClientOptions({ channels: ["global", "map", guild] }).channels).toEqual([
      { id: "global", label: "rpg.chat.channel.global", color: "amber" },
      { id: "map", label: "rpg.chat.channel.map", color: "slate" },
      { id: "guild", label: "game.chat.guild", color: "violet" },
    ]);
  });

  test("keeps each channel once, and gives an unknown id its own name and the default color", () => {
    expect(normalizeChatClientOptions({ channels: ["trade", "trade"] }).channels).toEqual([
      { id: "trade", label: "trade", color: "slate" },
    ]);
  });
});

describe("state of the chat on the client", () => {
  beforeEach(() => {
    configureChatClient(normalizeChatClientOptions({ channels: ["map", "global"], maxMessages: 3 }));
  });
  afterEach(() => vi.useRealTimers());

  test("starts empty, closed (a pill), on the first channel, at the default height", () => {
    expect(chatMessages()).toEqual([]);
    expect(chatExpanded()).toBe(false);
    expect(chatUnread()).toBe(0);
    expect(chatTall()).toBe(false);
    expect(chatSelectedChannel()).toBe("map");
    expect(chatChannels().map((channel) => channel.id)).toEqual(["map", "global"]);
  });

  test("keeps the last messages only, and drops a message a moderation tool removed", () => {
    for (const id of ["1", "2", "3", "4"]) addChatMessage(message(id), "me");
    expect(chatMessages().map((entry) => entry.id)).toEqual(["2", "3", "4"]);

    removeChatMessage("3");
    removeChatMessage("unknown");

    expect(chatMessages().map((entry) => entry.id)).toEqual(["2", "4"]);
  });

  test("selects only a channel of the selector", () => {
    selectChatChannel("global");
    selectChatChannel("private");

    expect(chatSelectedChannel()).toBe("global");
  });

  describe("unread messages", () => {
    test("counts what others say while the chat is reduced, not what the player says, and resets when opened", () => {
      setChatExpanded(false);

      addChatMessage(message("1", "other"), "me");
      addChatMessage(message("2", "me"), "me");
      addChatMessage(message("3", "other"), "me");
      expect(chatUnread()).toBe(2);

      setChatExpanded(true);
      expect(chatUnread()).toBe(0);
    });

    test("counts nothing while the chat is open", () => {
      setChatExpanded(true);
      addChatMessage(message("1"), "me");

      expect(chatUnread()).toBe(0);
    });
  });

  describe("error", () => {
    test("shows the last error for a few seconds only", () => {
      vi.useFakeTimers();

      showChatError({ key: "rpg.chat.error.rejected" });
      expect(chatError()).toEqual({ key: "rpg.chat.error.rejected" });

      vi.advanceTimersByTime(5001);
      expect(chatError()).toBeNull();
    });
  });

  describe("sending", () => {
    test("is on from the moment a message is sent", () => {
      startChatSending();

      expect(chatSending()).toBe(true);
    });

    test("ends when the own message of the player comes back, and not for the message of someone else", () => {
      startChatSending();

      addChatMessage(message("1", "other"), "me");
      expect(chatSending()).toBe(true);

      addChatMessage(message("2", "me"), "me");
      expect(chatSending()).toBe(false);
    });

    test("ends when the server refuses the message", () => {
      startChatSending();

      showChatError({ key: "rpg.chat.error.rejected" });

      expect(chatSending()).toBe(false);
    });

    test("ends by itself when the server never answers, so that the player is not stuck", () => {
      vi.useFakeTimers();
      startChatSending();

      vi.advanceTimersByTime(7_999);
      expect(chatSending()).toBe(true);
      vi.advanceTimersByTime(2);

      expect(chatSending()).toBe(false);
    });
  });

  test("makes the box taller, then back to the default height", () => {
    setChatTall(true);
    expect(chatTall()).toBe(true);

    setChatTall(false);
    expect(chatTall()).toBe(false);
  });

  test("forgets the previous game when it is configured again", () => {
    addChatMessage(message("1"), "me");
    selectChatChannel("global");
    setChatExpanded(true);
    setChatTall(true);
    startChatSending();
    showChatError({ key: "x" });

    configureChatClient(normalizeChatClientOptions({ channels: ["map"] }));

    expect(chatMessages()).toEqual([]);
    expect(chatSelectedChannel()).toBe("map");
    expect(chatExpanded()).toBe(false);
    expect(chatTall()).toBe(false);
    expect(chatSending()).toBe(false);
    expect(chatError()).toBeNull();
  });

  test("is open when the game asks for it with startExpanded", () => {
    configureChatClient(normalizeChatClientOptions({ startExpanded: true }));
    expect(chatExpanded()).toBe(true);
    configureChatClient(normalizeChatClientOptions());
    expect(chatExpanded()).toBe(false);
  });
});
