import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_PROXY_TARGET || 'http://127.0.0.1:8000'
  
  return {
    plugins: [
      vue()
    ],
    base: env.VITE_APP_BASE || '/sklad/',
    server: {
      host: '0.0.0.0',
      port: Number(env.VITE_PORT || 3000),
      open: true,
      proxy: {
        '/sklad/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false
        },
        '/api-1c': {
          target: env.VITE_1C_PROXY_TARGET || 'https://msk1.1cfresh.com',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api-1c/, '')
        }
      }
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      target: 'esnext',
      minify: 'esbuild'
    }
  }
})
