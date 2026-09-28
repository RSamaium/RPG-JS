import { Plugin } from 'vite';

export interface EntryPointPluginOptions {
  /**
   * Entry points configuration for different RPG types
   * @default { rpg: './src/standalone.ts', mmorpg: './src/client.ts' }
   */
  entryPoints?: {
    rpg?: string;
    mmorpg?: string;
  };
  /**
   * RPG type from environment variable
   * @default process.env.RPG_TYPE || 'rpg'
   */
  rpgType?: string;
}

/**
 * Plugin Vite qui gère les points d'entrée selon le type de RPG
 * 
 * Ce plugin modifie automatiquement le fichier HTML pour insérer la bonne balise script
 * selon la variable d'environnement RPG_TYPE. Il supporte deux types :
 * - 'rpg' : pour le mode standalone
 * - 'mmorpg' : pour le mode multijoueur
 * 
 * Le plugin recherche dans le HTML les balises script existantes et les remplace
 * par le bon point d'entrée selon le type configuré.
 * 
 * @param options - Configuration du plugin
 * @returns Plugin Vite
 * 
 * @example
 * ```typescript
 * // vite.config.ts
 * import { entryPointPlugin } from '@rpgjs/vite';
 * 
 * export default defineConfig({
 *   plugins: [
 *     entryPointPlugin({
 *       entryPoints: {
 *         rpg: './src/standalone.ts',
 *         mmorpg: './src/client.ts'
 *       }
 *     })
 *   ]
 * });
 * ```
 */
export function entryPointPlugin(options: EntryPointPluginOptions = {}): Plugin {
  const {
    entryPoints = {
      rpg: './src/standalone.ts',
      mmorpg: './src/client.ts'
    },
    rpgType = process.env.RPG_TYPE || 'rpg'
  } = options;

  return {
    name: 'rpgjs:entry-point',
    transformIndexHtml: {
      order: 'pre',
      handler(html: string) {
        // Determine the correct entry point based on RPG type
        const currentEntryPoint = entryPoints[rpgType as keyof typeof entryPoints];
        
        if (!currentEntryPoint) {
          console.warn(`[rpgjs:entry-point] Unknown RPG_TYPE: ${rpgType}. Using default 'rpg' type.`);
          const fallbackEntryPoint = entryPoints.rpg || './src/standalone.ts';
          return html.replace(
            /<script\s+type="module"\s+src="[^"]*"[^>]*><\/script>/gi,
            `<script type="module" src="${fallbackEntryPoint}"></script>`
          );
        }

        // Replace existing script tags with the correct entry point
        const transformedHtml = html.replace(
          /<script\s+type="module"\s+src="[^"]*"[^>]*><\/script>/gi,
          `<script type="module" src="${currentEntryPoint}"></script>`
        );

        // If no script tag was found, add one in the head
        if (transformedHtml === html && !html.includes('<script type="module"')) {
          return html.replace(
            /<\/head>/i,
            `  <script type="module" src="${currentEntryPoint}"></script>\n  </head>`
          );
        }

        return transformedHtml;
      }
    },
  };
} 