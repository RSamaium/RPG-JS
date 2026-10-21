/**
 * `@rpgjs/script`: sandboxed scripts for RPGJS.
 *
 * - `@rpgjs/script/server` plugs scripts into the server of the game.
 * - `@rpgjs/script/core` is the interpreter, with no dependency on the engine: it runs in Node, in a Worker and in a browser.
 * - `@rpgjs/script/parse` turns the text of a script into the tree the interpreter walks.
 * - `@rpgjs/script/testing` checks, simulates and tests scripts without the game.
 */
export type { ScriptWorld, PlayerPort } from "./game/impl";
