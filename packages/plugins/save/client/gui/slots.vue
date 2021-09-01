<template>
   <rpg-window width="100%" height="100%">
          <p class="help">{{ mode == 'save' ? 'Select slot to save your game' : 'Select slot to load your game' }}</p>
          <rpg-choice :choices="slots"  @selected="choiceItem">
                <template v-slot:default="{ choice }">
                       <div class="slot">
                           <div v-if="choice.isData" class="slot-info">
                               <div>
                                   <div class="sprite" 
                                    :style="{ 
                                        height: `${choice.sprite.height / choice.sprite.framesHeight}px`,
                                        width: `${choice.sprite.width / choice.sprite.framesWidth}px`,
                                        'background-image': `url(${choice.sprite.images[choice.slot.graphic]})`
                                        }">
                                    </div>
                                    <p>Level {{ choice.slot.level }}</p>
                               </div>
                               <p>{{ toDate(choice.text) }}</p>
                           </div>
                           <p v-else>{{ choice.text }}</p>
                       </div>
                </template>
          </rpg-choice>
  </rpg-window>
</template>

<script>
const STORAGE_KEYNAME = 'rpgjs-save'

export default {
    props: ['mode'],
    inject: ['rpgSocket', 'rpgResource', 'rpgGuiInteraction'],
    data() {
        return {
            slotsStorage: {}
        }
    },
    mounted() {
        const storage = localStorage.getItem(STORAGE_KEYNAME)
        this.slotsStorage = JSON.parse(storage)  || {}
        if (this.mode == 'save') {
             const socket = this.rpgSocket()
             socket.on('saved', ({ slot, data, date }) => {
                this.slotsStorage[slot] = {
                    ...JSON.parse(data),
                    date
                }
                localStorage.setItem(STORAGE_KEYNAME, JSON.stringify(this.slotsStorage))
                this.$emit('saved')
            })
        }
        
    },
    methods: {
        choiceItem(index) {
            if (this.mode == 'save') {
                const socket = this.rpgSocket()
                socket.emit('save', index)
            }
            else  {
                this.rpgGuiInteraction('rpg-title-screen', 'load-game', {
                    index
                })
            }
            this.$emit('slotSelected', index)
        },
        toDate(timestamp) {
            const date = new Date(timestamp)
            const year = date.getFullYear()
            const month = date.getMonth() + 1
            const day = date.getDate()
            const hour = date.getHours()
            const minute = date.getMinutes()
            return `${year}/${month}/${day} ${hour}:${minute}`
        }
    },
    computed: {
        slots() {
            const array = []
            for (let i=0 ; i < 4; i++) {
                const slot = this.slotsStorage[i]
                if (slot) {
                    const sprite = this.rpgResource.spritesheets.get(slot.graphic)
                    array.push({ text: slot.date, value: i, isData: true, sprite, slot })
                }
                else {
                    array.push({ text: 'File ' + (i+1), value: i })
                }
            }
            return array
        }
    }
}
</script>

<style scoped>
.slot {
    height: 80px;
    display: flex;
    padding: 20px;
    align-items: center;
}

.sprite {
    display: inline-block;
}

.help {
    border-bottom: 1px solid white;
    padding-bottom: 15px;
    margin-bottom: 15px;
}

.slot-info {
    display: flex;
    justify-content: space-between;
    width: 100%;
}

.slot-info > div {
    display: flex;
}

.slot-info > div p {
    margin-left: 15px;
}
</style>