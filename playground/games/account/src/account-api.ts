import type {
  AccountAuthResult,
  AccountCredentials,
  AccountRegistrationCredentials,
  AccountResetCredentials,
} from "@rpgjs/account/client";

async function authenticate(
  endpoint: string,
  credentials: AccountCredentials | AccountRegistrationCredentials | AccountResetCredentials | { email: string },
): Promise<AccountAuthResult> {
  const response = await fetch(`/api/mock-account/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    const keys: Record<string, string> = {
      username_taken: "rpg.account.error.username-taken",
      email_taken: "rpg.account.error.email-taken",
      password_confirmation: "rpg.account.error.password-confirmation",
      invalid_reset: "rpg.account.error.recovery",
      invalid_email: "rpg.account.error.email",
    };
    throw { key: keys[payload.error || ""] || "rpg.account.error.authentication" };
  }

  return response.json();
}

export const signIn = (credentials: AccountCredentials) =>
  authenticate("sign-in", credentials);

export const signUp = (credentials: AccountRegistrationCredentials) =>
  authenticate("sign-up", credentials);

export const forgotPassword = async (credentials: { email: string }): Promise<void> => {
  await authenticate("forgot-password", credentials);
};
export const resetPassword = async (credentials: AccountResetCredentials): Promise<void> => {
  await authenticate("reset-password", credentials);
};
