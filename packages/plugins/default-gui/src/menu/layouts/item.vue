<template>
   <div class="item-menu">
        <rpg-window :fullWidth="true" height="80%" :arrow="arrow">
            <div class="row">
               <rpg-choice :choices="mapItems" :column="1" @change="selected" @selected="choiceItem" ref="choice" @canScroll="arrow = $event">
                   <template v-slot:default="{ choice }">
                       <p class="space-between item" :class="{'not-consumable': !choice.consumable}">
                           <span>{{ choice.text }}</span> 
                           <span>{{ choice.nb }}</span> 
                        </p>
                   </template>
               </rpg-choice>
            </div>
        </rpg-window>
        <rpg-window :fullWidth="true" height="20%">
            <p>{{ description }}</p>
        </rpg-window>
   </div>
</template>

<script  lang="ts">
import Icon from '../../components/icon.vue'
import { Control } from '@rpgjs/client'

export default {
    inject: ['rpgCurrentPlayer', 'rpgKeypress', 'rpgSocket'],
    data() {
        return {
            description: '',
            items: [],
            arrow: null
        }
    },
    computed: {
        mapItems() {
            return this.items.filter(it => it).map(it => ({
                text: it.item.name,
                nb: it.nb,
                consumable: it.item.consumable
            }))
        }
    },
    mounted() {
        this.obsCurrentPlayer = this.rpgCurrentPlayer.subscribe(({ object }) => {
           this.items = Object.values(object.items || [])
        })
        this.obsKeyPress = this.rpgKeypress.subscribe(({ control }) => {
            if (!control) return
            if (control.actionName == Control.Back) {
                this.$emit('changeLayout', 'MainLayout')
            }
        })
        this.selected(0)
    },
    unmounted() {
        this.obsKeyPress.unsubscribe()
        this.obsCurrentPlayer.unsubscribe()
    },
    methods: {
        selected(index) {
            if (!this.items[index]) return
            this.description = this.items[index].item.description
        },
        choiceItem(index) {
            if (!this.items[index]) return
            const { id, consumable } = this.items[index].item
            if (!consumable) return
            this.rpgSocket().emit('gui.interaction', {
                guiId: 'rpg-main-menu',
                name: 'useItem',
                data: id
            })
        }
    },
    components: {
        Icon
    }
}
</script>

<style scoped>
.row {
   height: 100%;
}

.item-menu {
    height: 100%;
}

.not-consumable {
    opacity: 0.5;
}

.item {
    margin: 0;
    position: relative;
    padding: 10px;
}

.space-between {
    justify-content: space-between;
    display: flex;
}
</style>