import { RpgCommonGame } from '@rpgjs/common'

let cache: any = {}

export default (engine?, _options: any = {}) => {

    if (!engine && cache.engine) {
        engine = cache.engine
        _options = cache._options
    }
    
    cache = { engine, _options }
    
    const options = {
        traceLevel: 1000,
        delayInputCount: 8,
        scheduler: _options.standalone ? 'fixed' : 'render-schedule',
        syncOptions: {
            sync: _options.standalone ? 'frameSync' : 'extrapolate',
            localObjBending: 0.2,
            remoteObjBending: 0.8
        },
        verbose: false,
        ..._options 
    }
    const gameEngine = new RpgCommonGame(options)
    const clientEngine = new engine(gameEngine, options, _options.io)
    return clientEngine
}