<script setup lang="ts">
import { VTSwitch } from '@vue/theme'
import { useRoute } from 'vitepress'
import { ref, computed, inject, Ref, onMounted } from 'vue'
import {
  preferAutoloadKey,
  preferAutoload,
} from './preferences'

const route = useRoute()
const show = computed(() =>
  /^\/(guide|tutorial|examples|style-guide|gui|advanced)\//.test(route.path)
)

let isOpen = ref(true)

const toggleOpen = () => {
  isOpen.value = !isOpen.value
}

const removeOutline = (e: Event) => {
  ;(e.target as HTMLElement).classList.add('no-outline')
}

const restoreOutline = (e: Event) => {
  ;(e.target as HTMLElement).classList.remove('no-outline')
}

const toggleAutoloadAPI = useToggleFn(
  preferAutoloadKey,
  preferAutoload,
  'prefer-autoload'
)
const closeSideBar = inject('close-sidebar') as () => void

onMounted(() => {
    if (typeof localStorage === 'undefined') {
        return
    }
    if (preferAutoload.value) {
        toggleAutoloadAPI(true)
    }
})

function useToggleFn(
  storageKey: string,
  state: Ref<boolean>,
  className: string
) {
  if (typeof localStorage === 'undefined') {
    return () => {}
  }
  const classList = document.documentElement?.classList
  return (value = !state.value) => {
    if ((state.value = value)) {
      classList.add(className)
    } else {
      classList.remove(className)
    }
    localStorage.setItem(storageKey, String(state.value))
  }
}
</script>

<template>
  <div v-if="show" class="preference-switch">
    <button
      class="toggle"
      aria-label="preference switches toggle"
      aria-controls="preference-switches"
      :aria-expanded="isOpen"
      @click="toggleOpen"
      @mousedown="removeOutline"
      @blur="restoreOutline"
    >
      <span>API Preference</span>
    </button>
    <div id="preference-switches" :hidden="!isOpen" :aria-hidden="!isOpen">
      <div class="switch-container">
        <label class="options-label" @click="toggleAutoloadAPI(false)"
          >Module</label
        >
        <VTSwitch
          class="api-switch"
          aria-label="prefer autoload api"
          :aria-checked="preferAutoload"
          @click="toggleAutoloadAPI()"
        />
        <label
          class="autoload-label"
          @click="toggleAutoloadAPI(true)"
          >Autoload</label
        >
        <a
          class="switch-link"
          title="About API preference"
          href="/guide/api-preference"
          @click="closeSideBar"
          >?</a
        >
      </div>
    </div>
  </div>
</template>

<style scoped>
.preference-switch {
  font-size: 12px;
  transition: border-color 0.5s, background-color 0.5s ease;
  margin-bottom: 10px;
  margin-top: 10px;
  padding: 5px;
  padding-bottom: 0;
  top: 10px;
  z-index: 10;
  width: 100%;
}

.toggle {
  color: var(--vt-c-text-2);
  transition: color 0.5s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 2px;
  width: 100%;
  font-weight: 600;
}

.toggle:hover {
  color: var(--vt-c-text-1);
}

.no-outline {
  outline: 0;
}

.vt-link-icon {
  position: relative;
  top: 1px;
}

.vt-link-icon.open {
  transform: rotate(180deg);
}

#preference-switches {
  padding: 12px 16px;
  transition: background-color 0.5s;
  margin: 6px 0 12px;
  border-radius: 8px;
  font-weight: 600;
}

.switch-container {
  display: flex;
  align-items: center;
}

@media(max-width: 959px){
  .switch-container {
    padding: 0 1em;
  }
}

.switch-container:nth-child(2) {
  margin-top: 10px;
}

.vt-switch {
  margin-right: 5px;
  transform: scale(0.8);
}

.switch-container label {
  transition: color 0.5s;
  cursor: pointer;
}

.switch-container label:first-child {
  width: 50px;
}

.switch-link {
  margin-left: 8px;
  font-size: 11px;
  min-width: 14px;
  height: 14px;
  line-height: 13px;
  text-align: center;
  color: var(--vt-c-green);
  border: 1px solid var(--vt-c-green);
  border-radius: 50%;
}

@media (max-width: 1439px) {
  #preference-switches {
    font-size: 11px;
    padding: 8px 4px;
  }

  .vt-switch {
    margin: auto;
  }

  .switch-link {
    margin-left: auto;
  }
  .switch-container label:first-child {
    width: 46px;
  }
}
</style>

<style>
.autoload-api,
.module {
  display: none;
}

.prefer-autoload .module-api,
.prefer-module .html {
  display: none;
}

.prefer-autoload .autoload-api,
.prefer-module .module {
  display: initial;
}

.prefer-autoload .api-switch .vt-switch-check {
  transform: translateX(18px);
}

.autoload-label,
.module-label,
.prefer-autoload .module-label,
.prefer-module .no-sfc-label {
  color: var(--vt-c-text-3);
}

.prefer-autoload .autoload-label,
.prefer-module .module-label {
  color: var(--vt-c-text-1);
}

.prefer-module .sfc-switch .vt-switch-check {
  transform: translateX(18px);
}

.tip .module-api,
.tip .autoload-api {
  color: var(--vt-c-text-code);
  /* transition: color 0.5s; */
  font-weight: 600;
}
</style>