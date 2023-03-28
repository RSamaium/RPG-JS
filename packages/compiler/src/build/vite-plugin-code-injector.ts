import { Plugin } from 'vite';

const scriptInjection = `
  <script>
    var global = global || window
  </script>
`

export function codeInjectorPlugin(): Plugin {
  return {
    name: 'html-transform',
    transformIndexHtml: {
      enforce: 'pre',
      transform(html) {
        return html.replace('<head>', `<head>${scriptInjection}`);
      }
    }
  };
}
