import { ACCOUNT_GUI_ID, DEFAULT_ACCOUNT_STORAGE_KEY } from "./config";
import type {
  AccountClientOptions,
  AccountStorage,
  ResolvedAccountClientOptions,
} from "./client-types";

function browserStorage(): AccountStorage | undefined {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  }
  catch {
    return undefined;
  }
}

export function normalizeAccountClientOptions(
  options: AccountClientOptions,
): ResolvedAccountClientOptions {
  const allowSignUp = options.allowSignUp !== false;
  if (allowSignUp && typeof options.signUp !== "function") {
    throw new TypeError("@rpgjs/account: `signUp` is required unless `allowSignUp` is false");
  }
  return {
    ...options,
    signIn: options.signIn,
    signUp: options.signUp,
    allowSignUp,
    sessionEndCodes: options.sessionEndCodes ?? [4401],
    storageKey: options.storageKey || DEFAULT_ACCOUNT_STORAGE_KEY,
    storage: options.storage ?? browserStorage(),
    guiId: options.guiId || ACCOUNT_GUI_ID,
    component: options.component || (() => null),
    renderer: options.renderer || "canvas",
    autoOpen: options.autoOpen ?? true,
  };
}
