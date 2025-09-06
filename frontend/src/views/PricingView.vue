<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCreditsStore } from '@/stores/credits'
import PaymentModal from '@/components/PaymentModal.vue'
import { 
  CheckIcon,
  SparklesIcon,
  CreditCardIcon,
  StarIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const creditsStore = useCreditsStore()

const isLoading = ref(true)
const selectedPackage = ref<number | null>(null)
const showPaymentModal = ref(false)
const selectedCreditPackage = ref<any>(null)

const features = [
  'AI-powered photo enhancement',
  'Multiple enhancement types',
  'High-resolution output',
  'Fast processing (1-3 minutes)',
  'Download original and enhanced',
  'No subscription required',
  'Credits never expire'
]

const popularPackageId = computed(() => {
  // Find the package with 100 credits (middle tier)
  const popularPackage = creditsStore.creditPackages.find(pkg => pkg.credits === 100)
  return popularPackage?.id || null
})

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price)
}

const getPricePerCredit = (price: number, credits: number) => {
  return (price / credits).toFixed(3)
}

const getSavingsPercentage = (price: number, credits: number) => {
  // Calculate savings compared to the smallest package
  const smallestPackage = creditsStore.creditPackages
    .filter(pkg => pkg.credits > 0)
    .sort((a, b) => a.credits - b.credits)[0]
  
  if (!smallestPackage || credits <= smallestPackage.credits) return 0
  
  const baseRate = smallestPackage.price / smallestPackage.credits
  const currentRate = price / credits
  const savings = ((baseRate - currentRate) / baseRate) * 100
  
  return Math.round(savings)
}

const selectPackage = (packageId: number) => {
  selectedPackage.value = packageId
}

const purchaseCredits = (packageId: number) => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  const creditPackage = creditsStore.creditPackages.find(pkg => pkg.id === packageId)
  if (creditPackage) {
    selectedCreditPackage.value = creditPackage
    showPaymentModal.value = true
  }
}

const handlePaymentSuccess = () => {
  showPaymentModal.value = false
  selectedCreditPackage.value = null
  // Redirect to dashboard after successful purchase
  router.push('/dashboard')
}

const closePaymentModal = () => {
  showPaymentModal.value = false
  selectedCreditPackage.value = null
}

onMounted(async () => {
  try {
    await creditsStore.fetchCreditPackages()
  } catch (error) {
    console.error('Failed to fetch credit packages:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-12">
    <!-- Header -->
    <div class="text-center">
      <SparklesIcon class="mx-auto h-12 w-12 text-primary-600" />
      <h1 class="mt-4 text-4xl font-bold text-gray-900">
        Choose Your Credit Package
      </h1>
      <p class="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
        Transform your photos with AI-powered enhancement. No subscription required - 
        buy credits once and use them whenever you need.
      </p>
    </div>

    <!-- Current Credits (for logged-in users) -->
    <div v-if="authStore.isAuthenticated" class="bg-primary-50 border border-primary-200 rounded-lg p-6">
      <div class="flex items-center justify-center">
        <CreditCardIcon class="h-6 w-6 text-primary-600 mr-3" />
        <span class="text-lg font-medium text-primary-900">
          You currently have {{ authStore.user?.credits || 0 }} credits
        </span>
      </div>
    </div>

    <!-- Features Section -->
    <div class="bg-white shadow rounded-lg p-8">
      <h2 class="text-2xl font-bold text-gray-900 text-center mb-8">
        What's Included
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="feature in features" :key="feature" class="flex items-center">
          <CheckIcon class="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
          <span class="text-gray-700">{{ feature }}</span>
        </div>
      </div>
    </div>

    <!-- Pricing Cards -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div v-for="i in 3" :key="i" class="bg-white rounded-lg shadow-lg p-8 animate-pulse">
        <div class="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div class="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div class="h-4 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div class="h-12 bg-gray-200 rounded mb-4"></div>
        <div class="space-y-2">
          <div class="h-4 bg-gray-200 rounded"></div>
          <div class="h-4 bg-gray-200 rounded"></div>
          <div class="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>

    <div v-else-if="creditsStore.creditPackages.length === 0" class="text-center py-12">
      <CreditCardIcon class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-4 text-lg font-medium text-gray-900">No packages available</h3>
      <p class="mt-2 text-gray-600">Please check back later for credit packages.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div
        v-for="pkg in creditsStore.creditPackages"
        :key="pkg.id"
        :class="[
          'relative bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-200 hover:shadow-xl',
          pkg.id === popularPackageId ? 'ring-2 ring-primary-500 scale-105' : '',
          selectedPackage === pkg.id ? 'ring-2 ring-primary-600' : ''
        ]"
        @click="selectPackage(pkg.id)"
      >
        <!-- Popular Badge -->
        <div v-if="pkg.id === popularPackageId" class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <span class="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-primary-600 text-white">
            <StarIcon class="h-4 w-4 mr-1" />
            Most Popular
          </span>
        </div>

        <div class="p-8">
          <!-- Package Header -->
          <div class="text-center">
            <h3 class="text-2xl font-bold text-gray-900">{{ pkg.name }}</h3>
            <div class="mt-4">
              <span class="text-4xl font-bold text-gray-900">{{ formatPrice(pkg.price) }}</span>
            </div>
            <p class="mt-2 text-gray-600">{{ pkg.credits }} credits</p>
            <p class="text-sm text-gray-500">
              ${{ getPricePerCredit(pkg.price, pkg.credits) }} per credit
            </p>
            
            <!-- Savings Badge -->
            <div v-if="getSavingsPercentage(pkg.price, pkg.credits) > 0" class="mt-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Save {{ getSavingsPercentage(pkg.price, pkg.credits) }}%
              </span>
            </div>
          </div>

          <!-- Package Description -->
          <div v-if="pkg.description" class="mt-6">
            <p class="text-gray-600 text-center">{{ pkg.description }}</p>
          </div>

          <!-- Package Features -->
          <div class="mt-6">
            <ul class="space-y-2">
              <li class="flex items-center">
                <CheckIcon class="h-4 w-4 text-green-500 mr-2" />
                <span class="text-sm text-gray-700">{{ pkg.credits }} photo enhancements</span>
              </li>
              <li class="flex items-center">
                <CheckIcon class="h-4 w-4 text-green-500 mr-2" />
                <span class="text-sm text-gray-700">All enhancement types</span>
              </li>
              <li class="flex items-center">
                <CheckIcon class="h-4 w-4 text-green-500 mr-2" />
                <span class="text-sm text-gray-700">High-resolution output</span>
              </li>
              <li class="flex items-center">
                <CheckIcon class="h-4 w-4 text-green-500 mr-2" />
                <span class="text-sm text-gray-700">Credits never expire</span>
              </li>
            </ul>
          </div>

          <!-- Purchase Button -->
          <div class="mt-8">
            <button
              @click.stop="purchaseCredits(pkg.id)"
              :disabled="creditsStore.purchasing"
              :class="[
                'w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
                pkg.id === popularPackageId
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300'
              ]"
            >
              <svg
                v-if="creditsStore.purchasing"
                class="animate-spin -ml-1 mr-3 h-5 w-5 text-current inline"
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
              {{ creditsStore.purchasing ? 'Processing...' : 'Purchase Credits' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- FAQ Section -->
    <div class="bg-white shadow rounded-lg p-8">
      <h2 class="text-2xl font-bold text-gray-900 text-center mb-8">
        Frequently Asked Questions
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            Do credits expire?
          </h3>
          <p class="text-gray-600">
            No, your credits never expire. Use them whenever you need to enhance your photos.
          </p>
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            How long does enhancement take?
          </h3>
          <p class="text-gray-600">
            Most photos are enhanced within 1-3 minutes, depending on the image size and complexity.
          </p>
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            What file formats are supported?
          </h3>
          <p class="text-gray-600">
            We support JPG, PNG, and WebP formats up to 10MB in size.
          </p>
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            Can I get a refund?
          </h3>
          <p class="text-gray-600">
            We offer refunds within 30 days of purchase if you're not satisfied with the results.
          </p>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="creditsStore.error" class="rounded-md bg-red-50 p-4">
      <div class="text-sm text-red-700">{{ creditsStore.error }}</div>
    </div>

    <!-- Payment Modal -->
    <PaymentModal
      :is-open="showPaymentModal"
      :credit-package="selectedCreditPackage"
      @close="closePaymentModal"
      @success="handlePaymentSuccess"
    />
  </div>
</template>