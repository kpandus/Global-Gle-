<script setup>
import { ref } from 'vue'

const logoSrc  = ref('/logo1.jpg')
const isAnimating = ref(false)
const menuOpen = ref(false)
</script>

<template>
  <nav id="navbar">

    <!-- LEFT: logo -->
    <div class="nav-left">
      <div class="logo-wrap" :class="{ 'is-flipping': isAnimating }">
        <span class="ring ring-1"></span>
        <span class="ring ring-2"></span>
        <span class="ring ring-3"></span>
        <img :src="logoSrc" alt="GlobalGLE logo" class="nav-logo" />
      </div>
    </div>

    <!-- CENTER: links -->
    <div class="nav-center">
      <a href="#" class="nav-link">Work</a>
      <a href="#" class="nav-link">About</a>
      <span class="nav-brand">GlobalGLE</span>
      <a href="#" class="nav-link">Services</a>
      <a href="#" class="nav-link">Portfolio</a>
    </div>

    <!-- RIGHT: contact -->
    <div class="nav-right">
      <button class="nav-contact-btn">Contact</button>
      <button class="hamburger" @click="menuOpen = !menuOpen" :class="{ open: menuOpen }" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>

    <!-- Mobile drawer -->
    <Transition name="drawer">
      <div v-if="menuOpen" class="mobile-drawer" @click="menuOpen = false">
        <a href="#" class="drawer-link">Work</a>
        <a href="#" class="drawer-link">About</a>
        <a href="#" class="drawer-link">Services</a>
        <a href="#" class="drawer-link">Portfolio</a>
      </div>
    </Transition>

  </nav>
</template>

<style scoped>
/* ── Navbar shell ─────────────────────────────────────────────────────────── */
#navbar {
  position: fixed;
  top: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 4rem);
  max-width: 1200px;
  height: 56px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 1rem 0 0.6rem;
  border-radius: 100px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 13, 20, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 99999;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s;
}
#navbar.nav-hide {
  transform: translateX(-50%) translateY(-12px);
}

/* ── Columns ──────────────────────────────────────────────────────────────── */
.nav-left  { display: flex; align-items: center; justify-content: flex-start; }
.nav-center { display: flex; align-items: center; gap: 0.25rem; }
.nav-right  { display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; }

/* ── Logo ─────────────────────────────────────────────────────────────────── */
.logo-wrap {
  position: relative;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.nav-logo {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid rgba(255,255,255,0.18);
  display: block;
  position: relative;
  z-index: 2;
}

/* ── Burst rings ──────────────────────────────────────────────────────────── */
.ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid #00ff88;
  opacity: 0;
  pointer-events: none;
  z-index: 1;
}

/* ── Nav links ────────────────────────────────────────────────────────────── */
.nav-link {
  color: rgba(255,255,255,0.72);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0.03em;
  padding: 0.4rem 0.9rem;
  border-radius: 50px;
  transition: color 0.2s, background 0.2s;
}
.nav-link:hover { color: #fff; background: rgba(255,255,255,0.08); }

.nav-brand {
  font-family: 'Urbanist', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: rgba(255,255,255,0.5);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* ── Contact button ───────────────────────────────────────────────────────── */
.nav-contact-btn {
  padding: 0.5rem 1.4rem;
  border-radius: 50px;
  border: 1.5px solid rgba(0,255,136,0.82);
  background: rgba(0,80,40,0.88);
  color: #fff;
  font-family: 'Urbanist', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(0,255,136,0.18), 0 0 14px rgba(0,255,136,0.15);
  transition: background 0.25s, border-color 0.25s, box-shadow 0.25s, transform 0.2s;
}
.nav-contact-btn:hover {
  transform: scale(1.04);
  background: rgba(0,100,50,0.95);
  border-color: #00ff88;
  box-shadow: inset 0 1px 0 rgba(0,255,136,0.26), 0 0 26px rgba(0,255,136,0.32);
}

/* ── Hamburger ────────────────────────────────────────────────────────────── */
.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
}
.hamburger span {
  display: block;
  width: 16px;
  height: 1.5px;
  background: rgba(255,255,255,0.85);
  border-radius: 2px;
  transition: transform 0.3s, opacity 0.3s;
}
.hamburger.open span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
.hamburger.open span:nth-child(2) { opacity: 0; }
.hamburger.open span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

/* ── Mobile drawer ────────────────────────────────────────────────────────── */
.mobile-drawer {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 2rem);
  background: #0a0d14;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 20px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  z-index: 99;
}
.drawer-link {
  color: rgba(255,255,255,0.8);
  text-decoration: none;
  font-size: 1rem;
  font-weight: 500;
  padding: 0.85rem 1.2rem;
  border-radius: 12px;
  transition: background 0.2s, color 0.2s;
}
.drawer-link:hover { background: rgba(255,255,255,0.08); color: #fff; }

.drawer-enter-active, .drawer-leave-active { transition: opacity 0.2s, transform 0.2s; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; transform: translateX(-50%) translateY(-8px); }

/* ── Responsive ───────────────────────────────────────────────────────────── */

/* Tablet + mobile (≤900px): collapse nav links, show hamburger */
@media (max-width: 900px) {
  #navbar {
    width: calc(100% - 2rem);
    padding: 0 0.75rem 0 0.5rem;
    grid-template-columns: auto 1fr auto;
  }
  .nav-center { display: none; }
  .nav-brand  { display: none; }
  .hamburger  { display: flex; }
}

/* Mobile (≤768px): tighten sizing */
@media (max-width: 768px) {
  #navbar { width: calc(100% - 1.5rem); height: 50px; }
  .logo-wrap, .nav-logo { width: 36px; height: 36px; }
  .nav-contact-btn { font-size: 0.72rem; padding: 0.45rem 1rem; letter-spacing: 0.08em; }
}

/* Small phones (≤480px) */
@media (max-width: 480px) {
  #navbar { width: calc(100% - 1rem); top: 0.75rem; }
  .nav-contact-btn { display: none; }
}
</style>
