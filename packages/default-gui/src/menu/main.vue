<template>
    <div class="menu-main">
       <component :is="layout" @changeLayout="change" ref="layout"></component>
    </div>
</template>

<script>
import MainLayout from './layouts/main.vue'
import ItemsLayout from './layouts/item.vue'
import StatusLayout from './layouts/status.vue'

export default {
    name: 'rpg-main-menu',
    data() {
        return {
            layout: 'MainLayout'
        }
    },
     mounted() {
        this.$rpgKeypress = ((name) => {
            if (name == 'escape') {
                this.$rpgStage.filters = []
                this.$rpgGuiClose()
            }
            else {
                this.$refs.layout.$rpgKeypress(name)
            }
            return false
        })
    },
    methods: {
        change(name) {
            this.layout = name
        }
    },
    components: {
        MainLayout,
        ItemsLayout,
        StatusLayout
    }
}
</script>

<style scoped>
.menu-main {
    height: 100%;
}
</style>