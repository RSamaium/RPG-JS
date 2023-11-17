import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import PathTo from './components/PathTo.vue'
import Video from './components/Video.vue'
import Type from './components/Type.vue'
import PreferenceSwitch from './components/PreferenceSwitch.vue'
import Playground from './components/Playground.vue'

export default {
  extends: DefaultTheme,
  Layout: () => {
    // @ts-ignore
    return h(DefaultTheme.Layout, null, {
      'sidebar-nav-before': () => h(PreferenceSwitch),
    })
  },
  enhanceApp(ctx) {
    ctx.app.component('Playground', Playground)
    ctx.app.component('PathTo', PathTo)
    ctx.app.component('Video', Video)
    ctx.app.component('Type', Type)
  }
}