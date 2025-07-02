import { Direction, RpgCommonPlayer } from "@rpgjs/common";
import { WithClientPrediction, ClientPredictionOptions } from "../Game/ClientPredictionMixin";
import { clientPredictionService } from "../services/ClientPrediction";

/**
 * Exemple d'implémentation d'un joueur avec prédiction côté client
 * 
 * Cette classe montre comment intégrer le système de réconciliation serveur
 * et de prédiction côté client dans un joueur RPGJS.
 */
export class PredictivePlayer extends WithClientPrediction(RpgCommonPlayer) {
  private inputBuffer: { direction: Direction; timestamp: number }[] = [];
  private lastServerUpdate: number = 0;

  constructor() {
    super();
    
    // Configuration de la prédiction côté client
    const predictionConfig: ClientPredictionOptions = {
      enablePrediction: true,
      smoothThreshold: 5,      // 5 pixels
      snapThreshold: 50,       // 50 pixels  
      interpolationDuration: 100 // 100ms
    };

    this.enableClientPrediction(predictionConfig);
  }

  /**
   * Gère les inputs de déplacement avec prédiction
   */
  handleMovementInput(direction: Direction): void {
    const timestamp = Date.now();
    
    // Ajouter l'input au buffer pour la réconciliation
    this.inputBuffer.push({ direction, timestamp });
    
    // Limiter la taille du buffer
    if (this.inputBuffer.length > 100) {
      this.inputBuffer.splice(0, this.inputBuffer.length - 100);
    }

    // Appliquer immédiatement le mouvement côté client (prédiction)
    this.predictiveMove(direction);
    
    // Envoyer l'input au serveur (à implémenter selon votre architecture réseau)
    this.sendInputToServer(direction, timestamp);
  }

  /**
   * Traite une mise à jour de position du serveur
   */
  handleServerPositionUpdate(serverData: {
    x: number;
    y: number;
    timestamp: number;
    sequenceNumber?: number;
  }): void {
    this.lastServerUpdate = Date.now();

    // Nettoyer les inputs acknowledgés par le serveur
    if (serverData.timestamp) {
      this.inputBuffer = this.inputBuffer.filter(
        input => input.timestamp > serverData.timestamp
      );
    }

    // Réconcilier avec la position du serveur
    this.reconcileServerPosition(
      serverData.x,
      serverData.y,
      serverData.timestamp
    );

    // Ré-appliquer les inputs non-acknowledgés (client-side rollback)
    this.replayPendingInputs();
  }

  /**
   * Ré-applique les inputs en attente après réconciliation
   * (Client-side rollback)
   */
  private replayPendingInputs(): void {
    if (this.inputBuffer.length === 0) return;

    // Sauvegarder la position actuelle
    const startX = this.x();
    const startY = this.y();

    // Ré-appliquer tous les inputs en attente
    for (const input of this.inputBuffer) {
      this.predictiveMove(input.direction);
    }

    console.log(
      `[PredictivePlayer] Replayed ${this.inputBuffer.length} inputs. ` +
      `Position changed from (${startX}, ${startY}) to (${this.x()}, ${this.y()})`
    );
  }

  /**
   * Envoie un input au serveur (à adapter selon votre architecture)
   */
  private sendInputToServer(direction: Direction, timestamp: number): void {
    // Exemple d'envoi au serveur - à adapter selon votre système
    // this.socket.emit('playerInput', {
    //   playerId: this.id,
    //   direction,
    //   timestamp,
    //   x: this.x(),
    //   y: this.y()
    // });
    
    console.log(`[PredictivePlayer] Sending input to server:`, {
      direction,
      timestamp,
      x: this.x(),
      y: this.y()
    });
  }

  /**
   * Gère les téléportations ou changements de position forcés
   */
  teleport(x: number, y: number): void {
    // Nettoyer l'état de prédiction
    this.inputBuffer = [];
    
    // Forcer la synchronisation avec les nouvelles coordonnées
    this.forceServerSync(x, y);
    
    console.log(`[PredictivePlayer] Teleported to (${x}, ${y})`);
  }

  /**
   * Obtient les informations de debug sur l'état de la prédiction
   */
  getDebugInfo() {
    const stats = this.getPredictionStats();
    
    return {
      predictionEnabled: this.isClientPredictionEnabled(),
      pendingInputs: this.inputBuffer.length,
      lastServerUpdate: this.lastServerUpdate,
      timeSinceLastUpdate: Date.now() - this.lastServerUpdate,
      predictionStats: stats,
      currentPosition: { x: this.x(), y: this.y() },
      isInterpolating: stats.isInterpolating
    };
  }

  /**
   * Configure les seuils de réconciliation pendant le jeu
   */
  adjustPredictionSettings(options: Partial<ClientPredictionOptions>): void {
    clientPredictionService.setConfig({
      smoothThreshold: options.smoothThreshold,
      snapThreshold: options.snapThreshold,
      interpolationDuration: options.interpolationDuration
    });
  }
}

/**
 * Exemple d'utilisation de la classe PredictivePlayer
 */
export class PredictivePlayerUsageExample {
  private player: PredictivePlayer;
  private inputHandler: (event: KeyboardEvent) => void;

  constructor() {
    this.player = new PredictivePlayer();
    this.setupInputHandling();
    this.setupServerCommunication();
  }

  /**
   * Configure la gestion des inputs clavier
   */
  private setupInputHandling(): void {
    this.inputHandler = (event: KeyboardEvent) => {
      let direction: Direction | null = null;

      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          direction = Direction.Up;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          direction = Direction.Down;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          direction = Direction.Left;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          direction = Direction.Right;
          break;
      }

      if (direction && event.type === 'keydown') {
        this.player.handleMovementInput(direction);
      }
    };

    // Attacher les event listeners
    window.addEventListener('keydown', this.inputHandler);
    window.addEventListener('keyup', this.inputHandler);
  }

  /**
   * Configure la communication avec le serveur
   */
  private setupServerCommunication(): void {
    // Exemple de simulation de réception de données du serveur
    setInterval(() => {
      // Simuler une mise à jour de position du serveur
      const serverData = {
        x: this.player.x() + (Math.random() - 0.5) * 10, // Petite variation
        y: this.player.y() + (Math.random() - 0.5) * 10,
        timestamp: Date.now() - 50 // Latence simulée de 50ms
      };

      this.player.handleServerPositionUpdate(serverData);
    }, 100); // Mises à jour serveur à 10Hz
  }

  /**
   * Affiche les informations de debug
   */
  showDebugInfo(): void {
    const debugInfo = this.player.getDebugInfo();
    console.log('[Debug] Player Prediction State:', debugInfo);
  }

  /**
   * Nettoie les resources
   */
  cleanup(): void {
    if (this.inputHandler) {
      window.removeEventListener('keydown', this.inputHandler);
      window.removeEventListener('keyup', this.inputHandler);
    }
  }
}

// Export pour utilisation
export { PredictivePlayer as default };