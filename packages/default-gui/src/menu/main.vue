<template>
 <div class="menu-row">
    <div class="menu-left">
        <rpg-window :fullWidth="true" class="menu-choice">
            <rpg-choice :choices="menu" @selected="selectMenu" ref="menu" />
        </rpg-window>
         <rpg-window :fullWidth="true" class="gold">
            {{ gold }} {{ goldName}}
        </rpg-window>
    </div>
    <div class="menu-right">
         <rpg-window :fullWidth="true" height="100%">
            <Hero :face="require('./face.png')" />
        </rpg-window>
    </div>
 </div>
</template>

<script>
import Hero from '../components/hero.vue'

export default {
    props: {
        goldName: {
            type: String,
            default: 'Gold'
        }
    },
    name: 'rpg-main-menu',
    data() {
        return {
            menu: [{
                text: 'Items',
                value: 'item'
            }, {
                text: 'Skills',
                value: 'skill'
            }, {
                text: 'Equipment',
                value: 'equipment'
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
        this.$rpgPlayerChanged = (player) => {
            console.log(player)
        }
        this.$rpgKeypress = ((name) => {
        if (name == 'escape' ) {
            this.$rpgStage.filters = []
            this.$rpgGuiClose()
        }
        else {
            //  this.$ref.menu.$rpgKeypress(name)
        }
        return false
    })
    },
    methods: {
        selectMenu(index) {

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
    width: 190px;
    display: flex;
    flex-direction: column;
    flex-flow: row wrap;
}

.menu-choice {
    align-items: flex-start;
}

.menu-left .gold {
    align-items: flex-end;
    width: 100%;
}

.menu-left {
    width: 190px;
    display: flex;
    flex-direction: column;
    flex-flow: row wrap;
}

.menu-right {
    width: 100%;
    margin-left: 5px;
}
</style>