import {makeGrid,terrain,bed,channelDistance,streams,clamp} from './model.mjs';

// A deliberately illustrative flow-to-stage relation, not a hydraulic solver.
// Identical terrain and relation are used in every comparison. No mass-conservation
// claim is made for these maps; water balances belong to the hydrology calculation.
export const stageForFlow=q=>.16*Math.pow(Math.max(0,q),.78);
export const STUDY_POINT={x:-280,z:3100,name:'Westfold · village edge'};
let terrainCache;
export function floodIllustration(hydro){
 const grid=makeGrid(hydro.options.development),n=grid.mask.length;
 if(!terrainCache){
  const relief=new Float32Array(n),dirX=new Float32Array(n),dirZ=new Float32Array(n),seeds=[];
  for(let k=0;k<n;k++)if(grid.mask[k]){
   const x=grid.x0+(k%grid.nx+.5)*grid.dx,z=grid.z0+(Math.floor(k/grid.nx)+.5)*grid.dx;
   relief[k]=grid.z[k]-bed(z);if(channelDistance(x,z).d<40)seeds.push(k);
   let best=Infinity,vx=0,vz=1;
   for(const s of streams)for(let j=1;j<s.points.length;j++){
    const [ax,az]=s.points[j-1],[bx,bz]=s.points[j],dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz),t=clamp(((x-ax)*dx+(z-az)*dz)/(len*len),0,1),d=Math.hypot(x-ax-t*dx,z-az-t*dz);
    if(d<best){best=d;vx=dx/len;vz=dz/len;}
   }dirX[k]=vx;dirZ[k]=vz;
  }terrainCache={relief,dirX,dirZ,seeds};
 }
 const {relief,dirX,dirZ,seeds}=terrainCache,frames=[];
 for(let f=0;f<=96;f++){
  const time=f/4,q=hydro.q[f*3],stage=stageForFlow(q),h=new Float32Array(n),ux=new Float32Array(n),uz=new Float32Array(n),connected=new Uint8Array(n),queue=[];
  for(const k of seeds)if(relief[k]<stage){connected[k]=1;queue.push(k);}
  for(let p=0;p<queue.length;p++){const k=queue[p],i=k%grid.nx;for(const j of [i>0?k-1:-1,i<grid.nx-1?k+1:-1,k-grid.nx,k+grid.nx])if(j>=0&&j<n&&grid.mask[j]&&!connected[j]&&relief[j]<stage){connected[j]=1;queue.push(j);}}
  let wetArea=0,depthMax=0,speedMax=0;
  for(const k of queue){const d=stage-relief[k];h[k]=d;if(d<=.1)continue;
   const speed=Math.min(2.5,.38*Math.sqrt(d)*Math.pow(q/(q+20),.3));ux[k]=dirX[k]*speed;uz[k]=dirZ[k]*speed;
   if(!grid.channel[k])wetArea+=grid.dx**2;depthMax=Math.max(depthMax,d);speedMax=Math.max(speedMax,speed);
  }
  const ground=terrain(STUDY_POINT.x,STUDY_POINT.z),eta=bed(STUDY_POINT.z)+stage;
  frames.push({time,q,stage,h,ux,uz,connected,wetArea,depthMax,speedMax,probeDepth:Math.max(0,eta-ground),probeLevel:eta,probeGround:ground});
 }
 const peakFrame=frames.reduce((a,f,i)=>f.q>frames[a].q?i:a,0);
 return {grid,frames,peakFrame,illustrative:true,scheme:'Illustrative flow-to-stage relation and connected terrain inundation'};
}
