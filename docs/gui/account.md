---
title: "MMORPG Account"
description: "Display a sign-in and sign-up GUI before connecting an RPGJS MMORPG client."
---

# MMORPG Account

`@rpgjs/account` is an optional MMORPG-only module. It renders a replaceable
CanvasEngine account GUI before the first WebSocket connection. Your application
continues to own its HTTP API, database, password policy, and token format.

```bash
npm install @rpgjs/account @rpgjs/ui-css
```

```ts
import { accountQuery, provideAccount } from "@rpgjs/account/client";
import { provideMmorpg, startGame } from "@rpgjs/client";

startGame({
  providers: [
    provideAccount({
      client: {
        signIn: async credentials => {
          const response = await fetch("/api/sign-in", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(credentials),
          });
          if (!response.ok) throw new Error("sign-in failed");
          return response.json(); // { token: string }
        },
        signUp: async ({ username, email, password, passwordConfirmation }) => {
          const response = await fetch("/api/sign-up", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ username, email, password, passwordConfirmation }),
          });
          if (!response.ok) throw new Error("sign-up failed");
          return response.json();
        },
        storageKey: "my-game-account-token",
      },
    }),
    provideMmorpg({
      deferConnection: true,
      query: accountQuery,
    }),
  ],
});
```

Import `@rpgjs/ui-css/index.css` for the default semantic styles. A custom
CanvasEngine or Vue GUI can replace the component through the `component` and
`renderer` options while reusing `submitAccount()`, `accountSession`,
`accountPending`, `accountError`, and `signOut()`.

Tokens are stored in `localStorage` by default. This persists the account across
browser restarts but means an XSS vulnerability could read it. Use a strict CSP,
avoid unsafe script injection, and provide another `storage` implementation when
your security model requires one. Passwords are only passed to the configured
adapter and are never stored by the module.

The default registration form asks for a distinct username and email, plus a
password confirmation. Confirmation is checked client-side before `signUp` is
called. Username and email uniqueness must still be enforced by the account
endpoint; client validation is never authoritative.

After the server accepts the token, the account GUI closes and the normal RPGJS
flow continues. A server-provided title screen can then offer Start or Load;
authentication does not select or load a save slot.

## Branding and sound

The built-in GUI accepts `title`, `subtitle`, `backgroundImage` (URL),
`backgroundMusic` (registered RPGJS sound ID), and
`sounds: { open, navigate, confirm, error }` (registered sound IDs). Missing
sound overrides use the engine's configured UI cues. Register the assets using
the normal client sound configuration. Music uses the engine music controller
and is released when the account screen closes; browser autoplay restrictions
still apply until the first player interaction.

```ts
provideAccount({
  client: {
    signIn, signUp,
    title: "Crystal Chronicles",
    subtitle: "Your next adventure awaits.",
    backgroundImage: "/images/login.webp",
    backgroundMusic: "login-theme",
    sounds: { navigate: "menu-select", confirm: "menu-confirm", error: "menu-error" },
    forgotPassword: ({ email }) => api.requestPasswordReset({ email }),
    resetPassword: credentials => api.resetPassword(credentials),
    resetToken: tokenFromEmailLink,
  },
});
```

## Password recovery

Providing `forgotPassword` enables the email request form. Providing
`resetPassword` enables the recovery-code/new-password form. Both adapters
return `Promise<void>`; recovery does not authenticate or open a WebSocket.
Pass an optional `resetToken` from your application's email-link routing to open
the reset form directly, even when a session token is stored.

The server must issue expiring, single-use codes, enforce its password policy,
and return the same request response for known and unknown email addresses.
The old password is never retrieved or displayed. Successful reset returns the
player to sign-in. Adapter errors may throw `{ key, params }` for localized
feedback. The generic fallback does not expose raw server errors.

Shared CSS primitives include `rpg-ui-form-grid`, `rpg-ui-form-field`,
`rpg-ui-form-hint`, `rpg-ui-form-feedback` (`data-tone="error|success"`),
`rpg-ui-form-actions`, and `rpg-ui-text-button`. Storybook's
`Compositions / Account` covers login, registration, recovery, reset and feedback.

When a stored token exists, the account GUI remains hidden while the session is
restored. A successful restoration therefore opens the title screen directly,
without flashing the account form first.
