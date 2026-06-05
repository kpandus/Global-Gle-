<template>
  <div class="character-container">
    <div class="character-model" ref="canvasDiv">
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
let headBone = null
let neckBone = null
let screenLightMesh = null 
let screenFlickerIntensity = 0
const interpolation = { x: 0.1, y: 0.2 }
const cleanupFns = []

let targetP = 0
defineExpose({
  setScrollProgress: (p) => {
    targetP = p
  }
})

function setLighting(scene) {
  const directionalLight = new THREE.DirectionalLight(0x5eead4, 0);
  directionalLight.intensity = 1;
  directionalLight.position.set(-0.47, -0.32, -1);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0xff00ff, 0, 100, 3); 
  pointLight.position.set(3, 12, 4);
  pointLight.castShadow = true;
  scene.add(pointLight);

  return { 
    setPointLight: (intensity) => {
      pointLight.intensity = intensity
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
    scene.environmentIntensity = 0.64 // Restored from 0.1
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
        if (name.includes('screenlight')) {
          screenLightMesh = child
          child.visible = true 
          if (child.material) {
            child.material.transparent = true
            child.material.opacity = 0
            child.material.emissive = new THREE.Color(0xff00ff)
            child.material.emissiveIntensity = 0
          }
        } else if (name.includes('rim') || name.includes('glow') || name.includes('atmosphere') || 
            name.includes('rays') || name.includes('volume') || name.includes('emissive') ||
            name.includes('flare') || (name.includes('light') && !name.includes('screenlight')) || 
            name.includes('beam') || name.includes('halo') || name.includes('shine')) {
          child.visible = false
        } else {
          child.visible = true
          if (child.material) child.material.opacity = 1
        }
      } else {
        // Mobile (iPhone etc): Hide laptop and workstation
        if (!isCharacterPart) {
          child.visible = false
          if (child.material) {
            child.material.transparent = true
            child.material.opacity = 0
          }
        } else {
          child.visible = true
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
    
    if (forearmL) forearmL.rotation.set(0, 0, 0)
    if (forearmR) forearmR.rotation.set(0, 0, 0)
    if (handL) handL.rotation.set(0, 0, 0)
    if (handR) handR.rotation.set(0, 0, 0)
    // Desktop: arms start down (like mobile), will be restored when workstation arrives
    if (armL) armL.rotation.set(-1.57, 0, 0)
    if (armR) armR.rotation.set(-1.57, 0, 0)

    scene.add(character)
    character.rotation.y = 0
    headBone = character.getObjectByName('spine006')

    const onMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', onMouseMove)
    cleanupFns.push(() => window.removeEventListener('mousemove', onMouseMove))

    mixer = new THREE.AnimationMixer(character)
    const blinkClip = gltf.animations.find(clip => clip.name === 'Blink')
    if (blinkClip) mixer.clipAction(blinkClip).play()

    // Desktop: store typing actions but DON'T play yet
    const typingActions = []
    let typingStarted = false
    if (desktopMode) {
      // Disabled introAnimation as it was causing the "bop"
      // Only using the core typing/idle animations for workstation mode
      ['key1', 'key2', 'key5', 'key6', 'typing'].forEach(name => {
        const clip = gltf.animations.find(c => c.name === name)
        if (clip) typingActions.push(mixer.clipAction(clip))
      })
    }

    const clock = new THREE.Clock()
    
    // Flicker logic for screen
    const flickerInterval = setInterval(() => {
      screenFlickerIntensity = Math.random()
    }, 200)
    cleanupFns.push(() => clearInterval(flickerInterval))

    const animateLoop = () => {
      animationId = requestAnimationFrame(animateLoop)
      const delta = clock.getDelta()
      if (mixer) mixer.update(delta)

      // ── Head & Neck Absolute Stability ─────────────────────────────
      // We lock both the head (spine006) and neck (spine005) 
      // after the mixer update to ensure they override all animation data.
      // Set to 0 for a neutral, upright posture.
      if (headBone) {
        headBone.rotation.set(0, 0, 0)
      }
      if (neckBone) {
        neckBone.rotation.set(0, 0, 0)
      }

      const p = targetP // Uses scrubbed value from main page
      const { isDesktop: desktopModeNow } = getDisplayMode()
      const baseScale = desktopModeNow ? 0.4 : 0.45

      if (desktopModeNow) {
        let soloOpacity = 0
        let s3p = 0 

        if (p < 0.25) {
          soloOpacity = Math.pow(p / 0.25, 2)
          s3p = 0
        } else if (p < 0.6) {
          soloOpacity = 1
          s3p = 0
        } else {
          soloOpacity = 1
          s3p = Math.min(1, (p - 0.6) / 0.4)
        }
        
        const s3e = Math.pow(s3p, 2)

        // Arms & Typing Logic
        if (s3p === 0) {
          if (typingStarted) {
            typingStarted = false
            typingActions.forEach(a => a.stop())
            if (armL) armL.rotation.set(-1.57, 0, 0)
            if (armR) armR.rotation.set(-1.57, 0, 0)
          }
        } else if (!typingStarted) {
          typingStarted = true
          typingActions.forEach(a => { a.reset(); a.fadeIn(0.4); a.play() })
        }

        // Camera
        const camY = 15.6 - (s3e * 4.6)
        const camZ = 24.0 + (s3e * 22.0)
        camera.position.set(0, camY, camZ)
        
        // Restore lower lookY to focus on the workstation and full body (shoes)
        const lookY = 14.2 - (s3e * 6.7)
        camera.lookAt(0, lookY, 0)

        // Character Transform: Restore shrinking scale to fit the framing
        const currentBaseScale = 1.0 - (s3e * 0.15)
        const scaleVal = (baseScale + (soloOpacity * (1.0 - baseScale))) * currentBaseScale
        character.scale.set(scaleVal, scaleVal, scaleVal)
        character.position.x = 0
        character.rotation.y = s3e * 0.6

        // Materials & Visibility
        const isCharMesh = (child) => {
          const n = child.name.toLowerCase()
          return child.type === 'SkinnedMesh' ||
            n.includes('body') || n.includes('head') || n.includes('shirt') ||
            n.includes('pant') || n.includes('shoe') || n.includes('hair') ||
            n.includes('skin') || n.includes('eye') || n.includes('hand') ||
            n.includes('foot') || n.includes('male') || n.includes('character') ||
            n.includes('avatar') || n.includes('jean') || n.includes('sneaker') ||
            n.includes('hoodie') || n.includes('cloth') || n.includes('leg') ||
            n.includes('arm') || n.includes('neck') || n.includes('torso') ||
            n.includes('waist') || n.includes('hips') || n.includes('thigh') ||
            n.includes('shin') || n.includes('shoulder') || n.includes('boot') ||
            n.includes('sole') || n.includes('sock') || n.includes('heel') ||
            n.includes('suit')
        }

        character.traverse(child => {
          if (!child.isMesh || !child.material) return
          if (isCharMesh(child)) {
            child.visible = true
            child.material.transparent = soloOpacity < 0.99
            child.material.opacity = soloOpacity
            if (soloOpacity > 0.99) child.material.depthWrite = true
          } else {
            // Workstation parts: hide artifacts, show rest with progress
            const n = child.name.toLowerCase()
            if (n.includes('rim') || n.includes('glow') || n.includes('atmosphere') || 
                n.includes('rays') || n.includes('volume') || n.includes('emissive') ||
                n.includes('flare') || n.includes('light') || n.includes('beam') || 
                n.includes('halo') || n.includes('shine')) {
              child.visible = false
            } else {
              child.visible = s3e > 0.001
              if (child.visible) {
                child.material.transparent = s3e < 0.99
                child.material.opacity = s3e
                if (s3e > 0.99) child.material.depthWrite = true
              }
            }
          }
        })

        // ── Head Rotation Stability ─────────────────────────────
        if (headBone) {
          headBone.rotation.x = -0.2
          headBone.rotation.y = 0
        }

        // Screen Glow Logic
        if (screenLightMesh && typeof light.setPointLight === 'function') {
          if (s3e > 0.98) {
            screenLightMesh.material.opacity = 1
            const targetEmissive = screenFlickerIntensity * 8
            screenLightMesh.material.emissiveIntensity = THREE.MathUtils.lerp(
              screenLightMesh.material.emissiveIntensity, 
              targetEmissive, 
              0.1
            )
            light.setPointLight(screenLightMesh.material.emissiveIntensity * 2) 
          } else {
            screenLightMesh.material.opacity = 0
            screenLightMesh.material.emissiveIntensity = 0
            light.setPointLight(0)
          }
        }
      } else {
        // Mobile
        const easedP = Math.pow(p, 3)
        const scaleVal = baseScale + (easedP * (1.0 - baseScale))
        character.scale.set(scaleVal, scaleVal, scaleVal)
        character.traverse(child => {
          if (child.isMesh && child.visible && child.material) {
            child.material.transparent = true
            child.material.opacity = easedP
          }
        })
      }

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
</style>
