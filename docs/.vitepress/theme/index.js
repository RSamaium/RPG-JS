import DefaultTheme from 'vitepress/theme'
import PathTo from './components/PathTo.vue'
import Partial from './components/Partial.vue'
import ApiContent from './components/ApiContent.vue'
import Video from './components/Video.vue'
import Type from './components/Type.vue'

export default {
  extends: DefaultTheme,
  enhanceApp(ctx) {
    ctx.app.component('PathTo', PathTo)
    ctx.app.component('Partial', Partial)
    ctx.app.component('ApiContent', ApiContent)
    ctx.app.component('Video', Video)
    ctx.app.component('Type', Type)
  }
}