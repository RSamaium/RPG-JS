import type { Direction } from "@rpgjs/common";
import type { RpgPlayer } from "../Player/Player";
import {
  DEFAULT_DASH_COOLDOWN_MS,
  isDashMovementInput,
  normalizeServerMovementInput,
  vectorToDirection,
} from "./map-input";
import type { Controls } from "./map-types";

const MOVEMENT_IDLE_TIMEOUT_MS = 100;

type DashInput = Exclude<ReturnType<typeof normalizeServerMovementInput>, Direction | null>;

/**
 * Map operations used by the input processor.
 */
export interface MapInputProcessorHost {
  getPlayer(playerId: string): RpgPlayer | undefined;
  getPlayers(): RpgPlayer[];
  getTick(): number;
  getBodyPosition(playerId: string): { x: number; y: number } | undefined;
  movePlayer(player: RpgPlayer, direction: Direction): Promise<void>;
  dashBody(player: RpgPlayer, input: DashInput): void;
  stopMovement(player: RpgPlayer): void;
}

/**
 * Consumes queued client movement inputs for the players of a map.
 *
 * Inputs only update velocities; the authoritative physics step is run by the
 * map tick loop. A processed frame is acknowledged to the client only after the
 * next physics step, through `captureProcessedInputPositions()`.
 */
export class MapInputProcessor {
  private pendingAckFrames = new Map<string, number>();

  constructor(private readonly host: MapInputProcessorHost) {}

  /** Last frame acknowledged, or waiting for acknowledgement, for a player. */
  getLastAckedFrame(player: RpgPlayer): number {
    return Math.max(
      player._lastFramePositions?.frame ?? 0,
      this.pendingAckFrames.get(player.id) ?? 0,
    );
  }

  /** Forget the pending acknowledgement of a player (join, leave). */
  forgetPlayer(playerId: string): void {
    this.pendingAckFrames.delete(playerId);
  }

  /** Drop queued inputs and input tracking of a player that cannot move. */
  resetPlayer(player: RpgPlayer): void {
    player.pendingInputs = [];
    player.lastProcessedInputTs = 0;
    player.lastProcessedClientInputTs = 0;
    player.lastProcessedInputTick = null;
    player.lastProcessedInputServerTick = null;
    this.pendingAckFrames.delete(player.id);
  }

  private async processById(playerId: string) {
    const player = this.host.getPlayer(playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }
    return this.process(player);
  }

  async process(player: RpgPlayer, controls?: Controls): Promise<{
    player: RpgPlayer,
    inputs: any[]
  }> {
    if (!player.isConnected()) {
      player.pendingInputs = [];
      return {
        player,
        inputs: []
      }
    }

    if (player.knockbackActive()) {
      this.resetPlayer(player);
      return { player, inputs: [] };
    }

    if ((player as any).canMove === false) {
      this.resetPlayer(player);
      this.host.stopMovement(player);
      return {
        player,
        inputs: []
      }
    }

    const processedInputs: any[] = [];
    const defaultControls: Required<Controls> = {
      maxTimeDelta: 1000, // 1 second max between inputs
      maxFrameDelta: 10,  // Max 10 frames skipped
      minTimeBetweenInputs: 16, // ~60fps minimum
      enableAntiCheat: false,
      maxInputsPerTick: 1,
    };

    const config = { ...defaultControls, ...controls };
    let lastProcessedTime = player.lastProcessedInputTs || 0;
    let lastProcessedClientTime = player.lastProcessedClientInputTs || 0;
    let lastProcessedFrame = this.getLastAckedFrame(player);

    // Sort inputs by frame number to ensure proper order
    player.pendingInputs.sort((a, b) => (a.frame || 0) - (b.frame || 0));

    let hasProcessedInputs = false;
    let processedTickGroups = 0;
    let activeClientTick: number | undefined;
    let hasActiveClientTickGroup = false;

    // Process pending inputs progressively to preserve itinerary under latency.
    // Several input callbacks can run before one fixed client physics step. All
    // frames carrying that same tick must therefore update velocity before one
    // authoritative step instead of advancing the server once per frame.
    while (player.pendingInputs.length > 0) {
      const input = player.pendingInputs[0];

      if (!input || typeof input.frame !== 'number') {
        player.pendingInputs.shift();
        continue;
      }

      const clientInputTick = typeof input.tick === "number" ? input.tick : undefined;
      const joinsActiveClientTickGroup =
        hasActiveClientTickGroup
        && typeof clientInputTick === "number"
        && clientInputTick === activeClientTick;
      if (!joinsActiveClientTickGroup && processedTickGroups >= config.maxInputsPerTick) {
        break;
      }
      const previousClientInputTick = player.lastProcessedInputTick;
      const previousServerInputTick = player.lastProcessedInputServerTick;
      if (
        !joinsActiveClientTickGroup
        && typeof clientInputTick === "number"
        && typeof previousClientInputTick === "number"
        && typeof previousServerInputTick === "number"
      ) {
        const clientTickDelta = clientInputTick - previousClientInputTick;
        if (clientTickDelta <= 0) {
          player.pendingInputs.shift();
          continue;
        }
        if (this.host.getTick() < previousServerInputTick + clientTickDelta) {
          break;
        }
      }
      player.pendingInputs.shift();

      // Anti-cheat validation
      if (config.enableAntiCheat) {
        // Check frame delta
        if (input.frame > lastProcessedFrame + config.maxFrameDelta) {
          // Reset to last valid frame
          input.frame = lastProcessedFrame + 1;
        }

        // Check time delta if timestamp is available
        if (input.timestamp && lastProcessedClientTime > 0) {
          const timeDelta = input.timestamp - lastProcessedClientTime;
          if (timeDelta > config.maxTimeDelta) {
            input.timestamp = lastProcessedClientTime + config.minTimeBetweenInputs;
          }
        }

        // Check minimum time between inputs
        if (!joinsActiveClientTickGroup && input.timestamp && lastProcessedClientTime > 0) {
          const timeDelta = input.timestamp - lastProcessedClientTime;
          if (timeDelta < config.minTimeBetweenInputs) {
            continue;
          }
        }
      }

      // Skip if frame is too old (more than 10 frames behind)
      if (input.frame < lastProcessedFrame - 10) {
        continue;
      }

      const movementInput = normalizeServerMovementInput(input.input);

      // Process the input - update velocity based on the latest input
      if (movementInput) {
        let idleHoldMs = 0;
        if (isDashMovementInput(movementInput)) {
          const now = Date.now();
          const lockedUntil = (player as any).__rpgDashLockedUntil;
          if (!(typeof lockedUntil === "number" && now < lockedUntil)) {
            (player as any).__rpgDashLockedUntil =
              now + (movementInput.cooldown ?? DEFAULT_DASH_COOLDOWN_MS);
            player.changeDirection(vectorToDirection(movementInput.direction));
            this.host.dashBody(player, movementInput);
            idleHoldMs = movementInput.duration ?? 0;
          }
        } else {
          await this.host.movePlayer(player, movementInput);
        }
        processedInputs.push(input.input);
        hasProcessedInputs = true;
        lastProcessedClientTime = (input.timestamp || Date.now()) + idleHoldMs;
        lastProcessedTime = Date.now() + idleHoldMs;
        player.lastProcessedInputTick = clientInputTick ?? null;
        player.lastProcessedInputServerTick = this.host.getTick();
        if (!joinsActiveClientTickGroup) {
          processedTickGroups += 1;
          activeClientTick = clientInputTick;
          hasActiveClientTickGroup = true;
        }

        // Do not expose this frame until the following authoritative physics
        // step has completed. In particular, never pair the new frame with the
        // client-authored trajectory position while that step is pending.
        this.pendingAckFrames.set(player.id, input.frame);
      }

      // Update tracking variables
      lastProcessedFrame = input.frame;
    }

    // Physics is now handled by the main game loop (tick$ -> runFixedTicks)
    // We only update timestamps and handle idle timeout here
    // The physics step will be executed in the next tick cycle
    if (hasProcessedInputs) {
      player.lastProcessedInputTs = lastProcessedTime;
      player.lastProcessedClientInputTs = lastProcessedClientTime;
    } else {
      const idleTimeout = Math.max(
        config.minTimeBetweenInputs * 4,
        MOVEMENT_IDLE_TIMEOUT_MS,
      );
      const lastTs = player.lastProcessedInputTs || 0;
      if (lastTs > 0 && Date.now() - lastTs > idleTimeout) {
        this.host.stopMovement(player);
        player.lastProcessedInputTs = 0;
      }
    }

    return {
      player,
      inputs: processedInputs
    };
  }

  captureProcessedInputPositions(tick: number): void {
    for (const [playerId, frame] of this.pendingAckFrames) {
      const player = this.host.getPlayer(playerId);
      if (!player) continue;
      const bodyPos = this.host.getBodyPosition(player.id);
      player._lastFramePositions = {
        frame,
        position: {
          x: Math.round(bodyPos?.x ?? player.x()),
          y: Math.round(bodyPos?.y ?? player.y()),
          direction: player.direction(),
        },
        serverTick: tick,
      };
    }
    this.pendingAckFrames.clear();
  }

  async processPendingInputsForTick(): Promise<void> {
    for (const player of this.host.getPlayers()) {
      const anyPlayer = player as any;
      const shouldProcess = player.pendingInputs.length > 0 || (player.lastProcessedInputTs || 0) > 0;
      if (!shouldProcess || anyPlayer._isProcessingInputs) {
        continue;
      }
      anyPlayer._isProcessingInputs = true;
      try {
        await this.processById(player.id);
      }
      finally {
        anyPlayer._isProcessingInputs = false;
      }
    }
  }

  getPendingInputCount(): number {
    return this.host.getPlayers().reduce(
      (total, player) => total + (
        Array.isArray(player.pendingInputs) ? player.pendingInputs.length : 0
      ),
      0,
    );
  }
}
