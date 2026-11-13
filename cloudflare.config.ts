import { defineConfig } from 'cf/config';

export default defineConfig({
  worker: {
    name: 'cissp-mindmap',
    compatibilityDate: '2026-11-10',
    observability: {
      enabled: true,
    },
    // Static site only: the Worker serves the Vite build, there is no server code.
    assets: {
      notFoundHandling: 'single-page-application',
    },
    // Creates the DNS record and certificate for this hostname on the andyq.dev zone.
    domains: ['cissp.andyq.dev'],
  },
});
