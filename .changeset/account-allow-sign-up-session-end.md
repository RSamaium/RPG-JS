---
"@rpgjs/account": minor
---

`allowSignUp: false` hides the "Create a new account" button and the sign-up form for an invitation-only game, and makes `signUp` optional (it stays required while sign-up is allowed). When the server closes the connection with a code of `sessionEndCodes` (default `[4401]`), the account screen comes back with a "session ended" notice (`rpg.account.session-ended`) instead of leaving a black screen; pass `sessionEndCodes: []` to handle the close with `onConnectionClosed`.
