import {nearestRoad} from './access-map.js';

const abbreviations={street:'st',road:'rd',drive:'dr',avenue:'ave',boulevard:'blvd',parkway:'pkwy',lane:'ln',court:'ct',circle:'cir',highway:'hwy',north:'n',south:'s',east:'e',west:'w',louisiana:'la'};

export function normalizePlace(text){
 return String(text??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/wal[\s-]*mart/g,'walmart').replace(/\b(?:interstate|i)[\s-]*(10|49)\b/g,'i$1')
  .replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).map(w=>abbreviations[w]||w).join(' ');
}

// Gazetteer rows contain public address/place fields only; no property-owner records.
export function buildPlaceIndex(places,rows=[]){
 const known=new Set(places.map(p=>normalizePlace(p.address))),items=[...places];
 for(const [address,city,zip,name,lon,lat,kind] of rows){
  if(known.has(normalizePlace(address)))continue;
  items.push({address,city,zip,name,lon,lat,kind});
 }
 return items.map(place=>{const name=normalizePlace(place.name),address=normalizePlace(place.address);
  return {place,name,address,tokens:[...new Set(normalizePlace([place.name,place.address,place.city,'LA',place.zip,place.kind,...(place.aliases||[])].join(' ')).split(' '))]};
 });
}

export function searchPlaces(index,query,limit=8){
 const q=normalizePlace(query);if(q.length<2)return [];
 const words=q.split(' '),ranked=[];
 for(const entry of index){
  // House numbers match exactly: 1214 must never silently become 12140.
  if(!words.every(w=>entry.tokens.some(t=>/^\d+$/.test(w)?t===w:t.startsWith(w))))continue;
  const score=(entry.place.id?1000:0)+(entry.name===q?400:entry.name.startsWith(q)?200:0)+(entry.address===q?300:entry.address.startsWith(q)?100:0)+(entry.place.name?10:0);
  ranked.push({place:entry.place,score});
 }
 ranked.sort((a,b)=>b.score-a.score||a.place.address.localeCompare(b.place.address,undefined,{numeric:true}));
 return ranked.slice(0,limit).map(r=>r.place);
}

export function insideStudy(lon,lat,polygon){
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const [yi,xi]=polygon[i],[yj,xj]=polygon[j];
  if((yi>lat)!==(yj>lat)&&lon<(xj-xi)*(lat-yi)/(yj-yi)+xi)inside=!inside;
 }
 return inside;
}

export function snapPlace(nodes,edges,names,place,polygon){
 if(!insideStudy(place.lon,place.lat,polygon))return null;
 if(place.point)return {...place.point};
 // Prefer the addressed street within 350 m. Ordinary addresses cannot snap to
 // a motorway or its ramps simply because those pass close to the building.
 const street=normalizePlace(place.address.replace(/^\d+[a-z]?\s+/i,'').split(/\s+#\s*|\s+APT\s+|\s+STE\s+/i)[0]);
 const allowed=edge=>edges[edge*10+5]>1;
 return nearestRoad(nodes,edges,place.lon,place.lat,350,edge=>allowed(edge)&&normalizePlace(names[edges[edge*10+4]])===street)
  ||nearestRoad(nodes,edges,place.lon,place.lat,350,allowed);
}
