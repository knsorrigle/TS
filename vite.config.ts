import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  assetsInclude: ['**/*.glsl'],
  server: { port: 5173 },
  // pre-bundle everything up front so a late first import never re-optimizes into a second React copy
  optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', 'react-router', 'gsap', 'gsap/ScrollTrigger', 'gsap/SplitText', 'lenis', 'ogl', 'lucide-react', '@supabase/supabase-js', 'three', '@react-three/fiber', '@react-three/drei'] },
  resolve: { dedupe: ['react', 'react-dom'] },
})
