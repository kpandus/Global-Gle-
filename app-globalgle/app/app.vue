<template>
  <div>
    <!-- ── PAGE LOADER ─────────────────────────────────────────────────── -->
    <Transition name="loader-fade">
      <div v-if="loading" class="page-loader">
        <div class="loader-inner">
          <div class="loader-logo">
            <img src="/logo1.jpg" alt="GlobalGLE" class="loader-img" />
          </div>
          <div class="loader-brand">GlobalGLE</div>
          <div class="loader-bar-wrap">
            <div class="loader-bar" :style="{ width: progress + '%' }"></div>
          </div>
          <div class="loader-percent">{{ Math.round(progress) }}%</div>
        </div>
      </div>
    </Transition>

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const loading  = ref(true)
const progress = ref(0)

onMounted(() => {
  const duration = 2200
  const interval = 18
  const steps = duration / interval
  let current = 0

  const timer = setInterval(() => {
    current++
    // Ease-out curve: fast at first, slows near 100
    progress.value = Math.min(100, Math.round((1 - Math.pow(1 - current / steps, 2)) * 100))

    if (current >= steps) {
      clearInterval(timer)
      progress.value = 100
      setTimeout(() => { loading.value = false }, 350)
    }
  }, interval)
})
</script>

<style>
/* ── Loader ───────────────────────────────────────────────────────────────── */
.page-loader {
  position: fixed;
  inset: 0;
  background: #0a0d14;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loader-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.4rem;
}

.loader-logo {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(0,255,136,0.4);
  box-shadow: 0 0 30px rgba(0,255,136,0.2), 0 0 60px rgba(0,255,136,0.08);
  animation: loaderPulse 1.8s ease-in-out infinite;
}

.loader-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.loader-brand {
  font-family: 'Urbanist', sans-serif;
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #fff;
  text-transform: uppercase;
}

.loader-bar-wrap {
  width: 220px;
  height: 2px;
  background: rgba(255,255,255,0.08);
  border-radius: 999px;
  overflow: hidden;
}

.loader-bar {
  height: 100%;
  background: linear-gradient(90deg, #00ff88, #00cc66);
  border-radius: 999px;
  transition: width 0.12s ease;
  box-shadow: 0 0 8px rgba(0,255,136,0.6);
}

.loader-percent {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.78rem;
  letter-spacing: 0.15em;
  color: rgba(0,255,136,0.6);
}

@keyframes loaderPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(0,255,136,0.15), 0 0 50px rgba(0,255,136,0.06); }
  50%       { box-shadow: 0 0 35px rgba(0,255,136,0.35), 0 0 80px rgba(0,255,136,0.15); }
}

/* ── Loader exit transition ───────────────────────────────────────────────── */
.loader-fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.loader-fade-leave-to {
  opacity: 0;
  transform: scale(1.04);
}
</style>
