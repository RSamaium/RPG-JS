import { expectTypeOf } from "vitest";
import {
  accountQuery,
  provideAccount,
  type AccountAuthResult,
  type AccountCredentials,
  type AccountRegistrationCredentials,
  type AccountResetCredentials,
} from "@rpgjs/account/client";
import type { RpgProvider } from "@rpgjs/common";

const signIn = async (_credentials: AccountCredentials): Promise<AccountAuthResult> => ({ token: "token" });
const signUp = async (_credentials: AccountRegistrationCredentials): Promise<AccountAuthResult> => ({ token: "token" });
expectTypeOf(provideAccount({ client: { signIn, signUp } })).toEqualTypeOf<RpgProvider[]>();
expectTypeOf(accountQuery()).toEqualTypeOf<{ token: string | undefined }>();
provideAccount({ client: {
  signIn, signUp, title: "Example", backgroundImage: "/login.webp",
  backgroundMusic: "login-theme", sounds: { navigate: "select", error: "error" },
  forgotPassword: async ({ email }) => { expectTypeOf(email).toEqualTypeOf<string>(); },
  resetPassword: async (credentials) => { expectTypeOf(credentials).toEqualTypeOf<AccountResetCredentials>(); },
  resetToken: "email-link-code",
} });
