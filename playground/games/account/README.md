# MMORPG account playground

This game exercises `@rpgjs/account` with an actual deferred WebSocket
connection and two in-memory HTTP endpoints supplied by the local Vite server.

```sh
pnpm --dir playground dev:account
```

Sign in with either `hero` or `hero@example.com`, using `swordfish`, or create a
new account first. The mock rejects duplicate usernames and duplicate e-mails
independently and checks the password confirmation.
Accounts exist only for the lifetime of the dev/preview server. Tokens are fake
and must never be used as an authentication design for production.

Use “Forgot password?” with `hero@example.com`. The Vite terminal prints a
mock email containing a recovery code (valid for 15 minutes, single use).
Choose “I have a recovery code”, paste it and set a new password. You can then
sign in with that password. Unknown addresses receive the same success response.
The mock endpoints are `/api/mock-account/forgot-password` and
`/api/mock-account/reset-password`.
