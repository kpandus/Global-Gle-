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

  // ─── HERO EARTH FADE ─────────────────────────────────────────────────────
  ScrollTrigger.create({
    trigger: '#hero',
    start: 'top top',
    end: 'bottom+=1000vh top', // Extend so it keeps updating during character section
    scrub: 1,
    onUpdate: (self) => {
      if (!threeEarth.value) return
      
      const hero = document.getElementById('hero')
      if (!hero) return
      const heroHeight = hero.offsetHeight
      const heroP = Math.min(1, window.scrollY / heroHeight)
      
      // Globe joins early (0 to 0.15 of heroP)
      const globeJoinP = Math.min(1, heroP / 0.15)
      if (threeEarth.value.setScrollProgress) {
        threeEarth.value.setScrollProgress(globeJoinP * 0.35) 
      }

      const globeCanvas = document.getElementById('globe-canvas')
      if (globeCanvas) {
        const op = heroP > 0.8 ? Math.max(0, 1 - (heroP - 0.8) / 0.15) : 1
        globeCanvas.style.opacity = op
        globeCanvas.style.visibility = op === 0 ? 'hidden' : 'visible'
      }

      // Title Logic
      const title = $('#hero-title')
      const btns = $('.hero-btns')
      
      // Hero buttons stay for a long time after globe joins (until heroP > 0.8)
      if (btns) {
        if (heroP < 0.8) {
          gsap.set(btns, { opacity: 1, y: 0 })
        } else if (heroP < 0.95) {
          const p = (heroP - 0.8) / 0.15
          gsap.set(btns, { opacity: 1 - p, y: -p * 100 })
        } else {
          gsap.set(btns, { opacity: 0, y: -100 })
        }
      }

      if (title) {
        if (heroP < 0.35) {
          gsap.set(title, { opacity: 0, scale: 1, y: 0 })
        } else if (heroP < 0.5) {
          const fadeP = (heroP - 0.35) / 0.15
          gsap.set(title, { opacity: fadeP, scale: 1, y: 0 })
        } else if (heroP < 0.65) {
          gsap.set(title, { opacity: 1, scale: 1, y: 0 })
        } else if (heroP < 0.95) {
          // Move to cap
          const moveP = (heroP - 0.65) / 0.3
          const isMobile = window.innerWidth < 768
          
          const targetY = isMobile ? window.innerHeight * 0.8 : window.innerHeight * 0.6
          const targetScale = isMobile ? 0.4 : 0.35 // Reduced size as requested
          
          const colorVal = gsap.utils.interpolate("#ffffff", "#00ff88", moveP)
          const scaleP = Math.pow(moveP, 0.7) 
          
          gsap.set(title, { 
            y: moveP * targetY, 
            scale: 1 - (scaleP * (1 - targetScale)),
            opacity: 1,
            color: colorVal,
            textShadow: `0 0 ${moveP * 25}px rgba(0, 255, 136, ${moveP * 0.8})`
          })
        } else {
          // Finished transition - Docked to cap
          const isMobile = window.innerWidth < 768
          const targetY = isMobile ? window.innerHeight * 0.8 : window.innerHeight * 0.6
          const targetScale = isMobile ? 0.4 : 0.35
          
          // Calculate scroll distance past the docking point
          const dockingScrollPos = heroHeight * 0.95
          const scrollPast = window.scrollY - dockingScrollPos
          
          // Fade out as requested (Stay for a bit, then fade)
          const fadeOutStart = 1200 // Wait for 1200px of scroll (approx 3s longer)
          const fadeOutDist = 600  // Fade out over 600px
          let opacity = 1
          if (scrollPast > fadeOutStart) {
            opacity = Math.max(0, 1 - (scrollPast - fadeOutStart) / fadeOutDist)
          }

          gsap.set(title, { 
            y: targetY - scrollPast, 
            scale: targetScale, 
            opacity: opacity,
            color: "#00ff88",
            textShadow: `0 0 25px rgba(0, 255, 136, 0.8)`
          })
        }
      }

      const earthMount = document.querySelector('.earth-mount')
      if (earthMount) {
        earthMount.style.display = heroP >= 0.99 ? 'none' : ''
      }
    }
  })

  // Remove the initial entrance animation to avoid conflict with scroll logic
  const letters = document.querySelectorAll('.hero-letter')
  gsap.set(letters, { opacity: 1, y: 0, scale: 1 }) 

  gsap.set('.hero-content', { clearProps: 'all' })
  gsap.to('.hero-btns', { opacity: 1, duration: 1, ease: 'power2.out', delay: 1.1 })

  // ─── NUMBERS ───────────────────────────────────────────────────────────────
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

  // ─── FAQ SECTION ─────────────────────────────────────────────────────────
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

    <div class="hero-content">
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

    <!-- ── HERO ───────────────────────────────────────────────────────────── -->
    <section id="hero">
      <ClientOnly>
        <Earth ref="threeEarth" class="earth-mount" />
      </ClientOnly>
    </section>

    <!-- ── SCENE (character section) ─────────────────────────────────────── -->
    <section>
      <div class="scene-wrapper">
        <ClientOnly>
          <Scene />
        </ClientOnly>
      </div>
    </section>

    <!-- ── NUMBERS ────────────────────────────────────────────────────────── -->
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

    <!-- ── FAQ ────────────────────────────────────────────────────────────── -->
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

    <!-- ── GLE ────────────────────────────────────────────────────────────── -->
    <section id="gle-section">
      <div class="gle-text-wrap">
        <span class="gle-word">GLE</span>
        <span class="gle-word">GLE</span>
        <span class="gle-word">GLE</span>
      </div>
      <div id="w-overlay">W</div>
    </section>

    <!-- ── FOOTER ─────────────────────────────────────────────────────────── -->
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
/* (All existing styles remain unchanged) */
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: auto; }
:global(body) {
  background: #0a0d14;
  color: #fff;
  font-family: 'Urbanist', sans-serif;
  overflow-x: hidden;
}


/* HERO */
#hero {
  position: relative;
  width: 100vw;
  height: 1500vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.hero-content {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2.5rem;
  z-index: 10;
  pointer-events: none;
}
#hero-title {
  font-family: 'Urbanist', sans-serif;
  font-size: clamp(3rem, 10vw, 9rem);
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center center;
  will-change: transform, opacity;
}
.hero-letter {
  display: inline-block;
  position: relative;
  will-change: transform, opacity;
}
.hero-btns {
  display: flex;
  align-items: center;
  pointer-events: all;
  opacity: 0;
  border-radius: 100px;
  padding: 5px;
  background: rgba(8,8,8,0.48);
  backdrop-filter: blur(40px) saturate(200%) brightness(1.05);
  border: 1px solid rgba(255,255,255,0.13);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.2), 0 10px 40px rgba(0,0,0,0.45);
  position: absolute;
  top: 35%;
  z-index: 20;
  overflow: hidden;
}
.hero-btns::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.07) 100%);
  pointer-events: none;
}
.btn-start {
  padding: 0.78rem 2.1rem;
  border-radius: 100px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  cursor: pointer;
  color: #fff;
  background: rgba(0,80,40,0.85);
  border: 1.5px solid rgba(0,255,136,0.86);
  box-shadow: inset 0 1px 0 rgba(0,255,136,0.25), inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 18px rgba(0,255,136,0.2);
  transition: background 0.25s, border-color 0.25s, box-shadow 0.25s, transform 0.2s;
}
.btn-start:hover {
  transform: scale(1.03);
  background: rgba(0,100,50,0.92);
  border-color: #00ff88;
  box-shadow: inset 0 1px 0 rgba(0,255,136,0.3), inset 0 -1px 0 rgba(0,0,0,0.25), 0 0 32px rgba(0,255,136,0.38);
}
.btn-login {
  padding: 0.78rem 2.1rem;
  border-radius: 100px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  cursor: pointer;
  color: rgba(255,255,255,0.78);
  background: transparent;
  border: none;
  transition: color 0.2s, background 0.2s;
}
.btn-login:hover { color: #fff; background: rgba(255,255,255,0.07); }

/* SCENE (character section) */
.scene-wrapper {
  width: 100vw;
  height: 130vh;
  position: relative;
  z-index: 5;
  background: #0a0d14;
  overflow: hidden;
}
.scene-gle-text {
  position: absolute;
  font-family: 'Urbanist', sans-serif;
  font-size: clamp(3rem, 8vw, 6rem);
  font-weight: 800;
  color: rgba(0,255,136,1);
  -webkit-text-stroke: 2px rgba(0,255,136,0.7);
  letter-spacing: 0.1em;
  z-index: 10;
  white-space: nowrap;
  pointer-events: none;
  will-change: transform, opacity, left, top;
}

/* NUMBERS */
#numbers-section {
  width: 100vw;
  min-height: 120vh;
  background: #0a0d14;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  overflow: hidden;
  position: relative;
  z-index: 2;
}
.numbers-screen {
  position: relative;
  width: min(860px, 90vw);
  min-height: 480px;
  border-radius: 16px;
  border: 1px solid rgba(0,255,136,0.18);
  background: rgba(0,0,0,0.82);
  box-shadow: 0 0 0 1px rgba(0,255,136,0.06), 0 0 40px rgba(0,255,136,0.06), inset 0 0 60px rgba(0,0,0,0.6);
  padding: 3.5rem 2.5rem 2.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.2rem;
  overflow: hidden;
}
.screen-chrome { position: absolute; top: 1.1rem; left: 1.4rem; display: flex; gap: 0.45rem; align-items: center; }
.chrome-dot { width: 10px; height: 10px; border-radius: 50%; }
.chrome-dot:nth-child(1) { background: rgba(255,80,80,0.55);   border: 1px solid rgba(255,80,80,0.7); }
.chrome-dot:nth-child(2) { background: rgba(255,200,0,0.55);   border: 1px solid rgba(255,200,0,0.7); }
.chrome-dot:nth-child(3) { background: rgba(0,255,136,0.55);   border: 1px solid rgba(0,255,136,0.7); }
.screen-scanlines {
  position: absolute; inset: 0; border-radius: 20px;
  background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px);
  pointer-events: none; z-index: 10;
}
.screen-vignette {
  position: absolute; inset: 0; border-radius: 20px;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%);
  pointer-events: none; z-index: 11;
}
.number-layer { display: flex; gap: 4rem; margin: 1.8rem 0; white-space: nowrap; }
.number-item {
  font-family: 'Urbanist', sans-serif;
  font-weight: 800;
  line-height: 1;
  user-select: none;
  will-change: transform, opacity;
}
.nl-top .number-item { font-size: clamp(3rem, 8vw, 7rem); color: rgba(0,255,136,0.4); -webkit-text-stroke: 1px rgba(255,255,255,0.15); }
.nl-mid .number-item { font-size: clamp(5rem, 14vw, 13rem); -webkit-text-stroke: 2px rgba(0,255,136,0.4); color: transparent; }
.nl-bot .number-item { font-size: clamp(2.5rem, 6vw, 5rem); color: rgba(0,255,136,0.4); -webkit-text-stroke: 1px rgba(255,255,255,0.15); }

/* FAQ */
#faq-section {
  width: 100vw; min-height: 100vh; background: #0a0d14;
  padding: 6rem 10vw; position: relative; z-index: 40;
}
#faq-section::before {
  content: 'FAQ';
  position: absolute; top: 60%; left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Urbanist', sans-serif;
  font-size: clamp(20rem, 22vw, 28rem);
  font-weight: 500;
  color: rgba(255,255,255,0.045);
  -webkit-text-stroke: 2px rgba(255,255,255,0.045);
  letter-spacing: 0.15em;
  pointer-events: none; z-index: 0; white-space: nowrap; user-select: none;
}
.faq-label { font-size: 0.8rem; letter-spacing: 0.2em; text-transform: uppercase; color: #00ff88; display: block; text-align: center; }
.faq-header { font-family: 'Urbanist', sans-serif; font-size: clamp(2rem, 5vw, 4rem); font-weight: 800; margin: 1rem auto 3rem; max-width: 700px; text-align: center; }
.faq-item {
  border: 1px solid #1f1f1f; border-radius: 14px; padding: 1.5rem 1.8rem;
  margin-bottom: 0.75rem; background: rgba(255,255,255,0.02);
  transition: border-color 0.2s, background 0.2s;
}
.faq-item:hover { border-color: rgba(0,255,136,0.25); background: rgba(0,255,136,0.03); }
.faq-item.open  { border-color: rgba(0,255,136,0.35); background: rgba(0,255,136,0.04); }
.faq-q { display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 1.05rem; font-weight: 500; gap: 1rem; }
.faq-q span { color: #4b5563; font-size: 1.3rem; line-height: 1; transition: transform 0.3s; flex-shrink: 0; }
.faq-a { max-height: 0; overflow: hidden; transition: max-height 0.4s ease, padding 0.3s; color: #6b7280; font-size: 0.95rem; line-height: 1.7; }
.faq-item.open .faq-q span { transform: rotate(45deg); }
.faq-item.open .faq-a { max-height: 200px; padding-top: 1rem; }

/* GLE */
#gle-section {
  width: 100vw; min-height: 80vh; background: #0a0d14;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; position: relative; z-index: 15;
}
.gle-text-wrap { display: flex; gap: clamp(1rem, 4vw, 4rem); position: relative; z-index: 2; }
.gle-word {
  font-family: 'Urbanist', sans-serif;
  font-size: clamp(4rem, 12vw, 11rem); font-weight: 800;
  color: transparent; -webkit-text-stroke: 1.5px rgba(255,255,255,0.18);
  letter-spacing: 0.05em;
}
#w-overlay {
  position: fixed; top: 50%; left: 50%;
  font-family: 'Urbanist', sans-serif;
  font-size: clamp(6rem, 20vw, 18rem); font-weight: 800;
  color: #7c3aed; opacity: 0; z-index: 25;
  pointer-events: none; will-change: transform, opacity;
}

/* FOOTER */
#footer-spacer { width: 100vw; position: relative; z-index: 30; background: #0a0d14; overflow: hidden; }
#footer {
  background: #0a0d14;
  width: 100%; min-height: 70vh;
  padding: 5rem 6vw 4rem;
  display: grid;
  grid-template-columns: 1.6fr 0.7fr 0.7fr;
  gap: 4rem;
  position: relative; z-index: 30;
}
.footer-col1 h3 { font-family: 'Urbanist', sans-serif; font-size: clamp(1.8rem, 3.5vw, 3rem); font-weight: 700; color: #fff; margin-bottom: 2rem; }
.footer-form { display: flex; flex-direction: column; gap: 1rem; align-items: stretch; }
.footer-fields { flex: 1; display: flex; flex-direction: column; gap: 0.85rem; }
.footer-input-row {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.9rem 1.25rem;
  border: 1px solid rgba(255,255,255,0.2); border-radius: 12px;
  background: rgba(255,255,255,0.08);
}
.footer-input-row svg { opacity: 0.6; flex-shrink: 0; }
.footer-input-row input { background: transparent; border: none; color: #fff; font-family: 'Space Grotesk', sans-serif; font-size: 0.95rem; outline: none; width: 100%; }
.footer-input-row input::placeholder { color: rgba(255,255,255,0.45); }
.footer-submit {
  padding: 1rem 2rem; background: #fff; color: #0a0d14;
  border: none; border-radius: 14px;
  font-family: 'Urbanist', sans-serif; font-size: 1rem; font-weight: 700;
  cursor: pointer; align-self: stretch; min-height: 100%;
  transition: opacity 0.2s, transform 0.2s;
}
.footer-submit:hover { opacity: 0.9; transform: translateY(-2px); }
.footer-copy { margin-top: 2rem; font-size: 0.8rem; color: rgba(255,255,255,0.45); }
.footer-col2 { padding-top: 0.5rem; }
.footer-col2 nav { display: flex; flex-direction: column; gap: 1.1rem; }
.footer-col2 nav a { color: rgba(255,255,255,0.7); text-decoration: none; font-size: 0.95rem; letter-spacing: 0.03em; transition: color 0.2s; }
.footer-col2 nav a:hover { color: #fff; }
.footer-col3 { padding-top: 0.5rem; }
.footer-col3 .social-header { font-family: 'Urbanist', sans-serif; font-size: 1.2rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem; }
.social-icons { display: flex; gap: 1rem; }
.social-icon { width: 44px; height: 44px; border: 1px solid rgba(255,255,255,0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s; }
.social-icon:hover { background: rgba(255,255,255,0.15); }
.social-icon svg { width: 20px; height: 20px; fill: #fff; }
.footer-bottom-links { position: absolute; bottom: 3rem; right: 6vw; display: flex; gap: 2rem; }
.footer-bottom-links a { color: rgba(255,255,255,0.45); text-decoration: none; font-size: 0.8rem; transition: color 0.2s; }
.footer-bottom-links a:hover { color: #fff; }

/* MOBILE RESPONSIVE */
@media (max-width: 768px) {
  #hero { height: 220vh; }
  .hero-content { gap: 1.5rem; }
  #hero-title { font-size: clamp(2.2rem, 14vw, 5rem); }
  .numbers-screen { width: 98vw; padding: 2.5rem 1rem 1.5rem; min-height: 320px; }
  .nl-mid .number-item { font-size: clamp(3rem, 10vw, 6rem); }
  #bigtext-section { padding: 4rem 6vw; min-height: 50vh; }
  #bigtext-section h2 { font-size: clamp(1.5rem, 7vw, 2.8rem); }
  #bigtext-section .desc { font-size: 1rem; }
  .scene-wrapper { height: 80vh; }
  .scene-gle-text { font-size: clamp(2rem, 6vw, 4rem); }
  #faq-section { padding: 4rem 5vw; }
  .faq-header { font-size: clamp(1.6rem, 7vw, 2.5rem); margin-bottom: 2rem; }
  .faq-item { padding: 1.1rem 1.2rem; }
  .faq-q { font-size: 0.92rem; }
  #footer { grid-template-columns: 1fr; gap: 2.5rem; padding: 3rem 5vw 2.5rem; }
  .footer-bottom-links { position: relative; bottom: auto; right: auto; margin-top: 1.5rem; }
  .footer-submit { width: 100%; min-height: 52px; }
  #gle-section { min-height: 40vh; }
  .gle-word { font-size: clamp(3rem, 10vw, 6rem); }
  .nav-brand { display: none; }
  #footer { margin-top: 0 !important; clip-path: none !important; opacity: 1 !important; }
}
@media (max-width: 480px) {
  #hero-title { font-size: clamp(2rem, 16vw, 3.5rem); letter-spacing: 0.05em; }
  .hero-btns { padding: 4px; }
  .btn-start { padding: 0.65rem 1.4rem; font-size: 0.88rem; }
  .btn-login { padding: 0.65rem 1.2rem; font-size: 0.88rem; }
  #faq-section { padding: 3rem 4vw; }
}
</style>
