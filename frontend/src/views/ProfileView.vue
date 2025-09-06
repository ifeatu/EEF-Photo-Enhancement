<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { 
  UserIcon,
  EnvelopeIcon,
  KeyIcon,
  CreditCardIcon,
  PhotoIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()

const activeTab = ref('profile')
const isLoading = ref(false)
const message = ref('')
const error = ref('')

// Profile form
const profileForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
  username: ''
})

// Password form
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const tabs = [
  { id: 'profile', name: 'Profile Information', icon: UserIcon },
  { id: 'password', name: 'Change Password', icon: KeyIcon },
  { id: 'account', name: 'Account Overview', icon: CreditCardIcon }
]

const isProfileFormValid = computed(() => {
  return profileForm.email && profileForm.username
})

const isPasswordFormValid = computed(() => {
  return passwordForm.currentPassword && 
         passwordForm.newPassword && 
         passwordForm.confirmPassword &&
         passwordForm.newPassword === passwordForm.confirmPassword &&
         passwordForm.newPassword.length >= 6
})

const passwordsMatch = computed(() => {
  return passwordForm.newPassword === passwordForm.confirmPassword
})

function initializeProfileForm() {
  if (authStore.user) {
    profileForm.firstName = authStore.user.firstName || ''
    profileForm.lastName = authStore.user.lastName || ''
    profileForm.email = authStore.user.email || ''
    profileForm.username = authStore.user.username || ''
  }
}

function resetPasswordForm() {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
}

function togglePasswordVisibility(field: 'current' | 'new' | 'confirm') {
  switch (field) {
    case 'current':
      showCurrentPassword.value = !showCurrentPassword.value
      break
    case 'new':
      showNewPassword.value = !showNewPassword.value
      break
    case 'confirm':
      showConfirmPassword.value = !showConfirmPassword.value
      break
  }
}

async function updateProfile() {
  if (!isProfileFormValid.value) return

  try {
    isLoading.value = true
    error.value = ''
    message.value = ''

    await authStore.updateProfile({
      firstName: profileForm.firstName || undefined,
      lastName: profileForm.lastName || undefined,
      email: profileForm.email,
      username: profileForm.username
    })

    message.value = 'Profile updated successfully!'
  } catch (err: any) {
    error.value = err.message || 'Failed to update profile'
  } finally {
    isLoading.value = false
  }
}

async function changePassword() {
  if (!isPasswordFormValid.value) return

  try {
    isLoading.value = true
    error.value = ''
    message.value = ''

    // Note: This would need to be implemented in the auth store
    // await authStore.changePassword(passwordForm.currentPassword, passwordForm.newPassword)
    
    // For now, show a placeholder message
    message.value = 'Password change functionality will be implemented with backend integration'
    resetPasswordForm()
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || 'Failed to change password'
  } finally {
    isLoading.value = false
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

onMounted(() => {
  initializeProfileForm()
})
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Account Settings</h1>
      <p class="mt-1 text-sm text-gray-600">
        Manage your account information and preferences
      </p>
    </div>

    <!-- Messages -->
    <div v-if="message" class="rounded-md bg-green-50 p-4">
      <div class="text-sm text-green-700">{{ message }}</div>
    </div>

    <div v-if="error" class="rounded-md bg-red-50 p-4">
      <div class="text-sm text-red-700">{{ error }}</div>
    </div>

    <!-- Tabs -->
    <div class="bg-white shadow rounded-lg">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id; message = ''; error = ''"
            :class="[
              'flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200',
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            <component :is="tab.icon" class="h-5 w-5 mr-2" />
            {{ tab.name }}
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="p-6">
        <!-- Profile Information Tab -->
        <div v-if="activeTab === 'profile'" class="space-y-6">
          <div>
            <h3 class="text-lg font-medium text-gray-900">Profile Information</h3>
            <p class="mt-1 text-sm text-gray-600">
              Update your personal information and contact details.
            </p>
          </div>

          <form @submit.prevent="updateProfile" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label for="firstName" class="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <div class="mt-1">
                  <input
                    id="firstName"
                    v-model="profileForm.firstName"
                    type="text"
                    class="input-field"
                    placeholder="John"
                  />
                </div>
              </div>

              <div>
                <label for="lastName" class="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <div class="mt-1">
                  <input
                    id="lastName"
                    v-model="profileForm.lastName"
                    type="text"
                    class="input-field"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>

            <div>
              <label for="username" class="block text-sm font-medium text-gray-700">
                Username <span class="text-red-500">*</span>
              </label>
              <div class="mt-1">
                <input
                  id="username"
                  v-model="profileForm.username"
                  type="text"
                  required
                  class="input-field"
                  placeholder="johndoe"
                />
              </div>
            </div>

            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">
                Email Address <span class="text-red-500">*</span>
              </label>
              <div class="mt-1">
                <input
                  id="email"
                  v-model="profileForm.email"
                  type="email"
                  required
                  class="input-field"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div class="flex justify-end">
              <button
                type="submit"
                :disabled="!isProfileFormValid || isLoading"
                class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  v-if="isLoading"
                  class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {{ isLoading ? 'Updating...' : 'Update Profile' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Change Password Tab -->
        <div v-if="activeTab === 'password'" class="space-y-6">
          <div>
            <h3 class="text-lg font-medium text-gray-900">Change Password</h3>
            <p class="mt-1 text-sm text-gray-600">
              Update your password to keep your account secure.
            </p>
          </div>

          <form @submit.prevent="changePassword" class="space-y-6">
            <div>
              <label for="currentPassword" class="block text-sm font-medium text-gray-700">
                Current Password <span class="text-red-500">*</span>
              </label>
              <div class="mt-1 relative">
                <input
                  id="currentPassword"
                  v-model="passwordForm.currentPassword"
                  :type="showCurrentPassword ? 'text' : 'password'"
                  required
                  class="input-field pr-10"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex items-center pr-3"
                  @click="togglePasswordVisibility('current')"
                >
                  <EyeIcon v-if="!showCurrentPassword" class="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  <EyeSlashIcon v-else class="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            </div>

            <div>
              <label for="newPassword" class="block text-sm font-medium text-gray-700">
                New Password <span class="text-red-500">*</span>
              </label>
              <div class="mt-1 relative">
                <input
                  id="newPassword"
                  v-model="passwordForm.newPassword"
                  :type="showNewPassword ? 'text' : 'password'"
                  required
                  class="input-field pr-10"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex items-center pr-3"
                  @click="togglePasswordVisibility('new')"
                >
                  <EyeIcon v-if="!showNewPassword" class="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  <EyeSlashIcon v-else class="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              <p class="mt-1 text-sm text-gray-500">Must be at least 6 characters long</p>
            </div>

            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
                Confirm New Password <span class="text-red-500">*</span>
              </label>
              <div class="mt-1 relative">
                <input
                  id="confirmPassword"
                  v-model="passwordForm.confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  required
                  class="input-field pr-10"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex items-center pr-3"
                  @click="togglePasswordVisibility('confirm')"
                >
                  <EyeIcon v-if="!showConfirmPassword" class="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  <EyeSlashIcon v-else class="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              <p v-if="passwordForm.confirmPassword && !passwordsMatch" class="mt-1 text-sm text-red-600">
                Passwords do not match
              </p>
            </div>

            <div class="flex justify-end">
              <button
                type="submit"
                :disabled="!isPasswordFormValid || isLoading"
                class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  v-if="isLoading"
                  class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {{ isLoading ? 'Changing...' : 'Change Password' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Account Overview Tab -->
        <div v-if="activeTab === 'account'" class="space-y-6">
          <div>
            <h3 class="text-lg font-medium text-gray-900">Account Overview</h3>
            <p class="mt-1 text-sm text-gray-600">
              View your account statistics and information.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Credits -->
            <div class="bg-primary-50 border border-primary-200 rounded-lg p-6">
              <div class="flex items-center">
                <CreditCardIcon class="h-8 w-8 text-primary-600" />
                <div class="ml-4">
                  <p class="text-sm font-medium text-primary-900">Available Credits</p>
                  <p class="text-2xl font-bold text-primary-600">{{ authStore.user?.credits || 0 }}</p>
                </div>
              </div>
            </div>

            <!-- Total Photos -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div class="flex items-center">
                <PhotoIcon class="h-8 w-8 text-blue-600" />
                <div class="ml-4">
                  <p class="text-sm font-medium text-blue-900">Photos Enhanced</p>
                  <p class="text-2xl font-bold text-blue-600">0</p>
                </div>
              </div>
            </div>

            <!-- Member Since -->
            <div class="bg-green-50 border border-green-200 rounded-lg p-6">
              <div class="flex items-center">
                <UserIcon class="h-8 w-8 text-green-600" />
                <div class="ml-4">
                  <p class="text-sm font-medium text-green-900">Member Since</p>
                  <p class="text-sm font-bold text-green-600">
                    N/A
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Account Details -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h4 class="text-lg font-medium text-gray-900 mb-4">Account Details</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt class="text-sm font-medium text-gray-500">Full Name</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  {{ authStore.user?.firstName && authStore.user?.lastName 
                    ? `${authStore.user.firstName} ${authStore.user.lastName}` 
                    : 'Not provided' 
                  }}
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Username</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ authStore.user?.username || 'N/A' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Email Address</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ authStore.user?.email || 'N/A' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Account Status</dt>
                <dd class="mt-1">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>