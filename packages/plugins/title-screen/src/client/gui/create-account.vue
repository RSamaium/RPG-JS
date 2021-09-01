<template>
   <rpg-window width="300px" position="bottom-middle">
         <p>Create account to play</p>
         <form @submit.prevent="createAccount">
             <input type="text" placeholder="Pseudo">
             <input type="email" placeholder="Email">
             <input type="password" placeholder="Password">
             <input type="password" placeholder="Confirm Password">
             <button class="btn-success login">Create</button>
             <button class="css-button-3d--grey" type="button" @click="$emit('back')">Back</button>
        </form>
  </rpg-window>
</template>

<script>
export default {
    name: 'rpg-login',
    data() {
        return {
           
        }
    },
    methods: {
        createAccount() {

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