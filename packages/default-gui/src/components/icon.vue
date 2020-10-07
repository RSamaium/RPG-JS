<template>
    <i :class="name"></i>
</template>

<script>
export default {
    props: ['name']
}
</script>

<style scoped>
i {
    width: 20px;
    height: 20px;
    display: inline-block;
    background-size: cover;
}

i.potion {
    background-image: url('../assets/icons/potion-ball.svg')
}
</style>