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
 * Service d'interpolation pour les mouvements smooth
 * Gère l'interpolation fluide entre les positions prédites et les positions du serveur
 */
export class InterpolationService {
  private activeInterpolations: Map<string, InterpolationTarget> = new Map();
  private animationFrameId: number | null = null;

  constructor() {
    this.startUpdateLoop();
  }

  /**
   * Démarre une interpolation smooth pour un joueur
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

    // Si une interpolation est déjà en cours, l'arrêter
    if (this.activeInterpolations.has(playerId)) {
      this.activeInterpolations.delete(playerId);
    }

    // Créer une nouvelle interpolation
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
   * Arrête l'interpolation pour un joueur spécifique
   */
  stopInterpolation(playerId: string): void {
    this.activeInterpolations.delete(playerId);
  }

  /**
   * Vérifie si un joueur est en cours d'interpolation
   */
  isInterpolating(playerId: string): boolean {
    return this.activeInterpolations.has(playerId);
  }

  /**
   * Fonction d'easing pour différents types d'interpolation
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
   * Met à jour toutes les interpolations actives
   */
  private update(): void {
    const now = Date.now();

    for (const [playerId, interpolation] of this.activeInterpolations.entries()) {
      const elapsed = now - interpolation.startTime;
      const progress = Math.min(elapsed / interpolation.duration, 1);

      if (progress >= 1) {
        // Interpolation terminée - position finale
        interpolation.player.x.set(interpolation.toX);
        interpolation.player.y.set(interpolation.toY);
        this.activeInterpolations.delete(playerId);
        continue;
      }

      // Appliquer l'easing
      const easedProgress = this.ease(progress, interpolation.easeType);

      // Calculer la position interpolée
      const currentX = interpolation.fromX + (interpolation.toX - interpolation.fromX) * easedProgress;
      const currentY = interpolation.fromY + (interpolation.toY - interpolation.fromY) * easedProgress;

      // Mettre à jour la position du joueur
      interpolation.player.x.set(currentX);
      interpolation.player.y.set(currentY);
    }
  }

  /**
   * Démarre la boucle de mise à jour
   */
  private startUpdateLoop(): void {
    const updateLoop = () => {
      this.update();
      this.animationFrameId = requestAnimationFrame(updateLoop);
    };
    
    updateLoop();
  }

  /**
   * Arrête la boucle de mise à jour
   */
  stopUpdateLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Nettoie toutes les interpolations
   */
  cleanup(): void {
    this.activeInterpolations.clear();
    this.stopUpdateLoop();
  }

  /**
   * Obtient les statistiques d'interpolation
   */
  getStats() {
    return {
      activeInterpolations: this.activeInterpolations.size,
      players: Array.from(this.activeInterpolations.keys())
    };
  }
}

// Instance singleton du service d'interpolation
export const interpolationService = new InterpolationService();