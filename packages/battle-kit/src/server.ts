/**
 * `@rpgjs/battle-kit/server`: the server pieces every battle system shares,
 * whatever its rules: the registry of running battles (busy players,
 * spectators, disconnections), the checks of who takes part, the hooks of the
 * game modules and the reading of the RPGJS database.
 */
export { BattleSessions, type BattleHandleBase, type BattleSession } from "./server/sessions";
export {
  battleParticipants,
  sameBattleMap,
  battlePlayerName,
  isBattleGroup,
  type BattleGroupOptions,
  type BattleParticipants,
} from "./server/participants";
export { BattleServerHooks } from "./server/hooks";
export type { BattleHookArgs } from "./hook-args";
export { databaseRecord, plainValue } from "./server/database";
export { readBattlePlayer, writeBattlePlayer, type BattlePlayerOutcome, type BattlePlayerSnapshot } from "./server/player";
