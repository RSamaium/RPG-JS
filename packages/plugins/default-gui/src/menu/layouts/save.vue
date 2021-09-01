<template>
   <rpg-save @saved="back"></rpg-save>
</template>

<script>
export default {
   inject: ['rpgKeypress'],
    mounted() {
        this.obsKeyPress = this.rpgKeypress.subscribe(({ control }) => {
            if (!control) return
            if (control.actionName == 'back') {
                this.back()
            }
        })
    },
    unmounted() {
        this.obsKeyPress.unsubscribe()
    },
    methods: {
       back() {
          this.$emit('changeLayout', 'MainLayout')
       }
    }
}
</script>

<style>

</style>