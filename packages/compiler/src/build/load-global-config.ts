import { parseJsonSchema } from '../utils/json-schema.js';
import colors from 'picocolors'
import defaultConfig from '../jsonSchema/index.js'
import fs from 'fs';
import path from 'path';
import type { ClientBuildConfigOptions } from './client-config';
import { warn } from '../logs/warning.js';
import { type Config } from './load-config-file.js';

export function loadGlobalConfig(modules: string[], config: Config, options: ClientBuildConfigOptions): {
    configClient: any;
    configServer: any;
} | false {
    let configClient = {}
    let configServer = {}
    let allExtraProps: string[] = []
    const displayError = options.side == 'server'

    const parseSchema = (configFile, moduleName?) => {
        try {
            const value = parseJsonSchema(configFile, config as any)
            if (value.server) {
                configServer = { ...configServer, ...value.server }
            }
            if (value.client) {
                configClient = { ...configClient, ...value.client }
            }
            if (value.extraProps) {
                allExtraProps = [...allExtraProps, ...value.extraProps]
            }
        }
        catch (err: any) {
            if (!err.property) {
                console.log(err)
                throw err
            }
            if (!displayError) {
                return false
            }
            let message = colors.red(`Invalidate "${moduleName}" module: ${err.message}`)
            let helpMessage = `[${err.namespace}]\n  ${err.property} = YOUR_VALUE`
            if (!moduleName) {
                message = colors.red(`Invalidate config: ${err.message}`)
                helpMessage = `${err.property} = YOUR_VALUE`
            }
            console.log('----------')
            console.log(message)
            if (err.params.allowedValues) {
                console.log(`\n${colors.dim('➜ Authorize values:')} ${colors.dim(err.params.allowedValues.join(', '))}`)
            }
            console.log(`${colors.dim('➜')} ${colors.dim(`you need to put the following configuration in rpg.toml:\n\n${helpMessage}`)}`)
            console.log('----------')
            throw err
        }
    }

    parseSchema(defaultConfig)

    let namespaces: string[] = []
    for (let module of modules) {
        // if module not begins by ., search in node_modules
        let modulePath = module
        if (modulePath[0] != '.') {
            modulePath = path.join('node_modules', modulePath)
        }
        const configPath = path.resolve(process.cwd(), modulePath, 'config.json')
        if (fs.existsSync(configPath)) {
            const configFile: any = fs.readFileSync(configPath).toString()
            const jsonFile = JSON.parse(configFile)
            if (jsonFile.namespace) namespaces.push(jsonFile.namespace)
            parseSchema(jsonFile, module)
        }
    }

    if (displayError) {
        const filterExtraProps = allExtraProps.filter(prop => namespaces.indexOf(prop) == -1)

        if (filterExtraProps.length > 0) {
            warn('In rpg.toml, you put the following properties, but they are not used by the modules. Check the names of the properties.')
            for (let extraProp of filterExtraProps) {
                console.log(`  - ${colors.yellow(extraProp)}`)
            }
        }
    }

    return {
        configClient,
        configServer
    }
}