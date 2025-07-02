import { ClientPredictionService } from "./ClientPrediction";
import { InterpolationService } from "./InterpolationService";

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

// Tokens for dependency injection
export const ClientPredictionToken = Symbol("ClientPredictionService");
export const InterpolationToken = Symbol("InterpolationService");
export const ServerReconciliationConfigToken = Symbol("ServerReconciliationConfig");

/**
 * Get the client prediction service from context
 */
export function getClientPredictionService(context: any): ClientPredictionService {
  return context.inject(ClientPredictionToken);
}

/**
 * Get the interpolation service from context
 */
export function getInterpolationService(context: any): InterpolationService {
  return context.inject(InterpolationToken);
}

/**
 * Get the server reconciliation configuration from context
 */
export function getServerReconciliationConfig(context: any): ServerReconciliationConfig {
  return context.inject(ServerReconciliationConfigToken);
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
 *     ...provideServerReconciliation({
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

  const finalConfig = { ...defaultConfig, ...config };

  return [
    {
      provide: ServerReconciliationConfigToken,
      useValue: finalConfig
    },
    {
      provide: InterpolationToken,
      useFactory: (context: any) => new InterpolationService(context)
    },
    {
      provide: ClientPredictionToken,
      useFactory: (context: any) => {
        const interpolationService = context.inject(InterpolationToken);
        const clientPredictionService = new ClientPredictionService(context, {
          smoothThreshold: finalConfig.smoothThreshold,
          snapThreshold: finalConfig.snapThreshold,
          interpolationDuration: finalConfig.interpolationDuration,
          maxTimeDifference: finalConfig.maxTimeDifference
        });
        
        // Wire up the interpolation service
        clientPredictionService.setInterpolationService(interpolationService);
        
        return clientPredictionService;
      }
    }
  ];
}