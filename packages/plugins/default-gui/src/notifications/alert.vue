<template>
    <div class="alert-panel">
        <div class="alert" :class="{show}">
            <span class="msg">{{ message }}</span>
        </div>
    </div>
</template>

<script>
const guiName = 'rpg-notification'

export default {
    props: ['message', 'time'],
    name: guiName,
    inject: ['rpgGui'],
    data() {
        return {
            show: false
        }
    },
    mounted() {
        setTimeout(() => {
            this.show = true
        }, 10)
        setTimeout(() => {
            this.show = false
             setTimeout(() => {
                this.rpgGui.hide(guiName)
            }, 500)
        }, this.time)
    }
}
</script>

<style lang="scss">
.alert {
    position: absolute;
    bottom: 10px;
    width: 200px;
    color: white;
    font-family: 'lato';
    padding: 10px 35px;
    border-radius: 5px;
    left: calc(50% - 100px);
    background-color: rgba(0, 0, 0, 0.7);
    transform: translateY(50px);
    transition: 0.5s all ease;
}

.alert.show {
    transform: translateY(0px);
}

.alert-panel {
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;
}
</style>