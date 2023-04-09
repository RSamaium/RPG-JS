export function rpgjsPluginLoader(output: string = 'client', isBuild: boolean = false) {
  return {
    name: 'rpgjs-assets-loader',
    enforce: 'pre',
    transform:  async (code, id: string) => {
      const regex = /^(?!.*node_modules(?:\/|\\)(?!rpgjs-|@rpgjs)).*$/;
      if (regex.test(id) && id.endsWith('.ts')) {
        return {
          code: `import '${id}';\n${code}`,
          map: null
        };
      }
    }
  };
}
