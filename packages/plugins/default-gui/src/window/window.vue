<template>
    <transition name="fade">
        <div v-if="loading" class="window" :class="classPosition" :style="{ height }">
            <div class="window-content" :class="css" :style="{ width }">
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
$window-button-success-color: #1c8634 !default;
$window-button-success-shadow: #0d4c30 !default;
$window-button-color: rgba(128, 130, 162, 0.7) !default;
$window-button-shadow: rgb(128, 130, 162) !default;

.window-content p, .window-content a {
    font-family: $window-font-family;
    font-size: $window-font-size;
    color: $window-font-color;
    margin: 0;
}

.window-content input {
    border: 1px solid black;
    padding: 10px;
    display: block;
    margin: 5px;
}

.window-content {
    .css-button-3d--grey {
        min-width: 130px;
        height: 40px;
        color: #fff;
        padding: 5px 10px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        display: inline-block;
        outline: none;
        border-radius: 5px;
        border: none;
        background: $window-button-color;
    }
    .css-button-3d--grey:hover {
        box-shadow: 0 3px $window-button-shadow;
        top: 1px;
    }
    .css-button-3d--grey:active {
        box-shadow: 0 0 $window-button-shadow;
        top: 5px;
    }

    .btn-success {
        min-width: 130px;
        height: 40px;
        color: #fff;
        padding: 5px 10px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        display: inline-block;
        outline: none;
        border-radius: 5px;
        border: none;
        background: $window-button-success-color;
    }
    .btn-success:hover {
        box-shadow: 0 3px $window-button-success-shadow;
        top: 1px;
    }
    .btn-success:active {
        box-shadow: 0 0 $window-button-success-shadow;
        top: 5px;
    }
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