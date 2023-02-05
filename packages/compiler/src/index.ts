#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { devMode } from "./serve/index.js";
import { buildMode } from "./build/index.js";

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
    .command('dev', 'Run Vite in local development', async (yargs) => {
        await devMode()
    })
    .command('build', 'Build for production', async (yargs) => {
        await buildMode()
    })
    .argv