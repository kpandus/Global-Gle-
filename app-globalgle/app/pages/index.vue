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
  const getHeroH = () => {
    // If window is narrow (mobile), use a much smaller hero height (0.5) 
    // to prevent "dead scroll" space. iPhone specifically needs this shorter.
    const isSmall = window.innerWidth < 768
    return (isSmall ? 0.45 : 0.8) * baseH
  }
  const getSceneH = () => (window.innerWidth < 768 ? 1.5 : 3.0) * baseH

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
      
      const isLargeScreen = window.matchMedia("(min-width: 1025px)").matches
      const isMobile = !isLargeScreen
      const isAndroid = /Android/i.test(navigator.userAgent)
      // Android phones should use mobile UI/hiding logic
      const isDesktopView = isLargeScreen 

      // On mobile, force hide globe and desktop title
      if (isMobile) {
        if (globeCanvas) globeCanvas.style.display = 'none'
        if (title) {
          gsap.set(title, { opacity: 0, display: 'none', visibility: 'hidden' })
        }
      }

      const hh = getHeroH()
      const sh = getSceneH()

      const globeP = Math.min(1, scrollY / (hh * 0.8))
      if (threeEarth.value?.setScrollProgress) {
        threeEarth.value.setScrollProgress(globeP)
      }

      const appearanceStart = hh * 0.2
      const appearanceEnd = hh * 0.3
      
      if (isMobile) {
        // Buttons appear ONLY after passing the Welcome section (100vh)
        if (scrollY < baseH) {
          gsap.set(btns, { opacity: 0, pointerEvents: 'none' })
        } else {
          const appearP = Math.min(1, (scrollY - baseH) / 200)
          gsap.set(btns, { opacity: appearP, pointerEvents: appearP > 0.5 ? 'all' : 'none' })
        }
      } else {
        const btnsFadeEnd = appearanceEnd + baseH
        const btnsFadeStart = btnsFadeEnd - 100
        if (scrollY < btnsFadeStart) {
          gsap.set(btns, { opacity: 1, pointerEvents: 'all' })
        } else if (scrollY < btnsFadeEnd) {
          const p = (scrollY - btnsFadeStart) / (btnsFadeEnd - btnsFadeStart)
          gsap.set(btns, { opacity: 1 - p, pointerEvents: p > 0.5 ? 'none' : 'all' })
        } else {
          gsap.set(btns, { opacity: 0, pointerEvents: 'none' })
        }
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
        // Extended smoother docking: landingPoint increased to 0.7 for even more scroll distance
        const landingPoint = hh * 0.7
        const journeyP = Math.min(1, (scrollY - appearanceEnd) / (landingPoint - appearanceEnd))

        // Unified Handheld Detection (Samsung + iPhone)
        const isHandheld = window.innerWidth <= 1024
        // targetY is relative to the starting 52% top. 
        // 0.1 moves it down to exactly 62% from top.
        const targetY = isHandheld ? (baseH * 0.1) : (baseH * 0.02)
        const targetScale = isHandheld ? 0.35 : 0.3
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
        const charX = isMobile ? 0 : -baseW * 0.08
        
        // Character entry synced to when globe finishes fading (0.38 start + 0.22 window = 0.60)
        // On mobile, the scene should start appearing later, after ALL traditional sections
        // Welcome (100vh) + Text Info (~800px) + Glass Box (~700px)
        const mOffset = 0 
        const sceneStart = (hh * 0.05) + mOffset
        const sceneEnd = hh + (sh * 0.7) + mOffset
        const sceneP = Math.max(0, Math.min(1, (scrollY - sceneStart) / (sceneEnd - sceneStart)))
        
        // Pass the pre-smoothed (scrubbed) progress to the 3D scene
        if (threeScene.value?.setScrollProgress) {
          threeScene.value.setScrollProgress(sceneP)
        }

        // Persistence logic: No buffer, fast exit as requested
        const exitStart = sceneEnd
        let exitAlpha = 1
        if (scrollY > exitStart) {
          exitAlpha = Math.max(0, 1 - (scrollY - exitStart) / (baseH * 0.12))
        }

        // Bridge the scroll-based fade-out to the 3D canvas (crucial for mobile exit)
        if (threeScene.value?.setOpacity) {
          // On mobile (hh < 0.6*baseH is a proxy for mobile as we set it to 0.5), 
          // we keep it solid and let the sticky behavior handle the exit.
          const isMobileNow = hh < (0.6 * baseH)
          threeScene.value.setOpacity(isMobileNow ? 1 : exitAlpha)
        }

        // Title stays longer alone, then snaps away quickly while Drifting DOWN
        // Final recalibration to exactly 70% as requested
        const titleWorkstationFade = Math.max(0, 1 - Math.max(0, (sceneP - 0.4) / 0.05))
        
        // Rise back from below: add some positive offset to targetY when invisible
        // Match the 0.4 trigger for the final snap-away
        const activeY = (sceneP > 0.4) ? targetY + (1 - titleWorkstationFade) * baseH * 0.15 : yPos
        const activeScale = (sceneP > 0.4) ? targetScale : curScale

        gsap.set(title, {
          x: 0,
          y: activeY,
          scale: activeScale,
          color: colorVal,
          opacity: topFade * dockedAlphaMult.value * exitAlpha * titleWorkstationFade,
          textShadow: `0 0 ${journeyP * 30}px rgba(0, 255, 136, ${0.4 + journeyP * 0.6})`
        })

        // DELAYED STATEMENT: Starts appearing only after Title is gone (sceneP > 0.4)
        const charShiftP = Math.max(0, (sceneP - 0.4) / 0.3)
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

      if (globeCanvas && !isMobile) {
        // Globe exit compressed to 0.22 window for faster handoff to character
        const globeFadeP = Math.min(1, Math.max(0, (scrollY - hh * 0.55) / (hh * 0.18)))
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
    scrub: 1.6,
    onUpdate(self) {
      const p = self.progress
      
      // PHASE 1: GRAVITY DROOP-DOWN (0.0 -> 0.08)
      if (p < 0.08) {
        const dropP = p / 0.08

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

      // PHASE 2: W WIREFRAME FORMS — centred via wOverlay (0.08 → 0.20)
      if (p >= 0.08 && p < 0.20) {
        const morphP = (p - 0.08) / 0.12  // 0 → 1

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
          webkitTextStroke: `${stroke}px rgba(13, 46, 28, ${Math.min(1, morphP * 1.4)})`,
          filter: 'none',
          textShadow: 'none'
        })

        gsap.set(wBloom, { opacity: 0 })
        gsap.set(footerContent, { opacity: 0 })
      }

      // PHASE 3: W FILLS SOLID PURPLE (0.20 → 0.35)
      if (p >= 0.20 && p < 0.35) {
        const fillP = (p - 0.20) / 0.15  // 0 → 1

        gsap.set(sideGles, { opacity: 0 })
        gsap.set(gleMid, { opacity: 0 })

        // wOverlay fills with bold forest green — scale continues from Phase 2 end (1.22)
        gsap.set(wOverlay, {
          opacity: 1,
          scale: 1.22 + fillP * 0.08,
          color: `rgba(13, 46, 28, ${fillP})`,
          webkitTextStroke: `8px rgba(13, 46, 28, 1)`,
          filter: 'none',
          textShadow: 'none'
        })

        gsap.set(wBloom, { opacity: 0 })

        gsap.set(footerContent, { opacity: 0 })
      }

      // PHASE 4: W EXPANDS — FOOTER OPENS (0.35 → 1.0)
      if (p >= 0.35) {
        const expandP = Math.min(1, (p - 0.35) / 0.65)  // 0 → 1
        const ease = expandP * expandP * (3 - 2 * expandP)  // smoothstep

        gsap.set(sideGles, { opacity: 0 })
        gsap.set(gleMid, { opacity: 0 })

        // W expands hard — no blur, clean geometric explosion
        // Increased scale to 120 to ensure it covers the entire screen
        const wScale = 1.30 + ease * 120
        gsap.set(wOverlay, {
          opacity: 1,
          scale: wScale,
          color: 'rgba(13, 46, 28, 1)',
          webkitTextStroke: '8px rgba(13, 46, 28, 1)',
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

        // As the W expands, we fade the container background to a deep forest green
        // This ensures the white footer text remains perfectly readable.
        const bgFillP = Math.max(0, (expandP - 0.4) / 0.6)
        gsap.set(stickyWrap, { backgroundColor: gsap.utils.interpolate('#0a0d14', '#002211', bgFillP) })
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

  // ─── MOBILE ENTRANCE & GLASS BOX ANIMATIONS ─────────────────────────────
  const isLargeScreenInit = window.matchMedia("(min-width: 1025px)").matches
  const isAndroidInit = /Android/i.test(navigator.userAgent)
  if (!(isLargeScreenInit || isAndroidInit)) {
    // Punchy Entrance
    gsap.from('#mobile-traditional-hero h1', {
      opacity: 0,
      y: 60,
      duration: 1.4,
      ease: 'power4.out',
      delay: 0.3
    })
    gsap.from('#mobile-traditional-hero p', {
      opacity: 0,
      y: 20,
      duration: 1.2,
      ease: 'power3.out',
      delay: 0.7
    })
  }

  // Glass Box Slide-In
  const glassBox = $('#mobile-glass-box')
  if (glassBox) {
    ScrollTrigger.create({
      trigger: glassBox,
      start: 'top 95%',
      end: 'top 60%',
      scrub: 1.2,
      onUpdate(self) {
        gsap.set(glassBox, {
          opacity: self.progress,
          x: (1 - self.progress) * 40,
          scale: 0.96 + self.progress * 0.04
        })
      }
    })
  }

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
      <div class="hero-btns desktop-only">
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
      <!-- Desktop only: Fixed overlay version -->
      <div id="partner-text" class="desktop-only">
        <WhatIDo />
      </div>
    </div>

    <section id="hero" class="desktop-only">
      <ClientOnly>
        <Earth ref="threeEarth" />
      </ClientOnly>
    </section>

    <!-- Mobile Traditional Hero Flow -->
    <section id="mobile-traditional-hero" class="mobile-only">
      <div class="m-hero-content">
        <h1>WELCOME TO <span class="highlight">GLOBAL GLE</span></h1>
        <p>Modern cross-border payment infrastructure for the global economy</p>
        <div class="hero-btns">
        <button class="btn-start">Get Started</button>
        <button class="btn-login">Login</button>
      </div>
        <div class="m-scroll-indicator">Scroll to explore ↓</div>
      </div>
    </section>

    <!-- Mobile Glass Box Component (BEFORE Character) -->
    <section id="mobile-glass-box" class="mobile-only">
      <div class="glass-container">
        <WhatIDo />
      </div>
    </section>

    <section>
      <div class="scene-wrapper">
        <ClientOnly>
          <Scene ref="threeScene" />
        </ClientOnly>
      </div>
    </section>

    <!-- Removed redundant mobile-only numbers-section to follow traditional landing page style -->

   
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
  overflow-x: hidden !important;
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

@media (max-width: 768px) {
  #hero-title {
    top: 38%; /* Moved down slightly from 32% for better mobile balance */
    font-size: clamp(2.2rem, 9vw, 3.5rem);
  }
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
@media (max-width: 1024px) {
  #partner-text {
    width: 90%;
    right: 5%;
    left: 5%;
    text-align: center;
  }
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
  top: 9rem;
  z-index: 101;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  width: max-content;
}
@media (max-width: 768px) {
  .hero-btns {
    top: 27%; /* Final adjustment requested by the user */
    bottom: auto;
  }
}
.btn-start { padding: 0.6rem 1.8rem; border-radius: 100px; font-weight: 600; cursor: pointer; color: #fff; background: rgba(0,80,40,0.85); border: 1.5px solid rgba(0,255,136,0.86); font-size: clamp(0.75rem, 2vw, 1rem); }
.btn-login { padding: 0.6rem 1.8rem; border-radius: 100px; cursor: pointer; color: rgba(255,255,255,0.78); background: transparent; border: none; font-size: clamp(0.75rem, 2vw, 1rem); }

.desktop-only { display: block !important; }
.mobile-only { display: none !important; }

@media (max-width: 1024px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: block !important; }
}

/* ── SECTIONS ─────────────────────────────────────────────────────────────── */
#hero {
  position: relative;
  width: 100vw;
  height: 70vh;
  background: #0a0d14;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 1024px) {
  #hero {
    height: 50vh; /* Faster mobile start */
  }
}

.scene-wrapper {
  width: 100vw;
  height: 300vh;
  position: relative;
  z-index: 5;
}
@media (max-width: 768px) {
  .scene-wrapper {
    height: 150vh;
  }
}

/* MOBILE TRADITIONAL FLOW */
#mobile-traditional-hero {
  height: 84vh;
  width: 100vw;
  margin-top: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  background: radial-gradient(circle at center, #101a28 0%, #0a0d14 100%);
}

.m-hero-content h1 {
  font-size: clamp(2.5rem, 12vw, 4rem);
  font-weight: 900;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  letter-spacing: -0.03em;
}

.m-hero-content .highlight {
  color: #00ff88;
  display: block;
}

.m-hero-content p {
  font-size: 1.2rem;
  font-weight: 300;
  opacity: 0.8;
  max-width: 400px;
  margin: 0 auto;
  line-height: 1.5;
}

.m-scroll-indicator {
  margin-top: 4rem;
  font-size: 0.9rem;
  opacity: 0.4;
  letter-spacing: 2px;
  text-transform: uppercase;
  animation: mBounce 2s infinite;
}

@keyframes mBounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
}

#mobile-traditional-info {
  padding: 6rem 2rem;
  background: #0a0d14;
}

#mobile-glass-box {
  padding: 2rem 1.5rem 2rem;
  background: #0a0d14;
}

.glass-container {
  background: rgba(10, 13, 20, 0.6);
  backdrop-filter: blur(25px) saturate(180%);
  -webkit-backdrop-filter: blur(25px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 32px;
  padding: 1.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.m-info-block {
  margin-bottom: 5rem;
}

.m-info-block h3 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: #00ff88;
  margin-bottom: 2rem;
  opacity: 0.8;
}

.m-info-block p {
  font-size: 1.8rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.02em;
}

.m-service-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.m-service-list li {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.m-service-list strong {
  font-size: 1.4rem;
  font-weight: 700;
}

.m-service-list span {
  font-size: 1rem;
  font-weight: 300;
  opacity: 0.6;
  line-height: 1.6;
}

/* NUMBERS */
#numbers-section { 
  width: 100vw; 
  min-height: 120vh; 
  background: #0a0d14; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  padding: clamp(1rem, 5vw, 4rem); 
  overflow: hidden; 
  position: relative; 
  z-index: 10; 
}

@media (max-width: 1024px) {
  #numbers-section {
    min-height: 100vh;
    padding-top: 6rem;
    padding-bottom: 6rem;
    overflow: visible;
  }
}
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
#faq-section { 
  width: 100vw; 
  background: #0a0d14;  
  padding: clamp(2rem, 5vw, 4rem) 6vw 0;
  position: relative; 
  padding-bottom: 10rem;
  z-index: 10; 
  overflow: hidden; 
}
.faq-bg-text {
  position: absolute;
  top: 58%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Urbanist', sans-serif;
  font-size: clamp(8rem, 20vw, 20rem);
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
@media (max-width: 768px) {
  #mobile-traditional-hero .hero-btns {
    position: static;
    transform: none;
    margin-top: 1.5rem;
    justify-content: center;
    width: fit-content;
    margin-left: auto;
    margin-right: auto;
  }
  
  #faq-section { padding: 4rem 6vw 0; overflow: hidden; }
  .faq-bg-text { font-size: 15rem; top: 60%; }
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
  height: 90vh; /* Increased 120 height to slow down the reveal speed */
  z-index: 30;
}
@media (max-width: 1024px) {
  #footer-reveal-section {
    margin-top: -8rem; /* Pull up more on mobile to reduce gap while keeping height for animation */
  }
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
  top: 10%;
  left: 10%;
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
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  z-index: 200;
  padding: clamp(2rem, 5vw, 4rem) 6vw clamp(1.5rem, 3vw, 2.5rem);
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
  color: rgba(255,255,255,0.95);
  line-height: 1.6;
  font-weight: 600;
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
  color: rgba(255,255,255,0.9);
  text-decoration: none;
  font-weight: 600;
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
  color: rgba(255,255,255,0.9);
  text-decoration: none;
  font-weight: 600;
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
  color: rgba(255,255,255,0.9);
  text-decoration: none;
  font-weight: 600;
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
  #footer-content { padding: clamp(2rem, 4vw, 3.5rem) 5vw clamp(1.2rem, 2.5vw, 2rem); }
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
  #hero-title { font-size: clamp(3.9rem, 7vw, 3.2rem); padding: 0 4vw; }

   #mobile-glass-box {
    margin-top: -80px;
    padding-top: 0;
  }
  
  .btn-start, .btn-login { padding: 0.65rem 1.4rem; font-size: 0.88rem; }

  /* FAQ */
  #faq-section { padding: 4rem 5vw; padding-bottom: 2rem;}

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

  /* Footer content alignment — switch to top on mobile to prevent overflow */
  #footer-content {
    align-items: flex-start;
    padding: 2.5rem 5vw 1.5rem;
  }

  /* GLE / W overlay */
  #w-overlay { font-size: 60vw; }
  .gle-word { font-size: clamp(2rem, 9vw, 6rem); }
  .gle-text-wrap { gap: clamp(0.5rem, 3vw, 3rem); }
}

/* Small phones (≤480px) */
@media (max-width: 480px) {
  /* Hero */
  .btn-start, .btn-login { padding: 0.55rem 1.1rem; font-size: 0.82rem; }

  /* FAQ */
  #faq-section { padding: 3rem 4vw 2rem; }
  .faq-item { padding: 1rem 0.9rem; }
  .faq-q { font-size: 0.86rem; }
  .faq-a { font-size: 0.82rem; }
  .faq-bg-text { font-size: clamp(6rem, 32vw, 9rem); }

  /* Footer */
  #footer-content { padding: 2rem 4vw 1.25rem; }
  .footer-logo { font-size: 1.5rem; }
  .footer-desc { font-size: 0.88rem; }
  .nav-label { font-size: 0.78rem; }
  .nav-group a, .contact-item { font-size: 0.85rem; }
  .footer-legal { gap: 0.5rem; padding-top: 1.2rem; }
  .legal-left { font-size: 0.72rem; gap: 0.4rem 0.8rem; }
  .legal-right { font-size: 0.7rem; }
  .status-pulse { width: 7px; height: 7px; }

  /* W overlay */
  #w-overlay { font-size: 55vw; }
}

/* Very small phones (≤360px) */
@media (max-width: 360px) {
  #hero-title { font-size: 1.7rem; }
  .btn-start, .btn-login { padding: 0.5rem 0.9rem; font-size: 0.78rem; }

  #faq-section {     padding: 2.5rem 3.5vw 2rem; }
  .faq-q { font-size: 0.82rem; }
  .faq-item { padding: 0.9rem 0.8rem; }

  #footer-content { padding: 1.5rem 3.5vw 1rem; }
  .footer-logo { font-size: 1.3rem; }
  .legal-left { font-size: 0.65rem; }
  #w-overlay { font-size: 50vw; }
  
}
</style>
