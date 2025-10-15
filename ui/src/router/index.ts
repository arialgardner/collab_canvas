import { createRouter, createWebHistory } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import AuthView from '../views/AuthView.vue'

// Lazy load views
const DashboardView = () => import('../views/DashboardView.vue')
const CanvasView = () => import('../views/CanvasView.vue')

const routes = [
  {
    path: '/auth',
    name: 'Auth',
    component: AuthView,
    meta: {
      requiresGuest: true // Only accessible when not logged in
    }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
    meta: {
      requiresAuth: true // Only accessible when logged in
    }
  },
  {
    path: '/canvas/:canvasId',
    name: 'Canvas', 
    component: CanvasView,
    meta: {
      requiresAuth: true // Only accessible when logged in
    }
  },
  {
    // Redirect any unknown routes to dashboard
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Get current user promise to handle auth state
const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const auth = getAuth()
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe()
      resolve(user)
    }, reject)
  })
}

// Navigation guards
router.beforeEach(async (to, _from, next) => {
  try {
    const user = await getCurrentUser()
    
    // Check if route requires authentication
    if (to.meta.requiresAuth) {
      if (user) {
        // User is authenticated, allow access
        next()
      } else {
        // User not authenticated, redirect to auth
        next({ name: 'Auth' })
      }
    } 
    // Check if route requires guest (not authenticated)
    else if (to.meta.requiresGuest) {
      if (user) {
        // User is authenticated, redirect to dashboard
        next({ name: 'Dashboard' })
      } else {
        // User not authenticated, allow access to auth page
        next()
      }
    }
    // Public route, allow access
    else {
      next()
    }
  } catch (error) {
    console.error('Auth guard error:', error)
    // On error, redirect to auth page
    next({ name: 'Auth' })
  }
})

export default router
