// A synthetic watershed and two intentionally small, conservative teaching models.
// All distances are metres; internal hydraulic time is seconds; discharge is m³/s.
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const LENGTH=4200, DX=50, NX=64, NZ=86, X0=-1600, Z0=-50;
export const center=z=>75*Math.sin(z/LENGTH*5.4);
export const width=z=>z<0||z>LENGTH?0:85+1270*Math.pow(Math.max(0,Math.sin(Math.PI*z/LENGTH)),.55)*(1+.08*Math.sin(z/260));
export const inside=(x,z)=>z>=0&&z<=LENGTH&&Math.abs(x-center(z))<width(z);
export const riverX=z=>center(z)+100*Math.sin(z/420)*Math.sin(Math.PI*z/LENGTH);
export const streams=[
 {name:'Rohan Creek',main:true,points:Array.from({length:101},(_,i)=>{const z=280+i*(LENGTH-280)/100;return [riverX(z),z];})},
 {name:'Fern Brook',points:[[-640,450],[-810,850],[-630,1170],[-450,1380],[-220,1530],[riverX(1660),1660]]},
 {name:'Mill Run',points:[[850,1070],[730,1340],[620,1660],[450,1920],[235,2180],[riverX(2380),2380]]},
 {name:'Meadow Brook',points:[[-900,2250],[-690,2470],[-640,2680],[-380,2880],[riverX(3030),3030]]}
];
export function distLine(x,z,points){let d=1e9;for(let i=1;i<points.length;i++){let [a,b]=points[i-1],[c,e]=points[i],u=c-a,v=e-b,t=clamp(((x-a)*u+(z-b)*v)/(u*u+v*v),0,1);d=Math.min(d,Math.hypot(x-a-u*t,z-b-v*t));}return d;}
export function channelDistance(x,z){let d=z<280?Math.hypot(x-riverX(280),z-280):Math.abs(x-riverX(z)),main=true;for(const s of streams.slice(1)){const n=distLine(x,z,s.points);if(n<d){d=n;main=false;}}return {d,main};}
export const bed=z=>6+Math.min(1800,LENGTH-z)*.00045+Math.max(0,2400-z)*.0045;
export function terrain(x,z){
 const d=Math.abs(x-riverX(z));
 const bank=1.35-.8*clamp((z-2200)/700,0,1);
 let h=d<23?0:d<63?(d-23)/40*bank:bank+(d-63)*.0014+Math.max(0,d-330)**2*.000115;
 for(const s of streams.slice(1)){let e=distLine(x,z,s.points);let v=e<9?.06:e<37?.06+(e-9)/28*.72:.78+(e-37)*.015+Math.max(0,e-130)**2*.00017;h=Math.min(h,v);}
 return bed(z)+h+Math.min(1,h/10)*(.5*Math.sin(x/150+z/270)*Math.cos(z/200))+14*(1-clamp(z/260,0,1))**2;
}
export function landUse(x,z,developed=false){
 const town=Math.min(((x-490)/310)**2+((z-2180)/470)**2,((x+425)/260)**2+((z-3080)/320)**2);
 if(town<(developed?2.7:1))return 2;
 if(z>3020&&Math.abs(x-riverX(z))<230)return 3;
 if(z<1170||Math.abs(x-center(z))>width(z)*.72)return 0;
 return 1;
}
export const soilType=(x,z)=>x<-200?0:x>380&&z<3150?2:1;
export const zoneAt=(x,z)=>z<1670?0:x>0&&z<2700?1:2;
export const ZONES=[{name:'Wooded headwaters',color:'#63885d',source:[riverX(1625),1625]},{name:'Eastern tributary',color:'#b0925c',source:[riverX(2375),2375]},{name:'Lower basin',color:'#4e9096',source:[riverX(3375),3375]}];
export function makeGrid(developed=false){
 const n=NX*NZ,z=new Float64Array(n),mask=new Uint8Array(n),land=new Uint8Array(n),soil=new Uint8Array(n),channel=new Uint8Array(n),zone=new Uint8Array(n);let area=0;
 for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){const k=j*NX+i,x=X0+(i+.5)*DX,y=Z0+(j+.5)*DX;z[k]=terrain(x,y);if(!inside(x,y))continue;mask[k]=1;area+=DX*DX;land[k]=landUse(x,y,developed);soil[k]=soilType(x,y);zone[k]=zoneAt(x,y);let c=channelDistance(x,y);channel[k]=c.d<(c.main?27:12)?1:0;}
 return {nx:NX,nz:NZ,dx:DX,x0:X0,z0:Z0,z,mask,land,soil,channel,zone,area};
}
const reservoir=(storage,input,dt,k)=>{const next=storage*Math.exp(-dt/k)+input*k*(1-Math.exp(-dt/k));return [next,Math.max(0,storage+input*dt-next)/dt];};
export function hydrology(options={}){
 const opts={rain:85,duration:6,wetness:'dry',development:false,pattern:'uniform',...options},grid=makeGrid(opts.development),dt=300,N=289;
 const zones=ZONES.map((v,id)=>({...v,area:0,impervious:0,fc:0,canopy:0,forest:0,deficit:opts.wetness==='wet'?3:20,soil:0,intercept:0,hill:0,reach:0}));
 for(let k=0;k<grid.mask.length;k++)if(grid.mask[k]){let q=zones[grid.zone[k]],a=DX*DX;q.area+=a;q.impervious+=[.02,.05,.72,.015][grid.land[k]]*a;q.fc+=[12,6,2.5][grid.soil[k]]*a;q.canopy+=[2.6,1.1,.5,1.8][grid.land[k]]*a;q.forest+=(grid.land[k]===0?a:0);}
 for(let q of zones){q.impervious/=q.area;q.fc=q.fc/q.area*(opts.infiltration??1);q.deficit*=opts.infiltration??1;q.canopy/=q.area;q.forest/=q.area;q.kh=(.42+.7*q.forest+.35*(1-q.impervious))*3600;}
 const time=Array.from({length:N},(_,i)=>i*dt/3600),rain=new Float64Array(N),q=new Float64Array(N),laterals=zones.map(()=>new Float64Array(N)),outletParts=zones.map(()=>new Float64Array(N));
 const rainShape=time.map(t=>t>0&&t<=opts.duration?Math.max(.1,1-Math.abs(t/opts.duration-.45)/.55):0),sum=rainShape.reduce((a,b)=>a+b,0);
 const spatial=opts.pattern==='headwaters'?[1.65,.65,.65]:[1,1,1],weight=zones.reduce((a,z,i)=>a+z.area*spatial[i],0)/grid.area;
 let rainVolume=0,evapVolume=0,generated=0,outVolume=0;
 const accounts=[];
 for(let i=0;i<N;i++){
  rain[i]=sum?rainShape[i]/sum*opts.rain/(dt/3600):0;
  for(let j=0;j<zones.length;j++){
   const a=zones[j],p=rain[i]*dt/3600*spatial[j]/weight;rainVolume+=p/1000*a.area;
   let capture=Math.min(p,Math.max(0,a.canopy-a.intercept));a.intercept+=capture;let through=p-capture;
   const pervious=through*(1-a.impervious),initial=Math.min(pervious,a.deficit);a.deficit-=initial;
   const infiltration=initial+Math.min(pervious-initial,a.fc*(1-a.impervious)*dt/3600);a.soil+=infiltration;
   const runoff=Math.max(0,through-infiltration);generated+=runoff/1000*a.area;
   // Small event-scale ET, removed only from water actually held in canopy/soil.
   let e=Math.min(a.intercept,.12*dt/3600);a.intercept-=e;let et=Math.min(a.soil,.08*dt/3600);a.soil-=et;evapVolume+=(e+et)/1000*a.area;
   let inflow=runoff/1000*a.area/dt;
   [a.hill,laterals[j][i]]=reservoir(a.hill,inflow,dt,a.kh);
   [a.reach,outletParts[j][i]]=reservoir(a.reach,laterals[j][i],dt,[1.15,.73,.4][j]*3600);
   q[i]+=outletParts[j][i];outVolume+=outletParts[j][i]*dt;
  }
  accounts.push({rain:rainVolume,evap:evapVolume,outflow:outVolume,soil:zones.reduce((s,a)=>s+a.soil/1000*a.area,0),canopy:zones.reduce((s,a)=>s+a.intercept/1000*a.area,0),hill:zones.reduce((s,a)=>s+a.hill,0),reach:zones.reduce((s,a)=>s+a.reach,0)});
 }
 const balance=accounts.at(-1),residual=balance.rain-Object.entries(balance).filter(([k])=>k!=='rain').reduce((s,[,v])=>s+v,0),peak=Math.max(...q),peakIndex=q.indexOf(peak);
 return {options:opts,time,q,rain,laterals,outletParts,zones:zones.map(({name,color,area,impervious,fc,canopy,kh,source})=>({name,color,area,impervious,fc,canopy,kh,source})),area:grid.area,peak,peakTime:time[peakIndex],peakIndex,balance,accounts,massError:residual,runoffFraction:generated/Math.max(1,rainVolume)};
}
export function hydraulics(hydro,options={},progress=()=>{}){
 const grid=makeGrid(hydro.options.development),{nx,nz,dx,mask,z,land,channel}=grid,N=nx*nz,A=dx*dx,g=9.81;
 const h=new Float64Array(N),fx=new Float64Array(N),fz=new Float64Array(N),out=new Float64Array(N),scale=new Float64Array(N),rough=new Float64Array(N),ux=new Float32Array(N),uz=new Float32Array(N);
 const roughness=options.roughness??1;
 for(let k=0;k<N;k++)if(mask[k]){rough[k]=channel[k]?.035:[.105,.055,.045,.095][land[k]]*roughness;h[k]=channel[k]?.02:0;}
 const initialVolume=h.reduce((s,v)=>s+v*A,0),sources=hydro.zones.map(a=>{const j=clamp(Math.floor((a.source[1]-grid.z0)/dx),0,nz-1),i=clamp(Math.floor((a.source[0]-grid.x0)/dx),0,nx-1);return j*nx+i;});
 const drain=[];for(let k=0;k<N;k++)if(mask[k]&&(k+nx>=N||!mask[k+nx])&&grid.z0+(Math.floor(k/nx)+.5)*dx>4100&&Math.abs(grid.x0+(k%nx+.5)*dx-center(4200))<110)drain.push(k);
 let t=0,inVolume=0,outVolume=0,nextSave=0,maxDepth=.15,steps=0;const end=24*3600,frames=[];
 const save=()=>{
  let wetArea=0,depthMax=0,speedMax=0,storage=0;
  for(let k=0;k<N;k++)if(mask[k]){
   storage+=h[k]*A;if(h[k]>.1){if(!channel[k])wetArea+=A;depthMax=Math.max(depthMax,h[k]);}
   ux[k]=h[k]>.1?((fx[k]+(k%nx>0?fx[k-1]:0))*.5/h[k]):0;
   uz[k]=h[k]>.1?((fz[k]+(k>=nx?fz[k-nx]:0))*.5/h[k]):0;
   if(h[k]>.1)speedMax=Math.max(speedMax,Math.hypot(ux[k],uz[k]));
  }
  frames.push({time:t/3600,h:Float32Array.from(h),ux:ux.slice(),uz:uz.slice(),wetArea,depthMax,speedMax,storage});
  if(frames.length%8===0)progress(t/end);
 };
 save();nextSave=900;
 while(t<end-.001){
  const toInput=300-(t%300);
  const dt=Math.min(7,.32*dx/Math.sqrt(g*Math.max(.15,maxDepth)),end-t,nextSave>t?nextSave-t:7,toInput<1e-7?300:toInput);maxDepth=0;
  const hi=Math.min(hydro.time.length-1,Math.ceil((t+dt*.5)/300));
  for(let s=0;s<sources.length;s++){let v=hydro.laterals[s][hi]*dt;h[sources[s]]+=v/A;inVolume+=v;}
  out.fill(0);
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
   const k=j*nx+i;if(!mask[k])continue;
   for(let axis=0;axis<2;axis++){
    const m=k+(axis?nx:1),valid=axis?j<nz-1:i<nx-1,flux=axis?fz:fx;
    if(!valid||!mask[m]){flux[k]=0;continue;}
    const eta=z[k]+h[k],eta2=z[m]+h[m],hf=Math.max(eta,eta2)-Math.max(z[k],z[m]);
    if(hf<.0001){flux[k]=0;continue;}
    const n=(rough[k]+rough[m])/2;
    const cross=axis?fx:fz,flowMagnitude=Math.hypot(flux[k],.5*(cross[k]+cross[m]));
    flux[k]=(flux[k]-g*hf*dt*(eta2-eta)/dx)/(1+g*n*n*dt*flowMagnitude/Math.pow(hf,7/3));
    const donor=flux[k]>0?k:m;out[donor]+=Math.abs(flux[k])*dx;
   }
  }
  for(const k of drain){fz[k]=Math.pow(h[k],5/3)/rough[k]*Math.sqrt(.00045);out[k]+=fz[k]*dx;}
  for(let k=0;k<N;k++)scale[k]=out[k]>0?Math.min(1,h[k]*A/(dt*out[k])):1;
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
   const k=j*nx+i;if(!mask[k])continue;
   for(let axis=0;axis<2;axis++){
    const m=k+(axis?nx:1),valid=axis?j<nz-1:i<nx-1,flux=axis?fz:fx;
    if(!valid||!mask[m])continue;
    flux[k]*=scale[flux[k]>0?k:m];const dh=flux[k]*dt/dx;h[k]-=dh;h[m]+=dh;
   }
  }
  for(const k of drain){fz[k]*=scale[k];const v=fz[k]*dx*dt;h[k]-=v/A;outVolume+=v;}
  for(let k=0;k<N;k++){if(h[k]<0&&h[k]>-1e-10)h[k]=0;maxDepth=Math.max(maxDepth,h[k]);if(!Number.isFinite(h[k])||h[k]<0)throw new Error('Hydraulic solver lost numerical stability.');}
  t+=dt;steps++;if(steps>50000)throw new Error(`Hydraulic step limit at ${t.toFixed(3)} s; depth ${maxDepth.toFixed(3)} m; dt ${dt}.`);if(t>=nextSave-.001){save();nextSave+=900;}
 }
 const finalVolume=h.reduce((s,v)=>s+v*A,0),massError=initialVolume+inVolume-outVolume-finalVolume;
 const peakFrame=frames.reduce((b,f,i)=>f.wetArea>frames[b].wetArea?i:b,0);
 progress(1);
 return {grid,frames,peakFrame,initialVolume,inVolume,outVolume,finalVolume,massError,steps,options:{roughness},scheme:'local-inertial shallow-water approximation'};
}
