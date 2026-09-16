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
  return {
    ...options,
    signIn: options.signIn,
    signUp: options.signUp,
    storageKey: options.storageKey || DEFAULT_ACCOUNT_STORAGE_KEY,
    storage: options.storage ?? browserStorage(),
    guiId: options.guiId || ACCOUNT_GUI_ID,
    component: options.component || (() => null),
    renderer: options.renderer || "canvas",
    autoOpen: options.autoOpen ?? true,
  };
}
