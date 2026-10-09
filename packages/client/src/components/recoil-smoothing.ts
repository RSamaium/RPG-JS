/** Presentation only: physics keeps the authoritative position during recoil. */
export class RecoilSmoothing {
  private settleUntil = 0;

  duration(active: boolean, current: number, target: number, now: number): number {
    if (active) this.settleUntil = now + 100;
    // Map transfers and large authoritative jumps must not slide across the map.
    if (Math.abs(target - current) > 128) return 0;
    return active || now < this.settleUntil ? 80 : 0;
  }
}
