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

onMounted(async () => {
  if (!canvasDiv.value) return
  await new Promise(r => setTimeout(r, 50))

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

  // ── Camera – portrait framing (face + upper chest) ──────────────────
  const isMobile = w < 768
  camera = new THREE.PerspectiveCamera(12, w / h, 0.1, 1000)
  if (isMobile) {
    camera.position.set(0, 12.0, 32)
  } else {
    camera.position.set(0, 12.0, 30)
  }
  camera.lookAt(0, 13.0, 0)
  camera.updateProjectionMatrix()

  const light = setLighting(scene)

  // HDR environment (keep for reflections)
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

  // ── Load character (without animations) ─────────────────────────────
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

    // ── Phase 1 Implementation (Targeted Container Hiding) ───────────────

    // 1. Hide the known main prop containers from the original repo
    const propContainers = ['Plane004', 'screenlight', 'monitor', 'keyboard', 'laptop', 'desk', 'chair', 'hands']
    propContainers.forEach(name => {
      const obj = character.getObjectByName(name)
      if (obj) {
        obj.visible = false
        obj.scale.set(0, 0, 0)
        obj.traverse(child => {
          child.visible = false
          if (child.scale) child.scale.set(0, 0, 0)
        })
      }
    })

    // 2. Traverse everything to catch loose props and protect character
    character.traverse((child) => {
      const name = child.name.toLowerCase()
      const isCharacterPart = child.type === 'SkinnedMesh' || 
                              name.includes('body') || name.includes('head') || 
                              name.includes('shirt') || name.includes('pant') || 
                              name.includes('shoe') || name.includes('hair') || 
                              name.includes('skin') || name.includes('eye') || 
                              (name.includes('hand') && child.type === 'SkinnedMesh') ||
                              name.includes('foot') || 
                              name.includes('jean') || name.includes('sneaker') || 
                              name.includes('cloth') || name.includes('male') || 
                              name.includes('character') || name.includes('avatar')

      if (child.isMesh) {
        const isProp = name.includes('plane004') || name.includes('screenlight') || 
                       name.includes('monitor') || name.includes('keyboard') || 
                       name.includes('laptop') || name.includes('desk') || 
                       name.includes('table') || name.includes('prop') ||
                       name.includes('chair') || name.includes('furniture') ||
                       name.includes('hands') || (name.includes('hand') && child.type !== 'SkinnedMesh')

        if (isProp && !isCharacterPart) {
          child.visible = false
          child.scale.set(0, 0, 0)
          if (child.material) {
            child.material.transparent = true
            child.material.opacity = 0
          }
        } else if (isCharacterPart) {
          child.visible = true
          if (child.scale.x === 0) child.scale.set(1, 1, 1)
          child.castShadow = true
          child.receiveShadow = true
          child.frustumCulled = true
        } else {
          // If it's neither a known prop nor a character part, hide it just to be safe if it's prop-like
          if (name.includes('hand') || name.includes('prop')) {
            child.visible = false
            child.scale.set(0, 0, 0)
          }
        }
      }
    })

    // Adjust foot positions
    const footR = character.getObjectByName('footR')
    const footL = character.getObjectByName('footL')
    if (footR) footR.position.y = 3.36
    if (footL) footL.position.y = 3.36

    // ── Precise Arm Rotation (Downwards pose) ───────────────────────────
    const armL = character.getObjectByName('upper_armL')
    const armR = character.getObjectByName('upper_armR')
    const forearmL = character.getObjectByName('lower_armL')
    const forearmR = character.getObjectByName('lower_armR')
    const handL = character.getObjectByName('handL')
    const handR = character.getObjectByName('handR')
    
    if (armL) {
      armL.rotation.set(-1.57, 0, 0) // Match the right arm's downward rotation
    }
    if (armR) {
      armR.rotation.set(-1.57, 0, 0) // Keep right arm down
    }
    if (forearmL) forearmL.rotation.set(0, 0, 0)
    if (forearmR) forearmR.rotation.set(0, 0, 0)
    if (handL) handL.rotation.set(0, 0, 0)
    if (handR) handR.rotation.set(0, 0, 0)

    scene.add(character)
    character.rotation.y = 0
    // ── ANIMATIONS (Blinking) ─────────────────────────────────────────
    mixer = new THREE.AnimationMixer(character)
    const blinkClip = gltf.animations.find(clip => clip.name === 'Blink')
    if (blinkClip) {
      const blinkAction = mixer.clipAction(blinkClip)
      blinkAction.play()
    }

    const clock = new THREE.Clock()
    
    // ── SCROLL-DRIVEN REVEAL (Ease into existence) ─────────────────────
    const rim = canvasDiv.value.querySelector('.character-rim')
    
    const handleReveal = () => {
      const scrollY = window.scrollY
      const vh = window.innerHeight
      const appearanceStart = vh * 4.0 * 0.4 // Start revealing much earlier
      const landingPoint = (vh * 4.0) + (vh * 1.3 * 0.2)
      
      // Calculate progress (0 to 1)
      let p = 0
      if (scrollY > appearanceStart) {
        p = Math.min(1, (scrollY - appearanceStart) / (landingPoint - appearanceStart))
      }

      // Much slower cubic easing
      const easedP = Math.pow(p, 3)

      // Easing into existence: Scale and Opacity
      const scaleVal = 0.4 + (easedP * 0.6) 
      character.scale.set(scaleVal, scaleVal, scaleVal)

      // Rim Sync
      if (rim) {
        rim.style.opacity = easedP * 0.8
        // Lowered top to reach the character head better
        rim.style.transform = `translate(-50%, -50%) scale(${0.8 + easedP * 0.6})`
      }
      
      character.traverse(child => {
        if (child.isMesh && child.visible) {
          if (child.material) {
            child.material.transparent = true
            child.material.opacity = easedP
          }
        }
      })
    }
    
    window.addEventListener('scroll', handleReveal, { passive: true })
    handleReveal() // Initial sync

    const animateLoop = () => {
      animationId = requestAnimationFrame(animateLoop)
      
      const delta = clock.getDelta()
      if (mixer) mixer.update(delta)

      renderer.render(scene, camera)
    }
    animateLoop()

    // Add to cleanup
    cleanupFns.push(() => window.removeEventListener('scroll', handleReveal))

    // Clean up
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
  height: 100%;
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
  width: 500px;
  height: 500px;
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