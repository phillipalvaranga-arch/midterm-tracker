const C='mt-v22',A=['./','index.html','style.css','app.js','live.js','data/ev_baselines.json','data/ev_age.json','data/presidential.json','data/pollster_grades.json','manifest.webmanifest','icons/icon-192.png'];
const bust=u=>{const p=new URL(u,location.href).pathname;return /(?:\.(?:html|js|css|json|webmanifest)|\/)$/.test(p)};
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
 e.respondWith(fetch(e.request,bust(e.request.url)?{cache:'no-store'}:{}).then(r=>{if(r.ok){const c=r.clone();caches.open(C).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match(e.request,{ignoreSearch:true}))))});
