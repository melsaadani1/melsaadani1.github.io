import * as THREE from 'three';
import {streetGraph,streetPath,refugePath,routePoints,sampleRoute,crewAssignments,reopenedStreets,returnStreetPaths} from './road-life.js';

const V=.8,COUNT=40;
const shirts=['#eea95f','#ed7e78','#77c5b7','#a5a3dc','#e4cc78','#699cc3'];
const skins=['#e9ba8e','#bd8c64','#865f48','#e6c7a0'];
const mix=(a,b,t)=>a+(b-a)*t;

export class RoadActors{
 constructor(view){
  this.view=view;this.city=view.city;this.graph=streetGraph(this.city);this.mode='walk';this.u=0;this.routes=new Map();this.assignments=[];this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial({flatShading:true}),1600);
  this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.frustumCulled=false;view.scene.add(this.mesh);this.object=new THREE.Object3D();this.colors=new Map();
  this.people=Array.from({length:COUNT},(_,i)=>{
   let id=this.city.roads[(i*113+17)%this.city.roads.length].id,last=-1;const ids=[id];
   for(let n=0;n<9;n++){const next=this.graph.get(id).filter(k=>k!==last),options=next.length?next:this.graph.get(id);const k=options[(i+n*7)%options.length];last=id;id=k;ids.push(id);}
   return {i,patrol:routePoints(this.city,ids),pose:null,escape:null,arrival:1};
  });
  this.depot=this.city.roads.reduce((a,b)=>a.deck>b.deck?a:b);
  this.update(0);
 }
 color(hex){if(!this.colors.has(hex))this.colors.set(hex,new THREE.Color(hex));return this.colors.get(hex);}
 box(p,x,y,z,w,h,d,color,rx=0){
  const c=Math.cos(p.yaw||0),s=Math.sin(p.yaw||0);
  this.object.position.set(p.x+x*c+z*s,p.deck*V+.09+y,p.z-x*s+z*c);
  this.object.rotation.set(rx,p.yaw||0,0);this.object.scale.set(w,h,d);this.object.updateMatrix();
  this.mesh.setMatrixAt(this.n,this.object.matrix);this.mesh.setColorAt(this.n++,this.color(color));
 }
 person(p,i,t,running=false,working=false){
  const walk=!this.reduced&&(running||this.mode==='walk'||this.mode==='return'&&!!this.people[i]?.returnRoute||working),phase=t*(running?18:working?10:6)+i*1.7;
  const stride=walk?Math.sin(phase)*(running?.19:.11):0,bob=walk?Math.abs(Math.sin(phase))*.04:0;
  const b=(x,y,z,w,h,d,c,rx)=>this.box(p,x*1.2,(y+bob)*1.2,z*1.2,w*1.2,h*1.2,d*1.2,c,rx);
  // Deliberately oversized storybook residents; their feet follow the road deck.
  this.box(p,0,.008,0,.46,.018,.35,'#405b51');
  b(-.1,.2,stride,.13,.34,.13,'#3a5365');b(.1,.2,-stride,.13,.34,.13,'#3a5365');
  b(-.1,.04,stride+.03,.16,.09,.22,'#334743');b(.1,.04,-stride+.03,.16,.09,.22,'#334743');
  b(0,.58,0,.36,.46,.24,working?'#f6a642':shirts[i%shirts.length]);
  b(0,.93,0,.32,.3,.29,skins[i%skins.length]);b(0,1.095,-.025,.34,.1,.31,working?'#ffdc78':i%3===0?'#ba865c':'#4b4842');
  b(-.075,.95,.152,.04,.045,.018,'#2d4346');b(.075,.95,.152,.04,.045,.018,'#2d4346');
  b(-.25,running?.86:.59,-stride,.105,.35,.13,working?'#f6a642':shirts[i%shirts.length],running?-.7:stride*2);
  b(.25,running?.76:.59,stride,.105,.35,.13,working?'#f6a642':shirts[i%shirts.length],running?.7:-stride*2);
  if(running){b(0,1.55,0,.13,.36,.1,'#ffe293');b(0,1.27,0,.13,.1,.1,'#ffe293');}
  if(working){
   b(-.105,.61,.127,.055,.4,.02,'#e9f5a5');b(.105,.61,.127,.055,.4,.02,'#e9f5a5');b(0,.53,.133,.37,.055,.02,'#e9f5a5');
   const swing=this.reduced?0:Math.sin(phase)*.17;
   b(.34,.46+swing,.28,.055,.64,.055,'#896f4e');b(.34,.16+swing,.28,.31,.07,.2,i%2?'#859695':'#c7bc82');
  }
 }
 truck(p,crew,t){
  const b=(x,y,z,w,h,d,c)=>this.box(p,x,y,z,w,h,d,c);
  b(0,.17,0,.68,.19,1.5,'#394d4d');b(0,.38,0,.67,.3,1.45,'#dfab53');
  b(0,.66,.35,.64,.4,.59,'#e6bc69');b(0,.71,.66,.52,.24,.025,'#648e9b');
  b(0,.65,-.39,.6,.18,.64,'#a18454');b(0,.81,.35,.7,.08,.68,'#f0d091');
  for(const x of [-.37,.37])for(const z of [-.45,.45]){b(x,.17,z,.17,.29,.3,'#2d4347');b(x*1.05,.17,z,.035,.12,.13,'#9facaa');}
  for(const x of [-.22,.22])b(x,.42,.75,.14,.12,.035,'#fff0b0');
  b(0,.92,.35,.36,.12,.17,Math.sin(t*7)>0?'#ffdb74':'#cc8748');
  b(0,.55,-.38,.37,.3,.36,'#678679');
 }
 cone(p,x,z){this.box(p,x,.03,z,.3,.06,.3,'#49544a');this.box(p,x,.18,z,.14,.29,.14,'#f29c52');this.box(p,x,.23,z,.16,.065,.16,'#f7e7b9');}
 beginEvacuation(peakFt){
  this.mode='evacuate';this.u=0;this.assignments=[];this.routes.clear();
  let longest=1;
  for(const a of this.people){
   const ids=refugePath(this.city,this.graph,a.pose.id,peakFt);
   if(!ids)throw new Error('A resident has no dry refuge route.');
   a.escape=[{...a.pose},...routePoints(this.city,ids)];longest=Math.max(longest,a.escape.length);
  }
  for(const a of this.people)a.arrival=.35+.65*a.escape.length/longest;
 }
 evacuate(u){this.u=Math.min(1,u);if(u>=1)this.mode='safe';return this.people.filter(a=>u>=a.arrival).length;}
 reset(){this.mode='walk';this.assignments=[];this.event=null;this.routes.clear();this.u=0;this.returnKey=null;for(const a of this.people)a.returnRoute=null;}
 recovery(event,day,overlay=false){
  if(this.event!==event){this.routes.clear();this.returnKey=null;}
  this.assignments=overlay?[]:crewAssignments(this.city,event,day);this.event=event;this.day=day;
  const {repaired,available}=reopenedStreets(this.city,event,day),key=[...repaired].join(',');
  if(key!==this.returnKey){
   this.returnKey=key;
   const paths=returnStreetPaths(this.city,this.graph,event,day,this.people.map(a=>a.escape.at(-1).id));
   this.people.forEach((a,i)=>{
    // Keep an ongoing walk as more streets open. Scrubbing backward removes unsafe routes.
    if(a.returnRoute&&a.returnRoute.every(p=>available.has(p.id)))return;
    a.returnRoute=paths[i]?routePoints(this.city,paths[i]):null;a.returnStarted=this.seconds||0;
   });
  }
  this.mode=overlay?'safe':'return';
  for(const a of this.assignments)if(!this.routes.has(a.job.id)){
   const dest=a.job.cells.find(c=>event.damage.get(c.id).depth>0),from=a.previous?.cells.at(-1)||this.depot;
   this.routes.set(a.job.id,routePoints(this.city,streetPath(this.city,this.graph,from.id,c=>c.id===dest.id)||[dest.id]));
  }
 }
 update(seconds){
  this.n=0;this.seconds=seconds;
  for(const a of this.people){
   let p,running=false;
   if(this.mode==='walk'){const t=this.reduced?(a.i*.13)%1:(seconds*.028+a.i*.137)%2;p=sampleRoute(a.patrol,t>1?2-t:t);if(t>1)p.yaw+=Math.PI;}
   else if(this.mode==='return'&&a.returnRoute){const t=this.reduced?.5:((seconds-a.returnStarted)*1.8/Math.max(1,a.returnRoute.length-1))%2;p=sampleRoute(a.returnRoute,t>1?2-t:t);if(t>1)p.yaw+=Math.PI;}
   else {const t=Math.min(1,this.u/a.arrival);p=sampleRoute(a.escape,t);running=this.mode==='evacuate'&&t<1;}
   // Sidewalk lane, within the modeled road cell. Refuges remain above peak water.
   p={...p,x:p.x+Math.cos(p.yaw)*.23,z:p.z-Math.sin(p.yaw)*.23};a.pose=p;
   this.person(p,a.i,seconds,running);
  }
  for(const a of this.assignments){
   const arrival=Math.min(1,a.progress/.2),route=this.routes.get(a.job.id),p=sampleRoute(route,arrival);this.truck(p,a.crew,seconds);
   if(arrival<1)continue;
   const c=a.cell,q={x:c.x,z:c.z,deck:c.deck,yaw:c.orientation==='h'?Math.PI/2:0};
   for(const [x,z] of [[-.38,-.7],[.38,-.7],[-.38,.7],[.38,.7]])this.cone(q,x,z);
   this.box(q,0,.011,0,.48,.025,.72,'#384e53');
   this.person({...q,x:q.x+.28,z:q.z+.35},a.crew*2,seconds,false,true);
   this.person({...q,x:q.x-.25,z:q.z-.35,yaw:q.yaw+Math.PI},a.crew*2+1,seconds,false,true);
   // Compact asphalt roller beside the crew.
   this.box(q,.05,.3,-.8,.4,.38,.47,'#e4b359');this.box(q,.05,.11,-.97,.55,.19,.24,'#698185');
  }
  this.mesh.count=this.n;this.mesh.instanceMatrix.needsUpdate=true;this.mesh.instanceColor.needsUpdate=true;
 }
 get count(){return COUNT;}
 get returning(){return this.mode==='return'?this.people.filter(a=>a.returnRoute).length:0;}
}
