---
"@rpgjs/client": patch
---

Spread the previous scene teardown over several frames during a map transfer (characters, then the map tree, then physics). In the sample, the worst blocking frame of a transfer drops from about 94 ms to 36-53 ms.
