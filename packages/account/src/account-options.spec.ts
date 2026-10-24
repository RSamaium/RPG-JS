// @vitest-environment jsdom

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { normalizeAccountClientOptions } from "./client-config";
import { accountClientOptions, accountError, accountNotice, accountSession, configureAccountClient } from "./client-state";

const engine = vi.hoisted(() => ({ disconnect: vi.fn() }));
const gui = vi.hoisted(() => ({ display: vi.fn(), hide: vi.fn() }));

vi.mock("@rpgjs/client", () => ({
  RpgClientEngine: "engine",
  RpgGui: "gui",
  inject: (token: string) => (token === "engine" ? engine : gui),
}));
vi.mock("./components/account.ce", () => ({ default: () => null }));

import { endSession, submitAccount } from "./client";

const signIn = vi.fn(async () => ({ token: "t" }));
const signUp = vi.fn(async () => ({ token: "t" }));

const configure = (options: Record<string, unknown> = {}) =>
  configureAccountClient(normalizeAccountClientOptions({ signIn, signUp, storage: { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() }, ...options } as any));

beforeEach(() => {
  accountSession.set(null);
  accountError.set(null);
  accountNotice.set("");
  engine.disconnect.mockClear();
  gui.display.mockClear();
  signUp.mockClear();
});

describe("allowSignUp", () => {
  test("defaults to true and keeps signUp", () => {
    expect(normalizeAccountClientOptions({ signIn, signUp }).allowSignUp).toBe(true);
  });

  test("an invitation-only game needs no signUp", () => {
    const options = normalizeAccountClientOptions({ signIn, allowSignUp: false });
    expect(options.allowSignUp).toBe(false);
    expect(options.signUp).toBeUndefined();
  });

  test("a missing signUp is an error while sign-up is allowed", () => {
    expect(() => normalizeAccountClientOptions({ signIn } as any)).toThrow(/signUp/);
  });

  test("the sign-up switch is hidden and a sign-up is refused when it is false", async () => {
    configure({ signUp: undefined, allowSignUp: false });
    expect(readFileSync(resolve(__dirname, "components/account.ce"), "utf8")).toContain("config.allowSignUp !== false");
    await submitAccount("sign-up", { username: "hero", email: "hero@example.com", password: "pw", passwordConfirmation: "pw" });
    expect(accountError()).toEqual({ key: "rpg.account.error.sign-up-disabled" });
    expect(signUp).not.toHaveBeenCalled();
  });

  test("the types accept allowSignUp: false without signUp, and require signUp otherwise", () => {
    const fixture = resolve(__dirname, "account-options.types.ts");
    let out = "";
    try {
      execFileSync("pnpm", ["exec", "tsc", "--noEmit", "--strict", "--skipLibCheck", "--target", "es2022", "--moduleResolution", "bundler", "--module", "esnext", fixture], { encoding: "utf8", stdio: "pipe" });
    } catch (error: any) {
      out = String(error.stdout || error.message);
    }
    expect(out).toBe("");
  });
});

describe("a session ended by the server", () => {
  test("code 4401 signs out and shows the notice on the account screen", () => {
    configure();
    accountSession.set({ token: "t" });
    expect(endSession({ code: 4401 })).toBe(true);
    expect(accountSession()).toBeNull();
    expect(engine.disconnect).toHaveBeenCalled();
    expect(gui.display).toHaveBeenCalledWith("rpg-account");
    expect(accountNotice()).toBe("rpg.account.session-ended");
  });

  test("another code is left to the game", () => {
    configure();
    expect(endSession({ code: 1006 })).toBe(false);
    expect(gui.display).not.toHaveBeenCalled();
  });

  test("sessionEndCodes: [] disables the reaction", () => {
    configure({ sessionEndCodes: [] });
    expect(endSession({ code: 4401 })).toBe(false);
    expect(accountClientOptions()?.sessionEndCodes).toEqual([]);
  });
});
