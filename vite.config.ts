import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Đường dẫn tương đối: chạy được ở thư mục con (GitHub Pages) và trong trang Artifact.
  base: './',
  // Asset tải thủ công nằm trong assets/ (không commit); phục vụ như thư mục tĩnh.
  publicDir: 'assets',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        fontTest: resolve(__dirname, 'font-test.html'),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
