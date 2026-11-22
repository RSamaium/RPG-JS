import { describe, expect, it } from "vitest";
import type { BattleView, CommandInfo } from "../core";
import { commandEntry, commandsOf } from "../client/menu-entries";

const info = (id: string, over: Partial<CommandInfo> = {}): CommandInfo => ({ id, label: id.toUpperCase(), scope: "enemy", ...over });
const view = (commands: CommandInfo[], over: Partial<BattleView> = {}) =>
  ({ catalog: { commands: Object.fromEntries(commands.map((c) => [c.id, c])) }, ...over }) as unknown as BattleView;
const hero = { commands: ["steal", "strike", "ghost"], sp: 10 } as never;

describe("the custom commands of the menu", () => {
  it("are the ones in the menu itself, and the ones among the skills, that the catalog knows", () => {
    const v = view([info("steal"), info("strike", { inSkills: true })]);

    expect(commandsOf(hero, v, false).map((c) => c.id)).toEqual(["steal"]);
    expect(commandsOf(hero, v, true).map((c) => c.id)).toEqual(["strike"]);
  });

  it("are entries with their icon, their cost and their description", () => {
    const entry = commandEntry(info("steal", { icon: "✋", spCost: 4, description: "Takes an item" }), hero, view([]), "PM");

    expect(entry).toEqual({ id: "cmd:steal", label: "STEAL", icon: "✋", hint: "4 PM", detail: "Takes an item", disabled: false });
  });

  it("are greyed out when they cost more than the SP the unit has, or the battle blocks them", () => {
    expect(commandEntry(info("a", { spCost: 99 }), hero, view([]), "PM").disabled).toBe(true);
    expect(commandEntry(info("a"), hero, view([], { blocked: ["a"] }), "PM").disabled).toBe(true);
    expect(commandEntry(info("a"), hero, view([], { blocked: ["b"] }), "PM").disabled).toBe(false);
  });

  it("are greyed out when the troop forbids the actions", () => {
    expect(commandEntry(info("a"), hero, view([], { forbid: ["action"] }), "PM").disabled).toBe(true);
  });

  it("have a diamond when they have no icon, and no cost hint when they are free", () => {
    const entry = commandEntry(info("a"), hero, view([]), "PM");

    expect(entry.icon).toBe("◆");
    expect(entry.hint).toBeUndefined();
  });
});
