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

<style>
@font-face {
 font-family: "lato";
 src: url("../assets/fonts/Lato/Lato-Regular.ttf") format("ttf");
}

.window-content p {
    font-family: "lato";
    font-size: 25px;
    color: white;
    margin: 0;
}
</style>

<style scoped>

.window {
    display: flex;
}

.window-content {
    border: 2.5px solid white;
    border-radius: 5px;
    background: #4e5188;
    background: linear-gradient(148deg, rgba(79,82,136,0.7) 0%, rgba(42,43,73,0.7) 100%);
    padding: 20px;
    overflow: hidden;
}

.window.top {
   align-items: flex-start;
}

.window.bottom {
   align-items: flex-end;
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