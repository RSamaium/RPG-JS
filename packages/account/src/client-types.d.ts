import type { GuiComponent, GuiRenderer } from "@rpgjs/client";

export interface AccountCredentials {
  identifier: string;
  password: string;
}

export interface AccountRegistrationCredentials {
  username: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

export interface AccountAuthResult {
  token: string;
}

export interface AccountErrorPayload {
  key: string;
  params?: Record<string, unknown>;
}

export interface AccountSession {
  token: string;
}

export interface AccountStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AccountClientOptions {
  /** Displayed game title (application-owned, optionally localized). */
  title?: string;
  /** Short introduction below the game title. */
  subtitle?: string;
  /** Background image URL, rendered with cover sizing. */
  backgroundImage?: string;
  /** Registered RPGJS sound ID played while the account GUI is mounted. */
  backgroundMusic?: string;
  /** Optional registered sound IDs; omitted actions use the engine UI sounds. */
  sounds?: Partial<Record<"open" | "navigate" | "confirm" | "error", string>>;
  /** Send a reset email. Resolve identically for known and unknown addresses. */
  forgotPassword?: (credentials: { email: string }) => Promise<void>;
  /** Consume a server-issued, expiring, single-use token and change the password. */
  resetPassword?: (credentials: AccountResetCredentials) => Promise<void>;
  /** Reset token supplied by the application's email-link routing. Never persisted. */
  resetToken?: string;
  signIn: (credentials: AccountCredentials) => Promise<AccountAuthResult>;
  signUp: (credentials: AccountRegistrationCredentials) => Promise<AccountAuthResult>;
  storageKey?: string;
  storage?: AccountStorage;
  guiId?: string;
  component?: GuiComponent;
  renderer?: GuiRenderer;
  autoOpen?: boolean;
}

export interface ResolvedAccountClientOptions extends AccountClientOptions {
  signIn: AccountClientOptions["signIn"];
  signUp: AccountClientOptions["signUp"];
  storageKey: string;
  storage?: AccountStorage;
  guiId: string;
  component: GuiComponent;
  renderer: GuiRenderer;
  autoOpen: boolean;
}

/** Credentials sent to the application-owned password-reset endpoint. */
export interface AccountResetCredentials {
  /** Opaque token delivered by email and verified by the server. */
  token: string;
  /** New password. */
  password: string;
  /** Must match the new password. */
  passwordConfirmation: string;
}
