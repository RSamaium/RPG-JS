import { createModule, type RpgProvider } from "@rpgjs/common";
import client, {
  accountQuery,
  createAccountClient,
  restoreAccountSession,
  signOut,
  submitAccount,
} from "./client";
import type { AccountClientOptions } from "./client-types";

export { ACCOUNT_GUI_ID, DEFAULT_ACCOUNT_STORAGE_KEY } from "./config";
export { normalizeAccountClientOptions } from "./client-config";
export {
  accountClientOptions,
  accountError,
  accountPending,
  accountSession,
  configureAccountClient,
} from "./client-state";
export {
  accountQuery,
  createAccountClient,
  restoreAccountSession,
  signOut,
  submitAccount,
};
export type {
  AccountAuthResult,
  AccountResetCredentials,
  AccountClientOptions,
  AccountCredentials,
  AccountRegistrationCredentials,
  AccountErrorPayload,
  AccountSession,
  AccountStorage,
  ResolvedAccountClientOptions,
} from "./client-types";

export interface AccountClientModuleOptions {
  client: AccountClientOptions;
}

export function provideAccount(options: AccountClientModuleOptions): RpgProvider[] {
  return createModule("Account", [{ client: createAccountClient(options.client) }]);
}

export default { client };
