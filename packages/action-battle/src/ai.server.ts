import { MAXHP, RpgEvent, RpgPlayer } from "@rpgjs/server";

type RpgEventWithBattleAi = RpgEvent & {
  battleAi: BattleAi;
};

/**
 * Battle AI system for events
 *
 * This class provides intelligent combat behavior for events, including:
 * - Vision detection to spot players
 * - Movement towards targets
 * - Attack mechanics with hitboxes
 * - Health management and death handling
 *
 * The AI can be applied to any event to make it behave as a combat entity
 * that will pursue and attack players within its vision range.
 *
 * @example
 * ```ts
 * // Create AI for an event
 * const battleAi = new BattleAi(event, {
 *   health: 150,
 *   attackDamage: 25,
 *   visionRange: 200
 * });
 * ```
 */
export class BattleAi {
  private event: RpgEvent;
  private target: InstanceType<typeof RpgPlayer> | null = null;
  private lastAttackTime: number = 0;
  private health: number;
  private maxHealth: number;
  private attackDamage: number;
  private attackCooldown: number;
  private visionRange: number;
  private attackRange: number;
  private updateInterval?: any;

  /**
   * Create a new Battle AI instance
   *
   * Transforms a regular event into an intelligent combat entity with vision,
   * movement, and attack capabilities. The event will automatically detect
   * players within its vision range and engage in combat.
   *
   * @param event - The event to apply AI to
   * @param options - Configuration options for the AI behavior
   *
   * @example
   * ```ts
   * // Create a basic enemy
   * const ai = new BattleAi(event);
   *
   * // Create a stronger enemy with custom stats
   * const ai = new BattleAi(event, {
   *   health: 150,
   *   attackDamage: 25,
   *   visionRange: 200,
   *   attackRange: 50
   * });
   * ```
   */
  constructor(
    event: RpgEventWithBattleAi,
    options: {
      health?: number;
      attackDamage?: number;
      attackCooldown?: number;
      visionRange?: number;
      attackRange?: number;
    } = {}
  ) {
    event.battleAi = this;
    this.event = event;
    this.health = options.health || 100;
    this.maxHealth = options.health || 100;
    this.attackDamage = options.attackDamage || 20;
    this.attackCooldown = options.attackCooldown || 1000; // 1 second
    this.visionRange = options.visionRange || 150;
    this.attackRange = options.attackRange || 40;

    // Setup AI systems
    this.setupVision();
    this.setupAttackMechanics();
  }

  /**
   * Setup vision detection for the AI event
   *
   * Creates a circular vision area around the event that detects when players
   * enter or leave the detection range. When a player enters, the AI will
   * start pursuing them.
   */
  private setupVision() {
    this.event.attachShape(`vision_${this.event.id}`, {
      radius: this.visionRange,
      angle: 360,
    });
  }

  /**
   * Setup attack mechanics for the AI event
   *
   * Configures the event's attack behavior, including damage dealing
   * and health management. The AI will attack targets within range
   * and can be damaged by players.
   */
  private setupAttackMechanics() {
    // Start AI behavior loop
    this.startAiBehaviorLoop();
  }

  /**
   * Start the AI behavior loop
   *
   * Initiates a continuous loop that updates AI behavior at regular intervals.
   * This replaces the onChanges approach with a timer-based system.
   */
  private startAiBehaviorLoop() {
    const updateInterval = setInterval(() => {
      // Check if event still exists
      if (!this.event.getCurrentMap()) {
        this.destroy();
        return;
      }

      this.updateAiBehavior();
    }, 100); // Update every 100ms

    // Store interval ID for cleanup
    this.updateInterval = updateInterval;
  }

  /**
   * Update AI behavior each frame
   *
   * Handles the main AI logic including target tracking, movement,
   * and attack execution. This method is called continuously to
   * maintain intelligent behavior.
   */
  private updateAiBehavior() {
    const currentTime = Date.now();

    // If we have a target, try to attack
    if (this.target) {
      const distance = this.getDistance(this.event, this.target);

      // Check if target is still in vision range
      if (distance > this.visionRange * 1.2) {
        // 20% buffer to avoid flickering
        this.target = null;
        this.event.stopMoveTo();
        return;
      }
      
      // Attack if in range and cooldown is ready
      if (
        distance <= this.attackRange &&
        currentTime - this.lastAttackTime >= this.attackCooldown
      ) {
        this.performAttack();
        this.lastAttackTime = currentTime;
      }
    }
  }

  /**
   * Handle player detection when entering vision
   *
   * Called when a player enters the AI's vision range. The AI will
   * start pursuing the detected player and attempt to engage in combat.
   *
   * @param player - The detected player
   * @param shape - The vision shape that detected the player
   */
  onDetectInShape(player: InstanceType<typeof RpgPlayer>, shape: any) {
    if (shape.id !== `vision_${this.event.id}`) return;
    // Set player as target and start pursuing
    this.target = player;
    this.event.moveTo(player);
  }

  /**
   * Handle player leaving vision range
   *
   * Called when a player leaves the AI's vision range. The AI will
   * stop pursuing the player and return to idle state.
   *
   * @param player - The player leaving vision
   * @param shape - The vision shape
   */
  onDetectOutShape(player: InstanceType<typeof RpgPlayer>, shape: any) {
    if (shape.id !== `vision_${this.event.id}`) return;

    // Stop pursuing if this was our target
    if (this.target === player) {
      this.target = null;
      this.event.stopMoveTo();
    }
  }

  /**
   * Perform an attack on the current target
   *
   * Creates a moving hitbox that damages any players it hits.
   * The attack direction is based on the AI's current facing direction.
   */
  private performAttack() {
    if (!this.target) return;

    // Calculate attack direction towards target
    const dx = this.target.x() - this.event.x();
    const dy = this.target.y() - this.event.y();
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return;

    // Normalize direction
    const dirX = dx / distance;
    const dirY = dy / distance;

    // Create attack hitbox in front of the event
    const attackDistance = 30;
    const hitboxes = [
      {
        x: dirX * attackDistance,
        y: dirY * attackDistance,
        width: 40,
        height: 40,
      },
    ];

    this.event.createMovingHitbox(hitboxes, { speed: 5 }).subscribe({
      next: (hits) => {
        hits.forEach((hit) => {
          if (hit instanceof RpgPlayer && hit !== this.event) {
            this.damagePlayer(hit);
          }
        });
      },
    });

    // Show attack animation/effect
    //this.event.showHit(`-${this.attackDamage}`);
  }

  /**
   * Apply damage to a player
   *
   * Reduces the player's health and shows damage feedback.
   * This method handles the actual damage calculation and application.
   *
   * @param player - The player to damage
   * @param damage - Amount of damage to deal
   */
  private damagePlayer(player: RpgPlayer) {
    // Calculate knockback direction based on attack direction
    const dx = player.x() - this.event.x();
    const dy = player.y() - this.event.y();
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction for knockback (away from AI)
    const knockbackDirection = {
      x: distance > 0 ? dx / distance : 0,
      y: distance > 0 ? dy / distance : 0
    };
    
    player.knockback(knockbackDirection, 10, 200);
    const { damage } = player.applyDamage(this.event);

    // Show damage feedback
    // player.showHit(`-${damage}`);
    // player.broadcastEffect('damage', { damage });

    console.log(
      `AI dealt ${damage} damage to ${player.id}. HP: ${player.hp}/${player.param[MAXHP]}`
    );
  }

  /**
   * Apply damage to this AI
   *
   * Reduces the AI's health and handles death if health reaches zero.
   * When an AI dies, it is removed from the map and cleaned up.
   *
   * @param damage - Amount of damage to deal
   * @returns True if the AI died, false otherwise
   */
  takeDamage(damage: number): boolean {
    this.health = Math.max(0, this.health - damage);

    // Show damage feedback
    this.event.showHit(`-${damage}`);
    this.event.broadcastEffect("damage", { damage });

    console.log(
      `AI ${this.event.id} took ${damage} damage. HP: ${this.health}/${this.maxHealth}`
    );

    // Check if AI died
    if (this.health <= 0) {
      this.kill();
      return true;
    }

    return false;
  }

  /**
   * Kill this AI
   *
   * Handles the death of the AI, including cleanup and removal
   * from the map. This method is called when the AI's health reaches zero.
   */
  private kill() {
    console.log(`AI ${this.event.id} has been defeated!`);

    // Show death effect
    this.event.broadcastEffect("death", {});

    // Clean up and remove event from map
    this.destroy();
    this.event.remove();
  }

  /**
   * Calculate distance between two entities
   *
   * Utility method to calculate the Euclidean distance between
   * two game entities (events or players).
   *
   * @param entity1 - First entity
   * @param entity2 - Second entity
   * @returns Distance between the entities
   */
  private getDistance(entity1: any, entity2: any): number {
    const dx = entity1.x() - entity2.x();
    const dy = entity1.y() - entity2.y();
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get current AI health
   *
   * @returns Current health value
   */
  getHealth(): number {
    return this.health;
  }

  /**
   * Get maximum AI health
   *
   * @returns Maximum health value
   */
  getMaxHealth(): number {
    return this.maxHealth;
  }

  /**
   * Get current target
   *
   * @returns Current target player or null
   */
  getTarget(): InstanceType<typeof RpgPlayer> | null {
    return this.target;
  }

  /**
   * Destroy the AI instance
   *
   * Cleans up all resources and stops the AI behavior.
   * This method should be called when the AI is no longer needed.
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
    this.target = null;
  }
}
