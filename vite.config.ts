import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Fix react-bits trying to import non-existent react-native-web subpaths
      "react-native-web/dist/apis/StyleSheet/registry": "react-native-web",
      // Fix @react-native/normalize-colors default export issue
      "@react-native/normalize-colors": "@react-native/normalize-colors/index.js",
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    exclude: ["react-bits"],
    include: ["@react-native/normalize-colors"],
    esbuildOptions: {
      resolveExtensions: [".web.js", ".js", ".ts", ".tsx", ".jsx"],
    },
  },
  build: {
    // Split large vendor chunks so the browser can cache them independently
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — cached forever
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Supabase client
          "vendor-supabase": ["@supabase/supabase-js"],
          // TanStack Query
          "vendor-query": ["@tanstack/react-query"],
          // Recharts — heavy, only loaded on chart pages
          "vendor-recharts": ["recharts"],
          // Date utilities
          "vendor-date": ["date-fns"],
          // PDF / export utilities
          "vendor-pdf": ["jspdf", "html2canvas", "@react-pdf/renderer"],
          // Rich text editor
          "vendor-tiptap": ["@tiptap/react", "@tiptap/starter-kit"],
          // DnD kit
          "vendor-dnd": ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          // Stripe
          "vendor-stripe": ["@stripe/stripe-js", "@stripe/react-stripe-js"],
        },
      },
    },
    // Warn when a chunk exceeds 600kb (down from default 500kb to give more room)
    chunkSizeWarningLimit: 600,
  },
}));
