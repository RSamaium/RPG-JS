<template>
   <rpg-window>
          <rpg-choice :choices="choice"></rpg-choice>
  </rpg-window>
</template>

<script>
export default {
    name: 'rpg-load',
    data() {
        return {
            choice: [
                { text:  'Slot 1', value: '1' }
            ]
        }
    }
}
</script>

<style>

</style>