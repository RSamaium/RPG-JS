<template>
    <div class="hero">
        <div class="face-column">
            <div :style="image"></div>
        </div>
        <div class="name-column">
            <ul>
                <li>{{ name }}</li>
                <li class="space-between"><span class="param-name">Level</span> <span>{{ level }}</span></li>
            </ul>
        </div>
        <div class="bars-column">
             <ul>
                 <li>Warrior</li>
                 <li><bar :nb="hp" :max="maxHp" name="HP"  color="orange" /></li>
                 <li><bar :nb="sp" :max="maxSp" name="SP"  color="blue" /></li>
             </ul>
        </div>
    </div>
</template>

<script>
import Bar from './bar.vue'

export default {
    props: ['face'],
    computed: {
        image() {
            return {
                backgroundImage: `url(${this.face})`
            }
        },
        player() {
            return this.$rpgPlayer()
        },
        hp() {
            return this.player.hp || 0
        },
        maxHp() {
            return this.player.maxHp || 0
        },
        sp() {
            return this.player.sp || 0
        },
        maxSp() {
            return this.player.maxSp || 0
        },
        level() {
            return this.player.level || 1
        },
        name() {
            return this.player.name || ''
        }
    },
    components: {
        Bar
    }
}
</script>

<style scoped>
.hero {
    display: flex;
}

.space-between {
    justify-content: space-between;
    display: flex;
}

.face-column {
    width: 33%;
}

.face-column  > div {
    background-position: center;
    background-size: cover;
    width: 150px;
    height: 150px;
}

.name-column {
     width: 33%;
}

.bars-column {
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

.param-name {
    color: #71acff;
}
</style>