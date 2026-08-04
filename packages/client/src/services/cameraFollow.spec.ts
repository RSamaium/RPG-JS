import { describe, expect, it, vi } from "vitest";
import {
  applyCameraFollow,
  cameraFollowAnimationOptions,
  cameraFollowOptions,
  clearCameraFollowPlugins,
  ownsCameraFollowRevision,
} from "./cameraFollow";

const createViewport = () => ({
  animate: vi.fn(),
  follow: vi.fn(),
  plugins: {
    remove: vi.fn(),
  },
});

describe("camera follow", () => {
  it("normalizes transition options from smoothMove", () => {
    expect(cameraFollowAnimationOptions(true)).toEqual({
      time: 1000,
      ease: "easeInOutSine",
    });
    expect(cameraFollowAnimationOptions({ time: 450, ease: "easeInOutQuad" })).toEqual({
      time: 450,
      ease: "easeInOutQuad",
    });
    expect(cameraFollowAnimationOptions({ time: 450, ease: "easeInOutQuadd" } as any)).toEqual({
      time: 450,
      ease: "easeInOutSine",
    });
    expect(cameraFollowAnimationOptions(false)).toBeNull();
  });

  it("normalizes continuous follow options", () => {
    expect(cameraFollowOptions({ speed: 12, acceleration: 0.2, radius: 80 })).toEqual({
      speed: 12,
      acceleration: 0.2,
      radius: 80,
    });
    expect(cameraFollowOptions({ speed: -4, acceleration: null, radius: null })).toEqual({
      speed: 0,
      acceleration: null,
      radius: null,
    });
    expect(cameraFollowOptions(true)).toBeUndefined();
  });

  it("animates to the target then follows it", () => {
    const viewport = createViewport();
    const target = { x: 120, y: 240 };

    applyCameraFollow({
      viewport,
      target,
      smoothMove: { time: 800, ease: "easeInOutQuad", speed: 10, radius: 32 },
      followRevision: 2,
      isCurrentRevision: (revision) => revision === 2,
      shouldFollowCamera: () => true,
    });

    expect(viewport.plugins.remove).toHaveBeenCalledWith("animate");
    expect(viewport.plugins.remove).toHaveBeenCalledWith("follow");
    expect(viewport.animate).toHaveBeenCalledWith(
      expect.objectContaining({
        position: { x: 120, y: 240 },
        time: 800,
        ease: "easeInOutQuad",
      })
    );
    expect(viewport.follow).not.toHaveBeenCalled();

    const animateOptions = viewport.animate.mock.calls[0][0];
    animateOptions.callbackOnComplete();

    const [followTarget, followOptions] = viewport.follow.mock.calls[0];
    expect(followTarget).not.toBe(target);
    expect(followTarget.x).toBe(120);
    expect(followTarget.y).toBe(240);
    expect(followOptions).toEqual({
      speed: 10,
      radius: 32,
    });
  });

  it("follows instantly when smoothMove is disabled", () => {
    const viewport = createViewport();
    const target = { x: 120, y: 240 };

    applyCameraFollow({
      viewport,
      target,
      smoothMove: false,
      followRevision: 1,
      isCurrentRevision: () => true,
      shouldFollowCamera: () => true,
    });

    expect(viewport.animate).not.toHaveBeenCalled();
    const [followTarget] = viewport.follow.mock.calls[0];
    expect(followTarget).not.toBe(target);
    expect(followTarget.x).toBe(120);
    expect(followTarget.y).toBe(240);
  });

  it("does not follow after animation if another camera command superseded it", () => {
    const viewport = createViewport();

    applyCameraFollow({
      viewport,
      target: { x: 120, y: 240 },
      smoothMove: { time: 800, ease: "easeInOutQuad" },
      followRevision: 2,
      isCurrentRevision: (revision) => revision === 3,
      shouldFollowCamera: () => true,
    });

    const animateOptions = viewport.animate.mock.calls[0][0];
    animateOptions.callbackOnComplete();

    expect(viewport.follow).not.toHaveBeenCalled();
  });

  it("does not let a remounted sprite cleanup remove the newer follow owner", () => {
    const viewport = createViewport();

    const previousOwner = applyCameraFollow({
      viewport,
      target: { x: 120, y: 240 },
      smoothMove: false,
      followRevision: 2,
      isCurrentRevision: () => true,
      shouldFollowCamera: () => true,
    });
    const currentOwner = applyCameraFollow({
      viewport,
      target: { x: 160, y: 280 },
      smoothMove: false,
      followRevision: 2,
      isCurrentRevision: () => true,
      shouldFollowCamera: () => true,
    });

    viewport.plugins.remove.mockClear();

    expect(clearCameraFollowPlugins(viewport, previousOwner)).toBe(false);
    expect(viewport.plugins.remove).not.toHaveBeenCalled();
    expect(clearCameraFollowPlugins(viewport, currentOwner)).toBe(true);
    expect(viewport.plugins.remove).toHaveBeenCalledWith("animate");
    expect(viewport.plugins.remove).toHaveBeenCalledWith("follow");
  });

  it("ignores an animation callback from a previous owner with the same revision", () => {
    const viewport = createViewport();

    applyCameraFollow({
      viewport,
      target: { x: 120, y: 240 },
      smoothMove: true,
      followRevision: 2,
      isCurrentRevision: () => true,
      shouldFollowCamera: () => true,
    });
    const previousAnimation = viewport.animate.mock.calls[0][0];

    applyCameraFollow({
      viewport,
      target: { x: 160, y: 280 },
      smoothMove: false,
      followRevision: 2,
      isCurrentRevision: () => true,
      shouldFollowCamera: () => true,
    });
    viewport.follow.mockClear();

    previousAnimation.callbackOnComplete();

    expect(viewport.follow).not.toHaveBeenCalled();
  });

  it("does not follow a target whose position cannot be read", () => {
    const viewport = createViewport();
    const target = {
      get x(): number {
        throw new Error("target destroyed");
      },
      get y() {
        return 240;
      },
    };

    applyCameraFollow({
      viewport,
      target,
      smoothMove: false,
      followRevision: 1,
      isCurrentRevision: () => true,
      shouldFollowCamera: () => true,
    });

    expect(viewport.plugins.remove).toHaveBeenCalledWith("animate");
    expect(viewport.plugins.remove).toHaveBeenCalledWith("follow");
    expect(viewport.animate).not.toHaveBeenCalled();
    expect(viewport.follow).not.toHaveBeenCalled();
  });

  it("keeps the follow target readable when the source target is destroyed", () => {
    const viewport = createViewport();
    let position: { x: number; y: number } | null = { x: 120, y: 240 };
    const target = {
      get destroyed() {
        return position === null;
      },
      get x() {
        if (!position) throw new Error("target destroyed");
        return position.x;
      },
      get y() {
        if (!position) throw new Error("target destroyed");
        return position.y;
      },
    };

    applyCameraFollow({
      viewport,
      target,
      smoothMove: false,
      followRevision: 1,
      isCurrentRevision: () => true,
      shouldFollowCamera: () => true,
    });

    const [followTarget] = viewport.follow.mock.calls[0];
    expect(followTarget.x).toBe(120);
    expect(followTarget.y).toBe(240);

    position = { x: 160, y: 280 };
    expect(followTarget.x).toBe(160);
    expect(followTarget.y).toBe(280);

    position = null;
    expect(followTarget.x).toBe(160);
    expect(followTarget.y).toBe(280);
  });

  it("does not follow after animation if the target was destroyed", () => {
    const viewport = createViewport();
    let destroyed = false;
    const target = {
      get destroyed() {
        return destroyed;
      },
      x: 120,
      y: 240,
    };

    applyCameraFollow({
      viewport,
      target,
      smoothMove: { time: 800, ease: "easeInOutQuad" },
      followRevision: 2,
      isCurrentRevision: (revision) => revision === 2,
      shouldFollowCamera: () => true,
    });

    destroyed = true;
    const animateOptions = viewport.animate.mock.calls[0][0];
    animateOptions.callbackOnComplete();

    expect(viewport.follow).not.toHaveBeenCalled();
  });

  it("only lets the sprite that owns the active follow revision clear plugins", () => {
    expect(ownsCameraFollowRevision(2, 2)).toBe(true);
    expect(ownsCameraFollowRevision(2, 3)).toBe(false);
    expect(ownsCameraFollowRevision(null, 2)).toBe(false);
  });
});
