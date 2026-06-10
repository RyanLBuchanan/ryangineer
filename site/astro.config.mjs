import { defineConfig } from 'astro/config';

// Static output — deploys exactly like the current plain-HTML site.
export default defineConfig({
  site: 'https://www.ryangineer.com',
  build: {
    format: 'file', // emit /algebra.html rather than /algebra/index.html so existing URLs keep working
  },
});
