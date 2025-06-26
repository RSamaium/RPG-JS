import { RpgEvent, RpgPlayer, type RpgServer } from "@rpgjs/server";
import { defineModule } from "@rpgjs/common";

export default defineModule<RpgServer>({
  player: {
    /**
     * Handle player input for combat actions
     *
     * When a player presses the action key, create an attack hitbox
     * that can damage AI enemies within range.
     *
     * @param player - The player performing the action
     * @param input - Input data containing pressed keys
     */
    onInput(player: RpgPlayer, input: any) {
      if (input.input && input.input.includes("action")) {
        // Create attack hitbox in front of player
        const direction = player.getDirection();
        let hitboxes: Array<{
          x: number;
          y: number;
          width: number;
          height: number;
        }> = [];

        // Calculate attack hitbox based on player direction
        switch (direction) {
          case "up":
            hitboxes = [{ x: -16, y: -48, width: 32, height: 32 }];
            break;
          case "down":
            hitboxes = [{ x: -16, y: 16, width: 32, height: 32 }];
            break;
          case "left":
            hitboxes = [{ x: -48, y: -16, width: 32, height: 32 }];
            break;
          case "right":
            hitboxes = [{ x: 16, y: -16, width: 32, height: 32 }];
            break;
          default:
            hitboxes = [{ x: 0, y: -32, width: 32, height: 32 }];
        }

        player.createMovingHitbox(hitboxes, { speed: 3 }).subscribe({
          next(hits) {
            hits.forEach((hit) => {
              if (hit instanceof RpgEvent) {
                // Try to damage the AI event
                const damaged = battleAi.damageAi(hit, 30); // Deal 30 damage

                if (damaged) {
                  console.log(`Player ${player.id} defeated AI ${hit.id}`);
                }
              }
            });
          },
        });

        // Show player attack feedback
        player.showHit("Attack!");
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
      event.battleAi?.onDetectInShape(player, shape);
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
      event.battleAi?.onDetectOutShape(player, shape);
    },
  },
});
