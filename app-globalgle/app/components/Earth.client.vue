<template>
  <canvas ref="c" id="globe-canvas" class="three-canvas" style="position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:1;pointer-events:none;" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'

const c = ref(null)
let animationId = null
let fragments = []
let fragmentTargets = []   // resting (assembled) positions
let fragmentOrigins = []   // shattered (exploded) positions
let scrollProgress = 0
let lastScrollTime = 0

const FRAGMENT_COUNT = 180

const setScrollProgress = (value) => {
  lastScrollTime = Date.now()
  // 0.45 = globe fully assembles at 45% of the hero scroll (faster but not instant)
  let remapped = value / 0.45
  scrollProgress = Math.max(0, Math.min(1, remapped))
}

defineExpose({ setScrollProgress })

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

onMounted(() => {
  const canvas = c.value
  let W = window.innerWidth
  let H = window.innerHeight

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setSize(W, H)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000)
  
  const updateCamera = () => {
    const isMobile = window.innerWidth <= 768
    camera.position.z = isMobile ? 6 : 5
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  }
  updateCamera()

  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const sun = new THREE.DirectionalLight(0xffffff, 2.5)
  sun.position.set(5, 3, 5)
  scene.add(sun)

  // Load texture
  const texture = new THREE.TextureLoader().load('/green globe1.png')

  // Build fragments — 3 vertical segments
  const getRadius = () => {
    const isMobile = window.innerWidth <= 768
    return isMobile ? 0.9 : 1.1
  }
  
  let R = getRadius()
  const numPieces = 3

  const createFragments = () => {
    fragments.forEach(f => scene.remove(f))
    fragments = []
    fragmentTargets = []
    fragmentOrigins = []
    
    R = getRadius()
    const verticalOffset = -0.1
    const assembledPos = new THREE.Vector3(0, verticalOffset, 0)

    for (let i = 0; i < numPieces; i++) {
      const phiStart = 0
      const phiEnd = Math.PI
      const thetaStart = (i / numPieces) * Math.PI * 2
      const thetaEnd = ((i + 1) / numPieces) * Math.PI * 2

      const geo = new THREE.SphereGeometry(
        R, 32, 32,
        thetaStart, thetaEnd - thetaStart,
        phiStart, phiEnd - phiStart
      )

      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        roughness: 0.5,
        metalness: 0.2
      })

      const mesh = new THREE.Mesh(geo, mat)

      let shatteredPos, shatteredRot
      if (i === 0) {
        shatteredPos = new THREE.Vector3(-1.2, 0.4 + verticalOffset, -0.3)
        shatteredRot = new THREE.Euler(0.3, -0.4, 0.2)
      } else if (i === 1) {
        shatteredPos = new THREE.Vector3(1.2, 0.4 + verticalOffset, -0.3)
        shatteredRot = new THREE.Euler(0.3, 0.4, -0.2)
      } else {
        shatteredPos = new THREE.Vector3(0.4, -0.9 + verticalOffset, 0.3)
        shatteredRot = new THREE.Euler(-0.5, 0, 0)
      }

      mesh.position.copy(shatteredPos)
      mesh.rotation.copy(shatteredRot)

      scene.add(mesh)
      fragments.push(mesh)
      fragmentTargets.push({ pos: assembledPos, rot: new THREE.Euler(0, 0, 0) })
      fragmentOrigins.push({ pos: shatteredPos.clone(), rot: shatteredRot.clone() })
    }
  }

  createFragments()

  let autoRotY = 0

  const loop = () => {
    animationId = requestAnimationFrame(loop)

    const p = easeInOutCubic(scrollProgress)
    
    // Auto-rotation only happens when assembled (p increases)
    autoRotY = (autoRotY + 0.005 * p) % (Math.PI * 2)

    fragments.forEach((mesh, i) => {
      const origin = fragmentOrigins[i]

      // Interpolate position
      mesh.position.lerpVectors(origin.pos, fragmentTargets[i].pos, p)

      // Interpolate rotation. autoRotY now only applies when fully or partially assembled.
      mesh.rotation.x = origin.rot.x * (1 - p)
      mesh.rotation.y = origin.rot.y * (1 - p) + (autoRotY * p)
      mesh.rotation.z = origin.rot.z * (1 - p)
    })

    renderer.render(scene, camera)
  }
  loop()

  const onResize = () => {
    W = window.innerWidth
    H = window.innerHeight
    renderer.setSize(W, H)
    updateCamera()
  }
  window.addEventListener('resize', onResize)
  window.addEventListener('orientationchange', () => setTimeout(onResize, 300))
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
})
</script>
