<template>
   <rpg-window width="300px" position="bottom-middle">
         <p>Create account to play</p>
         <form @submit.prevent="createAccount">
             <input type="text" placeholder="Nickname" required v-model="user.nickname" @blur="checkExist">
             <input type="email" placeholder="Email" v-model="user.email">
             <input type="password" placeholder="Password (6 characters min.)" required minlength="6" v-model="user.password">
             <input type="password" placeholder="Confirm Password" required v-model="confirmPassword">
             <button class="btn-success login">Create</button>
             <button class="css-button-3d--grey" type="button" @click="$emit('back')">Back</button>
        </form>
  </rpg-window>
</template>

<script>
import axios from 'axios'

const NICKNAME_EXISTS_MSG = 'The nickname already exists, please choose another one'

export default {
    name: 'rpg-login',
    inject: ['rpgEngine', 'rpgGui'],
    data() {
        return {
           user: {},
           confirmPassword: '',
           nicknameExists: false
        }
    },
    computed: {
        apiUrl() {
            return this.rpgEngine.globalConfig.titleScreen?.apiUrl ?? this.rpgEngine.serverUrl
        }
    },
    methods: {
        async createAccount() {
            try {
                if (this.nicknameExists) {
                    throw NICKNAME_EXISTS_MSG
                }
                if (!this.user.nickname) {
                    throw 'Please enter a nickname'
                }
                if (!this.user.password) {
                    throw 'Please enter a password'
                }
                if (!this.user.email) {
                    throw 'Please enter an email'
                }
                if (this.user.password > 6) {
                    throw 'Set a password with at least 6 characters'
                }
                if (this.user.password != this.confirmPassword) {
                    throw 'The confirmed password is different from the password'
                }
                await axios.post(this.apiUrl + '/user/create', this.user)
                this.rpgGui.display('rpg-notification', {
                    message: 'Your account has been created. Log in now to play the game',
                    time: 5000,
                    position: 'top',
                    type: 'success'
                })
                this.$emit('back')
            }
            catch (err) {
                if (typeof err == 'string') {
                    this.notificationError(err)
                }
            }
        },
        notificationError(msg) {
            this.rpgGui.display('rpg-notification', {
                message: msg,
                time: 5000,
                position: 'top',
                type: 'error'
            })
        },
        async checkExist() {
            const { data } = await axios.post(this.apiUrl + '/user/exists', {
                nickname: this.user.nickname
            }) 
            this.nicknameExists = data.exists
            if (this.nicknameExists) {
                this.notificationError(NICKNAME_EXISTS_MSG)
            }
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