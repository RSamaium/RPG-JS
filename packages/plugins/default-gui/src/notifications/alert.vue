<template>
    <div class="alert-panel" :class="position">
        <div class="alert" :class="{ show, [position]: true, [type]: true }">
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
        },
        position: {
            default: 'bottom'
        },
        type: {
            default: ''
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
            const sound = this.sound || globalSound || (this.type == 'error' ? 'error' : 'alert')
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
    color: $notification-font-color;
    font-family: $notification-font-family;
    padding: 15px 35px;
    border-radius: 5px;
    background-color: $notification-background-color;
    transition: 0.5s all ease;
    max-width: 400px;

    &.bottom {
        transform: translateY(50px);
        margin-top: auto;
        &.show {
            transform: translateY(-10px);
        }
    }

    &.top {
        transform: translateY(-50px);
        &.show {
            transform: translateY(10px);
        }
    }

    &.error {
        background-color: rgba(181, 64, 64, 0.7);
    }

    &.success {
        background-color: rgba(40, 121, 30, 0.7);
    }
}

.alert-panel {
    display: flex;
    align-items: center;
    justify-items: flex-end;
    flex-direction: column;
    position: absolute;
    width: 100%;
    overflow: hidden;
    z-index: 200;

    &.bottom {
        height: 100%;
    }

    &.top {
        padding-bottom: 10px;
    }
}

.icon img {
    width: 55px;
    margin-right: 10px;
    fill: red !important;
}
</style>