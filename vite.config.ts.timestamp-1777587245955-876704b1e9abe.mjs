// vite.config.ts
import { defineConfig } from "file:///mnt/c/Users/ADMIN/vestry-hub/node_modules/vite/dist/node/index.js";
import react from "file:///mnt/c/Users/ADMIN/vestry-hub/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///mnt/c/Users/ADMIN/vestry-hub/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "/mnt/c/Users/ADMIN/vestry-hub";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      // Fix react-bits trying to import non-existent react-native-web subpaths
      "react-native-web/dist/apis/StyleSheet/registry": "react-native-web",
      // Fix @react-native/normalize-colors default export issue
      "@react-native/normalize-colors": "@react-native/normalize-colors/index.js"
    },
    dedupe: ["react", "react-dom"]
  },
  optimizeDeps: {
    exclude: ["react-bits"],
    include: ["@react-native/normalize-colors"],
    esbuildOptions: {
      resolveExtensions: [".web.js", ".js", ".ts", ".tsx", ".jsx"]
    }
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
          "vendor-stripe": ["@stripe/stripe-js", "@stripe/react-stripe-js"]
        }
      }
    },
    // Warn when a chunk exceeds 600kb (down from default 500kb to give more room)
    chunkSizeWarningLimit: 600
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvbW50L2MvVXNlcnMvQURNSU4vdmVzdHJ5LWh1YlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL21udC9jL1VzZXJzL0FETUlOL3Zlc3RyeS1odWIvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL21udC9jL1VzZXJzL0FETUlOL3Zlc3RyeS1odWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiOjpcIixcbiAgICBwb3J0OiA4MDgwLFxuICAgIGhtcjoge1xuICAgICAgb3ZlcmxheTogZmFsc2UsXG4gICAgfSxcbiAgfSxcbiAgcGx1Z2luczogW3JlYWN0KCksIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKV0uZmlsdGVyKEJvb2xlYW4pLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgICAgLy8gRml4IHJlYWN0LWJpdHMgdHJ5aW5nIHRvIGltcG9ydCBub24tZXhpc3RlbnQgcmVhY3QtbmF0aXZlLXdlYiBzdWJwYXRoc1xuICAgICAgXCJyZWFjdC1uYXRpdmUtd2ViL2Rpc3QvYXBpcy9TdHlsZVNoZWV0L3JlZ2lzdHJ5XCI6IFwicmVhY3QtbmF0aXZlLXdlYlwiLFxuICAgICAgLy8gRml4IEByZWFjdC1uYXRpdmUvbm9ybWFsaXplLWNvbG9ycyBkZWZhdWx0IGV4cG9ydCBpc3N1ZVxuICAgICAgXCJAcmVhY3QtbmF0aXZlL25vcm1hbGl6ZS1jb2xvcnNcIjogXCJAcmVhY3QtbmF0aXZlL25vcm1hbGl6ZS1jb2xvcnMvaW5kZXguanNcIixcbiAgICB9LFxuICAgIGRlZHVwZTogW1wicmVhY3RcIiwgXCJyZWFjdC1kb21cIl0sXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFtcInJlYWN0LWJpdHNcIl0sXG4gICAgaW5jbHVkZTogW1wiQHJlYWN0LW5hdGl2ZS9ub3JtYWxpemUtY29sb3JzXCJdLFxuICAgIGVzYnVpbGRPcHRpb25zOiB7XG4gICAgICByZXNvbHZlRXh0ZW5zaW9uczogW1wiLndlYi5qc1wiLCBcIi5qc1wiLCBcIi50c1wiLCBcIi50c3hcIiwgXCIuanN4XCJdLFxuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgLy8gU3BsaXQgbGFyZ2UgdmVuZG9yIGNodW5rcyBzbyB0aGUgYnJvd3NlciBjYW4gY2FjaGUgdGhlbSBpbmRlcGVuZGVudGx5XG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgIC8vIENvcmUgUmVhY3QgcnVudGltZSBcdTIwMTQgY2FjaGVkIGZvcmV2ZXJcbiAgICAgICAgICBcInZlbmRvci1yZWFjdFwiOiBbXCJyZWFjdFwiLCBcInJlYWN0LWRvbVwiLCBcInJlYWN0LXJvdXRlci1kb21cIl0sXG4gICAgICAgICAgLy8gU3VwYWJhc2UgY2xpZW50XG4gICAgICAgICAgXCJ2ZW5kb3Itc3VwYWJhc2VcIjogW1wiQHN1cGFiYXNlL3N1cGFiYXNlLWpzXCJdLFxuICAgICAgICAgIC8vIFRhblN0YWNrIFF1ZXJ5XG4gICAgICAgICAgXCJ2ZW5kb3ItcXVlcnlcIjogW1wiQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5XCJdLFxuICAgICAgICAgIC8vIFJlY2hhcnRzIFx1MjAxNCBoZWF2eSwgb25seSBsb2FkZWQgb24gY2hhcnQgcGFnZXNcbiAgICAgICAgICBcInZlbmRvci1yZWNoYXJ0c1wiOiBbXCJyZWNoYXJ0c1wiXSxcbiAgICAgICAgICAvLyBEYXRlIHV0aWxpdGllc1xuICAgICAgICAgIFwidmVuZG9yLWRhdGVcIjogW1wiZGF0ZS1mbnNcIl0sXG4gICAgICAgICAgLy8gUERGIC8gZXhwb3J0IHV0aWxpdGllc1xuICAgICAgICAgIFwidmVuZG9yLXBkZlwiOiBbXCJqc3BkZlwiLCBcImh0bWwyY2FudmFzXCIsIFwiQHJlYWN0LXBkZi9yZW5kZXJlclwiXSxcbiAgICAgICAgICAvLyBSaWNoIHRleHQgZWRpdG9yXG4gICAgICAgICAgXCJ2ZW5kb3ItdGlwdGFwXCI6IFtcIkB0aXB0YXAvcmVhY3RcIiwgXCJAdGlwdGFwL3N0YXJ0ZXIta2l0XCJdLFxuICAgICAgICAgIC8vIERuRCBraXRcbiAgICAgICAgICBcInZlbmRvci1kbmRcIjogW1wiQGRuZC1raXQvY29yZVwiLCBcIkBkbmQta2l0L3NvcnRhYmxlXCIsIFwiQGRuZC1raXQvdXRpbGl0aWVzXCJdLFxuICAgICAgICAgIC8vIFN0cmlwZVxuICAgICAgICAgIFwidmVuZG9yLXN0cmlwZVwiOiBbXCJAc3RyaXBlL3N0cmlwZS1qc1wiLCBcIkBzdHJpcGUvcmVhY3Qtc3RyaXBlLWpzXCJdLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIC8vIFdhcm4gd2hlbiBhIGNodW5rIGV4Y2VlZHMgNjAwa2IgKGRvd24gZnJvbSBkZWZhdWx0IDUwMGtiIHRvIGdpdmUgbW9yZSByb29tKVxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogNjAwLFxuICB9LFxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5USxTQUFTLG9CQUFvQjtBQUN0UyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBSGhDLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sS0FBSztBQUFBLE1BQ0gsU0FBUztBQUFBLElBQ1g7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTLENBQUMsTUFBTSxHQUFHLFNBQVMsaUJBQWlCLGdCQUFnQixDQUFDLEVBQUUsT0FBTyxPQUFPO0FBQUEsRUFDOUUsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBO0FBQUEsTUFFcEMsa0RBQWtEO0FBQUE7QUFBQSxNQUVsRCxrQ0FBa0M7QUFBQSxJQUNwQztBQUFBLElBQ0EsUUFBUSxDQUFDLFNBQVMsV0FBVztBQUFBLEVBQy9CO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsWUFBWTtBQUFBLElBQ3RCLFNBQVMsQ0FBQyxnQ0FBZ0M7QUFBQSxJQUMxQyxnQkFBZ0I7QUFBQSxNQUNkLG1CQUFtQixDQUFDLFdBQVcsT0FBTyxPQUFPLFFBQVEsTUFBTTtBQUFBLElBQzdEO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBO0FBQUEsSUFFTCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUE7QUFBQSxVQUVaLGdCQUFnQixDQUFDLFNBQVMsYUFBYSxrQkFBa0I7QUFBQTtBQUFBLFVBRXpELG1CQUFtQixDQUFDLHVCQUF1QjtBQUFBO0FBQUEsVUFFM0MsZ0JBQWdCLENBQUMsdUJBQXVCO0FBQUE7QUFBQSxVQUV4QyxtQkFBbUIsQ0FBQyxVQUFVO0FBQUE7QUFBQSxVQUU5QixlQUFlLENBQUMsVUFBVTtBQUFBO0FBQUEsVUFFMUIsY0FBYyxDQUFDLFNBQVMsZUFBZSxxQkFBcUI7QUFBQTtBQUFBLFVBRTVELGlCQUFpQixDQUFDLGlCQUFpQixxQkFBcUI7QUFBQTtBQUFBLFVBRXhELGNBQWMsQ0FBQyxpQkFBaUIscUJBQXFCLG9CQUFvQjtBQUFBO0FBQUEsVUFFekUsaUJBQWlCLENBQUMscUJBQXFCLHlCQUF5QjtBQUFBLFFBQ2xFO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBRUEsdUJBQXVCO0FBQUEsRUFDekI7QUFDRixFQUFFOyIsCiAgIm5hbWVzIjogW10KfQo=
