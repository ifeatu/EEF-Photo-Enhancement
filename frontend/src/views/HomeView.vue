<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { PhotoIcon, SparklesIcon, CameraIcon } from '@heroicons/vue/24/outline'

const authStore = useAuthStore()

const features = [
  {
    name: 'AI-Powered Restoration',
    description: 'Restore old and damaged photos using advanced AI technology.',
    icon: SparklesIcon,
  },
  {
    name: 'Photo Enhancement',
    description: 'Enhance photo quality, brightness, and clarity automatically.',
    icon: CameraIcon,
  },
  {
    name: 'Easy Upload',
    description: 'Simple drag-and-drop interface for quick photo uploads.',
    icon: PhotoIcon,
  },
]
</script>

<template>
  <div class="bg-white">
    <!-- Hero section -->
    <div class="relative isolate px-6 pt-14 lg:px-8">
      <div class="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div class="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"></div>
      </div>
      
      <div class="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
        <div class="text-center">
          <h1 class="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Restore Your Precious
            <span class="text-primary-600">Memories</span>
          </h1>
          <p class="mt-6 text-lg leading-8 text-gray-600">
            Transform old, damaged, or faded photos into stunning, vibrant memories using our AI-powered photo enhancement technology.
          </p>
          <div class="mt-10 flex items-center justify-center gap-x-6">
            <RouterLink
              v-if="!authStore.isAuthenticated"
              to="/register"
              class="btn-primary text-lg px-6 py-3"
            >
              Get Started
            </RouterLink>
            <RouterLink
              v-else
              to="/dashboard"
              class="btn-primary text-lg px-6 py-3"
            >
              Go to Dashboard
            </RouterLink>
            <RouterLink
              to="/pricing"
              class="text-sm font-semibold leading-6 text-gray-900 hover:text-primary-600"
            >
              View Pricing <span aria-hidden="true">→</span>
            </RouterLink>
          </div>
        </div>
      </div>
      
      <div class="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]" aria-hidden="true">
        <div class="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"></div>
      </div>
    </div>

    <!-- Before/After showcase -->
    <div class="py-24 sm:py-32">
      <div class="mx-auto max-w-7xl px-6 lg:px-8">
        <div class="mx-auto max-w-2xl lg:text-center">
          <h2 class="text-base font-semibold leading-7 text-primary-600">AI Enhancement</h2>
          <p class="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            See the Magic in Action
          </p>
          <p class="mt-6 text-lg leading-8 text-gray-600">
            Our advanced AI technology can restore and enhance photos that seemed beyond repair.
          </p>
        </div>
        
        <!-- Before/After images -->
        <div class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <div class="grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-2">
            <div class="flex flex-col">
              <div class="relative">
                <img
                  class="aspect-[4/3] w-full rounded-2xl bg-gray-50 object-cover object-top"
                  src="/photos/photo-4-before.jpg"
                  alt="Before enhancement"
                />
                <div class="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  BEFORE
                </div>
              </div>
              <h3 class="mt-6 text-lg font-semibold leading-8 text-gray-900">Childhood Treasures</h3>
              <p class="mt-2 text-base leading-7 text-gray-600">
                Enhanced details and corrected aging effects in this precious childhood photograph.
              </p>
            </div>
            
            <div class="flex flex-col">
              <div class="relative">
                <img
                  class="aspect-[4/3] w-full rounded-2xl bg-gray-50 object-cover object-top"
                  src="/photos/photo-4-after.png"
                  alt="After enhancement"
                />
                <div class="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  AFTER
                </div>
              </div>
              <h3 class="mt-6 text-lg font-semibold leading-8 text-gray-900">AI-Enhanced Clarity</h3>
              <p class="mt-2 text-base leading-7 text-gray-600">
                Transformed this childhood memory with enhanced details and vibrant restoration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Features section -->
    <div class="bg-gray-50 py-24 sm:py-32">
      <div class="mx-auto max-w-7xl px-6 lg:px-8">
        <div class="mx-auto max-w-2xl lg:text-center">
          <h2 class="text-base font-semibold leading-7 text-primary-600">Everything you need</h2>
          <p class="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Professional Photo Enhancement
          </p>
          <p class="mt-6 text-lg leading-8 text-gray-600">
            Our AI-powered platform makes it easy to restore and enhance your precious memories.
          </p>
        </div>
        
        <div class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl class="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">
            <div v-for="feature in features" :key="feature.name" class="relative pl-16">
              <dt class="text-base font-semibold leading-7 text-gray-900">
                <div class="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                  <component :is="feature.icon" class="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                {{ feature.name }}
              </dt>
              <dd class="mt-2 text-base leading-7 text-gray-600">{{ feature.description }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>

    <!-- CTA section -->
    <div class="bg-primary-600">
      <div class="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to restore your memories?
          </h2>
          <p class="mx-auto mt-6 max-w-xl text-lg leading-8 text-primary-100">
            Join thousands of users who have already transformed their precious photos.
          </p>
          <div class="mt-10 flex items-center justify-center gap-x-6">
            <RouterLink
              v-if="!authStore.isAuthenticated"
              to="/register"
              class="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-primary-600 shadow-sm hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Get started
            </RouterLink>
            <RouterLink
              v-else
              to="/upload"
              class="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-primary-600 shadow-sm hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Upload Photo
            </RouterLink>
            <RouterLink
              to="/pricing"
              class="text-sm font-semibold leading-6 text-white hover:text-primary-100"
            >
              Learn more <span aria-hidden="true">→</span>
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
