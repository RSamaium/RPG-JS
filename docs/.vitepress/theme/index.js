import { h } from 'vue'
import { VPTheme } from '@vue/theme'
import DefaultTheme from 'vitepress/theme'
import PathTo from './components/PathTo.vue'
import Video from './components/Video.vue'
import Type from './components/Type.vue'
import PreferenceSwitch from './components/PreferenceSwitch.vue'

export default {
  extends: DefaultTheme,
  Layout: () => {
    // @ts-ignore
    return h(VPTheme.Layout, null, {
      'sidebar-top': () => h(PreferenceSwitch),
    })
  },
  enhanceApp(ctx) {
    ctx.app.component('PathTo', PathTo)
    ctx.app.component('Video', Video)
    ctx.app.component('Type', Type)
  }
}