// vite-plugin-env-injector.ts
import { Plugin } from 'vite';

const envInjectionCode = 'import.meta.env.VITE_BUILT = 1';

export function envInjectorPlugin(): Plugin {
  let injected = false;
  return {
    name: 'vite-plugin-env-injector',
    transform(code, id) {
      if (!injected && id.endsWith('.ts')) {
        code = `
${envInjectionCode}
${code}`;
        injected = true;
      }
      return {
        code,
        map: null,
      };
    },
  };
}
