import request from 'supertest'
import * as k8s from '@kubernetes/client-node'
import * as AgonesApi from '../src/agones-api'
import { MatchMakerService, State } from '../src/service'
import load from '../src/app'
import { vi, beforeAll, test, afterEach, expect } from 'vitest'

vi.mock('@kubernetes/client-node')

let k8sMock, app
let loadFromFile = vi.fn()
let loadFromClusterAndUser = vi.fn()
let listNamespacedCustomObject = vi.fn()

const SECRET_TOKEN = process.env.SECRET_TOKEN

function getItem(serverId, address, port, state, labels = {}) {
    return {
        metadata: {
            labels: {
                [MatchMakerService.getLabel('server-id')]: serverId,
                ...labels
            },
            name: ''+Math.random()
        },
        status: {
            address: address,
            state,
            ports: [
                {
                    port
                }
            ]
        } 
    }
}

beforeAll(() => { 
    k8sMock = vi.spyOn(k8s, 'KubeConfig').mockImplementation((): any => {
        return {
            loadFromFile,
            loadFromClusterAndUser,
            makeApiClient() {
                return {
                    listNamespacedCustomObject
                }
            }
        }
    })

    app = load()
})

test('KubeConfig Options is loaded', async () => {
    expect(loadFromClusterAndUser).toHaveBeenCalled()
})

test('GET /health', async () => {
    const res = await request(app)
        .get('/health')
    expect(res.status).toBe(200)
})

test('GET /start but not have game servers', async () => {
    listNamespacedCustomObject.mockResolvedValue({
        body: {
            items: []
        }
    })
    const res = await request(app)
        .get('/start')
    expect(res.status).toBe(404)
})

test('GET /start but not have game servers with state ready', async () => {
    listNamespacedCustomObject.mockResolvedValue({
        body: {
            items: [
                getItem('server1', 'fake.dev', 7000, State.Shutdown)
            ]
        }
    })
    const res = await request(app)
        .get('/start')
    expect(res.status).toBe(404)
})

test('GET /start', async () => {
    listNamespacedCustomObject.mockResolvedValue({
        body: {
            items: [
                getItem('server1', 'fake.dev', 7000, State.Ready)
            ]
        }
    })
    const res = await request(app)
        .get('/start')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
        url: 'fake.dev',
        port: 7000,
        serverId: 'server1'
    })
})

test('GET /start, get gameserver ready only', async () => {
    listNamespacedCustomObject.mockResolvedValue({
        body: {
            items: [
                getItem('server1', 'fake.dev', 7000, State.Shutdown),
                getItem('server2', 'fake.dev', 7001, State.Ready)
            ]
        }
    })
    const res = await request(app)
        .get('/start')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
        url: 'fake.dev',
        port: 7001,
        serverId: 'server2'
    })
})

test('GET /get-gameserver, token required', async () => {
    const res = await request(app)
        .post('/get-gameserver')
    expect(res.status).toBe(401)
})

test('GET /get-gameserver, but fake token', async () => {
    const res = await request(app)
        .post('/get-gameserver')
        .set('x-access-token', 'fake')
    expect(res.status).toBe(401)
})

test('GET /get-gameserver, but not found gameservers', async () => {
    listNamespacedCustomObject.mockResolvedValue({
        body: {
            items: []
        }
    })
    const res = await request(app)
        .post('/get-gameserver')
        .set('x-access-token', SECRET_TOKEN)
    expect(res.status).toBe(404) 
})

test('GET /get-gameserver, get first server', async () => {
    listNamespacedCustomObject.mockResolvedValue({
        body: {
            items: [
                getItem('server1', 'fake.dev', 7000, State.Ready),
                getItem('server2', 'fake.dev', 7001, State.Ready)
            ]
        }
    })
    const res = await request(app)
        .post('/get-gameserver')
        .set('x-access-token', SECRET_TOKEN)
        .send({
            mapName: 'map1'
        })
    expect(res.status).toBe(200) 
    expect(res.body).toMatchObject({
        url: 'fake.dev',
        port: 7000,
        serverId: 'server1'
    })
})

test('GET /get-gameserver, get second server because map exists', async () => {
    listNamespacedCustomObject.mockResolvedValue({
        body: {
            items: [
                getItem('server1', 'fake.dev', 7000, State.Ready),
                getItem('server2', 'fake.dev', 7001, State.Ready, {
                    [MatchMakerService.getLabel('map-map1')]: '1'
                })
            ]
        }
    })
    const res = await request(app)
        .post('/get-gameserver')
        .set('x-access-token', SECRET_TOKEN)
        .send({
            mapName: 'map1'
        })
    expect(res.status).toBe(200) 
    expect(res.body).toMatchObject({
        url: 'fake.dev',
        port: 7001,
        serverId: 'server2'
    })
})

test('GET /get-gameserver, get first server because map is disabled', async () => {
    listNamespacedCustomObject.mockResolvedValue({
        body: {
            items: [
                getItem('server1', 'fake.dev', 7000, State.Ready),
                getItem('server2', 'fake.dev', 7001, State.Ready, {
                    [MatchMakerService.getLabel('map-map1')]: '0'
                })
            ]
        }
    })
    const res = await request(app)
        .post('/get-gameserver')
        .set('x-access-token', SECRET_TOKEN)
        .send({
            mapName: 'map1'
        })
    expect(res.status).toBe(200) 
    expect(res.body).toMatchObject({
        url: 'fake.dev',
        port: 7000,
        serverId: 'server1'
    })
})

test('GET /get-gameserver, get second server (mode round robin)', async () => {
    listNamespacedCustomObject.mockResolvedValue({
        body: {
            items: [
                getItem('server1', 'fake.dev', 7000, State.Ready, {
                    [MatchMakerService.getLabel('map-map1')]: '1'
                }),
                getItem('server2', 'fake.dev', 7001, State.Ready)
            ]
        }
    })
    const res = await request(app)
        .post('/get-gameserver')
        .set('x-access-token', SECRET_TOKEN)
        .send({
            mapName: 'map2'
        })
    expect(res.status).toBe(200) 
    expect(res.body).toMatchObject({
        url: 'fake.dev',
        port: 7001,
        serverId: 'server2'
    })
})

test('GET /get-gameserver, get same server', async () => {
    listNamespacedCustomObject.mockResolvedValue({
        body: {
            items: [
                getItem('server1', 'fake.dev', 7000, State.Ready, {
                    [MatchMakerService.getLabel('map-map1')]: '1'
                }),
                getItem('server2', 'fake.dev', 7001, State.Shutdown)
            ]
        }
    })
    const res = await request(app)
        .post('/get-gameserver')
        .set('x-access-token', SECRET_TOKEN)
        .send({
            mapName: 'map2'
        })
    expect(res.status).toBe(200) 
    expect(res.body).toMatchObject({
        url: 'fake.dev',
        port: 7000,
        serverId: 'server1'
    })
})

afterEach(() => {
    vi.clearAllMocks()
})