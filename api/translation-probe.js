import {getVercelOidcToken} from '@vercel/oidc';
export default async function handler(req,res){
 try{
  const token=process.env.AI_GATEWAY_API_KEY||await getVercelOidcToken();
  const r=await fetch('https://ai-gateway.vercel.sh/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-4.1-mini',max_tokens:16,messages:[{role:'user',content:'Translate into English: Bonjour'}]})});
  const data=await r.json().catch(()=>({}));return res.status(200).json({gatewayStatus:r.status,code:data?.error?.code??data?.error?.type??data?.type??null,message:String(data?.error?.message??data?.message??'').slice(0,400),success:!!data?.choices?.[0]?.message?.content});
 }catch(e){return res.status(200).json({gatewayStatus:0,code:e?.name??'error',success:false});}
}
