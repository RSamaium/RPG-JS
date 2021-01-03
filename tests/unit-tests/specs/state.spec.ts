import { Query } from '@rpgjs/server'
import { testing } from '@rpgjs/testing'
import { RPGServer } from './fixtures/server'
import { Confuse } from './fixtures/state';

let  client, socket, player

beforeEach(() => {
    const fixture = testing(RPGServer)
    client = fixture.createClient()
    socket = client.connection()
    player = Query.getPlayer(client)
})

test('add state', () => {
    player.addState(Confuse)
    expect(player.states).toHaveLength(1)
    expect(player).toHaveProperty('states.0.name')
})

test('add state with not chance', () => {
    try {
        player.addState(Confuse, 0)
    }
    catch (err) {
        expect(err.id).toBe('ADD_STATE_FAILED')
    }
})

test('remove state', () => {
    player.addState(Confuse)
    expect(player.states).toHaveLength(1)
    player.removeState(Confuse)
    expect(player.states).toHaveLength(0)
})

test('remove state with not chance', () => {
    try {
        player.addState(Confuse)
        player.removeState(Confuse, 0)
    }
    catch (err) {
        expect(err.id).toBe('REMOVE_STATE_FAILED')
    }
})

test('remove state but state is not applied', () => {
    try {
        player.removeState(Confuse)
    }
    catch (err) {
        expect(err.id).toBe('STATE_NOT_APPLIED')
    }
})