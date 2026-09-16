import type {
  AccountCredentials,
  AccountErrorPayload,
  AccountRegistrationCredentials,
} from "./client-types";

export type ValidatedAccountSubmission =
  | { credentials: AccountCredentials | AccountRegistrationCredentials }
  | { error: AccountErrorPayload };

export function validateAccountSubmission(
  mode: "sign-in" | "sign-up",
  credentials: AccountCredentials | AccountRegistrationCredentials,
): ValidatedAccountSubmission {
  if (mode === "sign-up") {
    const registration = credentials as AccountRegistrationCredentials;
    const username = registration.username?.trim();
    const email = registration.email?.trim().toLowerCase();
    if (!username || !email || !registration.password || !registration.passwordConfirmation) {
      return { error: { key: "rpg.account.error.registration-fields" } };
    }
    if (registration.password !== registration.passwordConfirmation) {
      return { error: { key: "rpg.account.error.password-confirmation" } };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: { key: "rpg.account.error.email" } };
    }
    return { credentials: { ...registration, username, email } };
  }

  const signIn = credentials as AccountCredentials;
  const identifier = signIn.identifier?.trim();
  if (!identifier || !signIn.password) {
    return { error: { key: "rpg.account.error.credentials" } };
  }
  return { credentials: { ...signIn, identifier } };
}
