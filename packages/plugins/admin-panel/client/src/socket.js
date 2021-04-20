import io from 'socket.io-client'
import store from './store'
//import store from './store'

const socket = io.connect('http://localhost:3000/admin')

socket.on('players', (data) => {
   store.dispatch('players/get', data)
})

export default socket