<template>
  <div id="app">
    <!-- Navigation Bar (only show on canvas route) -->
    <NavBar v-if="showNavBar" />
    
    <!-- Router View -->
    <router-view />
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'

export default {
  name: 'App',
  components: {
    NavBar
  },
  setup() {
    const route = useRoute()
    
    // Only show navbar on canvas route (not on auth page)
    const showNavBar = computed(() => {
      return route.name === 'Canvas'
    })
    
    return {
      showNavBar
    }
  }
}
</script>

<style>
/* Global styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Make sure router-view takes remaining space */
.router-view {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>