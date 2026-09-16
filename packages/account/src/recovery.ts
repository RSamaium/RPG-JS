import type { AccountClientOptions, AccountResetCredentials } from './client-types';

/** Validate and invoke recovery adapters without opening a gameplay connection. */
export async function recoverPassword(
  options: AccountClientOptions,
  mode: 'forgot-password' | 'reset-password',
  values: AccountResetCredentials & { email: string },
): Promise<void> {
  if (mode === 'forgot-password') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      throw { key: 'rpg.account.error.email' };
    }
    if (!options.forgotPassword) throw { key: 'rpg.account.error.recovery' };
    await options.forgotPassword({ email: values.email.trim().toLowerCase() });
    return;
  }
  if (!values.token.trim() || !values.password) throw { key: 'rpg.account.error.reset-fields' };
  if (values.password !== values.passwordConfirmation) {
    throw { key: 'rpg.account.error.password-confirmation' };
  }
  if (!options.resetPassword) throw { key: 'rpg.account.error.recovery' };
  await options.resetPassword({
    token: values.token.trim(), password: values.password,
    passwordConfirmation: values.passwordConfirmation,
  });
}
