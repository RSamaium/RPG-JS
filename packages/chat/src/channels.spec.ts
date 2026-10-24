import { describe, expect, test, vi } from "vitest";
import { CHAT_ERROR_EVENT, CHAT_MESSAGE_EVENT } from "./config";
import { defineChatChannel, globalChannel, mapChannel } from "./channels";
import { normalizeChatServerOptions } from "./server-config";
import { createChatHandler } from "./server";
import type { ChatPlayerLike } from "./server-types";

const createPlayer = (id = "player-1") => {
  const map = { id: "forest", broadcast: vi.fn() };
  const player: ChatPlayerLike = {
    id,
    name: "Ayla",
    getCurrentMap: () => map,
    emit: vi.fn(),
    on: vi.fn(),
  };
  return { player, map };
};

const lastError = (player: ChatPlayerLike) =>
  (player.emit as ReturnType<typeof vi.fn>).mock.calls.filter(([type]) => type === CHAT_ERROR_EVENT).at(-1)?.[1];

describe("channels of the chat", () => {
  const guild = defineChatChannel({
    id: "guild",
    label: "game.chat.guild",
    color: "violet",
    canSend: (player: ChatPlayerLike) => player.id !== "outsider",
    audience: () => ({ type: "group" as const, id: "guild-7" }),
  });

  test("declares the channels with their definition, and keeps the ids for the existing options", () => {
    const options = normalizeChatServerOptions({ channels: ["map", guild] });

    expect(options.channels).toEqual(["map", "guild"]);
    expect(options.channelDefinitions).toEqual([mapChannel, guild]);
  });

  test("knows the built-in channels by their id, once each", () => {
    expect(normalizeChatServerOptions({ channels: ["global", "map", "global"] }).channelDefinitions).toEqual([globalChannel, mapChannel]);
  });

  test("refuses a channel id that was not declared, at the start of the game", () => {
    expect(() => normalizeChatServerOptions({ channels: ["private"] })).toThrow(/defineChatChannel/);
  });

  test("delivers to the audience of the channel with the deliver hook, and not on the map", async () => {
    const { player, map } = createPlayer();
    const deliver = vi.fn();
    const handle = createChatHandler(normalizeChatServerOptions({ channels: ["map", guild], rateLimit: false, deliver }));

    const message = await handle(player, { text: "Hello guild", channel: "guild" });

    expect(message).toMatchObject({ channel: "guild", text: "Hello guild" });
    expect(deliver).toHaveBeenCalledWith({ type: "group", id: "guild-7" }, message, player);
    expect(map.broadcast).not.toHaveBeenCalled();
  });

  test("refuses a channel whose audience is not the map when nothing delivers", async () => {
    const { player, map } = createPlayer();
    const onRejected = vi.fn();
    const handle = createChatHandler(normalizeChatServerOptions({ channels: ["map", guild], rateLimit: false, onRejected }));

    await expect(handle(player, { text: "Hello", channel: "guild" })).resolves.toBeNull();

    expect(lastError(player)).toMatchObject({ key: "rpg.chat.error.channel" });
    expect(map.broadcast).not.toHaveBeenCalled();
  });

  test("lets only the players the channel accepts write on it", async () => {
    const outsider = createPlayer("outsider").player;
    const deliver = vi.fn();
    const handle = createChatHandler(normalizeChatServerOptions({ channels: ["map", guild], rateLimit: false, deliver }));

    await expect(handle(outsider, { text: "Let me in", channel: "guild" })).resolves.toBeNull();

    expect(lastError(outsider)).toMatchObject({ key: "rpg.chat.error.rejected" });
    expect(deliver).not.toHaveBeenCalled();
  });

  test("defaults an omitted channel to map, or to the first channel when the game has no map chat", async () => {
    const { player, map } = createPlayer();
    const deliver = vi.fn();
    const withMap = createChatHandler(normalizeChatServerOptions({ channels: [guild, "map"], rateLimit: false, deliver }));
    const withoutMap = createChatHandler(normalizeChatServerOptions({ channels: [guild], rateLimit: false, deliver }));

    expect(await withMap(player, { text: "one" })).toMatchObject({ channel: "map" });
    expect(await withoutMap(player, { text: "two" })).toMatchObject({ channel: "guild" });
    expect(map.broadcast).toHaveBeenCalledTimes(1);
  });

  test("uses deliver for the global channel, and the legacy adapter only when deliver is missing", async () => {
    const { player } = createPlayer();
    const deliver = vi.fn();
    const broadcastGlobal = vi.fn();
    const both = createChatHandler(normalizeChatServerOptions({ channels: ["global"], rateLimit: false, deliver, broadcastGlobal }));
    const legacy = createChatHandler(normalizeChatServerOptions({ channels: ["global"], rateLimit: false, broadcastGlobal }));

    const first = await both(player, { text: "everyone" });
    const second = await legacy(player, { text: "everyone" });

    expect(deliver).toHaveBeenCalledWith({ type: "global" }, first, player);
    expect(broadcastGlobal).toHaveBeenCalledTimes(1);
    expect(broadcastGlobal).toHaveBeenCalledWith(second, player);
  });
});

describe("middleware of the chat", () => {
  test("runs in order around the delivery, and the rewritten text is the one shown", async () => {
    const { player, map } = createPlayer();
    const order: string[] = [];
    const handle = createChatHandler(normalizeChatServerOptions({
      rateLimit: false,
      middleware: [
        async (context, next) => {
          order.push("first");
          context.text = context.text.replace("bad", "***");
          await next();
          order.push("first after");
        },
        async (_context, next) => {
          order.push("second");
          await next();
        },
      ],
    }));

    const message = await handle(player, { text: "bad word" });

    expect(message).toMatchObject({ text: "*** word" });
    expect(order).toEqual(["first", "second", "first after"]);
    expect(map.broadcast).toHaveBeenCalledWith(CHAT_MESSAGE_EVENT, message);
  });

  test("refuses with the error of the middleware, and nothing is shown", async () => {
    const { player, map } = createPlayer();
    const onRejected = vi.fn();
    const handle = createChatHandler(normalizeChatServerOptions({
      rateLimit: false,
      middleware: [(context) => context.reject("game.chat.error.muted", { minutes: 10 })],
      onRejected,
    }));

    await expect(handle(player, { text: "hello" })).resolves.toBeNull();

    expect(lastError(player)).toEqual({ key: "game.chat.error.muted", params: { minutes: 10 } });
    expect(map.broadcast).not.toHaveBeenCalled();
    expect(onRejected).toHaveBeenCalledWith({ player, channel: "map", text: "hello", key: "game.chat.error.muted" });
  });

  test("refuses a message that a middleware neither continues nor refuses", async () => {
    const { player, map } = createPlayer();
    const handle = createChatHandler(normalizeChatServerOptions({ rateLimit: false, middleware: [() => {}] }));

    await expect(handle(player, { text: "hello" })).resolves.toBeNull();

    expect(lastError(player)).toMatchObject({ key: "rpg.chat.error.rejected" });
    expect(map.broadcast).not.toHaveBeenCalled();
  });

  test("runs beforeSend first, so that the existing moderation keeps working with the new one", async () => {
    const { player } = createPlayer();
    const seen: string[] = [];
    const handle = createChatHandler(normalizeChatServerOptions({
      rateLimit: false,
      beforeSend: ({ text }) => text.toUpperCase(),
      middleware: [async (context, next) => {
        seen.push(context.text);
        await next();
      }],
    }));

    await handle(player, { text: "hi" });

    expect(seen).toEqual(["HI"]);
  });

  test("refuses a text that grew too long, or empty, after the moderation", async () => {
    const { player } = createPlayer();
    const handle = createChatHandler(normalizeChatServerOptions({
      maxLength: 5,
      rateLimit: false,
      middleware: [async (context, next) => {
        context.text = context.text === "x" ? "" : `${context.text}-too-long`;
        await next();
      }],
    }));

    await handle(player, { text: "ok" });
    expect(lastError(player)).toMatchObject({ key: "rpg.chat.error.too-long", params: { maxLength: 5 } });

    await handle(player, { text: "x" });
    expect(lastError(player)).toMatchObject({ key: "rpg.chat.error.rejected" });
  });

  test("tells onRejected about the refusals of the module itself, and ignores a hook that fails", async () => {
    const { player } = createPlayer();
    const onRejected = vi.fn(async () => {
      throw new Error("audit down");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const handle = createChatHandler(normalizeChatServerOptions({ maxLength: 3, onRejected }));

    await expect(handle(player, { text: "too long" })).resolves.toBeNull();

    expect(onRejected).toHaveBeenCalledWith(expect.objectContaining({ text: "too long", key: "rpg.chat.error.too-long" }));
    expect(lastError(player)).toMatchObject({ key: "rpg.chat.error.too-long" });
    error.mockRestore();
  });
});
