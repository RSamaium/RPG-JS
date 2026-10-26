---
title: "Smooth Movement of Other Players"
description: "How the client shows the characters of the other players walking instead of jumping between server positions, and how to tune it."
---

# Smooth Movement of Other Players

In a multiplayer map the server sends the position of every character a few times per second (every 50 ms with the default `throttleSync`). The player you control does not suffer from it, because the client predicts its movement. The other characters would jump from one position to the next.

The client therefore shows each character that is **not** the current player walking, in a straight line, to every position it receives, instead of jumping to it.

## How it works

- The walk lasts `factor` times the measured time between two updates of that character (about 50 ms with the default sync rate, so about 75 ms), kept between `minDuration` and `maxDuration`. It follows the real rhythm of your server: the longest recent gap is held and decays slowly, so updates that arrive in bursts (two within a few milliseconds, then a pause) do not leave the character standing between two bursts.
- It **interpolates**: the character is about one update behind the server, and never goes past the last position received. A character that stops or turns does not overshoot or rubber-band.
- It **jumps** for the first position received, after a silence longer than `maxGap`, and for a move longer than `teleportDistance` (a teleport or a map change).
- The current player is not affected, and a server knockback keeps its own smoothing.

## Configuration

It is on by default. Tune it, or turn it off, with `remoteSmoothing` in the client global config:

```ts
import { provideClientGlobalConfig } from "@rpgjs/client";

provideClientGlobalConfig({
  remoteSmoothing: {
    enabled: true,         // false: jump to each position, as before
    factor: 1.5,           // walk duration = factor x measured update interval
    minDuration: 16,       // shortest walk, in ms
    maxDuration: 150,      // longest walk, in ms
    maxGap: 250,           // a longer silence (ms) is a jump
    teleportDistance: 128, // a longer move (px) is a jump
  },
});
```

`remoteSmoothing: false` gets the previous behaviour back. A value that is not a usable number keeps its default.

A `factor` above 1.5 adds delay for little gain; a `factor` of 1 leaves short pauses when an update is late. If your server syncs slower than every 100 ms, raise `maxDuration` to match.
