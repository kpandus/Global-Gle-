<script setup>
// Simplified version: no interactions, both blocks shown fully.
</script>

<template>
  <div class="whatIDO">
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
          <svg width="100%" height="100%">
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
        <div class="what-content">
          <div class="what-border1">
            <svg height="100%" width="100%">
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
        <div class="what-content">
          <div class="what-border1">
            <svg height="100%" width="100%">
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
  width: 100%;
  max-width: 1200px;
  margin: auto;
  z-index: 9;
  --accentColor: #00ff88; 
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
  /* Reduced height to fit both blocks naturally */
  height: clamp(500px, 75vh, 650px);
  position: relative;
}

.what-content {
  width: clamp(300px, 30vw, 450px);
  height: 50%;
  position: relative;
  padding: 2rem 2.5rem;
  box-sizing: border-box;
  /* No interaction cursor */
}

.what-content h3 {
  font-size: clamp(1.2rem, 2vw, 2rem);
  letter-spacing: 1px;
  margin: 0;
  font-weight: 800;
}

.what-content p {
  font-size: 0.85rem;
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
  animation: whatFlicker 0.4s steps(2) 1 forwards;
  animation-delay: 0.3s;
  height: 100%;
  overflow: visible;
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
  opacity: 1; 
}

.what-content::before { top: -2px; left: -2px; border-right: none; border-bottom: none; }
.what-corner::before { top: -2px; right: -2px; border-left: none; border-bottom: none; }
.what-content::after { bottom: -2px; left: -2px; border-top: none; border-right: none; }
.what-corner::after { bottom: -2px; right: -2px; border-left: none; border-top: none; }

.what-border1 {
  position: absolute;
  top: 0;
  width: 100%;
  left: 0;
  height: 100%;
  opacity: 0.2;
}

.what-border1 svg {
  width: 100%;
  height: 100%;
}

.what-border2 {
  position: absolute;
  top: 0;
  width: 100%;
  left: 0;
  height: 100%;
  opacity: 0.2;
}

.what-border2 svg {
  width: 100%;
  height: 100%;
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

.what-content-flex {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.what-tags {
  font-size: 0.7rem;
  font-weight: 500;
  padding: 2px 8px;
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
  .what-content { width: 100%; height: auto; min-height: 250px; }
}
</style>
