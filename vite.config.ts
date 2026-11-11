import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';

// Identifiant unique de chaque compilation, partagé entre le Studio et le
// fichier public de vérification. Aucun projet client n'est concerné.
const buildTime=new Date().toISOString();

export default defineConfig({
  plugins:[react(),{
    name:'novavisio-build-version',
    apply:'build' as const,
    generateBundle(){
      this.emitFile({
        type:'asset',
        fileName:'version.json',
        source:JSON.stringify({buildTime})
      });
    }
  }],
  // Le client et version.json doivent partager exactement le même identifiant.
  define:{__NV_BUILD_TIME__:JSON.stringify(buildTime)},
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
