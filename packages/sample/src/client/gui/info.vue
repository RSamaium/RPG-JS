<template>
    <div class="info">
        Test
    </div>
</template>

<script>
const NAME = 'info'

export default {
    name: NAME,
    inject: ['rpgScene'],
    data() {
        return {
            name: ''
        }
    },
    mounted() {
        setTimeout(() => {
            const scene = this.rpgScene()
            scene.viewport.on('moved', () => {
                //console.log('moved')
            })
        }, 200)
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