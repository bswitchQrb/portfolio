// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://bee2.dev',
  base: '/portfolio',
  // Render Static Site の Publish Directory を dist にし、/portfolio/ 配下にそのまま配置するため
  outDir: './dist/portfolio',
});
