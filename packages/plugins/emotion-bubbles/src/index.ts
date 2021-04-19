import client from 'client!./client'
import server from 'server!./server'

export enum EmotionBubble {
    Like = 'like',
    Confusion = 'confusion'
}

export default {
    client,
    server
}