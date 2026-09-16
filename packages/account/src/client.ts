import {
  RpgClientEngine,
  RpgGui,
  inject,
  type RpgClient,
} from "@rpgjs/client";
import { defineModule } from "@rpgjs/common";
import { normalizeAccountClientOptions } from "./client-config";
import {
  accountClientOptions,
  accountError,
  accountPending,
  accountSession,
  configureAccountClient,
} from "./client-state";
import type {
  AccountAuthResult,
  AccountClientOptions,
  AccountCredentials,
  AccountRegistrationCredentials,
  AccountErrorPayload,
  ResolvedAccountClientOptions,
} from "./client-types";
import { validateAccountSubmission } from "./client-validation";
// @ts-ignore CanvasEngine components are compiled by @canvasengine/compiler.
import AccountComponent from "./components/account.ce";

export const ACCOUNT_CLIENT_I18N = {
  en: {
    "rpg.account.forgot-password": "Forgot password?",
    "rpg.account.reset-password": "Choose a new password",
    "rpg.account.send-reset": "Send reset instructions",
    "rpg.account.reset-submit": "Update password",
    "rpg.account.back": "Back to sign in",
    "rpg.account.have-token": "I have a recovery code",
    "rpg.account.token": "Recovery code",
    "rpg.account.welcome": "Your next adventure awaits.",
    "rpg.account.recovery-description": "Enter your email to receive password reset instructions.",
    "rpg.account.reset-description": "Enter your recovery code and choose a new password.",
    "rpg.account.recovery-sent": "If an account exists for this email, reset instructions have been sent.",
    "rpg.account.reset-done": "Your password has been updated. You can now sign in.",
    "rpg.account.error.heading": "Please check your details",
    "rpg.account.error.email": "Enter a valid email address.",
    "rpg.account.error.reset-fields": "Enter your recovery code and new password.",
    "rpg.account.error.recovery": "Unable to reset your password. Try again or request a new code.",
    "rpg.account.title": "Account",
    "rpg.account.sign-in": "Sign in",
    "rpg.account.sign-up": "Create account",
    "rpg.account.identifier": "Email or username",
    "rpg.account.username": "Username",
    "rpg.account.email": "Email",
    "rpg.account.password": "Password",
    "rpg.account.password-confirmation": "Confirm password",
    "rpg.account.switch-sign-in": "Already have an account?",
    "rpg.account.switch-sign-up": "Create a new account",
    "rpg.account.pending": "Please wait…",
    "rpg.account.error.credentials": "Enter your identifier and password.",
    "rpg.account.error.registration-fields": "Enter a username, email, and password.",
    "rpg.account.error.password-confirmation": "The passwords do not match.",
    "rpg.account.error.username-taken": "This username is already in use.",
    "rpg.account.error.email-taken": "This email is already in use.",
    "rpg.account.error.invalid-result": "The authentication service returned an invalid session.",
    "rpg.account.error.authentication": "Authentication failed. Check your credentials and try again.",
  },
  fr: {
    "rpg.account.forgot-password": "Mot de passe oublié ?",
    "rpg.account.reset-password": "Nouveau mot de passe",
    "rpg.account.send-reset": "Envoyer les instructions",
    "rpg.account.reset-submit": "Modifier le mot de passe",
    "rpg.account.back": "Retour à la connexion",
    "rpg.account.have-token": "J’ai un code de récupération",
    "rpg.account.token": "Code de récupération",
    "rpg.account.welcome": "Votre prochaine aventure vous attend.",
    "rpg.account.recovery-description": "Saisissez votre e-mail pour recevoir les instructions de réinitialisation.",
    "rpg.account.reset-description": "Saisissez votre code de récupération et choisissez un nouveau mot de passe.",
    "rpg.account.recovery-sent": "Si un compte correspond à cet e-mail, les instructions ont été envoyées.",
    "rpg.account.reset-done": "Votre mot de passe a été modifié. Vous pouvez vous connecter.",
    "rpg.account.error.heading": "Vérifiez vos informations",
    "rpg.account.error.email": "Saisissez une adresse e-mail valide.",
    "rpg.account.error.reset-fields": "Saisissez votre code et votre nouveau mot de passe.",
    "rpg.account.error.recovery": "Réinitialisation impossible. Réessayez ou demandez un nouveau code.",
    "rpg.account.title": "Compte",
    "rpg.account.sign-in": "Se connecter",
    "rpg.account.sign-up": "Créer un compte",
    "rpg.account.identifier": "E-mail ou nom de compte",
    "rpg.account.username": "Pseudo",
    "rpg.account.email": "E-mail",
    "rpg.account.password": "Mot de passe",
    "rpg.account.password-confirmation": "Confirmer le mot de passe",
    "rpg.account.switch-sign-in": "Déjà un compte ?",
    "rpg.account.switch-sign-up": "Créer un nouveau compte",
    "rpg.account.pending": "Veuillez patienter…",
    "rpg.account.error.credentials": "Saisissez votre identifiant et votre mot de passe.",
    "rpg.account.error.registration-fields": "Saisissez un pseudo, un e-mail et un mot de passe.",
    "rpg.account.error.password-confirmation": "Les mots de passe ne correspondent pas.",
    "rpg.account.error.username-taken": "Ce pseudo est déjà utilisé.",
    "rpg.account.error.email-taken": "Cet e-mail est déjà utilisé.",
    "rpg.account.error.invalid-result": "Le service d’authentification a renvoyé une session invalide.",
    "rpg.account.error.authentication": "Échec de l’authentification. Vérifiez vos identifiants.",
  },
};

function options(): ResolvedAccountClientOptions {
  const configured = accountClientOptions();
  if (!configured) throw new Error("@rpgjs/account is not configured");
  return configured;
}

function normalizeError(error: unknown): AccountErrorPayload {
  if (error && typeof error === "object" && "key" in error) {
    const value = error as AccountErrorPayload;
    if (typeof value.key === "string") return value;
  }
  return { key: "rpg.account.error.authentication" };
}

function readStoredSession(config: ResolvedAccountClientOptions): string | null {
  try {
    const token = config.storage?.getItem(config.storageKey)?.trim();
    return token || null;
  }
  catch {
    return null;
  }
}

function persistToken(config: ResolvedAccountClientOptions, token: string): void {
  config.storage?.setItem(config.storageKey, token);
}

function clearToken(config: ResolvedAccountClientOptions): void {
  try {
    config.storage?.removeItem(config.storageKey);
  }
  catch {}
}

async function acceptSession(result: AccountAuthResult): Promise<void> {
  const token = result?.token?.trim();
  if (!token) {
    accountError.set({ key: "rpg.account.error.invalid-result" });
    return;
  }
  const config = options();
  persistToken(config, token);
  accountSession.set({ token });
  try {
    await inject(RpgClientEngine).connect();
    inject(RpgGui).hide(config.guiId);
  }
  catch (error) {
    clearToken(config);
    accountSession.set(null);
    accountError.set(normalizeError(error));
  }
}

export async function submitAccount(
  mode: "sign-in" | "sign-up",
  credentials: AccountCredentials | AccountRegistrationCredentials,
): Promise<void> {
  if (accountPending()) return;
  const validation = validateAccountSubmission(mode, credentials);
  if ("error" in validation) {
    accountError.set(validation.error);
    return;
  }
  const normalized = validation.credentials;
  accountPending.set(true);
  accountError.set(null);
  try {
    const config = options();
    const result = mode === "sign-up"
      ? await config.signUp(normalized as AccountRegistrationCredentials)
      : await config.signIn(normalized as AccountCredentials);
    await acceptSession(result);
  }
  catch (error) {
    accountError.set(normalizeError(error));
  }
  finally {
    accountPending.set(false);
  }
}

export async function restoreAccountSession(): Promise<boolean> {
  const config = options();
  const token = readStoredSession(config);
  if (!token) return false;
  accountSession.set({ token });
  accountPending.set(true);
  try {
    await inject(RpgClientEngine).connect();
    inject(RpgGui).hide(config.guiId);
    return true;
  }
  catch (error) {
    clearToken(config);
    accountSession.set(null);
    accountError.set(normalizeError(error));
    return false;
  }
  finally {
    accountPending.set(false);
  }
}

export function signOut(): void {
  const config = options();
  clearToken(config);
  accountSession.set(null);
  accountError.set(null);
  inject(RpgClientEngine).disconnect();
  inject(RpgGui).display(config.guiId);
}

export function accountQuery(): { token: string | undefined } {
  return { token: accountSession()?.token };
}

export function createAccountClient(options: AccountClientOptions): RpgClient {
  const resolved = normalizeAccountClientOptions({
    ...options,
    component: options.component || AccountComponent,
  });
  configureAccountClient(resolved);
  return defineModule<RpgClient>({
    i18n: ACCOUNT_CLIENT_I18N,
    gui: [{
      id: resolved.guiId,
      component: resolved.component,
      renderer: resolved.renderer,
      autoDisplay: false,
    }],
    engine: {
      async onStart() {
        const restored = resolved.resetToken ? false : await restoreAccountSession();
        if (!restored && resolved.autoOpen) inject(RpgGui).display(resolved.guiId);
      },
    },
  });
}

export default createAccountClient;
