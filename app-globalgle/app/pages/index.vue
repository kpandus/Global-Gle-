<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Earth from '~/components/Earth.client.vue'
import Scene from '~/components/Scene.client.vue'

const threeEarth = ref(null)
let cleanupFns = []

onMounted(async () => {
  const { gsap } = await import('gsap')
  const { ScrollTrigger } = await import('gsap/ScrollTrigger')
  gsap.registerPlugin(ScrollTrigger)

  const $ = (sel) => document.querySelector(sel)
  const $$ = (sel) => document.querySelectorAll(sel)

  // ─── NAVBAR ───────────────────────────────────────────────────────────────
  const navbar = $('#navbar')
  const onScroll = () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 80)
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  cleanupFns.push(() => window.removeEventListener('scroll', onScroll))

  // ─── ANIMATION CONSTANTS ──────────────────────────────────────────────────
  const heroH = 400 * (window.innerHeight / 100) // 400vh
  const sceneH = 130 * (window.innerHeight / 100) // 130vh

  // ─── HERO & TRAVEL LOGIC ──────────────────────────────────────────────────
  const title = $('#hero-title')
  const btns = $('.hero-btns')
  const globeCanvas = $('#globe-canvas')

  // Initial state forced by JS to ensure no flash
  gsap.set(title, { opacity: 0 })
  gsap.set(btns, { opacity: 1, pointerEvents: 'all' })

  ScrollTrigger.create({
    trigger: '#hero',
    start: 'top top',
    end: `bottom+=${sceneH} top`, 
    scrub: 1,
    onUpdate: (self) => {
      const scrollY = window.scrollY
      const isMobile = window.innerWidth < 768

      // 1. Globe Progress
      const globeP = Math.min(1, scrollY / (heroH * 0.8))
      if (threeEarth.value?.setScrollProgress) {
        threeEarth.value.setScrollProgress(globeP * 0.35)
      }

      // 2. Title & Buttons Appearance Logic
      const appearanceStart = heroH * 0.75
      const appearanceEnd = heroH * 0.85

      // Buttons are visible immediately from scrollY = 0
      if (scrollY < appearanceEnd) {
        gsap.set(btns, { opacity: 1, pointerEvents: 'all' })
      } else {
        gsap.set(btns, { opacity: 0, pointerEvents: 'none' })
      }

      // Title remains delayed (appears when globe is near finish)
      if (scrollY < appearanceStart) {
        gsap.set(title, { opacity: 0 })
      } else if (scrollY < appearanceEnd) {
        const revealP = (scrollY - appearanceStart) / (appearanceEnd - appearanceStart)
        gsap.set(title, { opacity: revealP, scale: 1, y: 0, color: '#fff' })
      } else {
        // Keep title visible during journey and docking
        gsap.set(title, { opacity: 1 })
      }

      // 3. THE LANDING JOURNEY
      if (scrollY > appearanceEnd) {
        const landingPoint = heroH + (sceneH * 0.2)
        const journeyP = Math.min(1, (scrollY - appearanceEnd) / (landingPoint - appearanceEnd))
        
        const targetY = -window.innerHeight * 0.36
        const targetScale = isMobile ? 0.35 : 0.3
        const colorVal = gsap.utils.interpolate("#ffffff", "#00ff88", journeyP)

        let yPos = journeyP * targetY

        // ATTACHMENT: Once scrollY > landingPoint, we offset by scroll to "pin" it to the cap
        let topFade = 1
        if (scrollY > landingPoint) {
           const offset = (scrollY - landingPoint)
           yPos -= offset
           
           // FADE OUT if it gets too high (near top/navbar)
           const topThreshold = -window.innerHeight * 0.52
           if (yPos < topThreshold) {
              topFade = Math.max(0, 1 - (topThreshold - yPos) / 60)
           }
        }

        // Hide navbar during journey
        if (navbar) navbar.classList.add('nav-hide')

        gsap.set(title, {
          y: yPos,
          scale: 1 - (journeyP * (1 - targetScale)),
          color: colorVal,
          opacity: topFade,
          textShadow: `0 0 ${journeyP * 30}px rgba(0, 255, 136, ${0.4 + journeyP * 0.6})`
        })
        
        if (globeCanvas) {
           const globeFadeP = Math.min(1, Math.max(0, (scrollY - heroH + 200) / 400))
           globeCanvas.style.opacity = 1 - globeFadeP
        }
      } else {
        if (navbar) navbar.classList.remove('nav-hide')
      }

      // 4. Final Exit
      const exitStart = heroH + sceneH - 200
      if (scrollY > exitStart) {
        const exitP = Math.min(1, (scrollY - exitStart) / 400)
        gsap.set(title, { opacity: 1 - exitP })
      }
    }
  })

  // ─── NUMBERS section logic ───────────────────────────────────────────────
  const numberItems = gsap.utils.toArray('.number-item')
  numberItems.forEach((el, i) => {
    ScrollTrigger.create({
      trigger: '#numbers-section',
      start: 'top 80%',
      end: 'bottom 20%',
      scrub: 1.5,
      onUpdate(self) {
        const p = self.progress
        const stagger = 0.07
        const duration = 0.28
        const itemStart = i * stagger
        const itemPeak  = itemStart + duration
        const itemEnd   = itemPeak + duration
        let local = 0
        if (p < itemStart) {
          local = 0
        } else if (p < itemPeak) {
          local = (p - itemStart) / duration
        } else if (p < itemEnd) {
          local = 1 - (p - itemPeak) / duration
        }
        if (p < itemPeak) {
          gsap.set(el, { opacity: local, x: (1 - local) * 200, y: (1 - local) * 200 })
        } else {
          gsap.set(el, { opacity: local, x: -(1 - local) * 200, y: -(1 - local) * 200 })
        }
      },
    })
  })

  gsap.utils.toArray('.number-layer').forEach((el, i) => {
    ScrollTrigger.create({
      trigger: '#numbers-section',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1,
      onUpdate(self) {
        gsap.set(el, { x: (i % 2 === 0 ? -1 : 1) * 30 * self.progress })
      }
    })
  })

  // ─── FAQ ─────────────────────────────────────────────────────────
  const faqLabel = $('#faq-label')
  if (faqLabel) {
    ScrollTrigger.create({
      trigger: '#faq-section',
      start: 'top 80%', end: 'top 45%', scrub: 1,
      onUpdate(self) { gsap.set(faqLabel, { opacity: self.progress, y: (1 - self.progress) * 20 }) }
    })
  }
  const faqHead = $('#faq-head')
  if (faqHead) {
    ScrollTrigger.create({
      trigger: '#faq-section',
      start: 'top 78%', end: 'top 40%', scrub: 1,
      onUpdate(self) { gsap.set(faqHead, { opacity: self.progress, y: (1 - self.progress) * 30 }) }
    })
  }
  const faqItems = $$('.faq-item')
  faqItems.forEach(el => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%', end: 'top 60%', scrub: 1,
      onUpdate(self) { gsap.set(el, { opacity: self.progress, y: (1 - self.progress) * 20 }) }
    })
    const btn = el.querySelector('.faq-q')
    const handler = () => {
      const isOpen = el.classList.contains('open')
      faqItems.forEach(x => x.classList.remove('open'))
      if (!isOpen) el.classList.add('open')
    }
    btn.addEventListener('click', handler)
    cleanupFns.push(() => btn.removeEventListener('click', handler))
  })

  // ─── GLE SECTION ─────────────────────────────────────────────────────────
  const gleWords = $$('.gle-word')
  gleWords.forEach((el, i) => {
    ScrollTrigger.create({
      trigger: '#gle-section',
      start: `top ${85 - i * 10}%`,
      end: `top ${55 - i * 10}%`,
      scrub: 1,
      onUpdate(self) { gsap.set(el, { opacity: self.progress, y: (1 - self.progress) * 60 }) },
      onLeave() {
        const t = gsap.to(el, {
          y: -28,
          duration: 0.6 + i * 0.08,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: i * 0.22,
        })
        cleanupFns.push(() => t.kill())
      }
    })
  })

  // ─── FOOTER ──────────────────────────────────────────────────────────────
  const footer = $('#footer')
  if (footer) {
    ScrollTrigger.create({
      trigger: '#footer-spacer',
      start: 'top 90%',
      end: 'top 20%',
      scrub: 1,
      onUpdate(self) {
        gsap.set(footer, { opacity: self.progress, scale: 0.96 + self.progress * 0.04 })
      }
    })
  }
})

onUnmounted(() => {
  if (window.ScrollTrigger) {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill())
  }
  cleanupFns.forEach(fn => fn())
})
</script>

<template>
  <main>
    <NavBar/>

    <!-- FIXED OVERLAY for the Title (moves across sections) -->
    <div class="fixed-ui-layer">
      <div class="hero-btns">
        <button class="btn-start">Get Started</button>
        <button class="btn-login">Login</button>
      </div>
      <h1 id="hero-title">
        <span class="hero-letter">G</span>
        <span class="hero-letter">l</span>
        <span class="hero-letter">o</span>
        <span class="hero-letter">b</span>
        <span class="hero-letter">a</span>
        <span class="hero-letter">l</span>
        <span class="hero-letter">G</span>
        <span class="hero-letter">L</span>
        <span class="hero-letter">E</span>
      </h1>
    </div>

    <!-- ── SECTION 1: HERO (Globe) ──────────────────────────────────────── -->
    <section id="hero">
      <ClientOnly>
        <Earth ref="threeEarth" />
      </ClientOnly>
    </section>

    <!-- ── SECTION 2: SCENE (Character) ─────────────────────────────────── -->
    <section>
      <div class="scene-wrapper">
        <ClientOnly>
          <Scene />
        </ClientOnly>
      </div>
    </section>

    <!-- ── SECTION 3: NUMBERS ────────────────────────────────────────────── -->
    <section id="numbers-section">
      <div class="numbers-screen">
        <div class="screen-chrome">
          <span class="chrome-dot"></span>
          <span class="chrome-dot"></span>
          <span class="chrome-dot"></span>
        </div>
        <div class="number-layer nl-top">
          <span class="number-item">$2.4B+</span>
          <span class="number-item">120+</span>
          <span class="number-item">40+</span>
          <span class="number-item">24/7</span>
        </div>
        <div class="number-layer nl-mid">
          <span class="number-item">120+</span>
          <span class="number-item">24/7</span>
          <span class="number-item">$2.4B+</span>
        </div>
        <div class="number-layer nl-bot">
          <span class="number-item">24/7</span>
          <span class="number-item">120+</span>
          <span class="number-item">40+</span>
          <span class="number-item">$2.4B+</span>
        </div>
        <div class="screen-scanlines" aria-hidden="true"></div>
        <div class="screen-vignette"  aria-hidden="true"></div>
      </div>
    </section>

    <!-- ── SECTION 4: FAQ ────────────────────────────────────────────────── -->
    <section id="faq-section">
      <p class="faq-label" id="faq-label">Questions</p>
      <h2 class="faq-header" id="faq-head">What this <em>actually</em> does.</h2>
      <div id="faq-list">
        <div class="faq-item">
          <div class="faq-q">How does GlobalGle process cross-border payments? <span>+</span></div>
          <div class="faq-a">Our platform leverages direct integrations with correspondent banks and local payment schemes, routing transactions through the most efficient path in real time with full auditability.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">What currencies and corridors are supported? <span>+</span></div>
          <div class="faq-a">We support 85+ currencies across 120+ countries. Our corridor coverage includes major G20 markets as well as underserved emerging market regions with native local settlement.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">How does compliance and KYC work? <span>+</span></div>
          <div class="faq-a">Compliance is embedded at every layer of our stack. We run real-time sanctions screening, automated KYC workflows, and jurisdiction-specific rule engines that update with regulatory changes automatically.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">What does integration look like for my team? <span>+</span></div>
          <div class="faq-a">Integration is API-first. Most teams are live within two weeks with our RESTful APIs, webhooks, and SDK libraries for major languages. Dedicated onboarding support is included.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">How is pricing structured? <span>+</span></div>
          <div class="faq-a">Pricing is volume-based with transparent per-transaction fees. We offer custom enterprise pricing for institutions clearing above $10M monthly. No hidden charges or subscription locks.</div>
        </div>
      </div>
    </section>

    <!-- ── SECTION 5: GLE ────────────────────────────────────────────────── -->
    <section id="gle-section">
      <div class="gle-text-wrap">
        <span class="gle-word">GLE</span>
        <span class="gle-word">GLE</span>
        <span class="gle-word">GLE</span>
      </div>
      <div id="w-overlay">W</div>
    </section>

    <!-- ── SECTION 6: FOOTER ─────────────────────────────────────────────── -->
    <div id="footer-spacer">
      <footer id="footer">
        <div class="footer-col1">
          <h3>Work with us.</h3>
          <div class="footer-form">
            <div class="footer-fields">
              <div class="footer-input-row">
                <svg width="18" height="18" fill="none" stroke="#fff" stroke-width="1.5" viewBox="0 0 24 24">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>
                </svg>
                <input type="email" placeholder="placeholder@email.com"/>
              </div>
              <div class="footer-input-row">
                <svg width="18" height="18" fill="none" stroke="#fff" stroke-width="1.5" viewBox="0 0 24 24">
                  <rect x="2" y="3" width="20" height="18" rx="2"/><path d="M16 3v4M8 3v4M2 11h20"/>
                </svg>
                <input type="text" placeholder="Company Name"/>
              </div>
              <div class="footer-input-row">
                <svg width="18" height="18" fill="none" stroke="#fff" stroke-width="1.5" viewBox="0 0 24 24">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 12 19.79 19.79 0 0 1 1 3.18 2 2 0 0 1 3 1h3a2 2 0 0 1 2 1.72A12.84 12.84 0 0 0 9 6.07a2 2 0 0 1-.45 2L7.09 9.5a16 16 0 0 0 7.5 7.5l1.44-1.44a2 2 0 0 1 2-.45 12.84 12.84 0 0 0 3.36.65A2 2 0 0 1 23 17z"/>
                </svg>
                <input type="tel" placeholder="+1 Placeholder Number"/>
              </div>
            </div>
            <button class="footer-submit">Submit</button>
          </div>
          <p class="footer-copy">© 2025 GlobalGle. All rights reserved.</p>
        </div>

        <div class="footer-col2">
          <nav>
            <a href="#">Work</a>
            <a href="#">About</a>
            <a href="#">Services</a>
            <a href="#">Portfolio</a>
            <a href="#">Contact</a>
          </nav>
        </div>

        <div class="footer-col3">
          <div class="social-header">Social</div>
          <div class="social-icons">
            <div class="social-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </div>
            <div class="social-icon">
              <svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </div>
          </div>
        </div>

        <div class="footer-bottom-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
      </footer>
    </div>
  </main>
</template>

<style scoped>
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: auto; }
:global(body) {
  background: #0a0d14;
  color: #fff;
  font-family: 'Urbanist', sans-serif;
  overflow-x: hidden;
}

/* ── UI LAYER ───────────────────────────────────────────────────────────── */
.fixed-ui-layer {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

#hero-title {
  font-family: 'Urbanist', sans-serif;
  font-size: clamp(3rem, 10vw, 9rem);
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #fff;
  will-change: transform, opacity;
  opacity: 0;
}
.hero-letter { display: inline-block; position: relative; }

.hero-btns {
  display: flex;
  align-items: center;
  pointer-events: all;
  opacity: 1;
  border-radius: 100px;
  padding: 5px;
  background: rgba(8,8,8,0.48);
  backdrop-filter: blur(40px) saturate(200%) brightness(1.05);
  border: 1px solid rgba(255,255,255,0.13);
  position: absolute;
  top: 35%;
  z-index: 20;
}
.btn-start { padding: 0.78rem 2.1rem; border-radius: 100px; font-weight: 600; cursor: pointer; color: #fff; background: rgba(0,80,40,0.85); border: 1.5px solid rgba(0,255,136,0.86); }
.btn-login { padding: 0.78rem 2.1rem; border-radius: 100px; cursor: pointer; color: rgba(255,255,255,0.78); background: transparent; border: none; }

/* ── SECTIONS ───────────────────────────────────────────────────────────── */
#hero {
  position: relative;
  width: 100vw;
  height: 400vh;
  background: #0a0d14;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scene-wrapper {
  width: 100vw;
  height: 130vh;
  background: #0a0d14;
  position: relative;
  z-index: 5;
  border-top: 1px solid rgba(255,255,255,0.05);
}

/* NUMBERS */
#numbers-section { width: 100vw; min-height: 120vh; background: #0a0d14; display: flex; align-items: center; justify-content: center; padding: 4rem; overflow: hidden; position: relative; z-index: 10; }
.numbers-screen { position: relative; width: min(860px, 90vw); min-height: 480px; border-radius: 16px; border: 1px solid rgba(0,255,136,0.18); background: rgba(0,0,0,0.82); padding: 3.5rem 2.5rem 2.5rem; display: flex; flex-direction: column; justify-content: center; gap: 1.2rem; overflow: hidden; }
.screen-chrome { position: absolute; top: 1.1rem; left: 1.4rem; display: flex; gap: 0.45rem; }
.chrome-dot { width: 10px; height: 10px; border-radius: 50%; }
.chrome-dot:nth-child(1) { background: rgba(255,80,80,0.55); border: 1px solid rgba(255,80,80,0.7); }
.chrome-dot:nth-child(2) { background: rgba(255,200,0,0.55); border: 1px solid rgba(255,200,0,0.7); }
.chrome-dot:nth-child(3) { background: rgba(0,255,136,0.55); border: 1px solid rgba(0,255,136,0.7); }
.number-layer { display: flex; gap: 4rem; margin: 1.8rem 0; white-space: nowrap; }
.number-item { font-family: 'Urbanist', sans-serif; font-weight: 800; line-height: 1; will-change: transform, opacity; }
.nl-top .number-item { font-size: clamp(3rem, 8vw, 7rem); color: rgba(0,255,136,0.4); -webkit-text-stroke: 1px rgba(255,255,255,0.15); }
.nl-mid .number-item { font-size: clamp(5rem, 14vw, 13rem); -webkit-text-stroke: 2px rgba(0,255,136,0.4); color: transparent; }
.nl-bot .number-item { font-size: clamp(2.5rem, 6vw, 5rem); color: rgba(0,255,136,0.4); -webkit-text-stroke: 1px rgba(255,255,255,0.15); }

#faq-section { width: 100vw; min-height: 100vh; background: #0a0d14; padding: 6rem 10vw; position: relative; z-index: 10; }
.faq-label { font-size: 0.8rem; letter-spacing: 0.2em; text-transform: uppercase; color: #00ff88; display: block; text-align: center; }
.faq-header { font-family: 'Urbanist', sans-serif; font-size: clamp(2rem, 5vw, 4rem); font-weight: 800; margin: 1rem auto 3rem; max-width: 700px; text-align: center; }
.faq-item { border: 1px solid #1f1f1f; border-radius: 14px; padding: 1.5rem 1.8rem; margin-bottom: 0.75rem; background: rgba(255,255,255,0.02); transition: all 0.2s; }
.faq-item.open { border-color: rgba(0,255,136,0.35); background: rgba(0,255,136,0.04); }
.faq-q { display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 1.05rem; font-weight: 500; }
.faq-a { max-height: 0; overflow: hidden; transition: all 0.4s ease; color: #6b7280; font-size: 0.95rem; }
.faq-item.open .faq-a { max-height: 200px; padding-top: 1rem; }

#gle-section { width: 100vw; min-height: 80vh; background: #0a0d14; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; z-index: 15; }
.gle-text-wrap { display: flex; gap: clamp(1rem, 4vw, 4rem); }
.gle-word { font-family: 'Urbanist', sans-serif; font-size: clamp(4rem, 12vw, 11rem); font-weight: 800; color: transparent; -webkit-text-stroke: 1.5px rgba(255,255,255,0.18); }

#footer-spacer { width: 100vw; position: relative; z-index: 30; background: #0a0d14; overflow: hidden; }
#footer { background: #0a0d14; width: 100%; min-height: 70vh; padding: 5rem 6vw 4rem; display: grid; grid-template-columns: 1.6fr 0.7fr 0.7fr; gap: 4rem; }
.footer-col1 h3 { font-family: 'Urbanist', sans-serif; font-size: clamp(1.8rem, 3.5vw, 3rem); font-weight: 700; margin-bottom: 2rem; }
.footer-form { display: flex; flex-direction: column; gap: 1rem; }
.footer-input-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.9rem 1.25rem; border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; background: rgba(255,255,255,0.08); }
.footer-input-row input { background: transparent; border: none; color: #fff; width: 100%; outline: none; }
.footer-submit { padding: 1rem 2rem; background: #fff; color: #0a0d14; border: none; border-radius: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }

@media (max-width: 768px) {
  #footer { grid-template-columns: 1fr; }
}
</style>
