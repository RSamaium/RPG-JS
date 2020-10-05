<template>
    <div class="menu-main">
       <component :is="layout" @changeLayout="change"></component>
    </div>
</template>

<script>
import MainLayout from './layouts/main.vue'
import ItemsLayout from './layouts/item.vue'

export default {
    name: 'rpg-main-menu',
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