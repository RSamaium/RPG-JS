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
    private _pendingInputs: { direction: Direction; timestamp: number }[] = [];
    private _lastPredictedTimestamp: number = 0;

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
        this._pendingInputs = [];
    }

    /**
     * Apply movement with client-side prediction
     * This method applies movement immediately on client side
     */
    predictiveMove(direction: Direction, deltaTime: number = 16): void {
        if (!this._clientPredictionEnabled) {
            // Fallback to standard movement if prediction is disabled
            this.standardMove(direction, deltaTime);
            return;
        }

        const timestamp = Date.now();
        
        // Avoid too frequent movements
        if (timestamp - this._lastPredictedTimestamp < 8) { // Max 125 FPS
            return;
        }

        this._lastPredictedTimestamp = timestamp;

        // Store input for replay after reconciliation
        this._pendingInputs.push({ direction, timestamp });
        
        // Limit buffer size
        if (this._pendingInputs.length > 100) {
            this._pendingInputs.splice(0, this._pendingInputs.length - 100);
        }

        // Apply prediction immediately
        clientPredictionService.predictMovement(this, direction, deltaTime);
    }

    /**
     * Standard movement without prediction (fallback)
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
     * Reconcile position with server
     * This is the main method to call when receiving server position updates
     */
    reconcileServerPosition(serverData: ServerPositionData): void {
        this._lastServerUpdate = Date.now();

        if (!this._clientPredictionEnabled) {
            // If prediction is disabled, apply server position directly
            this.x.set(serverData.x);
            this.y.set(serverData.y);
            return;
        }

        // Check if positions are equivalent considering timestamp lag
        const isPositionEquivalent = this.checkPositionEquivalence(serverData);
        
        if (isPositionEquivalent) {
            console.log(`[RpgClientPlayer] Server position matches client prediction for player ${this.id}`);
            this.cleanupAcknowledgedInputs(serverData.timestamp);
            return;
        }

        // Positions differ - use reconciliation service
        clientPredictionService.reconcileWithServer(this, serverData);
        
        // Clean up acknowledged inputs
        this.cleanupAcknowledgedInputs(serverData.timestamp);
        
        // Replay pending inputs after reconciliation
        this.replayPendingInputs();
    }

    /**
     * Check if server position is equivalent to client position
     * considering the timestamp difference
     */
    private checkPositionEquivalence(serverData: ServerPositionData): boolean {
        const currentX = this.x();
        const currentY = this.y();
        const distance = Math.sqrt(
            Math.pow(serverData.x - currentX, 2) + Math.pow(serverData.y - currentY, 2)
        );

        // Get current threshold from service
        const stats = clientPredictionService.getStats(this.id);
        const threshold = 2; // Very small threshold for "equivalent" positions

        return distance <= threshold;
    }

    /**
     * Clean up inputs that have been acknowledged by the server
     */
    private cleanupAcknowledgedInputs(serverTimestamp: number): void {
        const bufferTime = 50; // 50ms buffer
        this._pendingInputs = this._pendingInputs.filter(
            input => input.timestamp > (serverTimestamp + bufferTime)
        );
    }

    /**
     * Replay pending inputs after server reconciliation
     * This implements client-side rollback
     */
    private replayPendingInputs(): void {
        if (this._pendingInputs.length === 0) return;

        const startX = this.x();
        const startY = this.y();

        // Replay all pending inputs
        for (const input of this._pendingInputs) {
            this.predictiveMove(input.direction);
        }

        console.log(
            `[RpgClientPlayer] Replayed ${this._pendingInputs.length} inputs for player ${this.id}. ` +
            `Position: (${startX}, ${startY}) -> (${this.x()}, ${this.y()})`
        );
    }

    /**
     * Force sync with server position (for teleports, map changes, etc.)
     */
    forceServerSync(x: number, y: number): void {
        // Clear all prediction state
        this._pendingInputs = [];
        interpolationService.stopInterpolation(this.id);
        
        // Apply server position immediately
        this.x.set(x);
        this.y.set(y);
        
        console.log(`[RpgClientPlayer] Force synced player ${this.id} to position (${x}, ${y})`);
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
            pendingInputs: this._pendingInputs.length,
            lastServerUpdate: this._lastServerUpdate,
            timeSinceLastUpdate: Date.now() - this._lastServerUpdate,
            serviceStats: clientPredictionService.getStats(this.id)
        };
    }

    /**
     * Get distance to a specific position
     */
    getDistanceToPosition(x: number, y: number): number {
        const dx = this.x() - x;
        const dy = this.y() - y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Check if current position is near another position
     */
    isNearPosition(x: number, y: number, threshold: number = 5): boolean {
        return this.getDistanceToPosition(x, y) <= threshold;
    }

    /**
     * Override destroy to cleanup resources
     */
    destroy(): void {
        clientPredictionService.cleanup(this.id);
        super.destroy && super.destroy();
    }
}   