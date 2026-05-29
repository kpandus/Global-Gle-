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
let mixer = null
let mouse = { x: 0, y: 0 }
const interpolation = { x: 0.1, y: 0.1 }
let cleanupFns = []

function setLighting(scene) {
  const directionalLight = new THREE.DirectionalLight(0x5eead4, 0.5);
  directionalLight.position.set(-5, 5, 5);
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0x22d3ee, 5, 50);
  pointLight.position.set(0, 15, 10);
  scene.add(pointLight);
  
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);
}

onMounted(async () => {
  if (!canvasDiv.value) return
  
  const rect = canvasDiv.value.getBoundingClientRect()
  const w = rect.width || window.innerWidth
  const h = rect.height || window.innerHeight

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.domElement.style.position = 'absolute'
  renderer.domElement.style.inset = '0'
  canvasDiv.value.appendChild(renderer.domElement)

  camera = new THREE.PerspectiveCamera(12, w / h, 0.1, 1000)
  camera.position.set(0, 12, 30)
  camera.lookAt(0, 13, 0)

  setLighting(scene)

  const gltfLoader = new GLTFLoader()
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('/draco/')
  gltfLoader.setDRACOLoader(dracoLoader)

  try {
    const decrypted = await decryptFile('/models/character.enc', 'MyCharacter12');
    const blobUrl = URL.createObjectURL(new Blob([decrypted]));

    const gltf = await new Promise((resolve, reject) => {
      gltfLoader.load(blobUrl, resolve, undefined, reject)
    })

    const character = gltf.scene
    
    // Hide props
    const props = ['Plane004', 'screenlight', 'monitor', 'keyboard', 'laptop', 'desk', 'chair', 'hands']
    props.forEach(name => {
      const obj = character.getObjectByName(name)
      if (obj) obj.visible = false
    })

    character.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    scene.add(character)
    
    // Bones for interaction
    const spineHead = character.getObjectByName('spine006') || character.getObjectByName('head')
    
    // Manual downward pose for arms (override default T-pose)
    const armL = character.getObjectByName('upper_armL')
    const armR = character.getObjectByName('upper_armR')
    if (armL) armL.rotation.set(-1.5, 0, 0)
    if (armR) armR.rotation.set(-1.5, 0, 0)

    // Animations
    mixer = new THREE.AnimationMixer(character)
    const blink = gltf.animations.find(a => a.name === 'Blink')
    if (blink) mixer.clipAction(blink).play()

    const idleNames = ['key1', 'key2', 'key5']
    idleNames.forEach(name => {
      const clip = gltf.animations.find(a => a.name === name)
      if (clip) {
        const action = mixer.clipAction(clip)
        action.play()
        action.timeScale = 0.5
      }
    })

    // Mouse listener
    const move = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', move)
    cleanupFns.push(() => window.removeEventListener('mousemove', move))

    const clock = new THREE.Clock()
    const loop = () => {
      animationId = requestAnimationFrame(loop)
      const delta = clock.getDelta()
      if (mixer) mixer.update(delta)

      if (spineHead) {
        spineHead.rotation.x = THREE.MathUtils.lerp(spineHead.rotation.x, mouse.y * 0.3, 0.1)
        spineHead.rotation.y = THREE.MathUtils.lerp(spineHead.rotation.y, mouse.x * 0.3, 0.1)
      }

      renderer.render(scene, camera)
    }
    loop()

    URL.revokeObjectURL(blobUrl)
    dracoLoader.dispose()
  } catch (err) {
    console.error('Scene load error:', err)
  }
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  cleanupFns.forEach(f => f())
  if (renderer) renderer.dispose()
})
</script>

<style scoped>
.character-container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.character-model { position: relative; width: 100%; height: 100%; overflow: hidden; }
.character-rim {
  position: absolute;
  width: 400px; height: 400px;
  background-color: #22d3ee;
  filter: blur(50px);
  border-radius: 50%;
  top: 50%; left: 50%;
  transform: translate(-50%, -40%) scale(1.4);
  opacity: 0.6;
  pointer-events: none;
}
</style>