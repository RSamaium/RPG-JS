import { RpgEvent, RpgPlayer, type RpgServer } from "@rpgjs/server";
import { defineModule } from "@rpgjs/common";
import { BattleAi } from "./ai.server";

/**
 * Default player attack hitboxes for each direction
 * 
 * These hitboxes define the attack areas relative to the player's position
 * for each cardinal direction. They can be customized by modifying this object
 * or by providing custom hitboxes in the module configuration.
 */
export const DEFAULT_PLAYER_ATTACK_HITBOXES = {
  up: { x: -16, y: -48, width: 32, height: 32 },
  down: { x: -16, y: 16, width: 32, height: 32 },
  left: { x: -48, y: -16, width: 32, height: 32 },
  right: { x: 16, y: -16, width: 32, height: 32 },
  default: { x: 0, y: -32, width: 32, height: 32 }
};

export default defineModule<RpgServer>({
  player: {
    /**
     * Handle player input for combat actions
     *
     * When a player presses the action key, create an attack hitbox
     * that can damage AI enemies within range and knockback the event.
     *
     * @param player - The player performing the action
     * @param input - Input data containing pressed keys
     */
    onInput(player: RpgPlayer, input: any) {
      if (input.action) {
        // Create attack hitbox in front of player
        const direction = player.getDirection();
        let hitboxes: Array<{
          x: number;
          y: number;
          width: number;
          height: number;
        }> = [];

        // Get hitbox configuration for the direction
        const hitboxConfig = DEFAULT_PLAYER_ATTACK_HITBOXES[direction] || DEFAULT_PLAYER_ATTACK_HITBOXES.default;
        hitboxes = [hitboxConfig];

        player.createMovingHitbox(hitboxes, { speed: 3 }).subscribe({
          next(hits) {
            hits.forEach((hit) => {
              if (hit instanceof RpgEvent) {
                // Check if the event has AI
                const ai = (hit as any).battleAi as BattleAi;
                if (ai) {
                  // Use the AI's damagePlayer method (but for the event)
                  const defeated = ai.takeDamage(player);

                  // Calculate knockback direction (away from player)
                  const dx = hit.x() - player.x();
                  const dy = hit.y() - player.y();
                  const distance = Math.sqrt(dx * dx + dy * dy);
                  
                  // Normalize direction for knockback
                  const knockbackDirection = {
                    x: distance > 0 ? dx / distance : 0,
                    y: distance > 0 ? dy / distance : 0
                  };
                  
                  // Knockback the event
                  hit.knockback(knockbackDirection, 15, 300);

                  if (defeated) {
                    console.log(`Player ${player.id} defeated AI ${hit.id}`);
                  }
                }
              }
            });
          },
        });
      }
    },
  },
  event: {
    /**
     * Handle player detection when entering AI vision
     *
     * Called when a player enters an AI event's vision range.
     * The AI will start pursuing and attacking the player.
     *
     * @param event - The AI event
     * @param player - The player entering vision
     * @param shape - The vision shape
     */
    onDetectInShape(event: RpgEvent, player: RpgPlayer, shape: any) {
      const ai = (event as any).battleAi as BattleAi;
      ai?.onDetectInShape(player, shape);
    },

    /**
     * Handle player leaving AI vision
     *
     * Called when a player leaves an AI event's vision range.
     * The AI will stop pursuing the player.
     *
     * @param event - The AI event
     * @param player - The player leaving vision
     * @param shape - The vision shape
     */
    onDetectOutShape(event: RpgEvent, player: RpgPlayer, shape: any) {
      const ai = (event as any).battleAi as BattleAi;
      ai?.onDetectOutShape(player, shape);
    },
  },
});
