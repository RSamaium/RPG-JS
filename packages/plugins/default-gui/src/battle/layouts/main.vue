<template>
    <rpg-window position="bottom" :fullWidth="true" class="battle-wrapper">
        <div class="battle-menu">
            <rpg-choice :choices="actions" :column="1" @selected="choiceAction" ref="actions"></rpg-choice>
            <div>
                <div class="hero-column">
                    <ul>
                        <li>{{ player.name }}</li>
                        <li><bar :nb="player.hp" :max="player.maxHp" name="HP"  color="orange" /></li>
                        <li><bar :nb="player.sp" :max="player.maxSp" name="SP"  color="blue" /></li>
                    </ul>
                </div>
            </div>
        </div>
    </rpg-window>
</template>

<script>
import Bar from '../../components/bar.vue'

export default {
    data() {
        return {
            actions: [
                { text: 'Attack', value: 'attack' },
                { text: 'Use Skill', value: 'skill' },
                { text: 'Use Item', value: 'item' }
            ]
        }
    },
    mounted() {
         this.$rpgScene().active = false
         this.$rpgScene().selectEnemy = (index) => {
             this.$rpgSocket.emit('gui.interaction', {
                guiId: 'rpg-battle',
                name: 'attack',
                data: {
                    enemy: index
                }
            })
         }
        this.$rpgSocket.on('battle.damage', (data) => {
            this.$rpgScene().addEffect(data)
        })
        this.$rpgKeypress = ((name) => {
            return !this.$rpgScene().active
        })
    },
    methods: {
        choiceAction(index) {
            const action = this.actions[index]
            switch (action.value) {
                case 'item':
                    this.$emit('changeLayout', 'ItemsLayout')
                    break;
                case 'attack':
                    this.$rpgScene().pointerActive = true
                    setTimeout(() => {
                        this.$rpgScene().listenInputs() 
                    }, 200)
                    break;
                default:
                    break;
            }
        }
    },
    computed: {
        player() {
            return this.$rpgPlayer()
        }
    },
    components: {
        Bar
    }
}
</script>

<style scoped>
.battle-wrapper {
    height: 100%;
}

.battle-menu {
    height: 100%;
    display: flex;
}

.battle-menu > div:first-child {
    width: 200px;
}

.battle-menu > div:last-child {
    padding-left: 20px;
    width: 100%;
}

.hero-column {
    width: 33%;
}

ul {
    list-style: none;
    margin: 0;
}

ul li {
    margin: 10px;
    font-family: "lato";
    font-size: 18px;
    color: white;
}
</style>