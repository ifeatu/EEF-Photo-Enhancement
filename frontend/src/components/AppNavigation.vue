<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  CreditCardIcon,
  PhotoIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()
const router = useRouter()
const mobileMenuOpen = ref(false)



const navigation = computed(() => {
  if (!authStore.isAuthenticated) {
    return [
      { name: 'Home', href: '/', current: false },
      { name: 'Pricing', href: '/pricing', current: false },
    ]
  }
  
  const baseNavigation = [
    { name: 'Dashboard', href: '/dashboard', current: false },
    { name: 'Upload Photo', href: '/upload', current: false },
    { name: 'My Photos', href: '/photos', current: false },
  ]
  
  // Add admin link for admin users
  if (authStore.user?.role?.type === 'admin') {
    baseNavigation.push({ name: 'Admin', href: '/admin', current: false })
  }
  
  return baseNavigation
})

const userNavigation = [
  { name: 'Profile', href: '/profile', icon: UserCircleIcon },
  { name: 'Sign out', href: '#', icon: ArrowRightOnRectangleIcon, action: 'logout' },
]

function handleUserAction(action: string) {
  if (action === 'logout') {
    authStore.logout()
    router.push('/')
  }
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}
</script>

<template>
  <nav class="bg-white shadow-sm border-b border-gray-200">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 justify-between">
        <div class="flex">
          <div class="flex flex-shrink-0 items-center">
            <RouterLink to="/" class="flex items-center cursor-pointer" style="pointer-events: auto; z-index: 10;">
              <PhotoIcon class="h-8 w-8 text-primary-600" />
              <span class="ml-2 text-xl font-bold text-gray-900">PhotoEnhance</span>
            </RouterLink>
          </div>
          <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
            <RouterLink
              v-for="item in navigation"
              :key="item.name"
              :to="item.href"
              class="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 router-link-active:border-primary-500 router-link-active:text-gray-900 cursor-pointer"
              style="pointer-events: auto; z-index: 10;"
              @click="closeMobileMenu"
            >
              {{ item.name }}
            </RouterLink>

          </div>
        </div>
        
        <div class="hidden sm:ml-6 sm:flex sm:items-center">
          <!-- User menu for authenticated users -->
          <div v-if="authStore.isAuthenticated" class="flex items-center space-x-4">

            
            <!-- User dropdown -->
            <div class="relative">
              <button
                type="button"
                class="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                id="user-menu-button"
                aria-expanded="false"
                aria-haspopup="true"
              >
                <span class="sr-only">Open user menu</span>
                <UserCircleIcon class="h-8 w-8 text-gray-400" />
              </button>
            </div>
          </div>
          
          <!-- Auth buttons for non-authenticated users -->
          <div v-else class="flex items-center space-x-4">
            <RouterLink
              to="/login"
              class="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium cursor-pointer"
              style="pointer-events: auto; z-index: 10;"
            >
              Sign in
            </RouterLink>
            <RouterLink
              to="/register"
              class="btn-primary cursor-pointer"
              style="pointer-events: auto; z-index: 10;"
            >
              Sign up
            </RouterLink>
          </div>
        </div>
        
        <!-- Mobile menu button -->
        <div class="-mr-2 flex items-center sm:hidden">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md bg-white p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            aria-controls="mobile-menu"
            aria-expanded="false"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <span class="sr-only">Open main menu</span>
            <Bars3Icon v-if="!mobileMenuOpen" class="block h-6 w-6" aria-hidden="true" />
            <XMarkIcon v-else class="block h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile menu -->
    <div v-show="mobileMenuOpen" class="sm:hidden" id="mobile-menu">
      <div class="space-y-1 pb-3 pt-2">
        <RouterLink
          v-for="item in navigation"
          :key="item.name"
          :to="item.href"
          class="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 router-link-active:border-primary-500 router-link-active:bg-primary-50 router-link-active:text-primary-700 cursor-pointer"
          style="pointer-events: auto; z-index: 10;"
          @click="closeMobileMenu"
        >
          {{ item.name }}
        </RouterLink>
      </div>
      
      <!-- Mobile user menu -->
      <div v-if="authStore.isAuthenticated" class="border-t border-gray-200 pb-3 pt-4">
        <div class="flex items-center px-4">
          <div class="flex-shrink-0">
            <UserCircleIcon class="h-10 w-10 text-gray-400" />
          </div>
          <div class="ml-3">
            <div class="text-base font-medium text-gray-800">
              {{ authStore.user?.username }}
            </div>
            <div class="text-sm font-medium text-gray-500">
              Welcome!
            </div>
          </div>
        </div>
        <div class="mt-3 space-y-1">
          <RouterLink
            v-for="item in userNavigation"
            :key="item.name"
            :to="item.href"
            class="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            @click="item.action ? handleUserAction(item.action) : closeMobileMenu()"
          >
            {{ item.name }}
          </RouterLink>
        </div>
      </div>
      
      <!-- Mobile auth buttons -->
      <div v-else class="border-t border-gray-200 pb-3 pt-4">
        <div class="space-y-1">
          <RouterLink
            to="/login"
            class="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 cursor-pointer"
            style="pointer-events: auto; z-index: 10;"
            @click="closeMobileMenu"
          >
            Sign in
          </RouterLink>
          <RouterLink
            to="/register"
            class="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 cursor-pointer"
            style="pointer-events: auto; z-index: 10;"
            @click="closeMobileMenu"
          >
            Sign up
          </RouterLink>
        </div>
      </div>
    </div>
  </nav>
</template>