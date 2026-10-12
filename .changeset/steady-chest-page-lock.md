---
"@rpgjs/studio": patch
---

A Studio event keeps its current page while its action/touch workflow is running. A Self Switch set in the middle of the workflow (for example opening a chest) is still saved immediately, but the event only switches to the new page once the workflow has ended, so the remaining blocks (text, gold…) no longer run while the event already shows another page.
