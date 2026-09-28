// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import figures from './src/lib/figures.mjs';

/**
 * Static hosts serve public/admin/index.html at /admin/, but the Astro dev
 * server doesn't. Rewrite /admin and /admin/ in dev so Decap CMS opens there too.
 * @type {import('vite').Plugin}
 */
const decapAdminDevIndex = {
  name: 'decap-admin-dev-index',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/admin' || req.url === '/admin/') req.url = '/admin/index.html';
      next();
    });
  },
};

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.emmanuel.moshood.ca',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  markdown: {
    // Sätteri is Astro 7's default Markdown processor. The figures plugin turns
    // standalone images into <figure> with optional captions (see src/lib/figures.mjs).
    processor: satteri({ hastPlugins: [figures] }),
    shikiConfig: {
      theme: 'github-light',
      wrap: false,
    },
  },
  vite: {
    plugins: [decapAdminDevIndex],
  },
});
