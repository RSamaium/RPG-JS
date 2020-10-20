<template>
    <div class="menu-main">
       <component :is="layout" @changeLayout="change" ref="layout"></component>
    </div>
</template>

<script>
import MainLayout from './layouts/main.vue'
import ItemsLayout from '../menu/layouts/item.vue'

export default {
    name: 'rpg-battle',
    data() {
        return {
            layout: 'MainLayout'
        }
    },
    methods: {
        change(name) {
            this.layout = name
        }
    },
    components: {
        MainLayout,
        ItemsLayout 
    }
}
</script>

<style scoped>
.menu-main {
    height: 100%;
}
</style>