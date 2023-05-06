<template>
    <Content :page-key="key"/>
</template>

<script>
export default {
    props: ['page'],
    computed: {
        key() {
            return this.$site.pages.find(p => p.path === '/api/' + this.page + '.html').key
        }
    }
}
</script>