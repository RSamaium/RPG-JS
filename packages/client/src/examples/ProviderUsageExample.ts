import { startGame } from "../core/setup";
import { provideServerReconciliation, getClientPredictionService, ClientPredictionToken } from "../services/ServerReconciliationProvider";
import { inject } from "../core/inject";

/**
 * Example usage of the Server Reconciliation Provider
 * 
 * This example shows how to configure and use the server reconciliation
 * functionality with RPGJS using dependency injection.
 */

// Basic usage with default configuration
export async function setupGameWithBasicReconciliation() {
  const context = await startGame({
    providers: [
      // Add server reconciliation with default settings
      ...provideServerReconciliation()
    ]
  });
  
  return context;
}

// Advanced usage with custom configuration
export async function setupGameWithCustomReconciliation() {
  const context = await startGame({
    providers: [
      // Customize reconciliation behavior
      ...provideServerReconciliation({
        enabled: true,
        smoothThreshold: 3,      // Smoother corrections for small differences
        snapThreshold: 30,       // More aggressive snapping for medium differences
        interpolationDuration: 150, // Longer interpolation for smoother movement
        maxTimeDifference: 1000  // Accept older server data (higher latency tolerance)
      })
    ]
  });
  
  return context;
}

// Production-ready configuration
export async function setupProductionGame() {
  const context = await startGame({
    providers: [
      // Optimized settings for production
      ...provideServerReconciliation({
        enabled: true,
        smoothThreshold: 5,      // Standard threshold
        snapThreshold: 50,       // Conservative snapping
        interpolationDuration: 100, // Fast interpolation
        maxTimeDifference: 500   // Reasonable latency tolerance
      })
    ]
  });
  
  return context;
}

// Example of accessing services via dependency injection
export async function setupGameWithServiceAccess() {
  const context = await startGame({
    providers: [
      ...provideServerReconciliation({
        smoothThreshold: 5,
        snapThreshold: 50
      })
    ]
  });
  
  // Access services through dependency injection
  try {
    const clientPredictionService = getClientPredictionService(context);
    const stats = clientPredictionService.getStats('player-id');
    console.log('Prediction service stats:', stats);
  } catch (error) {
    console.error('Could not access services:', error);
  }
  
  return context;
}

/**
 * How to use in your main game file:
 * 
 * ```ts
 * import { provideServerReconciliation } from '@rpgjs/client'
 * import { startGame } from '@rpgjs/client'
 * 
 * startGame({
 *   providers: [
 *     provideServerReconciliation({
 *       smoothThreshold: 5,
 *       snapThreshold: 50
 *     })
 *   ]
 * })
 * ```
 * 
 * Once added, the reconciliation system will automatically:
 * - Apply client-side prediction for smooth movement
 * - Reconcile positions when receiving server updates
 * - Handle lag compensation with configurable thresholds
 * - Provide smooth interpolation vs instant snapping based on distance
 */