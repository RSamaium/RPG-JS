<template>
    <div class="choice-container">
        <ul :style="css" ref="ul" >
            <li v-for="(choice, index) in choices" 
                :key="index" 
                :class="{ active: selected == index }" 
                @click="$emit('selected', index)" 
                @mouseover="mouseOver(index)"
                :ref="`li-${index}`">
                <slot :choice="choice">
                    <p><span>{{ choice.text }}</span></p>
                </slot>
            </li>
        </ul>
    </div>
</template>

<script>
import Arrow from './arrow.vue'

export default {
    name: 'rpg-choice',
    inject: ['rpgKeypress'],
    data() {
        return {
            selected: 0,
            scrollHeight: 0
        }
    },
    props: {
        choices: {
            type: Array,
            default: []
        },
        column: {
            type: Number,
            default: 1
        },
        align: {
            type: String,
            default: 'left'
        },
        active: {
            type: Boolean,
            default: true
        }
    },
    mounted() {
        this.obsKeyPress = this.rpgKeypress.subscribe(({ control }) => {
            if (!this.active || !control) return
            const name = control.actionName
            if (this.column > 1) {
                if (name == 'left') {
                    this.selected = Math.floor(this.selected - this.choices.length / this.column)
                    this.moveCursor()
                }
                else if (name == 'right') {
                    this.selected = Math.floor(this.choices.length / this.column + this.selected)
                    this.moveCursor()
                }
            }
            if (name == 'down') this.moveCursor(1)
            else if (name == 'up') this.moveCursor(-1)
            else if (name == 'action') this.$emit('selected', this.selected)
            return false
        })
    },
    methods: {
        moveCursor(move = 0) {

            if (this.choices.length == 0) return

            let diff = 0

            const checkInView = (container, element,partial) => {
                //Get container properties
                let cTop = container.scrollTop;
                let cBottom = cTop + container.clientHeight;

                //Get element properties
                let eTop = element.offsetTop;
                let eBottom = eTop + element.clientHeight + 20;

                //Check if in view    
                let isTotal = (eTop >= cTop && eBottom <= cBottom);
                let isPartial = partial && (
                (eTop < cTop && eBottom > cTop) ||
                (eBottom > cBottom && eTop < cBottom)
                );
                
                diff = eBottom - cBottom

                //Return outcome
                return  (isTotal  || isPartial);
            }

            if (this.selected + move >= this.choices.length) {
                this.selected = 0
            }
            else if (this.selected + move < 0) {
                this.selected = this.choices.length - 1
            }
            else {
                this.selected = this.selected + move
            }
            
            this.$emit('change', this.selected)

            const li = this.$refs[`li-${this.selected}`]
            const ul = this.$parent.$el
            
            checkInView(ul, li, false)

            if (diff > 0) {
                this.scrollHeight = `-${diff}px`
                this.$emit('canScroll', 'up')
            }
            else {
                this.scrollHeight = 0
                this.$emit('canScroll', null)
            }
            this.$nextTick(() => {
                 const lastLi = this.$refs[`li-${this.choices.length-1}`]
                 const inView = checkInView(ul, lastLi, false)
                 if (!inView) this.$emit('canScroll', 'down')
            })
           
        },
        mouseOver(index) {
            this.selected = index
            this.moveCursor()
        }
    },
    computed: {
        css() {
            return {
                'column-count': this.column > 1 ? this.column : undefined,
                'height': '100%', 
                'margin-top': this.scrollHeight,
                'text-align': this.align
            }
        }
    },
    unmounted() {
        this.obsKeyPress.unsubscribe()
    },
    components: {
        Arrow
    }
}
</script>

<style scoped>
@keyframes cursor {
  0% { opacity: 0.4 }
  100% { opacity: 0.7 }
}

ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

ul li {
    margin-bottom: 10px;
    position: relative;
}

ul li.active {
    display: block;
}

ul li > * {
    padding: 10px;
}

ul li.active:before {
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

p {
    margin: 0;
    position: relative;
    padding: 10px;
}
</style>