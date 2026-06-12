<script setup>
import { ref, onMounted } from 'vue'
import { useHead } from '#imports'
import Loader from '~/components/Loader.client.vue'

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=5' }
  ]
})

const loading  = ref(true)
const progress = ref(0)

onMounted(() => {
  const duration = 1800 // Slower for new visuals
  const interval = 20
  const steps = duration / interval
  let current = 0

  const timer = setInterval(() => {
    current++
    progress.value = Math.min(100, Math.round((1 - Math.pow(1 - current / steps, 3)) * 100))

    if (current >= steps) {
      clearInterval(timer)
      progress.value = 100
    }
  }, interval)
})

const handleLoaderFinish = () => {
  loading.value = false
}
</script>

<template>
  <div>
    <Loader v-if="loading" :percent="progress" @finish="handleLoaderFinish" />
    
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
/* Global styles can stay here if any, otherwise empty */
</style>
