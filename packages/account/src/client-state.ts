import { signal } from "canvasengine";
import type {
  AccountErrorPayload,
  AccountSession,
  ResolvedAccountClientOptions,
} from "./client-types";

export const accountSession = signal<AccountSession | null>(null);
export const accountError = signal<AccountErrorPayload | null>(null);
export const accountPending = signal(false);
export const accountClientOptions = signal<ResolvedAccountClientOptions | null>(null);

export function configureAccountClient(options: ResolvedAccountClientOptions): void {
  accountClientOptions.set(options);
  accountError.set(null);
  accountPending.set(false);
}
