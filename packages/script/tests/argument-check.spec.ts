import { describe, expect, test } from "vitest";
import { checkScript } from "../src/testing";
import { signatureParams } from "../src/core/api";
import { GAME_API_DESCRIPTION } from "../src/game/description";
import { ScriptService } from "../src/server";

/** The diagnostics of a script whose only function runs `body`. */
const check = (body: string) => checkScript(`export function run() {\n  ${body}\n}`);

describe("signatureParams", () => {
  test("reads the parameters of a signature, with the commas of their types", () => {
    expect(signatureParams("(id: string, data?: object, options?: { blockPlayerInput?: boolean; x: [number, number] }): void")).toEqual([
      { name: "id", type: "string", optional: false, rest: false },
      { name: "data", type: "object", optional: true, rest: false },
      { name: "options", type: "{ blockPlayerInput?: boolean; x: [number, number] }", optional: true, rest: false },
    ]);
    expect(signatureParams('(text: string, options?: { position?: "top, middle" | "bottom" }): void')?.map((p) => p.name)).toEqual(["text", "options"]);
    expect(signatureParams("(): void")).toEqual([]);
    expect(signatureParams("(...ids: string[]): void")).toEqual([{ name: "ids", type: "string[]", optional: false, rest: true }]);
    expect(signatureParams("(f: (a: number, b: number) => void): void")?.map((p) => p.type)).toEqual(["(a: number, b: number) => void"]);
    expect(signatureParams("not a signature")).toBeUndefined();
  });

  test("reads every signature of the game API", () => {
    const sigs = [
      ...Object.values(GAME_API_DESCRIPTION.handles).flatMap((h) => Object.values(h.methods ?? {}).map((m) => m.sig)),
      ...Object.values(GAME_API_DESCRIPTION.functions).map((f) => f.sig),
    ];
    expect(sigs.filter((sig) => !signatureParams(sig))).toEqual([]);
  });
});

describe("checkScript and the arguments of the game API", () => {
  test("refuses a call that misses a required argument, with the line and the parameter", () => {
    const result = checkScript(`on("gui.action", { where: { gui: "popover_action_popover_gui" } }, (e) => {\n  $player.closeGui();\n});`);
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual([{ line: 2, message: '"$player.closeGui" needs at least 1 argument (id: string, data?: object), got 0' }]);
  });

  test("names every required parameter", () => {
    expect(check(`$player.updateGui("shop");`).diagnostics[0].message).toBe('"$player.updateGui" needs 2 arguments (id: string, data: object), got 1');
    expect(check(`const n = random(1);`).diagnostics[0].message).toBe('"random" needs 2 arguments (min: number, max: number), got 1');
  });

  test("refuses too many arguments", () => {
    expect(check(`$player.closeGui("shop", {}, 3);`).diagnostics[0].message).toBe('"$player.closeGui" takes at most 2 arguments (id: string, data?: object), got 3');
    expect(check(`$map.setDay(1);`).diagnostics[0].message).toBe('"$map.setDay" takes no argument, got 1');
  });

  test("refuses a literal of another kind than a string, number or boolean parameter", () => {
    expect(check(`$player.closeGui(42);`).diagnostics[0].message).toBe('"$player.closeGui": the argument 1 (id) must be a string, got 42');
    expect(check(`wait("2");`).diagnostics[0].message).toBe('"wait": the argument 1 (seconds) must be a number, got "2"');
    expect(check(`$player.addItem("potion", null);`).diagnostics[0].message).toBe('"$player.addItem": the argument 2 (nb) must be a number, got null');
  });

  test("reports every wrong call of the script", () => {
    const result = check(`$player.closeGui();\n  wait("2");`);
    expect(result.diagnostics.map((d) => d.line)).toEqual([2, 3]);
  });

  test("accepts the calls that match their signature", () => {
    for (const body of [
      `$player.closeGui("shop");`,
      `$player.closeGui("shop", { done: true });`,
      "$player.closeGui(`shop_${1}`);",
      `const id = "shop"; $player.closeGui(id);`,
      `const args = ["shop"]; $player.closeGui(...args);`,
      `$player.addItem(Item("potion"), 2);`,
      `$player.setVariable("k", 3);`,
      `$player.setVariable("k", "text");`,
      `$map.setDay();`,
      `wait(1);`,
    ]) expect(check(body).diagnostics, body).toEqual([]);
  });

  test("does not check a function of the script that has the name of the API", () => {
    expect(checkScript(`function wait() { return 1; }\nexport function run() { return wait(); }`).diagnostics).toEqual([]);
  });
});

describe("a script already installed in a game", () => {
  test("is not refused for its arguments: they are checked when it is saved", () => {
    const service = new ScriptService({ scripts: [{ id: "old", source: `export function run() {\n  $player.closeGui();\n}` }] });
    expect(service.errors).toEqual([]);
  });
});
