import DefaultTheme from 'vitepress/theme'
import PathTo from './components/PathTo.vue'
import Video from './components/Video.vue'
import Type from './components/Type.vue'

export default {
  extends: DefaultTheme,
  enhanceApp(ctx) {
    ctx.app.component('PathTo', PathTo)
    ctx.app.component('Video', Video)
    ctx.app.component('Type', Type)
  }
}