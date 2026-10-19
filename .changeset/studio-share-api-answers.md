---
"@rpgjs/studio": patch
---

Share the answers of the API between the client and the server of a standalone page: a request is shared while it is on its way and, once the client has asked for it with `keepStudioApiAnswers()`, for ten seconds after its answer. The page no longer downloads the project, the database or a media twice. A server process keeps nothing after an answer.
