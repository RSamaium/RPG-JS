<template>
    <div class="hero">
        <div class="face-column">
            <div :style="image"></div>
        </div>
        <div class="name-column">
            <ul>
                <li>Sam</li>
                <li class="space-between"><span>Niv</span> <span>1</span></li>
            </ul>
        </div>
        <div class="bars-column">
             <ul>
                 <li>Guerrier</li>
                 <li><bar :nb="20" :max="100" :name="hp"  color="blue" /></li>
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
    background-color: rgb(0 0 0 / 25%);
    border: 2px solid rgb(0 0 0 / 31%);
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
}
</style>