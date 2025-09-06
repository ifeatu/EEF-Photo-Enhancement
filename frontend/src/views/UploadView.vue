<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePhotosStore } from '@/stores/photos'
import { 
  ArrowUpTrayIcon, 
  PhotoIcon,
  XMarkIcon,
  SparklesIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const photosStore = usePhotosStore()

const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const enhancementType = ref<'restore' | 'enhance' | 'colorize'>('enhance')
const isDragOver = ref(false)
const isUploading = ref(false)
const error = ref('')

const enhancementOptions = [
  { value: 'enhance' as const, label: 'General Enhancement', description: 'Overall quality improvement' },
  { value: 'restore' as const, label: 'Photo Restoration', description: 'Restore old and damaged photos' },
  { value: 'colorize' as const, label: 'Colorization', description: 'Add color to black and white photos' }
]

const canUpload = computed(() => {
  return selectedFile.value && !isUploading.value && (authStore.hasFreePhotosAvailable || (authStore.user?.credits || 0) > 0)
})

const hasCredits = computed(() => {
  return (authStore.user?.credits || 0) > 0
})

const canEnhance = computed(() => {
  return authStore.hasFreePhotosAvailable || hasCredits.value
})

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectFile(file)
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false
  
  const file = event.dataTransfer?.files[0]
  if (file) {
    selectFile(file)
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = true
}

function handleDragLeave() {
  isDragOver.value = false
}

async function selectFile(file: File) {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    error.value = 'Please select a valid image file'
    return
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    error.value = 'File size must be less than 10MB'
    return
  }

  error.value = ''
  
  // Compress image if it's larger than 2MB
  if (file.size > 2 * 1024 * 1024) {
    try {
      const compressedFile = await compressImage(file)
      selectedFile.value = compressedFile
    } catch (err) {
      console.warn('Image compression failed, using original:', err)
      selectedFile.value = file
    }
  } else {
    selectedFile.value = file
  }
  
  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    previewUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(selectedFile.value!)
}

function removeFile() {
  selectedFile.value = null
  previewUrl.value = null
  error.value = ''
}

async function uploadPhoto() {
  if (!selectedFile.value || !canEnhance.value) return

  try {
    isUploading.value = true
    error.value = ''

    await photosStore.uploadPhoto(selectedFile.value, enhancementType.value)
    
    // Redirect to photos page after successful upload
    router.push('/photos')
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || 'Upload failed. Please try again.'
  } finally {
    isUploading.value = false
  }
}

function triggerFileInput() {
  const input = document.getElementById('file-input') as HTMLInputElement
  input?.click()
}

// Image compression utility
function compressImage(file: File, quality: number = 0.8, maxWidth: number = 1920): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      canvas.width = width
      canvas.height = height
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            resolve(compressedFile)
          } else {
            reject(new Error('Canvas toBlob failed'))
          }
        },
        file.type,
        quality
      )
    }
    
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = URL.createObjectURL(file)
  })
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-8">
    <!-- Header -->
    <div class="text-center">
      <SparklesIcon class="mx-auto h-12 w-12 text-primary-600" />
      <h1 class="mt-4 text-3xl font-bold text-gray-900">Upload Your Photo</h1>
      <p class="mt-2 text-lg text-gray-600">
        Transform your photos with AI-powered enhancement
      </p>
    </div>

    <!-- Free Tier & Credits Status -->
    <div v-if="authStore.hasFreePhotosAvailable" class="rounded-md bg-green-50 p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-green-800">
            Free photos available!
          </h3>
          <div class="mt-2 text-sm text-green-700">
            <p>You have {{ authStore.freePhotosRemaining }} free photo enhancement{{ authStore.freePhotosRemaining === 1 ? '' : 's' }} remaining.</p>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else-if="!hasCredits" class="rounded-md bg-yellow-50 p-4">
      <div class="flex">
        <ExclamationTriangleIcon class="h-5 w-5 text-yellow-400" />
        <div class="ml-3">
          <h3 class="text-sm font-medium text-yellow-800">
            No credits available
          </h3>
          <div class="mt-2 text-sm text-yellow-700">
            <p>You've used your 2 free photos. Purchase credits to continue enhancing photos.</p>
          </div>
          <div class="mt-4">
            <div class="flex space-x-3">
              <router-link
                to="/pricing"
                class="bg-yellow-100 px-3 py-2 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-200"
              >
                Buy Credits
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload Area -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div class="p-6">
        <div v-if="!selectedFile">
          <!-- File Drop Zone -->
          <div
            :class="[
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200',
              isDragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
            ]"
            @drop="handleDrop"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
          >
            <ArrowUpTrayIcon class="mx-auto h-12 w-12 text-gray-400" />
            <h3 class="mt-4 text-lg font-medium text-gray-900">
              Drop your photo here or click to browse
            </h3>
            <p class="mt-2 text-sm text-gray-600">
              Supports JPG, PNG, WebP up to 10MB
            </p>
            <button
              type="button"
              class="mt-4 btn-primary"
              @click="triggerFileInput"
              :disabled="!canEnhance"
            >
              <PhotoIcon class="h-5 w-5 mr-2" />
              Choose Photo
            </button>
            <input
              id="file-input"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleFileSelect"
            />
          </div>
        </div>

        <div v-else>
          <!-- File Preview -->
          <div class="space-y-6">
            <div class="relative">
              <img
                :src="previewUrl!"
                :alt="selectedFile.name"
                class="w-full h-64 object-contain bg-gray-50 rounded-lg"
              />
              <button
                type="button"
                class="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-50"
                @click="removeFile"
              >
                <XMarkIcon class="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-900 mb-2">File Details</h4>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-600">Name:</span>
                  <span class="ml-2 text-gray-900">{{ selectedFile.name }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Size:</span>
                  <span class="ml-2 text-gray-900">{{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Enhancement Options -->
    <div v-if="selectedFile" class="bg-white shadow rounded-lg">
      <div class="p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Enhancement Type</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label
            v-for="option in enhancementOptions"
            :key="option.value"
            :class="[
              'relative flex cursor-pointer rounded-lg border p-4 focus:outline-none transition-colors duration-200',
              enhancementType === option.value
                ? 'border-primary-600 ring-2 ring-primary-600 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            ]"
          >
            <input
              v-model="enhancementType"
              type="radio"
              :value="option.value"
              class="sr-only"
            />
            <div class="flex flex-1">
              <div class="flex flex-col">
                <span
                  :class="[
                    'block text-sm font-medium',
                    enhancementType === option.value ? 'text-primary-900' : 'text-gray-900'
                  ]"
                >
                  {{ option.label }}
                </span>
                <span
                  :class="[
                    'block text-sm',
                    enhancementType === option.value ? 'text-primary-700' : 'text-gray-500'
                  ]"
                >
                  {{ option.description }}
                </span>
              </div>
            </div>
            <div
              v-if="enhancementType === option.value"
              class="flex-shrink-0 text-primary-600"
            >
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
          </label>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="rounded-md bg-red-50 p-4">
      <div class="text-sm text-red-700">{{ error }}</div>
    </div>

    <!-- Upload Button -->
    <div v-if="selectedFile" class="bg-white shadow rounded-lg p-6">
      <div class="flex items-center justify-between">
        <div>
          <p v-if="authStore.hasFreePhotosAvailable" class="text-sm text-green-600">
            This will use <span class="font-medium">1 free photo</span> enhancement.
          </p>
          <p v-else class="text-sm text-gray-600">
            This will use <span class="font-medium">1 credit</span> from your account.
          </p>
          <p class="text-sm text-gray-500">
            <span v-if="authStore.hasFreePhotosAvailable">
              You have <span class="font-medium">{{ authStore.freePhotosRemaining }} free photo{{ authStore.freePhotosRemaining === 1 ? '' : 's' }}</span> remaining.
            </span>
            <span v-else>
              You have <span class="font-medium">{{ authStore.user?.credits || 0 }} credits</span> remaining.
            </span>
          </p>
        </div>
        <button
          type="button"
          :disabled="!canUpload"
          class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          @click="uploadPhoto"
        >
          <svg
            v-if="isUploading"
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
          <SparklesIcon v-else class="h-5 w-5 mr-2" />
          {{ isUploading ? 'Uploading...' : 'Enhance Photo' }}
        </button>
      </div>
    </div>
  </div>
</template>