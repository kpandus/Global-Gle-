import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export const useGsap = () => {
  if (process.client) {
    gsap.registerPlugin(ScrollTrigger)
  }
  return { gsap, ScrollTrigger }
}