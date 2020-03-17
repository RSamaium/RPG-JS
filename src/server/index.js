import { ServerEngine } from 'lance-gg';
import Player from '../common/Player';
import Map from './Map'

let game = null;
let i =0

export default class RpgServerEngine extends ServerEngine {

    constructor(io, gameEngine, inputOptions) {
        super(io, gameEngine, inputOptions);
        this.game = gameEngine
        game = gameEngine;
        game.on('postStep', this.postStep.bind(this));
    }

    async start() {
        super.start();

        const map = new Map(this, {
            id: 'map-0',
            tilemap: __dirname + '/../../game/assets/test.tmx'
        })

        this.map = await map.load() 
    }

    changeMap(mapId, player) {
        this.assignPlayerToRoom(player.playerId, mapId)
        this.assignObjectToRoom(player, mapId)
        this.sendToPlayer(player, 'map', this.map)
        
    }

    sendToPlayer(currentPlayer, eventName, data) {
        for (let socketId of Object.keys(this.connectedPlayers)) {
            let player = this.connectedPlayers[socketId];
            let playerId = player.socket.playerId;
            if (currentPlayer.playerId == playerId) {
                player.socket.emit(eventName, data);
                break
            }   
        }
    }

    onPlayerConnected(socket) {
        super.onPlayerConnected(socket);
        const player = game.addPlayer(socket.playerId);
        this.changeMap('map-' + i, player)
    
    }

    onPlayerDisconnected(socketId, playerId) {
        super.onPlayerDisconnected(socketId, playerId);
        for (let o of game.world.queryObjects({ playerId }))
            game.removeObjectFromWorld(o.id)
    }

    postStep() {
        let players = game.world.queryObjects({ instanceType: Player });
        for (let player of players) {
            //console.log(player._roomName, player.id)
        }
    }
}