import { startGame } from "../core/setup";
import { 
  provideServerReconciliation, 
  getClientPredictionService, 
  getInterpolationService,
  getServerReconciliationConfig,
  ClientPredictionToken,
  InterpolationToken,
  ServerReconciliationConfigToken
} from "../services/ServerReconciliationProvider";

/**
 * Complete example showing the new dependency injection system
 * for server reconciliation with RPGJS.
 */

/**
 * Basic setup with dependency injection
 */
export async function basicDependencyInjectionSetup() {
  // Start game with server reconciliation providers
  const context = await startGame({
    providers: [
      // Use spread operator to include all providers
      ...provideServerReconciliation({
        smoothThreshold: 5,
        snapThreshold: 50,
        interpolationDuration: 100,
        maxTimeDifference: 500
      })
    ]
  });

  console.log('Game started with server reconciliation enabled');
  return context;
}

/**
 * Advanced setup showing service access
 */
export async function advancedServiceAccess() {
  const context = await startGame({
    providers: [
      ...provideServerReconciliation({
        enabled: true,
        smoothThreshold: 3,
        snapThreshold: 30
      })
    ]
  });

  // Access services through dependency injection
  try {
    // Get services using helper functions
    const clientPrediction = getClientPredictionService(context);
    const interpolation = getInterpolationService(context);
    const config = getServerReconciliationConfig(context);

    console.log('Server reconciliation config:', config);

    // Get service statistics
    const stats = clientPrediction.getStats('test-player');
    console.log('Client prediction stats:', stats);

    // Access interpolation service
    const interpolationStats = interpolation.getStats();
    console.log('Interpolation stats:', interpolationStats);

  } catch (error) {
    console.error('Error accessing services:', error);
  }

  return context;
}

/**
 * Example showing how services are accessed in Player class
 */
export class ExamplePlayerWithDI {
  private context: any;
  private playerId: string;

  constructor(context: any, playerId: string) {
    this.context = context;
    this.playerId = playerId;
    
    // Register with prediction service
    this.registerWithServices();
  }

  private registerWithServices() {
    try {
      const clientPrediction = getClientPredictionService(this.context);
      // Player would register itself here
      console.log(`Player ${this.playerId} registered with prediction service`);
    } catch (error) {
      console.warn('Could not register with prediction services:', error);
    }
  }

  public reconcilePosition(serverData: { x: number; y: number; timestamp: number }) {
    try {
      const clientPrediction = getClientPredictionService(this.context);
      // Use the service for reconciliation
      console.log(`Reconciling position for player ${this.playerId}:`, serverData);
    } catch (error) {
      console.warn('Could not reconcile position:', error);
    }
  }

  public forceSync(x: number, y: number) {
    try {
      const interpolation = getInterpolationService(this.context);
      interpolation.stopInterpolation(this.playerId);
      console.log(`Force synced player ${this.playerId} to (${x}, ${y})`);
    } catch (error) {
      console.warn('Could not force sync:', error);
    }
  }

  public cleanup() {
    try {
      const clientPrediction = getClientPredictionService(this.context);
      clientPrediction.cleanup(this.playerId);
      console.log(`Cleaned up player ${this.playerId}`);
    } catch (error) {
      console.warn('Could not cleanup:', error);
    }
  }
}

/**
 * Production-ready setup with error handling
 */
export async function productionSetup() {
  try {
    const context = await startGame({
      providers: [
        ...provideServerReconciliation({
          enabled: true,
          smoothThreshold: 5,
          snapThreshold: 50,
          interpolationDuration: 100,
          maxTimeDifference: 500
        })
      ]
    });

    // Verify services are available
    const config = getServerReconciliationConfig(context);
    if (config.enabled) {
      console.log('✅ Server reconciliation enabled successfully');
      
      // Optional: Set up monitoring
      setupMonitoring(context);
    }

    return context;

  } catch (error) {
    console.error('❌ Failed to setup server reconciliation:', error);
    
    // Fallback to basic game setup without reconciliation
    return await startGame({
      providers: []
    });
  }
}

/**
 * Setup monitoring for development/debugging
 */
function setupMonitoring(context: any) {
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      try {
        const clientPrediction = getClientPredictionService(context);
        const interpolation = getInterpolationService(context);
        
        console.log('📊 Reconciliation Monitoring:', {
          interpolation: interpolation.getStats(),
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn('Could not get monitoring stats:', error);
      }
    }, 10000); // Every 10 seconds
  }
}

/**
 * Example usage patterns
 */
export const UsageExamples = {
  /**
   * Simple setup - just add the provider
   */
  simple: async () => {
    return await startGame({
      providers: [
        ...provideServerReconciliation()
      ]
    });
  },

  /**
   * Custom configuration
   */
  custom: async () => {
    return await startGame({
      providers: [
        ...provideServerReconciliation({
          smoothThreshold: 3,
          snapThreshold: 25,
          interpolationDuration: 150
        })
      ]
    });
  },

  /**
   * Environment-based configuration
   */
  environmental: async () => {
    const isDev = process.env.NODE_ENV === 'development';
    
    return await startGame({
      providers: [
        ...provideServerReconciliation({
          smoothThreshold: isDev ? 10 : 5,  // More tolerant in dev
          snapThreshold: isDev ? 100 : 50,  // Less aggressive in dev
          maxTimeDifference: isDev ? 2000 : 500  // Higher latency tolerance in dev
        })
      ]
    });
  }
};

/**
 * How to use in your main game file:
 * 
 * ```typescript
 * import { startGame } from '@rpgjs/client'
 * import { provideServerReconciliation } from '@rpgjs/client'
 * 
 * async function main() {
 *   const context = await startGame({
 *     providers: [
 *       ...provideServerReconciliation({
 *         smoothThreshold: 5,
 *         snapThreshold: 50
 *       })
 *     ]
 *   })
 * 
 *   // Game is now running with server reconciliation!
 *   console.log('Game started with reconciliation')
 * }
 * 
 * main().catch(console.error)
 * ```
 */