import { describe, expect, it } from "vitest";
import { applySceneParams } from "./scene-params";

describe("the params of a scene a map extension changes", () => {
  const scene = () => ({ id: "m", params: { backgroundMusic: "a.mp3", backgroundAmbientSound: "rain.mp3" }, data: { params: { scale: 1, width: 20, backgroundMusic: "a.mp3" }, weather: null } });

  it("puts the music and the ambient sound where the client plays them from, and everything in the params of the map", () => {
    const next = applySceneParams(scene(), { backgroundMusic: "b.mp3", scale: 2 });
    expect(next.params).toEqual({ backgroundMusic: "b.mp3", backgroundAmbientSound: "rain.mp3" });
    expect(next.data.params).toEqual({ scale: 2, width: 20, backgroundMusic: "b.mp3" });
    expect(next.data.weather).toBeNull();
  });

  it("takes off a key that is undefined, which is how the music stops", () => {
    const next = applySceneParams(scene(), { backgroundMusic: undefined, backgroundAmbientSound: undefined });
    expect(next.params).toEqual({});
    expect(next.data.params).not.toHaveProperty("backgroundMusic");
  });

  it("leaves the scene it is given as it was", () => {
    const original = scene();
    applySceneParams(original, { scale: 3, backgroundMusic: "c.mp3" });
    expect(original).toEqual(scene());
  });

  it("does not put the params of the map on the scene", () => {
    expect(applySceneParams(scene(), { scale: 4 }).params).not.toHaveProperty("scale");
  });
});
