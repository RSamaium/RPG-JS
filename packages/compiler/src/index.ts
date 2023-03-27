#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { devMode, DevOptions } from "./serve/index.js";
import { buildMode } from "./build/index.js";
import { test } from "./test/index.js";

yargs(hideBin(process.argv))
    .command('generate [type] [directory_name]', 'Generate', (yargs) => {
        return yargs
            .positional('type', {
                describe: 'Define the type of file to be generated (that module currently)'
            })
            .positional('directory_name', {
                describe: 'the name of the directory'
            })
    }, (argv) => {
        const { directory_name: directory, type } = argv
        if (!type) {
            console.log('Specify the type of file to generate (example: module)')
            return
        }
        if (!directory) {
            console.log('Give the name of the directory to generate (example: my-system)')
            return
        }

    })
    .command('dev', 'Run Vite in local development', (yargs) => {
        return yargs
            .option('host', {
                alias: 'h',
                describe: 'The hostname or IP address to bind the server to',
            })
            .option('port', {
                alias: 'p',
                describe: 'The port to listen on',
            })
            .option('open', {
                alias: 'o',
                describe: 'Open the browser on server start',
                type: 'boolean'
            })
            .option('debug', {
                describe: 'Enable debug mode',
                default: false,
                type: 'boolean'
            })
            .option('loglevel', {
                describe: 'The level of logging',
                default: 'info',
                choices: ['silent', 'error', 'warn', 'info', 'debug', 'trace']
            })
            .option('cors', {
                describe: 'Enable CORS support',
                default: false,
                type: 'boolean'
            })
    }, async (argv: DevOptions) => {
        await devMode(argv)
    })
    .command('build', 'Build for production', async (yargs) => {
        await buildMode()
    })
    .command('test', 'Test', async (yargs) => {
        await test()
    })
    .argv
