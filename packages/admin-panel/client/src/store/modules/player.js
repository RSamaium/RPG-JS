const states = {
    players: []
}

const getters = {}

const mutations = {
    setPlayers(state, array) {
        state.players = array
    }
}

const actions = {
    get({ commit }, array) {
        commit('setPlayers', array)
    }
}

export default {
    namespaced: true,
    states,
    getters,
    mutations,
    actions
}