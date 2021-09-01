<template>
   <rpg-window width="300px" position="bottom-middle">
         <p>Create account to play</p>
         <form @submit.prevent="createAccount">
             <input type="text" placeholder="Pseudo" v-model="user.nickname">
             <input type="email" placeholder="Email" v-model="user.email">
             <input type="password" placeholder="Password" v-model="user.password">
             <input type="password" placeholder="Confirm Password" v-model="confirmPassword">
             <button class="btn-success login">Create</button>
             <button class="css-button-3d--grey" type="button" @click="$emit('back')">Back</button>
        </form>
  </rpg-window>
</template>

<script>
import axios from 'axios'

export default {
    name: 'rpg-login',
    data() {
        return {
           user: {},
           confirmPassword: ''
        }
    },
    methods: {
        async createAccount() {
            await axios.post('/user/create', this.user)
            this.$emit('back')
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