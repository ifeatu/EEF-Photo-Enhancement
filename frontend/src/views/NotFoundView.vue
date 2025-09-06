<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { HomeIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 text-center">
      <!-- 404 Illustration -->
      <div>
        <div class="mx-auto h-32 w-32 text-primary-400">
          <svg
            class="h-full w-full"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1"
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0118 12c0-4.418-3.582-8-8-8s-8 3.582-8 8c0 2.152.851 4.165 2.343 5.291l1.414-1.414a6 6 0 1110.586 0l1.414 1.414z"
            />
          </svg>
        </div>
        <h1 class="mt-6 text-6xl font-bold text-gray-900">404</h1>
        <h2 class="mt-2 text-3xl font-bold text-gray-900">Page not found</h2>
        <p class="mt-2 text-sm text-gray-600">
          Sorry, we couldn't find the page you're looking for.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="mt-8 space-y-4">
        <RouterLink
          to="/"
          class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
        >
          <span class="absolute left-0 inset-y-0 flex items-center pl-3">
            <HomeIcon class="h-5 w-5 text-primary-500 group-hover:text-primary-400" aria-hidden="true" />
          </span>
          Go back home
        </RouterLink>

        <button
          @click="$router.go(-1)"
          class="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
        >
          <span class="absolute left-0 inset-y-0 flex items-center pl-3">
            <ArrowLeftIcon class="h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
          </span>
          Go back
        </button>
      </div>

      <!-- Help Text -->
      <div class="mt-8">
        <p class="text-sm text-gray-500">
          If you believe this is an error, please
          <a href="mailto:support@photoenhancer.com" class="font-medium text-primary-600 hover:text-primary-500">
            contact support
          </a>
        </p>
      </div>
    </div>
  </div>
</template>