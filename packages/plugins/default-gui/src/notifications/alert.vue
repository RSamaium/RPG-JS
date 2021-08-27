<template>
    <div class="alert-panel">
        <div class="alert" :class="{show}">
            <div class="icon" v-if="image"><img :src="image"></div>
            <span class="msg">{{ message }}</span>
        </div>
    </div>
</template>

<script>
const guiName = 'rpg-notification'

export default {
    props: {
        icon: {
            defaut: '',
        },
        sound: {
            defaut: '',
        },
        message: {
            default: ''
        },
        time: {
            default: 2000
        }
    },
    name: guiName,
    inject: ['rpgGui', 'rpgResource', 'rpgSound', 'rpgEngine'],
    data() {
        return {
            show: false
        }
    },
    computed: {
        image() {
            const resourceImage = this.rpgResource.spritesheets.get(this.icon)
            if (!resourceImage) {
                return this.icon
            }
            return resourceImage.image
        }
    },
    mounted() {
        setTimeout(() => {
            this.show = true
            const globalConfig = this.rpgEngine.globalConfig.notification
            const globalSound = (globalConfig && globalConfig.sound)
            const sound = this.sound || globalSound || 'alert'
            if (sound && globalSound !== null) {
                this.rpgSound.get(sound).play()
            }
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
$notification-background-color: rgba(0, 0, 0, 0.7) !default;
$notification-font-color: white !default;
$notification-font-family: 'lato' !default;

.alert {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: auto;
    color: $notification-font-color;
    font-family: $notification-font-family;
    padding: 15px 35px;
    border-radius: 5px;
    background-color: $notification-background-color;
    transform: translateY(50px);
    transition: 0.5s all ease;
    max-width: 400px;
}

.alert.show {
    transform: translateY(-10px);
}

.alert-panel {
    display: flex;
    align-items: center;
    justify-items: flex-end;
    flex-direction: column;
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;
}

.icon img {
    width: 55px;
    margin-right: 10px;
    fill: red !important;
}
</style>