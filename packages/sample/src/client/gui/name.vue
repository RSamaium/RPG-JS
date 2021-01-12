<template>
    <div class="name">
        <rpg-window position="middle" height="100%">
          <div class="padding">
                <form @submit.prevent="changeName">
                    <div class="header">
                        <h1>Put a nickname </h1>
                    </div>
                    <input type="text" v-model="name" maxlength="10">
                    <br>
                    <button v-if="name">Play</button>
                </form>
          </div>
        </rpg-window>
    </div>
</template>

<script>
const NAME = 'gui-name'

export default {
    name: NAME,
    inject: ['rpgGuiInteraction'],
    data() {
        return {
            name: ''
        }
    },
    methods: {
        changeName() {
            this.rpgGuiInteraction(NAME, 'change-name', this.name)
        }
    }
}
</script>

<style scoped>
.name {
    height: 100%;
    width: 100%;
    position: absolute;
    color: white;
    font-family: "lato";
}

.content {
    display: flex;
}

.padding {
    padding: 50px;
    text-align: center;
    height: 250px;
}

button {
    background: rgba(255, 255, 255, 0.1);
    border: 0;
    color: white;
    margin-top: 60px;
    font-size: 23px;
    padding: 20px;
    border-radius: 21px;
    cursor: pointer;
    transition: background-color 0.3s;
}

button:hover {
    background: rgba(255, 255, 255, 0.3);
}

input {
    padding: 15px;
}

.header {
    margin-bottom: 15px;
}

.error {
    font-size: 15px;
    color: red;
}
</style>