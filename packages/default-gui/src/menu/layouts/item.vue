<template>
   <div>
        <rpg-window :fullWidth="true">
            <div class="row">
                <div>
                    <rpg-choice :choices="items" :row="true" @change="selected"></rpg-choice>
                </div>
                <div>

                </div>
            </div>
        </rpg-window>
        <rpg-window :fullWidth="true">
            <p>{{ description }}</p>
        </rpg-window>
   </div>
</template>

<script>
export default {
    data() {
        return {
            items: [{
                text: 'Potion',
                description: 'Restore 50 HP',
                nb: 1
            },
            {
                text: 'Hyper Potion',
                description: 'Restore all HP',
                nb: 2
            }],
            description: ''
        }
    },
    mounted() {
        console.log('---', this.$rpgPlayer().items[0])
    },
    methods: {
        selected(index) {
            this.description = this.items[index].description
        }
    }
}
</script>

<style scoped>
.row {
    flex-direction: row;
}
</style>