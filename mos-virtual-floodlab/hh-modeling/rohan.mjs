import * as THREE from 'three';
import {terrain,bed,riverX,inside,center,width,landUse,channelDistance} from './model.mjs';

// Original miniature timber settlements, inspired by a horse-country landscape.
// Decorative architecture does not change the teaching model's terrain or resistance.
export function buildRohan(w){
 w.buildingSites=[];
 const part=(...args)=>w.part(...args), rand=()=>w.rand();
 const g=new THREE.BufferGeometry();
 const v=[-.5,0,-.5,.5,0,-.5,0,1,-.5, -.5,0,.5,0,1,.5,.5,0,.5, -.5,0,-.5,0,1,-.5,0,1,.5, -.5,0,-.5,0,1,.5,-.5,0,.5, .5,0,-.5,.5,0,.5,0,1,.5, .5,0,-.5,0,1,.5,0,1,-.5];
 for(let i=0;i<v.length;i+=9)for(let j=0;j<3;j++){const t=v[i+3+j];v[i+3+j]=v[i+6+j];v[i+6+j]=t;}g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();w.geos.gable=g;
 const road=[[[340,1200],[470,1550],[475,1920],[520,2220],[590,2480],[430,2830],[285,3270],[130,3770]], [[-1020,2450],[-720,2340],[-310,2450],[80,2480],[450,2440],[860,2270],[1050,2120]], [[-720,3380],[-460,3120],[-330,2800],[-300,2470],[-380,2080]], [[270,1810],[740,1920]], [[305,2130],[790,2170]], [[-680,2990],[-200,3090]]];w.roadLines=road;
 for(const r of road){const p=w.interpolate(r,8),deck=(x,z)=>{const d=channelDistance(x,z);return d.d<(d.main?67:38)?Math.max(terrain(x,z),bed(z)+(d.main?2.8:1.55)):terrain(x,z);};w.ribbon(p,22,'#b3a888',.14,deck);w.ribbon(p,13,'#d1c29c',.17,deck);}
 const occupied=[],hearths=[[540,2250],[-440,3040],[-640,1810],[678,2155]];
 const house=(x,z,ww=25,ll=34,hh=8,hall=false)=>{
  occupied.push([x,z]);
  w.buildingSites.push({x,z,ground:terrain(x,z),width:ww,length:ll});
  const y=terrain(x,z),wood=hall?'#745336':'#927557',roof=hall?'#c3a457':['#b5a071','#cab17b','#a99872'][Math.floor(rand()*3)];
  part('box',x,z,y+.65,ww+5,1.3,ll+5,'#a8a18b');part('box',x,z,y+hh/2+1,ww,hh,ll,'#d4c499');
  part('gable',x,z,y+hh+1,ww+8,hh*.72,ll+9,roof);
  for(const dx of [-ww/2,0,ww/2])part('box',x+dx,z-ll/2-.4,y+hh/2+1,1.9,hh,1.4,wood);
  for(const dz of [-ll/2,ll/2]){part('box',x,z+dz,y+hh*.65,ww+2,1.2,1.2,wood);part('box',x,z+dz,y+hh+1,ww+3,1.3,1.3,wood);}
  part('box',x,z-ll/2-1,y+hh*.3,ww*.2,hh*.6,1.5,'#4c4232');
  for(const dx of [-.3,.3])part('box',x+dx*ww,z-ll/2-.9,y+hh*.57,ww*.13,hh*.25,.5,'#9d7946');
  part('box',x+ww*.29,z+ll*.22,y+hh+4,3,8,4,'#8b8775');
  if(hall){for(const dz of [-ll*.53,ll*.53]){part('trunk',x,z+dz,y+hh*1.8,2.5,hh*.7,2.5,'#c6ab65');part('leaf',x,z+dz-2,y+hh*2.12,5,3,6,'#c6ab65');}for(let j=0;j<4;j++)part('box',x,z-ll/2-6-j*4,y+.3+j*.35,ww*.65,1,5,'#bfb69a');}
 };
 // Wooded ridges and riparian trees leave the streams readable.
 for(let i=0;i<2200;i++){const z=90+rand()*3970,x=center(z)+(rand()-.5)*width(z)*1.88;if(!inside(x,z))continue;const l=landUse(x,z),d=channelDistance(x,z).d;if(d<39||l===2||w.nearRoad(x,z)<24||l===1&&rand()>.10||Math.hypot(x-680,z-1910)<145||((x-810)/110)**2+((z-2180)/140)**2<1)continue;const h=terrain(x,z),size=10+rand()*12;part('trunk',x,z,h+size*.35,2,size*.7,2,'#736548');part('leaf',x,z,h+size*.87,size*.67,size*.7,size*.67,['#608360','#82965f','#527862','#92a370'][i%4],rand()*3);}
 const towns=[{x:505,z:2200,rx:245,rz:345,n:76},{x:-440,z:3080,rx:190,rz:220,n:34},{x:-630,z:1830,rx:115,rz:125,n:15}];
 for(const t of towns)for(let i=0;i<t.n*3;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand()),x=t.x+Math.cos(a)*r*t.rx,z=t.z+Math.sin(a)*r*t.rz;if(channelDistance(x,z).d<63||w.nearRoad(x,z)<25||Math.hypot(x-680,z-1910)<125||occupied.some(([ox,oz])=>Math.hypot(x-ox,z-oz)<46)||hearths.some(([fx,fz])=>Math.hypot(x-fx,z-fz)<35)||((x+540)/105)**2+((z-3150)/125)**2<1)continue;house(x,z,22+rand()*12,26+rand()*18,6+rand()*5);}
 // The Golden Hall, its forecourt, hill gate, and green-and-gold standards.
 house(680,1910,83,122,23,true);house(774,2040,38,70,10);house(650,2100,32,63,10);
 const fence=(cx,cz,rx,rz,n=80,gate=false)=>{for(let i=0;i<n;i++){const a=i/n*Math.PI*2;if(gate&&a>1.35&&a<1.78)continue;const x=cx+rx*Math.cos(a),z=cz+rz*Math.sin(a),y=terrain(x,z);part('trunk',x,z,y+4,3,8,3,'#857250');part('cone',x,z,y+8.8,1.8,2,1.8,'#a69668');const b=(i+1)/n*Math.PI*2,bx=cx+rx*Math.cos(b),bz=cz+rz*Math.sin(b),dist=Math.hypot(bx-x,bz-z);part('box',(x+bx)/2,(z+bz)/2,y+3,dist+2,1.2,1.2,'#8b7957',-Math.atan2(bz-z,bx-x));}};
 fence(680,1950,139,198,110,true);fence(810,2180,93,120,58);fence(-540,3150,80,95,44);
 for(const [x,z]of [[645,2144],[711,2144]]){const y=terrain(x,z);part('box',x,z,y+8,14,16,14,'#9b8863');part('gable',x,z,y+16,21,7,21,'#b4a375');}
 for(const [x,z]of [[625,1848],[735,1848],[-435,3035],[630,2150]]){const y=terrain(x,z);part('trunk',x,z,y+13,1.6,26,1.6,'#7c7258');part('box',x+6,z,y+23,12,9,.6,'#355b4a');part('box',x+6,z-.45,y+23,2.5,5,.3,'#dbc987');}
 // Raised plank bridges: main creek and tributary crossings.
 for(const [x,z,len,angle]of [[riverX(2480),2480,146,0],[493,1855,95,.48],[-520,2775,96,-.6]]){const d=channelDistance(x,z),y=bed(z)+(d.main?3:1.75);part('box',x,z,y,len,.8,18,'#9f8963',angle);for(let n=-len/2;n<len/2;n+=8){const px=x+n*Math.cos(angle),pz=z-n*Math.sin(angle);part('box',px,pz,y+.48,1,.12,18,'#c3b18b',angle);}for(const sign of [-1,1])part('box',x+Math.sin(angle)*sign*10,z+Math.cos(angle)*sign*10,y+1.6,len,1.2,1.3,'#b6a578',angle);}
 for(const [x,z]of [[-680,1840],[840,2790],[-720,2770]]){house(x,z,38,53,9);for(let j=0;j<5;j++)for(let k=0;k<6;k++){const px=x+65+k*16,pz=z-40+j*20;part('leaf',px,pz,terrain(px,pz)+4,5,6,5,'#7a945b');}}
 for(const[x,z]of hearths)part('trunk',x,z,terrain(x,z)+.12,40,.25,40,'#b7aa87');
 w.villageLife=new VillageLife(w,hearths);
}

function softTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(235,229,209,.65)');g.addColorStop(.4,'rgba(219,216,202,.35)');g.addColorStop(1,'rgba(210,210,200,0)');c.fillStyle=g;c.fillRect(0,0,64,64);return new THREE.CanvasTexture(canvas);}
class VillageLife{
 constructor(w,fires){this.w=w;this.horses=[];this.fires=[];const box=new THREE.BoxGeometry(1,1,1),sphere=new THREE.IcosahedronGeometry(1,1),smoke=softTexture();
  for(let i=0;i<19;i++){const group=new THREE.Group(),coat=['#9a6c42','#ddd4b8','#564238','#b38a60'][i%4],mat=new THREE.MeshStandardMaterial({color:coat,roughness:1});const add=(geo,x,y,z,sx,sy,sz,color)=>{const m=new THREE.Mesh(geo,color?new THREE.MeshStandardMaterial({color}):mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;group.add(m);return m;};
   add(sphere,0,.24,0,.16,.12,.30);const neck=add(box,0,.38,-.23,.11,.27,.13);neck.rotation.x=-.45;add(box,0,.51,-.31,.13,.13,.22);add(box,0,.40,-.16,.035,.21,.1,'#4b4032');add(box,0,.55,-.28,.16,.08,.04);const legs=[];for(const x of [-.1,.1])for(const z of [-.19,.19])legs.push(add(box,x,.105,z,.045,.23,.055));const tail=add(box,0,.2,.32,.04,.23,.04,'#4b4032');tail.rotation.x=.4;this.w.scene.add(group);const main=i<12;this.horses.push({group,legs,x:main?810:-540,z:main?2180:3150,a:i*1.37,r:35+(i%4)*11});
  }
  for(const [x,z]of fires){const y=terrain(x,z),group=new THREE.Group();group.position.set(x/50,y/14,(z-2100)/50);w.scene.add(group);const ring=new THREE.Mesh(new THREE.TorusGeometry(.15,.04,5,12),new THREE.MeshStandardMaterial({color:'#7c7767'}));ring.rotation.x=Math.PI/2;ring.position.y=.035;group.add(ring);const flame=new THREE.Mesh(new THREE.ConeGeometry(.11,.4,6),new THREE.MeshBasicMaterial({color:'#e99a39'}));flame.position.y=.24;group.add(flame);const core=new THREE.Mesh(new THREE.ConeGeometry(.067,.28,5),new THREE.MeshBasicMaterial({color:'#fff0a2'}));core.position.y=.2;group.add(core);const puffs=[];for(let i=0;i<5;i++){const p=new THREE.Sprite(new THREE.SpriteMaterial({map:smoke,transparent:true,opacity:.3,depthWrite:false}));group.add(p);puffs.push(p);}this.fires.push({flame,core,puffs});}
 }
 update(t){for(const h of this.horses){const a=h.a+t*.045,x=h.x+Math.cos(a)*h.r,z=h.z+Math.sin(a)*h.r*.8;h.group.position.set(x/50,terrain(x,z)/14,(z-2100)/50);h.group.rotation.y=-a;h.legs.forEach((leg,i)=>leg.rotation.x=Math.sin(t*4+i%2*Math.PI+Math.floor(i/2)*Math.PI)*.24);}
  this.fires.forEach((f,j)=>{f.flame.scale.set(.9+.14*Math.sin(t*9+j),.85+.2*Math.sin(t*11+j),1);f.core.scale.y=.9+.14*Math.cos(t*8);f.puffs.forEach((p,i)=>{const u=(t*.18+i/5)%1;p.position.set(Math.sin(t*.3+i)*u*.17+u*.25,.3+u*1.3,0);p.scale.setScalar(.14+u*.45);p.material.opacity=(1-u)*.36;});});
 }
}
