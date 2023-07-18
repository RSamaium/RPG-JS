<template>
    <div class="menu-row">
        <div class="menu-left">
            <rpg-window :fullWidth="true" class="menu-choice">
                <rpg-choice :choices="menu" @selected="selectMenu" ref="menu" />
            </rpg-window>
            <rpg-window :fullWidth="true" class="gold">
                <p>{{ gold }} {{ goldName }}</p>
            </rpg-window>
        </div>
        <div class="menu-right">
            <rpg-window :fullWidth="true" height="100%">
                <Hero class="hero-face" />
            </rpg-window>
        </div>
    </div>
</template>

<script>
import Hero from '../../components/hero.vue'

const isMMORPG = import.meta.env.VITE_RPG_TYPE == 'mmorpg'

export default {
    props: {
        goldName: {
            type: String,
            default: 'Gold'
        }
    },
    inject: ['rpgCurrentPlayer', 'rpgKeypress', 'rpgEngine', 'rpgStage', 'rpgGuiClose', 'rpgGui'],
    data() {
        const menu = [{
            text: 'Items',
            value: 'item',
            layout: 'ItemsLayout'
        },
        /*  {
            text: 'Skills',
            value: 'skill'
        },  {
            text: 'Equipment',
            value: 'equipment',
            layout: 'EquipmentLayout'
        }, 
        {
            text: 'Status',
            value: 'status',
            layout: 'StatusLayout'
        } */]
        if (!isMMORPG && this.rpgGui.exists('rpg-save')) {
            menu.push({
                text: 'Save',
                value: 'save',
                layout: 'SaveLayout'
            })
        }
        return {
            player: {},
            active: true,
            gold: 0,
            menu
        }
    },
    mounted() {
        this.obsCurrentPlayer = this.rpgCurrentPlayer.subscribe(({ object }) => {
            this.gold = object.gold
        })
        this.obsKeyPress = this.rpgKeypress.subscribe(({ control }) => {
            if (!this.active || !control) return
            if (control.actionName == 'back') {
                this.rpgStage.filters = []
                if (this.rpgGui.exists('rpg-controls')) this.rpgGui.display('rpg-controls')
                this.rpgGuiClose('rpg-main-menu')
                this.rpgEngine.controls.listenInputs()
            }
        })
    },
    unmounted() {
        this.obsKeyPress.unsubscribe()
        this.obsCurrentPlayer.unsubscribe()
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

<style lang="scss">
$hero-face: none !default;

.hero-face .face-column>div {
    background-image: $hero-face;
}
</style>

<style scoped lang="scss">
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