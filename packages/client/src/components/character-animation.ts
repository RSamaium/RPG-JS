/** Choose locomotion from current movement, without interrupting a one-shot animation. */
export function resolveCharacterAnimation(
  name: string,
  moving: boolean,
  heldDirection: boolean,
  controlsEnabled: boolean,
  animationFixed: boolean,
  temporaryName?: string,
): string {
  if (temporaryName) return temporaryName;
  if (name !== 'stand' && name !== 'walk') return name;
  if (animationFixed) return name;
  return moving || (heldDirection && controlsEnabled) ? 'walk' : 'stand';
}
