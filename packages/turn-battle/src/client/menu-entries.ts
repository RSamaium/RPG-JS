import { forbids, type BattleView, type CommandInfo, type Combatant } from "../core";
import type { MenuEntry } from "./state";

/** A custom command as an entry of the menu: greyed out when it costs too much, is blocked now, or the troop forbids the actions. */
export function commandEntry(info: CommandInfo, h: Combatant, view: Pick<BattleView, "blocked" | "forbid">, sp: string): MenuEntry {
  return {
    id: `cmd:${info.id}`,
    label: info.label,
    icon: info.icon ?? "◆",
    hint: info.spCost ? `${info.spCost} ${sp}` : undefined,
    detail: info.description,
    disabled: (info.spCost ?? 0) > h.sp || !!view.blocked?.includes(info.id) || forbids(view, "custom"),
  };
}

/** The commands of a unit the catalog knows, those that stand in the menu itself (`inSkills` false) or among the skills. */
export function commandsOf(h: Pick<Combatant, "commands">, view: Pick<BattleView, "catalog">, inSkills: boolean): CommandInfo[] {
  return h.commands
    .map((id) => view.catalog.commands?.[id])
    .filter((info): info is CommandInfo => !!info && !!info.inSkills === inSkills);
}
