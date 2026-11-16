/* Offline support: network first (so updates arrive when online), cache when offline or slow. */
var CACHE="haqls-ios-v1",CORE=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png","apple-touch-icon.png"];
self.addEventListener("install",function(e){
e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(CORE)}).then(function(){return self.skipWaiting()}));
});
self.addEventListener("activate",function(e){
e.waitUntil(caches.keys().then(function(keys){
return Promise.all(keys.filter(function(k){return k.indexOf("haqls-ios-")===0&&k!==CACHE}).map(function(k){return caches.delete(k)}));
}).then(function(){return self.clients.claim()}));
});
function put(req,res){
if(res&&(res.ok||res.type==="opaque")){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy)})}
return res;
}
self.addEventListener("fetch",function(e){
var req=e.request;
if(req.method!=="GET")return;
var url=new URL(req.url),own=url.origin===self.location.origin,font=/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
if(!own&&!font)return;
if(font){
/* fonts rarely change: answer from cache, refresh in the background */
e.respondWith(caches.match(req).then(function(hit){
var net=fetch(req).then(function(res){return put(req,res)})["catch"](function(){return hit});
return hit||net;
}));
return;
}
e.respondWith(new Promise(function(resolve){
var done=false;
function fromCache(){return caches.match(req,{ignoreSearch:true}).then(function(hit){return hit||(req.mode==="navigate"?caches.match("index.html"):undefined)})}
var timer=setTimeout(function(){fromCache().then(function(hit){if(hit&&!done){done=true;resolve(hit)}})},3000);
fetch(req).then(function(res){put(req,res);clearTimeout(timer);if(!done){done=true;resolve(res)}})
["catch"](function(){clearTimeout(timer);fromCache().then(function(hit){if(!done){done=true;resolve(hit||Response.error())}})});
}));
});
