<template>
   <Slots mode="save" @slotSelected="$emit('slotSelected', $event)" @saved="$emit('saved')" />
</template>

<script>
import Slots from './slots.vue'

export default {
    name: 'rpg-save',
    components: {
        Slots
    }
}
</script>