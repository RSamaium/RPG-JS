# @rpgjs/account

The default GUI supports game branding (`title`, `subtitle`,
`backgroundImage`), registered `backgroundMusic`, and optional
`sounds: { open, navigate, confirm, error }` overrides.
Register sound assets through the standard RPGJS sound configuration.

Optional `forgotPassword({ email }): Promise<void>` and
`resetPassword({ token, password, passwordConfirmation }): Promise<void>`
adapters enable password recovery. Pass `resetToken` from your application's
email-link routing to open the reset screen directly. The server owns code
issuance, expiry, single use and password policy. Recovery never returns the old
password and does not connect the game automatically.

Official optional account GUI for RPGJS MMORPG clients. It renders before the
initial WebSocket connection, delegates identity calls to your application, and
sends the returned token through RPGJS room connections.

```ts
import { accountQuery, provideAccount } from "@rpgjs/account/client";
import { provideMmorpg, startGame } from "@rpgjs/client";

startGame({
  providers: [
    provideAccount({
      client: {
        signIn: credentials => api.signIn(credentials),
        signUp: credentials => api.signUp(credentials),
      },
    }),
    provideMmorpg({
      deferConnection: true,
      query: accountQuery,
    }),
  ],
});
```

The application owns HTTP endpoints, password policy, token creation, database,
and account recovery. The module never stores passwords. Tokens use
`localStorage` by default; provide a custom `storage` or `storageKey` when needed.

`signIn` receives `{ identifier, password }`. `signUp` receives
`{ username, email, password, passwordConfirmation }`; the built-in GUI checks
the confirmation before calling the adapter. The application must enforce
username and email uniqueness authoritatively in its account service.

During session restoration, the account GUI remains hidden. A valid stored token
therefore connects directly to the title screen without briefly displaying the
sign-in form.

On the server, verify the token with `engine.auth()` and return the stable account
ID. The title screen and save-slot selection continue after the connection is
accepted.
