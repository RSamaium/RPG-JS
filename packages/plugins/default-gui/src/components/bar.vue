<template>
    <div class="bar">
        <div class="bar-info space-between">
            <span class="param-name">{{ name }}</span>
            <span>{{ nb }} / {{ max }}</span>
        </div>
        <div class="bar-full">
            <div class="bar-content" :style="{ width: `${percent}%` }" :class="{[color]: true}"></div>
        </div>
    </div>
</template>

<script>
export default {
    props: ['nb', 'max', 'color', 'name'],
    computed: {
        percent() {
            return this.nb / this.max * 100
        }
    }
}
</script>

<style scoped>
.bar-full {
    height: 12px;
    border:2px solid black; 
}

.bar-content {
    height: 100%;
}

.orange {
    background: rgb(251,130,57);
    background: linear-gradient(90deg, rgba(251,130,57,1) 0%, rgba(255,192,46,1) 100%);
}

.blue {
    background: rgb(0,129,196);
    background: linear-gradient(90deg, rgba(0,129,196,1) 0%, rgba(0,193,242,1) 100%);
}

.gray {
    background: rgb(68,68,68);
    background: linear-gradient(90deg, rgba(68,68,68,1) 0%, rgba(170,170,170,1) 100%);
}

.bar-info {
    font-family: "lato";
    font-size: 18px;
    color: white;
    margin: 0;
}

.param-name {
    color: #71acff;
}

.space-between {
    justify-content: space-between;
    display: flex;
}
</style>