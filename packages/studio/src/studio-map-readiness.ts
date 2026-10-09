interface StudioMapReadinessState {
  promise: Promise<void>;
  resolve: () => void;
  ready: boolean;
}

function createStudioMapReadinessState(ready: boolean): StudioMapReadinessState {
  let resolve!: () => void;
  const state: StudioMapReadinessState = {
    promise: new Promise<void>((done) => {
      resolve = done;
    }),
    resolve: () => resolve(),
    ready,
  };
  if (ready) state.resolve();
  return state;
}

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
  if (state.ready) return;
  state.ready = true;
  state.resolve();
}
