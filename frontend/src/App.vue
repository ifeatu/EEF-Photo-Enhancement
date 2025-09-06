<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AppNavigation from '@/components/AppNavigation.vue'

const authStore = useAuthStore()

onMounted(() => {
  authStore.initializeAuth()
})
</script>

<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <AppNavigation />
    <main class="flex-1">
      <RouterView />
    </main>
  </div>
</template>

<style>
/* Global styles are handled by Tailwind CSS */
</style>
