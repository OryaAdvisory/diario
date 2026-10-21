// Guarda a app no telemóvel para funcionar sem internet. Os registos nunca passam por aqui.
const C='diario-v9';
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
  e.respondWith(fetch(r,{cache:'no-cache'}).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r.mode==='navigate'?'index.html':r,cp))}return res})
    .catch(()=>caches.match(r.mode==='navigate'?'index.html':r,{ignoreSearch:true})));
});
