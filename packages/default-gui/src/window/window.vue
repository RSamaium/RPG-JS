<template>
    <transition name="fade">
        <div v-if="loading" class="window" :class="classPosition" :style="{ height }">
            <div class="window-content" :class="css" :style="{ width }">
                <p><slot></slot></p>
            </div>
        </div>
   </transition>
</template>

<script>
export default {
    name: 'rpg-window',
    props: ['width', 'height', 'message', 'position', 'fullWidth'],
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
    }
}
</script>

<style scoped>
@font-face {
 font-family: "lato";
 src: url("../assets/fonts/Lato/Lato-Regular.ttf") format("ttf");
}

.window {
    display: flex;
}

.window-content {
    border: 4px solid white;
    border-radius: 10px;
    background-color: rgba(0, 0, 0, 0.4);
    padding: 20px;
}

.window-content p {
    font-family: "lato";
    font-size: 25px;
    color: white;
    text-shadow:
    -1px -1px 0 #000,  
        1px -1px 0 #000,
        -1px 1px 0 #000,
        1px 1px 0 #000;
    margin: 0;
}

.window.top {
   align-items: flex-start;
}

.window.bottom {
   align-items: flex-end;
}

.window.middle {
    align-items: center;
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