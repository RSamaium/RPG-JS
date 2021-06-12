<template>
    <transition name="fade">
        <div v-if="loading" class="window" :class="classPosition" :style="{ height }">
            <div class="window-content" :class="css" :style="{ width }">
                {{ arrow }}
                <div v-if="arrow == 'up'">
                    <Arrow :center="true" direction="up" />
                </div>  
                <slot></slot>
                <div v-if="arrow == 'down'">
                    <Arrow :center="true" direction="down" />
                </div>  
            </div>
        </div>
   </transition>
</template>

<script>
import Arrow from './arrow.vue'

export default {
    name: 'rpg-window',
    props: ['width', 'height', 'message', 'position', 'fullWidth', 'arrow'],
    data() {
        return {
            loading: false
        }
    },
    computed: {
        classPosition() {
            return {
                [this.position]: true
            }
        },
        css() {
            return {
                'full-width': this.fullWidth
            }
        }
    },
    mounted() {
        this.loading = true
    },
    components: {
        Arrow
    }
}
</script>

<style lang="scss">
.window-content p {
    font-family: $window-font-family;
    font-size: $window-font-size;
    color: $window-font-color;
    margin: 0;
}
</style>

<style scoped lang="scss">
.window {
    display: flex;
}

.window-content {
    border: $window-border;
    border-radius: $window-border-radius;
    background: $window-background;
    padding: 20px;
    overflow: hidden;
    @include window-content;
}

.window.top {
   align-items: flex-start;
}

.window.bottom {
   align-items: flex-end;
}

.window.bottom-middle {
   align-items: flex-end;
   justify-content: center;
   width: 100%;
}

.window.middle {
    align-items: center;
    justify-content: center;
}

.window-content.full-width {
    position: relative;
    width: 100%;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity .3s;
}
.fade-enter, .fade-leave-to  {
  opacity: 0;
}
</style>