import { createWebHistory, createRouter } from 'vue-router'
import Players from './pages/Players.vue'

const routes = [
    { path: '/players', component: Players, name: 'players' }
]
  
export default createRouter({
    history: createWebHistory(),
    routes
})