import path from "node:path";

import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

// CSP Plugin to handle environment-specific Content Security Policy
const cspPlugin = () => ({
  name: 'csp-plugin',
  transformIndexHtml: {
    order: 'post' as const,
    handler(html: string, context: { server?: unknown; bundle?: unknown }) {
      // In build mode, bundle exists; in dev mode, server exists
      const isDev = !context.bundle;

      // More restrictive CSP for production
      const prodCSP = "default-src 'none'; script-src 'self' https://esm.sh; style-src 'self' 'unsafe-inline' https://esm.sh; font-src 'self' data: https://esm.sh; base-uri 'self'; manifest-src 'self'; connect-src 'self' blob: https: wss:; img-src 'self' data: blob: https:; media-src 'self' https:; object-src 'none'; worker-src 'self' blob:";

      // More permissive CSP for development (allows Vite HMR)
      const devCSP = "default-src 'none'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; base-uri 'self'; manifest-src 'self'; connect-src 'self' blob: https: wss:; img-src 'self' data: blob: https:; media-src 'self' https:; object-src 'none'; worker-src 'self' blob:";

      const csp = isDev ? devCSP : prodCSP;
      const comment = isDev
        ? '<!-- CSP: Development mode - allows unsafe-eval for Vite HMR -->'
        : '<!-- CSP: Production mode - secure policy without unsafe-eval -->';

      return html.replace(
        /<!-- CSP:.*?content="[^"]*"/s,
        `${comment}\n    <meta http-equiv="content-security-policy" content="${csp}"`
      );
    }
  }
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/nostrpop/",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    cspPlugin(),
  ],
  define: {
    'import.meta.env.VITE_BUILD_MODE': JSON.stringify(mode),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    onConsoleLog(log) {
      return !log.includes("React Router Future Flag Warning");
    },
    env: {
      DEBUG_PRINT_LIMIT: '0', // Suppress DOM output that exceeds AI context windows
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
