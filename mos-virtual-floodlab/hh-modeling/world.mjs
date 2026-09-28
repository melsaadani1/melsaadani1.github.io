import {ProcessEffects} from './process-effects.mjs';
import {drawIllustratedFlood} from './flood-surface.mjs';
import * as THREE from 'three';
import {buildRohan} from './rohan.mjs';
import {WaterEffects} from './water-effects.mjs';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {LENGTH,inside,width,center,riverX,terrain,bed,streams,channelDistance,landUse,zoneAt,ZONES,clamp,DX,X0,Z0,NX,NZ} from './model.mjs';
const XS=50,YS=14;
const point=(x,z,extra=0)=>new THREE.Vector3(x/XS,(terrain(x,z)+extra)/YS,(z-2100)/XS);
const palette={land:['#7b9871','#b4b887','#b8ad95','#769b8b'],height:['#608776','#ced0a0'],rain:['#adcaba','#348994','#273c72']};
export class WatershedWorld{
 constructor(host,onInspect){
  this.host=host;this.onInspect=onInspect;this.layer='landscape';this.process='none';this.development=false;this.phase='watershed';this.frame=null;this.showLabels=true;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#e5eade');this.scene.fog=new THREE.Fog('#e5eade',135,290);
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.23;host.prepend(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','Interactive three-dimensional Rohan Creek watershed. Drag to pan, right-drag to orbit, or use the camera buttons.');
  this.camera=new THREE.PerspectiveCamera(36,1,.1,600);this.camera.position.set(57,58,69);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,1,-1);this.controls.enableDamping=true;this.controls.dampingFactor=.08;this.controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.ROTATE,RIGHT:THREE.MOUSE.ROTATE};this.controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_ROTATE};this.controls.minDistance=14;this.controls.maxDistance=210;this.controls.maxPolarAngle=Math.PI*.465;
  this.renderer.toneMappingExposure=1.02;this.scene.add(new THREE.HemisphereLight('#fff8e9','#6d8876',1.85));const sun=new THREE.DirectionalLight('#fff5dc',2.25);sun.position.set(-55,100,35);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-70;sun.shadow.camera.right=70;sun.shadow.camera.top=75;sun.shadow.camera.bottom=-75;sun.shadow.camera.near=.1;sun.shadow.camera.far=260;sun.shadow.normalBias=.035;this.scene.add(sun);
  this.root=new THREE.Group();this.scene.add(this.root);this.batches=new Map();this.dummy=new THREE.Object3D();this.seed=73019;
  this.geos={box:new THREE.BoxGeometry(1,1,1),leaf:new THREE.IcosahedronGeometry(1,1),cone:new THREE.ConeGeometry(1,1,7),trunk:new THREE.CylinderGeometry(.5,.65,1,6),roof:new THREE.CylinderGeometry(.001,.72,1,4)};
  this.buildTerrain();this.buildStreams();buildRohan(this);this.flush();this.buildMesh();this.buildMarkers();this.processEffects=new ProcessEffects(this);
  this.floodGroup=new THREE.Group();this.scene.add(this.floodGroup);this.waterEffects=new WaterEffects(this);this.showInflows=false;
  this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.down=null;
  this.renderer.domElement.addEventListener('pointerdown',e=>{this.down=[e.clientX,e.clientY];});
  this.renderer.domElement.addEventListener('pointerup',e=>{if(e.button!==0||!this.down||Math.hypot(e.clientX-this.down[0],e.clientY-this.down[1])>5)return;const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hit=this.ray.intersectObject(this.ground)[0];if(hit){const x=hit.point.x*XS,z=hit.point.z*XS+2100;this.inspect(x,z);}});
  this.renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
  new ResizeObserver(()=>this.resize()).observe(host);this.resize();this.lastTime=0;this.animate=ms=>{this.loop(ms);this.raf=requestAnimationFrame(this.animate);};this.raf=requestAnimationFrame(this.animate);
 }
 rand(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
 part(type,x,z,y,sx,sy,sz,color,rotation=0){const key=type;if(!this.batches.has(key))this.batches.set(key,[]);this.dummy.position.set(x/XS,y/YS,(z-2100)/XS);this.dummy.scale.set(sx/XS,sy/YS,sz/XS);this.dummy.rotation.set(0,rotation,0);this.dummy.updateMatrix();this.batches.get(key).push([this.dummy.matrix.clone(),color]);}
 flush(){for(const [type,parts]of this.batches){const mesh=new THREE.InstancedMesh(this.geos[type],new THREE.MeshStandardMaterial({roughness:.95}),parts.length);parts.forEach(([m,c],i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,new THREE.Color(c));});mesh.castShadow=true;mesh.receiveShadow=true;this.root.add(mesh);}this.batches.clear();}
 buildTerrain(){
  const pos=[],colors=[],indices=[];this.coords=[];const step=12.5,nx=257,nz=337;
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=-1600+i*step,z=j*step,p=point(x,z);pos.push(...p);this.coords.push([x,z]);colors.push(1,1,1);}
  for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const k=j*nx+i,x=-1600+(i+.5)*step,z=(j+.5)*step;if(inside(x,z))indices.push(k,k+nx,k+1,k+1,k+nx,k+nx+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
  this.ground=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));this.ground.receiveShadow=true;this.root.add(this.ground);this.paint();
  const ring=[];for(let j=0;j<=140;j++){let z=j/140*LENGTH;ring.push([center(z)-width(z),z]);}for(let j=140;j>=0;j--){let z=j/140*LENGTH;ring.push([center(z)+width(z),z]);}
  const edges=ring.map(([x,z])=>point(x,z,.3));this.root.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(edges),new THREE.LineBasicMaterial({color:'#e2d7a2',transparent:true,opacity:.92})));
  this.boundary=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ring.map(([x,z])=>point(x,z,1.3))),new THREE.LineDashedMaterial({color:'#ecdc9e',dashSize:.4,gapSize:.2}));this.boundary.computeLineDistances();this.root.add(this.boundary);
  for(let band=0;band<3;band++){const vertices=[];for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],p=point(...a),q=point(...b),lo=-.85+band*.35,pa=band===2?p.y:lo+.35,pb=band===2?q.y:lo+.35;vertices.push(p.x,lo,p.z,q.x,lo,q.z,q.x,pb,q.z,p.x,lo,p.z,q.x,pb,q.z,p.x,pa,p.z);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();this.root.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:['#a29276','#b5a587','#c8ba97'][band],side:THREE.DoubleSide,roughness:1})));}
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(600,600),new THREE.MeshStandardMaterial({color:'#e5eade',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.02;floor.receiveShadow=true;this.scene.add(floor);
 }
 paint(){const cs=this.ground?.geometry.attributes.color;if(!cs)return;const c=new THREE.Color();for(let i=0;i<this.coords.length;i++){const[x,z]=this.coords[i],l=landUse(x,z,this.development),d=channelDistance(x,z),h=terrain(x,z)-bed(z),noise=Math.sin(x*.017)*Math.cos(z*.013)*.025;
   if(this.layer==='terrain'){const ramp=['#648671','#a8b77b','#e2c178','#ba8867','#877478','#e8ded0'],stops=[6,10,18,35,70,156],v=terrain(x,z);let k=0;while(k<4&&v>stops[k+1])k++;c.set(ramp[k]).lerp(new THREE.Color(ramp[k+1]),clamp((v-stops[k])/(stops[k+1]-stops[k]),0,1));}
   else if(this.layer==='rainfall'){c.set(this.pattern==='headwaters'&&zoneAt(x,z)===0?'#385873':'#5d9fac');}
   else if(this.layer==='landuse')c.set(['#68ab5f','#ab6c28','#dec5c5','#b8d9eb'][l]);
   else {c.set(palette.land[l]);if(this.layer==='landscape'&&l===1){const patch=(Math.floor((x+z*.14)/185)+Math.floor((z-x*.08)/220)*3)%5;c.lerp(new THREE.Color(['#c4b98a','#a4af79','#c6c491','#a6b88b','#bead78'][Math.abs(patch)]),.52);}if(d.d<(d.main?60:32))c.lerp(new THREE.Color('#9da78c'),.55);}
   c.offsetHSL(0,0,noise);cs.setXYZ(i,c.r,c.g,c.b);
  }cs.needsUpdate=true;
 }
 ribbon(points,width,color,offset=.13,heightFn=terrain){const vertices=[],idx=[];for(let i=0;i<points.length;i++){const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],p=points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz)||1;for(const s of [-1,1]){const x=p[0]-dz/len*width/2*s,z=p[1]+dx/len*width/2*s;vertices.push(x/XS,(heightFn(x,z)+offset)/YS,(z-2100)/XS);}if(i){const k=i*2;idx.push(k-2,k-1,k,k-1,k+1,k);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(idx);g.computeVertexNormals();const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.86}));m.receiveShadow=true;this.root.add(m);return m;}
 interpolate(points,step=18){const out=[];for(let j=1;j<points.length;j++){const a=points[j-1],b=points[j],n=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/step);for(let i=0;i<n;i++)out.push([a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n]);}out.push(points.at(-1));return out;}
 bankStrip(points,inner,outer,color){const pos=[],ix=[];for(const sign of [-1,1]){const base=pos.length/3;for(let i=0;i<points.length;i++){const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],[x,z]=points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz)||1;for(const r of [inner,outer]){const px=x-dz/len*r*sign,pz=z+dx/len*r*sign;pos.push(...point(px,pz,.055));}if(i){const k=base+i*2;ix.push(k-2,k-1,k,k-1,k+1,k);}}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(ix);g.computeVertexNormals();const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:1}));mesh.receiveShadow=true;this.root.add(mesh);}
 buildStreams(){
  for(const s of streams){const p=this.interpolate(s.points,8);
   this.bankStrip(p,s.main?39:23,s.main?54:34,'#90a27b');
   this.bankStrip(p,s.main?26.5:11,s.main?39:23,'#b2ad8c');
   this.bankStrip(p,s.main?21.5:7.5,s.main?26.5:11,'#718e81');
   this.ribbon(p,s.main?43:15,s.main?'#3b8393':'#649fa6',.18,(_,z)=>bed(z));
   this.ribbon(p,s.main?22:5,s.main?'#357c90':'#4b8f9d',.20,(_,z)=>bed(z));
   for(let i=3;i<p.length-3;i+=s.main?5:3){const[x,z]=p[i],[ax,az]=p[i-1],[bx,bz]=p[i+1],dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz)||1;
    for(const sign of [-1,1]){const bank=(s.main?30:15)+this.rand()*9,px=x-dz/len*bank*sign,pz=z+dx/len*bank*sign;if(!inside(px,pz))continue;const y=terrain(px,pz);
     if(i%2){this.part('leaf',px,pz,y+.35,3+this.rand()*3,1.2,3,'#b8b59f');}
     else for(let j=0;j<3;j++)this.part('trunk',px+j*1.5,pz-j*.6,y+1.3,.5,2.6,.5,'#89935a');
    }
   }
  }
 }
 nearRoad(x,z){let best=1e6;for(const points of this.roadLines??[])for(let i=1;i<points.length;i++){const[a,b]=points[i-1],[c,d]=points[i],dx=c-a,dz=d-b,t=clamp(((x-a)*dx+(z-b)*dz)/(dx*dx+dz*dz),0,1);best=Math.min(best,Math.hypot(x-a-dx*t,z-b-dz*t));}return best;}
 buildMesh(){const pts=[];for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){const x=X0+i*DX,z=Z0+j*DX;if(!inside(x+DX/2,z+DX/2))continue;for(const[a,b,c,d]of [[x,z,x+DX,z],[x,z,x,z+DX]])if(inside(a,b)&&inside(c,d))pts.push(point(a,b,.8),point(c,d,.8));}this.meshLines=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#536e72',transparent:true,opacity:.34}));this.meshLines.visible=false;this.root.add(this.meshLines);}
 buildMarkers(){
  this.markers=[{name:'Fern ridge',x:-590,z:920},{name:'Rohan · Golden Hall',x:680,z:1910},{name:'Westfold',x:-450,z:3060},{name:'Fernstead',x:-640,z:1810},{name:'Horse pastures',x:810,z:2180},{name:'Floodplain meadows',x:160,z:3450},{name:'ONE OUTLET',x:center(4200),z:4145,kind:'outlet'},...ZONES.map((s,i)=>({name:['Headwater inflow','Eastern inflow','Lower-basin inflow'][i],x:s.source[0],z:s.source[1],kind:'inflow'}))];
  this.markerHost=document.createElement('div');this.markerHost.className='map-labels';this.host.append(this.markerHost);
  for(const m of this.markers){m.el=document.createElement('button');m.el.className='map-label '+(m.kind??'');m.el.textContent=m.name;m.el.type='button';m.el.onclick=()=>{this.fly(m.x,m.z,m.name==='Horse pastures'?12:m.name.includes('Hall')?19:30);this.inspect(m.x,m.z,m.name);};this.markerHost.append(m.el);}
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.65,.07,8,32),new THREE.MeshBasicMaterial({color:'#e7c080'}));ring.rotation.x=-Math.PI/2;ring.position.copy(point(center(4200),4155,1));this.root.add(ring);
  this.pick=new THREE.Mesh(new THREE.TorusGeometry(.35,.045,8,24),new THREE.MeshBasicMaterial({color:'#fcf8da'}));this.pick.rotation.x=-Math.PI/2;this.pick.visible=false;this.root.add(this.pick);
 }
 inspect(x,z,name='Selected location'){if(!inside(x,z))return;this.pick.position.copy(point(x,z,1.1));this.pick.visible=true;this.onInspect?.({x,z,name,land:landUse(x,z,this.development),height:terrain(x,z),index:clamp(Math.floor((z-Z0)/DX),0,NZ-1)*NX+clamp(Math.floor((x-X0)/DX),0,NX-1)});}
 setLayer(layer){this.layer=layer;this.meshLines.visible=layer==='mesh';this.paint();}
 setProcess(process){this.process=process;this.processEffects.set(process);}
 setPhase(phase){this.phase=phase;this.floodGroup.visible=phase==='hydraulics';for(const m of this.markers)m.el.hidden=m.kind==='inflow'&&!this.showInflows;}
 setData(hydro){this.development=hydro.options.development;this.pattern=hydro.options.pattern;this.waterEffects?.setData(hydro.options);this.paint();}
 setFlood(result,frameIndex=0,mode='depth'){
  this.result=result;this.frame=result?.frames[frameIndex];if(!this.frame)return;this.waterEffects?.setFrame(result,this.frame,mode);
  for(const child of [...this.floodGroup.children]){child.geometry?.dispose();child.material?.dispose();this.floodGroup.remove(child);}
  if(result.illustrative){drawIllustratedFlood(this.floodGroup,result,this.frame,mode,this.buildingSites);return;}
  const f=this.frame,pos=[],colors=[],arrows=[],c=new THREE.Color();
  for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){const k=j*NX+i,d=f.h[k];if(!result.grid.mask[k]||d<=.1)continue;const x=X0+i*DX,z=Z0+j*DX,speed=Math.hypot(f.ux[k],f.uz[k]);
   if(mode==='velocity')c.set('#bce3c3').lerp(new THREE.Color('#137f88'),clamp(speed/.65,0,1)).lerp(new THREE.Color('#e5b35f'),clamp((speed-.65)/.8,0,1));else if(mode==='extent')c.set('#399ba6');else c.set('#a2d7cb').lerp(new THREE.Color('#268c9d'),clamp(d/.65,0,1)).lerp(new THREE.Color('#314e85'),clamp((d-.65)/1.2,0,1));
   for(const [a,b]of [[0,0],[0,1],[1,0],[1,0],[0,1],[1,1]]){const px=x+a*DX,pz=z+b*DX;pos.push(px/XS,(terrain(px,pz)+(mode==='extent'?.32:d+.22))/YS,(pz-2100)/XS);colors.push(c.r,c.g,c.b);}
   if(mode==='velocity'&&i%2===0&&j%2===0&&speed>.025){const p=point(x+DX/2,z+DX/2,d+.6),dx=f.ux[k]/speed,dz=f.uz[k]/speed,len=.4+clamp(speed,0,1)*.4;arrows.push(p.clone().add(new THREE.Vector3(-dx*len/2,0,-dz*len/2)),p.clone().add(new THREE.Vector3(dx*len/2,0,dz*len/2)),p.clone().add(new THREE.Vector3(dx*len/2,0,dz*len/2)),p.clone().add(new THREE.Vector3(dx*len*.1+dz*.13,0,dz*len*.1-dx*.13)),p.clone().add(new THREE.Vector3(dx*len/2,0,dz*len/2)),p.clone().add(new THREE.Vector3(dx*len*.1-dz*.13,0,dz*len*.1+dx*.13)));}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.88,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));mesh.renderOrder=3;this.floodGroup.add(mesh);
  if(arrows.length)this.floodGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(arrows),new THREE.LineBasicMaterial({color:'#163f4c',transparent:true,opacity:.95,toneMapped:false})));
 }
 resize(){const{clientWidth:w,clientHeight:h}=this.host;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();const fit=Math.max(1,1.35/this.camera.aspect),ratio=fit/(this.viewportFit??1);this.camera.position.sub(this.controls.target).multiplyScalar(ratio).add(this.controls.target);this.viewportFit=fit;}
 home(){this.moveTo(new THREE.Vector3(57,58,69).multiplyScalar(this.viewportFit??1),new THREE.Vector3(0,1,-1));}
 top(){this.moveTo(new THREE.Vector3(0,120,3).multiplyScalar(this.viewportFit??1),new THREE.Vector3(0,0,0));}
 fly(x,z,d=45){const p=point(x,z);this.moveTo(p.clone().add(new THREE.Vector3(d*.75,d*.85,d*.8)),p);}
 moveTo(camera,target){this.tween={start:performance.now(),from:this.camera.position.clone(),to:camera,old:this.controls.target.clone(),target};}
 zoom(factor){this.camera.position.sub(this.controls.target).multiplyScalar(factor).add(this.controls.target);}
 rotate(){const p=this.camera.position.clone().sub(this.controls.target);p.applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/6);this.camera.position.copy(p.add(this.controls.target));}
 loop(ms){
  if(this.tween){const t=clamp((ms-this.tween.start)/900,0,1),s=t*t*(3-2*t);this.camera.position.lerpVectors(this.tween.from,this.tween.to,s);this.controls.target.lerpVectors(this.tween.old,this.tween.target,s);if(t===1)this.tween=null;}
  this.controls.update();const dt=Math.min(.05,(ms-(this.lastTime||ms))/1000);this.lastTime=ms;this.waterEffects?.update(ms/1000,dt);this.villageLife?.update(ms/1000);
  this.processEffects.update(ms/1000);
  const rect=this.host.getBoundingClientRect();for(const m of this.markers){const p=point(m.x,m.z,m.kind?3:16).project(this.camera);const hidden=!this.showLabels||p.z>1||p.x<-1||p.x>1||p.y<-1||p.y>1||(m.kind==='inflow'&&!this.showInflows);m.el.hidden=hidden;if(!hidden)m.el.style.transform=`translate(${(p.x*.5+.5)*rect.width}px,${(-p.y*.5+.5)*rect.height}px) translate(-50%,-50%)`;}
  this.renderer.render(this.scene,this.camera);
 }
}
