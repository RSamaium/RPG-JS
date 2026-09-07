import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CinematicPlayback } from "./CinematicPlayback";

describe("cinematic playback", () => {
  let playback: CinematicPlayback;
  const finish = vi.fn();
  const play = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    finish.mockClear();
    play.mockReset().mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "play", "get").mockReturnValue(play);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "load", "get").mockReturnValue(() => {});
  });
  afterEach(() => {
    playback?.dispose();
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  async function open(source: () => string | Promise<string> = () => "/movie.mp4", allowSkip = true) {
    playback = new CinematicPlayback({ source, allowSkip, volume: .4, translate: key => key, finish });
    document.body.append(playback.element);
    await playback.start();
    await vi.advanceTimersByTimeAsync(200);
    return playback.element.querySelector("video")!;
  }

  it("plays inline with sound preferences and finishes once after the exit transition", async () => {
    const video = await open();
    expect(video.playsInline).toBe(true);
    expect(video.crossOrigin).toBe("anonymous");
    expect(video.volume).toBe(.4);
    expect(video.controls).toBe(false);
    video.dispatchEvent(new Event("playing"));
    expect(playback.element.dataset.state).toBe("playing");
    video.dispatchEvent(new Event("ended"));
    video.dispatchEvent(new Event("ended"));
    expect(finish).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(finish).toHaveBeenCalledExactlyOnceWith({ reason: "ended" });
  });
  it('keeps the same overlay between clips and hides skipping for protected clips', async () => {
    const beforeClip = vi.fn();
    playback = new CinematicPlayback({ source: () => '', allowSkip: true, volume: 1, translate: key => key, finish, beforeClip,
      clips: [{ source: () => '/one.mp4', allowSkip: false, bgm: 'pause' }, { source: () => '/two.mp4', allowSkip: true, bgm: 'duck' }] });
    document.body.append(playback.element);
    await playback.start();
    await vi.advanceTimersByTimeAsync(200);
    const video = playback.element.querySelector('video')!;
    const skip = playback.element.querySelector<HTMLButtonElement>('.rpg-ui-cinematic-skip')!;
    expect(skip.hidden).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await vi.advanceTimersByTimeAsync(900);
    expect(video.getAttribute('src')).toBe('/one.mp4');
    video.dispatchEvent(new Event('ended'));
    await vi.advanceTimersByTimeAsync(1);
    expect(video.getAttribute('src')).toBe('/two.mp4');
    expect(playback.element.isConnected).toBe(true);
    expect(playback.element.dataset.state).not.toBe('closing');
    expect(skip.hidden).toBe(false);
    expect(finish).not.toHaveBeenCalled();
    expect(beforeClip.mock.calls).toEqual([['pause'], ['duck']]);
    video.dispatchEvent(new Event('ended'));
    await vi.advanceTimersByTimeAsync(200);
    expect(finish).toHaveBeenCalledOnce();
  });
  it('forwards movement key releases to avoid leaving gameplay controls held', async () => {
    await open();
    const released = vi.fn();
    window.addEventListener('keyup', released);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
    expect(released).toHaveBeenCalledOnce();
    window.removeEventListener('keyup', released);
  });

  it("offers a user gesture after blocked autoplay", async () => {
    play.mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"));
    await open();
    const action = playback.element.querySelector<HTMLButtonElement>(".rpg-ui-cinematic-action")!;
    expect(action.hidden).toBe(false);
    expect(action.textContent).toBe("rpg.cinematic.play");
    expect(document.activeElement).toBe(action);
    action.click();
    expect(play).toHaveBeenCalledTimes(2);
  });

  it.each(['click', 'Escape'])('skips immediately with %s without requiring a hold', async input => {
    await open();
    if (input === 'click') {
      playback.element.querySelector('button.rpg-ui-cinematic-skip')!.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true }));
    } else {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }));
    }
    expect(playback.element.dataset.state).toBe('closing');
    await vi.advanceTimersByTimeAsync(200);
    expect(finish).toHaveBeenCalledExactlyOnceWith({ reason: 'skipped' });
  });

  it('does not skip the following clip through repeated Escape keydown events', async () => {
    playback = new CinematicPlayback({ source: () => '', allowSkip: true, volume: 1, translate: key => key, finish,
      clips: [{ source: () => '/one.mp4', allowSkip: true }, { source: () => '/two.mp4', allowSkip: true }] });
    document.body.append(playback.element);
    await playback.start();
    await vi.advanceTimersByTimeAsync(200);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await vi.advanceTimersByTimeAsync(1);
    expect(playback.element.querySelector('video')!.getAttribute('src')).toBe('/two.mp4');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', repeat: true }));
    await vi.advanceTimersByTimeAsync(200);
    expect(finish).not.toHaveBeenCalled();
  });

  it('ignores late media resolution after skipping a loading clip', async () => {
    let resolve!: (src: string) => void;
    playback = new CinematicPlayback({ source: () => '', allowSkip: true, volume: 1, translate: key => key, finish,
      clips: [{ source: () => new Promise<string>(done => resolve = done), allowSkip: true }, { source: () => '/two.mp4', allowSkip: true }] });
    document.body.append(playback.element);
    const starting = playback.start();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await vi.advanceTimersByTimeAsync(1);
    resolve('/one.mp4');
    await starting;
    expect(playback.element.querySelector('video')!.getAttribute('src')).toBe('/two.mp4');
    expect(finish).not.toHaveBeenCalled();
  });

  it("does not skip a non-skippable video but allows closing errors", async () => {
    const video = await open(undefined, false);
    playback.element.querySelector<HTMLButtonElement>(".rpg-ui-cinematic-skip")!.click();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await vi.advanceTimersByTimeAsync(1100);
    expect(finish).not.toHaveBeenCalled();
    video.dispatchEvent(new Event("error"));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await vi.advanceTimersByTimeAsync(200);
    expect(finish).toHaveBeenCalledExactlyOnceWith({ reason: "error" });
  });

  it("shows a recoverable error for unresolved media and slow loading", async () => {
    await open(() => "");
    expect(playback.element.dataset.state).toBe("error");
    playback.dispose();
    const video = await open();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(playback.element.dataset.state).toBe("error");
    video.dispatchEvent(new Event("playing"));
    expect(playback.element.dataset.state).toBe("error");
    playback.element.querySelector<HTMLButtonElement>(".rpg-ui-cinematic-action")!.click();
    await vi.advanceTimersByTimeAsync(200);
    expect(finish).toHaveBeenCalledExactlyOnceWith({ reason: "error" });
  });

  it("releases media and ignores pending resolution when unmounted", async () => {
    let resolve!: (source: string) => void;
    playback = new CinematicPlayback({ source: () => new Promise(done => resolve = done), allowSkip: true, volume: 1, translate: key => key, finish });
    const starting = playback.start();
    playback.dispose();
    resolve("/late.mp4");
    await starting;
    await vi.advanceTimersByTimeAsync(25_000);
    expect(playback.element.querySelector("video")!.hasAttribute("src")).toBe(false);
    expect(play).not.toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
  });
});
