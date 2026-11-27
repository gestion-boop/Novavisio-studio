const origin='https://novavisio-studio.vercel.app/';
const expected=process.env.GITHUB_SHA;
const paths=['version.json','export-manifest.json','index.html','share.html','visitor.html'];

async function fetchFile(path){
  const response=await fetch(new URL(path,origin),{cache:'no-store',signal:AbortSignal.timeout(15_000)});
  if(!response.ok)throw new Error(path+' responded '+response.status);
  return response;
}

async function check(){
  const [versionResponse,manifestResponse,...htmlResponses]=await Promise.all(paths.map(fetchFile));
  const [version,manifest,...pages]=await Promise.all([
    versionResponse.json(),manifestResponse.json(),...htmlResponses.map(response=>response.text()),
  ]);
  if(!Number.isFinite(Date.parse(version.buildTime)))throw new Error('Invalid production version');
  if(expected&&version.commit&&version.commit!==expected)throw new Error('Production is still serving '+version.commit);
  await Promise.all(pages.map(async(html,index)=>{
    const path=paths[index+2];
    const asset=manifest[path]?.file;
    if(!asset||!html.includes(asset))throw new Error(path+' does not use the production manifest');
    const response=await fetchFile(asset);
    if(!/javascript/.test(response.headers.get('content-type')??''))throw new Error(asset+' is not JavaScript');
    await response.body?.cancel();
  }));
  console.log('Production Studio, public share and visitor export verified ('+version.buildTime+').');
}

for(let attempt=1;attempt<=4;attempt++){
  try{await check();break;}
  catch(error){
    if(attempt===4)throw error;
    console.warn(error.message);
    await new Promise(resolve=>setTimeout(resolve,5000));
  }
}
