import { ClientPredictionService, clientPredictionService } from "./ClientPrediction";
import { InterpolationService, interpolationService } from "./InterpolationService";

export interface ServerReconciliationConfig {
  /** Enable server reconciliation */
  enabled?: boolean;
  /** Distance threshold below which smooth interpolation is used (pixels) */
  smoothThreshold?: number;
  /** Distance threshold above which immediate snapping is used (pixels) */
  snapThreshold?: number;
  /** Duration for smooth interpolation in milliseconds */
  interpolationDuration?: number;
  /** Maximum time difference to accept for reconciliation (ms) */
  maxTimeDifference?: number;
}

// Service instances
let _clientPredictionService: ClientPredictionService;
let _interpolationService: InterpolationService;
let _config: ServerReconciliationConfig;

/**
 * Get the client prediction service instance
 */
export function getClientPredictionService(): ClientPredictionService {
  return _clientPredictionService || clientPredictionService;
}

/**
 * Get the interpolation service instance
 */
export function getInterpolationService(): InterpolationService {
  return _interpolationService || interpolationService;
}

/**
 * Get the server reconciliation configuration
 */
export function getServerReconciliationConfig(): ServerReconciliationConfig {
  return _config;
}

/**
 * Provider for server reconciliation functionality
 * 
 * Usage:
 * ```ts
 * import { provideServerReconciliation } from '@rpgjs/client'
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
 */
export function provideServerReconciliation(config: ServerReconciliationConfig = {}) {
  const defaultConfig: ServerReconciliationConfig = {
    enabled: true,
    smoothThreshold: 5,
    snapThreshold: 50,
    interpolationDuration: 100,
    maxTimeDifference: 500
  };

  _config = { ...defaultConfig, ...config };

  // Initialize services with configuration
  _interpolationService = new InterpolationService();
  _clientPredictionService = new ClientPredictionService({
    smoothThreshold: _config.smoothThreshold,
    snapThreshold: _config.snapThreshold,
    interpolationDuration: _config.interpolationDuration,
    maxTimeDifference: _config.maxTimeDifference
  });
  
  // Wire up the interpolation service
  _clientPredictionService.setInterpolationService(_interpolationService);

  // Return a factory that sets up the services
  return {
    provide: Symbol("ServerReconciliation"),
    useFactory: () => {
      // Services are already initialized above
      return {
        clientPrediction: _clientPredictionService,
        interpolation: _interpolationService,
        config: _config
      };
    }
  };
}