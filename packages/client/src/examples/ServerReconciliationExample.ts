import { Direction } from "@rpgjs/common";
import { RpgClientPlayer } from "../Game/Player";

/**
 * Example implementation of server reconciliation with RpgClientPlayer
 * 
 * This example shows how to integrate the server reconciliation system
 * directly with the existing RpgClientPlayer class.
 */
export class ServerReconciliationExample {
  private player: RpgClientPlayer;
  private inputHandler: (event: KeyboardEvent) => void;
  private serverUpdateInterval: number;

  constructor() {
    this.player = new RpgClientPlayer();
    this.setupClientPrediction();
    this.setupInputHandling();
    this.setupServerCommunication();
  }

  /**
   * Configure client-side prediction for the player
   */
  private setupClientPrediction(): void {
    // Enable client-side prediction with custom configuration
    this.player.enableClientPrediction({
      enablePrediction: true,
      smoothThreshold: 5,        // pixels - below this, no correction needed
      snapThreshold: 50,         // pixels - above this, immediate snap to server
      interpolationDuration: 100, // ms - duration for smooth interpolation
      maxTimeDifference: 500     // ms - maximum time difference to accept
    });

    console.log('[Example] Client-side prediction enabled for player', this.player.id);
  }

  /**
   * Setup keyboard input handling for movement
   */
  private setupInputHandling(): void {
    this.inputHandler = (event: KeyboardEvent) => {
      if (event.type === 'keydown') {
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

        if (direction) {
          this.handleMovementInput(direction);
        }
      }
    };

    // Attach event listeners
    window.addEventListener('keydown', this.inputHandler);
    console.log('[Example] Input handling setup complete');
  }

  /**
   * Handle movement input with client-side prediction
   */
  private handleMovementInput(direction: Direction): void {
    const timestamp = Date.now();
    
    // Apply movement immediately on client side (prediction)
    this.player.predictiveMove(direction);
    
    // Send input to server (you would replace this with your actual network code)
    this.sendInputToServer({
      direction,
      timestamp,
      x: this.player.x(),
      y: this.player.y(),
      playerId: this.player.id
    });

    console.log(`[Example] Movement input: ${direction} at (${this.player.x()}, ${this.player.y()})`);
  }

  /**
   * Send input to server (mock implementation)
   * Replace this with your actual network communication
   */
  private sendInputToServer(inputData: {
    direction: Direction;
    timestamp: number;
    x: number;
    y: number;
    playerId: string;
  }): void {
    // Mock implementation - replace with your actual server communication
    // Example with WebSocket:
    // this.socket.emit('playerInput', inputData);
    
    console.log('[Example] Sending to server:', inputData);
  }

  /**
   * Setup server communication and position updates
   */
  private setupServerCommunication(): void {
    // Simulate server position updates
    this.serverUpdateInterval = window.setInterval(() => {
      this.simulateServerPositionUpdate();
    }, 100); // 10Hz server updates

    console.log('[Example] Server communication setup complete');
  }

  /**
   * Simulate receiving position updates from the server
   * In a real implementation, this would be called when you receive server data
   */
  private simulateServerPositionUpdate(): void {
    // Simulate server position with small random variations
    const currentX = this.player.x();
    const currentY = this.player.y();
    
    // Add small random offset to simulate network prediction differences
    const offsetX = (Math.random() - 0.5) * 10; // ±5 pixels
    const offsetY = (Math.random() - 0.5) * 10; // ±5 pixels
    
    const serverData = {
      x: currentX + offsetX,
      y: currentY + offsetY,
      timestamp: Date.now() - 50 // Simulate 50ms server latency
    };

    // Call the reconciliation method
    this.handleServerPositionUpdate(serverData);
  }

  /**
   * Handle server position updates
   * This is the main method you would call when receiving server data
   */
  handleServerPositionUpdate(serverData: {
    x: number;
    y: number;
    timestamp: number;
    sequenceNumber?: number;
  }): void {
    // Use the built-in reconciliation method
    this.player.reconcileServerPosition(serverData);

    // Log reconciliation events
    const stats = this.player.getPredictionStats();
    if (stats.serviceStats.isInterpolating) {
      console.log('[Example] Player is being interpolated to server position');
    }
  }

  /**
   * Force player to a specific position (teleport, map change, etc.)
   */
  teleportPlayer(x: number, y: number): void {
    this.player.forceServerSync(x, y);
    console.log(`[Example] Player teleported to (${x}, ${y})`);
  }

  /**
   * Get detailed information about the reconciliation system
   */
  getSystemInfo(): any {
    const stats = this.player.getPredictionStats();
    
    return {
      playerPosition: {
        x: this.player.x(),
        y: this.player.y()
      },
      predictionEnabled: this.player.isClientPredictionEnabled(),
      pendingInputs: stats.pendingInputs,
      lastServerUpdate: stats.lastServerUpdate,
      timeSinceLastUpdate: stats.timeSinceLastUpdate,
      isInterpolating: stats.serviceStats.isInterpolating,
      distance: this.getDistanceFromLastServerPosition()
    };
  }

  /**
   * Get distance from last known server position
   */
  private getDistanceFromLastServerPosition(): number {
    const stats = this.player.getPredictionStats();
    const lastServerState = stats.serviceStats.lastServerState;
    
    if (!lastServerState) return 0;
    
    return this.player.getDistanceToPosition(lastServerState.x, lastServerState.y);
  }

  /**
   * Demo method to show different reconciliation scenarios
   */
  async runReconciliationDemo(): Promise<void> {
    console.log('[Example] Starting reconciliation demo...');

    // 1. Small difference - should result in smooth interpolation
    console.log('[Example] Test 1: Small position difference (smooth interpolation)');
    this.handleServerPositionUpdate({
      x: this.player.x() + 3,
      y: this.player.y() + 3,
      timestamp: Date.now()
    });
    
    await this.wait(1000);

    // 2. Large difference - should result in immediate snap
    console.log('[Example] Test 2: Large position difference (immediate snap)');
    this.handleServerPositionUpdate({
      x: this.player.x() + 100,
      y: this.player.y() + 100,
      timestamp: Date.now()
    });

    await this.wait(1000);

    // 3. Very small difference - should be ignored
    console.log('[Example] Test 3: Very small difference (no correction)');
    this.handleServerPositionUpdate({
      x: this.player.x() + 1,
      y: this.player.y() + 1,
      timestamp: Date.now()
    });

    console.log('[Example] Reconciliation demo complete');
  }

  /**
   * Configure reconciliation settings during runtime
   */
  configureReconciliation(config: {
    smoothThreshold?: number;
    snapThreshold?: number;
    interpolationDuration?: number;
  }): void {
    this.player.enableClientPrediction(config);
    console.log('[Example] Reconciliation settings updated:', config);
  }

  /**
   * Show debug information
   */
  showDebugInfo(): void {
    const info = this.getSystemInfo();
    console.log('[Example] Debug Info:', info);
  }

  /**
   * Helper method to wait for a specified duration
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.inputHandler) {
      window.removeEventListener('keydown', this.inputHandler);
    }
    
    if (this.serverUpdateInterval) {
      clearInterval(this.serverUpdateInterval);
    }

    console.log('[Example] Cleanup complete');
  }
}

/**
 * How to integrate with RPGJS hooks
 */
export const RPGJSIntegrationExample = {
  /**
   * Example of integrating with RPGJS client engine hooks
   */
  setupEngineHooks() {
    const engine = {
      onInput(engine: any, { input, playerId }: any) {
        const player = engine.getCurrentPlayer() as RpgClientPlayer;
        
        if (!player || !player.isClientPredictionEnabled()) {
          return; // Use default behavior if prediction is disabled
        }

        // Convert input to direction
        let direction: Direction | null = null;
        switch (input) {
          case 'up': direction = Direction.Up; break;
          case 'down': direction = Direction.Down; break;
          case 'left': direction = Direction.Left; break;
          case 'right': direction = Direction.Right; break;
        }

        if (direction) {
          // Use predictive movement
          player.predictiveMove(direction);
          
          // Send input to server (implement your network layer here)
          console.log('Sending input to server:', { direction, playerId });
        }
      },

      onStep(engine: any, t: number, dt: number) {
        // You can add debug information here
        const player = engine.getCurrentPlayer() as RpgClientPlayer;
        if (player && player.isClientPredictionEnabled()) {
          // Optionally show debug info every second
          if (Math.floor(t / 1000) % 1 === 0) {
            const stats = player.getPredictionStats();
            console.log('Prediction stats:', stats);
          }
        }
      }
    };

    return engine;
  },

  /**
   * Example of handling server data when it arrives
   */
  handleServerSync(player: RpgClientPlayer, serverData: any) {
    if (serverData.x !== undefined && serverData.y !== undefined) {
      // Use built-in reconciliation
      player.reconcileServerPosition({
        x: serverData.x,
        y: serverData.y,
        timestamp: serverData.timestamp || Date.now()
      });
    }
  }
};

// Usage example
export function startExample(): ServerReconciliationExample {
  const example = new ServerReconciliationExample();
  
  // Run demo after a short delay
  setTimeout(() => {
    example.runReconciliationDemo();
  }, 2000);

  return example;
}

export default ServerReconciliationExample;