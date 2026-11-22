// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://bee2.dev',
  // bee2.dev のルートからビルドし、/portfolio/ と /blog/ をページのパスで分ける。
  // Render Static Site の Publish Directory は dist。/ → /portfolio/ と /onpu/* は Render のルールで処理する
});
