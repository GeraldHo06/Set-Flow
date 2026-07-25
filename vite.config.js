import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path' // 1. Import the path module

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // 2. Define the @ alias pointing to your src folder
    },
  },
  server: {
    port: 5173,
    open: true
  }
});