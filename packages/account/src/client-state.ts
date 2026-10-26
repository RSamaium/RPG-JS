import { signal } from "canvasengine";
import type {
  AccountErrorPayload,
  AccountSession,
  ResolvedAccountClientOptions,
} from "./client-types";

export const accountSession = signal<AccountSession | null>(null);
export const accountError = signal<AccountErrorPayload | null>(null);
/** i18n key of a notice the account screen shows above the form (for example after the session ended). */
export const accountNotice = signal<string>("");
export const accountPending = signal(false);
export const accountClientOptions = signal<ResolvedAccountClientOptions | null>(null);

export function configureAccountClient(options: ResolvedAccountClientOptions): void {
  accountClientOptions.set(options);
  accountError.set(null);
  accountPending.set(false);
}
