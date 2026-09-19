import {makeRoadLayer,nearestRoad} from './access-map.js';
import {buildPlaceIndex,searchPlaces,snapPlace} from './access-places.js';

const DATA=new URL('../data/accessibility/',import.meta.url),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const minutes=s=>(s/60).toFixed(1),miles=m=>(m/1609.344).toFixed(1);

const help=`<div class="dialog-header"><span class="eyebrow">EXPERIMENT 03 / A WAY THROUGH?</span><button data-access-close class="close-dialog" aria-label="Close accessibility guide">×</button></div><h2>Two points. One changing flood.</h2><ol><li><strong>Choose your trip.</strong> Pick A and B on the map, choose from the same ten landmarks in either menu, or open Search address or place. Try “Costco,” “school,” “I-10,” or a full street address. Select a search result to place the marker. The label shows the road point used; drag it to refine your trip. Ready-made trips are also available.</li><li><strong>Play the flood.</strong> Every step is a saved 4-hour snapshot, from hour 0 to 72. Blue shows flooding over the ground; red road pieces reach at least 6 inches. Bridges are assumed flood-proof. Amber roads have an unverified tunnel or road height. The default calculation assumes those roads are available; Conservative check excludes them.</li><li><strong>Watch the connection.</strong> A mint line is the fastest remaining route. When no route exists, the line disappears and teal roads show where you can still get from A.</li><li><strong>Read the time chart.</strong> Detours can add minutes. Gaps mean no route, not a zero-minute trip. A returning line shows reconnection as water recedes.</li><li><strong>Check a highway.</strong> Use Road check, then click a road. See the water depth and whether the road is open or closed. A bridge can remain open while nearby roads flood.</li></ol><div class="access-note">Roads reopen as soon as the sampled depth falls below 6 inches. This experiment models flood-related access, without the repair delays from the road-damage experiment.</div><button class="primary-button" data-access-close>Choose a trip ↗</button>`;

const pointControls=key=>`<div class="access-point" data-point="${key}"><button id="access-pick-${key}" aria-pressed="${key==='a'}"><b>${key.toUpperCase()}</b><span>${key==='a'?'Set start on map':'Set destination on map'}</span></button><p id="access-${key}-label">${key==='a'?'Click a road or choose a location below':'Choose where to go'}</p><div class="access-place-controls"><label for="access-preset-${key}">Example location for ${key.toUpperCase()}</label><select id="access-preset-${key}" disabled><option value="" disabled>Choose a landmark…</option></select><small id="access-${key}-info" class="access-place-info" hidden></small><small id="access-${key}-note" class="access-place-note" hidden></small><details id="access-search-details-${key}" class="access-place-search"><summary>Search address or place</summary><form id="access-search-form-${key}"><label class="sr-only" for="access-search-${key}">Address or place for ${key.toUpperCase()}</label><div class="access-search-line"><input id="access-search-${key}" type="search" autocomplete="off" spellcheck="false" maxlength="180" placeholder="Address, Costco, school, I-10…" disabled><button id="access-search-button-${key}" type="submit" aria-label="Search locations for ${key.toUpperCase()}" disabled>Find</button></div></form><p id="access-search-status-${key}" class="access-search-status" role="status">Search the Lafayette study area. Choose a result to set ${key.toUpperCase()}.</p><div id="access-search-results-${key}" class="access-search-results" aria-label="Location results for ${key.toUpperCase()}"></div></details></div></div>`;

export class AccessibilityLab{

 constructor(host){

  this.host=host;this.frame=0;this.strict=false;this.pick='a';this.id=0;this.expanded=false;this.visible=true;this.markers={};this.searchState={a:{version:0},b:{version:0}};this.$=id=>host.querySelector('#'+id);

  host.innerHTML=`<div class="access-workspace" id="access-workspace"><div class="access-toolbar"><div><span class="eyebrow">LAFAYETTE AREA / 500-YEAR SCENARIO</span><span class="access-data-tag">Fine road terrain · 20 m flood grid</span></div><div><button id="access-guide-open">How to use ↗</button><button id="access-inspect" aria-pressed="false">Road check</button><button id="access-fit">Fit trip</button><button id="access-details-toggle" aria-expanded="false">Trip details</button><button id="access-expand" aria-label="Expand accessibility experiment">⛶</button></div></div>

   <div class="access-map-shell"><div id="access-map" aria-label="Lafayette road accessibility map"></div><div class="access-map-top"><span class="access-clock">HOUR <strong id="access-hour">00</strong><small>/ 72</small></span><span id="access-map-message">Choose two points on the roads.</span></div><div class="access-connection-card" id="access-connection-card" hidden aria-live="polite"><span id="access-card-label"></span><strong id="access-card-title"></strong><p id="access-card-detail"></p><small id="access-card-return"></small></div><div id="access-map-loading" role="status"><span class="access-spinner"></span><strong>Connecting the streets…</strong><span>Loading the local road graph and flood snapshots.</span></div><div class="access-legend"><span><i class="access-key-water"></i>Ground flooding</span><span><i class="access-key-closed"></i>Closed ≥6 in</span><span><i class="access-key-route"></i>Modeled route</span><span><i class="access-key-unknown"></i>Height unverified</span><span><i class="access-key-bridge"></i>Bridge · assumed high</span><span id="access-reach-key" hidden><i class="access-key-reach"></i>Reachable from A</span></div></div>

   <aside class="access-sidebar"><button id="access-details-close">Close details ×</button><div class="access-sidebar-head"><span class="eyebrow">01 / CHOOSE YOUR TRIP</span><button id="access-clear">Clear</button></div>${['a','b'].map(key=>pointControls(key)).join('')}<button id="access-swap" class="access-link">⇅ Reverse this trip</button><details class="access-street-search"><summary>Choose a street by name</summary><label for="access-street">Street in the downloaded network</label><input id="access-street" list="access-street-list" placeholder="Start typing a street name…"><datalist id="access-street-list"></datalist><div><button id="access-street-a">Use for A</button><button id="access-street-b">Use for B</button></div><small>Places the point on that street; drag to refine it.</small></details><label class="access-example-label" for="access-example">Ready-made trips</label><select id="access-example"><option value="">Choose a complete trip…</option></select>

   <div class="access-result" id="access-result" data-state="waiting" aria-live="polite"><span id="access-state-kicker">02 / CHECK THE CONNECTION</span><h2 id="access-state-title">Where are we going?</h2><p id="access-state-detail">Set A and B to find a route at every saved hour.</p><div class="access-route-metrics"><div><span>Estimated travel</span><strong id="access-minutes">—</strong></div><div><span>Extra vs. no flood</span><strong id="access-extra">—</strong></div></div><p id="access-distance" class="access-small">Free-flow estimate · no traffic or signals</p></div>

   <div class="access-outages"><span class="eyebrow">CONNECTION OVER THE EVENT</span><div id="access-outage-summary">Your trip’s connection windows will appear here.</div></div><div id="access-route-quality" class="access-quality" hidden></div>

   <details class="access-map-options"><summary>Map layers & uncertainty</summary><label><input type="checkbox" id="access-water" checked> Show floodwater</label><label><input type="checkbox" id="access-roads" checked> Show road status</label><label><input type="checkbox" id="access-reference" checked> Show no-flood reference route</label><label><input type="checkbox" id="access-strict"> Conservative check: exclude uncertain roads</label><p>Bridges: assumed flood-proof in both modes. Default: unreported flood cells assumed dry; amber roads assumed available. A route using an unverified road height is labeled a possible connection. Blue under a bridge is ground flooding, not measured deck depth.</p><label for="access-basemap">Background</label><select id="access-basemap"><option value="street">Street map · online</option><option value="local">Local roads · no tile service</option></select></details><p class="access-navigation-note">Classroom route estimates, not live navigation.</p></aside>

   <section class="access-timeline" aria-label="Flood and travel-time timeline"><div class="access-timeline-heading"><div><span class="eyebrow">03 / WATCH ACCESS CHANGE</span><h3>Estimated travel time <span>gaps = no route</span></h3></div><div class="access-play-tools"><button id="access-prev" aria-label="Previous flood snapshot">‹</button><button id="access-play" class="primary-button" disabled>▶ Play flood</button><button id="access-next" aria-label="Next flood snapshot">›</button><label for="access-speed" class="sr-only">Playback speed</label><select id="access-speed"><option value="1600">Normal</option><option value="800">Fast</option><option value="2600">Slow</option></select></div></div><div class="access-chart-wrap"><svg id="access-chart" role="img" aria-label="Estimated travel time at each saved flood snapshot"></svg><div id="access-chart-empty">Choose a trip to trace its changing travel time.</div></div><div id="access-time-buttons" class="access-time-buttons" role="group" aria-label="Saved flood snapshots">${Array.from({length:19},(_,i)=>`<button data-access-frame="${i}" aria-label="Show hour ${i*4}" aria-pressed="${i===0}"><span>${i*4}</span></button>`).join('')}</div><div class="access-time-foot"><span>Elapsed hours · one saved frame every 4 h</span><span id="access-progress">Roads reopen below 6 in; repairs are not modeled here.</span></div></section>

   <dialog id="access-guide">${help}</dialog></div><div class="sr-only" id="access-announcement" role="status"></div>`;

  this.bind();this.ready=this.load();

 }

 bind(){const $=this.$;
  for(const key of ['a','b']){
   $('access-preset-'+key).onchange=e=>{const place=this.places?.find(p=>p.id===e.target.value);if(place)this.choosePlace(key,place);};
   $('access-search-form-'+key).onsubmit=e=>{e.preventDefault();this.searchPlace(key);};
   $('access-search-'+key).oninput=()=>{const state=this.searchState[key];state.version++;clearTimeout(state.timer);$('access-search-results-'+key).replaceChildren();state.timer=setTimeout(()=>this.searchPlace(key),220);};
   $('access-search-'+key).onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();this.resetSearch(key);$('access-search-details-'+key).open=false;}};
   $('access-search-details-'+key).ontoggle=e=>{if(!e.target.open)this.resetSearch(key);};
  }

  $('access-pick-a').onclick=()=>this.setPick('a');$('access-pick-b').onclick=()=>this.setPick('b');$('access-clear').onclick=()=>this.clear();$('access-swap').onclick=()=>{if(!this.a||!this.b)return;[this.a,this.b]=[this.b,this.a];this.placeMarker('a');this.placeMarker('b');$('access-example').value='';this.analyze();};

  $('access-street-a').onclick=()=>this.streetPoint('a');$('access-street-b').onclick=()=>this.streetPoint('b');$('access-example').onchange=e=>{if(e.target.value!=='')this.example(+e.target.value);};

  $('access-play').onclick=()=>this.playing?this.stop():this.play();$('access-prev').onclick=()=>{this.stop();this.setFrame(Math.max(0,this.frame-1));};$('access-next').onclick=()=>{this.stop();this.setFrame(Math.min(18,this.frame+1));};

  $('access-speed').onchange=()=>{if(this.playing){this.stop();this.play();}};this.host.querySelectorAll('[data-access-frame]').forEach(b=>b.onclick=()=>{this.stop();this.setFrame(+b.dataset.accessFrame);});

  $('access-water').onchange=()=>{if(this.floodLayer)this.floodLayer.setOpacity($('access-water').checked?1:0);};$('access-roads').onchange=()=>this.roadLayer?.redraw();$('access-reference').onchange=()=>this.drawRoutes();

  $('access-strict').onchange=()=>{this.strict=$('access-strict').checked;this.analyze();this.roadLayer?.redraw();};$('access-basemap').onchange=()=>{if(!this.map)return;if($('access-basemap').value==='street')this.tiles.addTo(this.map);else this.tiles.remove();};

  $('access-guide-open').onclick=()=>{this.stop();$('access-guide').showModal();};this.host.querySelectorAll('[data-access-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());

  $('access-inspect').onclick=()=>{this.setPick(null);this.details(false);this.announce('Click a road to see its water depth and open/closed status.');};$('access-fit').onclick=()=>this.fit();$('access-details-toggle').onclick=()=>this.details(!$('access-workspace').classList.contains('access-info-open'));$('access-details-close').onclick=()=>this.details(false);$('access-expand').onclick=()=>this.expand(!this.expanded);

  document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement===$('access-workspace'))this.native=true;else if(this.native){this.native=false;this.applyExpanded(false);}});

  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.expanded&&!this.host.querySelector('dialog[open]'))this.expand(false);});

 }

 async load(){

  try{

   const get=async file=>{const r=await fetch(new URL(file,DATA),{cache:'no-cache'});if(!r.ok)throw Error('Could not load '+file);return r;};

   const binary=async file=>{if('DecompressionStream' in window){const r=await get(file+'.gz'),packed=await r.arrayBuffer(),magic=new Uint8Array(packed,0,Math.min(2,packed.byteLength));return magic[0]===31&&magic[1]===139?new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():packed;}return (await get(file)).arrayBuffer();};

   const [manifest,names,examples,nodes,edges,depth,travel,places]=await Promise.all([(await get('manifest.json')).json(),(await get('names.json')).json(),(await get('examples.json')).json(),binary('nodes.f64'),binary('edges.u32'),binary('depth-mm.u16'),binary('travel-seconds.f32'),(await get('places.json')).json()]);

   Object.assign(this,{manifest,names,examples,places,nodes:new Float64Array(nodes),edges:new Uint32Array(edges),depth:new Uint16Array(depth)});

   this.world=new Float64Array(this.nodes.length);for(let i=0;i<this.nodes.length;i+=2){const lat=this.nodes[i+1]*Math.PI/180;this.world[i]=(this.nodes[i]+180)/360;this.world[i+1]=(1-Math.log(Math.tan(lat)+1/Math.cos(lat))/Math.PI)/2;}

   if(!window.L)throw Error('The map library did not load.');this.initMap();

   this.worker=new Worker(new URL('./access-worker.js',import.meta.url),{type:'module'});this.worker.onmessage=e=>this.receive(e.data);this.worker.onerror=()=>this.error('Route calculations could not start. Reload the page to try again.');

   this.worker.postMessage({type:'init',nodeCount:manifest.nodeCount,edges:this.edges,travel:new Float32Array(travel)});

   this.nameEdge=new Map();for(let i=0;i<this.edges.length/10;i++){const name=this.names[this.edges[i*10+4]];if(!this.nameEdge.has(name))this.nameEdge.set(name,i);}

   for(const name of [...this.nameEdge.keys()].sort()){const o=document.createElement('option');o.value=name;this.$('access-street-list').append(o);}

   examples.forEach((ex,i)=>{const o=document.createElement('option');o.value=i;o.textContent=ex.title;this.$('access-example').append(o);});

   this.placeIndex=buildPlaceIndex(places);
   for(const key of ['a','b']){
    const select=this.$('access-preset-'+key);
    for(const place of places){const o=document.createElement('option');o.value=place.id;o.textContent=place.name+' · '+place.kind;select.append(o);}
    select.disabled=false;this.$('access-search-'+key).disabled=false;this.$('access-search-button-'+key).disabled=false;
   }
   this.$('access-map-loading').hidden=true;this.setFrame(0);this.$('access-play').disabled=false;

  }catch(error){this.error(error.message);}

 }

 error(message){this.$('access-map-loading').hidden=false;this.$('access-map-loading').innerHTML='<strong>Could not finish loading.</strong><span>'+esc(message)+'</span><span>The site must be served over HTTP, including on GitHub Pages.</span>';}

 initMap(){const L=window.L;

  this.map=L.map(this.$('access-map'),{preferCanvas:true,zoomControl:false,minZoom:10,maxZoom:18}).setView(this.manifest.center,12);

  L.control.zoom({position:'bottomleft'}).addTo(this.map);L.control.scale({position:'bottomleft',imperial:true,metric:false}).addTo(this.map);

  this.tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).addTo(this.map);

  this.map.attributionControl.addAttribution('Roads © OSM · terrain USGS · flood supplied by user');

  let errors=0;this.tiles.on('tileerror',()=>{if(++errors===4)this.announce('Street background unavailable. The local roads, flood layers and routing still work.');});

  this.map.createPane('accessFlood');this.map.getPane('accessFlood').style.zIndex=350;this.map.getPane('accessFlood').style.pointerEvents='none';

  this.map.createPane('accessRoutes');this.map.getPane('accessRoutes').style.zIndex=450;

  L.polygon(this.manifest.studyPolygon,{color:'#6c7883',weight:1,dashArray:'6 5',fill:false,interactive:false}).addTo(this.map);

  this.roadLayer=makeRoadLayer(L,this).addTo(this.map);

  this.map.on('click',e=>{const point=nearestRoad(this.nodes,this.edges,e.latlng.lng,e.latlng.lat);if(!point){this.announce('Choose a point within 350 m of a road in the outlined study area.');return;}if(this.pick){const key=this.pick;this[key]=point;this.placeMarker(key);this.setPick(key==='a'&&!this.b?'b':null);this.analyze();}else this.inspect(point);});

  new ResizeObserver(()=>{this.map.invalidateSize();this.chart();}).observe(this.$('access-map'));

 }

 setPick(key,{keepDetails=false}={}){this.pick=key;this.$('access-inspect').setAttribute('aria-pressed',key===null);if(key&&!keepDetails&&this.expanded&&matchMedia('(max-width:900px)').matches)this.details(false);for(const k of ['a','b'])this.$('access-pick-'+k).setAttribute('aria-pressed',key===k);this.map?.getContainer().classList.toggle('access-picking',!!key);if(key)this.$('access-map-message').textContent='Click a road to set '+key.toUpperCase()+'.';}

 placeMarker(key){const p=this[key],L=window.L,label=key.toUpperCase();p.name=this.names[this.edges[p.edge*10+4]];this.$('access-'+key+'-label').textContent=p.placeName||p.name;
  this.$('access-preset-'+key).value=p.placeId||'';
  const info=this.$('access-'+key+'-info'),note=this.$('access-'+key+'-note');
  info.hidden=!p.placeName;info.textContent=p.placeName?(p.address+' · Road point on '+p.name+' · '+Math.round(p.snapMeters||0)+' m from location. Drag marker to refine.') : '';
  note.hidden=!p.placeNote;note.textContent=p.placeNote||'';this.resetSearch(key);this.$('access-search-details-'+key).open=false;
  this.$('access-example').value='';

  this.markers[key]?.remove();this.markers[key]=L.marker([p.lat,p.lon],{draggable:true,keyboard:true,title:label+': '+(p.placeName||p.name),alt:label+': '+(p.placeName||p.name),icon:L.divIcon({className:'access-pin access-pin-'+key,html:'<span>'+label+'</span>',iconSize:[32,38],iconAnchor:[16,35]})}).addTo(this.map);

  this.markers[key].on('dragend',e=>{const ll=e.target.getLatLng(),snap=nearestRoad(this.nodes,this.edges,ll.lng,ll.lat);if(snap){this[key]=snap;this.placeMarker(key);this.analyze();}else{e.target.setLatLng([p.lat,p.lon]);this.announce('That point is too far from the downloaded road network.');}});

 }

 resetSearch(key){const state=this.searchState[key];state.version++;clearTimeout(state.timer);this.$('access-search-'+key).value='';this.$('access-search-results-'+key).replaceChildren();this.$('access-search-status-'+key).textContent='Search the Lafayette study area. Choose a result to set '+key.toUpperCase()+'.';}

 async loadAddresses(){
  if(this.addressesReady)return;
  if(!this.addressPromise)this.addressPromise=(async()=>{
   let response;
   if('DecompressionStream' in window){
    const r=await fetch(new URL('addresses.json.gz',DATA));if(!r.ok)throw Error('Address index unavailable');
    const packed=await r.arrayBuffer(),magic=new Uint8Array(packed,0,Math.min(2,packed.byteLength));
    response=magic[0]===31&&magic[1]===139?new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))):new Response(packed);
   }else{response=await fetch(new URL('addresses.json',DATA));if(!response.ok)throw Error('Address index unavailable');}
   this.placeIndex=buildPlaceIndex(this.places,await response.json());this.addressesReady=true;
  })().catch(error=>{this.addressPromise=null;throw error;});
  return this.addressPromise;
 }

 async searchPlace(key){
  const state=this.searchState[key],version=++state.version,query=this.$('access-search-'+key).value.trim(),status=this.$('access-search-status-'+key),box=this.$('access-search-results-'+key);
  clearTimeout(state.timer);box.replaceChildren();
  if(query.length<2){status.textContent='Type at least two characters: a place name or street address.';return;}
  status.textContent=this.addressesReady?'Searching local addresses…':'Loading the local address index (1.8 MB, once)…';
  let partial=false;try{await this.loadAddresses();}catch{partial=true;}
  if(version!==state.version)return;
  const results=searchPlaces(this.placeIndex,query);
  status.textContent=(partial?'Address index unavailable; showing matching landmarks only. ': '')+(results.length?(results.length===8?'Showing up to 8 matches. ':'')+'Choose a result to set '+key.toUpperCase()+'.':'No match in this local index. Try a full street address, another name, or choose on the map.');
  for(const place of results){
   const b=document.createElement('button');b.type='button';b.innerHTML='<strong>'+esc(place.name||place.address)+'</strong><span>'+esc((place.name?place.address+' · ':'')+place.city+(place.zip?' '+place.zip:''))+'</span>'+(place.kind?'<small>'+esc(place.kind)+'</small>':'');
   b.onclick=()=>this.choosePlace(key,place);box.append(b);
  }
 }

 choosePlace(key,place){
  if(!this.map)return;
  const point=snapPlace(this.nodes,this.edges,this.names,place,this.manifest.studyPolygon);
  if(!point){this.$('access-search-status-'+key).textContent='No suitable road within 350 m of this address. Choose its access road on the map instead.';this.announce('That location is too far from the included drivable roads. Your existing point has been kept.');return;}
  this[key]={...point,placeId:place.id||'',placeName:place.name||place.address,address:place.address,placeNote:place.note||''};
  this.placeMarker(key);this.setPick(!this.a?'a':!this.b?'b':null,{keepDetails:true});
  if(this.a&&this.b)this.fit();else this.map.setView([point.lat,point.lon],14);
  this.announce(key.toUpperCase()+': '+(place.name||place.address)+' selected.');this.analyze();
 }

 streetPoint(key){const name=this.$('access-street').value,edge=this.nameEdge?.get(name);if(edge===undefined){this.announce('Choose a street name from the suggestions.');return;}const j=edge*10,u=this.edges[j]*2,v=this.edges[j+1]*2;this[key]={edge,t:.5,lon:(this.nodes[u]+this.nodes[v])/2,lat:(this.nodes[u+1]+this.nodes[v+1])/2};this.placeMarker(key);this.setPick(!this.a?'a':!this.b?'b':null);this.map.setView([this[key].lat,this[key].lon],14);this.analyze();}

 example(index){if(!this.map)return;const ex=this.examples[index];this.a={...ex.a};this.b={...ex.b};this.results=this.baseline=null;this.setPick(null);this.placeMarker('a');this.placeMarker('b');this.setFrame(0);this.fit();this.analyze();this.$('access-example').value=String(index);}

 clear(){for(const key of ['a','b']){this.resetSearch(key);this.$('access-preset-'+key).value='';this.$('access-'+key+'-info').hidden=true;this.$('access-'+key+'-note').hidden=true;this.$('access-search-details-'+key).open=false;}this.stop();this.id++;this.a=this.b=null;this.results=this.baseline=null;this.reachable=null;Object.values(this.markers).forEach(m=>m.remove());this.markers={};this.$('access-a-label').textContent='Click a road on the map';this.$('access-b-label').textContent='Then choose where to go';this.$('access-example').value='';this.setPick('a');this.$('access-outage-summary').textContent='Your trip’s connection windows will appear here.';this.$('access-progress').textContent='Roads reopen below 6 in; repairs are not modeled here.';this.render();}

 analyze(){if(!this.a||!this.b||!this.workerReady)return;this.stop();this.id++;this.results=this.baseline=null;this.reachable=null;this.$('access-progress').textContent='Checking all 19 flood snapshots…';this.$('access-outage-summary').textContent='Checking when the route disappears and returns…';this.render();this.$('access-state-title').textContent='Tracing your trip…';this.$('access-state-detail').textContent='Finding the fastest route at each saved water level.';this.worker.postMessage({type:'analyze',id:this.id,a:this.a,b:this.b,strict:this.strict,hours:this.manifest.hours});}

 receive(data){

  if(data.type==='ready'){this.workerReady=true;this.analyze();return;}if(data.id!==this.id)return;

  if(data.type==='progress'){this.$('access-progress').textContent=`Checking snapshot ${data.done} / ${data.total}…`;return;}

  if(data.type==='result'){Object.assign(this,{baseline:data.baseline,results:data.results,outages:data.outages});this.$('access-progress').textContent='Fixed-snapshot routes · no traffic or repair delays';this.renderOutages();this.render();this.requestReach();this.$('access-announcement').textContent='Trip checked at all 19 saved hours.';}

  if(data.type==='reach'&&data.frame===this.frame){this.reachable=data.reachable;this.roadLayer.redraw();this.$('access-reach-key').hidden=!data.reachable.some(Boolean);}

  if(data.type==='error'){this.$('access-state-title').textContent='Route calculation failed';this.$('access-state-detail').textContent=data.message;}

 }

 setFrame(frame){this.map?.closePopup();this.frame=frame;this.reachable=null;this.$('access-hour').textContent=String(frame*4).padStart(2,'0');this.showWater();this.render();this.requestReach();}

 showWater(){if(!this.map)return;const frame=this.frame,url=new URL(`flood/hour-${String(frame*4).padStart(2,'0')}.png`,DATA).href;

  this.floodLayer?.remove();const layer=window.L.imageOverlay(url,this.manifest.bounds,{pane:'accessFlood',opacity:this.$('access-water').checked?1:0,interactive:false});this.floodLayer=layer;layer.addTo(this.map);layer.on('error',()=>{if(this.frame===frame)this.announce('Flood image unavailable for this hour. Road calculations still use the saved depth data.');});

 }

 requestReach(){if(this.results&&!this.results[this.frame].connected)this.worker.postMessage({type:'reach',id:this.id,a:this.a,b:this.b,frame:this.frame,strict:this.strict});}

 render(){

  const $=this.$,r=this.results?.[this.frame],base=this.baseline;this.roadLayer?.redraw();this.drawRoutes();this.chart();$('access-reach-key').hidden=!this.reachable;$('access-route-quality').hidden=true;$('access-connection-card').hidden=!r;

  this.host.querySelectorAll('[data-access-frame]').forEach(b=>{const i=+b.dataset.accessFrame,result=this.results?.[i];b.setAttribute('aria-pressed',i===this.frame);b.dataset.state=result?(result.connected?'connected':'cutoff'):'waiting';b.title=`Hour ${i*4}: `+(result?(result.connected?minutes(result.seconds)+' min':'no modeled route'):'choose a trip');b.setAttribute('aria-label',b.title);});

  if(!r){$('access-state-kicker').textContent='02 / CHECK THE CONNECTION';$('access-result').dataset.state='waiting';$('access-state-title').textContent='Where are we going?';$('access-state-detail').textContent='Set A and B to find a route at every saved hour.';$('access-minutes').textContent='—';$('access-extra').textContent='—';$('access-distance').textContent='Free-flow estimate · no traffic or signals';return;}

  const unverified=r.connected&&(r.structures||r.elevationMissing),delta=r.connected&&base.connected?r.seconds-base.seconds:0,detour=delta>30,aWet=!!(this.edges[this.a.edge*10+7]&(1<<this.frame)),bWet=!!(this.edges[this.b.edge*10+7]&(1<<this.frame));

  $('access-result').dataset.state=r.connected?(detour?'detour':'connected'):'cutoff';$('access-connection-card').dataset.state=r.connected?(unverified?'uncertain':'connected'):'cutoff';$('access-card-label').textContent='HOUR '+this.frame*4+' · '+(r.connected?(unverified?'POSSIBLE A → B':'A → B'):'A × B');$('access-card-title').textContent=r.connected?minutes(r.seconds)+' min':'No route';$('access-card-detail').textContent=r.connected?'+'+minutes(Math.max(0,delta))+' min vs. no flood · '+miles(r.meters)+' miles':r.originBlocked?(aWet?'Floodwater blocks the road at A.':'The conservative check rules out the road at A.'):r.destinationBlocked?(bWet?'Floodwater blocks the road at B.':'The conservative check rules out the road at B.'):'These points cannot connect in this snapshot.';const outage=this.outages?.find(w=>this.frame>=w.startIndex&&this.frame<=w.endIndex);$('access-card-return').textContent=!r.connected&&base.connected&&outage?(outage.returnBy===null?'Still disconnected at hour 72':'Connection returns between '+outage.returnAfter+'–'+outage.returnBy+' h'):r.connected?(unverified?'Assumes unverified road heights are passable':'Estimated free-flow travel time'):'No route in the mapped reference network.';$('access-state-kicker').textContent='HOUR '+this.frame*4+' / '+(r.connected?(unverified?'POSSIBLE A → B':'A → B'):'A × B');

  $('access-state-title').textContent=r.connected?(unverified?'A possible connection.':detour?'A way through. A longer trip.':'You’re connected.'):'No route at this hour.';

  $('access-state-detail').textContent=r.connected?(unverified?'This route assumes the amber tunnel or unverified road sections are passable. Their road heights are not measured here. Try Conservative check to compare.':'The mint line is the fastest available route under this snapshot’s assumptions.'):!base.connected?'These points are disconnected even in the no-flood reference network. A route outside the mapped area may exist.':r.originBlocked?(aWet?'The road at A reaches the 6-inch closure threshold. There is no modeled way out from this starting point.':'Uncertain data rule out the road at A under the conservative setting. Try the default setting to compare.'):r.destinationBlocked?(bWet?'The road at B reaches the 6-inch closure threshold. This destination cannot be reached at this saved hour.':'Uncertain data rule out the road at B under the conservative setting. Try the default setting to compare.'):'A and B are in separate reachable parts of the network. Teal roads show how far you can still get from A.';

  $('access-minutes').textContent=r.connected?minutes(r.seconds)+' min':'Unavailable';$('access-extra').textContent=r.connected?'+'+minutes(Math.max(0,delta))+' min':'No connection';

  $('access-distance').textContent=r.connected?miles(r.meters)+' miles · no-flood reference '+(base.connected?minutes(base.seconds)+' min':'unavailable')+' · free-flow estimate':'A chart gap means no route—not a zero-minute journey.';

  $('access-map-message').textContent=r.connected?(unverified?'Possible route · road heights unverified':detour?'Detour available':'A and B can connect'):'A and B cannot connect at hour '+this.frame*4;

  if(r.connected){const flags=[];if(r.unreported)flags.push('unreported flood cells assumed dry');if(r.elevationMissing)flags.push('missing road elevations assumed passable');if(r.bridges)flags.push('bridge decks assumed above all flood levels');if(r.structures)flags.push('unverified tunnels assumed passable');if(r.conditional)flags.push('conditional access tags');if(flags.length){$('access-route-quality').hidden=false;$('access-route-quality').textContent='This route relies on '+flags.join('; ')+'.';}}

 }

 pathPoints(result){if(!result?.connected)return [];return [[this.a.lat,this.a.lon],...result.nodes.map(n=>[this.nodes[n*2+1],this.nodes[n*2]]),[this.b.lat,this.b.lon]];}

 drawRoutes(){if(!this.map)return;this.referenceLine?.remove();this.routeBorder?.remove();this.routeLine?.remove();const L=window.L;

  if(this.baseline?.connected&&this.$('access-reference').checked)this.referenceLine=L.polyline(this.pathPoints(this.baseline),{pane:'accessRoutes',color:'#52597a',weight:3,dashArray:'6 6',opacity:.6,interactive:false}).addTo(this.map);

  const r=this.results?.[this.frame];if(r?.connected){const points=this.pathPoints(r);this.routeBorder=L.polyline(points,{pane:'accessRoutes',color:'#123e35',weight:8,opacity:.8,interactive:false}).addTo(this.map);this.routeLine=L.polyline(points,{pane:'accessRoutes',color:r.structures||r.elevationMissing?'#f2be6e':'#75efbb',dashArray:r.structures||r.elevationMissing?'8 5':null,weight:4.5,opacity:1,interactive:false}).addTo(this.map);}

 }

 renderOutages(){const target=this.$('access-outage-summary');if(!this.baseline.connected){target.textContent='No connection in the no-flood reference. Choose another pair to isolate the effect of flooding.';return;}

  if(!this.outages.length){target.textContent='Connected at all 19 saved snapshots. Short disruptions between those snapshots cannot be ruled out.';return;}

  const min=this.outages.reduce((s,w)=>s+w.minHours,0),max=this.outages.reduce((s,w)=>s+w.maxHours,0);

  target.innerHTML=`<strong>${min===max?min:min+'–'+max} h</strong><span>estimated unavailable time within hours 0–72*</span>${this.outages.map(w=>`<div class="access-outage-window"><b>No route at ${w.first===w.last?'hour '+w.first:'hours '+w.first+'–'+w.last}</b><p>${w.lossAfter===null?'Already disconnected at hour 0.':'Connection lost between hours '+w.lossAfter+' and '+w.lossBy+'.'} ${w.returnBy===null?'Still disconnected at hour 72.':'Returns between hours '+w.returnAfter+' and '+w.returnBy+'.'}</p></div>`).join('')}<small>*Assumes one continuous outage per gap. Transitions are uncertain between 4-hour snapshots.</small>`;

 }

 chart(){const svg=this.$('access-chart'),w=Math.max(320,svg.clientWidth||900),h=Math.max(90,svg.clientHeight||130),left=36,right=16,top=17,bottom=25,pw=w-left-right,ph=h-top-bottom;svg.setAttribute('viewBox',`0 0 ${w} ${h}`);this.$('access-chart-empty').hidden=!!this.results;

  const max=Math.max(5,Math.ceil(Math.max(this.baseline?.seconds||0,...(this.results||[]).map(r=>r.seconds||0))/60/5)*5),x=i=>{const box=this.$('access-time-buttons').children[i].getBoundingClientRect(),svgBox=svg.getBoundingClientRect();return svgBox.width?(box.left+box.width/2-svgBox.left)*w/svgBox.width:left+i/18*pw;},y=sec=>top+ph-(sec/60)/max*ph;let html='<title>Estimated travel minutes at saved 4-hour flood snapshots; missing routes appear as gaps</title>';

  for(let k=0;k<=2;k++){const value=max*k/2,yy=top+ph-value/max*ph;html+=`<path d="M${left},${yy}H${w-right}" stroke="#3a505b"/><text x="${left-7}" y="${yy+4}" text-anchor="end">${value}</text>`;}

  if(this.baseline?.connected)html+=`<path d="M${left},${y(this.baseline.seconds)}H${w-right}" stroke="#8d99b0" stroke-dasharray="5 5"/><text x="${w-right}" y="${Math.max(12,y(this.baseline.seconds)-5)}" text-anchor="end">No-flood reference</text>`;

  let segment=[];const flush=()=>{if(segment.length>1)html+=`<path d="M${segment.join('L')}" fill="none" stroke="#b4f5d0" stroke-width="2.5"/>`;segment=[];};

  for(let i=0;i<(this.results?.length||0);i++){const r=this.results[i];if(!r.connected){flush();html+=`<rect x="${x(i)-pw/36}" y="${top}" width="${pw/18}" height="${ph}" fill="#f4787420"/><path d="M${x(i)-4},${top+ph/2-4}l8,8m-8,0l8,-8" stroke="#f47874" stroke-width="2"/>`;}else{segment.push(`${x(i)},${y(r.seconds)}`);html+=`<circle cx="${x(i)}" cy="${y(r.seconds)}" r="3.4" fill="#b4f5d0"/>`;}}flush();

  html+=`<path d="M${x(this.frame)},${top-4}V${h-bottom+3}" stroke="#ffe1a1" stroke-width="1.5"/><text x="6" y="12">min</text>`;svg.innerHTML=html;

 }

 inspect(p){const j=p.edge*10,bit=1<<this.frame,flags=this.edges[j+6],bridge=!!(flags&1),surfaceUnknown=!!(flags&10),mm=this.depth[this.frame*this.manifest.edgeCount+p.edge],closed=!!(this.edges[j+7]&bit),unreported=!!(this.edges[j+8]&bit),uncertain=(!bridge&&unreported)||!!(flags&14);

  const div=document.createElement('div');div.className='access-road-popup';const title=document.createElement('strong');title.textContent=this.names[this.edges[j+4]];div.append(title);

  const add=(tag,content)=>{const el=document.createElement(tag);el.textContent=content;div.append(el);};

  const depthLabel=mm===65535?'Water depth unavailable.':mm>=151&&mm<=153?(closed?'Water over road: ≥6 in.':'Water over road: <6 in.'):'Water over road: '+(mm/25.4).toFixed(1)+' in.';
  add('p',`Hour ${this.frame*4} · `+(bridge?'Bridge':depthLabel));
  add('p',closed?'Closed · water reaches the 6-inch limit.':this.strict&&uncertain?'Unavailable · excluded by Conservative check.':bridge?'Bridge kept open in this experiment. Approach roads can still close.':surfaceUnknown||unreported?'Open in this simulation · depth unavailable.':'Open · water is below 6 inches.');

  window.L.popup({maxWidth:320}).setLatLng([p.lat,p.lon]).setContent(div).openOn(this.map);

 }

 play(){if(!this.map)return;if(this.frame===18)this.setFrame(0);this.playing=true;this.$('access-play').textContent='Ⅱ Pause';this.$('access-play').setAttribute('aria-pressed','true');this.timer=setInterval(()=>{if(this.frame<18)this.setFrame(this.frame+1);else this.stop();},+this.$('access-speed').value);}

 stop(){clearInterval(this.timer);this.playing=false;this.$('access-play').textContent='▶ Play flood';this.$('access-play').setAttribute('aria-pressed','false');}

 fit(){if(!this.map)return;if(this.a&&this.b){const active=this.results?.[this.frame],points=active?.connected?this.pathPoints(active):this.baseline?.connected?this.pathPoints(this.baseline):[[this.a.lat,this.a.lon],[this.b.lat,this.b.lon]];this.map.fitBounds(points,{padding:[65,65],maxZoom:14});}else this.map.fitBounds(this.manifest.bounds,{padding:[20,20]});}

 announce(text){this.$('access-announcement').textContent=text;this.$('access-map-message').textContent=text;}

 details(on){this.$('access-workspace').classList.toggle('access-info-open',on);this.$('access-details-toggle').setAttribute('aria-expanded',on);}

 applyExpanded(on){this.expanded=on;this.$('access-workspace').classList.toggle('access-expanded',on);document.body.classList.toggle('access-is-expanded',on);this.$('access-expand').textContent=on?'Exit ×':'⛶';this.$('access-expand').setAttribute('aria-label',on?'Exit expanded accessibility experiment':'Expand accessibility experiment');document.querySelectorAll('.topbar,.module-tabs,.access-intro,footer').forEach(el=>el.inert=on);requestAnimationFrame(()=>this.map?.invalidateSize());}

 async expand(on){if(on){this.scroll=window.scrollY;this.applyExpanded(true);try{await this.$('access-workspace').requestFullscreen?.();}catch{}}else{try{if(document.fullscreenElement===this.$('access-workspace'))await document.exitFullscreen();}catch{}this.applyExpanded(false);window.scrollTo(0,this.scroll||0);}}

 show(){this.visible=true;requestAnimationFrame(()=>this.map?.invalidateSize());}

 hide(){this.visible=false;this.stop();this.host.querySelectorAll('dialog[open]').forEach(d=>d.close());if(this.expanded)this.expand(false);}

}

