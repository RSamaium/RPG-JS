<template>
  <Navbar />
  <Sidenav />
  <main class="content">
     <Topbar />
     <router-view></router-view>
  </main>
</template>

<script>
import Navbar from './components/Navbar.vue'
import Sidenav from './components/Sidenav.vue'
import Topbar from './components/Topbar.vue'

export default {
  components: {
    Navbar,
    Sidenav,
    Topbar
  }
}
</script>
