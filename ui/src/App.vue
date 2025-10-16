<template>
  <div id="app">
    <!-- Error Handler (global) -->
    <ErrorHandler />
    
    <!-- Navigation Bar (only show on canvas route) -->
    <NavBar 
      v-if="showNavBar" 
      :canvasId="currentCanvasId"
      :canUserEdit="canUserEdit"
      :isOwner="isCanvasOwner"
      @toggle-versions="handleToggleVersions" 
      @save-version="handleSaveVersion" 
    />
    
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
import { useCanvases } from './composables/useCanvases'
import { useAuth } from './composables/useAuth'

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
    const { currentCanvas, canEdit, getUserRole } = useCanvases()
    const { user } = useAuth()
    
    // Only show navbar on canvas route (not on auth page)
    const showNavBar = computed(() => {
      return route.name === 'Canvas'
    })
    
    // Get current canvas ID from route
    const currentCanvasId = computed(() => {
      return route.params.canvasId || 'default'
    })
    
    // Check if user can edit the current canvas (owner or editor)
    const canUserEdit = computed(() => {
      if (!user.value || !currentCanvas.value) return false
      return canEdit(currentCanvas.value, user.value.uid)
    })
    
    // Check if user is the canvas owner
    const isCanvasOwner = computed(() => {
      if (!user.value || !currentCanvas.value) return false
      const role = getUserRole(currentCanvas.value, user.value.uid)
      return role === 'owner'
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
      currentCanvasId,
      canUserEdit,
      isCanvasOwner,
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
  overflow: hidden;
}

#app {
  height: 100vh;
  width: 100vw;
  max-width: 100%;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Make sure router-view takes remaining space */
.router-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>