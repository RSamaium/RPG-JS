import { Plugin } from "vite";
import { resolve } from "path";
import fs from "fs-extra";
import { type Config } from "./load-config-file";

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

export default function cssPlugin(configObject: Config): Plugin {
    return {
        name: 'vite-plugin-css',
        config(config: any) {
            const { cwd } = process
            // if find file config/client/theme.scss or have config.themeCss
            let additionalData = ''
            const themeCss = resolve(cwd(), 'src/config/client/theme.scss')
            const themeCssRoot = resolve(cwd(), 'theme.scss')
            if (fs.existsSync(themeCss)) {
                additionalData += `@import "@/config/client/theme.scss";`
            }
            else if (fs.existsSync(themeCssRoot)) {
                additionalData += `@import "@/theme.scss";`
            }
            else if (configObject.themeCss) {
                // exception if not find file
                if (!fs.existsSync(resolve(cwd(), configObject.themeCss))) {
                    throw new Error(`File ${configObject.themeCss} not found`)
                }
                additionalData += `@import "@/${configObject.themeCss}";`
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