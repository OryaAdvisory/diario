// Guarda a app no telemóvel para funcionar sem internet. Os registos nunca passam por aqui.
const C='diario-v7';
const FILES=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','whisper-worker.js','lib/transformers.min.js','lib/ort-wasm-simd-threaded.jsep.mjs','lib/ort-wasm-simd-threaded.jsep.wasm'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const page=e.request.mode==='navigate';
  if(page){ // a página: tenta a versão nova, sem internet usa a guardada
    e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put('index.html',c));return r}).catch(()=>caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)));
});
