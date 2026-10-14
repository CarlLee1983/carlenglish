import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://carlenglish.gravito.dev',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
