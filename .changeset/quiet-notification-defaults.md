---
"@rpgjs/studio": patch
---

Studio blocks that were never opened in the editor now behave with their schema defaults. The "Show Notification" block defaults to the `info` type and a 2000 ms duration (the engine defaults), empty optional fields (`null` or an empty value) are ignored when running it, and the "Wait" block waits 1 second when it has no duration. `applyBlockSchemaDefaults()` is exported to fill a block's missing fields with the defaults of its schema.
