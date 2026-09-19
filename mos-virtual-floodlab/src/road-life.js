// Story animation helpers. These do not change flood damage or the repair schedule.
import {FT} from './road-model.js';

export const EVACUATION_MS=4000;
export const STORM_END_MS=EVACUATION_MS+3000*.38; // First arrival at peak water.
export function stormIntensity(elapsed){return Math.max(0,Math.min(1,1-elapsed/STORM_END_MS));}

export function streetGraph(city){
 const graph=new Map();
 for(const c of city.roads){
  const row=Math.floor(c.id/city.nx),col=c.id%city.nx;
  graph.set(c.id,[col?c.id-1:-1,col<city.nx-1?c.id+1:-1,row?c.id-city.nx:-1,row<city.nz-1?c.id+city.nx:-1].filter(id=>city.cells[id]?.road));
 }
 return graph;
}
export function streetPath(city,graph,start,accept){
 const queue=[start],previous=new Map([[start,null]]);
 for(let n=0;n<queue.length;n++){
  const id=queue[n];
  if(accept(city.cells[id])){const path=[];for(let k=id;k!==null;k=previous.get(k))path.push(k);return path.reverse();}
  for(const next of graph.get(id)||[])if(!previous.has(next)){previous.set(next,id);queue.push(next);}
 }
 return null;
}
export function refugePath(city,graph,start,peakFt){
 // A vertical safety margin; everyone reaches a dry endpoint BEFORE water rises.
 return streetPath(city,graph,start,c=>c.deck>=(peakFt+.6)*FT);
}
export function routePoints(city,ids){return ids.map(id=>{const c=city.cells[id];return {x:c.x,z:c.z,deck:c.deck,id};});}
export function sampleRoute(points,t){
 if(!points?.length)return null;
 if(points.length===1)return {...points[0],yaw:0};
 const f=Math.max(0,Math.min(1,t))*(points.length-1),i=Math.min(points.length-2,Math.floor(f)),a=points[i],b=points[i+1],u=f-i;
 return {x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u,deck:a.deck+(b.deck-a.deck)*u,yaw:Math.atan2(b.x-a.x,b.z-a.z),id:u<.5?a.id:b.id};
}
export function crewAssignments(city,event,day){
 if(!event)return [];
 const assignments=[];
 for(let crew=1;crew<=event.crews;crew++){
  const jobs=event.groups.filter(g=>g.crew===crew).sort((a,b)=>a.start-b.start);
  const job=jobs.find(g=>day>=g.start&&day<g.end);
  if(job){
   const wet=job.cells.filter(c=>event.damage.get(c.id).depth>0);
   const p=(day-job.start)/job.work;
   assignments.push({crew,job,cell:wet[Math.min(wet.length-1,Math.floor(p*wet.length))],progress:p,previous:jobs[jobs.indexOf(job)-1]||null});
  }
 }
 return assignments;
}

export function reopenedStreets(city,event,day){
 const repaired=new Set(event.groups.filter(g=>g.work&&day>=g.end).flatMap(g=>g.cells.filter(c=>event.damage.get(c.id).depth>0).map(c=>c.id)));
 const available=new Set(city.roads.filter(c=>event.damage.get(c.id).depth<=1e-7||repaired.has(c.id)).map(c=>c.id));
 return {repaired,available};
}
export function returnStreetPaths(city,graph,event,day,starts){
 const {repaired,available}=reopenedStreets(city,event,day);
 const openGraph=new Map([...graph].filter(([id])=>available.has(id)).map(([id,edges])=>[id,edges.filter(next=>available.has(next))]));
 return starts.map((start,i)=>{
  if(!available.has(start)||!repaired.size)return null;
  const path=streetPath(city,openGraph,start,c=>repaired.has(c.id));
  if(!path)return null;
  for(let n=0;n<10;n++){
   const current=path.at(-1),previous=path.at(-2),edges=openGraph.get(current)||[],forward=edges.filter(id=>id!==previous),options=forward.length?forward:edges;
   if(!options.length)break;path.push(options[(i+n*3)%options.length]);
  }
  return path;
 });
}
