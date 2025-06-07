import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the parent directory
  const env = loadEnv(mode, path.join(process.cwd(), '..'), '');
  
  console.log('Loaded environment variables:', {
    VITE_GOOGLE_CLIENT_ID: env.VITE_GOOGLE_CLIENT_ID,
    VITE_API_URL: env.VITE_API_URL,
    mode
  });

  return {
    envDir: path.join(process.cwd(), '..'), // Look for .env files in parent directory
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
