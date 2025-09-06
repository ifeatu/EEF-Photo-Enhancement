<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { XMarkIcon, CreditCardIcon } from '@heroicons/vue/24/outline'
import { stripeService } from '@/services/stripe'
import { useCreditsStore } from '@/stores/credits'
import { useAuthStore } from '@/stores/auth'
import type { CreditPackage } from '@/services/api'

interface Props {
  isOpen: boolean
  creditPackage: CreditPackage | null
}

interface Emits {
  close: []
  success: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const creditsStore = useCreditsStore()
const authStore = useAuthStore()

const cardElement = ref<any>(null)
const cardContainer = ref<HTMLElement | null>(null)
const isProcessing = ref(false)
const error = ref('')
const cardComplete = ref(false)

let stripeCardElement: any = null

async function initializeStripe() {
  if (!cardContainer.value || !props.isOpen) return

  try {
    stripeCardElement = await stripeService.createCardElement()
    stripeCardElement.mount(cardContainer.value)

    stripeCardElement.on('change', (event: any) => {
      cardComplete.value = event.complete
      if (event.error) {
        error.value = event.error.message
      } else {
        error.value = ''
      }
    })
  } catch (err: any) {
    error.value = 'Failed to initialize payment form'
    console.error('Stripe initialization error:', err)
  }
}

function destroyStripe() {
  if (stripeCardElement) {
    stripeCardElement.unmount()
    stripeCardElement = null
  }
}

async function handlePayment() {
  if (!props.creditPackage || !stripeCardElement || !cardComplete.value) {
    error.value = 'Please complete the payment form'
    return
  }

  try {
    isProcessing.value = true
    error.value = ''

    // Check storage before processing payment
    const storageInfo = await stripeService.getStorageInfo()
    if (storageInfo && storageInfo.usagePercentage > 95) {
      error.value = 'Storage almost full. Please clean up expired photos before purchasing more credits.'
      return
    }

    // Create payment method
    const { paymentMethod, error: pmError } = await stripeService.createPaymentMethod(stripeCardElement)
    
    if (pmError) {
      error.value = pmError.message
      return
    }

    // Process payment through backend
    const result = await creditsStore.purchaseCredits(props.creditPackage.id, paymentMethod.id)

    if (result.success) {
      emit('success')
      emit('close')
    } else {
      error.value = result.error || 'Payment failed'
    }
  } catch (err: any) {
    error.value = err.message || 'Payment processing failed'
  } finally {
    isProcessing.value = false
  }
}

function closeModal() {
  destroyStripe()
  emit('close')
}

// Watch for modal open/close
watch(() => props.isOpen, (isOpen: boolean) => {
  if (isOpen) {
    nextTick(() => {
      initializeStripe()
    })
  } else {
    destroyStripe()
  }
})

onUnmounted(() => {
  destroyStripe()
})
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 overflow-y-auto"
    aria-labelledby="modal-title"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div
        class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        aria-hidden="true"
        @click="closeModal"
      ></div>

      <!-- Modal panel -->
      <div class="relative inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
        <div class="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
          <button
            type="button"
            class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            @click="closeModal"
          >
            <span class="sr-only">Close</span>
            <XMarkIcon class="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div class="sm:flex sm:items-start">
          <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 sm:mx-0 sm:h-10 sm:w-10">
            <CreditCardIcon class="h-6 w-6 text-primary-600" aria-hidden="true" />
          </div>
          <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
            <h3 id="modal-title" class="text-lg font-medium leading-6 text-gray-900">
              Purchase Credits
            </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                Complete your purchase to add {{ creditPackage?.credits }} credits to your account.
              </p>
            </div>
          </div>
        </div>

        <!-- Package Details -->
        <div v-if="creditPackage" class="mt-6 rounded-lg border border-gray-200 p-4">
          <div class="flex justify-between items-center">
            <div>
              <h4 class="font-medium text-gray-900">{{ creditPackage.name }}</h4>
              <p class="text-sm text-gray-500">{{ creditPackage.credits }} credits</p>
            </div>
            <div class="text-right">
              <p class="text-2xl font-bold text-gray-900">${{ creditPackage.price }}</p>
            </div>
          </div>
        </div>

        <!-- Payment Form -->
        <form @submit.prevent="handlePayment" class="mt-6">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Card Information
            </label>
            <div
              ref="cardContainer"
              class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500"
            ></div>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="mb-4 rounded-md bg-red-50 p-4">
            <div class="text-sm text-red-700">{{ error }}</div>
          </div>

          <!-- Action Buttons -->
          <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              :disabled="isProcessing || !cardComplete"
              class="inline-flex w-full justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm"
            >
              <svg
                v-if="isProcessing"
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
              {{ isProcessing ? 'Processing...' : `Pay $${creditPackage?.price}` }}
            </button>
            <button
              type="button"
              class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
              @click="closeModal"
              :disabled="isProcessing"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>