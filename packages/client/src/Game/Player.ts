import { RpgClientObject } from "./Object";
import { Direction } from "@rpgjs/common";
import { clientPredictionService } from "../services/ClientPrediction";
import { interpolationService } from "../services/InterpolationService";

interface ServerPositionData {
    x: number;
    y: number;
    timestamp: number;
    sequenceNumber?: number;
}

interface ClientPredictionConfig {
    /** Enable client-side prediction */
    enablePrediction?: boolean;
    /** Distance threshold below which smooth interpolation is used (pixels) */
    smoothThreshold?: number;
    /** Distance threshold above which immediate snapping is used (pixels) */
    snapThreshold?: number;
    /** Duration for smooth interpolation in milliseconds */
    interpolationDuration?: number;
    /** Maximum time difference to accept for reconciliation (ms) */
    maxTimeDifference?: number;
}

export class RpgClientPlayer extends RpgClientObject {
    type = 'player'
    
    private _clientPredictionEnabled: boolean = false;
    private _lastServerUpdate: number = 0;

    constructor() {
        super();
        // Register player for reconciliation
        clientPredictionService.registerPlayer(this);
    }

    /**
     * Enable client-side prediction for this player
     */
    enableClientPrediction(config: ClientPredictionConfig = {}): void {
        this._clientPredictionEnabled = config.enablePrediction ?? true;
        
        // Configure the prediction service
        if (config.smoothThreshold !== undefined || 
            config.snapThreshold !== undefined || 
            config.interpolationDuration !== undefined ||
            config.maxTimeDifference !== undefined) {
            clientPredictionService.setConfig({
                smoothThreshold: config.smoothThreshold,
                snapThreshold: config.snapThreshold,
                interpolationDuration: config.interpolationDuration,
                maxTimeDifference: config.maxTimeDifference
            });
        }
    }

    /**
     * Disable client-side prediction for this player
     */
    disableClientPrediction(): void {
        this._clientPredictionEnabled = false;
    }

    /**
     * Reconcile position with server
     * This is the main method to call when receiving server position updates
     */
    reconcileServerPosition(serverData: ServerPositionData): void {
        this._lastServerUpdate = Date.now();

        if (!this._clientPredictionEnabled) {
            // If prediction is disabled, apply server position directly
            (this as any).x.set(serverData.x);
            (this as any).y.set(serverData.y);
            return;
        }

        // Check if positions are equivalent considering timestamp lag
        const isPositionEquivalent = this.checkPositionEquivalence(serverData);
        
        if (isPositionEquivalent) {
            console.log(`[RpgClientPlayer] Server position matches client prediction for player ${(this as any).id}`);
            return;
        }

        // Positions differ - use reconciliation service
        clientPredictionService.reconcileWithServer(this, serverData);
    }

    /**
     * Check if server position is equivalent to client position
     * considering the timestamp difference
     */
    private checkPositionEquivalence(serverData: ServerPositionData): boolean {
        const currentX = (this as any).x();
        const currentY = (this as any).y();
        const distance = Math.sqrt(
            Math.pow(serverData.x - currentX, 2) + Math.pow(serverData.y - currentY, 2)
        );

        const threshold = 2; // Very small threshold for "equivalent" positions
        return distance <= threshold;
    }



    /**
     * Force sync with server position (for teleports, map changes, etc.)
     */
    forceServerSync(x: number, y: number): void {
        interpolationService.stopInterpolation((this as any).id);
        
        // Apply server position immediately
        (this as any).x.set(x);
        (this as any).y.set(y);
        
        console.log(`[RpgClientPlayer] Force synced player ${(this as any).id} to position (${x}, ${y})`);
    }

    /**
     * Check if client prediction is enabled
     */
    isClientPredictionEnabled(): boolean {
        return this._clientPredictionEnabled;
    }

    /**
     * Get prediction statistics for debugging
     */
    getPredictionStats() {
        return {
            predictionEnabled: this._clientPredictionEnabled,
            lastServerUpdate: this._lastServerUpdate,
            timeSinceLastUpdate: Date.now() - this._lastServerUpdate,
            serviceStats: clientPredictionService.getStats((this as any).id)
        };
    }

    /**
     * Get distance to a specific position
     */
    getDistanceToPosition(x: number, y: number): number {
        const dx = (this as any).x() - x;
        const dy = (this as any).y() - y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Check if current position is near another position
     */
    isNearPosition(x: number, y: number, threshold: number = 5): boolean {
        return this.getDistanceToPosition(x, y) <= threshold;
    }

    /**
     * Cleanup prediction resources
     */
    cleanupPrediction(): void {
        clientPredictionService.cleanup((this as any).id);
    }
}   