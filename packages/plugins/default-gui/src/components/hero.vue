<template>
    <div class="hero">
        <div class="face-column">
            <div></div>
        </div>
        <div class="name-column">
            <ul>
                <li>{{ name }}</li>
                <li class="space-between"><span class="param-name">Level</span> <span>{{ level }}</span></li>
                <li><bar :nb="exp" :max="expForNextlevel" name="EXP"  color="gray" /></li>
            </ul>
        </div>
        <div class="bars-column">
             <ul>
                 <li>{{ _class.name }}</li>
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
    inject: ['rpgCurrentPlayer'],
    data() {
        return {
            name: '',
            hp: 0,
            sp: 0,
            maxHp: 0,
            maxSp: 0,
            expForNextlevel: 0,
            exp: 0,
            level: 0,
            _class: {}
        }
    },
    mounted() {
        this.obsCurrentPlayer = this.rpgCurrentPlayer.subscribe(({ object }) => {
           this.name = object.name
           this.hp = object.hp
           this.sp = object.sp
           this.maxHp = object.param.maxHp
           this.maxSp = object.param.maxSp
           this.expForNextlevel = object.expForNextlevel
           this.exp = object.exp
           this.level = object.level
        })
    },
    computed: {
        image() {
            return {
                backgroundImage: `url(${this.face})`
            }
        }
    },
    unmounted() {
        this.obsCurrentPlayer.unsubscribe()
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