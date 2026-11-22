import { describe, expect, test } from "vitest";
import { battleIsShown } from "../client/battle-shown";

describe("the battle is on the screen", () => {
  test("not before the session exists", () => {
    expect(battleIsShown(false, "closed")).toBe(false);
  });

  test("not while the session loads its fighters: the stage of the lobby stays, the map is not shown", () => {
    expect(battleIsShown(true, "loading")).toBe(false);
  });

  test("once it plays, waits for an order or shows its result", () => {
    for (const phase of ["playing", "command", "target", "waiting", "result"]) expect(battleIsShown(true, phase)).toBe(true);
  });

  test("not once it is closed", () => {
    expect(battleIsShown(true, "closed")).toBe(false);
  });
});
