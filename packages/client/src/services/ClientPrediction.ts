import { Direction, RpgCommonPlayer } from "@rpgjs/common";
import { interpolationService } from "./InterpolationService";

interface PredictedMovement {
  id: string;
  timestamp: number;
  direction: Direction;
  x: number;
  y: number;
  deltaTime: number;
}

interface ReconciliationConfig {
  /** Distance threshold below which smooth interpolation is used */
  smoothThreshold: number;
  /** Distance threshold above which immediate snapping is used */
  snapThreshold: number;
  /** Duration for smooth interpolation in milliseconds */
  interpolationDuration: number;
}

/**
 * Service de prédiction côté client pour gérer les mouvements
 * et la réconciliation avec le serveur
 */
export class ClientPredictionService {
  private pendingMovements: Map<string, PredictedMovement[]> = new Map();
  private lastServerStates: Map<string, { x: number; y: number; timestamp: number }> = new Map();
  private playerRegistry: Map<string, RpgCommonPlayer> = new Map();

  private config: ReconciliationConfig = {
    smoothThreshold: 5, // pixels
    snapThreshold: 50, // pixels
    interpolationDuration: 100 // ms
  };

  constructor(config?: Partial<ReconciliationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Applique un mouvement côté client en mode prédiction
   */
  predictMovement(
    player: RpgCommonPlayer, 
    direction: Direction, 
    deltaTime: number
  ): void {
    const playerId = player.id;
    const timestamp = Date.now();
    
    // Calculer la nouvelle position prédite
    const currentX = player.x();
    const currentY = player.y();
    const speed = typeof player.speed === 'function' ? player.speed() : player.speed;
    
    let newX = currentX;
    let newY = currentY;
    
    const moveDistance = speed * (deltaTime / 16); // Normaliser par 16ms (60fps)
    
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
    
    // Stocker le mouvement prédit
    const predictedMovement: PredictedMovement = {
      id: `${playerId}_${timestamp}`,
      timestamp,
      direction,
      x: newX,
      y: newY,
      deltaTime
    };
    
    if (!this.pendingMovements.has(playerId)) {
      this.pendingMovements.set(playerId, []);
    }
    this.pendingMovements.get(playerId)!.push(predictedMovement);
    
    // Nettoyer les anciens mouvements (garder seulement les 100 derniers)
    const movements = this.pendingMovements.get(playerId)!;
    if (movements.length > 100) {
      movements.splice(0, movements.length - 100);
    }
    
    // Appliquer le mouvement immédiatement côté client
    player.x.set(newX);
    player.y.set(newY);
    player.changeDirection(direction);
  }

  /**
   * Réconcilie la position du client avec celle du serveur
   */
  reconcileWithServer(
    player: RpgCommonPlayer,
    serverX: number,
    serverY: number,
    serverTimestamp?: number
  ): void {
    const playerId = player.id;
    const currentX = player.x();
    const currentY = player.y();
    
    // Calculer la distance entre client et serveur
    const distance = Math.sqrt(
      Math.pow(serverX - currentX, 2) + Math.pow(serverY - currentY, 2)
    );
    
    // Sauvegarder l'état du serveur
    this.lastServerStates.set(playerId, {
      x: serverX,
      y: serverY,
      timestamp: serverTimestamp || Date.now()
    });
    
    // Nettoyer les mouvements acknowledgés par le serveur
    if (serverTimestamp) {
      const movements = this.pendingMovements.get(playerId) || [];
      const acknowledgeBefore = serverTimestamp + 50; // Buffer de 50ms
      this.pendingMovements.set(
        playerId,
        movements.filter(m => m.timestamp > acknowledgeBefore)
      );
    }
    
    if (distance <= this.config.smoothThreshold) {
      // Petite différence : pas de correction nécessaire
      return;
    } else if (distance <= this.config.snapThreshold) {
      // Différence moyenne : interpolation smooth
      this.startSmoothInterpolation(player, currentX, currentY, serverX, serverY);
    } else {
      // Grande différence : snap immédiat (le serveur a autorité)
      this.snapToServerPosition(player, serverX, serverY);
    }
  }

  /**
   * Démarre une interpolation smooth vers la position du serveur
   */
  private startSmoothInterpolation(
    player: RpgCommonPlayer,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): void {
    // Utiliser le service d'interpolation pour un mouvement smooth
    interpolationService.interpolate(
      player, 
      toX, 
      toY, 
      this.config.interpolationDuration, 
      'easeOut'
    );
  }

  /**
   * Snap immédiat à la position du serveur
   */
  private snapToServerPosition(
    player: RpgCommonPlayer,
    serverX: number,
    serverY: number
  ): void {
    // Arrêter toute interpolation en cours
    interpolationService.stopInterpolation(player.id);
    
    // Appliquer la position du serveur immédiatement
    player.x.set(serverX);
    player.y.set(serverY);
    
    console.log(`[ClientPrediction] Snapped player ${player.id} to server position (${serverX}, ${serverY})`);
  }

  /**
   * Enregistre un joueur dans le registre pour la réconciliation
   */
  registerPlayer(player: RpgCommonPlayer): void {
    this.playerRegistry.set(player.id, player);
  }

  /**
   * Désenregistre un joueur du registre
   */
  unregisterPlayer(playerId: string): void {
    this.playerRegistry.delete(playerId);
  }

  /**
   * Obtient un joueur depuis le registre
   */
  getPlayer(playerId: string): RpgCommonPlayer | undefined {
    return this.playerRegistry.get(playerId);
  }

  /**
   * Nettoie les données pour un joueur déconnecté
   */
  cleanup(playerId: string): void {
    this.pendingMovements.delete(playerId);
    this.lastServerStates.delete(playerId);
    this.playerRegistry.delete(playerId);
    interpolationService.stopInterpolation(playerId);
  }

  /**
   * Configure les seuils de réconciliation
   */
  setConfig(config: Partial<ReconciliationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Obtient les statistiques de prédiction pour un joueur
   */
  getStats(playerId: string) {
    return {
      pendingMovements: this.pendingMovements.get(playerId)?.length || 0,
      isInterpolating: interpolationService.isInterpolating(playerId),
      lastServerState: this.lastServerStates.get(playerId),
      isRegistered: this.playerRegistry.has(playerId)
    };
  }
}

// Instance singleton du service
export const clientPredictionService = new ClientPredictionService();