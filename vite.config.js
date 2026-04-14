import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 하위 경로 지원을 위해 필요 시 base 수정 (user.github.io/pr)
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
    open: true,
  },
});
