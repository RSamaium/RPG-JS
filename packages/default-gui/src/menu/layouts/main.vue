<template>
 <div class="menu-row">
    <div class="menu-left">
        <rpg-window :fullWidth="true" class="menu-choice">
            <rpg-choice :choices="menu" @selected="selectMenu" ref="menu" />
        </rpg-window>
         <rpg-window :fullWidth="true" class="gold">
            <p>{{ gold }} {{ goldName}}</p>
        </rpg-window>
    </div>
    <div class="menu-right">
         <rpg-window :fullWidth="true" height="100%">
            <Hero :face="require('../assets/face.png')" />
        </rpg-window>
    </div>
 </div>
</template>

<script>
import Hero from '../../components/hero.vue'

export default {
    props: {
        goldName: {
            type: String,
            default: 'Gold'
        }
    },
    
    data() {
        return {
            menu: [{
                text: 'Items',
                value: 'item',
                layout: 'ItemsLayout'
            }, {
                text: 'Skills',
                value: 'skill'
            }, {
                text: 'Equip',
                value: 'equipment'
            }, 
            {
                text: 'Status',
                value: 'status',
                layout: 'StatusLayout'
            }]
        }
    },
    computed: {
        gold() {
            return this.$rpgPlayer().gold || 0
        }
    },
    mounted() {
        const blur = new PIXI.filters.BlurFilter()
        this.$rpgStage.filters = [blur]
        this.$rpgKeypress = ((name) => {
            if (name == 'escape') {
                this.$emit('closeMenu')
            }
            else {
                this.$refs.menu.$rpgKeypress(name)
            }
            return false
        })
    },
    methods: {
        selectMenu(index) {
            this.$emit('changeLayout', this.menu[index].layout) 
        }
    },
    components: {
        Hero
    }
}
</script>

<style scoped>
.menu-row {
    flex-direction: row;
    display: flex;
    height: 100%;
}

.menu-left {
    width: 320px;
    display: flex;
    flex-direction: column;
    flex-flow: row wrap;
}

.menu-choice {
    align-items: flex-start;
    width: 100%;
}

.menu-left .gold {
    align-items: flex-end;
    width: 100%;
}

.menu-right {
    width: 100%;
    margin-left: 1px;
}
</style>