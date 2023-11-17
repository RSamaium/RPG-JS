<template>
    <iframe :src="path" loading="lazy" scrolling="no" style="border:0;height:760px;max-width:800px;width:100%"> 
    </iframe>
</template>

<script>
export default {
    props: ['id'],
    computed: {
        path() {
            return `https://playground.rpgjs.dev/sandbox/${this.id}`
        }
    }
}
</script>