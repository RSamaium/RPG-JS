import { RpgCommonPlayer } from "@rpgjs/common";

interface InterpolationTarget {
  playerId: string;
  player: RpgCommonPlayer;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number;
  easeType: 'linear' | 'easeOut' | 'easeInOut';
}

/**
 * Interpolation service for smooth movements
 * Handles smooth interpolation between predicted positions and server positions
 */
export class InterpolationService {
  private activeInterpolations: Map<string, InterpolationTarget> = new Map();
  private animationFrameId: number | null = null;

  constructor() {
    this.startUpdateLoop();
  }

  /**
   * Start smooth interpolation for a player
   */
  interpolate(
    player: RpgCommonPlayer,
    toX: number,
    toY: number,
    duration: number = 100,
    easeType: 'linear' | 'easeOut' | 'easeInOut' = 'easeOut'
  ): void {
    const playerId = player.id;
    const fromX = player.x();
    const fromY = player.y();

    // If an interpolation is already in progress, stop it
    if (this.activeInterpolations.has(playerId)) {
      this.activeInterpolations.delete(playerId);
    }

    // Create a new interpolation
    const interpolation: InterpolationTarget = {
      playerId,
      player,
      fromX,
      fromY,
      toX,
      toY,
      startTime: Date.now(),
      duration,
      easeType
    };

    this.activeInterpolations.set(playerId, interpolation);
  }

  /**
   * Stop interpolation for a specific player
   */
  stopInterpolation(playerId: string): void {
    this.activeInterpolations.delete(playerId);
  }

  /**
   * Check if a player is currently interpolating
   */
  isInterpolating(playerId: string): boolean {
    return this.activeInterpolations.has(playerId);
  }

  /**
   * Easing function for different interpolation types
   */
  private ease(t: number, type: 'linear' | 'easeOut' | 'easeInOut'): number {
    switch (type) {
      case 'linear':
        return t;
      case 'easeOut':
        return 1 - Math.pow(1 - t, 3);
      case 'easeInOut':
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      default:
        return t;
    }
  }

  /**
   * Update all active interpolations
   */
  private update(): void {
    const now = Date.now();

    for (const [playerId, interpolation] of this.activeInterpolations.entries()) {
      const elapsed = now - interpolation.startTime;
      const progress = Math.min(elapsed / interpolation.duration, 1);

      if (progress >= 1) {
        // Interpolation finished - final position
        interpolation.player.x.set(interpolation.toX);
        interpolation.player.y.set(interpolation.toY);
        this.activeInterpolations.delete(playerId);
        continue;
      }

      // Apply easing
      const easedProgress = this.ease(progress, interpolation.easeType);

      // Calculate interpolated position
      const currentX = interpolation.fromX + (interpolation.toX - interpolation.fromX) * easedProgress;
      const currentY = interpolation.fromY + (interpolation.toY - interpolation.fromY) * easedProgress;

      // Update player position
      interpolation.player.x.set(currentX);
      interpolation.player.y.set(currentY);
    }
  }

  /**
   * Start the update loop
   */
  private startUpdateLoop(): void {
    const updateLoop = () => {
      this.update();
      this.animationFrameId = requestAnimationFrame(updateLoop);
    };
    
    updateLoop();
  }

  /**
   * Stop the update loop
   */
  stopUpdateLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Clean up all interpolations
   */
  cleanup(): void {
    this.activeInterpolations.clear();
    this.stopUpdateLoop();
  }

  /**
   * Get interpolation statistics
   */
  getStats() {
    return {
      activeInterpolations: this.activeInterpolations.size,
      players: Array.from(this.activeInterpolations.keys())
    };
  }
}

// Singleton instance of the interpolation service
export const interpolationService = new InterpolationService();