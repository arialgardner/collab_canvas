<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <h1>CollabCanvas</h1>
        <p class="subtitle">Real-time collaborative canvas</p>
      </div>

      <!-- Toggle between Login/Signup -->
      <div class="auth-toggle">
        <button 
          :class="{ active: !isSignupMode }" 
          @click="isSignupMode = false"
          type="button"
        >
          Login
        </button>
        <button 
          :class="{ active: isSignupMode }" 
          @click="isSignupMode = true"
          type="button"
        >
          Sign Up
        </button>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <!-- Auth Form -->
      <form @submit.prevent="handleSubmit" class="auth-form" :class="{ 'login-mode': !isSignupMode }">
        <!-- Display Name Field (Signup only) -->
        <div v-if="isSignupMode" class="form-group display-name-group">
          <label for="displayName">Display Name</label>
          <input
            id="displayName"
            v-model="form.displayName"
            type="text"
            required
            :disabled="isLoading"
            placeholder="Enter your display name"
            class="form-input"
          />
          <div class="field-error" :class="{ visible: displayNameError }">{{ displayNameError || '&nbsp;' }}</div>
        </div>

        <!-- Email Field -->
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            :disabled="isLoading"
            placeholder="Enter your email"
            class="form-input"
          />
          <div class="field-error" :class="{ visible: emailError }">{{ emailError || '&nbsp;' }}</div>
        </div>

        <!-- Password Field -->
        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            :disabled="isLoading"
            placeholder="Enter your password"
            class="form-input"
          />
          <div class="field-error" :class="{ visible: passwordError }">{{ passwordError || '&nbsp;' }}</div>
        </div>

        <!-- Submit Button -->
        <button 
          type="submit" 
          :disabled="isLoading || !isFormValid"
          class="auth-button primary"
        >
          <span v-if="isLoading" class="loading-spinner"></span>
          {{ isLoading ? 'Please wait...' : (isSignupMode ? 'Create Account' : 'Sign In') }}
        </button>
      </form>

      <!-- Divider -->
      <div class="divider">
        <span>or</span>
      </div>

      <!-- Google Sign In -->
      <button 
        @click="handleGoogleAuth"
        :disabled="isLoading"
        type="button"
        class="auth-button google"
      >
        <svg class="google-icon" viewBox="0 0 24 24">
          <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {{ isSignupMode ? 'Sign up with Google' : 'Sign in with Google' }}
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useRouter } from 'vue-router'

export default {
  name: 'AuthView',
  setup() {
    const { signUp, signUpWithGoogle, signIn, signInWithGoogle, isLoading, error, user } = useAuth()
    const router = useRouter()

    // Form state
    const isSignupMode = ref(false)
    const form = ref({
      displayName: '',
      email: '',
      password: ''
    })

    // Validation
    const emailError = ref('')
    const passwordError = ref('')
    const displayNameError = ref('')

    // Validate email format
    const validateEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    }

    // Validate password length
    const validatePassword = (password) => {
      return password.length >= 6
    }

    // Validate display name
    const validateDisplayName = (name) => {
      return name.trim().length >= 2
    }

    // Form validation
    const isFormValid = computed(() => {
      const emailValid = validateEmail(form.value.email)
      const passwordValid = validatePassword(form.value.password)
      const displayNameValid = !isSignupMode.value || validateDisplayName(form.value.displayName)
      
      return emailValid && passwordValid && displayNameValid
    })

    // Watch form fields for real-time validation
    watch(() => form.value.email, (newEmail) => {
      if (newEmail && !validateEmail(newEmail)) {
        emailError.value = 'Please enter a valid email address'
      } else {
        emailError.value = ''
      }
    })

    watch(() => form.value.password, (newPassword) => {
      if (newPassword && !validatePassword(newPassword)) {
        passwordError.value = 'Password must be at least 6 characters'
      } else {
        passwordError.value = ''
      }
    })

    watch(() => form.value.displayName, (newName) => {
      if (isSignupMode.value && newName && !validateDisplayName(newName)) {
        displayNameError.value = 'Display name must be at least 2 characters'
      } else {
        displayNameError.value = ''
      }
    })

    // Clear form when switching modes
    watch(isSignupMode, () => {
      form.value = {
        displayName: '',
        email: '',
        password: ''
      }
      emailError.value = ''
      passwordError.value = ''
      displayNameError.value = ''
    })

    // Handle form submission
    const handleSubmit = async () => {
      try {
        if (isSignupMode.value) {
          await signUp(form.value.email, form.value.password, form.value.displayName)
        } else {
          await signIn(form.value.email, form.value.password)
        }
        
        // Redirect to canvas on successful auth
        router.push('/canvas')
      } catch (err) {
        // Error is handled by useAuth composable
        console.error('Auth error:', err)
      }
    }

    // Handle Google authentication
    const handleGoogleAuth = async () => {
      try {
        if (isSignupMode.value) {
          await signUpWithGoogle()
        } else {
          await signInWithGoogle()
        }
        
        // Redirect to canvas on successful auth
        router.push('/canvas')
      } catch (err) {
        // Error is handled by useAuth composable
        console.error('Google auth error:', err)
      }
    }

    // Redirect if already authenticated
    watch(user, (newUser) => {
      if (newUser) {
        router.push('/canvas')
      }
    }, { immediate: true })

    return {
      isSignupMode,
      form,
      isLoading,
      error,
      emailError,
      passwordError,
      displayNameError,
      isFormValid,
      handleSubmit,
      handleGoogleAuth
    }
  }
}
</script>

<style scoped>
.auth-container {
  min-height: 100vh;
  height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2d2d2d 0%, #000000 100%);
  padding: 20px;
  overflow: hidden;
}

.auth-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  min-width: 280px;
  margin: auto 0;
}

@media (max-width: 400px) {
  .auth-card {
    padding: 1.5rem;
  }
  
  .auth-header h1 {
    font-size: 1.5rem;
  }
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-header h1 {
  color: #333;
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 600;
}

.subtitle {
  color: #666;
  margin: 0;
  font-size: 0.9rem;
}

.auth-toggle {
  display: flex;
  margin-bottom: 1.5rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.auth-toggle button {
  flex: 1;
  padding: 0.75rem;
  border: none;
  background: #f8f9fa;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.auth-toggle button.active {
  background: linear-gradient(135deg, #2d2d2d 0%, #000000 100%);
  color: white;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  border: 1px solid #fcc;
}

.auth-form {
  margin-bottom: 1.5rem;
}

.auth-form.login-mode {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 280px;
}

.form-group {
  margin-bottom: 1rem;
  width: 100%;
  box-sizing: border-box;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
  max-width: 100%;
}

.form-input:focus {
  outline: none;
  border-color: #2d2d2d;
}

.form-input:disabled {
  background: #f8f9fa;
  cursor: not-allowed;
}

.field-error {
  font-size: 0.8rem;
  margin-top: 0.25rem;
  /* Always take up space to prevent layout shift */
  min-height: 1.2rem;
  /* Invisible by default */
  color: transparent;
  transition: color 0.2s ease;
  /* Prevent text from expanding width */
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.field-error.visible {
  /* Show error text when visible class is applied */
  color: #c33;
}

.auth-button {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.auth-button.primary {
  background: linear-gradient(135deg, #2d2d2d 0%, #000000 100%);
  color: white;
}

.auth-button.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
}

.auth-button.google {
  background: white;
  color: #333;
  border: 1px solid #ddd;
}

.auth-button.google:hover:not(:disabled) {
  background: #f8f9fa;
}

.auth-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.divider {
  text-align: center;
  margin: 1.5rem 0;
  color: #666;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #ddd;
}

.divider span {
  padding: 0;
}

.google-icon {
  width: 18px;
  height: 18px;
}
</style>
