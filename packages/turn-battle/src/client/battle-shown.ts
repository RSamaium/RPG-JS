/**
 * Whether the battle is on the screen: the session exists AND it is done loading (its fighters and its scenery are drawn). The session
 * exists as soon as the first packet arrives, while it still loads the sprite sheets of the fighters: taking the stage of the lobby away at
 * that moment shows the map for a few seconds, between the lobby and the battle.
 */
export function battleIsShown(inBattle: boolean, phase: string): boolean {
  return inBattle && phase !== "loading" && phase !== "closed";
}
