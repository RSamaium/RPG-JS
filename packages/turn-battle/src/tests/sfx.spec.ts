import { afterEach, describe, expect, it, vi } from "vitest";
import { configureSfx, sfx, sfxPlayers, sfxSound } from "../client/sfx";

describe("sounds of the battle given as options", () => {
  const engine = () => ({ playSound: vi.fn() });

  it("plays an RPGJS sound id on the sfx channel at the volume of the cue", () => {
    const e = engine();

    sfxPlayers({ hit: "my-hit" }, e).hit!(0.7);

    expect(e.playSound).toHaveBeenCalledWith("my-hit", { volume: 0.7, channel: "sfx" });
  });

  it("is silent for a cue set to false", () => {
    const e = engine();

    sfxPlayers({ hit: false }, e).hit!(1);

    expect(e.playSound).not.toHaveBeenCalled();
  });

  it("lets a function play the cue with the engine, for the sounds that are not a plain id (the interface sounds)", () => {
    const e = engine();
    const play = vi.fn();

    sfxPlayers({ cursor: play }, e).cursor!(0.5);

    expect(play).toHaveBeenCalledWith(e, 0.5);
  });

  it("has nothing for the cues it is not given, so that the synthesized sounds stay", () => {
    expect(Object.keys(sfxPlayers({ hit: "x" }, engine()))).toEqual(["hit"]);
    expect(sfxPlayers(undefined, engine())).toEqual({});
  });

  it("does not need the engine to be able to play sounds", () => {
    expect(() => sfxPlayers({ hit: "x" }, {}).hit!(1)).not.toThrow();
  });
});

describe("sound of a cue", () => {
  afterEach(() => configureSfx({}));

  it("is the one given, else the synthesized one, and never breaks the battle", () => {
    const given = vi.fn();
    configureSfx({ sounds: { attack: given } });

    sfx("attack", 0.4);
    expect(given).toHaveBeenCalledWith(0.4);

    configureSfx({ sounds: { attack: () => { throw new Error("no audio"); } } });
    expect(() => sfx("attack")).not.toThrow();
    expect(() => sfx("hurt")).not.toThrow();
  });

  it("is silent when muted", () => {
    const given = vi.fn();
    configureSfx({ muted: true, sounds: { hit: given } });

    sfx("hit");

    expect(given).not.toHaveBeenCalled();
  });
});

describe("sound of a skill, an RPGJS sound id", () => {
  afterEach(() => configureSfx({}));

  it("plays on the sfx channel with the engine, at the volume given", () => {
    const engine = { playSound: vi.fn() };
    configureSfx({ engine });

    expect(sfxSound("cast-id", 0.5)).toBe(true);

    expect(engine.playSound).toHaveBeenCalledWith("cast-id", { volume: 0.5, channel: "sfx" });
  });

  it("says it played nothing when muted, without engine or when it fails, so that the cue of the battle plays instead", () => {
    expect(sfxSound("cast-id")).toBe(false);
    configureSfx({ engine: { playSound: () => { throw new Error("no sound"); } } });
    expect(sfxSound("cast-id")).toBe(false);
    const engine = { playSound: vi.fn() };
    configureSfx({ muted: true, engine });
    expect(sfxSound("cast-id")).toBe(false);
    expect(engine.playSound).not.toHaveBeenCalled();
  });
});
