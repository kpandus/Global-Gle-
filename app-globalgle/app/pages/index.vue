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
  const heroH = 400 * (window.innerHeight / 100)
  const sceneH = 250 * (window.innerHeight / 100)

  // ─── HERO & TRAVEL LOGIC ──────────────────────────────────────────────────
  const title = $('#hero-title')
  const btns = $('.hero-btns')
  const globeCanvas = $('#globe-canvas')

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

      const globeP = Math.min(1, scrollY / (heroH * 0.8))
      if (threeEarth.value?.setScrollProgress) {
        threeEarth.value.setScrollProgress(globeP)
      }

      const appearanceStart = heroH * 0.25
      const appearanceEnd = heroH * 0.45

      if (scrollY < appearanceEnd) {
        gsap.set(btns, { opacity: 1, pointerEvents: 'all' })
      } else {
        gsap.set(btns, { opacity: 0, pointerEvents: 'none' })
      }

      if (scrollY < appearanceStart) {
        gsap.set(title, { opacity: 0 })
      } else if (scrollY < appearanceEnd) {
        const revealP = (scrollY - appearanceStart) / (appearanceEnd - appearanceStart)
        gsap.set(title, { opacity: revealP, scale: 1, y: 0, color: '#fff' })
      } else {
        gsap.set(title, { opacity: 1 })
      }

      if (scrollY > appearanceEnd) {
        const landingPoint = heroH + (sceneH * 0.2)
        const journeyP = Math.min(1, (scrollY - appearanceEnd) / (landingPoint - appearanceEnd))

        const targetY = -window.innerHeight * 0.22
        const targetScale = isMobile ? 0.35 : 0.3
        const colorVal = gsap.utils.interpolate("#ffffff", "#00ff88", journeyP)

        let yPos = journeyP * targetY
        let topFade = 1

        if (scrollY > landingPoint) {
           yPos = targetY

           // UN-STICK LOGIC: If we've scrolled past the viewing duration,
           // start moving the title with the character as it scrolls away
           const unstickPoint = heroH + sceneH - window.innerHeight
           if (scrollY > unstickPoint) {
              yPos -= (scrollY - unstickPoint)
           }
           
           const topThreshold = -window.innerHeight * 0.42
           if (yPos < topThreshold) {
              topFade = Math.max(0, 1 - (topThreshold - yPos) / 60)
           }
        }

        gsap.set(title, {
          y: yPos,
          scale: 1 - (journeyP * (1 - targetScale)),
          color: colorVal,
          opacity: topFade,
          textShadow: `0 0 ${journeyP * 30}px rgba(0, 255, 136, ${0.4 + journeyP * 0.6})`
        })

        // globe fade handled below
      }

      const exitStart = heroH + sceneH - 600
      if (scrollY > exitStart) {
        const exitP = Math.min(1, (scrollY - exitStart) / 400)
        gsap.set(title, { opacity: 1 - exitP })
      }

      // Globe always fades out once hero scroll ends
      if (globeCanvas) {
        const globeFadeP = Math.min(1, Math.max(0, (scrollY - heroH + 200) / 400))
        globeCanvas.style.opacity = 1 - globeFadeP
        // Also ensure pointer-events off once faded
        globeCanvas.style.pointerEvents = globeFadeP >= 1 ? 'none' : 'none'
      }
    }
  })

    // ─── W REVEAL FOOTER ANIMATION ──────────────────────────────────────────
    const wOverlay = $('#w-overlay')
    const wBloom = $('#w-bloom')
    const footerContent = $('#footer-content')
    const stickyWrap = $('#footer-sticky-wrap')
    
    // Start sticky wrap at deep purple so no black ever shows
    gsap.set(stickyWrap, { backgroundColor: '#0d0020' })

    ScrollTrigger.create({
      trigger: '#footer-reveal-section',
      start: 'top 93%', 
      end: 'bottom bottom',
      scrub: 1.5,
      onEnter: () => gsap.to(wOverlay, { opacity: 1, duration: 0.6, ease: "power2.out" }),
      onLeaveBack: () => gsap.to(wOverlay, { opacity: 0, duration: 0.4, ease: "power2.in" }),
      onUpdate: (self) => {
        const p = self.progress
        
        let wScale = 1
        let blurVal = 0
        let bgIntensity = 0
        let contentP = 0

        // 1. Hold phase: Let user see the W clearly for longer
        if (p < 0.22) {
          wScale = 1
          blurVal = 0
          bgIntensity = 0
          contentP = 0
          gsap.set(wBloom, { scale: 1, opacity: 0 })
        } 
        // 2. Expansion phase: Total Purple Takeover
        else {
          const expandP = (p - 0.22) / 0.78
          wScale = 1 + (expandP * 130) // Massive W
          blurVal = expandP * 50
          bgIntensity = Math.min(1, expandP * 1.8) 
          contentP = Math.min(1, expandP * 2.5) 

          // Bloom expands exponentially to drown out any dark spots
          const bloomP = Math.max(0, (expandP - 0.02) / 0.98)
          gsap.set(wBloom, {
            scale: 1 + bloomP * 130, // Universal coverage
            opacity: Math.min(1, bloomP * 5) // Fast full fill
          })
        }
        
        gsap.set(wOverlay, { 
          scale: wScale, 
          filter: `blur(${blurVal}px)`,
          color: "#8b5cf6"
        })

        // Background shifts from dark purple → rich purple
        gsap.set(stickyWrap, {
          backgroundColor: gsap.utils.interpolate("#0d0020", "#2d0a4e", bgIntensity)
        })
        
        gsap.set(footerContent, { 
          opacity: contentP,
          y: -15 * (1 - contentP)
        })
      }
    })

  // ─── 3 GLES JUMP & FLARE ANIMATION ──────────────────────────────────────
  const gleWordsList = gsap.utils.toArray('.gle-word')
  gleWordsList.forEach((word, i) => {
    gsap.fromTo(word, 
      { y: 250, opacity: 0, rotationX: -60, scale: 0.5 },
      {
        y: 0,
        opacity: 1,
        rotationX: 0,
        scale: 0.8,
        scrollTrigger: {
          trigger: '#gle-section',
          start: `top ${90 - i * 15}%`,
          end: `bottom ${10 - i * 15}%`, 
          scrub: 2.2, 
        },
        ease: "power2.out"
      }
    )
  })

  // ─── NUMBERS (CONTINUOUS MATRIX FALL) ────────────────────────────────────
  const numberItems = gsap.utils.toArray('.number-item')
  numberItems.forEach((el, i) => {
    const duration = 4 + Math.random() * 4
    const delay = Math.random() * 5
    const anim = gsap.fromTo(el, 
      { y: -300, opacity: 0 },
      {
        y: 300,
        opacity: 1,
        duration: duration,
        repeat: -1,
        delay: delay,
        ease: "none",
        onRepeat: () => { gsap.set(el, { opacity: 0 }) }
      }
    )
    cleanupFns.push(() => anim.kill())

    ScrollTrigger.create({
      trigger: '#numbers-section',
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => {
        if (!self.isActive) gsap.set(el, { visibility: 'hidden' })
        else gsap.set(el, { visibility: 'visible' })
      }
    })
  })

  // Glass Box Entrance (Glide from top) & Exit (Louvre Roll-Up)
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
          scrub: 1.5,
        }
      }
    )

    // EXIT
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
          skewY: 10 * p, // Extra motion
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

  // (Deduplicated GLE Section logic moved above)


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

    <section id="gle-section">
      <div class="gle-text-wrap">
        <span class="gle-word">GLE</span>
        <span class="gle-word">GLE</span>
        <span class="gle-word">GLE</span>
      </div>
    </section>

    <!-- FOOTER REVEAL SECTION -->
    <section id="footer-reveal-section">
      <div id="footer-sticky-wrap">
        <!-- Purple bloom behind the W to fill gaps -->
        <div id="w-bloom"></div>
        <div id="w-overlay">W</div>
        
        <div id="footer-content">
          <footer id="footer">
            <div class="footer-top">
              <div class="footer-brand">
                <div class="footer-logo">GlobalGle</div>
                <p class="footer-desc">
                  Building the infrastructure for 
                  the global economy's next act.
                </p>
                <div class="footer-socials">
                  <span class="social-cir">X</span>
                  <span class="social-cir">LN</span>
                  <span class="social-cir">IG</span>
                  <span class="social-cir">YT</span>
                </div>
              </div>
              
              <div class="footer-nav">
                <div class="nav-group">
                  <span class="nav-label">Protocol</span>
                  <a href="#">Network</a>
                  <a href="#">Liquidity</a>
                  <a href="#">Security</a>
                  <a href="#">Open API</a>
                </div>
                <div class="nav-group">
                  <span class="nav-label">Resources</span>
                  <a href="#">Whitepaper</a>
                  <a href="#">Documentation</a>
                  <a href="#">Community</a>
                  <a href="#">Guides</a>
                </div>
                <div class="nav-group">
                  <span class="nav-label">Company</span>
                  <a href="#">About Us</a>
                  <a href="#">Careers</a>
                  <a href="#">Press Kit</a>
                  <a href="#">Contact</a>
                </div>
              </div>

              <div class="footer-newsletter">
                <span class="nav-label">Stay Connected</span>
                <p>Join 2,000+ institutions scaling with GlobalGle.</p>
                <div class="news-input-wrap">
                  <input type="text" placeholder="Email address" />
                  <button>→</button>
                </div>
              </div>
            </div>
            
            <div class="footer-legal">
              <div class="legal-left">
                <span>© 2025 GlobalGle Inc.</span>
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
                <a href="#">Sitemap</a>
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
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

#hero-title {
  font-family: 'Urbanist', sans-serif;
  font-size: clamp(2rem, 7vw, 9rem);
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

/* NUMBERS */
#numbers-section { width: 100vw; min-height: 120vh; background: #0a0d14; display: flex; align-items: center; justify-content: center; padding: 4rem; overflow: hidden; position: relative; z-index: 10; }
.numbers-screen { 
  position: relative; 
  width: min(860px, 90vw); 
  min-height: 480px; 
  border-radius: 24px; 
  border: 1px solid rgba(255, 255, 255, 0.1); 
  background: rgba(255, 255, 255, 0.03); 
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 3.5rem 2.5rem 2.5rem; 
  display: flex; 
  flex-direction: column; 
  justify-content: center; 
  gap: 1.2rem; 
  overflow: hidden; 
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1);
}
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

/* FAQ */
#faq-section { width: 100vw; min-height: 100vh; background: #0a0d14; padding: 6rem 10vw; position: relative; z-index: 10; }
.faq-label { font-size: 0.8rem; letter-spacing: 0.2em; text-transform: uppercase; color: #00ff88; display: block; text-align: center; }
.faq-header { font-family: 'Urbanist', sans-serif; font-size: clamp(2rem, 5vw, 4rem); font-weight: 800; margin: 1rem auto 3rem; max-width: 700px; text-align: center; }
.faq-item { border: 1px solid #1f1f1f; border-radius: 14px; padding: 1.5rem 1.8rem; margin-bottom: 0.75rem; background: rgba(255,255,255,0.02); transition: all 0.2s; }
.faq-item.open { border-color: rgba(0,255,136,0.35); background: rgba(0,255,136,0.04); }
.faq-q { display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 1.05rem; font-weight: 500; }
.faq-a { max-height: 0; overflow: hidden; transition: all 0.4s ease; color: #6b7280; font-size: 0.95rem; }
.faq-item.open .faq-a { max-height: 200px; padding-top: 1rem; }

/* GLE */
#gle-section { width: 100vw; min-height: 80vh; background: #0a0d14; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; z-index: 15; }
.gle-text-wrap { display: flex; gap: clamp(1rem, 4vw, 4rem); }
.gle-word { font-family: 'Urbanist', sans-serif; font-size: clamp(4rem, 12vw, 11rem); font-weight: 800; color: transparent; -webkit-text-stroke: 1.5px rgba(255,255,255,0.18); }

#footer-reveal-section {
  position: relative;
  width: 100vw;
  height: 300vh;
  background: #2d0a4e; /* Full purple — no black gaps */
}

#footer-sticky-wrap {
  position: sticky;
  top: 0;
  width: 100vw;
  height: 100vh;
  background: #0d0020;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Bloom fills the gaps the W letter strokes leave behind */
#w-bloom {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 4vw;
  height: 4vw;
  border-radius: 50%;
  background: radial-gradient(circle, #7c3aed 0%, #4c1d95 50%, #2d0a4e 100%);
  filter: blur(60px);
  pointer-events: none;
  opacity: 0;
  z-index: 5;
  will-change: transform, opacity;
}

#w-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  font-family: 'Urbanist', sans-serif;
  font-size: 25vw;
  font-weight: 900;
  color: #8b5cf6;
  pointer-events: none;
  opacity: 0;
  will-change: transform, opacity;
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
  padding: 4rem 6vw;
}

#footer {
  width: 100%;
  max-width: 1300px;
  color: #fff;
}

.footer-top {
  display: flex;
  justify-content: space-between;
  gap: 4rem;
  padding-bottom: 5rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.footer-brand { flex: 1; min-width: 280px; }

.footer-logo {
  font-size: 2.4rem;
  font-weight: 800;
  margin-bottom: 1.2rem;
  letter-spacing: -0.02em;
}

.footer-desc {
  color: rgba(255,255,255,0.5);
  line-height: 1.6;
  font-size: 1.05rem;
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

.footer-nav { flex: 2; display: flex; justify-content: space-around; gap: 2rem; }

.nav-group { display: flex; flex-direction: column; gap: 1rem; }
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
  font-size: 1rem;
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
  .hero-btns { top: 28%; }
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
  .hero-btns { top: 22%; }
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
