/**
 * The game API of Studio scripts, as data: what a script may read, assign and call in a game.
 * What each of these does is not here: the game (a player, a map) and the simulation each implement it
 * (`ApiImpl`), and `missingImplementations` checks that they cover exactly this list.
 */
import type { ApiDescription } from "../core/api";

export const GAME_API_DESCRIPTION: ApiDescription = {
  handles: {
    $player: {
      doc: "The player who triggered the script.",
      members: {
        gold: { type: "number", writable: true, doc: "Gold. Assignments (=, +=, -=, *=) run the change_gold block." },
        level: { type: "number" },
        name: { type: "string" },
      },
      methods: {
        itemCount: { sig: "(item: string): number", doc: "How many of an item the player has." },
        hasItem: { sig: "(item: string): boolean" },
        addItem: { sig: "(item: string, count?: number): void", doc: "Runs the change_item block." },
        removeItem: { sig: "(item: string, count?: number): void" },
      },
    },
    $event: {
      doc: "The event running the script.",
      members: { id: { type: "string" }, x: { type: "number" }, y: { type: "number" } },
    },
    $switch: {
      doc: "Global switches by name: $switch.door_open = true.",
      dynamic: { keyDoc: "name: string", type: "boolean", writable: true },
    },
    $self: {
      doc: "Switches private to the current event, named A to F.",
      dynamic: { keyDoc: "letter: string", type: "boolean", writable: true },
    },
    $var: {
      doc: "Numeric game variables by name: $var.visits += 1.",
      dynamic: { keyDoc: "name: string", type: "number", writable: true },
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
      doc: "Data of the event that fired the hook declared with on(...): $hook.enemy for enemy_killed, $hook.item for item_added.",
      dynamic: { keyDoc: "key: string", type: "string | undefined" },
    },
    $state: {
      doc: "Persistent data of the script's plugin. What you read is read-only: to change a value, build a modified copy, then assign the whole copy: const c = { ...$state.crafted }; c[id] = n; $state.crafted = c;",
      dynamic: { keyDoc: "key: string", type: "any", writable: true },
    },
  },
  functions: {
    say: {
      sig: '(text: string, options?: { speaker?: "$this" | "$player"; position?: "top" | "middle" | "bottom" }): void',
      doc: "Show a dialogue text (show_text block).",
    },
    notify: {
      sig: '(message: string, options?: { type?: "info" | "warn" | "error"; time?: number }): void',
      doc: "Show a notification (show_notification block).",
    },
    choice: { sig: "(options: string[]): number", doc: "Ask the player to pick one option (2 to 4). Returns the index. The script waits for the answer." },
    wait: { sig: "(seconds: number): void", doc: "Pause the script (not slept in a simulation)." },
    transfer: {
      sig: '(map: string, x: number, y: number, options?: { direction?: "up" | "down" | "left" | "right" }): void',
      doc: "Move the player to a map (transfer_player block).",
    },
    random: { sig: "(min: number, max: number): number", doc: "A whole number between min and max, both included. Seeded in a simulation." },
    Item: { sig: "(id: string): string", ref: "item", doc: 'Reference to an item of the database, checked when the script is saved: Item("potion").' },
    Graphic: { sig: "(id: string): string", ref: "graphic", doc: 'Reference to a graphic of the database: Graphic("npc_marchand").' },
  },
};
