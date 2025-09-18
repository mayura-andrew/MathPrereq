/* eslint-disable */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

const projectRoot = process.cwd();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve(projectRoot, 'node_modules/react'),
      'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(projectRoot, 'node_modules/react/jsx-runtime'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
