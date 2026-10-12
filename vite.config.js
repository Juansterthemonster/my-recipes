import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // expose on local network (0.0.0.0) so WiFi devices can reach it
    // `npm run dev` doesn't run the /api serverless functions, so forward them to
    // the deployed site (which has the R2 keys). Dev-only — never used in production builds.
    proxy: {
      '/api': {
        target: 'https://my-recipes-sigma.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
