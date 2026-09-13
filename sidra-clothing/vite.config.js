import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Published several directories deep inside the demo hub.
  base: "./",
  plugins: [react()],
})
