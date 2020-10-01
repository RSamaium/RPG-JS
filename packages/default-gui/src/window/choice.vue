<template>
    <div>
        <ul>
            <li v-for="(choice, index) in choices" :key="index" :class="{ active: selected == index }">
                <p><Arrow direction="right" v-if="selected == index" /> <span>{{ choice.text }}</span></p>
            </li>
        </ul>
    </div>
</template>

<script>
import Arrow from './arrow.vue'

export default {
    name: 'rpg-choice',
    data() {
        return {
            selected: 0
        }
    },
    props: ['choices'],
    mounted() {
        this.$rpgKeypress = ((name) => {
            if (name == 'down' || name == 'up') this.moveCursor(name)
            if (name == 'space' || name == 'enter') this.$emit('selected', this.selected)
            return false
        })
    },
    methods: {
        moveCursor(name) {
            const move = name == 'down' ? 1 : -1
            if (this.selected + move >= this.choices.length) {
                this.selected = 0
            }
            else if (this.selected + move < 0) {
                this.selected = this.choices.length - 1
            }
            else {
                this.selected = this.selected + move
            }
        }
    },
    components: {
        Arrow
    }
}
</script>

<style scoped>
@keyframes cursor {
  0% { opacity: 0.2 }
  100% { opacity: 0.9 }
}

ul {
    list-style: none;
    padding: 0;
}

ul li {
    margin-bottom: 10px;
}

ul li.active {
    display:block;
    opacity:0.4;
    animation: cursor 0.6s infinite alternate ease-in-out;
}
</style>