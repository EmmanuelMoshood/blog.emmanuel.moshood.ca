// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';


// https://astro.build/config
export default defineConfig({
  site: 'https://blog.emmanuel.moshood.ca',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: false,
    },
  },
});
