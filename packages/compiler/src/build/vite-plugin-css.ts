import { Plugin } from "vite";
import { resolve } from "path";
import fs from "fs-extra";
import { Config } from "./client-config";

const DEFAULT_THEME = `
    $window-background: linear-gradient(148deg, rgba(79,82,136,0.7) 0%, rgba(42,43,73,0.7) 100%);
    $window-border: 2.5px solid white;
    $window-border-radius: 5px;
    $window-arrow-color: white;
    $window-font-size: 25px;
    $window-font-color: white;
    $window-font-family: 'Arial';
    $cursor-background: #7782ab;
    $cursor-border: 1px solid #9db0c6;

    @mixin window-content {}
`

export default function cssPlugin(config: Config): Plugin {
    return {
        name: 'vite-plugin-css',
        config(config: any) {
            // if find file config/client/theme.scss or have config.themeCss
            let additionalData = ''
            const themeCss = resolve(process.cwd(), 'src/config/client/theme.scss')
            const themeCssRoot = resolve(process.cwd(), 'theme.scss')
            if (fs.existsSync(themeCss)) {
                additionalData += `@import "${themeCss}";`
            }
            else if (fs.existsSync(themeCssRoot)) {
                additionalData += `@import "${themeCssRoot}";`
            }
            else if (config.themeCss) {
                // exception if not find file
                if (!fs.existsSync(resolve(process.cwd(), config.themeCss))) {
                    throw new Error(`File ${config.themeCss} not found`)
                }
                additionalData += `@import "@/${config.themeCss}";`
            }
            else {
                additionalData += DEFAULT_THEME
            }

            config.css = {
                preprocessorOptions: {
                    scss: {
                        additionalData
                    }
                }
            }

            return config
        }

    }
}