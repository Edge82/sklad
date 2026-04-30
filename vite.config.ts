import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      vue()
    ],
    base: '/sklad/',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api-1c': {
          target: env.VITE_1C_PROXY_TARGET || 'https://msk1.1cfresh.com',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api-1c/, '')
        }
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
