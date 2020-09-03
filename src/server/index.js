import { ServerEngine } from 'lance-gg';
import Player from '../common/Player';
import Event from '../common/Event';
import GameMap from '../common/Map';
import Map from './Map'

let game = null;
let i =0

export default class RpgServerEngine extends ServerEngine {

    constructor(io, gameEngine, inputOptions) {
        super(io, gameEngine, inputOptions);
        this.game = gameEngine
        game = gameEngine;
        game.on('postStep', this.postStep.bind(this))
        gameEngine.on('action', this.playerAction.bind(this))
    }

    async start() {
        super.start()
    }

    async loadMap(id, name) {
        const map = new Map(this, {
            id,
            tilemap: __dirname + '/../../game/assets/maps/' + name
        })
        await map.load() 
    }

    async changeMap(mapId, player) {

        const MAPS = {
            '0': 'test.tmx',
            '1': 'second.tmx'
        }

        await this.loadMap(mapId, MAPS[mapId])

        //const event = game.addEvent()
        //this.assignObjectToRoom(event, 'map-0')

        player.map = mapId

        this.assignPlayerToRoom(player.playerId, mapId)
        this.assignObjectToRoom(player, mapId)
        this.sendToPlayer(player, 'map', GameMap.buffer.get(mapId))
    }

    playerAction(player) {
        this.changeMap('1', player)
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
        super.onPlayerConnected(socket)
        const player = game.addPlayer(socket.playerId)
        this.changeMap('0', player)
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