import { describe, expect, it, vi } from "vitest";
const getMedia = vi.hoisted(() => vi.fn());
vi.mock("../src/data-provider", () => ({ getGameDataProvider: () => ({ getMedia }) }));
vi.mock("../src/spritesheet-utils", () => ({ resolveAssetSource: (file: string) => file ? `https://assets.test/${file}` : "" }));
import { resolveStudioCinematicSource, collectCinematicMediaIds, preloadMapCinematics } from "../src/cinematic";

describe("Studio cinematic source", () => {
  it('collects unique opted-in videos from mixed event and nested choice blocks', () => {
    const movie = (video: string, preload = true) => ({ type: 'show_cinematic', data: { video, preload } });
    expect(collectCinematicMediaIds([{ triggers: [{ blocks: [movie('one'), movie('one'), movie('disabled', false), { type: 'show_choices', data: { choices: [{ children: [movie('two')] }] } }] }] }])).toEqual(['one', 'two']);
  });
  it('bounds map buffering and releases sources when the map unmounts', async () => {
    getMedia.mockClear().mockResolvedValue({ fileName: 'movie.mp4' });
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load', 'get').mockReturnValue(() => {});
    const create = vi.spyOn(document, 'createElement');
    const release = preloadMapCinematics(['one', 'two', 'three', 'four'].map(video => ({ type: 'show_cinematic', data: { video } })));
    await vi.waitFor(() => expect(create.mock.results.filter(result => result.value instanceof HTMLVideoElement)).toHaveLength(3));
    const videos = create.mock.results.map(result => result.value).filter(value => value instanceof HTMLVideoElement);
    expect(getMedia).toHaveBeenCalledTimes(3);
    for (const video of videos) { expect(video.crossOrigin).toBe('anonymous'); expect(video.preload).toBe('auto'); }
    release();
    for (const video of videos) expect(video.getAttribute('src')).toBeNull();
    create.mockRestore();
    load.mockRestore();
  });
  it("resolves a media id through the configured game provider", async () => {
    getMedia.mockResolvedValue({ fileName: "project/video.mp4" });
    expect(await resolveStudioCinematicSource("video")).toBe("https://assets.test/project/video.mp4");
    expect(getMedia).toHaveBeenCalledWith("video");
  });
  it("lets the reader handle missing or unavailable media", async () => {
    expect(await resolveStudioCinematicSource(undefined)).toBe("");
    getMedia.mockRejectedValue(new Error("offline"));
    await expect(resolveStudioCinematicSource("video")).rejects.toThrow("offline");
  });
});
