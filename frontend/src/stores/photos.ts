import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { photosAPI, type Photo } from '@/services/api'
import { useAuthStore } from './auth'

export const usePhotosStore = defineStore('photos', () => {
  const photos = ref<Photo[]>([])
  const currentPhoto = ref<Photo | null>(null)
  const loading = ref(false)
  const uploading = ref(false)
  const enhancing = ref(false)
  const error = ref<string | null>(null)

  const authStore = useAuthStore()

  const pendingPhotos = computed(() => 
    photos.value.filter(photo => photo.status === 'pending')
  )
  
  const processingPhotos = computed(() => 
    photos.value.filter(photo => photo.status === 'processing')
  )
  
  const completedPhotos = computed(() => 
    photos.value.filter(photo => photo.status === 'completed')
  )
  
  const failedPhotos = computed(() => 
    photos.value.filter(photo => photo.status === 'failed')
  )

  async function fetchPhotos() {
    try {
      loading.value = true
      error.value = null
      
      const response = await photosAPI.getPhotos()
      photos.value = response.data || []
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || 'Failed to fetch photos'
      console.error('Failed to fetch photos:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchPhoto(id: number) {
    try {
      loading.value = true
      error.value = null
      
      const response = await photosAPI.getPhoto(id)
      currentPhoto.value = response.data
      
      // Update the photo in the photos array if it exists
      const index = photos.value.findIndex(p => p.id === id)
      if (index !== -1) {
        photos.value[index] = response.data
      }
      
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || 'Failed to fetch photo'
      console.error('Failed to fetch photo:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function uploadPhoto(file: File, enhancementType: 'restore' | 'enhance' | 'colorize') {
    try {
      uploading.value = true
      error.value = null
      
      const formData = new FormData()
      formData.append('files.originalImage', file)
      formData.append('data', JSON.stringify({
        enhancementType,
        status: 'pending'
      }))
      
      const response = await photosAPI.uploadPhoto(formData)
      const newPhoto = response.data
      
      // Add the new photo to the beginning of the array
      photos.value.unshift(newPhoto)
      
      // Deduct credits from user
      authStore.updateCredits(authStore.userCredits - 1)
      
      return newPhoto
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || 'Failed to upload photo'
      console.error('Failed to upload photo:', err)
      throw err
    } finally {
      uploading.value = false
    }
  }

  async function enhancePhoto(photoId: number) {
    try {
      enhancing.value = true
      error.value = null
      
      const response = await photosAPI.enhancePhoto(photoId)
      
      // Update the photo status in the store
      const index = photos.value.findIndex(p => p.id === photoId)
      if (index !== -1) {
        photos.value[index] = { ...photos.value[index], status: 'processing' }
      }
      
      if (currentPhoto.value?.id === photoId) {
        currentPhoto.value = { ...currentPhoto.value, status: 'processing' }
      }
      
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || 'Failed to enhance photo'
      console.error('Failed to enhance photo:', err)
      throw err
    } finally {
      enhancing.value = false
    }
  }

  function updatePhotoStatus(photoId: number, status: Photo['status'], enhancedImage?: any) {
    const index = photos.value.findIndex(p => p.id === photoId)
    if (index !== -1) {
      photos.value[index] = {
        ...photos.value[index],
        status,
        ...(enhancedImage && { enhancedImage }),
        ...(status === 'completed' && { processingCompletedAt: new Date().toISOString() })
      }
    }
    
    if (currentPhoto.value?.id === photoId) {
      currentPhoto.value = {
        ...currentPhoto.value,
        status,
        ...(enhancedImage && { enhancedImage }),
        ...(status === 'completed' && { processingCompletedAt: new Date().toISOString() })
      }
    }
  }

  function clearError() {
    error.value = null
  }

  function clearCurrentPhoto() {
    currentPhoto.value = null
  }

  // Polling function to check for photo updates
  async function pollPhotoUpdates() {
    const processingPhotoIds = processingPhotos.value.map(p => p.id)
    
    for (const photoId of processingPhotoIds) {
      try {
        await fetchPhoto(photoId)
      } catch (err) {
        console.error(`Failed to poll photo ${photoId}:`, err)
      }
    }
  }

  return {
    photos,
    currentPhoto,
    loading,
    uploading,
    enhancing,
    error,
    pendingPhotos,
    processingPhotos,
    completedPhotos,
    failedPhotos,
    fetchPhotos,
    fetchPhoto,
    uploadPhoto,
    enhancePhoto,
    updatePhotoStatus,
    clearError,
    clearCurrentPhoto,
    pollPhotoUpdates,
  }
})