<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { CloudIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { stripeService, type StorageInfo } from '@/services/stripe'
import { usePhotosStore } from '@/stores/photos'

interface Emits {
  cleanupRequested: []
}

const emit = defineEmits<Emits>()
const photosStore = usePhotosStore()

const storageInfo = ref<StorageInfo | null>(null)
const isLoading = ref(true)
const error = ref('')

const storagePercentage = computed(() => {
  if (!storageInfo.value) return 0
  return Math.min(100, storageInfo.value.usagePercentage)
})

const storageColor = computed(() => {
  const percentage = storagePercentage.value
  if (percentage >= 95) return 'bg-red-500'
  if (percentage >= 80) return 'bg-yellow-500'
  return 'bg-green-500'
})

const storageWarning = computed(() => {
  const percentage = storagePercentage.value
  if (percentage >= 95) return 'Storage almost full! Clean up expired photos.'
  if (percentage >= 80) return 'Storage getting full. Consider cleaning up old photos.'
  return null
})

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'Never'
  return new Date(dateString).toLocaleDateString()
}

async function loadStorageInfo() {
  try {
    isLoading.value = true
    error.value = ''
    storageInfo.value = await stripeService.getStorageInfo()
  } catch (err: any) {
    error.value = 'Failed to load storage information'
    console.error('Storage info error:', err)
  } finally {
    isLoading.value = false
  }
}

async function requestCleanup() {
  emit('cleanupRequested')
  // Refresh storage info after cleanup
  setTimeout(() => {
    loadStorageInfo()
  }, 1000)
}

onMounted(() => {
  loadStorageInfo()
})

// Expose refresh method for parent components
defineExpose({
  refresh: loadStorageInfo
})
</script>

<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-2">
        <CloudIcon class="h-5 w-5 text-gray-500" />
        <h3 class="text-lg font-medium text-gray-900">Storage Usage</h3>
      </div>
      <button
        @click="loadStorageInfo"
        :disabled="isLoading"
        class="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
      >
        {{ isLoading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <div v-if="error" class="text-red-600 text-sm mb-4">
      {{ error }}
    </div>

    <div v-else-if="isLoading" class="animate-pulse">
      <div class="h-4 bg-gray-200 rounded mb-2"></div>
      <div class="h-2 bg-gray-200 rounded mb-4"></div>
      <div class="grid grid-cols-2 gap-4">
        <div class="h-16 bg-gray-200 rounded"></div>
        <div class="h-16 bg-gray-200 rounded"></div>
      </div>
    </div>

    <div v-else-if="storageInfo" class="space-y-4">
      <!-- Storage Warning -->
      <div v-if="storageWarning" class="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <ExclamationTriangleIcon class="h-5 w-5 text-yellow-600" />
        <span class="text-sm text-yellow-800">{{ storageWarning }}</span>
      </div>

      <!-- Storage Progress Bar -->
      <div>
        <div class="flex justify-between text-sm text-gray-600 mb-1">
          <span>{{ formatBytes(storageInfo.storageUsed) }} used</span>
          <span>{{ formatBytes(storageInfo.storageLimit) }} total</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div 
            :class="storageColor" 
            class="h-2 rounded-full transition-all duration-300"
            :style="{ width: `${storagePercentage}%` }"
          ></div>
        </div>
        <div class="text-xs text-gray-500 mt-1">
          {{ storagePercentage }}% used
        </div>
      </div>

      <!-- Storage Stats -->
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="text-2xl font-bold text-gray-900">{{ storageInfo.photoCount }}</div>
          <div class="text-sm text-gray-600">Total Photos</div>
        </div>
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="text-2xl font-bold text-gray-900">{{ storageInfo.expiredPhotoCount }}</div>
          <div class="text-sm text-gray-600">Expired Photos</div>
        </div>
      </div>

      <!-- Available Storage -->
      <div class="bg-blue-50 rounded-lg p-4">
        <div class="text-lg font-semibold text-blue-900">
          {{ formatBytes(storageInfo.storageAvailable) }} available
        </div>
        <div class="text-sm text-blue-700">
          Last cleanup: {{ formatDate(storageInfo.lastCleanup) }}
        </div>
      </div>

      <!-- Cleanup Button -->
      <div v-if="storageInfo.expiredPhotoCount > 0" class="pt-2">
        <button
          @click="requestCleanup"
          class="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          <TrashIcon class="h-4 w-4" />
          <span>Clean up {{ storageInfo.expiredPhotoCount }} expired photos</span>
        </button>
      </div>
    </div>
  </div>
</template>