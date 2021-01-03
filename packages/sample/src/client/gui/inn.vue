<template>
   <div>
       <p>Do you want to sleep for {{ amount }} Gold?</p>
   </div>
</template>

<script>
export default {
    name: 'my-inn',
    props: ['amount']
}
</script>

<style scoped>
div {
    background: rgba(0, 0, 0, 0.5);
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

div p {
    width: 100%;
    text-align: center;
    color: white;
    font-size: 26px;
}
</style>