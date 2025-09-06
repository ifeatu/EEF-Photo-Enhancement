<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePhotosStore } from '@/stores/photos'
import StorageInfo from '@/components/StorageInfo.vue'
import { 
  PhotoIcon, 
  CreditCardIcon, 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpTrayIcon
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()
const photosStore = usePhotosStore()

const isLoading = ref(true)

const stats = computed(() => {
  const photos = photosStore.photos
  return {
    total: photos.length,
    pending: photos.filter(p => p.status === 'pending').length,
    processing: photos.filter(p => p.status === 'processing').length,
    completed: photos.filter(p => p.status === 'completed').length,
    failed: photos.filter(p => p.status === 'failed').length
  }
})

const recentPhotos = computed(() => {
  return photosStore.photos
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)
})

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return ClockIcon
    case 'processing':
      return ClockIcon
    case 'completed':
      return CheckCircleIcon
    case 'failed':
      return XCircleIcon
    default:
      return PhotoIcon
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'text-yellow-600'
    case 'processing':
      return 'text-blue-600'
    case 'completed':
      return 'text-green-600'
    case 'failed':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function handleCleanupRequested() {
  try {
    // Call cleanup API endpoint
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5992/api'
    const response = await fetch(`${API_BASE_URL}/photos/cleanup/expired`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      // Refresh photos after cleanup
      await photosStore.fetchPhotos()
    }
  } catch (error) {
    console.error('Failed to cleanup expired photos:', error)
  }
}

onMounted(async () => {
  try {
    await photosStore.fetchPhotos()
  } catch (error) {
    console.error('Failed to fetch photos:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Welcome Section -->
    <div class="bg-white shadow rounded-lg p-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            Welcome back, {{ authStore.user?.firstName || authStore.user?.username }}!
          </h1>
          <p class="mt-1 text-sm text-gray-600">
            Transform your photos with AI-powered enhancement
          </p>
        </div>
        <div class="flex items-center space-x-6">
          <div v-if="authStore.hasFreePhotosAvailable" class="text-right">
            <p class="text-sm font-medium text-green-700">Free Photos</p>
            <p class="text-2xl font-bold text-green-600">{{ authStore.freePhotosRemaining }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-medium text-gray-900">Available Credits</p>
            <p class="text-2xl font-bold text-primary-600">{{ authStore.user?.credits || 0 }}</p>
          </div>
          <RouterLink
            to="/pricing"
            class="btn-secondary"
          >
            <CreditCardIcon class="h-5 w-5 mr-2" />
            Buy Credits
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <RouterLink
        to="/upload"
        class="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-6 text-white hover:from-primary-600 hover:to-primary-700 transition-all duration-200 transform hover:scale-105"
      >
        <div class="flex items-center">
          <ArrowUpTrayIcon class="h-8 w-8 mr-4" />
          <div>
            <h3 class="text-lg font-semibold">Upload New Photo</h3>
            <p class="text-primary-100">Start enhancing your photos with AI</p>
          </div>
        </div>
      </RouterLink>

      <RouterLink
        to="/photos"
        class="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-primary-300 hover:bg-primary-50 transition-all duration-200"
      >
        <div class="flex items-center">
          <PhotoIcon class="h-8 w-8 mr-4 text-gray-600" />
          <div>
            <h3 class="text-lg font-semibold text-gray-900">View All Photos</h3>
            <p class="text-gray-600">Browse your photo collection</p>
          </div>
        </div>
      </RouterLink>
    </div>

    <!-- Storage Information -->
    <StorageInfo @cleanup-requested="handleCleanupRequested" />

    <!-- Statistics -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white rounded-lg p-6 shadow">
        <div class="flex items-center">
          <PhotoIcon class="h-8 w-8 text-gray-600" />
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Photos</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.total }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg p-6 shadow">
        <div class="flex items-center">
          <ClockIcon class="h-8 w-8 text-yellow-600" />
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Processing</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.pending + stats.processing }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg p-6 shadow">
        <div class="flex items-center">
          <CheckCircleIcon class="h-8 w-8 text-green-600" />
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Completed</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.completed }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg p-6 shadow">
        <div class="flex items-center">
          <XCircleIcon class="h-8 w-8 text-red-600" />
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Failed</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.failed }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Photos -->
    <div class="bg-white shadow rounded-lg">
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-medium text-gray-900">Recent Photos</h2>
          <RouterLink
            to="/photos"
            class="text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            View all
          </RouterLink>
        </div>
      </div>

      <div v-if="isLoading" class="p-6">
        <div class="animate-pulse space-y-4">
          <div v-for="i in 3" :key="i" class="flex items-center space-x-4">
            <div class="h-16 w-16 bg-gray-200 rounded-lg"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-gray-200 rounded w-1/4"></div>
              <div class="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="recentPhotos.length === 0" class="p-6 text-center">
        <PhotoIcon class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900">No photos yet</h3>
        <p class="mt-1 text-sm text-gray-500">Get started by uploading your first photo.</p>
        <div class="mt-6">
          <RouterLink to="/upload" class="btn-primary">
            <ArrowUpTrayIcon class="h-5 w-5 mr-2" />
            Upload Photo
          </RouterLink>
        </div>
      </div>

      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="photo in recentPhotos"
          :key="photo.id"
          class="p-6 hover:bg-gray-50 transition-colors duration-200"
        >
          <div class="flex items-center space-x-4">
            <div class="flex-shrink-0">
              <img
                v-if="photo.originalImage?.url"
                :src="photo.originalImage.url"
                :alt="photo.originalImage.name"
                class="h-16 w-16 rounded-lg object-cover"
              />
              <div v-else class="h-16 w-16 bg-gray-200 rounded-lg flex items-center justify-center">
                <PhotoIcon class="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2">
                <p class="text-sm font-medium text-gray-900 truncate">{{ photo.originalImage.name }}</p>
                <component
                  :is="getStatusIcon(photo.status)"
                  :class="['h-4 w-4', getStatusColor(photo.status)]"
                />
              </div>
              <p class="text-sm text-gray-500">{{ formatDate(photo.createdAt) }}</p>
              <div class="flex items-center mt-1">
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    photo.status === 'completed' ? 'bg-green-100 text-green-800' :
                    photo.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    photo.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  ]"
                >
                  {{ photo.status.charAt(0).toUpperCase() + photo.status.slice(1) }}
                </span>
                <span v-if="photo.enhancementType" class="ml-2 text-xs text-gray-500">
                  {{ photo.enhancementType }}
                </span>
              </div>
            </div>
            <div class="flex-shrink-0">
              <RouterLink
                :to="`/photos/${photo.id}`"
                class="text-primary-600 hover:text-primary-500 text-sm font-medium"
              >
                View
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>