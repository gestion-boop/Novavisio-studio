import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';

export default defineConfig({
  plugins:[react()],
  // Instant réel de compilation (en UTC), affiché en heure française dans le Studio.
  define:{__NV_BUILD_TIME__:JSON.stringify(new Date().toISOString())},
  base:'./',
  // Accepte aussi les variables nommées NEXT_PUBLIC_* (convention Vercel) — uniquement des valeurs publiques.
  envPrefix:['VITE_','NEXT_PUBLIC_'],
  build:{
    manifest:'export-manifest.json',
    rollupOptions:{
      input:{
        studio:resolve(process.cwd(),'index.html'),
        visitor:resolve(process.cwd(),'visitor.html'),
        share:resolve(process.cwd(),'share.html')
      }
    }
  }
});
