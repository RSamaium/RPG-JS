<template>
    <div class="bar">
        <div class="bar-full"></div>
    </div>
</template>

<script>
export default {
    props: ['nb', 'max', 'color', 'name']
}
</script>

<style>
.bar-full {
    background: rgb(13,5,156);
    background: linear-gradient(90deg, rgba(13,5,156,1) 0%, rgba(9,9,121,1) 20%, rgba(0,91,255,1) 100%);
    height: 15px;
}
</style>