---
"@rpgjs/client": minor
---

The characters that are not the current player now walk to each position received from the server instead of jumping to it. The walk lasts 1.5 times the measured time between two updates (between 16 and 150 ms), interpolates without overshooting, and jumps for the first position, a long silence or a teleport. Tune it or turn it off with `remoteSmoothing` in the client global config (`false` gets the previous behaviour back). See `docs/advanced/remote-smoothing.md`.
