import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const manifest=JSON.parse(readFileSync('dist/export-manifest.json','utf8'));
const keys=Object.keys(manifest);
const entryKey=keys.find(key=>manifest[key]?.isEntry && (key==='visitor.html'||key.endsWith('/visitor.html')||manifest[key].name==='visitor'));
assert.ok(entryKey,'visitor.html missing in Vite export manifest');
const seen=new Set(),files=new Set();
function collect(key){
  if(seen.has(key))return;
  seen.add(key);
  const item=manifest[key];
  assert.ok(item,'Referenced module absent: '+key);
  if(item.file)files.add(item.file);
  for(const path of [...(item.css??[]),...(item.assets??[])])files.add(path);
  for(const dep of [...(item.imports??[]),...(item.dynamicImports??[])])collect(dep);
}
collect(entryKey);
assert.ok(manifest[entryKey].file,'Visitor entry script missing');
assert.ok(files.size>=2,'Visitor must emit JS and CSS assets');
assert.ok([...files].some(file=>file.endsWith('.css')),'Visitor CSS missing');
for(const file of files)assert.ok(existsSync(join('dist',file)),'Bundled asset missing: '+file);
assert.ok(existsSync('dist/index.html'),'Editor HTML absent');
assert.ok(existsSync('dist/visitor.html'),'Visitor HTML absent');
console.log('Export visitor asset manifest validated:',entryKey,[...files].join(', '));
