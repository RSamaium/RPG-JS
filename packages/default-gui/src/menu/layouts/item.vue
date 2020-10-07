<template>
   <div class="item-menu">
        <rpg-window :fullWidth="true" height="80%" :arrow="arrow">
            <div class="row">
               <rpg-choice :choices="mapItems" :column="1" @change="selected" @selected="choiceItem" ref="choice" @canScroll="arrow = $event">
                   <template v-slot:default="{ choice }">
                       <p class="space-between" :class="{'not-consumable': !choice.consumable}">
                           <span><Icon name="potion" /> {{ choice.text }}</span> 
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

<script>
import Icon from '../../components/icon.vue'

export default {
    data() {
        return {
            description: '',
            items: [],
            arrow: null
        }
    },
    computed: {
        mapItems() {
            return this.items.map(it => ({
                text: it.item.name,
                nb: it.nb,
                consumable: it.item.consumable
            }))
        }
    },
    mounted() {
        this.items = this.$rpgPlayer().items
        this.$rpgCurrentPlayerChanged = (player) => {
            this.items = player.items
        }
        this.$rpgKeypress = ((name) => {
            if (name == 'escape') {
                this.$emit('changeLayout', 'MainLayout')
            }
            else {
                this.$refs.choice.$rpgKeypress(name)
            }
            return false
        })
        this.selected(0)
    },
    methods: {
        selected(index) {
            this.description = this.items[index].item.description
        },
        choiceItem(index) {
            const { id, consumable } = this.items[index].item
            if (!consumable) return
            this.$rpgSocket.emit('gui.interaction', {
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

.space-between {
    justify-content: space-between;
    display: flex;
}
</style>