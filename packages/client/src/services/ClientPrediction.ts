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

interface ServerPositionData {
  x: number;
  y: number;
  timestamp: number;
  sequenceNumber?: number;
}

interface ReconciliationConfig {
  /** Distance threshold below which smooth interpolation is used (pixels) */
  smoothThreshold: number;
  /** Distance threshold above which immediate snapping is used (pixels) */
  snapThreshold: number;
  /** Duration for smooth interpolation in milliseconds */
  interpolationDuration: number;
  /** Maximum time difference to accept for reconciliation (ms) */
  maxTimeDifference: number;
}

/**
 * Client-side prediction service for managing movements
 * and server reconciliation
 */
export class ClientPredictionService {
  private pendingMovements: Map<string, PredictedMovement[]> = new Map();
  private lastServerStates: Map<string, { x: number; y: number; timestamp: number }> = new Map();
  private playerRegistry: Map<string, RpgCommonPlayer> = new Map();

  private config: ReconciliationConfig = {
    smoothThreshold: 5, // pixels
    snapThreshold: 50, // pixels
    interpolationDuration: 100, // ms
    maxTimeDifference: 500 // ms - maximum time difference to accept for reconciliation
  };

  constructor(config?: Partial<ReconciliationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Apply client-side prediction movement
   */
  predictMovement(
    player: RpgCommonPlayer, 
    direction: Direction, 
    deltaTime: number
  ): void {
    const playerId = player.id;
    const timestamp = Date.now();
    
    // Calculate new predicted position
    const currentX = player.x();
    const currentY = player.y();
    const speed = typeof player.speed === 'function' ? player.speed() : player.speed;
    
    let newX = currentX;
    let newY = currentY;
    
    const moveDistance = speed * (deltaTime / 16); // Normalize by 16ms (60fps)
    
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
    
    // Store predicted movement
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
    
    // Clean up old movements (keep only the last 100)
    const movements = this.pendingMovements.get(playerId)!;
    if (movements.length > 100) {
      movements.splice(0, movements.length - 100);
    }
    
    // Apply movement immediately on client side
    player.x.set(newX);
    player.y.set(newY);
    player.changeDirection(direction);
  }

  /**
   * Reconciles client position with server position
   * Takes into account timestamp to handle lag between server and client
   */
  reconcileWithServer(
    player: RpgCommonPlayer,
    serverData: ServerPositionData
  ): void {
    const playerId = player.id;
    const currentX = player.x();
    const currentY = player.y();
    const currentTime = Date.now();
    
    // Check if the server data is too old to be relevant
    const timeDifference = currentTime - serverData.timestamp;
    if (timeDifference > this.config.maxTimeDifference) {
      console.warn(`[ClientPrediction] Server data too old for player ${playerId}: ${timeDifference}ms`);
      return;
    }
    
    // Calculate distance between client and server positions
    const distance = Math.sqrt(
      Math.pow(serverData.x - currentX, 2) + Math.pow(serverData.y - currentY, 2)
    );
    
    // Save server state
    this.lastServerStates.set(playerId, {
      x: serverData.x,
      y: serverData.y,
      timestamp: serverData.timestamp
    });
    
    // Clean up movements acknowledged by the server
    const movements = this.pendingMovements.get(playerId) || [];
    const bufferTime = 50; // 50ms buffer for network variance
    const acknowledgeBefore = serverData.timestamp + bufferTime;
    this.pendingMovements.set(
      playerId,
      movements.filter(m => m.timestamp > acknowledgeBefore)
    );
    
    // Apply reconciliation based on distance
    if (distance <= this.config.smoothThreshold) {
      // Small difference: no correction needed
      console.log(`[ClientPrediction] No correction needed for player ${playerId}, distance: ${distance.toFixed(2)}px`);
      return;
    } else if (distance <= this.config.snapThreshold) {
      // Medium difference: smooth interpolation
      console.log(`[ClientPrediction] Smooth correction for player ${playerId}, distance: ${distance.toFixed(2)}px`);
      this.startSmoothInterpolation(player, currentX, currentY, serverData.x, serverData.y);
    } else {
      // Large difference: immediate snap (server has authority)
      console.log(`[ClientPrediction] Snap correction for player ${playerId}, distance: ${distance.toFixed(2)}px`);
      this.snapToServerPosition(player, serverData.x, serverData.y);
    }
  }

  /**
   * Start smooth interpolation towards server position
   */
  private startSmoothInterpolation(
    player: RpgCommonPlayer,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): void {
    // Use interpolation service for smooth movement
    interpolationService.interpolate(
      player, 
      toX, 
      toY, 
      this.config.interpolationDuration, 
      'easeOut'
    );
  }

  /**
   * Immediate snap to server position
   */
  private snapToServerPosition(
    player: RpgCommonPlayer,
    serverX: number,
    serverY: number
  ): void {
    // Stop any ongoing interpolation
    interpolationService.stopInterpolation(player.id);
    
    // Apply server position immediately
    player.x.set(serverX);
    player.y.set(serverY);
    
    console.log(`[ClientPrediction] Snapped player ${player.id} to server position (${serverX}, ${serverY})`);
  }

  /**
   * Register a player in the registry for reconciliation
   */
  registerPlayer(player: RpgCommonPlayer): void {
    this.playerRegistry.set(player.id, player);
  }

  /**
   * Unregister a player from the registry
   */
  unregisterPlayer(playerId: string): void {
    this.playerRegistry.delete(playerId);
  }

  /**
   * Get a player from the registry
   */
  getPlayer(playerId: string): RpgCommonPlayer | undefined {
    return this.playerRegistry.get(playerId);
  }

  /**
   * Clean up data for a disconnected player
   */
  cleanup(playerId: string): void {
    this.pendingMovements.delete(playerId);
    this.lastServerStates.delete(playerId);
    this.playerRegistry.delete(playerId);
    interpolationService.stopInterpolation(playerId);
  }

  /**
   * Configure reconciliation thresholds
   */
  setConfig(config: Partial<ReconciliationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get prediction statistics for a player
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

// Singleton instance of the service
export const clientPredictionService = new ClientPredictionService();