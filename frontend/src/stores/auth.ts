import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMutation, useQuery } from '@urql/vue'
import { 
  LOGIN_MUTATION, 
  REGISTER_MUTATION, 
  UPDATE_USER_MUTATION, 
  GET_ME_QUERY 
} from '@/services/graphql'
import type { User } from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('authToken'))
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userCredits = computed(() => 0) // Credits functionality removed
  const freePhotosUsed = computed(() => user.value?.freePhotosUsed || 0)
  const freePhotosRemaining = computed(() => Math.max(0, 2 - freePhotosUsed.value))
  const hasFreePhotosAvailable = computed(() => freePhotosRemaining.value > 0)

  // Initialize GraphQL composables at the top level
  const { executeQuery: executeGetMe } = useQuery({ query: GET_ME_QUERY, pause: true })
  const { executeMutation: executeLogin } = useMutation(LOGIN_MUTATION)
  const { executeMutation: executeRegister } = useMutation(REGISTER_MUTATION)
  const { executeMutation: executeUpdateUser } = useMutation(UPDATE_USER_MUTATION)

  async function login(credentials: { identifier: string; password: string }) {
    try {
      loading.value = true
      error.value = null
      
      const result = await executeLogin({ input: credentials })
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      const response = result.data?.login
      if (!response) {
        throw new Error('Login failed')
      }
      
      token.value = response.jwt
      user.value = response.user
      
      localStorage.setItem('authToken', response.jwt)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      return response
    } catch (err: any) {
      error.value = err.message || 'Login failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function register(userData: {
    username: string
    email: string
    password: string
  }) {
    try {
      loading.value = true
      error.value = null
      
      const result = await executeRegister({ input: userData })
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      const response = result.data?.register
      if (!response) {
        throw new Error('Registration failed')
      }
      
      token.value = response.jwt
      user.value = response.user
      
      localStorage.setItem('authToken', response.jwt)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      return response
    } catch (err: any) {
      error.value = err.message || 'Registration failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchUser() {
    if (!token.value) return
    
    try {
      loading.value = true
      const result = await executeGetMe()
      
      if (result.error?.value) {
        throw new Error(result.error.value.message)
      }
      
      const userData = result.data?.value?.me
      if (userData) {
        user.value = userData
        localStorage.setItem('user', JSON.stringify(userData))
      }
    } catch (err: any) {
      console.error('Failed to fetch user:', err)
      logout()
    } finally {
      loading.value = false
    }
  }

  async function updateProfile(userData: Partial<User>) {
    if (!user.value?.id) return
    
    try {
      loading.value = true
      error.value = null
      
      const result = await executeUpdateUser({ 
        id: user.value.id, 
        data: userData 
      })
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      const updatedUser = result.data?.updateUsersPermissionsUser?.data?.attributes
      if (updatedUser) {
        user.value = { ...updatedUser, id: user.value.id }
        localStorage.setItem('user', JSON.stringify(user.value))
      }
      
      return user.value
    } catch (err: any) {
      error.value = err.message || 'Profile update failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
  }

  function initializeAuth() {
    const storedToken = localStorage.getItem('authToken')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      token.value = storedToken
      try {
        user.value = JSON.parse(storedUser)
        // Skip automatic user refresh to avoid GraphQL permission issues
        // fetchUser() can be called manually when needed
      } catch (err) {
        console.error('Failed to parse stored user data:', err)
        logout()
      }
    }
  }

  function updateCredits(newCredits: number) {
    // Credits functionality removed - this is a no-op
    console.warn('Credits functionality has been removed')
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    userCredits,
    freePhotosUsed,
    freePhotosRemaining,
    hasFreePhotosAvailable,
    login,
    register,
    fetchUser,
    updateProfile,
    logout,
    initializeAuth,
    updateCredits,
  }
})