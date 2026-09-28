import * as THREE from 'three';
import {terrain,bed,inside,clamp,DX,X0,Z0,NX,NZ} from './model.mjs';
let patches;
function buildPatches(){
 const all=[];
 for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
  const k=j*NX+i,x=X0+i*DX,z=Z0+j*DX;
  if(!inside(x+25,z+25)||terrain(x+25,z+25)-bed(z+25)>10)continue;
  for(let b=0;b<4;b++)for(let a=0;a<4;a++){
   const v=[[a,b],[a+1,b],[a,b+1],[a+1,b+1]].map(([u,v])=>{const px=x+u*12.5,pz=z+v*12.5;return{x:px,z:pz,relief:terrain(px,pz)-bed(pz)};});
   all.push({k,tri:[v[0],v[2],v[1]]},{k,tri:[v[1],v[2],v[3]]});
  }
 }return all;
}
export function drawIllustratedFlood(group,result,frame,mode,buildings=[]){
 patches??=buildPatches();const pos=[],colors=[],c=new THREE.Color(),a=new THREE.Color(),b=new THREE.Color();
 for(const p of patches){if(!frame.connected[p.k])continue;let poly=[],last=p.tri.at(-1),ld=frame.stage-last.relief-.1;
  // Clip the water edge to the terrain, instead of floating square tiles above banks.
  for(const v of p.tri){const d=frame.stage-v.relief-.1;if((d>0)!==(ld>0)){const t=ld/(ld-d);poly.push({x:last.x+(v.x-last.x)*t,z:last.z+(v.z-last.z)*t,relief:last.relief+(v.relief-last.relief)*t});}if(d>0)poly.push(v);last=v;ld=d;}
  if(poly.length<3)continue;
  for(let i=1;i<poly.length-1;i++)for(const v of [poly[0],poly[i],poly[i+1]]){
   const h=Math.max(.1,frame.stage-v.relief),eta=bed(v.z)+frame.stage,speed=Math.hypot(frame.ux[p.k],frame.uz[p.k]);
   if(mode==='extent')c.set('#399ba6');
   else if(mode==='height'){c.set('#cadf9d').lerp(a.set('#348fa1'),clamp((eta-6)/6,0,1)).lerp(b.set('#4c4277'),clamp((eta-12)/6,0,1));}
   else if(mode==='velocity')c.set('#bce3c3').lerp(a.set('#137f88'),clamp(speed,0,1)).lerp(b.set('#e5b35f'),clamp(speed-1,0,1));
   else c.set('#a2d7cb').lerp(a.set('#268c9d'),clamp(h/1.5,0,1)).lerp(b.set('#314e85'),clamp((h-1.5)/1.5,0,1));
   pos.push(v.x/50,(eta+.07)/14,(v.z-2100)/50);colors.push(c.r,c.g,c.b);
  }
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.88,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));mesh.renderOrder=3;group.add(mesh);
 if(result.originalFrame&&Math.abs(result.originalFrame.stage-frame.stage)>.03){
  const original=result.originalFrame,edge=[];
  for(const p of patches){if(!original.connected[p.k])continue;let intersections=[],last=p.tri.at(-1),ld=original.stage-last.relief-.1;
   for(const v of p.tri){const d=original.stage-v.relief-.1;if((d>0)!==(ld>0)){const t=ld/(ld-d),x=last.x+(v.x-last.x)*t,z=last.z+(v.z-last.z)*t;intersections.push(new THREE.Vector3(x/50,(Math.max(terrain(x,z),bed(z)+frame.stage)+.2)/14,(z-2100)/50));}last=v;ld=d;}
   if(intersections.length===2)edge.push(...intersections);
  }
  if(edge.length){const line=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(edge),new THREE.LineDashedMaterial({color:'#f5cb72',dashSize:.25,gapSize:.13,transparent:true,opacity:.98,depthTest:false,depthWrite:false,toneMapped:false}));line.computeLineDistances();line.renderOrder=6;group.add(line);}
  for(const p of buildings){const k=Math.floor((p.z-Z0)/DX)*NX+Math.floor((p.x-X0)/DX);if(!frame.connected[k]||bed(p.z)+frame.stage-p.ground<=.1||original.connected[k]&&bed(p.z)+original.stage-p.ground>.1)continue;
   const h=(bed(p.z)+frame.stage+.3)/14,pts=[[-1,-1],[-1,1],[1,1],[1,-1]].map(([a,b])=>new THREE.Vector3((p.x+a*(p.width/2+8))/50,h,(p.z+b*(p.length/2+8)-2100)/50));const line=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#c96942',depthTest:false,toneMapped:false}));line.renderOrder=7;group.add(line);
  }
 }
}
