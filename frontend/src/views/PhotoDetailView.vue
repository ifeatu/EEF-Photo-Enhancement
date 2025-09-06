<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePhotosStore } from '@/stores/photos'
import { 
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  PhotoIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const photosStore = usePhotosStore()

const isLoading = ref(true)
const showComparison = ref(false)
const error = ref('')

const photoId = computed(() => parseInt(route.params.id as string))

const photo = computed(() => photosStore.currentPhoto)

const canDownload = computed(() => {
  return photo.value?.status === 'completed' && photo.value?.enhancedImage?.url
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
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatFileSize = (bytes: number) => {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

const downloadImage = async (url: string, filename: string) => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    window.URL.revokeObjectURL(downloadUrl)
  } catch (err) {
    console.error('Download failed:', err)
    error.value = 'Failed to download image'
  }
}

const downloadOriginal = () => {
  if (photo.value?.originalImage?.url) {
    downloadImage(photo.value.originalImage.url, `original_${photo.value.originalImage.name}`)
  }
}

const downloadEnhanced = () => {
  if (photo.value?.enhancedImage?.url) {
    downloadImage(photo.value.enhancedImage.url, `enhanced_${photo.value.originalImage.name}`)
  }
}

const goBack = () => {
  router.push('/photos')
}

const retryEnhancement = async () => {
  if (!photo.value) return
  
  try {
    await photosStore.enhancePhoto(photo.value.id)
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || 'Failed to retry enhancement'
  }
}

onMounted(async () => {
  try {
    await photosStore.fetchPhoto(photoId.value)
  } catch (err) {
    console.error('Failed to fetch photo:', err)
    error.value = 'Failed to load photo details'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <button
        @click="goBack"
        class="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
      >
        <ArrowLeftIcon class="h-5 w-5 mr-2" />
        Back to Photos
      </button>
      
      <div v-if="photo" class="flex items-center space-x-4">
        <button
          v-if="photo.originalImage?.url"
          @click="downloadOriginal"
          class="btn-secondary"
        >
          <ArrowDownTrayIcon class="h-5 w-5 mr-2" />
          Download Original
        </button>
        
        <button
          v-if="canDownload"
          @click="downloadEnhanced"
          class="btn-primary"
        >
          <ArrowDownTrayIcon class="h-5 w-5 mr-2" />
          Download Enhanced
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="bg-white shadow rounded-lg p-8">
      <div class="animate-pulse space-y-4">
        <div class="h-8 bg-gray-200 rounded w-1/3"></div>
        <div class="h-64 bg-gray-200 rounded"></div>
        <div class="space-y-2">
          <div class="h-4 bg-gray-200 rounded w-1/4"></div>
          <div class="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-white shadow rounded-lg p-8 text-center">
      <ExclamationTriangleIcon class="mx-auto h-12 w-12 text-red-500" />
      <h3 class="mt-4 text-lg font-medium text-gray-900">Error Loading Photo</h3>
      <p class="mt-2 text-sm text-gray-600">{{ error }}</p>
      <button @click="goBack" class="mt-4 btn-primary">
        Back to Photos
      </button>
    </div>

    <!-- Photo Details -->
    <div v-else-if="photo" class="space-y-6">
      <!-- Photo Info -->
      <div class="bg-white shadow rounded-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ photo.originalImage.name }}</h1>
            <p class="text-sm text-gray-600 mt-1">Uploaded {{ formatDate(photo.createdAt) }}</p>
          </div>
          
          <div class="flex items-center space-x-3">
            <span
              :class="[
                'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                getStatusColor(photo.status)
              ]"
            >
              <component
                :is="getStatusIcon(photo.status)"
                class="h-4 w-4 mr-2"
              />
              {{ photo.status.charAt(0).toUpperCase() + photo.status.slice(1) }}
            </span>
            
            <span v-if="photo.enhancementType" class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
              <SparklesIcon class="h-4 w-4 mr-2" />
              {{ photo.enhancementType }}
            </span>
          </div>
        </div>

        <!-- Status-specific content -->
        <div v-if="photo.status === 'processing'" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-center">
            <ClockIcon class="h-5 w-5 text-blue-600 mr-3" />
            <div class="flex-1">
              <h3 class="text-sm font-medium text-blue-900">Enhancement in Progress</h3>
              <p class="text-sm text-blue-700 mt-1">Your photo is being enhanced. This usually takes 1-3 minutes.</p>
              <div class="mt-3 w-full bg-blue-200 rounded-full h-2">
                <div class="bg-blue-600 h-2 rounded-full animate-pulse" style="width: 60%"></div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="photo.status === 'failed'" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <XCircleIcon class="h-5 w-5 text-red-600 mr-3" />
              <div>
                <h3 class="text-sm font-medium text-red-900">Enhancement Failed</h3>
                <p class="text-sm text-red-700 mt-1">{{ photo.errorMessage || 'An error occurred during enhancement.' }}</p>
              </div>
            </div>
            <button @click="retryEnhancement" class="btn-secondary text-sm">
              Retry Enhancement
            </button>
          </div>
        </div>

        <div v-else-if="photo.status === 'completed'" class="bg-green-50 border border-green-200 rounded-lg p-4">
          <div class="flex items-center">
            <CheckCircleIcon class="h-5 w-5 text-green-600 mr-3" />
            <div>
              <h3 class="text-sm font-medium text-green-900">Enhancement Complete</h3>
              <p class="text-sm text-green-700 mt-1">Your photo has been successfully enhanced and is ready for download.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Image Comparison Toggle -->
      <div v-if="photo.status === 'completed' && photo.enhancedImage" class="bg-white shadow rounded-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium text-gray-900">Image Comparison</h2>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-600">Side by side</span>
            <button
              @click="showComparison = !showComparison"
              :class="[
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2',
                showComparison ? 'bg-primary-600' : 'bg-gray-200'
              ]"
            >
              <span
                :class="[
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  showComparison ? 'translate-x-5' : 'translate-x-0'
                ]"
              />
            </button>
            <span class="text-sm text-gray-600">Before/After</span>
          </div>
        </div>

        <!-- Image Display -->
        <div v-if="showComparison" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Original Image -->
          <div class="space-y-2">
            <h3 class="text-sm font-medium text-gray-900">Original</h3>
            <div class="relative bg-gray-100 rounded-lg overflow-hidden">
              <img
                :src="photo.originalImage.url"
                :alt="photo.originalImage.name"
                class="w-full h-auto"
              />
            </div>
            <div class="text-xs text-gray-500">
              {{ formatFileSize(photo.originalImage.size) }} • {{ photo.originalImage.mime }}
            </div>
          </div>

          <!-- Enhanced Image -->
          <div class="space-y-2">
            <h3 class="text-sm font-medium text-gray-900">Enhanced</h3>
            <div class="relative bg-gray-100 rounded-lg overflow-hidden">
              <img
                :src="photo.enhancedImage.url"
                :alt="`Enhanced ${photo.originalImage.name}`"
                class="w-full h-auto"
              />
            </div>
            <div class="text-xs text-gray-500">
              {{ formatFileSize(photo.enhancedImage.size) }} • {{ photo.enhancedImage.mime }}
            </div>
          </div>
        </div>

        <!-- Single Image Display -->
        <div v-else class="space-y-2">
          <div class="relative bg-gray-100 rounded-lg overflow-hidden">
            <img
              :src="photo.enhancedImage.url"
              :alt="`Enhanced ${photo.originalImage.name}`"
              class="w-full h-auto max-h-96 object-contain mx-auto"
            />
          </div>
        </div>
      </div>

      <!-- Original Image Only (for non-completed photos) -->
      <div v-else class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Original Image</h2>
        <div class="space-y-2">
          <div class="relative bg-gray-100 rounded-lg overflow-hidden">
            <img
              :src="photo.originalImage.url"
              :alt="photo.originalImage.name"
              class="w-full h-auto max-h-96 object-contain mx-auto"
            />
          </div>
          <div class="text-sm text-gray-500">
            {{ formatFileSize(photo.originalImage.size) }} • {{ photo.originalImage.mime }}
          </div>
        </div>
      </div>

      <!-- Technical Details -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Technical Details</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-3">
            <div>
              <dt class="text-sm font-medium text-gray-500">File Name</dt>
              <dd class="text-sm text-gray-900">{{ photo.originalImage.name }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">File Size</dt>
              <dd class="text-sm text-gray-900">{{ formatFileSize(photo.originalImage.size) }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">File Type</dt>
              <dd class="text-sm text-gray-900">{{ photo.originalImage.mime }}</dd>
            </div>
          </div>
          <div class="space-y-3">
            <div>
              <dt class="text-sm font-medium text-gray-500">Enhancement Type</dt>
              <dd class="text-sm text-gray-900">{{ photo.enhancementType || 'N/A' }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Upload Date</dt>
              <dd class="text-sm text-gray-900">{{ formatDate(photo.createdAt) }}</dd>
            </div>
            <div v-if="photo.updatedAt !== photo.createdAt">
              <dt class="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd class="text-sm text-gray-900">{{ formatDate(photo.updatedAt) }}</dd>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>