<template>
  <div id="app">
    <!-- Error Handler (global) -->
    <ErrorHandler />
    
    <!-- Navigation Bar (only show on canvas route) -->
    <NavBar v-if="showNavBar" @toggle-versions="handleToggleVersions" @save-version="handleSaveVersion" />
    
    <!-- Router View -->
    <router-view />
  </div>
</template>

<script>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavBar from './components/NavBar.vue'
import ErrorHandler from './components/ErrorHandler.vue'
import { useErrorHandling } from './composables/useErrorHandling'

export default {
  name: 'App',
  components: {
    NavBar,
    ErrorHandler
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const { setupNetworkMonitoring } = useErrorHandling()
    
    // Only show navbar on canvas route (not on auth page)
    const showNavBar = computed(() => {
      return route.name === 'Canvas'
    })
    
    // Set up global error handling
    onMounted(() => {
      setupNetworkMonitoring()
    })
    
    const handleToggleVersions = () => {
      const q = { ...route.query }
      q.history = q.history ? undefined : '1'
      router.replace({ name: route.name, params: route.params, query: q })
    }

    const handleSaveVersion = () => {
      const q = { ...route.query }
      q.save = '1'
      router.replace({ name: route.name, params: route.params, query: q })
    }

    return {
      showNavBar,
      handleToggleVersions,
      handleSaveVersion
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