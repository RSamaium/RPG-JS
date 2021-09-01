<template>
   <Slots mode="load" />
</template>

<script>
import Slots from './slots.vue'

export default {
    name: 'rpg-load',
    components: {
        Slots
    }
}
</script>