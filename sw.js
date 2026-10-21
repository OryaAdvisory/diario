// Guarda a app no telemóvel para funcionar sem internet. Os registos nunca passam por aqui.
const C='diario-v10';
const FILES=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','whisper-worker.js','lib/transformers.min.js','lib/ort-wasm-simd-threaded.jsep.mjs','lib/ort-wasm-simd-threaded.jsep.wasm'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting()))});
// o motor de transcrição (transformers-cache) nunca é apagado
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('diario-')&&x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==location.origin)return; // modelo do Whisper: trata a biblioteca
  if(u.pathname.includes('/lib/')){ // biblioteca grande: fica guardada
    e.respondWith(caches.match(r,{ignoreSearch:true}).then(x=>x||fetch(r)));return;
  }
  // resto: tenta a versão nova; sem internet usa a guardada
  // o Safari não aceita reenviar um pedido de navegação com opções: pede pelo endereço
  const nav=r.mode==='navigate',key=nav?'index.html':r;
  e.respondWith(fetch(nav?u.href:r.url,{cache:'no-cache',credentials:'same-origin'}).then(res=>{if(res.ok&&res.type==='basic'){const cp=res.clone();caches.open(C).then(c=>c.put(key,cp))}return res})
    .catch(()=>caches.match(key,{ignoreSearch:true}).then(x=>x||caches.match('./'))));
});
