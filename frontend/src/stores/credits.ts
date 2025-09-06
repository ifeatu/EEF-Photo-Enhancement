import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useMutation } from '@urql/vue'
import { creditPackagesAPI, purchasesAPI, type CreditPackage } from '@/services/api'
import { useAuthStore } from './auth'

export const useCreditsStore = defineStore('credits', () => {
  const creditPackages = ref<CreditPackage[]>([])
  const loading = ref(false)
  const purchasing = ref(false)
  const error = ref<string | null>(null)

  const authStore = useAuthStore()

  async function fetchCreditPackages() {
    try {
      loading.value = true
      error.value = null
      
      // Use REST API instead of GraphQL to avoid CSRF issues
      const response = await creditPackagesAPI.getCreditPackages()
      
      // Transform API response to match expected format
      const packages = response.data?.map((item: any) => ({
        id: item.id,
        name: item.name,
        credits: item.credits,
        price: item.price,
        description: item.description,
        isActive: item.isActive,
        features: item.features,
        sortOrder: item.sortOrder
      })) || []
      
      // Sort by sortOrder
      creditPackages.value = packages.sort((a: any, b: any) => a.sortOrder - b.sortOrder)
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch credit packages'
      console.error('Failed to fetch credit packages:', err)
    } finally {
      loading.value = false
    }
  }

  async function purchaseCredits(creditPackageId: number, paymentMethodId?: string) {
    try {
      purchasing.value = true
      error.value = null
      
      const response = await purchasesAPI.purchaseCredits(creditPackageId, paymentMethodId)
      
      // If the purchase was successful, update user credits
      if (response.success) {
        const creditPackage = creditPackages.value.find(pkg => pkg.id === creditPackageId)
        if (creditPackage) {
          const newCredits = authStore.userCredits + creditPackage.credits
          authStore.updateCredits(newCredits)
        }
      }
      
      return response
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || 'Failed to purchase credits'
      console.error('Failed to purchase credits:', err)
      throw err
    } finally {
      purchasing.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    creditPackages,
    loading,
    purchasing,
    error,
    fetchCreditPackages,
    purchaseCredits,
    clearError,
  }
})