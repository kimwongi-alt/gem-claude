import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' : GitHub Pages 같은 하위 경로에서도 빌드 결과가 동작하도록 상대 경로 사용
export default defineConfig({
  base: './',
  plugins: [react()],
});
