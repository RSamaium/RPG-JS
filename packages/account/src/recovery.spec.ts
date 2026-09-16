import { describe, expect, test, vi } from "vitest";
import { recoverPassword } from "./recovery";

const values = { email: " HERO@EXAMPLE.COM ", token: "code", password: "new-password", passwordConfirmation: "new-password" };
const config = () => ({
  signIn: vi.fn(), signUp: vi.fn(),
  forgotPassword: vi.fn(async () => {}), resetPassword: vi.fn(async () => {}),
});
describe("password recovery", () => {
  test("normalizes email and sends no password or token to the email endpoint", async () => {
    const options = config();
    await recoverPassword(options, "forgot-password", values);
    expect(options.forgotPassword).toHaveBeenCalledWith({ email: "hero@example.com" });
    expect(options.signIn).not.toHaveBeenCalled();
  });
  test("rejects invalid email and mismatched confirmation before calling adapters", async () => {
    const options = config();
    await expect(recoverPassword(options, "forgot-password", { ...values, email: "invalid" })).rejects.toMatchObject({ key: "rpg.account.error.email" });
    await expect(recoverPassword(options, "reset-password", { ...values, passwordConfirmation: "different" })).rejects.toMatchObject({ key: "rpg.account.error.password-confirmation" });
    expect(options.forgotPassword).not.toHaveBeenCalled();
    expect(options.resetPassword).not.toHaveBeenCalled();
  });
  test("forwards reset credentials and propagates invalid-token errors", async () => {
    const options = config();
    await recoverPassword(options, "reset-password", values);
    expect(options.resetPassword).toHaveBeenCalledWith({ token: "code", password: values.password, passwordConfirmation: values.password });
    options.resetPassword.mockRejectedValueOnce({ key: "rpg.account.error.recovery" });
    await expect(recoverPassword(options, "reset-password", values)).rejects.toMatchObject({ key: "rpg.account.error.recovery" });
  });
});
