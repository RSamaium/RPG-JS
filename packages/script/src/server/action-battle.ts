/**
 * The hooks that plug the scripts into an action battle: `combat.hit` is emitted after each hit.
 */
import type { RpgPlayer } from "@rpgjs/server";
import type { ScriptService } from "./service";

/** What an action battle gives `combat.hooks.afterHit`: the attacker and the target are players or events. */
interface HitResult {
  damage: number;
  defeated: boolean;
  attacker: RpgPlayer;
  target: RpgPlayer;
}

const isEvent = (entity: unknown): boolean =>
  !!entity && typeof (entity as { isEvent?: unknown }).isEvent === "function" && (entity as { isEvent(): boolean }).isEvent();
const nameOf = (entity: any): string => String((typeof entity?.name === "function" ? entity.name() : entity?.name) ?? "");
const fighter = (entity: any) => ({ id: String(entity?.id ?? ""), name: nameOf(entity), kind: isEvent(entity) ? "event" : "player" });

/**
 * The hooks of an action battle that emit `combat.hit` to the scripts, for the player of the hit: the attacker, otherwise the target.
 * A hit between two events emits nothing, since a script acts for a player.
 *
 * @param service - The service that receives the signal.
 * @returns The hooks, to give to the combat of Action Battle.
 *
 * @example
 * ```ts
 * const scripts = new ScriptService();
 * provideScripts(scripts);
 * provideActionBattle({ combat: { hooks: actionBattleHooks(scripts) } });
 * ```
 */
export function actionBattleHooks(service: ScriptService): { afterHit(result: HitResult): void } {
  return {
    afterHit(result) {
      if (service.listeners("combat.hit").length === 0) return;
      const player = [result.attacker, result.target].find((entity) => entity && !isEvent(entity));
      if (!player) return;
      const map = (player as any).getCurrentMap?.() ?? null;
      void service.emit(
        "combat.hit",
        { damage: Number(result.damage), defeated: !!result.defeated, attacker: fighter(result.attacker), target: fighter(result.target) },
        { player, map },
      );
    },
  };
}
