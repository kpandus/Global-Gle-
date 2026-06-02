<template>
  <div class="character-container">
    <div class="character-model" ref="canvasDiv">
      <div class="character-rim"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

async function decryptFile(url, password) {
  const response = await fetch(url);
  const encryptedData = await response.arrayBuffer();
  const iv = new Uint8Array(encryptedData.slice(0, 16));
  const data = encryptedData.slice(16);
  const passwordBuffer = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', passwordBuffer);
  const rawKey = hash.slice(0, 32);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    cryptoKey,
    data
  );
  return decrypted;
}

const canvasDiv = ref(null)
let renderer = null
let animationId = null
let scene = new THREE.Scene()
let camera = null
let mixer = null          // will remain null – animations disabled
let screenLight = null    // will be hidden
let mouse = { x: 0, y: 0 }
const interpolation = { x: 0.18, y: 0.28 }
const cleanupFns = []

function setLighting(scene) {
  const directionalLight = new THREE.DirectionalLight(0x5eead4, 0);
  directionalLight.intensity = 1;
  directionalLight.position.set(-0.47, -0.32, -1);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0x22d3ee, 10, 100, 3);
  pointLight.position.set(3, 12, 4);
  pointLight.castShadow = true;
  scene.add(pointLight);

  return { 
    setPointLight: (screenLight) => {
      if (screenLight && screenLight.material.opacity > 0.9) {
        pointLight.intensity = screenLight.material.emissiveIntensity * 20;
      } else {
        pointLight.intensity = 0;
      }
    }
  }
}

const getDisplayMode = () => {
  if (typeof window === 'undefined') return { isDesktop: true, isMobile: false }
  
  const isAndroid = /Android/i.test(navigator.userAgent)
  const isLargeScreen = window.innerWidth > 1024
  
  // Specific request: Android devices show the desktop view (with laptop)
  const isDesktop = isLargeScreen || isAndroid
  return { isDesktop, isMobile: !isDesktop }
}

onMounted(async () => {
  if (!canvasDiv.value) return
  await new Promise(r => setTimeout(r, 50))

  const { isDesktop } = getDisplayMode()
  const rect = canvasDiv.value.getBoundingClientRect()
  const w = rect.width || window.innerWidth
  const h = rect.height || window.innerHeight

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.domElement.style.position = 'absolute'
  renderer.domElement.style.inset = '0'
  renderer.domElement.style.zIndex = '1'
  canvasDiv.value.appendChild(renderer.domElement)

  // ── Camera framing ──────────────────────────────────
  camera = new THREE.PerspectiveCamera(18, w / h, 0.1, 1000)
  
  const updateCamera = () => {
    const { isDesktop: desktopMode } = getDisplayMode()
    if (desktopMode) {
      // Desktop: Show the workstation/laptop, framed to show full body + seat
      camera.position.set(0, 11.0, 42.0)
      camera.lookAt(0, 9.5, 0)
    } else {
      // Mobile (iOS etc): Zoom in on character, framing to show ~80% of body (20% cut)
      camera.position.set(0, 13.8, 34) 
      camera.lookAt(0, 14.8, 0)
    }
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  }
  updateCamera()

  const light = setLighting(scene)

  // HDR environment
  try {
    const { RGBELoader } = await import('three/examples/jsm/loaders/RGBELoader.js')
    const pmrem = new THREE.PMREMGenerator(renderer)
    pmrem.compileEquirectangularShader()
    const hdrLoader = new RGBELoader()
    const hdrTexture = await hdrLoader.loadAsync('/models/char_enviorment.hdr')
    const envMap = pmrem.fromEquirectangular(hdrTexture).texture
    scene.environment = envMap
    scene.environmentIntensity = 0.64
    hdrTexture.dispose()
    pmrem.dispose()
  } catch (e) {
    console.warn('HDR load failed:', e)
  }

  // ── Load character ─────────────────────────────
  const gltfLoader = new GLTFLoader()
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('/draco/')
  gltfLoader.setDRACOLoader(dracoLoader)

  try {
    const decrypted = await decryptFile('/models/character.enc?v=' + Date.now(), 'MyCharacter12');
    const blobUrl = URL.createObjectURL(new Blob([decrypted]));

    const gltf = await new Promise((resolve, reject) => {
      gltfLoader.load(blobUrl, resolve, undefined, reject)
    })

    const character = gltf.scene
    const { isDesktop: desktopMode } = getDisplayMode()
    
    character.traverse((child) => {
      if (!child.isMesh) return

      const name = child.name.toLowerCase()
      // Whitelist for character body parts and essential environment
      const isCharacterPart = child.type === 'SkinnedMesh' || 
                              name.includes('body') || name.includes('head') || 
                              name.includes('shirt') || name.includes('pant') || 
                              name.includes('shoe') || name.includes('hair') || 
                              name.includes('skin') || name.includes('eye') || 
                              name.includes('hand') || name.includes('foot') || 
                              name.includes('male') || name.includes('character') || 
                              name.includes('avatar') || name.includes('jean') ||
                              name.includes('sneaker') || name.includes('hoodie') ||
                              name.includes('cloth') || name.includes('leg') ||
                              name.includes('arm') || name.includes('neck') ||
                              name.includes('torso') || name.includes('waist') ||
                              name.includes('hips') || name.includes('thigh') ||
                              name.includes('shin') || name.includes('shoulder')

      if (desktopMode) {
        // Desktop / Android: Show full workstation + laptop
        child.visible = true
        if (child.scale.x === 0) child.scale.set(1, 1, 1)
        if (child.material) child.material.opacity = 1
      } else {
        // Mobile (iPhone etc): Hide laptop and workstation
        if (!isCharacterPart) {
          child.visible = false
          child.scale.set(0, 0, 0)
          if (child.material) {
            child.material.transparent = true
            child.material.opacity = 0
          }
        } else {
          child.visible = true
          if (child.scale.x === 0) child.scale.set(1, 1, 1)
        }
      }

      if (child.visible) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    const footR = character.getObjectByName('footR')
    const footL = character.getObjectByName('footL')
    if (footR) footR.position.y = 3.36
    if (footL) footL.position.y = 3.36

    const armL = character.getObjectByName('upper_armL')
    const armR = character.getObjectByName('upper_armR')
    const forearmL = character.getObjectByName('lower_armL')
    const forearmR = character.getObjectByName('lower_armR')
    const handL = character.getObjectByName('handL')
    const handR = character.getObjectByName('handR')
    
    if (!desktopMode) {
      // Arms down for character-only mobile view
      if (armL) armL.rotation.set(-1.57, 0, 0)
      if (armR) armR.rotation.set(-1.57, 0, 0)
    }
    if (forearmL) forearmL.rotation.set(0, 0, 0)
    if (forearmR) forearmR.rotation.set(0, 0, 0)
    if (handL) handL.rotation.set(0, 0, 0)
    if (handR) handR.rotation.set(0, 0, 0)

    scene.add(character)
    character.rotation.y = 0

    mixer = new THREE.AnimationMixer(character)
    const blinkClip = gltf.animations.find(clip => clip.name === 'Blink')
    if (blinkClip) mixer.clipAction(blinkClip).play()

    if (desktopMode) {
      // Desktop / Android: Play typing animations at the laptop
      const introClip = gltf.animations.find(clip => clip.name === 'introAnimation')
      if (introClip) {
        const action = mixer.clipAction(introClip)
        action.clampWhenFinished = true
        action.setLoop(THREE.LoopOnce, 1)
        action.play()
      }

      ['key1', 'key2', 'key5', 'key6', 'typing'].forEach(name => {
        const clip = gltf.animations.find(c => c.name === name)
        if (clip) mixer.clipAction(clip).play()
      })
    }

    const clock = new THREE.Clock()
    const rim = canvasDiv.value.querySelector('.character-rim')
    
    const handleReveal = () => {
      const scrollY = window.scrollY
      const vh = window.innerHeight
      const heroH = vh * 4.0
      const sceneH = vh * 2.5
      
      const appearanceStart = heroH * 0.15 
      const landingPoint = heroH + (sceneH * 0.2)
      
      let p = 0
      if (scrollY < appearanceStart) {
        p = 0
      } else if (scrollY > landingPoint) {
        p = 1
      } else {
        p = (scrollY - appearanceStart) / (landingPoint - appearanceStart)
      }

      const easedP = Math.pow(p, 3)
      
      const { isDesktop: desktopModeNow } = getDisplayMode()
      const baseScale = desktopModeNow ? 0.4 : 0.45
      const scaleVal = baseScale + (easedP * (1.0 - baseScale)) 

      if (character) {
        character.scale.set(scaleVal, scaleVal, scaleVal)
        character.traverse(child => {
          if (child.isMesh && child.visible) {
            if (child.material) {
              child.material.transparent = true
              child.material.opacity = easedP
            }
          }
        })
      }

      if (rim) {
        rim.style.opacity = easedP * 0.8
        rim.style.transform = `translate(-50%, -50%) scale(${0.8 + easedP * 0.6})`
      }
    }
    
    window.addEventListener('scroll', handleReveal, { passive: true })
    handleReveal() 

    const onResize = () => {
      const nW = window.innerWidth
      const nH = window.innerHeight
      renderer.setSize(nW, nH)
      updateCamera()
    }
    window.addEventListener('resize', onResize)
    cleanupFns.push(() => window.removeEventListener('resize', onResize))

    const animateLoop = () => {
      animationId = requestAnimationFrame(animateLoop)
      const delta = clock.getDelta()
      if (mixer) mixer.update(delta)
      renderer.render(scene, camera)
    }
    animateLoop()

    cleanupFns.push(() => window.removeEventListener('scroll', handleReveal))
    URL.revokeObjectURL(blobUrl)
    dracoLoader.dispose()
  } catch (err) {
    console.error('Character failed to load:', err)
  }
})


onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  cleanupFns.forEach(fn => fn())
  scene.clear()
  if (renderer) {
    if (canvasDiv.value && renderer.domElement.parentNode === canvasDiv.value) {
      canvasDiv.value.removeChild(renderer.domElement)
    }
    renderer.dispose()
    renderer = null
  }
})
</script>

<style scoped>
.character-container {
  width: 100%;
  height: 100vh;
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.character-model {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  isolation: isolate;
}

.character-rim {
  position: absolute;
  width: 252px;
  height: 252px;
  z-index: 1;
  background-color: #22d3ee;
  box-shadow: inset 66px 35px 85px 0px rgba(0, 180, 180, 0.65);
  filter: blur(60px);
  border-radius: 50%;
  top: 55%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.8);
  opacity: 0;
  pointer-events: none;
}
</style>
