import type {
  RpgPlayer,
  RpgPlayerConnectionContext,
} from "@rpgjs/server";

/** Show the Studio title screen and keep the framework-owned new-game flow. */
export interface StudioTitleStartup {
  projectId: string;
  flow: "title";
  /** Override the project's configured starting map. */
  startMapId?: string;
}

/** Skip interactive startup UI and enter one validated Studio map directly. */
export interface StudioDirectStartup {
  projectId: string;
  flow: "direct";
  mapId: string;
}

/**
 * Skip the title screen but keep the framework-owned new-game flow: the character selection first
 * (when the project enabled `menus.characterSelect`), then the actor, the default stats and the start map,
 * exactly as after "Start" on the title screen.
 *
 * Set `displayTitleScreen: false` in the client options of `provideStudioGame()` as well, so the client does
 * not draw the title while the server enters the game.
 */
export interface StudioNewGameStartup {
  projectId: string;
  flow: "new-game";
  /** Override the project's configured starting map. */
  startMapId?: string;
}

/** Player-specific startup decision for a shared Studio MMORPG runtime. */
export type StudioPlayerStartup = StudioTitleStartup | StudioDirectStartup | StudioNewGameStartup;

/** Connection-scoped input passed to a Studio startup resolver. */
export type StudioStartupResolverContext<TState = unknown> =
  RpgPlayerConnectionContext<TState> & {
    readonly player: RpgPlayer;
  };

/** Resolve one immutable Studio startup decision per accepted player connection. */
export type StudioStartupResolver<TState = unknown> = (
  context: StudioStartupResolverContext<TState>,
) => StudioPlayerStartup | Promise<StudioPlayerStartup>;

export type StudioStartupErrorCode =
  | "PROJECT_REQUIRED"
  | "PROJECT_NOT_FOUND"
  | "MAP_REQUIRED"
  | "MAP_PROJECT_MISMATCH";

/** Explicit startup failure that never falls back to process-global Studio data. */
export class StudioStartupError extends Error {
  readonly name = "StudioStartupError";

  constructor(
    public readonly code: StudioStartupErrorCode,
    message: string,
  ) {
    super(message);
  }
}
