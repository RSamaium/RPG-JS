import type { Meta, StoryObj } from "@storybook/html-vite";
import { escape } from "./fixtures";

export default { title: "Compositions/Account", excludeStories: ["accountStory"], parameters: { controls: { disable: true } } } satisfies Meta;
const background = new URL("./assets/celestial-sanctuary.webp", import.meta.url).href;
type Mode = "Sign in" | "Create account" | "Forgot password?" | "Choose a new password";
const field = (label: string, type = "text") =>
  `<label class="rpg-ui-form-field"><span>${label}</span><input class="rpg-ui-input" type="${type}" aria-label="${label}"></label>`;

export function accountStory(initial: Mode = "Sign in", feedback = ""): HTMLElement {
  const root = document.createElement("div");
  let mode = initial;
  function render() {
    const registration = mode === "Create account";
    const reset = mode === "Choose a new password";
    const forgot = mode === "Forgot password?";
    const fields = registration ? field("Username") + field("Email", "email")
      : forgot ? field("Email", "email") : reset ? field("Recovery code") : field("Email or username");
    root.innerHTML = `<div class="catalog-stage"><div class="rpg-account-root" style="background-image:linear-gradient(100deg,#07121b55,#07121bde),url('${background}')"><div class="rpg-ui-account-layout">
      <header class="rpg-ui-account-brand"><span class="rpg-ui-account-emblem">✧</span><h1>Crystal Chronicles</h1><p>Your next adventure awaits.</p></header>
      <section class="rpg-ui-account rpg-ui-panel"><h2 class="rpg-ui-account-title">${mode}</h2>
      <form class="rpg-ui-account-form"><div class="rpg-ui-form-grid" data-mode="${mode === "Sign in" ? "sign-in" : forgot ? "forgot-password" : "sign-up"}">${fields}${forgot ? "" : field("Password", "password")}${registration || reset ? field("Confirm password", "password") : ""}</div>
      ${feedback ? `<div class="rpg-ui-form-feedback" data-tone="${feedback === "sent" ? "success" : "error"}" role="${feedback === "sent" ? "status" : "alert"}"><span class="rpg-ui-form-feedback-icon">${feedback === "sent" ? "✓" : "!"}</span><div>${feedback === "sent" ? "If an account exists for this email, reset instructions have been sent." : "<strong>Please check your details</strong><p>" + escape(feedback) + "</p>"}</div></div>` : ""}
      <div class="rpg-ui-form-actions"><button class="rpg-ui-btn rpg-ui-account-submit" data-variant="primary">${forgot ? "Send reset instructions" : reset ? "Update password" : mode}</button></div></form>
      <nav class="rpg-ui-account-links"><button class="rpg-ui-text-button" data-mode="${mode === "Sign in" ? "Create account" : "Sign in"}">${mode === "Sign in" ? "Create a new account" : "Back to sign in"}</button>
      ${mode === "Sign in" ? '<button class="rpg-ui-text-button" data-mode="Forgot password?">Forgot password?</button>' : ""}
      ${forgot ? '<button class="rpg-ui-text-button" data-mode="Choose a new password">I have a recovery code</button>' : ""}</nav></section></div></div></div>`;
    root.querySelector("form")!.addEventListener("submit", event => event.preventDefault());
    root.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach(button => button.addEventListener("click", () => {
      mode = button.dataset.mode as Mode; render();
    }));
  }
  render();
  return root;
}
export const SignIn: StoryObj = { render: () => accountStory() };
export const Registration: StoryObj = { render: () => accountStory("Create account") };
export const RegistrationError: StoryObj = { render: () => accountStory("Create account", "This email is already in use.") };
export const ForgotPassword: StoryObj = { render: () => accountStory("Forgot password?") };
export const InstructionsSent: StoryObj = { render: () => accountStory("Forgot password?", "sent") };
export const ResetPassword: StoryObj = { render: () => accountStory("Choose a new password") };
export const ExpiredCode: StoryObj = { render: () => accountStory("Choose a new password", "This recovery code has expired. Request a new one.") };
export const FormPrimitives: StoryObj = {
  render: () => '<section class="rpg-ui-panel rpg-ui-stack">' + field("Character name") +
    '<p class="rpg-ui-form-hint">Choose the name displayed in game.</p><div class="rpg-ui-form-feedback" data-tone="error" role="alert"><span class="rpg-ui-form-feedback-icon">!</span><div><strong>Please check your details</strong><p>This name is already in use.</p></div></div><div class="rpg-ui-form-feedback" data-tone="success" role="status">Your changes have been saved.</div><div class="rpg-ui-form-actions"><button class="rpg-ui-btn">Save</button><button class="rpg-ui-text-button">Cancel</button></div></section>',
};
