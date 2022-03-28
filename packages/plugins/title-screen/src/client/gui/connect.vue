<template>
   <rpg-window width="300px" position="bottom-middle" v-if="page == 'login'">
         <p>Connect to server with your account</p>
         <form @submit.prevent="login">
             <input type="text" placeholder="Nickname" v-model="user.nickname">
             <input type="password" placeholder="Password" v-model="user.password">
             <button class="btn-success login">Login</button>
             <button class="css-button-3d--grey" type="button" @click="page = 'create'">Create account</button>
        </form>
  </rpg-window>
  <CreateAccount v-else @back="page = 'login'" />
</template>

<script>
import CreateAccount from './create-account.vue'

export default {
    name: 'rpg-login',
    inject: ['rpgGui', 'rpgGuiInteraction', 'rpgSocket'],
    components: {
        CreateAccount
    },
    data() {
        return {
           page: 'login',
           user: {}
        }
    },
    mounted() {
        const socket = this.rpgSocket()
        socket.on('login-fail', ({ message }) => {
            let msg = ''
            switch (message) {
                case 'LOGIN_FAIL':
                    msg = 'Your login details are not correct!'
                    break;
                 case 'PLAYER_IN_GAME':
                    msg = 'You are already playing in the game'
                    break;
                default:
                    msg = 'An error has occurred'
            }
            this.notificationError(msg)
        })
    },
    methods: {
        login() {
            if (!this.user.nickname) {
                return this.notificationError('Please enter a nickname')
            }
            if (!this.user.password) {
                return this.notificationError('Please enter a password')
            }
            this.rpgGuiInteraction('rpg-title-screen', 'login', this.user)
        },
        notificationError(msg) {
            this.rpgGui.display('rpg-notification', {
                message: msg,
                time: 5000,
                position: 'top',
                type: 'error'
            })
        }
    }
}
</script>

<style scoped lang="scss">
form {
    text-align: center;
}

p {
    margin-bottom: 25px;
}

button {
    margin-top: 20px;
}

input {
    width: 85%;
}

.login {
    margin-right: 10px;
}
</style>