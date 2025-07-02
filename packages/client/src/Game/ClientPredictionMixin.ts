import { Direction, RpgCommonPlayer, PlayerCtor } from "@rpgjs/common";
import { clientPredictionService } from "../services/ClientPrediction";

/**
 * Interface pour les options de configuration de la prédiction
 */
export interface ClientPredictionOptions {
  /** Activer la prédiction côté client */
  enablePrediction?: boolean;
  /** Seuil pour l'interpolation smooth (pixels) */
  smoothThreshold?: number;
  /** Seuil pour le snap direct (pixels) */
  snapThreshold?: number;
  /** Durée de l'interpolation smooth (ms) */
  interpolationDuration?: number;
}

/**
 * Mixin pour ajouter les capacités de prédiction côté client à un joueur
 * 
 * Ce mixin intègre le système de réconciliation serveur et de prédiction côté client
 * directement dans la classe du joueur, permettant une utilisation transparente.
 * 
 * @param Base - La classe de base du joueur
 * @returns La classe étendue avec les capacités de prédiction
 * 
 * @example
 * ```ts
 * class MyPlayer extends WithClientPrediction(RpgCommonPlayer) {
 *   constructor() {
 *     super();
 *     this.enableClientPrediction({
 *       enablePrediction: true,
 *       smoothThreshold: 5,
 *       snapThreshold: 50
 *     });
 *   }
 * }
 * ```
 */
export function WithClientPrediction<TBase extends PlayerCtor<RpgCommonPlayer>>(Base: TBase) {
  return class extends Base {
    private _clientPredictionEnabled: boolean = false;
    private _lastPredictedTimestamp: number = 0;
    private _serverAuthoritative: boolean = true;

    constructor(...args: any[]) {
      super(...args);
      
      // Enregistrer le joueur dans le service de prédiction
      if (this.id) {
        clientPredictionService.registerPlayer(this);
      }
    }

    /**
     * Active la prédiction côté client pour ce joueur
     */
    enableClientPrediction(options: ClientPredictionOptions = {}): void {
      this._clientPredictionEnabled = options.enablePrediction ?? true;
      
      // Configurer le service de prédiction
      if (options.smoothThreshold !== undefined || 
          options.snapThreshold !== undefined || 
          options.interpolationDuration !== undefined) {
        clientPredictionService.setConfig({
          smoothThreshold: options.smoothThreshold,
          snapThreshold: options.snapThreshold,
          interpolationDuration: options.interpolationDuration
        });
      }

      // Enregistrer le joueur si ce n'est pas déjà fait
      clientPredictionService.registerPlayer(this);
    }

    /**
     * Désactive la prédiction côté client pour ce joueur
     */
    disableClientPrediction(): void {
      this._clientPredictionEnabled = false;
      clientPredictionService.unregisterPlayer(this.id);
    }

    /**
     * Applique un mouvement avec prédiction côté client
     * Cette méthode remplace ou étend le mouvement standard
     */
    predictiveMove(direction: Direction, deltaTime: number = 16): void {
      if (!this._clientPredictionEnabled) {
        // Fallback vers le mouvement standard si la prédiction est désactivée
        this.standardMove(direction, deltaTime);
        return;
      }

      const now = Date.now();
      
      // Éviter les mouvements trop fréquents
      if (now - this._lastPredictedTimestamp < 8) { // Max 125 FPS
        return;
      }

      this._lastPredictedTimestamp = now;

      // Appliquer la prédiction côté client
      clientPredictionService.predictMovement(this, direction, deltaTime);
    }

    /**
     * Mouvement standard sans prédiction (fallback)
     */
    private standardMove(direction: Direction, deltaTime: number): void {
      const speed = typeof this.speed === 'function' ? this.speed() : this.speed;
      const moveDistance = speed * (deltaTime / 16);
      
      let newX = this.x();
      let newY = this.y();
      
      switch (direction) {
        case Direction.Up:
          newY -= moveDistance;
          break;
        case Direction.Down:
          newY += moveDistance;
          break;
        case Direction.Left:
          newX -= moveDistance;
          break;
        case Direction.Right:
          newX += moveDistance;
          break;
      }
      
      this.x.set(newX);
      this.y.set(newY);
      this.changeDirection(direction);
    }

    /**
     * Réconcilie la position avec le serveur
     * À appeler quand on reçoit une mise à jour de position du serveur
     */
    reconcileServerPosition(
      serverX: number, 
      serverY: number, 
      serverTimestamp?: number
    ): void {
      if (!this._clientPredictionEnabled || !this._serverAuthoritative) {
        // Si la prédiction est désactivée ou le serveur n'est pas autoritaire,
        // appliquer directement la position
        this.x.set(serverX);
        this.y.set(serverY);
        return;
      }

      // Utiliser le service de prédiction pour la réconciliation
      clientPredictionService.reconcileWithServer(
        this, 
        serverX, 
        serverY, 
        serverTimestamp
      );
    }

    /**
     * Force la synchronisation avec la position du serveur
     * Utile pour les téléportations ou changements de map
     */
    forceServerSync(serverX: number, serverY: number): void {
      // Arrêter toute interpolation en cours
      clientPredictionService.cleanup(this.id);
      
      // Appliquer immédiatement la position du serveur
      this.x.set(serverX);
      this.y.set(serverY);
      
      // Réenregistrer le joueur
      if (this._clientPredictionEnabled) {
        clientPredictionService.registerPlayer(this);
      }
    }

    /**
     * Vérifie si la prédiction est activée pour ce joueur
     */
    isClientPredictionEnabled(): boolean {
      return this._clientPredictionEnabled;
    }

    /**
     * Définit si le serveur est autoritaire (par défaut: true)
     */
    setServerAuthoritative(authoritative: boolean): void {
      this._serverAuthoritative = authoritative;
    }

    /**
     * Obtient les statistiques de prédiction pour ce joueur
     */
    getPredictionStats() {
      return clientPredictionService.getStats(this.id);
    }

    /**
     * Override de la méthode de destruction pour nettoyer les resources
     */
    destroy(): void {
      clientPredictionService.cleanup(this.id);
      
      // Appeler la méthode de destruction de la classe parent si elle existe
      if (super.destroy) {
        super.destroy();
      }
    }

    /**
     * Méthode utilitaire pour obtenir la distance avec une autre position
     */
    getDistanceToPosition(x: number, y: number): number {
      const dx = this.x() - x;
      const dy = this.y() - y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Vérifie si la position actuelle est proche d'une position donnée
     */
    isNearPosition(x: number, y: number, threshold: number = 5): boolean {
      return this.getDistanceToPosition(x, y) <= threshold;
    }
  };
}

/**
 * Type pour un joueur avec capacités de prédiction
 */
export type PlayerWithClientPrediction = InstanceType<ReturnType<typeof WithClientPrediction>>;

/**
 * Hook pour intégrer la prédiction dans les hooks existants du joueur
 */
export const clientPredictionHooks = {
  /**
   * Hook appelé quand le joueur reçoit des données du serveur
   */
  onServerUpdate(player: PlayerWithClientPrediction, serverData: any) {
    if (serverData.x !== undefined && serverData.y !== undefined) {
      player.reconcileServerPosition(
        serverData.x, 
        serverData.y, 
        serverData.timestamp
      );
    }
  },

  /**
   * Hook appelé quand le joueur bouge (input local)
   */
  onLocalMove(player: PlayerWithClientPrediction, direction: Direction, deltaTime: number) {
    player.predictiveMove(direction, deltaTime);
  },

  /**
   * Hook appelé quand le joueur change de map
   */
  onMapChange(player: PlayerWithClientPrediction, newX: number, newY: number) {
    player.forceServerSync(newX, newY);
  }
};