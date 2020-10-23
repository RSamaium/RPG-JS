import { Lib } from 'lance-gg'
import { RpgCommonGame } from '@rpgjs/common'

export default function(engine, io, options = {}) {
    const _options = Object.assign(engine._options, options)

    const gameEngine = new RpgCommonGame({ traceLevel: Lib.Trace.TRACE_NONE });
    const serverEngine = new engine(io, gameEngine, { 
        debug: {}, 
        updateRate: 10, 
        stepRate: 60,
        timeoutInterval: 0, 
        countConnections: false,
        ..._options
    })

    return serverEngine
}
