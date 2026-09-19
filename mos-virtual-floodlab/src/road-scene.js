import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {FT,SIZE,NX,NZ,wetAt,progress} from './road-model.js';
import {buildTown} from './road-town.js';
import {RoadActors} from './road-actors.js';
import {RoadWeather} from './road-weather.js';
const V=.8,BASE=-1.4; // 8× vertical exaggeration; x/z units each represent 10 m.
const hash=(x,z)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
export class RoadScene{
 constructor(host,city,onPick){
  this.host=host;this.city=city;this.onPick=onPick;this.selected=null;this.stage=-1;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#193941');
  this.camera=new THREE.OrthographicCamera(-40,40,30,-30,.1,250);
  this.renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.shadowMap.autoUpdate=false;this.renderer.outputColorSpace=THREE.SRGBColorSpace;host.prepend(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','Riverbend town: select a road section to inspect flood damage');
  this.ambient=new THREE.HemisphereLight('#d7efeb','#586147',1.9);this.scene.add(this.ambient);const sun=new THREE.DirectionalLight('#fff0cd',2.3);sun.position.set(-30,55,25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-48,right:48,top:45,bottom:-45,near:1,far:140});sun.shadow.bias=-.001;sun.shadow.normalBias=.08;this.scene.add(sun);this.sun=sun;
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableRotate=false;this.controls.enableDamping=true;this.controls.minZoom=.6;this.controls.maxZoom=3;this.controls.mouseButtons.LEFT=THREE.MOUSE.PAN;this.controls.mouseButtons.RIGHT=THREE.MOUSE.PAN;this.controls.touches.ONE=THREE.TOUCH.PAN;this.controls.screenSpacePanning=true;
  this.dummy=new THREE.Object3D();this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();
  this.labels=[];this.makeTerrain();this.makeRoads();buildTown(this);this.makeWater();this.makeRipples();this.actors=new RoadActors(this);this.weather=new RoadWeather(this);this.home();this.setWater(0);this.renderer.shadowMap.needsUpdate=true;
  let down;this.renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);this.renderer.domElement.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6){const c=this.pick(e);if(c)this.onPick(c.group,c.id);}down=null;});
  this.renderer.domElement.addEventListener('pointermove',e=>{this.renderer.domElement.style.cursor=this.pick(e)?'pointer':'grab';});
  new ResizeObserver(()=>this.resize()).observe(host);this.resize();
  this.renderer.setAnimationLoop(t=>{if(!host.offsetWidth)return;this.actors.update(t/1000);if(!this.actors.reduced)this.ripples.material.opacity=.3+.12*Math.sin(t/1400);this.controls.update();this.renderer.render(this.scene,this.camera);});
 }
 matrix(mesh,i,x,y,z,w,h,d){this.dummy.position.set(x,y,z);this.dummy.scale.set(w,h,d);this.dummy.rotation.set(0,0,0);this.dummy.updateMatrix();mesh.setMatrixAt(i,this.dummy.matrix);}
 makeTerrain(){
  const terrain=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial({flatShading:true}),this.city.cells.length);
  for(const c of this.city.cells){const top=c.ground*V,h=top-BASE;this.matrix(terrain,c.id,c.x,BASE+h/2,c.z,1,h,1);const color=new THREE.Color(c.channel?'#9c9d78':c.ground>2.3?'#97aa67':c.ground>.9?'#759856':'#628b59');color.offsetHSL(0,0,(hash(c.x,c.z)-.5)*.035);terrain.setColorAt(c.id,color);}
  terrain.receiveShadow=true;terrain.castShadow=false;terrain.instanceMatrix.needsUpdate=true;terrain.instanceColor.needsUpdate=true;this.scene.add(terrain);
  const base=new THREE.Mesh(new THREE.BoxGeometry(NX+.2,.35,NZ+.2),new THREE.MeshLambertMaterial({color:'#48544a'}));base.position.y=BASE-.17;this.scene.add(base);
 }
 makeRoads(){
  this.roadMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial({flatShading:true}),this.city.roads.length);
  this.city.roads.forEach((c,i)=>{this.matrix(this.roadMesh,i,c.x,c.deck*V+.035,c.z,.96,.07,.96);this.roadMesh.setColorAt(i,new THREE.Color(c.bridge?'#c1b59a':'#657477'));});this.scene.add(this.roadMesh);
  const details=[];
  for(const c of this.city.roads){
   if((c.x+c.z)%2===0)details.push([c.x,c.deck*V+.077,c.z,c.orientation==='h'?.34:.045,.012,c.orientation==='h'?.045:.34,'#e5d6a0']);
   if(c.bridge){for(const side of [-.47,.47])details.push([c.x+(c.orientation==='v'?side:0),c.deck*V+.2,c.z+(c.orientation==='h'?side:0),c.orientation==='h'?1:.06,.26,c.orientation==='h'?.06:1,'#b7c2b0']);}
  }
  this.batchBoxes(details);
 }
 cellAt(x,z){const col=Math.round(x)+(NX-1)/2,row=Math.round(z)+(NZ-1)/2;return col>=0&&col<NX&&row>=0&&row<NZ?this.city.cells[row*NX+col]:undefined;}
 batchBoxes(boxes){const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial({flatShading:true}),boxes.length);boxes.forEach((b,i)=>{this.matrix(mesh,i,...b.slice(0,6));mesh.setColorAt(i,new THREE.Color(b[6]));});mesh.castShadow=true;mesh.receiveShadow=true;this.scene.add(mesh);return mesh;}
 makeLabel(text,x,y,z,width=6.5){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=48;const cx=canvas.getContext('2d');cx.fillStyle='#173b36e8';cx.fillRect(0,0,256,48);cx.strokeStyle='#afcca0';cx.strokeRect(1,1,254,46);cx.fillStyle='#eef2d6';cx.font='bold 20px monospace';cx.textAlign='center';cx.fillText(text,128,31);const texture=new THREE.CanvasTexture(canvas);texture.minFilter=THREE.NearestFilter;texture.magFilter=THREE.NearestFilter;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sprite.position.set(x,y,z);sprite.scale.set(width,width*.1875,1);sprite.renderOrder=12;this.scene.add(sprite);this.labels.push(sprite);}
 makeRipples(){const channels=this.city.cells.filter(c=>c.channel&&hash(c.x,c.z)>.65);this.ripples=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:'#d5f2da',transparent:true,opacity:.35,depthWrite:false}),channels.length);channels.forEach((c,i)=>{this.dummy.position.set(c.x,.08,c.z);this.dummy.scale.set(.35,.05,1);this.dummy.rotation.set(-Math.PI/2,0,.2);this.dummy.updateMatrix();this.ripples.setMatrixAt(i,this.dummy.matrix);});this.ripples.renderOrder=6;this.scene.add(this.ripples);}
 makeWater(){this.water=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:'#68c8d7',transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide}),this.city.cells.length);this.water.renderOrder=5;this.scene.add(this.water);}
 setWater(stage){if(Math.abs(stage-this.stage)<.002)return;this.stage=stage;if(this.ripples)this.ripples.position.y=stage*V;
  for(const c of this.city.cells){const wet=wetAt(c,stage);this.dummy.position.set(c.x,stage*V+.075,c.z);this.dummy.scale.set(wet?1:0,wet?1:0,1);this.dummy.rotation.set(-Math.PI/2,0,0);this.dummy.updateMatrix();this.water.setMatrixAt(c.id,this.dummy.matrix);}
  this.water.instanceMatrix.needsUpdate=true;
 }
 paint(event,day=0,peakView=false){const groups=new Map(event?.groups.map(g=>[g.id,g])||[]);
  this.city.roads.forEach((c,i)=>{const hit=event?.damage.get(c.id),g=groups.get(c.group);const color=new THREE.Color(c.bridge?'#c1b59a':'#657477');if(hit?.depth>1e-7){const done=progress(g,day);if(peakView||done<1){const intensity=.48+.5*Math.min(1,hit.fraction/.04);color.lerp(new THREE.Color('#ff5964'),intensity*(peakView?1:1-done*.6));}else color.lerp(new THREE.Color('#b6e5b2'),.6);}this.roadMesh.setColorAt(i,color);});this.roadMesh.instanceColor.needsUpdate=true;
 }
 select(id){this.selected=id;if(this.outline){this.scene.remove(this.outline);this.outline.geometry.dispose();this.outline.material.dispose();}const g=this.city.groups.find(g=>g.id===id);if(!g)return;const v=[];for(const c of g.cells){const y=c.deck*V+.105;const a=[[c.x-.48,y,c.z-.48],[c.x+.48,y,c.z-.48],[c.x+.48,y,c.z+.48],[c.x-.48,y,c.z+.48]];for(let i=0;i<4;i++)v.push(...a[i],...a[(i+1)%4]);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));this.outline=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:'#fff0a9',depthTest:false}));this.outline.renderOrder=15;this.scene.add(this.outline);}
 pick(e){const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hit=this.ray.intersectObject(this.roadMesh)[0];return hit?this.city.roads[hit.instanceId]:null;}
 home(){this.camera.position.set(18,66,47);this.controls.target.set(0,0,0);this.camera.zoom=1;this.camera.updateProjectionMatrix();this.controls.update();}
 focus(cell){const offset=this.camera.position.clone().sub(this.controls.target);this.controls.target.set(cell.x,cell.deck*V,cell.z);this.camera.position.copy(this.controls.target).add(offset);this.camera.zoom=2.3;this.camera.updateProjectionMatrix();this.controls.update();}
 resetLife(){this.weather.clear();this.actors.reset();this.actors.update(performance.now()/1000);}
 setStorm(elapsed){this.weather.set(elapsed);}
 clearStorm(){this.weather.clear();}
 beginEvacuation(peak){this.resetLife();this.actors.beginEvacuation(peak);}
 evacuate(u){return this.actors.evacuate(u);}
 recovery(event,day,overlay){this.actors.recovery(event,day,overlay);}
 zoom(factor){this.camera.zoom=Math.min(3,Math.max(.6,this.camera.zoom*factor));this.camera.updateProjectionMatrix();}
 resize(){const {width:w,height:h}=this.host.getBoundingClientRect();if(!w||!h)return;this.renderer.setSize(w,h,false);const aspect=w/h,span=Math.max(28,39/aspect);this.camera.left=-span*aspect;this.camera.right=span*aspect;this.camera.top=span;this.camera.bottom=-span;this.camera.updateProjectionMatrix();}
}
