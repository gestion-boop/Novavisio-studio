import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';

export default defineConfig({
  plugins:[react()],
  base:'./',
  build:{
    manifest:'export-manifest.json',
    rollupOptions:{
      input:{
        studio:resolve(process.cwd(),'index.html'),
        visitor:resolve(process.cwd(),'visitor.html')
      }
    }
  }
});
