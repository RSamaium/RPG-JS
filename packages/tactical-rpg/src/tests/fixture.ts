import { createTacticalBattle, type BattleState, type TacticalSkillRecord, type TacticalUnitRecord } from "../core";
import { emberDatabase } from "./demo-database";

const db = emberDatabase as Record<string, any>;

/** The demo "sanctuary" encounter, with readable ids (`ally-warrior`, `enemy-mage`…). */
export function createEncounter(): BattleState {
  const units: Record<string, TacticalUnitRecord> = {};
  const skills: Record<string, TacticalSkillRecord> = {};
  for (const [id, record] of Object.entries(db)) {
    if (record._type === "tactical-unit") units[id] = record;
    if (record._type === "skill") skills[id] = record;
  }
  const state = createTacticalBattle(
    { name: db.sanctuary.name, data: db.sanctuary.tactical, units, skills },
    { id: "test" },
  );
  for (const unit of state.units) unit.id = `${unit.team}-${unit.role}`;
  return state;
}
