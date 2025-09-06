<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { usePhotosStore } from '@/stores/photos'
import { 
  PhotoIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon
} from '@heroicons/vue/24/outline'

const photosStore = usePhotosStore()

const searchQuery = ref('')
const statusFilter = ref('all')
const sortBy = ref('newest')
const isLoading = ref(true)

const statusOptions = [
  { value: 'all', label: 'All Photos' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' }
]

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name', label: 'Name A-Z' }
]

const filteredPhotos = computed(() => {
  let filtered = photosStore.photos

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(photo => 
      photo.originalImage.name.toLowerCase().includes(query)
    )
  }

  // Filter by status
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter(photo => photo.status === statusFilter.value)
  }

  // Sort photos
  filtered = [...filtered].sort((a, b) => {
    switch (sortBy.value) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'name':
        return a.originalImage.name.localeCompare(b.originalImage.name)
      default:
        return 0
    }
  })

  return filtered
})

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
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
      return 'text-yellow-600 bg-yellow-100'
    case 'processing':
      return 'text-blue-600 bg-blue-100'
    case 'completed':
      return 'text-green-600 bg-green-100'
    case 'failed':
      return 'text-red-600 bg-red-100'
    default:
      return 'text-gray-600 bg-gray-100'
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

const getImageUrl = (photo: any) => {
  // Show enhanced image if available and completed, otherwise show original
  if (photo.status === 'completed' && photo.enhancedImage?.url) {
    return photo.enhancedImage.url
  }
  return photo.originalImage?.url
}

const onImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.opacity = '1'
}

const onImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
  console.warn('Failed to load image:', img.src)
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
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">My Photos</h1>
        <p class="mt-1 text-sm text-gray-600">
          Manage and view your enhanced photos
        </p>
      </div>
      <div class="mt-4 sm:mt-0">
        <RouterLink to="/upload" class="btn-primary">
          <ArrowUpTrayIcon class="h-5 w-5 mr-2" />
          Upload New Photo
        </RouterLink>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="bg-white shadow rounded-lg p-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Search -->
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon class="h-5 w-5 text-gray-400" />
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search photos..."
            class="input-field pl-10"
          />
        </div>

        <!-- Status Filter -->
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FunnelIcon class="h-5 w-5 text-gray-400" />
          </div>
          <select v-model="statusFilter" class="input-field pl-10">
            <option v-for="option in statusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>

        <!-- Sort -->
        <div>
          <select v-model="sortBy" class="input-field">
            <option v-for="option in sortOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Photos Grid -->
    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div v-for="i in 8" :key="i" class="bg-white rounded-lg shadow overflow-hidden animate-pulse">
        <div class="h-48 bg-gray-200"></div>
        <div class="p-4 space-y-2">
          <div class="h-4 bg-gray-200 rounded w-3/4"></div>
          <div class="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    </div>

    <div v-else-if="filteredPhotos.length === 0" class="text-center py-12">
      <PhotoIcon class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        {{ searchQuery || statusFilter !== 'all' ? 'No photos found' : 'No photos yet' }}
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ searchQuery || statusFilter !== 'all' 
          ? 'Try adjusting your search or filters' 
          : 'Get started by uploading your first photo.' 
        }}
      </p>
      <div v-if="!searchQuery && statusFilter === 'all'" class="mt-6">
        <RouterLink to="/upload" class="btn-primary">
          <ArrowUpTrayIcon class="h-5 w-5 mr-2" />
          Upload Photo
        </RouterLink>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div
        v-for="photo in filteredPhotos"
        :key="photo.id"
        class="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow duration-200"
      >
        <!-- Image -->
        <div class="relative h-48 bg-gray-100">
          <img
            v-if="getImageUrl(photo)"
            :src="getImageUrl(photo)"
            :alt="photo.originalImage.name"
            class="w-full h-full object-contain transition-opacity duration-300"
            loading="lazy"
            decoding="async"
            @load="onImageLoad"
            @error="onImageError"
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <PhotoIcon class="h-12 w-12 text-gray-400" />
          </div>
          
          <!-- Status Badge -->
          <div class="absolute top-2 left-2">
            <span
              :class="[
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                getStatusColor(photo.status)
              ]"
            >
              <component
                :is="getStatusIcon(photo.status)"
                class="h-3 w-3 mr-1"
              />
              {{ photo.status.charAt(0).toUpperCase() + photo.status.slice(1) }}
            </span>
          </div>

          <!-- Enhancement Type Badge -->
          <div v-if="photo.enhancementType" class="absolute top-2 right-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              {{ photo.enhancementType }}
            </span>
          </div>

          <!-- View Button Overlay -->
          <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
            <RouterLink
              :to="`/photos/${photo.id}`"
              class="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors duration-200 flex items-center"
            >
              <EyeIcon class="h-4 w-4 mr-2" />
              View Details
            </RouterLink>
          </div>
        </div>

        <!-- Photo Info -->
        <div class="p-4">
          <h3 class="text-sm font-medium text-gray-900 truncate">
            {{ photo.originalImage.name }}
          </h3>
          <p class="text-xs text-gray-500 mt-1">
            {{ formatDate(photo.createdAt) }}
          </p>
          
          <!-- Progress for processing photos -->
          <div v-if="photo.status === 'processing'" class="mt-2">
            <div class="w-full bg-gray-200 rounded-full h-1.5">
              <div class="bg-blue-600 h-1.5 rounded-full animate-pulse" style="width: 60%"></div>
            </div>
            <p class="text-xs text-blue-600 mt-1">Processing...</p>
          </div>

          <!-- Error message for failed photos -->
          <div v-else-if="photo.status === 'failed'" class="mt-2">
            <p class="text-xs text-red-600">{{ photo.errorMessage || 'Enhancement failed' }}</p>
          </div>

          <!-- File size -->
          <div v-else class="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>{{ (photo.originalImage.size / 1024 / 1024).toFixed(2) }} MB</span>
            <RouterLink
              :to="`/photos/${photo.id}`"
              class="text-primary-600 hover:text-primary-500 font-medium"
            >
              View →
            </RouterLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Load More Button (if needed for pagination) -->
    <div v-if="filteredPhotos.length > 0" class="text-center">
      <p class="text-sm text-gray-500">
        Showing {{ filteredPhotos.length }} of {{ photosStore.photos.length }} photos
      </p>
    </div>
  </div>
</template>