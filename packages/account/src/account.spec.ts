// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { normalizeAccountClientOptions } from "./client-config";
import { validateAccountSubmission } from "./client-validation";
import {
  accountError,
  accountPending,
  accountSession,
  configureAccountClient,
} from "./client-state";

const authenticate = vi.fn(async () => ({ token: "token" }));
const register = vi.fn(async () => ({ token: "token" }));

describe("@rpgjs/account client configuration", () => {
  beforeEach(() => {
    accountSession.set(null);
    accountError.set(null);
    accountPending.set(false);
    authenticate.mockClear();
    register.mockClear();
  });

  test("uses persistent browser storage and semantic defaults", () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const options = normalizeAccountClientOptions({
      signIn: authenticate,
      signUp: register,
      storage,
    });

    expect(options.storage).toBe(storage);
    expect(options.storageKey).toBe("rpgjs-account-token");
    expect(options.guiId).toBe("rpg-account");
    expect(options.renderer).toBe("canvas");
    expect(options.autoOpen).toBe(true);
  });

  test("configuring the module resets transient state without storing credentials", () => {
    accountError.set({ key: "previous" });
    accountPending.set(true);
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const options = normalizeAccountClientOptions({
      signIn: authenticate,
      signUp: register,
      storage,
    });

    configureAccountClient(options);

    expect(accountError()).toBeNull();
    expect(accountPending()).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  test("rejects mismatched password confirmation", () => {
    const result = validateAccountSubmission("sign-up", {
      username: "hero",
      email: "hero@example.com",
      password: "one",
      passwordConfirmation: "two",
    });

    expect(result).toEqual({
      error: { key: "rpg.account.error.password-confirmation" },
    });
  });

});
