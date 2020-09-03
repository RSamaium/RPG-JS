import { GameEngine, SimplePhysicsEngine } from 'lance-gg';
import Player from './Player'
import Event from './Event'
import Map from './Map'

export default class Game extends GameEngine {

    constructor(options) {
        super(options);
        this.physicsEngine = new SimplePhysicsEngine({ 
            gameEngine: this,
            collisions: { type: 'bruteForce', autoResolve: true }
        });

        this.playerSpeedMove = 3.0

        // common code
        this.on('preStep', this.moveAll.bind(this));
        this.on('postStep', this.gameLogic.bind(this));

        // server-only code
        this.on('server__init', this.serverSideInit.bind(this));
        this.on('server__playerJoined', this.serverSidePlayerJoined.bind(this));
        this.on('server__playerDisconnected', this.serverSidePlayerDisconnected.bind(this));

        // client-only code
        this.on('client__rendererReady', this.clientSideInit.bind(this));
        this.on('client__draw', this.clientSideDraw.bind(this));
    }

    registerClasses(serializer) {
        serializer.registerClass(Player)
        serializer.registerClass(Map)
        serializer.registerClass(Event)
    }

    gameLogic() {
    }

    moveAll() {
        
    }

    addPlayer(playerId) {
        const player = new Player(this, null, { playerId })
        player.deceleration=1
        this.addObjectToWorld(player)
        return player
    }

    addEvent() {
        const event = new Event(this, null, { playerId: 0 })
        this.addObjectToWorld(event)
        return event
    }

    processInput(inputData, playerId) {
        super.processInput(inputData, playerId)
        let player = this.world.queryObject({ playerId, instanceType: Player })
        if (!player) return
        
        const map = Map.buffer.get(player.map)
        const tileIndex = map.width * Math.floor(player.position.y / map.tileHeight) + Math.floor(player.position.x / map.tileWidth)
        const tiles = []

        for (let layer of map.layers) {
            if (layer.type != 'tile') continue
            tiles.push(layer.tiles[tileIndex])
        }

        console.log(tiles)
  
        let nextAction = null
        if (inputData.input === 'right') {
            player.position.x += this.playerSpeedMove
            player.position.x = Math.floor(player.position.x)
            player.direction = 2
            player.progress -= 3
            nextAction = Player.ACTIONS.RUN;
        }
        else if (inputData.input === 'left') {
            if (player.position.x - this.playerSpeedMove < 0) {
                player.position.x = 0
            }
            else {
                player.position.x -= this.playerSpeedMove
                player.position.x = Math.floor(player.position.x)
                player.direction = 1
                player.progress -= 3
                nextAction = Player.ACTIONS.RUN;
            }
        }
        else if (inputData.input === 'up') {
            player.position.y -= this.playerSpeedMove
            player.direction = 3
            player.progress -= 3
            nextAction = Player.ACTIONS.RUN;
        }
        else if (inputData.input === 'down') {
            player.position.y += this.playerSpeedMove
            player.direction = 0
            player.progress -= 3
            nextAction = Player.ACTIONS.RUN;
        }
        else {
            nextAction = Player.ACTIONS.IDLE;
        }

        if (inputData.input === 'space') {
            this.emit('action', player)
        }

        if (player.action !== nextAction) {
            player.progress = 99;
        }
        if (player.progress <= 0) player.progress = 99
        player.action = nextAction;
        //player.refreshToPhysics();
    }

    serverSideInit() {
    }

    serverSidePlayerJoined(ev) {
    }

    serverSidePlayerDisconnected(ev) {
    }

    clientSideInit() {
    }

    clientSideDraw() {
    }
}
