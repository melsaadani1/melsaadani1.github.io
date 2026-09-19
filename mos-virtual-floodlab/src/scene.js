import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {FT,fractionAt} from './data.js';

const colors={wall:0xe3e4d9,trim:0xedefe5,wood:0xb99c75,darkwood:0x6c6250,metal:0x899b9d,black:0x243239,white:0xe9e6d9,green:0x577b68,orange:0xc4875d,blue:0x819faa};
const mat=(c,rough=.7)=>new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:.03});
function box(parent,w,h,d,x,y,z,c,r=0){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));o.position.set(x,y,z);o.rotation.y=r;o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function cyl(parent,rt,rb,h,x,y,z,c,segments=16){const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),mat(c));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function sphere(parent,r,x,y,z,c,sx=1,sy=1,sz=1){const o=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),mat(c));o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;}
function legs(g,w,d,top,c=colors.darkwood){for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])box(g,.07,top,.07,x,top/2,z,c);}
function chair(g,x=0,z=0,r=0,medical=false){const p=new THREE.Group();p.position.set(x,0,z);p.rotation.y=r;g.add(p);legs(p,.55,.55,.4,colors.metal);box(p,.72,.19,.73,0,.49,0,medical?colors.blue:colors.orange);box(p,.72,.65,.16,0,.85,-.32,medical?colors.blue:colors.orange);box(p,.1,.28,.7,-.37,.7,0,colors.darkwood);box(p,.1,.28,.7,.37,.7,0,colors.darkwood);}
function plant(g,x,y,z,s=1){cyl(g,.17*s,.13*s,.3*s,x,y+.15*s,z,0xc1aa87);cyl(g,.022*s,.028*s,.65*s,x,y+.58*s,z,colors.green);for(let n=0;n<5;n++){const a=n*2.1;sphere(g,.25*s,x+Math.sin(a)*.15*s,y+(.62+n*.045)*s,z+Math.cos(a)*.12*s,0x5b8567,1,.5,.65);}}
function bed(g,medical=false){
 const w=medical?1.02:1.85,d=medical?2.25:2.35;
 legs(g,w-.18,d-.25,.32,medical?colors.metal:colors.darkwood);
 box(g,w,.22,d,0,.38,0,medical?colors.metal:colors.darkwood);
 box(g,w-.06,.23,d-.07,0,.59,0,medical?0xc4deda:0xe2ddcd);
 box(g,w-.08,.09,d*.61,0,.745,.33,medical?0x719f9d:0x8ca4a0);
 box(g,w,.95,.11,0,.58,-d/2,medical?colors.metal:colors.wood);
 const pillows=medical?1:2;
 for(let i=0;i<pillows;i++)box(g,medical?.6:.72,.13,.48,medical?0:(i? .45:-.45),.78,-.78,colors.white);
 if(medical){for(const x of [-.6,.6]){box(g,.06,.45,1.5,x,.78,0,colors.metal);box(g,.07,.07,1.7,x,1.03,0,colors.white);}for(const x of [-.45,.45])for(const z of [-.8,.8])sphere(g,.09,x,.13,z,colors.black);}
 else{box(g,.54,.56,.54,-1.3,.28,-.76,colors.wood);cyl(g,.08,.1,.08,-1.3,.6,-.76,colors.black);cyl(g,.025,.025,.32,-1.3,.79,-.76,colors.metal);cyl(g,.18,.24,.23,-1.3,1.05,-.76,0xd8c9ab);}
}
function sofa(g){legs(g,2.25,.77,.17);box(g,2.6,.39,1.0,0,.36,0,colors.green);box(g,2.65,.63,.21,0,.82,-.43,colors.green);for(const x of [-1.22,1.22])box(g,.22,.54,1,x,.63,0,colors.green);for(const x of [-.75,0,.75]){box(g,.7,.17,.75,x,.62,.06,0x76917b);box(g,.68,.4,.14,x,.86,-.25,0x718c78);}const pillow=box(g,.39,.4,.16,-.76,.88,-.1,colors.orange);pillow.rotation.z=.18;box(g,1.3,.1,.67,0,.39,1.3,colors.wood);legsAt(g,1.1,.47,.35,0,1.3);box(g,.3,.02,.2,-.3,.46,1.3,0xe8ded0);cyl(g,.075,.07,.12,.27,.5,1.3,colors.white);}
function legsAt(g,w,d,h,x,z){for(const dx of [-w/2,w/2])for(const dz of [-d/2,d/2])box(g,.055,h,.055,x+dx,h/2,z+dz,colors.darkwood);}
function buildFurniture(item,g){
 switch(item.type){
 case 'chair':chair(g,0,0,-Math.PI/5);break;
 case 'sofa':sofa(g);break;
 case 'stove':{
 box(g,.82,.9,.75,0,.45,0,0xc9ccca);box(g,.76,.055,.7,0,.93,0,colors.black);box(g,.62,.43,.023,0,.48,.384,0x34434a);box(g,.6,.04,.045,0,.78,.42,colors.metal);
 for(const x of [-.21,.21])for(const z of [-.18,.18])cyl(g,.125,.125,.02,x,.968,z,0x718285,20);
 for(const x of [-.24,-.08,.08,.24]){const q=cyl(g,.035,.035,.025,x,.86,.395,colors.black);q.rotation.x=Math.PI/2;}break;}
 case 'fridge':box(g,.93,1.87,.82,0,.935,0,0xc5d0cf);box(g,.88,1.12,.04,0,1.24,.438,0xdce1dd);box(g,.88,.6,.04,0,.36,.438,0xdce1dd);box(g,.035,.6,.045,-.31,1.2,.48,colors.metal);box(g,.035,.31,.045,-.31,.38,.48,colors.metal);break;
 case 'microwave':box(g,.64,.34,.46,0,1.2,0,colors.white);box(g,.42,.23,.018,-.06,1.2,.24,0x26373e);box(g,.06,.03,.018,.23,1.25,.245,0x6dbeb5);box(g,.06,.08,.018,.23,1.13,.245,colors.black);break;
 case 'tv':box(g,1.45,.56,.43,0,.28,0,colors.wood);for(const x of [-.35,.35])box(g,.015,.48,.015,x,.29,.23,colors.darkwood);box(g,1.5,.85,.055,0,1.02,0,colors.black);box(g,1.39,.73,.008,0,1.04,.035,0x344e57);box(g,.39,.13,.035,-.32,1.19,.042,0x80ada9);box(g,.79,.018,.04,-.1,.97,.045,0x81a3a8);for(const x of [-.49,.49])box(g,.04,.13,.23,x,.59,0,colors.black);break;
 case 'bed':bed(g);break;
 case 'medbed':bed(g,true);break;
 case 'dining':box(g,1.2,.09,1.35,0,.8,0,colors.wood);legs(g,1,1.15,.76);chair(g,-.98,0,Math.PI/2);chair(g,.98,0,-Math.PI/2);cyl(g,.16,.12,.05,0,.88,0,colors.white);plant(g,0,.9,0,.5);break;
 case 'washer':box(g,.75,.86,.7,0,.43,0,colors.white);{const rim=cyl(g,.245,.245,.045,0,.4,.375,colors.metal,28);rim.rotation.x=Math.PI/2;const glass=cyl(g,.192,.192,.05,0,.4,.405,colors.black,28);glass.rotation.x=Math.PI/2;}box(g,.25,.055,.02,.15,.76,.36,0x87b7b1);break;
 case 'rug':box(g,3.4,.012,2.5,0,.022,0,0xc9bfa2);for(let i=0;i<5;i++)box(g,3.25,.006,.025,0,.031,-1+i*.5,0x8e9f8e);break;
 case 'shelf':{
 box(g,1.45,1.8,.13,0,.9,-.16,colors.wood);for(const x of [-.74,.74])box(g,.09,1.85,.42,x,.925,0,colors.wood);
 for(let j=0;j<4;j++){box(g,1.55,.07,.46,0,.12+j*.52,0,colors.wood);for(let k=0;k<5;k++)box(g,.12,.25+(k%3)*.04,.22,-.55+k*.19,.285+j*.52,0,[0x6b8e93,0xb38766,0xd4c8a5][k%3]);}plant(g,.55,1.75,0,.6);break;}
 case 'desk':box(g,1.8,.08,.82,0,.84,0,colors.wood);legs(g,1.55,.65,.8,colors.metal);box(g,.74,.47,.045,0,1.16,-.14,colors.black);box(g,.67,.39,.015,0,1.17,-.108,0x6c9f9f);box(g,.035,.1,.05,0,.91,-.14,colors.black);box(g,.6,.025,.17,0,.9,.15,colors.black);chair(g,0,.94,0,true);break;
 case 'seating':for(let i=0;i<3;i++)chair(g,0,(i-1)*1.15,-Math.PI/2,true);break;
 case 'monitor':{
 cyl(g,.035,.045,1.08,0,.63,0,colors.metal);box(g,.66,.44,.12,0,1.43,0,colors.white);box(g,.54,.32,.015,0,1.43,.07,0x17383b);for(let i=0;i<6;i++)box(g,.065,.013,.01,-.22+i*.085,1.42+Math.sin(i*2)*.065,.08,0x8de0a4);for(let i=0;i<4;i++){const a=i*Math.PI/2;box(g,.55,.045,.055,Math.cos(a)*.15,.08,Math.sin(a)*.15,colors.metal,a);}break;}
 case 'scanner':{
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.02,.35,14,40),mat(colors.white));ring.position.set(0,1.27,-.37);ring.castShadow=true;g.add(ring);const inner=new THREE.Mesh(new THREE.TorusGeometry(.75,.055,10,40),mat(0x739c9a));inner.position.set(0,1.27,.01);g.add(inner);box(g,2.6,.38,.93,0,.22,-.37,colors.white);box(g,.72,.58,2.7,0,.4,1.2,colors.white);box(g,.8,.14,2.9,0,.75,1.2,colors.blue);box(g,.35,.08,.015,1.02,1.5,.01,0x7bbdc0);break;}
 case 'lab':box(g,2.4,.89,.78,0,.445,0,colors.wood);box(g,2.5,.1,.84,0,.96,0,colors.white);for(const x of [-.7,.4]){box(g,.66,.5,.54,x,1.25,0,colors.white);box(g,.42,.21,.018,x,1.29,.28,0x517982);box(g,.09,.045,.02,x+.2,1.12,.285,0x85c0b0);}for(let n=0;n<4;n++)cyl(g,.035,.035,.18,.94,1.1,-.24+n*.14,0x95bdba);break;
 }
}
export class FloodScene{
 constructor(host,onPick,onHover){
  this.host=host;this.onPick=onPick;this.onHover=onHover;this.componentGroups=new Map();this.cutaway=true;this.floorView='all';this.waterM=1.3;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x273e48);this.scene.fog=new THREE.Fog(0x273e48,42,95);
  this.camera=new THREE.PerspectiveCamera(36,1,.1,180);
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.3;this.renderer.localClippingEnabled=true;host.prepend(this.renderer.domElement);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.07;this.controls.minDistance=9;this.controls.maxDistance=58;this.controls.maxPolarAngle=Math.PI*.48;this.controls.target.set(0,1,0);
  this.scene.add(new THREE.HemisphereLight(0xe7f7ff,0x526b63,2.4));
  const sun=new THREE.DirectionalLight(0xfff3d6,3.5);sun.position.set(-9,22,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-18;sun.shadow.camera.right=18;sun.shadow.camera.top=18;sun.shadow.camera.bottom=-18;sun.shadow.normalBias=.035;sun.shadow.bias=-.0004;this.scene.add(sun);
  const fill=new THREE.DirectionalLight(0x9bdfe5,1.2);fill.position.set(10,8,-12);this.scene.add(fill);
  this.root=new THREE.Group();this.scene.add(this.root);this.env=new THREE.Group();this.scene.add(this.env);
  this.buildWater();
  this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();
  let down=null;
  this.renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
  this.renderer.domElement.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6){const hit=this.pick(e);if(hit)this.onPick(hit);}down=null;});
  this.renderer.domElement.addEventListener('pointermove',e=>{const hit=this.pick(e);this.renderer.domElement.style.cursor=hit?'pointer':'grab';this.onHover(hit,e);});
  this.renderer.domElement.addEventListener('pointerleave',()=>this.onHover(null));
  new ResizeObserver(()=>this.resize()).observe(host);
  this.clock=new THREE.Clock();
  this.renderer.setAnimationLoop(()=>{if(!this.host.offsetWidth)return;this.controls.update();if(!this.reduced)this.water.material.uniforms.uTime.value=this.clock.getElapsedTime();this.renderer.render(this.scene,this.camera);});
 }
 buildWater(){
  const geo=new THREE.PlaneGeometry(27,24,1,1);geo.rotateX(-Math.PI/2);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uTime:{value:0},uAlpha:{value:.30}},vertexShader:'varying vec3 vWorld; void main(){vec4 w=modelMatrix*vec4(position,1.0);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',fragmentShader:'varying vec3 vWorld; uniform float uTime; uniform float uAlpha; void main(){float a=sin(vWorld.x*3.0+vWorld.z*2.6+uTime*.8)*sin(vWorld.z*3.8-vWorld.x+uTime*.5);float b=sin(vWorld.x*8.0+vWorld.z*4.0-uTime*.7);float ripple=smoothstep(.77,.98,a)*.14+smoothstep(.96,1.0,b)*.03;vec3 c=mix(vec3(.13,.50,.59),vec3(.55,.91,.91),ripple*3.);gl_FragColor=vec4(c,uAlpha+ripple);}',});
  this.water=new THREE.Mesh(geo,material);this.water.renderOrder=5;this.scene.add(this.water);
  this.waterSide=new THREE.Group();this.scene.add(this.waterSide);
  const sideMat=new THREE.MeshBasicMaterial({color:0x51b1c6,transparent:true,opacity:.09,depthWrite:false,side:THREE.DoubleSide});
  for(const z of [-12,12]){const p=new THREE.Mesh(new THREE.PlaneGeometry(27,1),sideMat);p.position.z=z;this.waterSide.add(p);}
  for(const x of [-13.5,13.5]){const p=new THREE.Mesh(new THREE.PlaneGeometry(24,1),sideMat);p.rotation.y=Math.PI/2;p.position.x=x;this.waterSide.add(p);}
 }
 clearGroup(group){group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(o.material.map)o.material.map.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});group.clear();}
 rebuild(config,items){
  if(this.outline){this.scene.remove(this.outline);this.outline.geometry.dispose();this.outline.material.dispose();}
  this.config=config;this.items=items;this.clearGroup(this.root);this.clearGroup(this.env);this.componentGroups.clear();this.roof=null;this.selected=null;this.shellWalls=[];this.storyGroups=[];this.outline=null;
  const {width:w,depth:d,ffe}=config;
  box(this.env,27,.55,24,0,-.35,0,0x35505a);box(this.env,25,.08,22,0,-.035,0,0x607c70);box(this.env,w+2,.025,d+2,0,.017,0,0x85968a);
  box(this.env,2.7,.04,6,0,.042,d/2+3,0xb3b5a8);for(let i=0;i<5;i++)box(this.env,2.65,.01,.025,0,.07,d/2+i*1.1,0x818d86);
  for(const p of [[-10,-7,1.1],[9,6,.9],[-9,6,1.2],[10,-7,1]]){const [x,z,s]=p;cyl(this.env,.14,.19,1.9*s,x,.95*s,z,0x7c7860);sphere(this.env,1,x,2.1*s,z,0x688977,1,1.4,1);sphere(this.env,.8,x+.45,2.5*s,z-.2,0x7a957c);}
  for(const x of [-6.8,6.8])for(const z of [4.8,5.6])plant(this.env,x,0,z,1.3);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(300,300),mat(0x273e48));ground.rotation.x=-Math.PI/2;ground.position.y=-.65;ground.receiveShadow=true;this.env.add(ground);
  for(const item of items){const g=new THREE.Group();g.name=item.id;g.position.set(item.x,item.baseM,item.z);g.userData.itemId=item.id;g.userData.level=item.level;this.root.add(g);this.componentGroups.set(item.id,g);
   if(item.group==='contents')buildFurniture(item,g);
   else this.buildAssembly(item,g);
   this.tag(g,item);
  }
  // Room details are non-valued decorations. Bathroom costs are included in finishes/systems.
  for(let f=0;f<config.floors;f++){
   const decor=new THREE.Group();decor.position.y=ffe+f*3.2;decor.userData.decor=true;decor.userData.level=f;this.root.add(decor);
   if(config.id!=='clinic'){
    box(decor,1.4,.55,.66,3.0,.275,3.42,colors.white);box(decor,1.17,.05,.46,3,.57,3.42,0x89adb0);box(decor,.57,.62,.4,2.0,.31,1.9,colors.white);cyl(decor,.25,.19,.18,2,.4,2.28,colors.white);box(decor,.66,.76,.47,4.9,.38,1.65,colors.wood);box(decor,.7,.07,.52,4.9,.8,1.65,colors.white);plant(decor,-5.05,0,3.4,1.3);
    if(f===0&&config.floors===2)for(let n=0;n<13;n++)box(decor,.95,(n+1)*.246,.24,.75,(n+1)*.123,2.9-n*.25,0xbaab8e);
   }else{plant(decor,6.5,0,4.45,1.4);plant(decor,-6.4,0,-4.4,1.3);}
  }
  const ruler=new THREE.Group();ruler.position.set(-w/2-2.1,0,-d/2);box(ruler,.055,config.maxFt*FT,.055,0,config.maxFt*FT/2,0,0xabc4c6);
  for(let ft=0;ft<=config.maxFt;ft++){box(ruler,ft%3===0?.3:.16,.018,.03,.075,ft*FT,0,0xcbdeda);if(ft%3===0)this.textSprite(ruler,String(ft)+' ft',-.45,ft*FT,0,.5);}
  this.env.add(ruler);
  this.textSprite(this.env,'FIRST FLOOR',-w/2-2.5,ffe,.7,.85);
  this.setVisibility();this.home();this.setWater(this.waterM);
 }
 buildAssembly(item,g){
  const {width:w,depth:d,ffe,id,floors}=this.config,isClinic=id==='clinic',level=item.level;
  switch(item.type){
  case 'foundation':
   box(g,w+.13,.15,d+.13,0,ffe-.10,0,0x909b93);
   if(ffe>.5){for(const x of [-w/2+.14,w/2-.14])box(g,.28,ffe-.2,d,x,(ffe-.2)/2,0,0xa5a598);for(const z of [-d/2+.14,d/2-.14]){const wall=box(g,w,ffe-.2,.28,0,(ffe-.2)/2,z,0xa5a598);if(z>0){wall.userData.cutWall=true;this.shellWalls.push(wall);}}}
   else box(g,w+.2,.18,d+.2,0,.075,0,0xa6a797);
   break;
  case 'floors':
   box(g,w,.10,d,0,-.02,0,isClinic?0xc5cfca:0xbbac8b);
   if(!isClinic){for(let i=0;i<16;i++)box(g,.014,.007,d,-w/2+i*w/16,.035,0,0x9c937c);box(g,4.2,.016,3.8,3.4,.045,2.3,0xc3ccc6);}
   else for(let x=-7;x<7;x++)for(let z=-5;z<5;z++){box(g,.012,.007,1,x,.04,z+.5,0xaabdb8);box(g,1,.007,.012,x+.5,.04,z,0xaabdb8);}
   break;
  case 'walls':{
   const h=2.65;
   // Full back/left walls, with front/right removable for a readable dollhouse view.
   box(g,w,h,.16,0,h/2,-d/2,colors.wall);
   box(g,.16,h,d,-w/2,h/2,0,colors.wall);
   const front=box(g,w,h,.16,0,h/2,d/2,colors.wall),right=box(g,.16,h,d,w/2,h/2,0,colors.wall);front.userData.cutWall=true;right.userData.cutWall=true;this.shellWalls.push(front,right);
   for(const z of [-d/2+.1,d/2-.1])box(g,w,.11,.05,0,.09,z,colors.trim);
   if(!isClinic){box(g,.13,1.22,d-1.15,1.35,.61,-.5,colors.wall);box(g,4.45,1.22,.12,3.57,.61,.75,colors.wall);box(g,1.5,1.22,.12,-5.05,.61,-1.75,colors.wall);}
   else{box(g,w-3,1.18,.14,-1.5,.59,-.85,colors.wall);box(g,.14,1.18,4.05,1.45,.59,-3,colors.wall);box(g,.12,.92,4.9,-3.25,.46,1.7,colors.wall);}
   for(const x of isClinic?[-5.4,-1.9,3.6]:[-4,-1,3.2]){
    box(g,1.65,1.12,.025,x,1.67,-d/2+.094,0x8cb7be);for(const dx of [-.84,.84])box(g,.065,1.23,.08,x+dx,1.67,-d/2+.12,colors.trim);for(const yy of [1.08,1.67,2.26])box(g,1.75,.055,.08,x,yy,-d/2+.12,colors.trim);box(g,.05,1.2,.08,x,1.67,-d/2+.12,colors.trim);
   }
   break;}
  case 'cabinets':
   if(isClinic){for(let k=0;k<3;k++){box(g,.82,.9,.73,-6.3+k*.86,.45,-4,colors.wood);box(g,.88,.065,.81,-6.3+k*.86,.94,-4,colors.white);}}
   else if(level===0){for(const x of [-3.9,-3.05,-2.2]){box(g,.81,.9,.78,x,.45,-3.4,colors.wood);box(g,.8,.045,.82,x,.94,-3.4,colors.white);box(g,.55,.022,.033,x,.77,-2.99,colors.metal);}box(g,.8,.6,.38,-3.9,1.95,-3.8,colors.wood);}
   else{box(g,2,.85,.65,-4.1,.425,-3.6,colors.wood);box(g,2.1,.055,.7,-4.1,.88,-3.6,colors.white);}
   break;
  case 'electric':box(g,.45,.64,.12,w/2-.24,1.15,-2.9,0x74898c);box(g,.035,.41,.035,w/2-.49,1.09,-2.82,colors.black);for(const x of [-4.6,-2,2.3,4.8]){box(g,.12,.18,.04,x,.42,-d/2+.11,colors.white);box(g,.013,.05,.045,x-.023,.43,-d/2+.14,colors.black);box(g,.013,.05,.045,x+.023,.43,-d/2+.14,colors.black);}break;
  case 'hvac':box(g,1.0,.95,1.0,0,.48,0,0x899c95);cyl(g,.38,.38,.025,0,.97,0,0x3e5554,24);for(let i=0;i<8;i++)box(g,.89,.025,.02,0,.13+i*.09,.515,0x4b6562);break;
  case 'shell':{
   for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])box(g,.17,floors*3.2-.35,.17,x,(floors*3.2-.35)/2,z,0xd0c8b0);
   const roof=new THREE.Group();roof.position.y=floors*3.2-.5;g.add(roof);this.roof=roof;
   if(isClinic){box(roof,w+.5,.20,d+.5,0,0,0,0x607a77);box(roof,1.8,.6,1.1,2,.42,0,0x92a5a2);}
   else{const slope=Math.atan(1.7/(d/2+.3)),len=Math.hypot(d/2+.3,1.7);for(const side of [-1,1]){const p=box(roof,w+.65,.14,len,0,.85,side*(d/4+.15),0x4a6666);p.rotation.x=side*slope;}}
   break;}
  case 'duct':for(const x of [-3.8,0,3.8]){box(g,.34,.3,d-1,x,.56,0,0x748c8b);for(const z of [-2,2])box(g,3,.22,.27,x>0?x-1.4:x+1.4,.56,z,0x899f99);}break;
  }
 }
 tag(g,item){
  const uniforms={damage:{value:0},water:{value:this.waterM},partial:{value:['walls','shell','foundation'].includes(item.type)?1:0}};g.userData.uniforms=uniforms;
  g.traverse(o=>{if(!o.isMesh)return;o.userData.itemId=item.id;const m=o.material;
   m.onBeforeCompile=shader=>{shader.uniforms.damageAmount=uniforms.damage;shader.uniforms.waterHeight=uniforms.water;shader.uniforms.partialTint=uniforms.partial;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 damageWorld;').replace('#include <begin_vertex>','#include <begin_vertex>\ndamageWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 damageWorld; uniform float damageAmount; uniform float waterHeight; uniform float partialTint;').replace('#include <color_fragment>','#include <color_fragment>\nfloat wet=mix(1.0,1.0-smoothstep(waterHeight-.02,waterHeight+.02,damageWorld.y),partialTint); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.0,.055,.075),damageAmount*.67*wet);');};
   m.customProgramCacheKey=()=> 'flood-tint-v1';
  });
 }
 textSprite(parent,text,x,y,z,size){const c=document.createElement('canvas');c.width=512;c.height=112;const ctx=c.getContext('2d');ctx.font='500 44px Arial';ctx.textAlign='center';ctx.fillStyle='#d6e6df';ctx.fillText(text,256,66);const t=new THREE.CanvasTexture(c);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false}));sprite.position.set(x,y,z);sprite.scale.set(size*2,size*.44,1);parent.add(sprite);return sprite;}
 setWater(m){this.waterM=m;this.water.position.y=m;this.water.visible=m>.015;this.waterSide.visible=m>.015;for(const p of this.waterSide.children){p.scale.y=Math.max(.001,m);p.position.y=m/2;}
  if(this.items)for(const item of this.items){const g=this.componentGroups.get(item.id);g.userData.uniforms.damage.value=fractionAt(item,m);g.userData.uniforms.water.value=m;g.position.y=item.baseM+(item.elevated?2*FT:0);
   if(item.elevated&&!g.userData.platform){const platform=new THREE.Group();const size=item.type==='scanner'?[2.8,3.9]:item.type==='sofa'?[2.8,2.4]:item.type==='bed'?[2.2,2.5]:[1.5,1.25];box(platform,size[0],.06,size[1],0,-.05,0,0x547a78);for(const x of [-size[0]/2+.1,size[0]/2-.1])for(const z of [-size[1]/2+.1,size[1]/2-.1])box(platform,.075,2*FT-.06,.075,x,-FT-.03,z,0x547a78);g.add(platform);g.userData.platform=platform;}
   if(g.userData.platform)g.userData.platform.visible=item.elevated;
  }
  if(this.outline&&this.selected)this.outline.setFromObject(this.componentGroups.get(this.selected));
 }
 select(id){this.selected=id;if(this.outline){this.scene.remove(this.outline);this.outline.geometry.dispose();this.outline.material.dispose();}const group=this.componentGroups.get(id);if(!group)return;this.outline=new THREE.BoxHelper(group,0xc6ffdb);this.outline.material.transparent=true;this.outline.material.opacity=.65;this.outline.material.depthTest=false;this.outline.renderOrder=8;this.scene.add(this.outline);this.outline.visible=group.visible;}
 setVisibility(){
  if(this.roof)this.roof.visible=!this.cutaway;
  this.shellWalls.forEach(o=>o.visible=!this.cutaway);
  for(const g of this.root.children){const level=g.userData.level??0;g.visible=this.floorView==='all'||(this.floorView==='upper'?level===1:level===0);if(g.name==='shell')g.visible=this.floorView!=='upper';}
  if(this.outline&&this.selected)this.outline.visible=this.componentGroups.get(this.selected)?.visible??false;
 }
 setCutaway(v){this.cutaway=v;this.setVisibility();}
 setFloor(v){this.floorView=v;this.setVisibility();}
 home(){const clinic=this.config?.id==='clinic',two=this.config?.floors===2;this.camera.position.set(clinic?21:18,two?23:20,clinic?25:22);this.controls.target.set(0,two?2.6:1,0);this.controls.update();}
 resize(){const r=this.host.getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();}
 pick(event){const rect=this.renderer.domElement.getBoundingClientRect();this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height)*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);const hits=this.raycaster.intersectObject(this.root,true);for(const h of hits){let o=h.object,visible=true;while(o){if(!o.visible){visible=false;break;}o=o.parent;}if(visible&&h.object.userData.itemId)return h.object.userData.itemId;}return null;}
}
