<template>
    <rpg-window :fullWidth="true" height="100%" class="shop-menu">
        <div class="row">
            <rpg-choice :choices="menu" :column="3" @selected="changeMenu" align="center" ref="menu" />
            <div>
                <p>{{ player.gold }} {{ goldName }}</p>
            </div>
        </div>
        <hr>
        <div class="shop-content" v-if="mode">
            <div :class="{'item-quantity': step == 1}">
                <rpg-choice :choices="listItems" :column="1" @change="selected" @selected="choiceItem" ref="list" v-if="step == 0">
                    <template v-slot:default="{ choice }">
                        <p class="space-between" :class="{ 'can-not-buy': choice.price > player.gold }">
                            <span><Icon name="potion" /> {{ choice.name }}</span> 
                            <span>{{ price(choice.price) }}</span> 
                        </p>
                    </template>
                </rpg-choice>
                <div v-else>
                    <p class="space-between">
                        <span><Icon name="potion" /> {{ currentItem.name }}</span> 
                        <span class="cursor"><span>x {{ quantity }}</span></span> 
                    </p>
                    <p class="space-between">
                        <span></span> 
                        <span class="total">{{ totalPrice }} {{ goldName }}</span> 
                    </p>
                </div>
            </div>
            <div class="shop-info" v-if="currentItem.name">
                <p class="space-between"><span>Possession</span><span>{{ currentItem.nb }}</span></p>
            </div>
        </div>
        <div class="bottom" v-if="mode">
            <hr>
            <p>{{ currentItem.description }}</p>
        </div>
    </rpg-window>
</template>

<script>
export default {
    name: 'rpg-shop',
    props: ['items'],
    data() {
        return {
            menu: [{
                text: 'Buy',
                value: 'buy'
            }, {
                text: 'Sell',
                value: 'sell'
            }, {
                text: 'Cancel',
                value: 'cancel'
            }],
            currentItem: {},
            mode: '',
            goldName: 'Gold',
            step: 0,
            quantity: 1,
            _playerItems: [],
            indexSelected: 0,
            doAction: false
        }
    },
    mounted() {
        this._playerItems = this.player.items || []
        this.$rpgCurrentPlayerChanged = (player) => {
            this._playerItems = player.items
            this._computedWatchers.playerItems.run()
            this._computedWatchers.buyerItems.run()
            this._computedWatchers.listItems.run()
            this.$forceUpdate()
            if (this.doAction) {
                this.step = 0
                this.quantity = 1
                this.selected(this.indexSelected)
                this.doAction= false
            }
        }

        const interactionBuy = (name) => {
            if (name == 'escape') {
                this.step = 0
            }
            else if (name == 'up') {
                const nextPrice = this.currentItem.price * (this.quantity+1)
                if (nextPrice > this.player.gold) {
                    return false
                }
                this.quantity += 1
            }
            else if (name == 'down') {
                if (this.quantity - 1 == 0) {
                    return false
                }
                this.quantity -= 1
            }
            else if (name == 'enter') {
                this.doAction = true
                this.$rpgSocket.emit('gui.interaction', {
                    guiId: 'rpg-shop',
                    name: 'buyItem',
                    data: {
                        id: this.currentItem.id,
                        nb: this.quantity
                    }
                })
            }
        }

        const interactionSell = (name) => {
            if (name == 'escape') {
                this.step = 0
            }
            else if (name == 'up') {
                if (this.quantity + 1 > this.currentItem.nb) {
                    return false
                }
                this.quantity += 1
            }
            else if (name == 'down') {
                if (this.quantity - 1 == 0) {
                    return false
                }
                this.quantity -= 1
            }
            else if (name == 'enter') {
                this.doAction = true
                this.$rpgSocket.emit('gui.interaction', {
                    guiId: 'rpg-shop',
                    name: 'sellItem',
                    data: {
                        id: this.currentItem.id,
                        nb: this.quantity
                    }
                })
            }
        }

        this.$rpgKeypress = ((name) => {
            if (!this.mode) {
                if (name == 'escape') {
                    this.$rpgGuiClose()
                }
                else {
                    this.$refs.menu.$rpgKeypress(name)
                }
            }
            else if (this.mode) {
                if (this.step == 1) {
                   if (this. mode == 'buy') interactionBuy(name)
                   if (this. mode == 'sell') interactionSell(name)
                }
                else {
                    if (name == 'escape') {
                        this.mode = ''
                        this.description = ''
                    }
                    else {
                        this.$refs.list.$rpgKeypress(name)
                    }
                }
            }
            return false
        })
    },
    computed: {
        player() {
            return this.$rpgPlayer()
        },
        buyerItems() {
            return this.items.map(item => {
                const playerItem =  this.playerItems.find(playerItem => playerItem.id == item.id) || {nb: 0}
                return {
                    ...item,
                    nb: playerItem.nb
                }
            })
        },
        listItems() {
            return this.mode == 'buy' ? this.buyerItems : this.playerItems
        },
        totalPrice() {
            let nb = this.currentItem.price * this.quantity
            if (this.mode == 'sell') {
                return Math.floor(nb / 2)
            }
            return nb
        },
        playerItems() {
            return this._playerItems.map(({ item, nb }) => ({
               ...item,
               nb
            }))
        }
    },
    methods: {
        selected(index) {
            if (!this.listItems[index]) {
                this.currentItem = {}
                this.indexSelected = 0
                if (this.listItems.length == 0) this.mode = ''
                return
            }
            this.currentItem = this.listItems[index]
            this.indexSelected = index
        },
        changeMenu(index) {
            const mode = this.menu[index].value
            if (mode == 'cancel') {
                this.$rpgGuiClose()
                return
            }
            this.mode = mode
            this.selected(0)
        },
        choiceItem(index) {
            const item = this.listItems[index].description
            if (item.price > this.player.gold) return
            this.step = 1
        },
        price(nb) {
            if (this.mode == 'sell') {
                return Math.floor(nb / 2)
            }
            else {
                return nb
            }
        }
    }
}
</script>

<style scoped>
@keyframes cursor {
  0% { opacity: 0.4 }
  100% { opacity: 0.7 }
}

.shop-menu {
    display: flex;
}

.shop-content {
    height: calc(100% - 190px);
    display: flex;
}

.shop-content > div:first-child {
    width: calc(100% - 300px);
    padding: 20px;
    padding-left: 0;
}

.shop-content > div:last-child {
    width: 300px;
    padding: 10px;
}

.shop-info {
    border-left: 1px solid white;
}

.space-between {
    justify-content: space-between;
    display: flex;
}

hr {
    margin: 20px 0px;
}

.row {
    flex-direction: row;
    display: flex;
}

.row > * {
    flex-direction: column;
    flex-flow: row wrap;
}

.row > div:last-child {
    text-align: right;
    width: 100%;
    padding: 10px;
}

.can-not-buy {
    opacity: 0.5;
}

.item-quantity {
    display: flex;
    align-items: center;
}

.item-quantity > div {
    width: 100%;
    padding: 0px 20px;
}

.total {
    border-top: 1px solid white;
    margin-top: 14px;
    padding: 10px;
    padding-right: 0;
}

.cursor {
    position: relative;
}

.cursor > * {
    z-index: 10;
    padding: 10px;
    position: relative;
}

.cursor:before {
    content: '';
    position: absolute;
    background: #7782ab;
    width: 100%;
    height: 100%;
    left: 0px;
    border: 1px solid #9db0c6;
    animation: cursor 0.6s infinite alternate ease-in-out;
    z-index: 0;
}
</style>