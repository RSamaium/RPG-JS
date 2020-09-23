import Game from '../common/Game'

export default (engine, _options: any = {}) => {
    const options = {
        traceLevel: 1000,
        delayInputCount: 8,
        scheduler: _options.standalone ? 'fixed' : 'render-schedule',
        syncOptions: {
            sync: _options.standalone ? 'frameSync' : 'extrapolate',
            localObjBending: 0.2,
            remoteObjBending: 0.8
        },
        verbose: true,
        ..._options
    }
    const gameEngine = new Game(options)
    const clientEngine = new engine(gameEngine, options, _options.io)
    return clientEngine
}