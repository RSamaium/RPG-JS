/**
 * Transforms source code based on specified flags and options
 *
 * @param {Object} [options={}] - Options for flag transformation
 * @param {'client' | 'server'} [options.side=client] - Specifies whether to transform for client or server-side
 * @param {'development' | 'production' | 'test'} [options.mode=development] - Specifies the environment mode to transform for
 * @param {'mmorpg' | 'rpg'} [options.type=mmorpg] - Specifies the type of game to transform for
 *
 * @returns {Object} - Object containing two methods for resolving and transforming source code
 */
export function flagTransform(options: any = {}) {
  const { side = 'client', mode = 'development', type = 'mmorpg' } = options;

  /**
   * Resolves import statements based on specified flags and options
   *
   * @param {string} source - The source code of the import statement
   * @param {string} importer - The path of the file importing the module
   * @param {Object} options - Options for resolving the import statement
   *
   * @returns {Promise<Object>} - Object containing the resolved path and ID with flag information
   */
  async function resolveId(source, importer, options) {
    const flags = [`client!`, `server!`, `rpg!`, `mmorpg!`, `production!`, `development!`];
    for (const flag of flags) {
      if (source.startsWith(flag)) {
        const path = source.replace(flag, '');
        const resolution = await this.resolve(path, importer, {
          skipSelf: true,
          ...options,
        });
        return {
          ...resolution,
          id: resolution.id + `?${flag.replace('!', '')}`,
        };
      }
    }
  }

  /**
   * Transforms source code based on specified flags and options
   *
   * @param {string} source - The source code to transform
   * @param {string} id - The ID of the source code
   *
   * @returns {Promise<Object>} - Object containing the transformed code and source map
   */
  async function transform(source, id) {
    let code = source;

    if (mode === 'test') {
      return {
        code,
        map: null
      };
    }

    if (id.endsWith(side === 'client' ? '?server' : '?client') && type !== 'rpg') {
      code = 'export default null;';
    } else if ((id.endsWith('?production') && mode !== 'production') ||
      (id.endsWith('?development') && mode !== 'development') ||
      (id.endsWith('?rpg') && type !== 'rpg') ||
      (id.endsWith('?mmorpg') && type !== 'mmorpg')) {
      code = 'export default null;';
    }
    
    return {
      code,
      map: null
    };
  }

  return {
    name: 'transform-flag',
    resolveId,
    transform,
  };
}
