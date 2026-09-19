// Synthetic city, connected flood footprint, direct repair costs and crew schedule.
// All distances are metres internally; bankfull is the common zero-water datum.
export const FT=.3048, SIZE=10, NX=65, NZ=45;
export const ASSUMPTIONS={replacement:250,cleanup:2,patch:60,cleanRate:2000,patchRate:400,inspection:1,minJob:.125};
// Teaching curve for slow-moving inundation: fraction of pavement replacement value.
// Inspired by the low-flow repair mechanism in van Ginkel et al. (2021), not digitized/calibrated.
export const DAMAGE_CURVE=[[0,0],[.1,.005],[.3,.008],[.6,.014],[1,.022],[1.5,.03],[2.5,.04]];
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function damageFraction(depth){if(depth<=0)return 0;for(let i=1;i<DAMAGE_CURVE.length;i++){const [x,y]=DAMAGE_CURVE[i],[a,b]=DAMAGE_CURVE[i-1];if(depth<=x)return b+(y-b)*(depth-a)/(x-a);}return DAMAGE_CURVE.at(-1)[1];}
function riverX(z){return -5+3.4*Math.sin(z/7)+1.1*Math.sin(z/2.8);}
function channelDistance(x,z){const main=Math.abs(x-riverX(z))-1.25;const branch=x>-5?Math.abs(z-(-4-.43*(x+5)))/1.09-.7:99;return Math.min(main,branch);}
const hRoads=[-17,-9,0,9,17],vRoads=[-26,-18,-10,3,13,24];
const hNames=['Northbank Avenue','Market Street','Civic Avenue','Orchard Road','Southbank Road'];
const vNames=['West Hill Way','Willow Street','Mill Lane','Station Street','Garden Avenue','East Ridge Road'];
class Heap{
 constructor(){this.a=[];}push(v){const a=this.a;a.push(v);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p][0]<=v[0])break;a[i]=a[p];i=p;}a[i]=v;}
 pop(){const a=this.a,r=a[0],v=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1][0]<a[c][0])c++;if(a[c][0]>=v[0])break;a[i]=a[c];i=c;}a[i]=v;}return r;}
}
export function connectedLevels(cells,nx,nz){
 const spill=new Float64Array(cells.length).fill(Infinity),heap=new Heap();
 cells.forEach((c,i)=>{if(c.channel){spill[i]=0;heap.push([0,i]);}});
 while(heap.a.length){const [h,i]=heap.pop();if(h!==spill[i])continue;const col=i%nx,row=Math.floor(i/nx);for(const j of [col>0?i-1:-1,col<nx-1?i+1:-1,row>0?i-nx:-1,row<nz-1?i+nx:-1]){if(j<0)continue;const next=Math.max(h,cells[j].ground);if(next<spill[j]){spill[j]=next;heap.push([next,j]);}}}
 return spill;
}
export function createCity(){
 const cells=[],roads=[],groups=new Map();
 for(let iz=0;iz<NZ;iz++)for(let ix=0;ix<NX;ix++){
  const x=ix-(NX-1)/2,z=iz-(NZ-1)/2,d=channelDistance(x,z),channel=d<=0;
  const east=10*Math.exp(-((x-25)**2/110+(z+7)**2/230));
  const west=7*Math.exp(-((x+25)**2/150+(z-14)**2/100));
  let feet=Math.max(.12,d*.17)+east+west+.12*Math.sin(x*.4)*Math.sin(z*.4);
  const basin=Math.hypot(x-17,z-12);if(basin<4.6)feet=.45;if(basin>=4.6&&basin<6.2)feet=Math.max(feet,3.8);
  if(channel)feet=-2;
  const hi=hRoads.indexOf(z),vi=vRoads.indexOf(x),horizontal=hi>=0&&x>=-29&&x<=29,vertical=vi>=0&&z>=-19&&z<=19,road=horizontal||vertical;
  // Roads cross channels on high decks; graded approaches follow a raised embankment.
  let deck=feet;if(road){deck=Math.max(feet+.18,9.5-Math.max(0,d)*2.7);if(!channel)feet=deck;}
  const cell={id:cells.length,x,z,channel,ground:feet*FT,road,deck:deck*FT,bridge:road&&channel,group:null};
  if(road){const name=horizontal?hNames[hi]:vNames[vi],block=Math.floor(((horizontal?x:z)+(horizontal?29:19))/8)+1,key=(horizontal?'h'+hi:'v'+vi)+'-'+block;
   cell.group=key;cell.orientation=horizontal?'h':'v';roads.push(cell);
   if(!groups.has(key))groups.set(key,{id:key,name:name+' · '+block,street:name,cells:[]});groups.get(key).cells.push(cell);
  }
  cells.push(cell);
 }
 const spill=connectedLevels(cells,NX,NZ);cells.forEach((c,i)=>c.spill=spill[i]);
 return {cells,roads,groups:[...groups.values()],nx:NX,nz:NZ,totalLength:roads.length*SIZE};
}
export function wetAt(cell,stage){return cell.channel||stage>cell.ground+1e-7&&stage+1e-7>=cell.spill;}
export function roadDepth(cell,stage){return wetAt(cell,stage)?Math.max(0,stage-cell.deck):0;}
export function analyzeFlood(city,peakFt,crews=2,rateMultiplier=1){
 const stage=peakFt*FT,damage=new Map();
 for(const c of city.roads){const depth=roadDepth(c,stage),fraction=damageFraction(depth),area=SIZE*SIZE;damage.set(c.id,{depth,fraction,cost:fraction*area*ASSUMPTIONS.replacement});}
 const groups=city.groups.map(g=>{
  const wet=g.cells.filter(c=>damage.get(c.id).depth>1e-7),cost=g.cells.reduce((s,c)=>s+damage.get(c.id).cost,0),area=wet.length*SIZE*SIZE;
  const cleanCost=Math.min(cost,area*ASSUMPTIONS.cleanup),patchArea=Math.max(0,cost-cleanCost)/ASSUMPTIONS.patch;
  const work=area?Math.max(ASSUMPTIONS.minJob,(area/ASSUMPTIONS.cleanRate+patchArea/ASSUMPTIONS.patchRate)/rateMultiplier):0;
  return {...g,cost,area,patchArea,work,wetLength:wet.length*SIZE,length:g.cells.length*SIZE,maxDepth:Math.max(...g.cells.map(c=>damage.get(c.id).depth)),meanDepth:wet.length?wet.reduce((s,c)=>s+damage.get(c.id).depth,0)/wet.length:0,start:0,end:0,crew:0};
 });
 const queue=groups.filter(g=>g.area>0).sort((a,b)=>b.work-a.work||a.id.localeCompare(b.id));
 const clocks=Array.from({length:crews},()=>ASSUMPTIONS.inspection);
 for(const g of queue){const k=clocks.indexOf(Math.min(...clocks));g.start=clocks[k];g.end=g.start+g.work;g.crew=k+1;clocks[k]=g.end;}
 return {peakFt,crews,damage,groups,cost:groups.reduce((s,g)=>s+g.cost,0),wetLength:groups.reduce((s,g)=>s+g.wetLength,0),end:queue.length?Math.max(...clocks):0,jobs:queue.length};
}
export function progress(group,day){return !group.work||day>=group.end?1:clamp((day-group.start)/group.work,0,1);}
export function recoveryState(city,event,day){
 let outstanding=0,workLength=0,complete=0;
 for(const g of event.groups){const p=progress(g,day);outstanding+=g.cost*(1-p);if(p<1-1e-8)workLength+=g.wetLength;else if(g.work)complete++;}
 return {outstanding,workLength,complete,restored:1-workLength/city.totalLength};
}
export function floodHydrograph(elapsed,duration=3000){const t=clamp(elapsed/duration,0,1);if(t<.38)return Math.sin(t/.38*Math.PI/2);if(t<.48)return 1;return Math.max(0,Math.cos((t-.48)/.52*Math.PI/2));}
