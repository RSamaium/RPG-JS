import client from 'client!./client'
import server from 'server!./server'

export default {
    client,
    server
}

export enum EmotionBubble {
    Like = 'like',
    Confusion = 'confusion'
}