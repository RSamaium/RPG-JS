interface StudioMapReadinessState {
  promise: Promise<void>;
  resolve: () => void;
  ready: boolean;
  /** The initial terrain viewport has been drawn. */
  terrainReady: boolean;
  /** Other parts of the scene (the walls) that must be drawn before the reveal. */
  holds: number;
}

function createStudioMapReadinessState(ready: boolean): StudioMapReadinessState {
  let resolve!: () => void;
  const state: StudioMapReadinessState = {
    promise: new Promise<void>((done) => {
      resolve = done;
    }),
    resolve: () => resolve(),
    ready,
    terrainReady: ready,
    holds: 0,
  };
  if (ready) state.resolve();
  return state;
}

const settle = (state: StudioMapReadinessState): void => {
  if (state.ready || !state.terrainReady || state.holds > 0) return;
  state.ready = true;
  state.resolve();
};

let currentStudioMapReadiness = createStudioMapReadinessState(true);

/** Start a fresh map-loading cycle before the previous scene is unmounted. */
export function beginStudioMapLoading(): void {
  currentStudioMapReadiness = createStudioMapReadinessState(false);
}

/** Wait until Studio has rasterized and presented the initial terrain viewport. */
export function waitForStudioMapReady(map: unknown): Promise<void> {
  if (
    !map ||
    typeof map !== "object" ||
    !(map as { terrainRenderData?: unknown }).terrainRenderData
  ) {
    return Promise.resolve();
  }
  return currentStudioMapReadiness.promise;
}

/** Mark the initial Studio terrain viewport as safe to reveal. */
export function markStudioMapReady(): void {
  const state = currentStudioMapReadiness;
  if (state.terrainReady) return;
  state.terrainReady = true;
  settle(state);
}

/**
 * Keep the reveal waiting for another part of the scene (the terrain walls, painted in a worker).
 * Returns the function that releases it. Once the map is revealed, a hold changes nothing.
 */
export function holdStudioMapReady(): () => void {
  const state = currentStudioMapReadiness;
  if (state.ready) return () => {};
  state.holds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.holds -= 1;
    settle(state);
  };
}
