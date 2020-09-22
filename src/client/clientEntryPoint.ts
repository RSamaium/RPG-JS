import Game from '../common/Game'

export default (engine) => {
    const options = {
        traceLevel: 1000,
        delayInputCount: 8,
        scheduler: 'render-schedule',
        syncOptions: {
            sync: 'extrapolate',
            localObjBending: 0.2,
            remoteObjBending: 0.8
        },
        verbose: true
    }
    const gameEngine = new Game(options)
    const clientEngine = new engine(gameEngine, options)
    return clientEngine
}