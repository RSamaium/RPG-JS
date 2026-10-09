import { afterEach, expect, it, vi } from "vitest";
import { signal } from "canvasengine";
import { TestBed } from "canvasengine/testing";
import Cinematic from "./cinematic.ce";

const services = vi.hoisted(() => ({
  restoreMusic: vi.fn(),
  gui: { get: vi.fn(), hide: vi.fn(), display: vi.fn() },
}));
vi.mock("../../core/inject", () => ({
  inject: (service: { name: string }) => service.name === "RpgGui" ? services.gui : {
    i18n: () => ({ t: (key: string) => key }),
    audio: { getVolume: () => 1 },
    music: { duck: () => services.restoreMusic },
  },
}));

let root: Awaited<ReturnType<typeof TestBed.createComponent>>;
afterEach(() => {
  root?.destroy();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

it("attaches the playing video to the rendered DOM container and cleans up on close", async () => {
  vi.spyOn(HTMLMediaElement.prototype, "play", "get").mockReturnValue(async () => {});
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "load", "get").mockReturnValue(() => {});
  document.body.innerHTML = '<div id="root"></div>';
  root = await TestBed.createComponent(Cinematic, {
    data: signal({ src: "/cinematic.mp4" }),
    onFinish: vi.fn(),
  });
  await vi.waitFor(() => {
    const video = document.querySelector<HTMLVideoElement>(".rpg-ui-cinematic video");
    expect(video?.isConnected).toBe(true);
    expect(video?.getAttribute("src")).toBe("/cinematic.mp4");
  });
  root.destroy();
  expect(document.querySelector(".rpg-ui-cinematic")).toBeNull();
  expect(services.restoreMusic).toHaveBeenCalledOnce();
});
