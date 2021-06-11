import client from 'client!./client'
import server from 'server!./server'
import databaseList  from 'server!./server/database'

export const database = databaseList

export default {
    client,
    server
}