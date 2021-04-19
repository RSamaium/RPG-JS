<template>
    <div class="status-menu">
        <rpg-window :fullWidth="true" height="80%">
            <Bar :nb="6500" :max="9999" name="MaxHP" />
        </rpg-window>
   </div>
</template>

<script>
import Bar from '../../components/bar.vue'

export default {
    components: {
        Bar
    }
}
</script>