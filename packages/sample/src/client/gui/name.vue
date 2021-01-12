<template>
    <div class="name">
        <rpg-window position="middle" height="100%">
          <div class="padding">
                <div class="header">
                    <h1>Put a nickname </h1>
                    <p class="error" v-if="error">{{ error }}</p>
                </div>
                <input type="text" v-model="name" maxlength="10">
                <br>
                <button @click="changeName">Play</button>
          </div>
        </rpg-window>
    </div>
</template>

<script>
const NAME = 'gui-name'
const LIMIT_CHAR = 10

export default {
    name: NAME,
    inject: ['rpgGuiInteraction'],
    data() {
        return {
            name: '',
            error: false
        }
    },
    methods: {
        changeName() {
            if (this.name.length == 0) {
                this.error = 'The field is required'
                return 
            }
            if (this.name.length > LIMIT_CHAR) {
                this.error = `The number of characters is limited to ${LIMIT_CHAR}`
                return 
            }
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
}

button {

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