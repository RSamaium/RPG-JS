<template>
    <Content :page-key="key"/>
  </template>
  
  <script>
  import { ref, computed, defineComponent } from 'vue'
  import { useData } from 'vitepress'
  
  export default defineComponent({
    props: ['page'],
    setup(props) {
      const data = useData()

      console.log(data)
  
      const key = computed(() => {
        return site.pages.value.find(p => p.path === '/api/' + props.page + '.html').key
      })
  
      return { key }
    }
  })
  </script>
  