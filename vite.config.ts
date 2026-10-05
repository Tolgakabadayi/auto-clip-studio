import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';
import fs from 'fs';

// Custom plugin to copy preload.cjs and icons to dist-electron
function copyPreloadPlugin(): Plugin {
  const doCopy = () => {
    const filesToCopy = ['preload.cjs', 'icon.ico', 'icon.png'];
    for (const file of filesToCopy) {
      const src = path.resolve(__dirname, 'electron', file);
      const dest = path.resolve(__dirname, 'dist-electron', file);
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
      }
    }
    const copyDir = (srcDir: string, destDir: string) => {
      if (!fs.existsSync(srcDir)) return;
      fs.mkdirSync(destDir, { recursive: true });
      for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        const s = path.join(srcDir, entry.name);
        const d = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
          copyDir(s, d);
        } else {
          fs.copyFileSync(s, d);
        }
      }
    };
    copyDir(path.resolve(__dirname, 'electron/python'), path.resolve(__dirname, 'dist-electron/python'));
  };
  return {
    name: 'copy-preload-cjs',
    buildStart() {
      doCopy();
    },
    writeBundle() {
      doCopy();
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main-Process entry file of the Electron App.
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['fsevents', 'googleapis'],
            },
          },
          plugins: [copyPreloadPlugin()],
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
