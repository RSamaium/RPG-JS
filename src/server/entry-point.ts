import { Lib } from 'lance-gg'
import Game from '../common/Game'

export default function(engine, io, options = {}) {
    const _options = Object.assign(engine._options, options)

    const gameEngine = new Game({ traceLevel: Lib.Trace.TRACE_NONE });
    const serverEngine = new engine(io, gameEngine, { 
        debug: {}, 
        updateRate: 6, 
        timeoutInterval: 0, 
        countConnections: false,
        ..._options
    })

    return serverEngine
}
