<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const containerRefs = ref([]);
const setRef = (el, index) => {
  if (el) containerRefs.value[index] = el;
};

const activeIndex = ref(null);
const isTouch = ref(false);

const handleClick = (index) => {
  if (activeIndex.value === index) {
    activeIndex.value = null;
  } else {
    activeIndex.value = index;
  }
};

onMounted(() => {
  // Check for touch device using matchMedia or similar
  isTouch.value = window.matchMedia("(pointer: coarse)").matches || 'ontouchstart' in window;
  
  // Note: Hover handles non-touch via CSS. 
  // activeIndex/handleClick handles touch interaction and persistence.
});
</script>

<template>
  <div class="whatIDO" :class="{ 'has-active': activeIndex !== null }">
    <div class="what-box">
      <h2 class="title">
        W<span class="hat-h2">HAT</span>
        <div>
          WE<span class="do-h2"> DO</span>
        </div>
      </h2>
    </div>
    <div class="what-box">
      <div class="what-box-in">
        <div class="what-border2">
          <svg width="100%">
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="100%"
              stroke="white"
              stroke-width="2"
              stroke-dasharray="7,7"
            />
            <line
              x1="100%"
              y1="0"
              x2="100%"
              y2="100%"
              stroke="white"
              stroke-width="2"
              stroke-dasharray="7,7"
            />
          </svg>
        </div>
        
        <!-- AI & AUTOMATION BOX -->
        <div
          class="what-content"
          :class="{ 
            'what-noTouch': !isTouch, 
            'what-content-active': activeIndex === 0,
            'what-sibling': activeIndex !== null && activeIndex !== 0
          }"
          @click="isTouch && handleClick(0)"
          :ref="(el) => setRef(el, 0)"
        >
          <div class="what-border1">
            <svg height="100%">
              <line
                x1="0"
                y1="0"
                x2="100%"
                y2="0"
                stroke="white"
                stroke-width="2"
                stroke-dasharray="6,6"
              />
              <line
                x1="0"
                y1="100%"
                x2="100%"
                y2="100%"
                stroke="white"
                stroke-width="2"
                stroke-dasharray="6,6"
              />
            </svg>
          </div>
          <div class="what-corner"></div>

          <div class="what-content-in">
            <h3>AI & AUTOMATION</h3>
            <h4>Workflow Intelligence for Organizations</h4>
            <p>
              AI specialist helping organizations automate workflows—internal ops
              and customer-facing—so teams ship faster with less manual work.
            </p>
            <h5>Skillset & tools</h5>
            <div class="what-content-flex">
              <div class="what-tags">LLMs & agents</div>
              <div class="what-tags">Workflow design</div>
              <div class="what-tags">RAG & retrieval</div>
              <div class="what-tags">Evals & guardrails</div>
              <div class="what-tags">Integrations</div>
              <div class="what-tags">Product strategy</div>
            </div>
          </div>
        </div>

        <!-- BUILD & SCALE BOX -->
        <div
          class="what-content"
          :class="{ 
            'what-noTouch': !isTouch, 
            'what-content-active': activeIndex === 1,
            'what-sibling': activeIndex !== null && activeIndex !== 1
          }"
          @click="isTouch && handleClick(1)"
          :ref="(el) => setRef(el, 1)"
        >
          <div class="what-border1">
            <svg height="100%">
              <line
                x1="0"
                y1="100%"
                x2="100%"
                y2="100%"
                stroke="white"
                stroke-width="2"
                stroke-dasharray="6,6"
              />
            </svg>
          </div>
          <div class="what-corner"></div>
          <div class="what-content-in">
            <h3>BUILD & SCALE</h3>
            <h4>Shipping AI in Production</h4>
            <p>
              I build the systems behind it: APIs, data, voice/real-time, and
              full-stack products—production-ready, not slide decks.
            </p>
            <h5>Skillset & tools</h5>
            <div class="what-content-flex">
              <div class="what-tags">Node.js</div>
              <div class="what-tags">Python</div>
              <div class="what-tags">REST & real-time APIs</div>
              <div class="what-tags">PostgreSQL</div>
              <div class="what-tags">MongoDB</div>
              <div class="what-tags">React</div>
              <div class="what-tags">Cloud & infra</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap");

.whatIDO {
  display: flex;
  align-items: center;
  justify-content: center;
  place-items: center;
  position: relative;
  opacity: 1;
  /* height: 100vh;  -- Overridden for integration */
  width: 100%;
  max-width: 1200px;
  margin: auto;
  z-index: 9;
  --accentColor: #00ff88; /* Matching GlobalGle accent */
  --cWidth: 100%;
  font-family: "Geist", sans-serif;
}

.what-box {
  width: 50%;
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 9;
}

.what-box h2 {
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1.1;
  font-weight: 800;
  margin-right: 10%;
  text-align: left;
}

.hat-h2 {
  font-style: italic;
  font-weight: 300;
  opacity: 0.8;
}

.do-h2 {
  color: var(--accentColor);
}

.what-box-in {
  display: flex;
  flex-direction: column;
  height: clamp(350px, 60vh, 500px);
  position: relative;
}

.what-content {
  width: clamp(300px, 30vw, 450px);
  height: 33.3%;
  min-height: 33.3%;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  padding: 2.5rem;
  box-sizing: border-box;
  cursor: pointer;
}

.what-noTouch:hover,
.what-content-active {
  min-height: 66.6%;
  padding: 2rem 2.5rem;
}

/* Sibling behavior: when one is hovered/active, the other shrinks */
.what-noTouch:hover ~ .what-content,
.what-box-in:hover .what-noTouch:not(:hover),
.what-content.what-sibling {
  min-height: 33.3%;
  padding: 1rem 2.5rem;
}

.what-content h3 {
  font-size: clamp(1.2rem, 2vw, 2.2rem);
  letter-spacing: 1px;
  margin: 0;
  font-weight: 800;
}

.what-content p {
  font-size: 0.9rem;
  line-height: 1.4;
  font-weight: 300;
  letter-spacing: 0.5px;
  margin-top: 0.5rem;
  opacity: 0.8;
}

.what-content h4 {
  font-weight: 400;
  letter-spacing: 1px;
  margin: 0px;
  font-size: 0.8rem;
  opacity: 0.4;
}

.what-content-in {
  opacity: 0;
  animation: whatFlicker 0.4s steps(2) 1 forwards;
  animation-delay: 0.3s;
  height: 100%;
  overflow: hidden;
}

@keyframes whatFlicker {
  0% { opacity: 0; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.what-content::before,
.what-corner::before,
.what-content::after,
.what-corner::after {
  content: "";
  width: 10px;
  height: 10px;
  position: absolute;
  border: 2px solid #fff;
  opacity: 0;
  animation: whatCorners 0.3s forwards;
  animation-delay: 0.2s;
}

@keyframes whatCorners {
  100% { opacity: 1; }
}

.what-content::before { top: -2px; left: -2px; border-right: none; border-bottom: none; }
.what-corner::before { top: -2px; right: -2px; border-left: none; border-bottom: none; }
.what-content::after { bottom: -2px; left: -2px; border-top: none; border-right: none; }
.what-corner::after { bottom: -2px; right: -2px; border-left: none; border-top: none; }

.what-arrow {
  position: absolute;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 20px;
  height: 20px;
  border: 1px solid rgba(255,255,255,0.4);
}

.what-arrow::before {
  content: "";
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-45deg);
  border-left: 1px solid #fff;
  border-bottom: 1px solid #fff;
  transition: 0.4s;
  width: 8px;
  height: 8px;
}

.what-noTouch:hover .what-arrow::before,
.what-content-active .what-arrow::before {
  transform: translate(-50%, -10%) rotate(-225deg);
}

.what-border1 {
  position: absolute;
  top: 0;
  width: 100%;
  left: 50%;
  transform: translateX(-50%);
  height: 100%;
  transition: 0.5s;
  max-width: 0%;
  overflow: hidden;
  opacity: 0.4;
  animation: whatBorders 0.8s ease-out forwards;
}

.what-border1 svg {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 450px;
}

.what-border2 {
  position: absolute;
  top: 50%;
  width: 100%;
  left: 0;
  transform: translateY(-50%);
  height: 100%;
  max-height: 0%;
  overflow: hidden;
  transition: 0.5s;
  opacity: 0.4;
  animation: whatBorders 0.8s ease-out forwards;
}

.what-border2 svg {
  height: 500px;
  top: 50%;
  transform: translateY(-50%);
  position: absolute;
}

.what-content-in h5 {
  font-weight: 500;
  opacity: 0.4;
  font-size: 0.7rem;
  letter-spacing: 1px;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}

@keyframes whatBorders {
  100% {
    max-height: 100%;
    max-width: 100%;
    opacity: 0.2;
  }
}

.what-content-flex {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.what-tags {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 3px 10px;
  background-color: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.9);
}

@media (max-width: 1024px) {
  .whatIDO {
    flex-direction: column;
    align-items: flex-start;
  }
  .what-box { width: 100%; justify-content: flex-start; }
  .what-box h2 { margin-bottom: 2rem; }
  .what-box-in { height: auto; }
  .what-content { width: 100%; }
}
</style>
