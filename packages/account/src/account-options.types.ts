import type { AccountClientOptions } from "./client-types";

const signIn = async () => ({ token: "t" });
const signUp = async () => ({ token: "t" });

// Sign-up allowed (the default): signUp is required.
export const open: AccountClientOptions = { signIn, signUp };
// Invitation-only game: no signUp.
export const invitationOnly: AccountClientOptions = { signIn, allowSignUp: false };
// @ts-expect-error signUp is required while sign-up is allowed
export const missing: AccountClientOptions = { signIn };
// @ts-expect-error allowSignUp: true still needs signUp
export const missingExplicit: AccountClientOptions = { signIn, allowSignUp: true };
