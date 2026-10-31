import { defineConfig } from 'vite';

export default defineConfig({
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    allowedHosts: [
      'ec2-77-114-13-16.us-east-2.compute.amazonaws.com'
    ]
  },
});
