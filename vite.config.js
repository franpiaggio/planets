import { defineConfig } from 'vite'

export default defineConfig({
  base: '/planets/',
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
})
