import querystring from 'query-string';
import Game from '../common/Game';
import { Lib } from 'lance-gg';
import RpgClientEngine from './RpgClientEngine'
const qsOptions = querystring.parse(location.search);

// default options, overwritten by query-string options
// is sent to both game engine and client engine
const defaults = {
    traceLevel: 1000,
    delayInputCount: 8,
    scheduler: 'render-schedule',
    syncOptions: {
        sync: qsOptions.sync || 'extrapolate',
        localObjBending: 0.2,
        remoteObjBending: 0.8
    },
    verbose: true
};
let options = Object.assign(defaults, qsOptions);

// create a client engine and a game engine
const gameEngine = new Game(options);
const clientEngine = new RpgClientEngine(gameEngine, options);

document.addEventListener('DOMContentLoaded', function(e) { clientEngine.start(); });
