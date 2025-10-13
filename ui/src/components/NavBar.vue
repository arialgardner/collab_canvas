<template>
  <nav class="navbar">
    <div class="nav-content">
      <!-- Logo/Title -->
      <div class="nav-brand">
        <h1>CollabCanvas</h1>
      </div>

      <!-- User Info & Controls -->
      <div class="nav-controls">
        <!-- Presence List -->
        <div v-if="user" class="presence-section">
          <!-- User Count -->
          <div class="user-count" @click="togglePresenceDropdown">
            <span class="count-badge">{{ onlineUsers.length }}</span>
            <span class="count-text">users online</span>
            <svg 
              :class="{ 'rotated': showPresenceDropdown }" 
              class="dropdown-arrow" 
              viewBox="0 0 20 20"
            >
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
            </svg>
          </div>

          <!-- Presence Dropdown -->
          <div v-if="showPresenceDropdown" class="presence-dropdown">
            <div class="dropdown-header">Online Users</div>
            <div v-if="onlineUsers.length === 0" class="empty-state">
              No other users online
            </div>
            <div v-else class="user-list">
              <div 
                v-for="onlineUser in onlineUsers" 
                :key="onlineUser.userId"
                :class="{ 'current-user': onlineUser.userId === user.uid }"
                class="user-item"
              >
                <div 
                  class="cursor-color" 
                  :style="{ backgroundColor: onlineUser.cursorColor }"
                ></div>
                <span class="user-name">{{ onlineUser.userName }}</span>
                <span v-if="onlineUser.userId === user.uid" class="you-label">(you)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Current User Info -->
        <div v-if="user" class="user-info">
          <div 
            class="user-cursor-color" 
            :style="{ backgroundColor: userCursorColor }"
            :title="'Your cursor color'"
          ></div>
          <span class="user-name">{{ userDisplayName }}</span>
        </div>

        <!-- Logout Button -->
        <button 
          v-if="user" 
          @click="handleLogout"
          :disabled="isLoading"
          class="logout-button"
          title="Sign out"
        >
          <svg class="logout-icon" viewBox="0 0 20 20">
            <path d="M3 3a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 13.846 4.632 16 6.414 16H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 6H6.28l-.31-1.243A1 1 0 005 4H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
          </svg>
          {{ isLoading ? 'Signing out...' : 'Sign Out' }}
        </button>
      </div>
    </div>

    <!-- Click outside to close dropdown -->
    <div 
      v-if="showPresenceDropdown" 
      @click="showPresenceDropdown = false"
      class="dropdown-overlay"
    ></div>
  </nav>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'

export default {
  name: 'NavBar',
  setup() {
    const { user, signOut, isLoading } = useAuth()
    const router = useRouter()
    
    // Local state
    const showPresenceDropdown = ref(false)
    const userCursorColor = ref('#667eea')
    const onlineUsers = ref([])

    // Computed properties
    const userDisplayName = computed(() => {
      if (!user.value) return ''
      return user.value.displayName || user.value.email?.split('@')[0] || 'Anonymous'
    })

    // Load user's cursor color from Firestore (disabled until PR #5)
    const loadUserCursorColor = async () => {
      if (!user.value) return
      
      // TODO: Enable in PR #5 - Firestore Integration
      // For now, use default color
      userCursorColor.value = '#667eea'
      
      /* 
      try {
        const userDoc = await getDoc(doc(db, 'users', user.value.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          userCursorColor.value = userData.cursorColor || '#667eea'
        }
      } catch (error) {
        console.error('Error loading user cursor color:', error)
      }
      */
    }

    // Mock presence data for now (will be implemented in PR #8)
    const loadPresenceData = () => {
      // This is a placeholder - real presence tracking will be implemented in PR #8
      if (user.value) {
        onlineUsers.value = [
          {
            userId: user.value.uid,
            userName: userDisplayName.value,
            cursorColor: userCursorColor.value
          }
          // Additional online users will be loaded from Firestore in PR #8
        ]
      }
    }

    // Toggle presence dropdown
    const togglePresenceDropdown = () => {
      showPresenceDropdown.value = !showPresenceDropdown.value
    }

    // Handle logout
    const handleLogout = async () => {
      try {
        await signOut()
        router.push('/')
      } catch (error) {
        console.error('Logout error:', error)
      }
    }

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.presence-section')) {
        showPresenceDropdown.value = false
      }
    }

    // Lifecycle
    onMounted(() => {
      if (user.value) {
        loadUserCursorColor()
        loadPresenceData()
      }
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    // Watch for user changes
    const unwatchUser = user.value ? null : (() => {
      if (user.value) {
        loadUserCursorColor()
        loadPresenceData()
      }
    })

    return {
      user,
      isLoading,
      userDisplayName,
      userCursorColor,
      onlineUsers,
      showPresenceDropdown,
      togglePresenceDropdown,
      handleLogout
    }
  }
}
</script>

<style scoped>
.navbar {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.nav-brand h1 {
  margin: 0;
  color: #2d3748;
  font-size: 1.5rem;
  font-weight: 600;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.presence-section {
  position: relative;
}

.user-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.user-count:hover {
  background: #edf2f7;
  border-color: #cbd5e0;
}

.count-badge {
  background: #667eea;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

.count-text {
  color: #4a5568;
}

.dropdown-arrow {
  width: 16px;
  height: 16px;
  fill: #718096;
  transition: transform 0.2s;
}

.dropdown-arrow.rotated {
  transform: rotate(180deg);
}

.presence-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  z-index: 1001;
}

.dropdown-header {
  padding: 0.75rem 1rem 0.5rem 1rem;
  font-weight: 600;
  color: #2d3748;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.9rem;
}

.empty-state {
  padding: 1rem;
  color: #718096;
  font-size: 0.9rem;
  text-align: center;
}

.user-list {
  padding: 0.5rem 0;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  transition: background-color 0.2s;
}

.user-item:hover {
  background: #f7fafc;
}

.user-item.current-user {
  background: #edf2f7;
}

.cursor-color,
.user-cursor-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.user-cursor-color {
  width: 16px;
  height: 16px;
}

.user-name {
  color: #2d3748;
  font-size: 0.9rem;
}

.you-label {
  color: #718096;
  font-size: 0.8rem;
  font-style: italic;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f7fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.logout-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #fed7d7;
  color: #c53030;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.logout-button:hover:not(:disabled) {
  background: #feb2b2;
  border-color: #f87171;
}

.logout-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.logout-icon {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}
</style>
