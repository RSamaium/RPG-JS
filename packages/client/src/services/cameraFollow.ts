export const DEFAULT_CAMERA_FOLLOW_TIME = 1000;
export const DEFAULT_CAMERA_FOLLOW_EASE = "easeInOutSine";

export const CAMERA_FOLLOW_EASES = [
  "linear",
  "easeInQuad",
  "easeOutQuad",
  "easeInOutQuad",
  "easeInCubic",
  "easeOutCubic",
  "easeInOutCubic",
  "easeInQuart",
  "easeOutQuart",
  "easeInOutQuart",
  "easeInQuint",
  "easeOutQuint",
  "easeInOutQuint",
  "easeInSine",
  "easeOutSine",
  "easeInOutSine",
  "easeInExpo",
  "easeOutExpo",
  "easeInOutExpo",
  "easeInCirc",
  "easeOutCirc",
  "easeInOutCirc",
  "easeInElastic",
  "easeOutElastic",
  "easeInOutElastic",
  "easeInBack",
  "easeOutBack",
  "easeInOutBack",
  "easeInBounce",
  "easeOutBounce",
  "easeInOutBounce",
] as const;

export type CameraFollowEase = typeof CAMERA_FOLLOW_EASES[number];

export type CameraFollowSmoothMoveOptions = {
  /** Enable or disable the smooth transition when options are sent as an object. */
  enabled?: boolean;
  /** Duration of the transition to the new camera target, in milliseconds. */
  time?: number;
  /** pixi-viewport easing name, for example "easeInOutQuad". */
  ease?: CameraFollowEase;
  /** Continuous follow speed after the transition. 0 keeps the target centered instantly. */
  speed?: number;
  /** Continuous follow acceleration after the transition. */
  acceleration?: number | null;
  /** Center radius where the followed target can move without moving the viewport. */
  radius?: number | null;
};

export type CameraFollowSmoothMove = boolean | CameraFollowSmoothMoveOptions;

export type CameraFollowTarget = {
  x: number;
  y: number;
  destroyed?: boolean;
} | null | undefined;

export type CameraFollowPosition = {
  x: number;
  y: number;
};

export interface CameraFollowApplyContext {
  viewport: any;
  target: CameraFollowTarget;
  smoothMove: CameraFollowSmoothMove;
  followRevision: number;
  isCurrentRevision: (revision: number) => boolean;
  shouldFollowCamera: () => boolean;
}

export type CameraFollowOwnership = {
  readonly viewport: object;
  readonly token: symbol;
};

const cameraFollowOwners = new WeakMap<object, symbol>();

const isTrackableViewport = (viewport: unknown): viewport is object => {
  return (typeof viewport === "object" && viewport !== null) || typeof viewport === "function";
};

const claimCameraFollow = (viewport: unknown): CameraFollowOwnership | null => {
  if (!isTrackableViewport(viewport)) return null;
  const token = Symbol("camera-follow-owner");
  cameraFollowOwners.set(viewport, token);
  return { viewport, token };
};

export const ownsCameraFollow = (ownership: CameraFollowOwnership | null): boolean => {
  return ownership !== null && cameraFollowOwners.get(ownership.viewport) === ownership.token;
};

const finiteNumber = (value: unknown, fallback: number) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const isCameraFollowEase = (value: unknown): value is CameraFollowEase => {
  return typeof value === "string" && (CAMERA_FOLLOW_EASES as readonly string[]).includes(value);
};

export const smoothMoveEnabled = (smoothMove: CameraFollowSmoothMove) => {
  if (smoothMove === false) return false;
  if (typeof smoothMove === "object" && smoothMove !== null && smoothMove.enabled === false) {
    return false;
  }
  return true;
};

export const cameraFollowAnimationOptions = (
  smoothMove: CameraFollowSmoothMove
) => {
  if (!smoothMoveEnabled(smoothMove)) return null;
  const options = typeof smoothMove === "object" && smoothMove !== null ? smoothMove : {};
  return {
    time: Math.max(0, finiteNumber(options.time, DEFAULT_CAMERA_FOLLOW_TIME)),
    ease: isCameraFollowEase(options.ease) ? options.ease : DEFAULT_CAMERA_FOLLOW_EASE,
  };
};

export const cameraFollowOptions = (smoothMove: CameraFollowSmoothMove) => {
  if (typeof smoothMove !== "object" || smoothMove === null) return undefined;
  const options: { speed?: number; acceleration?: number | null; radius?: number | null } = {};
  if (typeof smoothMove.speed === "number" && Number.isFinite(smoothMove.speed)) {
    options.speed = Math.max(0, smoothMove.speed);
  }
  if (typeof smoothMove.acceleration === "number" && Number.isFinite(smoothMove.acceleration)) {
    options.acceleration = Math.max(0, smoothMove.acceleration);
  } else if (smoothMove.acceleration === null) {
    options.acceleration = null;
  }
  if (typeof smoothMove.radius === "number" && Number.isFinite(smoothMove.radius)) {
    options.radius = Math.max(0, smoothMove.radius);
  } else if (smoothMove.radius === null) {
    options.radius = null;
  }
  return Object.keys(options).length > 0 ? options : undefined;
};

export const clearCameraFollowPlugins = (
  viewport: any,
  ownership: CameraFollowOwnership | null = null
) => {
  if (ownership && (ownership.viewport !== viewport || !ownsCameraFollow(ownership))) {
    return false;
  }
  viewport?.plugins?.remove?.("animate");
  viewport?.plugins?.remove?.("follow");
  if (isTrackableViewport(viewport)) {
    cameraFollowOwners.delete(viewport);
  }
  return true;
};

export const ownsCameraFollowRevision = (
  appliedRevision: number | null,
  currentRevision: number
) => {
  return appliedRevision !== null && appliedRevision === currentRevision;
};

export const readCameraFollowPosition = (
  target: CameraFollowTarget
): CameraFollowPosition | null => {
  if (!target) return null;

  try {
    if (target.destroyed) return null;
    const x = target.x;
    const y = target.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  } catch {
    return null;
  }
};

const createCameraFollowTarget = (
  target: CameraFollowTarget,
  initialPosition: CameraFollowPosition
) => {
  let lastPosition = initialPosition;

  const readPosition = () => {
    const nextPosition = readCameraFollowPosition(target);
    if (nextPosition) {
      lastPosition = nextPosition;
    }
    return lastPosition;
  };

  return {
    get x() {
      return readPosition().x;
    },
    get y() {
      return readPosition().y;
    },
  };
};

export const followCameraInstantly = (
  viewport: any,
  target: CameraFollowTarget,
  smoothMove: CameraFollowSmoothMove
) => {
  const position = readCameraFollowPosition(target);
  if (!position) return false;

  const followTarget = createCameraFollowTarget(target, position);
  const followOptions = cameraFollowOptions(smoothMove);
  if (followOptions) {
    viewport.follow(followTarget, followOptions);
  } else {
    viewport.follow(followTarget);
  }
  return true;
};

export const applyCameraFollow = ({
  viewport,
  target,
  smoothMove,
  followRevision,
  isCurrentRevision,
  shouldFollowCamera,
}: CameraFollowApplyContext) => {
  clearCameraFollowPlugins(viewport);

  const position = readCameraFollowPosition(target);
  if (!position) return null;

  const ownership = claimCameraFollow(viewport);
  if (!ownership) return null;

  const animationOptions = cameraFollowAnimationOptions(smoothMove);
  if (!animationOptions || animationOptions.time <= 0) {
    if (!followCameraInstantly(viewport, target, smoothMove)) {
      clearCameraFollowPlugins(viewport, ownership);
      return null;
    }
    return ownership;
  }

  viewport.animate({
    position,
    time: animationOptions.time,
    ease: animationOptions.ease,
    callbackOnComplete: () => {
      if (!ownsCameraFollow(ownership) || !isCurrentRevision(followRevision) || !shouldFollowCamera()) return;
      if (!readCameraFollowPosition(target) || !followCameraInstantly(viewport, target, smoothMove)) {
        clearCameraFollowPlugins(viewport, ownership);
      }
    },
  });
  return ownership;
};
