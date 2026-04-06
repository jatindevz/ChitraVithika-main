import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('[VITE_PROXY] Proxy error:', err.message);
            console.error('[VITE_PROXY] Request:', req.method, req.url);
            console.error('[VITE_PROXY] Target:', options.target);
            console.error('[VITE_PROXY] To fix: Ensure backend server is running on port 3000');
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[VITE_PROXY] Proxying request:', req.method, req.url, '→', options.target + req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('[VITE_PROXY] Proxy response:', proxyRes.statusCode, 'for', req.method, req.url);
          });
        },
      },
    },
  },
});
