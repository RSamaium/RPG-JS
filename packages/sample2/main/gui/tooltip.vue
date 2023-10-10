<template>
    <div id="tooltip-test">{{ spriteData.position.x }}, {{  spriteData.position.y }}</div>
</template>

<script lang="ts">
export default {
    name: 'tooltip2',
    rpgAttachToSprite: true,
    props: ['spriteData'],
}
</script>