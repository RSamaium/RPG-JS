<template>
    <div>
        <input type="text">
    </div>
</template>

<script>
export default {
    name: 'rpg-tooltip',
    attachToSprite: true,
    props: ['spriteData'],
    inject: ['rpgEngine', 'rpgScene'],
    data() {
        return {
            opacity: 1
        }
    },
    mounted() {
        const sprite = this.rpgScene().getSprite(this.spriteData.id)
    },
    methods: {
        
    }
}
</script>

<style scoped>
.red {
    width: 100px;
    height: 100px;
    background: red;
}
</style>
