/**
 * The game API of scripts, as data: what a script may read, assign and call in a game. It follows the API of RPGJS: the names are
 * the ones of `RpgPlayer` (`showText`, `showChoices`, `showNotification`, `changeMap`, `addItem`, `getVariable`…), and so are the
 * options that exist there. What each of these does is not here: the game (a player, a map) and the simulation each implement it
 * (`ApiImpl`), and `missingImplementations` checks that they cover exactly this list.
 */
import type { ApiDescription } from "../core/api";
import { GAME_SIGNALS } from "./signals";

const VALUE = "string | number | boolean | null | object";

export const GAME_API_DESCRIPTION: ApiDescription = {
  signals: GAME_SIGNALS,
  handles: {
    $player: {
      doc: "The player the script acts for. The names are the ones of RpgPlayer.",
      members: {
        gold: { type: "number", writable: true, doc: "The gold. Assign it with =, +=, -=, *=: it never goes below 0." },
        level: { type: "number" },
        name: { type: "string" },
      },
      methods: {
        getItem: { sig: "(id: string): { id: string; name: string; quantity: number } | undefined", doc: "A copy of an item of the inventory, or undefined when the player has none." },
        hasItem: { sig: "(id: string): boolean" },
        addItem: { sig: "(id: string, nb?: number): void", doc: "Gives an item of the database of the game." },
        removeItem: { sig: "(id: string, nb?: number): void", doc: "Takes up to nb items: a player who has fewer loses what they have, one who has none loses nothing." },
        getVariable: { sig: `(key: string): ${VALUE} | undefined`, doc: "A variable of the player. What you read is read-only: copy it before changing the copy." },
        setVariable: { sig: `(key: string, value: ${VALUE}): void`, doc: "Sets a variable of the player: a text, a number, true/false, null, or plain data of at most 2 000 characters. The value is copied." },
        hasVariable: { sig: "(key: string): boolean" },
        removeVariable: { sig: "(key: string): boolean", doc: "Returns whether there was something to remove." },
        showText: {
          sig: '(text: string, options?: { position?: "top" | "middle" | "bottom"; speaker?: string; fullWidth?: boolean; autoClose?: boolean; typewriterEffect?: boolean }): void',
          doc: "Shows a dialogue and waits for the player to close it.",
        },
        showChoices: {
          sig: "(text: string, choices: { text: string; value: string | number | boolean }[]): { text: string; value: string | number | boolean } | null",
          doc: "Asks the player to pick one of 2 to 8 choices and waits. Gives the choice picked, or null when the player closes it.",
        },
        showNotification: { sig: '(message: string, options?: { type?: "info" | "warn" | "error"; time?: number }): void', doc: "Shows a notification." },
        changeMap: { sig: "(map: string, positions?: { x: number; y: number }): void", doc: "Moves the player to a map, at a position when given." },
      },
    },
    $event: {
      doc: "The event the script runs for (for the signals of an event).",
      members: { id: { type: "string" }, name: { type: "string", doc: "Empty when the event has none." }, x: { type: "number" }, y: { type: "number" } },
    },
    $shared: {
      doc: "Properties shared by all the players of the map, declared with shared({ ... }). Assignments (=, +=, -=) are applied at once; use take() to test and decrease in one step.",
      declared: true,
      methods: {
        take: {
          sig: "(name: string, amount: number, options?: { min?: number }): boolean",
          doc: "Decrease a number by amount only if it stays at or above min (0 by default). Returns false and changes nothing otherwise. Atomic: two players cannot both take the last one.",
        },
      },
      dynamic: { keyDoc: "name: string", type: "number | string | boolean | null", writable: true },
    },
    $hook: {
      doc: "The payload of the signal that fired the script (the handler receives the same data as its argument).",
      dynamic: { keyDoc: "key: string", type: "string | undefined" },
    },
    $state: {
      doc: "Persistent data of the script's plugin. What you read is read-only: to change a value, build a modified copy, then assign the whole copy: const c = { ...$state.crafted }; c[id] = n; $state.crafted = c;",
      dynamic: { keyDoc: "key: string", type: "any", writable: true },
    },
  },
  functions: {
    wait: { sig: "(seconds: number): void", doc: "Pauses the script (60 seconds at most; not slept in a simulation)." },
    random: { sig: "(min: number, max: number): number", doc: "A whole number between min and max, both included. Seeded in a simulation." },
    Item: { sig: "(id: string): string", ref: "item", doc: 'Reference to an item of the database, checked when the script is saved: Item("potion").' },
    Graphic: { sig: "(id: string): string", ref: "graphic", doc: 'Reference to a graphic of the database: Graphic("npc_marchand").' },
  },
};
