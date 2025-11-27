import { resolve } from 'path'
import fs from 'fs/promises'
import _fs from 'fs'
import toml from '@iarna/toml';
import { loadEnv } from 'vite'
import { replaceEnvVars } from './utils.js'
import path from 'path';

export interface Config {
    modules?: string[]
    startMap?: string
    name?: string
    shortName?: string,
    short_name?: string // old value
    description?: string,
    themeColor?: string,
    background_color?: string // old value
    icons?: {
        src: string,
        sizes: number[],
        type: string
    }[]
    themeCss?: string
    inputs?: {
        [key: string]: {
            name: string,
            repeat?: boolean,
            bind: string | string[],
        }
    }
    start?: {
        map?: string,
        graphic?: string
        hitbox?: [number, number]
    }
    spritesheetDirectories?: string[]
    compilerOptions?: {
        alias?: {
            [key: string]: string
        },
        build?: {
            pwaEnabled?: boolean // true by default
            assetsPath?: string
            outputDir?: string // dist by default
            serverUrl?: string
        }
    },
    pwa?: {
        [key: string]: any
    },
    vite?: any
    modulesRoot?: string
    autostart?: boolean
    type?: 'mmorpg' | 'rpg'
}

export async function loadConfigFile(mode: string = 'development') {
    const { cwd, env } = process
    let config: any = {}

    const tomlFile = resolve(cwd(), 'rpg.toml')
    const jsonFile = resolve(cwd(), 'rpg.json')
    // if file exists
    if (_fs.existsSync(tomlFile)) {
        config = toml.parse(await fs.readFile(tomlFile, 'utf8'));
    }
    else if (_fs.existsSync(jsonFile)) {
        config = JSON.parse(await fs.readFile(jsonFile, 'utf8'));
    }

    const envs = loadEnv(mode, cwd())
    config = replaceEnvVars(config, envs)
    config.autostart = config.autostart ?? true
    config.modulesRoot = config.modulesRoot ?? ''

    let buildOptions = config.compilerOptions?.build || {}

    if (!config.compilerOptions) {
        config.compilerOptions = {}
    }

    if (!config.compilerOptions.build) {
        config.compilerOptions.build = {}
    }

    if (buildOptions.pwaEnabled === undefined) {
        config.compilerOptions.build.pwaEnabled = true
    }

    if (buildOptions.outputDir === undefined) {
        config.compilerOptions.build.outputDir = 'dist'
    }

    if (config.modules) {
        config.modules = config.modules.map((module) => {
            if (module.startsWith('.')) {
                return './' + path.join(config.modulesRoot as string, module)
            }
            return module
        })
    }
   
    config.startMap = config.startMap || config.start?.map

    return config as any
}