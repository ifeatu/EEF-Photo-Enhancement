<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { 
  ChartBarIcon, 
  UsersIcon, 
  PhotoIcon, 
  CurrencyDollarIcon,
  ServerIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

interface AdminStats {
  totalUsers: number
  totalPhotos: number
  photosProcessedToday: number
  photosProcessedThisWeek: number
  photosProcessedThisMonth: number
  totalRevenue: number
  revenueThisMonth: number
  averageProcessingTime: number
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical'
    uptime: number
    memoryUsage: number
    diskUsage: number
  }
  storageStats: {
    totalStorageUsed: number
    totalStorageLimit: number
    expiredPhotosCount: number
    usersNearLimit: number
  }
  recentActivity: Array<{
    id: number
    type: 'photo_upload' | 'photo_processed' | 'user_registered' | 'purchase'
    description: string
    timestamp: string
    user?: string
  }>
}

const authStore = useAuthStore()
const router = useRouter()

const stats = ref<AdminStats | null>(null)
const isLoading = ref(true)
const error = ref('')
const selectedTimeRange = ref('7d')

const timeRanges = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' }
]

const systemHealthColor = computed(() => {
  if (!stats.value) return 'text-gray-500'
  switch (stats.value.systemHealth.status) {
    case 'healthy': return 'text-green-600'
    case 'warning': return 'text-yellow-600'
    case 'critical': return 'text-red-600'
    default: return 'text-gray-500'
  }
})

const systemHealthIcon = computed(() => {
  if (!stats.value) return ServerIcon
  switch (stats.value.systemHealth.status) {
    case 'healthy': return CheckCircleIcon
    case 'warning': return ExclamationTriangleIcon
    case 'critical': return ExclamationTriangleIcon
    default: return ServerIcon
  }
})

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount / 100) // Assuming amount is in cents
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${days}d ${hours}h ${minutes}m`
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'photo_upload': return PhotoIcon
    case 'photo_processed': return CheckCircleIcon
    case 'user_registered': return UsersIcon
    case 'purchase': return CurrencyDollarIcon
    default: return ClockIcon
  }
}

const getActivityColor = (type: string) => {
  switch (type) {
    case 'photo_upload': return 'text-blue-600'
    case 'photo_processed': return 'text-green-600'
    case 'user_registered': return 'text-purple-600'
    case 'purchase': return 'text-yellow-600'
    default: return 'text-gray-600'
  }
}

async function loadAdminStats() {
  try {
    isLoading.value = true
    error.value = ''
    
    // Mock data for demonstration - replace with actual API calls
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    stats.value = {
      totalUsers: 1247,
      totalPhotos: 8934,
      photosProcessedToday: 156,
      photosProcessedThisWeek: 892,
      photosProcessedThisMonth: 3421,
      totalRevenue: 124750, // in cents
      revenueThisMonth: 18950, // in cents
      averageProcessingTime: 45, // seconds
      systemHealth: {
        status: 'healthy',
        uptime: 2592000, // 30 days in seconds
        memoryUsage: 68, // percentage
        diskUsage: 42 // percentage
      },
      storageStats: {
        totalStorageUsed: 1073741824 * 45, // 45GB
        totalStorageLimit: 1073741824 * 100, // 100GB
        expiredPhotosCount: 234,
        usersNearLimit: 12
      },
      recentActivity: [
        {
          id: 1,
          type: 'photo_processed',
          description: 'Photo enhancement completed',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          user: 'john.doe@example.com'
        },
        {
          id: 2,
          type: 'user_registered',
          description: 'New user registration',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          user: 'jane.smith@example.com'
        },
        {
          id: 3,
          type: 'purchase',
          description: 'Credit package purchased',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          user: 'mike.wilson@example.com'
        },
        {
          id: 4,
          type: 'photo_upload',
          description: 'New photo uploaded',
          timestamp: new Date(Date.now() - 1200000).toISOString(),
          user: 'sarah.johnson@example.com'
        }
      ]
    }
  } catch (err: any) {
    error.value = 'Failed to load admin statistics'
    console.error('Admin stats error:', err)
  } finally {
    isLoading.value = false
  }
}

async function performCleanup() {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5992/api'
    const response = await fetch(`${API_BASE_URL}/photos/admin/cleanup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      await loadAdminStats() // Refresh stats
    }
  } catch (error) {
    console.error('Failed to perform cleanup:', error)
  }
}

onMounted(() => {
  // Check if user is admin
  if (!authStore.user || authStore.user.role?.type !== 'admin') {
    router.push('/dashboard')
    return
  }
  
  loadAdminStats()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-white shadow rounded-lg p-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p class="mt-1 text-sm text-gray-600">
            Monitor system performance and user activity
          </p>
        </div>
        <div class="flex items-center space-x-4">
          <select 
            v-model="selectedTimeRange" 
            @change="loadAdminStats"
            class="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option v-for="range in timeRanges" :key="range.value" :value="range.value">
              {{ range.label }}
            </option>
          </select>
          <button
            @click="loadAdminStats"
            :disabled="isLoading"
            class="btn-primary"
          >
            {{ isLoading ? 'Loading...' : 'Refresh' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <div class="text-red-800">{{ error }}</div>
    </div>

    <div v-else-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="i in 8" :key="i" class="bg-white rounded-lg shadow p-6 animate-pulse">
        <div class="h-4 bg-gray-200 rounded mb-2"></div>
        <div class="h-8 bg-gray-200 rounded"></div>
      </div>
    </div>

    <div v-else-if="stats" class="space-y-6">
      <!-- Key Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <UsersIcon class="h-8 w-8 text-blue-600" />
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Total Users</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.totalUsers.toLocaleString() }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <PhotoIcon class="h-8 w-8 text-green-600" />
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Total Photos</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.totalPhotos.toLocaleString() }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <ChartBarIcon class="h-8 w-8 text-purple-600" />
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Processed Today</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.photosProcessedToday }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <CurrencyDollarIcon class="h-8 w-8 text-yellow-600" />
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Revenue (Month)</p>
              <p class="text-2xl font-bold text-gray-900">{{ formatCurrency(stats.revenueThisMonth) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- System Health & Storage -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- System Health -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">System Health</h3>
            <component 
              :is="systemHealthIcon" 
              :class="systemHealthColor"
              class="h-6 w-6"
            />
          </div>
          
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-sm text-gray-600 mb-1">
                <span>Memory Usage</span>
                <span>{{ stats.systemHealth.memoryUsage }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div 
                  class="bg-blue-600 h-2 rounded-full"
                  :style="{ width: `${stats.systemHealth.memoryUsage}%` }"
                ></div>
              </div>
            </div>
            
            <div>
              <div class="flex justify-between text-sm text-gray-600 mb-1">
                <span>Disk Usage</span>
                <span>{{ stats.systemHealth.diskUsage }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div 
                  class="bg-green-600 h-2 rounded-full"
                  :style="{ width: `${stats.systemHealth.diskUsage}%` }"
                ></div>
              </div>
            </div>
            
            <div class="text-sm text-gray-600">
              <span class="font-medium">Uptime:</span> {{ formatUptime(stats.systemHealth.uptime) }}
            </div>
            
            <div class="text-sm text-gray-600">
              <span class="font-medium">Avg Processing:</span> {{ formatDuration(stats.averageProcessingTime) }}
            </div>
          </div>
        </div>

        <!-- Storage Statistics -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">Storage Overview</h3>
            <button
              @click="performCleanup"
              class="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
            >
              Cleanup Expired
            </button>
          </div>
          
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-sm text-gray-600 mb-1">
                <span>{{ formatBytes(stats.storageStats.totalStorageUsed) }} used</span>
                <span>{{ formatBytes(stats.storageStats.totalStorageLimit) }} total</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div 
                  class="bg-blue-600 h-2 rounded-full"
                  :style="{ width: `${(stats.storageStats.totalStorageUsed / stats.storageStats.totalStorageLimit) * 100}%` }"
                ></div>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="bg-yellow-50 p-3 rounded">
                <div class="font-medium text-yellow-800">{{ stats.storageStats.expiredPhotosCount }}</div>
                <div class="text-yellow-600">Expired Photos</div>
              </div>
              <div class="bg-red-50 p-3 rounded">
                <div class="font-medium text-red-800">{{ stats.storageStats.usersNearLimit }}</div>
                <div class="text-red-600">Users Near Limit</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Processing Statistics -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Processing Statistics</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="text-center">
            <div class="text-3xl font-bold text-blue-600">{{ stats.photosProcessedThisWeek }}</div>
            <div class="text-sm text-gray-600">This Week</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-green-600">{{ stats.photosProcessedThisMonth }}</div>
            <div class="text-sm text-gray-600">This Month</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-purple-600">{{ formatCurrency(stats.totalRevenue) }}</div>
            <div class="text-sm text-gray-600">Total Revenue</div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        <div class="space-y-4">
          <div 
            v-for="activity in stats.recentActivity" 
            :key="activity.id"
            class="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg"
          >
            <component 
              :is="getActivityIcon(activity.type)" 
              :class="getActivityColor(activity.type)"
              class="h-5 w-5 flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900">{{ activity.description }}</p>
              <p class="text-sm text-gray-500">{{ activity.user }}</p>
            </div>
            <div class="text-sm text-gray-500">
              {{ new Date(activity.timestamp).toLocaleTimeString() }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>