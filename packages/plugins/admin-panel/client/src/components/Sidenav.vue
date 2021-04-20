<template>
  <nav
    id="sidebarMenu"
    class="sidebar d-md-block bg-primary text-white collapse"
    data-simplebar
  >
    <div class="sidebar-inner px-4 pt-3">
      <ul class="nav flex-column">
         <li class="nav-item" v-for="item in menu" :key="item.to">
           <router-link tag="a" class="nav-link" :to="{ name: item.to  }">
              <span class="sidebar-icon" ><span class="fas fa-chart-pie"></span></span>
              <span>{{ item.text }}</span>
           </router-link>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script>
export default {
  data() {
    return {
      menu: [{
        text: 'Players',
        to: 'players'
      }]
    }
  }
}
</script>