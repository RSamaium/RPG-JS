#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { execa } from 'execa'

interface PreState {
    mode: 'pre' | 'exit'
    tag: string
    [key: string]: unknown
}

async function main(): Promise<void> {
    const preStatePath = resolve(process.cwd(), '.changeset/pre.json')
    const original = await readFile(preStatePath, 'utf8')
    const preState = JSON.parse(original) as PreState

    if (preState.mode !== 'pre') {
        await execa('changeset', ['publish', '--tag', 'latest'], { stdio: 'inherit' })
        return
    }

    try {
        await writeFile(preStatePath, `${JSON.stringify({ ...preState, tag: 'latest' }, null, 2)}\n`)
        await execa('changeset', ['publish'], { stdio: 'inherit' })
    } finally {
        await writeFile(preStatePath, original)
    }
}

main().catch(error => {
    console.error(error)
    process.exit(1)
})
