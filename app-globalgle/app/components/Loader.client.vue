<template>
  <div>
    <div class="loading-header">
      <a href="/#" class="loader-title">GG</a>
      <div :class="['loaderGame', { 'loader-out': clicked }]">
        <div class="loaderGame-container">
          <div class="loaderGame-in">
            <div v-for="i in 27" :key="i" class="loaderGame-line"></div>
          </div>
          <div class="loaderGame-ball"></div>
        </div>
      </div>
    </div>

    <div class="loading-screen" v-if="!finished">
      <div class="loading-marquee">
        <div class="marquee-content">
          <span>GLOBAL GLE CROSS-BORDER PAYMENTS</span>
          <span>GLOBAL GLE CROSS-BORDER PAYMENTS</span>
          <span>GLOBAL GLE CROSS-BORDER PAYMENTS</span>
          <span>GLOBAL GLE CROSS-BORDER PAYMENTS</span>
        </div>
      </div>

      <div
        :class="['loading-wrap', { 'loading-clicked': clicked }]"
        @mousemove="handleMouseMove"
      >
        <div class="loading-hover" :style="hoverStyle"></div>
        <div :class="['loading-button', { 'loading-complete': percent >= 100 }]">
          <div class="loading-container">
            <div class="loading-content">
              <div class="loading-content-in">
                Loading <span>{{ percent }}%</span>
              </div>
            </div>
            <div class="loading-box"></div>
          </div>
          <div class="loading-content2" @click="handleComplete">
            <span>Welcome</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  percent: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['finish'])

const clicked = ref(false)
const finished = ref(false)
const mouseX = ref(0)
const mouseY = ref(0)

const hoverStyle = computed(() => ({
  '--mouse-x': `${mouseX.value}px`,
  '--mouse-y': `${mouseY.value}px`
}))

const handleMouseMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect()
  mouseX.value = e.clientX - rect.left
  mouseY.value = e.clientY - rect.top
}

// Auto-proceed logic from original reference
watch(() => props.percent, (newVal) => {
  if (newVal >= 100) {
    // 600ms delay to show "Complete" state
    setTimeout(() => {
      // Transition to "Welcome/Clicked" state
      clicked.value = true
      // 1000ms delay for the growth animation
      setTimeout(() => {
        finished.value = true
        emit('finish')
      }, 1000)
    }, 600)
  }
}, { immediate: true })
</script>

<style scoped>
.loading-screen {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background-color: #e0f2f1;
  z-index: 200000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.loading-header {
  width: 90%;
  max-width: 1400px;
  position: fixed;
  z-index: 200001;
  display: flex;
  justify-content: space-between;
  padding: 20px 0;
  left: 50%;
  transform: translateX(-50%);
  top: 0;
  color: #000;
}

.loader-title {
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.2px;
  text-decoration: none;
  color: #000;
}

.loaderGame-container {
  width: 200px;
  transition: 0.3s;
  height: 100px;
  overflow: hidden;
  position: relative;
  transform: scale(0.4);
  transform-origin: top right;
}

.loader-out .loaderGame-container {
  opacity: 0;
}

.loaderGame-in {
  width: 1200px;
  position: absolute;
  overflow: hidden;
  left: 0;
  animation: loaderGame 12s linear infinite;
}

@keyframes loaderGame {
  0% { transform: translateX(0px); }
  100% { transform: translateX(-300px); }
}

.loaderGame-line {
  float: left;
  margin: 0px 20px;
  margin-bottom: 40px;
  position: relative;
  width: 10px;
  height: 60px;
  background-color: #000;
  display: block;
}

.loaderGame-line:nth-child(2n) {
  margin-top: 40px;
  margin-bottom: 0px;
}

.loaderGame-ball {
  position: absolute;
  left: 20%;
  top: 0%;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background-color: #00ff88;
  animation: ball25 12s infinite;
  transform: translateY(10px);
  animation-timing-function: cubic-bezier(0.3, 1.18, 0.63, 1.28);
}

@keyframes ball25 {
  0%, 30%, 67%, 90%, 100% { transform: translateY(70px); }
  15%, 45%, 80% { transform: translateY(10px); }
}

.loading-marquee {
  position: absolute;
  top: 52%;
  left: 0;
  width: 100%;
  transform: translateY(-50%);
  color: rgba(0,0,0,0.05);
  font-size: clamp(4rem, 10vw, 8rem);
  font-weight: 800;
  text-transform: uppercase;
  white-space: nowrap;
  pointer-events: none;
}

.marquee-content {
  display: inline-block;
  padding-left: 100%;
  animation: marquee 35s linear infinite;
}

.marquee-content span {
  padding: 0 50px;
}

@keyframes marquee {
  0% { transform: translate(0, 0); }
  100% { transform: translate(-100%, 0); }
}

.loading-wrap {
  --Lsize: 145px;
  padding: 6px;
  position: relative;
  min-width: 0px;
  min-height: 0px;
  border-radius: 100px;
  background-color: #000;
  overflow: hidden;
  transition: 0.8s ease-in-out;
  transition-delay: 0.2s;
  box-shadow: 0px 15px 40px rgba(0,0,0,0.2);
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-clicked {
  transition-delay: 0ms;
  transition-timing-function: cubic-bezier(0.33, 0.11, 1, 0.72);
  transform: scale(1);
  min-width: calc(100vw + 2000px);
  border-radius: 5000px;
  min-height: calc(100vh + 2000px);
  box-shadow: none;
}

.loading-hover {
  background-color: #00ff88;
  width: 250px;
  height: 120px;
  position: absolute;
  top: var(--mouse-y);
  left: var(--mouse-x);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  filter: blur(30px);
  opacity: 0.6;
  transition: opacity 500ms;
}

.loading-button {
  padding: 20px 50px;
  border-radius: 100px;
  background-color: #000;
  overflow: hidden;
  font-size: 18px;
  font-weight: 500;
  position: relative;
  z-index: 9;
  cursor: pointer;
}

.loading-container {
  position: relative;
  width: 100%;
  min-width: var(--Lsize);
  height: 25px;
  transition: 0.6s;
  color: #fff;
}

.loading-complete .loading-container {
  max-width: 0;
  opacity: 0;
  overflow: hidden;
}

.loading-content { text-transform: uppercase; }
.loading-content span { font-weight: 300; margin-left: 10px; opacity: 0.7; }

.loading-box {
  width: 10px;
  height: 20px;
  background: #fff;
  display: inline-block;
  margin-left: 5px;
  animation: blink 1s linear infinite;
}

@keyframes blink {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

.loading-content2 {
  position: absolute;
  top: 52%;
  left: 50%;
  transform: translate(-50%, -50%) translateY(40px);
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 2px;
  transition: 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  opacity: 0;
  white-space: nowrap;
}

.loading-complete .loading-content2 {
  transform: translate(-50%, -50%) translateY(0);
  opacity: 1;
}

.loading-clicked .loading-content2 {
  opacity: 0;
}
</style>
