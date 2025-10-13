import { ref, onMounted, onUnmounted } from 'vue'
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'

const auth = getAuth()
const googleProvider = new GoogleAuthProvider()

// Reactive state
const user = ref(null)
const isLoading = ref(false)
const error = ref(null)

// Generate random cursor color
const generateCursorColor = () => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// Create user document in Firestore
const createUserDocument = async (firebaseUser, displayName) => {
  try {
    const userDoc = {
      name: displayName || firebaseUser.displayName || 'Anonymous',
      email: firebaseUser.email,
      cursorColor: generateCursorColor(),
      createdAt: serverTimestamp()
    }
    
    await setDoc(doc(db, 'users', firebaseUser.uid), userDoc)
    return userDoc
  } catch (err) {
    console.error('Error creating user document:', err)
    throw new Error('Failed to create user profile')
  }
}

export const useAuth = () => {
  // Sign up with email and password
  const signUp = async (email, password, displayName) => {
    try {
      isLoading.value = true
      error.value = null
      
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user
      
      // Update display name
      await updateProfile(firebaseUser, { displayName })
      
      // Create Firestore document
      await createUserDocument(firebaseUser, displayName)
      
      return firebaseUser
    } catch (err) {
      console.error('Sign up error:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Sign up with Google
  const signUpWithGoogle = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      const userCredential = await signInWithPopup(auth, googleProvider)
      const firebaseUser = userCredential.user
      
      // Create Firestore document with Google profile name
      await createUserDocument(firebaseUser, firebaseUser.displayName)
      
      return firebaseUser
    } catch (err) {
      console.error('Google sign up error:', err)
      if (err.code === 'auth/popup-closed-by-user') {
        error.value = 'Sign-in cancelled'
      } else {
        error.value = err.message
      }
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      isLoading.value = true
      error.value = null
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      return userCredential.user
    } catch (err) {
      console.error('Sign in error:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      const userCredential = await signInWithPopup(auth, googleProvider)
      return userCredential.user
    } catch (err) {
      console.error('Google sign in error:', err)
      if (err.code === 'auth/popup-closed-by-user') {
        error.value = 'Sign-in cancelled'
      } else {
        error.value = err.message
      }
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      await firebaseSignOut(auth)
    } catch (err) {
      console.error('Sign out error:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Auth state listener
  let unsubscribe = null

  const initializeAuth = () => {
    unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      user.value = firebaseUser
      isLoading.value = false
    })
  }

  // Initialize auth state when composable is used
  onMounted(() => {
    initializeAuth()
  })

  // Cleanup listener
  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })

  return {
    // State
    user,
    isLoading,
    error,
    
    // Methods
    signUp,
    signUpWithGoogle,
    signIn,
    signInWithGoogle,
    signOut,
    initializeAuth
  }
}
