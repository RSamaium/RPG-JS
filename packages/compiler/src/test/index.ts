import { startVitest } from 'vitest/node'

export async function test() {
    const vitest = await startVitest('test', ['tests/run-only.test.ts'], {

    })

    await vitest?.close()
}
