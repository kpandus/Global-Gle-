<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Earth from '~/components/Earth.client.vue'
import Scene from '~/components/Scene.client.vue'

const threeEarth = ref(null)
let cleanupFns = []

onMounted(async () => {
  const { gsap } = await import('gsap')
  const { ScrollTrigger } = await import('gsap/ScrollTrigger')
  gsap.registerPlugin(ScroallTrigger)

  const $ = (sel) => document.querySelector(sel)
  const $$ = (sel) => document.querySelectorAll(sel)

  // ─── STABLE DIMENSIONS ──────────────────────────────────────────────────
  let baseH = window.innerHeight
  let baseW = window.innerWidth

  const updateDimensions = () => {
    if (window.innerWidth !== baseW) {
      baseW = window.innerWidth
      baseH = window.innerHeight
      ScrollTrigger.refresh()
    }
  }
  window.addEventListener('resize', updateDimensions)
  cleanupFns.push(() => window.removeEventListener('resize', updateDimensions))

  // ─── NAVBAR ───────────────────────────────────────────────────────────────
  const navbar = $('#navbar')
  const navBrand = $('.nav-brand')
  const onScroll = () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 80)
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  cleanupFns.push(() => window.removeEventListener('scroll', onScroll))

  // Hide nav brand initially for reveal effect
  if (navBrand) gsap.set(navBrand, { opacity: 0 })

  // ─── ANIMATION CONSTANTS ─────────────────────────────────────────────────
  const getHeroH = () => 4 * baseH
  const getSceneH = () => 2.5 * baseH

  // ─── HERO & TRAVEL LOGIC ──────────────────────────────────────────────────
  const title = $('#hero-title')
  const btns = $('.hero-btns')
  const globeCanvas = $('#globe-canvas')

  gsap.set(title, { opacity: 0 })
  gsap.set(btns, { opacity: 1, pointerEvents: 'all' })

  ScrollTrigger.create({
    trigger: '#hero',
    start: 'top top',
    end: () => `bottom+=${document.body.scrollHeight} top`,
    scrub: 1,
    onUpdate: (self) => {
      const scrollY = self.scroll()
      
      const isAndroid = /Android/i.test(navigator.userAgent)
      const isLargeScreen = window.matchMedia("(min-width: 1025px)").matches
      const isDesktopView = isLargeScreen || isAndroid
      const isMobile = !isDesktopView

      const hh = getHeroH()
      const sh = getSceneH()

      const globeP = Math.min(1, scrollY / (hh * 0.8))
      if (threeEarth.value?.setScrollProgress) {
        threeEarth.value.setScrollProgress(globeP)
      }

      const appearanceStart = hh * 0.25
      const appearanceEnd = hh * 0.45

      if (scrollY < appearanceEnd) {
        gsap.set(btns, { opacity: 1, pointerEvents: 'all' })
      } else {
        gsap.set(btns, { opacity: 0, pointerEvents: 'none' })
      }

      if (scrollY < appearanceStart) {
        gsap.set(title, { opacity: 0, y: 0 })
      } else if (scrollY < appearanceEnd) {
        const revealP = (scrollY - appearanceStart) / (appearanceEnd - appearanceStart)
        gsap.set(title, { opacity: revealP, scale: 1, y: 0, color: '#fff' })
      } else {
        gsap.set(title, { opacity: 1 })
      }

      if (scrollY >= appearanceEnd) {
        const landingPoint = hh + (sh * 0.2)
        const journeyP = Math.min(1, (scrollY - appearanceEnd) / (landingPoint - appearanceEnd))

        // Docking: Desktop high (-0.35), Mobile at center (0) as requested (52% height)
        const targetY = isMobile ? 0 : -baseH * 0.35
        const targetScale = isMobile ? 0.35 : 0.3
        const colorVal = gsap.utils.interpolate("#ffffff", "#00ff88", journeyP)

        let yPos = journeyP * targetY
        let topFade = 1

        if (scrollY > landingPoint) {
           yPos = targetY

           // UN-STICK LOGIC: Only apply to desktop, as user wants mobile to "stick there"
           if (!isMobile) {
             const unstickPoint = hh + sh * 0.2 
             if (scrollY > unstickPoint) {
                yPos -= (scrollY - unstickPoint)
             }
             
             const topThreshold = targetY - 20
             if (yPos < topThreshold) {
                topFade = Math.max(0, 1 - (topThreshold - yPos) / 100)
             }
           }
        }

        gsap.set(title, {
          y: yPos,
          scale: 1 - (journeyP * (1 - targetScale)),
          color: colorVal,
          opacity: topFade,
          textShadow: `0 0 ${journeyP * 30}px rgba(0, 255, 136, ${0.4 + journeyP * 0.6})`
        })

        // Reveal navbar brand ONLY after hero title starts fading/moving away
        if (navBrand) {
          const brandRevealP = Math.max(0, Math.min(1, (scrollY - (hh + sh * 0.3)) / 500))
          gsap.set(navBrand, { opacity: brandRevealP })
        }
      } else {
        if (navBrand) gsap.set(navBrand, { opacity: 0 })
      }

      if (globeCanvas) {
        const globeFadeP = Math.min(1, Math.max(0, (scrollY - hh + 200) / 400))
        globeCanvas.style.opacity = 1 - globeFadeP
        globeCanvas.style.pointerEvents = globeFadeP >= 1 ? 'none' : 'none'
      }

      const exitStart = hh + sh - 600
      if (scrollY > exitStart) {
        const exitP = Math.min(1, (scrollY - exitStart) / 400)
        gsap.set(title, { opacity: 1 - exitP })
      }
    }
  })

  // ─── W REVEAL FOOTER ANIMATION ──────────────────────────────────────────
  const footerSec = $('#footer-reveal-section')
  const wOverlay = $('#w-overlay')
  const wBloom = $('#w-bloom')
  const stickyWrap = $('#footer-sticky-wrap')
  const footerContent = $('#footer-content')

  ScrollTrigger.create({
    trigger: footerSec,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.2,
    onUpdate(self) {
      const p = self.progress

      // PHASE 1: W WIREFRAME FORMS (0.0 → 0.44)
      if (p < 0.44) {
        const morphP = p / 0.44
        const stroke = 2 + morphP * 6
        gsap.set(wOverlay, {
          opacity: morphP > 0.05 ? 1 : 0,
          scale: 0.4 + morphP * 0.82,
          color: 'transparent',
          webkitTextStroke: `${stroke}px rgba(0, 160, 80, ${Math.min(1, morphP * 1.4)})`,
          filter: 'none',
          textShadow: 'none'
        })
        gsap.set(wBloom, { opacity: 0 })
        gsap.set(footerContent, { opacity: 0 })
      }

      // PHASE 2: W FILLS SOLID PURPLE (0.44 → 0.62)
      if (p >= 0.44 && p < 0.62) {
        const fillP = (p - 0.44) / 0.18
        gsap.set(wOverlay, {
          opacity: 1,
          scale: 1.22 + fillP * 0.08,
          color: `rgba(0, 100, 50, ${fillP})`,
          webkitTextStroke: '8px rgba(0, 160, 80, 1)',
          filter: 'none',
          textShadow: 'none'
        })
        gsap.set(wBloom, { opacity: 0 })
        gsap.set(footerContent, { opacity: 0 })
      }

      // PHASE 3: W EXPANDS — FOOTER OPENS (0.62 → 1.0)
      if (p >= 0.62) {
        const expandP = Math.min(1, (p - 0.62) / 0.38)
        const ease = expandP * expandP * (3 - 2 * expandP)
        const wScale = 1.30 + ease * 34

        // Footer rises in — starts at 28% into expansion
        const footerRaw = Math.max(0, (expandP - 0.28) / 0.72)
        const footerEase = footerRaw * footerRaw * (3 - 2 * footerRaw)

        // W fades out as footer appears — eliminates dark letter gaps on purple bg
        const wOpacity = Math.max(0, 1 - footerEase * 2)

        gsap.set(wOverlay, {
          opacity: wOpacity,
          scale: wScale,
          color: 'rgba(0, 100, 50, 1)',
          webkitTextStroke: '8px rgba(0, 160, 80, 1)',
          filter: 'none',
          textShadow: 'none'
        })
        gsap.set(wBloom, {
          opacity: Math.max(0, 0.7 - expandP * 2.5),
          scale: 4.5 + expandP * 10
        })

        // Fill the sticky wrap with dark green during expansion so W gaps are invisible
        gsap.set(stickyWrap, { backgroundColor: '#0d2e1c' })

        gsap.set(footerContent, {
          opacity: footerEase,
          y: (1 - footerEase) * -25
        })
      }

      if (p < 0.62) gsap.set(stickyWrap, { backgroundColor: '#0a0d14' })
    },
    onToggle: (self) => {
      if (!self.isActive) gsap.set(stickyWrap, { backgroundColor: '#0a0d14' })
    },
    onLeave: () => gsap.set(stickyWrap, { backgroundColor: '#0a0d14' }),
    onLeaveBack: () => gsap.set(stickyWrap, { backgroundColor: '#0a0d14' })
  })

  // ─── FAQ ─────────────────────────────────────────────────────────────────
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

}) // ← onMounted closes here ✅

onUnmounted(() => {
  if (window.ScrollTrigger) {
    ScrollTrigger.getAll().forEach(t => t.kill())
  }
  cleanupFns.forEach(fn => fn())
})
</script>

<template>
  <main>
    <NavBar/>

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
        <span class="hero-letter">&nbsp;</span>
        <span class="hero-letter">G</span>
        <span class="hero-letter">L</span>
        <span class="hero-letter">E</span>
      </h1>
    </div>

    <section id="hero">
      <ClientOnly>
        <Earth ref="threeEarth" />
      </ClientOnly>
    </section>

    <section>
      <div class="scene-wrapper">
        <ClientOnly>
          <Scene />
        </ClientOnly>
      </div>
    </section>

    <section id="faq-section">
      <div class="faq-bg-text" aria-hidden="true">FAQ</div>
      <p class="faq-label" id="faq-label">Questions</p>
      <h2 class="faq-header" id="faq-head">What this <em>actually</em> does.</h2>
      <div id="faq-list">
        <div class="faq-item">
          <div class="faq-q">How does Global Gle process cross-border payments? <span>+</span></div>
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

    <!-- FOOTER REVEAL SECTION -->
    <section id="footer-reveal-section">
      <div id="footer-sticky-wrap">
        <div id="w-bloom"></div>
        <div id="w-overlay">W</div>

        <div id="footer-content">
          <footer id="footer">
            <div class="footer-top">

              <!-- Brand / Tagline -->
              <div class="footer-brand">
                <div class="footer-logo">Work With Us</div>
                <p class="footer-desc">
                  Ready to move money the right way?<br>
                  Global Gle — built for speed, compliance and scale.
                </p>
                <div class="footer-socials">
                  <a href="https://instagram.com" target="_blank" class="social-cir" aria-label="Instagram">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
                  </a>
                  <a href="https://facebook.com" target="_blank" class="social-cir" aria-label="Facebook">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                  </a>
                </div>
              </div>

              <!-- Quick Links -->
              <div class="nav-group">
                <span class="nav-label">Quick Links</span>
                <a href="#">Work</a>
                <a href="#">About</a>
                <a href="#">Services</a>
                <a href="#">Portfolio</a>
                <a href="#">Contact</a>
              </div>

              <!-- Contact Info -->
              <div class="nav-group">
                <span class="nav-label">Contact</span>
                <span class="contact-item">Global Gle Inc.</span>
                <a href="mailto:hello@globalgle.com" class="contact-item">globalgle@gmail.com</a>
                <a href="tel:+2348000000000" class="contact-item">+234 800 000 0000</a>
              </div>

            </div>

            <div class="footer-legal">
              <div class="legal-left">
                <span>© 2026 Global Gle Inc. All rights reserved.</span>
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
              </div>
              <div class="legal-right">
                <span class="status-pulse"></span> Network Active
              </div>
            </div>
          </footer>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
html, body {
  background-color: #0a0d14; /* Global base black */
  margin: 0;
  padding: 0;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: auto; }
:global(body) {
  background: #0a0d14;
  color: #fff;
  font-family: 'Urbanist', sans-serif;
  overflow-x: hidden;
}

/* ── UI LAYER ─────────────────────────────────────────────────────────────── */
.fixed-ui-layer {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 100001; /* Must be above navbar (99999) */
  pointer-events: none;
  overflow: hidden;
  /* Removed flex-centering to prevent capsule distortion */
}

#hero-title {
  position: absolute;
  top: 52%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  font-family: 'Urbanist', sans-serif;
  font-size: clamp(2rem, 5vw, 4.5rem);
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #fff;
  will-change: transform, opacity;
  opacity: 0;
  text-align: center;
  line-height: 1.1;
  padding: 0 5vw;
}

.hero-btns {
  display: flex;
  align-items: center;
  pointer-events: all;
  opacity: 1;
  border-radius: 100px;
  padding: clamp(4px, 1vw, 8px) clamp(8px, 2vw, 12px);
  background: rgba(8,8,8,0.7);
  backdrop-filter: blur(40px) saturate(200%) brightness(1.05);
  border: 1px solid rgba(255,255,255,0.13);
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: clamp(1.5rem, 8vh, 8rem);
  z-index: 101;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  width: max-content;
}
.btn-start { padding: 0.6rem 1.8rem; border-radius: 100px; font-weight: 600; cursor: pointer; color: #fff; background: rgba(0,80,40,0.85); border: 1.5px solid rgba(0,255,136,0.86); font-size: clamp(0.75rem, 2vw, 1rem); }
.btn-login { padding: 0.6rem 1.8rem; border-radius: 100px; cursor: pointer; color: rgba(255,255,255,0.78); background: transparent; border: none; font-size: clamp(0.75rem, 2vw, 1rem); }

/* ── SECTIONS ─────────────────────────────────────────────────────────────── */
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
  height: 250vh;
  position: relative;
  z-index: 5;
}

/* FAQ */
#faq-section { width: 100vw; min-height: 100vh; background: #0a0d14; padding: clamp(3rem, 8vw, 6rem) 5vw; position: relative; z-index: 10; overflow: hidden; }
.faq-bg-text {
  position: absolute;
  top: 58%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Urbanist', sans-serif;
  font-size: clamp(10rem, 22vw, 20rem);
  font-weight: 900;
  color: transparent;
  -webkit-text-stroke: 2px rgba(255, 255, 255, 0.10);
  letter-spacing: -0.04em;
  line-height: 1;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
  z-index: 0;
}
/* Push all FAQ content above the watermark */
#faq-section > *:not(.faq-bg-text) { position: relative; z-index: 1; }
.faq-label { font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase; color: #00ff88; display: block; text-align: center; }
.faq-header { font-family: 'Urbanist', sans-serif; font-size: clamp(1.5rem, 5vw, 4rem); font-weight: 800; margin: 1rem auto 2.5rem; max-width: 700px; text-align: center; }
#faq-list { max-width: 780px; margin: 0 auto; }
.faq-item { border: 1px solid #1f1f1f; border-radius: 12px; padding: clamp(1rem, 3vw, 1.8rem); margin-bottom: 0.6rem; background: rgba(255,255,255,0.02); transition: all 0.2s; }
.faq-item.open { border-color: rgba(0,255,136,0.35); background: rgba(0,255,136,0.04); }
.faq-q { display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: clamp(0.9rem, 2vw, 1.05rem); font-weight: 500; gap: 1rem; }
.faq-a { max-height: 0; overflow: hidden; transition: all 0.4s ease; color: #6b7280; font-size: clamp(0.85rem, 2vw, 0.95rem); }
.faq-item.open .faq-a { max-height: 250px; padding-top: 1rem; }

#footer-reveal-section {
  position: relative;
  width: 100vw;
  height: 220vh;
  background: #000;
  z-index: 30;
}

#footer-sticky-wrap {
  position: sticky;
  top: 0;
  width: 100vw;
  height: 100vh;
  background: #0a0d14;
  overflow: hidden;
  display: block;
}

#w-bloom {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 25vw;
  height: 25vw;
  background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);
  border-radius: 50%;
  z-index: 15;
  filter: blur(80px);
  pointer-events: none;
  opacity: 0;
  will-change: transform, opacity;
}

#w-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transform-origin: 50% 50%;
  z-index: 10;
  font-family: 'Urbanist', sans-serif;
  font-size: 28vw;
  font-weight: 900;
  color: transparent;
  -webkit-text-stroke: 8px transparent;
  pointer-events: none;
  opacity: 0;
  will-change: transform, opacity, color;
  user-select: none;
}

#footer-content {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  z-index: 200;
  padding: clamp(2rem, 5vw, 4rem) 6vw clamp(1.5rem, 3vw, 2.5rem);
  background: #0d2e1c;
}

#footer {
  width: 100%;
  max-width: 1300px;
  color: #fff;
}

.footer-top {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: clamp(2rem, 4vw, 4rem);
  padding-bottom: clamp(2rem, 5vw, 5rem);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.footer-brand { flex: 1 1 260px; min-width: min(100%, 260px); }

.footer-logo {
  font-size: clamp(1.8rem, 4vw, 2.4rem);
  font-weight: 800;
  margin-bottom: 1.2rem;
  letter-spacing: -0.02em;
}

.footer-desc {
  color: rgba(255,255,255,0.5);
  line-height: 1.6;
  font-size: clamp(0.9rem, 1.5vw, 1.05rem);
  margin-bottom: 2.2rem;
  max-width: 240px;
}

.footer-socials { display: flex; gap: 0.8rem; }
.social-cir {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: 0.3s;
}
.social-cir:hover { border-color: #8b5cf6; color: #8b5cf6; }
.social-cir svg { width: 18px; height: 18px; display: block; }

.contact-item {
  color: rgba(255,255,255,0.5);
  text-decoration: none;
  font-size: clamp(0.85rem, 1.5vw, 0.95rem);
  transition: color 0.2s;
  display: block;
}
.contact-item:hover { color: #fff; }

.footer-nav { flex: 2; display: flex; flex-wrap: wrap; justify-content: space-around; gap: 2rem; }

.nav-group { display: flex; flex-direction: column; gap: 1rem; min-width: 140px; }
.nav-label {
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.9);
  margin-bottom: 0.5rem;
}
.nav-group a {
  color: rgba(255,255,255,0.45);
  text-decoration: none;
  font-size: clamp(0.85rem, 1.5vw, 1rem);
  transition: 0.2s;
}
.nav-group a:hover { color: #fff; }

.footer-newsletter { flex: 1; max-width: 300px; }
.footer-newsletter p { font-size: 0.95rem; color: rgba(255,255,255,0.5); margin-bottom: 1.5rem; line-height: 1.5; }

.news-input-wrap {
  display: flex;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 0.4rem;
  border-radius: 8px;
}
.news-input-wrap input {
  background: transparent;
  border: none;
  width: 100%;
  padding: 0.6rem;
  color: #fff;
  font-family: inherit;
  font-size: 0.9rem;
}
.news-input-wrap input:focus { outline: none; }
.news-input-wrap button {
  background: #fff;
  border: none;
  border-radius: 6px;
  width: 38px;
  height: 34px;
  font-weight: 800;
  cursor: pointer;
  transition: 0.3s;
}
.news-input-wrap button:hover { background: #8b5cf6; color: #fff; }

.footer-legal {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding-top: 2.5rem;
}
.legal-left { display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; align-items: center; font-size: 0.85rem; color: rgba(255,255,255,0.3); }
.legal-left a { color: inherit; text-decoration: none; transition: 0.2s; }
.legal-left a:hover { color: rgba(255,255,255,0.6); }

.legal-right { font-size: 0.8rem; font-weight: 700; color: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 0.5rem; }
.status-pulse {
  width: 8px;
  height: 8px;
  background: #00ff88;
  border-radius: 50%;
  box-shadow: 0 0 10px #00ff88;
}

.footer-col2 nav {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.footer-col2 nav a {
  color: rgba(255,255,255,0.6);
  text-decoration: none;
  font-size: 0.95rem;
  transition: color 0.2s;
}

.footer-col2 nav a:hover { color: #fff; }

.social-icons {
  display: flex;
  gap: 0.75rem;
}

.social-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.social-icon:hover {
  border-color: rgba(0,255,136,0.6);
  background: rgba(0,255,136,0.07);
}

.social-icon svg {
  width: 17px;
  height: 17px;
  fill: rgba(255,255,255,0.55);
}

.footer-bottom-links {
  grid-column: 1 / -1;
  display: flex;
  gap: 2rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(255,255,255,0.06);
}

.footer-bottom-links a {
  font-size: 0.78rem;
  color: rgba(255,255,255,0.25);
  text-decoration: none;
  transition: color 0.2s;
}

.footer-bottom-links a:hover { color: rgba(255,255,255,0.6); }

/* ── RESPONSIVE ───────────────────────────────────────────────────────────── */

/* Wide desktop (≤1200px) */
@media (max-width: 1200px) {
  .footer-top { gap: 2.5rem; }
  .nav-group { min-width: 120px; }
}

/* Tablet (≤1024px) */
@media (max-width: 1024px) {
  /* FAQ */
  #faq-section { padding: 5rem 7vw; }
  #faq-list { max-width: 680px; }

  /* Footer top — brand takes full row, nav groups sit side-by-side below */
  .footer-top { gap: 2rem; padding-bottom: 2.5rem; }
  .footer-brand { min-width: 100%; }
  .footer-desc { max-width: 100%; }
  .nav-group { flex: 1; min-width: 130px; }

  /* Footer legal */
  .footer-legal { padding-top: 2rem; }
}

/* Mobile (≤768px) */
@media (max-width: 768px) {
  /* Hero */
  #hero-title { font-size: clamp(1.9rem, 7vw, 3.2rem); padding: 0 4vw; }
  .hero-btns { bottom: 14%; }
  .btn-start, .btn-login { padding: 0.65rem 1.4rem; font-size: 0.88rem; }

  /* FAQ */
  #faq-section { padding: 4rem 5vw; }
  .faq-header { font-size: clamp(1.5rem, 6vw, 2.8rem); margin-bottom: 2rem; }
  .faq-q { font-size: 0.93rem; }
  #faq-list { max-width: 100%; }
  .faq-bg-text { font-size: clamp(8rem, 38vw, 14rem); top: 55%; }

  /* Footer top — full column stack */
  .footer-top {
    flex-direction: column;
    gap: 1.8rem;
    padding-bottom: 2rem;
  }
  .footer-brand { min-width: 100%; }
  .footer-desc { max-width: 100%; font-size: 0.92rem; margin-bottom: 1.4rem; }
  .nav-group { min-width: unset; flex: 1; gap: 0.75rem; }
  .footer-logo { font-size: 1.8rem; margin-bottom: 0.9rem; }

  /* Footer nav groups — row layout so Quick Links & Contact sit side by side */
  .footer-top .nav-group:not(.footer-brand) {
    flex-direction: column;
  }
  .footer-top > :is(.nav-group) { flex-basis: 45%; }

  /* Footer legal — stack vertically on mobile */
  .footer-legal {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    padding-top: 1.5rem;
  }
  .legal-left {
    flex-wrap: wrap;
    gap: 0.6rem 1.2rem;
    font-size: 0.78rem;
  }
  .legal-right { font-size: 0.78rem; }

}

/* Small phones (≤480px) */
@media (max-width: 480px) {
  /* Hero */
  .hero-btns { bottom: 12%; }
  .btn-start, .btn-login { padding: 0.55rem 1.1rem; font-size: 0.82rem; }

  /* FAQ */
  #faq-section { padding: 3rem 4vw; }
  .faq-item { padding: 1rem 0.9rem; }
  .faq-q { font-size: 0.86rem; }
  .faq-a { font-size: 0.82rem; }
  .faq-bg-text { font-size: clamp(6rem, 32vw, 9rem); }

  /* Footer */
  .footer-logo { font-size: 1.5rem; }
  .footer-desc { font-size: 0.88rem; }
  .nav-label { font-size: 0.78rem; }
  .nav-group a, .contact-item { font-size: 0.85rem; }
  .footer-legal { gap: 0.5rem; padding-top: 1.2rem; }
  .legal-left { font-size: 0.72rem; gap: 0.4rem 0.8rem; }
  .legal-right { font-size: 0.7rem; }
  .status-pulse { width: 7px; height: 7px; }
  #w-overlay { font-size: 55vw; }
}

/* Very small phones (≤360px) */
@media (max-width: 360px) {
  #hero-title { font-size: 1.7rem; }
  .hero-btns { bottom: 10%; }
  .btn-start, .btn-login { padding: 0.5rem 0.9rem; font-size: 0.78rem; }

  #faq-section { padding: 2.5rem 3.5vw; }
  .faq-q { font-size: 0.82rem; }
  .faq-item { padding: 0.9rem 0.8rem; }

  .footer-logo { font-size: 1.3rem; }
  .legal-left { font-size: 0.65rem; }
  #w-overlay { font-size: 50vw; }
}
</style>
