import { ref } from 'vue'

export const inBrowser = typeof window !== 'undefined'

if (!inBrowser) {
  global.localStorage = {
    getItem() {
      return null
    },
    setItem() {
      return null
    },
  }
  global.document = {}
}


const get = (key: string, defaultValue = true): boolean => {
  return inBrowser
    ? JSON.parse(localStorage.getItem(key) || String(defaultValue))
    : defaultValue
}

export const preferAutoloadKey = 'vue-docs-prefer-autoload'
export const preferAutoload = ref(get(preferAutoloadKey))