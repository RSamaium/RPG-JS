<template>
   <rpg-window width="300px" position="bottom-middle" v-if="page == 'login'">
         <p>Connect to server with yout account</p>
         <form @submit.prevent="login">
             <input type="text" placeholder="Pseudo" v-model="user.nickname">
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
    inject: ['rpgGui', 'rpgGuiInteraction'],
    components: {
        CreateAccount
    },
    data() {
        return {
           page: 'login',
           user: {}
        }
    },
    methods: {
        async login() {
            this.rpgGuiInteraction('rpg-title-screen', 'login', this.user)
            this.rpgGui.display('rpg-notification', {
                message: 'ok',
                time: 500000,
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