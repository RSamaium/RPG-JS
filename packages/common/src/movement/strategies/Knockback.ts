import * as Matter from 'matter-js';
import { MovementStrategy } from '../MovementStrategy';

/**
 * Implements a knockback effect with decreasing force over time
 * 
 * Applies an initial velocity that gradually decreases to simulate
 * being pushed back by an impact
 * 
 * @example
 * ```ts
 * // Knockback player to the left with force 8 for 300ms
 * movementManager.add('player1', new Knockback({ x: -1, y: 0 }, 8, 300));
 * 
 * // Knockback with decay (resistance)
 * movementManager.add('enemy1', new Knockback({ x: 0, y: 1 }, 5, 200, 0.9));
 * ```
 */
export class Knockback implements MovementStrategy {
  private elapsed: number = 0;
  private currentSpeed: number;
  
  /**
   * Create a knockback movement
   * 
   * @param direction - Normalized direction vector { x, y }
   * @param force - Initial force of the knockback
   * @param duration - Duration in milliseconds
   * @param decayFactor - Speed decay multiplier per frame (0.8-0.95 typical)
   */
  constructor(
    private direction: { x: number, y: number },
    private force: number,
    private duration: number,
    private decayFactor: number = 0.9
  ) {
    this.currentSpeed = force;
    
    // Normalize direction vector
    const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    if (magnitude !== 0 && magnitude !== 1) {
      this.direction = {
        x: direction.x / magnitude,
        y: direction.y / magnitude
      };
    }
  }
  
  /**
   * Apply knockback movement with decreasing force
   * 
   * Uses translation instead of velocity to respect collision detection
   * when the body has isSensor: true option
   * 
   * @param body - Matter.js body to move
   * @param dt - Time delta in milliseconds
   */
  update(body: Matter.Body, dt: number): void {
    this.elapsed += dt;
    
    if (this.elapsed <= this.duration) {
      // Calculate movement delta for this frame
      const frameMultiplier = dt / 16; // Normalize to 60fps (16ms per frame)
      const movementX = this.direction.x * this.currentSpeed * frameMultiplier;
      const movementY = this.direction.y * this.currentSpeed * frameMultiplier;
      
      // Use translation instead of velocity to allow collision detection
      // even with isSensor bodies
      Matter.Body.translate(body, {
        x: movementX,
        y: movementY
      });
      
      // Decay the speed
      this.currentSpeed *= Math.pow(this.decayFactor, frameMultiplier);
    } else {
      // Stop movement when knockback is complete
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
    }
  }
  
  /**
   * Check if knockback duration has elapsed
   * 
   * @returns True if knockback is complete
   */
  isFinished(): boolean {
    return this.elapsed >= this.duration;
  }
} 