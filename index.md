<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Earth from '~/components/Earth.client.vue'
import Scene from '~/components/Scene.client.vue'

const threeEarth = ref(null)
const threeScene = ref(null)
let cleanupFns = []

onMounted(async () => {
  const { gsap } = await import('gsap')
  const { ScrollTrigger } = await import('gsap/ScrollTrigger')
  gsap.registerPlugin(ScrollTrigger)

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
  const getSceneH = () => 4 * baseH

  // ─── HERO & TRAVEL LOGIC ──────────────────────────────────────────────────
  const title = $('#hero-title')
  const partnerText = $('#partner-text')
  const btns = $('.hero-btns')
  const globeCanvas = $('#globe-canvas')

  gsap.set(title, { opacity: 0 })
  gsap.set(partnerText, { opacity: 0, x: 50 })
  gsap.set(btns, { opacity: 1, pointerEvents: 'all' })

  const dockedAlphaMult = { value: 1 }
  let dockedTimerStarted = false

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

      const appearanceStart = hh * 0.2
      const appearanceEnd = hh * 0.3
      const btnsEnd = appearanceEnd + baseH // Stay 1 screen height longer

      if (scrollY < btnsEnd) {
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
        const landingPoint = hh + (sh * 0.15) 
        const journeyP = Math.min(1, (scrollY - appearanceEnd) / (landingPoint - appearanceEnd))

        // Docking: Slightly below center before exit
        const targetY = baseH * 0.02
        const targetScale = isMobile ? 0.35 : 0.3
        const colorVal = gsap.utils.interpolate("#ffffff", "#00ff88", journeyP)

        let yPos = (scrollY > landingPoint) ? targetY : journeyP * targetY
        let curScale = (scrollY > landingPoint) ? targetScale : 1 - (journeyP * (1 - targetScale))
        let topFade = 1

        if (scrollY > landingPoint) {
           // Dock and disappear logic
           if (isDesktopView && !dockedTimerStarted) {
             dockedTimerStarted = true
             gsap.to(dockedAlphaMult, {
               value: 0,
               duration: 0.8,
               delay: 10,
               ease: "power2.inOut"
             })
           }
        } else {
           // Reset docked timer if scrolling back up
           dockedTimerStarted = false
           gsap.killTweensOf(dockedAlphaMult)
           dockedAlphaMult.value = 1
        }

        const titleX = isMobile ? 0 : baseW * 0.22
        const charX = isMobile ? 0 : -baseW * 0.18
        
        // Character entry timing (moved much earlier to 0.45 to follow globe immediately)
        const sceneStart = hh * 0.45
        const sceneEnd = hh + (sh * 0.7)
        const sceneP = Math.max(0, Math.min(1, (scrollY - sceneStart) / (sceneEnd - sceneStart)))
        
        // Pass the pre-smoothed (scrubbed) progress to the 3D scene
        if (threeScene.value?.setScrollProgress) {
          threeScene.value.setScrollProgress(sceneP)
        }

        // Persistence logic: Stay for 0.2 screen heights as requested
        const exitStart = sceneEnd + (baseH * 0.2) 
        let exitAlpha = 1
        if (scrollY > exitStart) {
          exitAlpha = Math.max(0, 1 - (scrollY - exitStart) / (baseH * 0.4))
        }

        // Title stays longer alone, then snaps away quickly while Drifting DOWN
        // Shift window to 0.01 for "straight up disappear"
        const titleWorkstationFade = Math.max(0, 1 - Math.max(0, (sceneP - 0.6) / 0.01))
        
        // Rise back from below: add some positive offset to targetY when invisible
        const activeY = (sceneP > 0.6) ? targetY + (1 - titleWorkstationFade) * baseH * 0.15 : yPos
        const activeScale = (sceneP > 0.6) ? targetScale : curScale

        gsap.set(title, {
          x: 0,
          y: activeY,
          scale: activeScale,
          color: colorVal,
          opacity: topFade * dockedAlphaMult.value * exitAlpha * titleWorkstationFade,
          textShadow: `0 0 ${journeyP * 30}px rgba(0, 255, 136, ${0.4 + journeyP * 0.6})`
        })

        // DELAYED STATEMENT: Starts appearing only after Title is gone (sceneP > 0.7)
        const charShiftP = Math.max(0, (sceneP - 0.7) / 0.3)
        const charShiftE = Math.pow(charShiftP, 2)
        
        const curCharX = charShiftE * charX

        const charModel = $('.character-model')
        if (charModel) {
          gsap.set(charModel, { x: curCharX })
        }

        if (partnerText) {
          // Quadratic reveal for smoothness, starting only after the title is gone
          const partnerOpacity = Math.pow(charShiftP, 2) * exitAlpha

          gsap.set(partnerText, { 
            opacity: partnerOpacity, 
            x: 50 * (1 - charShiftP),
            y: 0, 
            pointerEvents: (partnerOpacity > 0.5) ? 'all' : 'none'
          })
        }

        // Reveal navbar brand ONLY after hero title starts fading/moving away
        if (navBrand) {
          const brandRevealP = Math.max(0, Math.min(1, (scrollY - (hh + sh * 0.3)) / 500))
          gsap.set(navBrand, { opacity: brandRevealP })
        }
      } else {
        if (navBrand) gsap.set(navBrand, { opacity: 0 })
      }

      if (globeCanvas) {
        // EXTENDED GLOBE EXIT: Fades out between 45% and 85% of hero height
        const globeFadeP = Math.min(1, Math.max(0, (scrollY - hh * 0.45) / (hh * 0.4)))
        globeCanvas.style.opacity = 1 - globeFadeP
        globeCanvas.style.pointerEvents = 'none'
      }
    }
  })

    // ─── W REVEAL FOOTER ANIMATION ──────────────────────────────────────────
  // ─── UNIFIED PUNCHY SEQUENCE (GLE -> W -> REVEAL) ───────────────────────
  const footerSec = $('#footer-reveal-section')
  const gleWords = gsap.utils.toArray('.gle-word')
  const gleMid = $('#gle-mid')
  const sideGles = gsap.utils.toArray('.side-gle')
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
      
      // PHASE 1: GRAVITY DROOP-DOWN (0.0 -> 0.2)
      if (p < 0.2) {
        const dropP = p / 0.2

        gleWords.forEach((word, i) => {
          // Stagger: left first, mid second, right third
          const delay = i * 0.22
          const localP = Math.max(0, Math.min(1, (dropP - delay) / (1 - delay)))

          let y, sY, sX, rot, skewX, opacity

          if (localP < 0.55) {
            // ── FALL: rubber droop-stretch on the way down ──
            const t = localP / 0.55
            const accel = t * t * (3 - 2 * t)          // smoothstep accelerate
            y = -280 + (280 + 42) * accel               // shoots from -280 → +42 (overshoot)
            sY = 1 + 0.6 * Math.sin(t * Math.PI * 0.85) // vertical stretch (droop)
            sX = 1 - 0.2 * Math.sin(t * Math.PI * 0.85) // horizontal compress
            rot = (i - 1) * -20 * (1 - t * t)           // angled fall → straightens
            skewX = (i === 0 ? 14 : i === 2 ? -14 : 0) * (1 - accel) // outer words lean outward
            opacity = Math.min(1, t * 3)
          } else if (localP < 0.74) {
            // ── IMPACT: hard squash on landing ──
            const t = (localP - 0.55) / 0.19
            const sq = Math.sin(t * Math.PI)
            y = 42 - 42 * t * t                          // slides back from overshoot
            sY = 1 - 0.45 * sq                           // hard squash
            sX = 1 + 0.32 * sq                           // splat wide
            rot = 0; skewX = 0; opacity = 1
          } else if (localP < 0.88) {
            // ── REBOUND: smaller spring-back bounce ──
            const t = (localP - 0.74) / 0.14
            const b = Math.sin(t * Math.PI) * (1 - t * 0.4)
            y = -24 * b
            sY = 1 - 0.15 * b
            sX = 1 + 0.10 * b
            rot = 0; skewX = 0; opacity = 1
          } else {
            // ── SETTLE: at rest ──
            y = 0; sY = 1; sX = 1; rot = 0; skewX = 0; opacity = 1
          }

          gsap.set(word, {
            y, scaleY: sY, scaleX: sX,
            rotation: rot, skewX, opacity,
            transformOrigin: 'center top'
          })
        })

        gsap.set(gleMid, { textContent: 'GLE', color: 'transparent', webkitTextStroke: '1.5px rgba(255,255,255,0.18)' })
        gsap.set(wOverlay, { opacity: 0 })
        gsap.set(footerContent, { opacity: 0 })
      }

      // PHASE 2: W WIREFRAME FORMS — centred via wOverlay (0.20 → 0.44)
      if (p >= 0.2 && p < 0.44) {
        const morphP = (p - 0.2) / 0.24  // 0 → 1

        // All GLE words fade out (left first, mid last)
        gsap.set(sideGles[0], { opacity: Math.max(0, 1 - morphP * 2.8) })
        if (sideGles[1]) gsap.set(sideGles[1], { opacity: Math.max(0, 1 - Math.max(0, morphP - 0.1) * 2.8) })
        gsap.set(gleMid, { opacity: Math.max(0, 1 - morphP * 3.5) })

        // wOverlay builds the wireframe W from the centre of the screen
        const stroke = 2 + morphP * 6
        gsap.set(wOverlay, {
          opacity: morphP > 0.05 ? 1 : 0,
          scale: 0.4 + morphP * 0.82,         // grows: 0.4 → 1.22
          color: 'transparent',
          webkitTextStroke: `${stroke}px rgba(139, 92, 246, ${Math.min(1, morphP * 1.4)})`,
          filter: 'none',
          textShadow: 'none'
        })

        gsap.set(wBloom, { opacity: 0 })
        gsap.set(footerContent, { opacity: 0 })
      }

      // PHASE 3: W FILLS SOLID PURPLE (0.44 → 0.62)
      if (p >= 0.44 && p < 0.62) {
        const fillP = (p - 0.44) / 0.18  // 0 → 1

        gsap.set(sideGles, { opacity: 0 })
        gsap.set(gleMid, { opacity: 0 })

        // wOverlay fills with bold solid purple — scale continues from Phase 2 end (1.22)
        gsap.set(wOverlay, {
          opacity: 1,
          scale: 1.22 + fillP * 0.08,
          color: `rgba(139, 92, 246, ${fillP})`,
          webkitTextStroke: `8px rgba(139, 92, 246, 1)`,
          filter: 'none',
          textShadow: 'none'
        })

        gsap.set(wBloom, { opacity: 0 })

        gsap.set(footerContent, { opacity: 0 })
      }

      // PHASE 4: W EXPANDS — FOOTER OPENS (0.62 → 1.0)
      if (p >= 0.62) {
        const expandP = Math.min(1, (p - 0.62) / 0.38)  // 0 → 1
        const ease = expandP * expandP * (3 - 2 * expandP)  // smoothstep

        gsap.set(sideGles, { opacity: 0 })
        gsap.set(gleMid, { opacity: 0 })

        // W expands hard — no blur, clean geometric explosion
        // Increased scale to 120 to ensure it covers the entire screen
        const wScale = 1.30 + ease * 120
        gsap.set(wOverlay, {
          opacity: 1,
          scale: wScale,
          color: 'rgba(139, 92, 246, 1)',
          webkitTextStroke: '8px rgba(139, 92, 246, 1)',
          filter: 'none',
          textShadow: 'none'
        })

        // Bloom fades as W fills screen
        gsap.set(wBloom, {
          opacity: Math.max(0, 0.7 - expandP * 2.5),
          scale: 4.5 + expandP * 10
        })

        // Footer rises in cleanly — starts at 28% into expansion
        const footerRaw = Math.max(0, (expandP - 0.28) / 0.72)
        const footerEase = footerRaw * footerRaw * (3 - 2 * footerRaw)
        gsap.set(footerContent, {
          opacity: footerEase,
          y: (1 - footerEase) * -25
        })

        // ─── FORCE BACKGROUND FILL (Fixes the "W Gaps" issue) ───
        // As the W expands, we fade the container background to the same purple
        // to fill the negative space inside the letter 'W'.
        const bgFillP = Math.max(0, (expandP - 0.4) / 0.6)
        gsap.set(stickyWrap, { backgroundColor: gsap.utils.interpolate('#0a0d14', '#8b5cf6', bgFillP) })
      } else {
        // Reset to black when not in expansion phase
        gsap.set(stickyWrap, { backgroundColor: '#0a0d14' })
      }
    },
    onToggle: (self) => {
      // Only reset if we're not at the very end
      if (!self.isActive && self.progress < 0.9) gsap.set(stickyWrap, { backgroundColor: '#0a0d14' })
    },
    onLeave: () => {}, // Keep the background color as set in onUpdate
    onLeaveBack: () => gsap.set(stickyWrap, { backgroundColor: '#0a0d14' })
  })

  // ─── NUMBERS (CONTINUOUS MATRIX FALL) ────────────────────────────────────
  const numberItems = gsap.utils.toArray('.number-item')
  numberItems.forEach((el, i) => {
    const duration = 4 + Math.random() * 4
    const delay = Math.random() * 5
    gsap.fromTo(el, 
      { y: -20, opacity: 0 },
      {
        y: 120,
        opacity: Math.random() * 0.8 + 0.2,
        duration: duration,
        repeat: -1,
        delay: delay,
        ease: "none"
      }
    )
  })

  // Numbers Screen Entrance (The Louvre Glide)
  const numbersBox = $('.numbers-screen')
  if (numbersBox) {
    // ENTRANCE
    gsap.fromTo(numbersBox, 
      { y: -500, opacity: 0, skewX: 15, rotationX: 45 },
      {
        y: 0,
        opacity: 1,
        skewX: 0,
        rotationX: 0,
        scrollTrigger: {
          trigger: '#numbers-section',
          start: 'top 95%',
          end: 'top 50%',
          scrub: 1.5
        }
      }
    )

    // Numbers Screen Exit Effect
    ScrollTrigger.create({
      trigger: '#numbers-section',
      start: 'bottom 98%',
      end: 'bottom top',
      scrub: 1.2,
      onUpdate(self) {
        const p = self.progress
        gsap.set(numbersBox, { 
          opacity: 1 - p,
          y: -400 * p, 
          rotationX: 40 * p, 
          skewY: 10 * p,
          transformPerspective: 1200,
          clipPath: `inset(${p * 100}% 0% 0% 0%)`,
          filter: `blur(${p * 10}px) brightness(${1 + p * 1.5})`
        })
      }
    })
  }

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
      <div id="partner-text">
        <WhatIDo />
      </div>
    </div>

    <section id="hero">
      <ClientOnly>
        <Earth ref="threeEarth" />
      </ClientOnly>
    </section>

    <section>
      <div class="scene-wrapper">
        <ClientOnly>
          <Scene ref="threeScene" />
        </ClientOnly>
      </div>
    </section>

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
        <div class="screen-vignette" aria-hidden="true"></div>
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

    <!-- UNIFIED CINEMATIC FOOTER SECTION -->
    <section id="footer-reveal-section">
      <div id="footer-sticky-wrap">
        
        <!-- The GLE Words (Merged into this section for smoothness) -->
        <div class="gle-text-wrap" id="unified-gle-wrap">
          <span class="gle-word side-gle">GLE</span>
          <span class="gle-word" id="gle-mid">GLE</span>
          <span class="gle-word side-gle">GLE</span>
        </div>

        <!-- Purple bloom behind the word -->
        <div id="w-bloom"></div>
        <!-- Internal Logo Reveal -->
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
                <a href="mailto:hello@globalgle.com" class="contact-item">hello@globalgle.com</a>
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

#partner-text {
  position: absolute;
  top: 50%;
  right: 5%;
  transform: translateY(-50%);
  width: 55%;
  color: #fff;
  opacity: 0;
  will-change: transform, opacity;
  z-index: 100;
  pointer-events: none;
}
#partner-text .highlight {
  color: #00ff88;
  text-shadow: 0 0 20px rgba(0, 255, 136, 0.4);
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
  top: 16rem;
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
  height: 400vh;
  position: relative;
  z-index: 5;
}

/* NUMBERS */
#numbers-section { width: 100vw; min-height: 120vh; background: #0a0d14; display: flex; align-items: center; justify-content: center; padding: clamp(1rem, 5vw, 4rem); overflow: hidden; position: relative; z-index: 10; }
.numbers-screen { 
  position: relative; 
  width: min(860px, 95vw); 
  min-height: clamp(300px, 50vh, 480px); 
  border-radius: 24px; 
  border: 1px solid rgba(255, 255, 255, 0.1); 
  background: rgba(255, 255, 255, 0.03); 
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: clamp(1.5rem, 5vw, 3.5rem) clamp(1rem, 3vw, 2.5rem); 
  display: flex; 
  flex-direction: column; 
  justify-content: center; 
  gap: 1rem; 
  overflow: hidden; 
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1);
}
.screen-chrome { position: absolute; top: 1rem; left: 1.2rem; display: flex; gap: 0.4rem; }
.chrome-dot { width: 8px; height: 8px; border-radius: 50%; }
.chrome-dot:nth-child(1) { background: rgba(255,80,80,0.55); border: 1px solid rgba(255,80,80,0.7); }
.chrome-dot:nth-child(2) { background: rgba(255,200,0,0.55); border: 1px solid rgba(255,200,0,0.7); }
.chrome-dot:nth-child(3) { background: rgba(0,255,136,0.55); border: 1px solid rgba(0,255,136,0.7); }
.number-layer { display: flex; gap: clamp(1rem, 4vw, 4rem); margin: 1.2rem 0; white-space: nowrap; }
.number-item { font-family: 'Urbanist', sans-serif; font-weight: 800; line-height: 1; will-change: transform, opacity; }
.nl-top .number-item { font-size: clamp(1.5rem, 6vw, 7rem); color: rgba(0,255,136,0.4); -webkit-text-stroke: 1px rgba(255,255,255,0.15); }
.nl-mid .number-item { font-size: clamp(2.5rem, 12vw, 13rem); -webkit-text-stroke: 2px rgba(0,255,136,0.4); color: transparent; }
.nl-bot .number-item { font-size: clamp(1.2rem, 5vw, 5rem); color: rgba(0,255,136,0.4); -webkit-text-stroke: 1px rgba(255,255,255,0.15); }

/* FAQ */
#faq-section { width: 100vw; min-height: 100vh; background: #0a0d14; padding: clamp(3rem, 8vw, 6rem) 5vw; position: relative; z-index: 10; overflow: hidden; }
.faq-bg-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Urbanist', sans-serif;
  font-size: clamp(18rem, 40vw, 36rem);
  font-weight: 900;
  color: transparent;
  -webkit-text-stroke: 2px rgba(255, 255, 255, 0.045);
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
.faq-item { border: 1px solid #1f1f1f; border-radius: 12px; padding: clamp(1rem, 3vw, 1.8rem); margin-bottom: 0.6rem; background: rgba(255,255,255,0.02); transition: all 0.2s; }
.faq-item.open { border-color: rgba(0,255,136,0.35); background: rgba(0,255,136,0.04); }
.faq-q { display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: clamp(0.9rem, 2vw, 1.05rem); font-weight: 500; gap: 1rem; }
.faq-a { max-height: 0; overflow: hidden; transition: all 0.4s ease; color: #6b7280; font-size: clamp(0.85rem, 2vw, 0.95rem); }
.faq-item.open .faq-a { max-height: 250px; padding-top: 1rem; }

/* Unified Reveal CSS */
.gle-text-wrap {
  position: absolute;
  top: 55%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: clamp(1rem, 5vw, 8rem);
  align-items: center;
  z-index: 10;
  perspective: 900px;
  overflow: visible;
}
@media (min-width: 768px) {
  .gle-text-wrap { top: 35%; }
}
.gle-word {
  display: inline-block;
  font-family: 'Urbanist', sans-serif;
  font-size: clamp(2.5rem, 10vw, 11rem);
  font-weight: 800;
  color: transparent;
  -webkit-text-stroke: 1.5px rgba(255,255,255,0.18);
  opacity: 0;
  will-change: transform, opacity;
  transform-origin: center top;
}


#footer-reveal-section {
  position: relative;
  width: 100vw;
  height: 220vh;
  background: #000;
  z-index: 30;
  margin-top: 0;
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
  background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%); /* Neutral faint white, NO purple */
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
  align-items: center;
  justify-content: center;
  opacity: 0;
  z-index: 200;
  padding: clamp(2rem, 5vw, 4rem) 6vw;
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

.footer-brand { flex: 1; min-width: min(100%, 280px); }

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
  justify-content: space-between;
  align-items: center;
  padding-top: 2.5rem;
}
.legal-left { display: flex; gap: 2rem; align-items: center; font-size: 0.85rem; color: rgba(255,255,255,0.3); }
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

/* Tablet (≤1024px) */
@media (max-width: 1024px) {
  #numbers-section { padding: 3rem 2rem; }
  .numbers-screen { padding: 3rem 2rem 2rem; }
  .number-layer { gap: 2.5rem; }

  #faq-section { padding: 5rem 7vw; }

  #footer {
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
    padding: 4rem 5vw 3rem;
  }
  .footer-col1 { grid-column: 1 / -1; }
}

/* Mobile (≤768px) */
@media (max-width: 768px) {
  .btn-start, .btn-login { padding: 0.65rem 1.4rem; font-size: 0.88rem; }

  #numbers-section { padding: 2rem 1rem; min-height: unset; }
  .numbers-screen { min-height: unset; padding: 2.5rem 1.25rem 1.5rem; }
  .number-layer { gap: 1.5rem; margin: 1rem 0; }
  .nl-mid .number-item { font-size: clamp(3rem, 10vw, 7rem); }
  .nl-top .number-item { font-size: clamp(2rem, 6vw, 4rem); }
  .nl-bot .number-item { font-size: clamp(1.8rem, 5vw, 3.5rem); }

  #faq-section { padding: 4rem 5vw; }
  .faq-header { font-size: clamp(1.6rem, 6vw, 3rem); }
  .faq-q { font-size: 0.95rem; }

  #gle-section { min-height: 60vh; }

  #footer {
    grid-template-columns: 1fr;
    gap: 2.5rem;
    padding: 3.5rem 6vw 3rem;
    min-height: unset;
  }
  .footer-col1 { grid-column: unset; }
  .footer-bottom-links { flex-direction: column; gap: 0.75rem; }
}

/* Small phones (≤480px) */
@media (max-width: 480px) {
  .btn-start, .btn-login { padding: 0.55rem 1.1rem; font-size: 0.82rem; }

  #numbers-section { padding: 1.5rem 0.5rem; }
  .numbers-screen { padding: 2rem 1rem 1.25rem; border-radius: 12px; gap: 0.6rem; }
  .number-layer { gap: 0.75rem; margin: 0.5rem 0; }

  #faq-section { padding: 3rem 4vw; }
  .faq-item { padding: 1.2rem 1rem; }
  .faq-q { font-size: 0.88rem; }

  #w-overlay { font-size: 60vw; }

  #footer { padding: 3rem 5vw 2.5rem; }
  .footer-tagline { font-size: 0.88rem; }
}
</style>