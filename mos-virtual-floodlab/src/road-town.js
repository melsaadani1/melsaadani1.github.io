import * as THREE from 'three';
const V=.8;
const rand=(x,z)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};

// Original miniature-town geometry: every detail stays local and works offline.
export function buildTown(view){
 const boxes=[],roofs=[],crowns=[],stones=[],occupied=[];
 const add=(x,y,z,w,h,d,c)=>boxes.push([x,y,z,w,h,d,c]);
 const ground=(x,z)=>(view.cellAt(x,z)?.ground||0)*V;
 const reserve=(x,z,w,d)=>occupied.push({x,z,w,d});
 const free=(x,z,w=1,d=1)=>!occupied.some(a=>Math.abs(a.x-x)<(a.w+w)/2+.3&&Math.abs(a.z-z)<(a.d+d)/2+.3);
 const clear=(x,z,w,d)=>{for(let dz=-d/2;dz<=d/2;dz+=.6)for(let dx=-w/2;dx<=w/2;dx+=.6){const c=view.cellAt(x+dx,z+dz);if(!c||c.road||c.channel)return false;}return true;};
 function bench(x,z,y=ground(x,z)){
  add(x,y+.28,z,.82,.09,.27,'#ad7653');add(x,y+.5,z-.13,.82,.35,.06,'#c99566');
  for(const dx of [-.28,.28])add(x+dx,y+.12,z,.07,.24,.24,'#344d45');
 }
 function tree(x,z,type=0,scale=1){
  const y=ground(x,z),n=rand(x,z);
  add(x,y+.53*scale,z,.15*scale,1.06*scale,.15*scale,'#6d6341');
  if(type){roofs.push([x,y+1.1*scale,z,.68*scale,1.4*scale,.68*scale,'#285f54']);roofs.push([x,y+1.65*scale,z,.48*scale,1*scale,.48*scale,'#398374']);}
  else {crowns.push([x,y+1.25*scale,z,.75*scale,.85*scale,.7*scale,n>.55?'#91a943':'#4e8b5e']);crowns.push([x-.28*scale,y+1.4*scale,z-.15,.5*scale,.65*scale,.5*scale,n>.55?'#b6b952':'#73a767']);}
 }
 function planter(x,z,w,d){const y=ground(x,z);add(x,y+.11,z,w,.2,d,'#b69b6c');add(x,y+.22,z,w-.08,.06,d-.08,'#4f713f');for(let i=0;i<5;i++){const dx=(rand(x+i,z)-.5)*(w-.1),dz=(rand(z+i,x)-.5)*(d-.1);add(x+dx,y+.32,z+dz,.1,.17,.1,['#f2bc69','#dc8192','#efe3ac'][i%3]);}}
 function house(x,z,w,d,n,shop=false){
  const y=ground(x,z),tall=n>.67,h=tall?1.55:1.05,wall=['#e9cf9a','#d5dfbb','#d69d80','#d7d8d1','#dbb99c'][Math.floor(n*5)],roof=['#ae6550','#547b80','#73677e','#bf7e49'][Math.floor(n*4)];
  reserve(x,z,w+.2,d+.5);
  add(x,y+.07,z,w+.28,.15,d+.28,'#b5ad91');add(x,y+h/2+.14,z,w,h,d,wall);
  add(x,y+.19,z,w+.1,.09,d+.1,'#f0dfb0');
  if(shop){add(x,y+h+.22,z,w+.15,.3,d+.16,roof);add(x,y+h+.4,z,w-.18,.08,d-.18,'#6e7e75');}
  else roofs.push([x,y+h+.5,z,w*.76,.85,d*.8,roof]);
  if(!shop&&n>.35){add(x+w*.23,y+h+.68,z-.1,.22,.65,.23,'#ac8b74');add(x+w*.23,y+h+1.02,z-.1,.28,.08,.28,'#635d58');}
  for(const dx of [-w*.29,w*.29])for(let floor=0;floor<(tall?2:1);floor++){
   const wy=y+.56+floor*.64;
   add(x+dx,wy,z+d/2+.025,.35,.39,.07,'#f4e0b6');add(x+dx,wy,z+d/2+.07,.25,.28,.022,'#446977');
   add(x+dx,wy,z+d/2+.09,.03,.29,.025,'#dbcda9');add(x+dx,wy,z+d/2+.09,.26,.03,.025,'#dbcda9');
   add(x+dx-.22,wy,z+d/2+.03,.09,.39,.04,roof);add(x+dx+.22,wy,z+d/2+.03,.09,.39,.04,roof);
  }
  for(const dz of [-d*.24,d*.24])add(x+w/2+.025,y+.7,z+dz,.04,.34,.31,'#60838a');
  add(x,y+.43,z+d/2+.055,.28,.6,.08,'#657361');add(x+.075,y+.43,z+d/2+.105,.035,.035,.03,'#e6c576');
  add(x,y+.13,z+d/2+.27,.62,.12,.45,'#c6c0a5');
  if(shop){for(let i=0;i<7;i++)add(x-w/2+(i+.5)*w/7,y+.91,z+d/2+.27,w/7,.1,.55,i%2?'#efe2bb':roof);add(x,y+1.16,z+d/2+.035,w*.65,.23,.08,'#315b57');}
  else if(n>.4){planter(x+w*.34,z+d/2+.27,.5,.22);}
  // Small garden fences and paths make individual lots readable.
  if(!shop&&n<.55){for(let i=0;i<6;i++)add(x-w/2+i*w/5,y+.29,z-d/2-.35,.075,.5,.075,'#d5ceb0');add(x,y+.37,z-d/2-.35,w+.12,.08,.065,'#ded5b4');}
 }

 // Distinct civic buildings and landscaped squares.
 const civic=[{x:21,z:-6,w:3.2,d:2.5,name:'HILLTOP CLINIC',roof:'#5d9290',wall:'#e7e4cc'},
  {x:-22,z:-5,w:3.8,d:2.3,name:'WILLOW SCHOOL',roof:'#a25e4a',wall:'#e8c797'},
  {x:7,z:4,w:2.9,d:2.4,name:'TOWN HALL',roof:'#608099',wall:'#ded5ad'}];
 for(const l of civic){
  reserve(l.x,l.z,l.w+2,l.d+2.2);const y=ground(l.x,l.z);
  add(l.x,y+.08,l.z,l.w+1.4,.16,l.d+1.3,'#b8b69d');add(l.x,y+.83,l.z,l.w,1.5,l.d,l.wall);
  add(l.x,y+1.67,l.z,l.w+.22,.2,l.d+.22,l.roof);
  if(l.name==='TOWN HALL'){roofs.push([l.x,y+2.18,l.z,2.3,.9,1.9,l.roof]);add(l.x,y+2.5,l.z,.65,1.2,.65,'#e3d6ae');add(l.x,y+2.82,l.z+.34,.32,.32,.035,'#354c50');add(l.x,y+2.85,l.z+.365,.025,.14,.02,'#fff1c5');add(l.x+.05,y+2.79,l.z+.365,.12,.025,.02,'#fff1c5');}
  else {add(l.x,y+1.82,l.z,l.w-.2,.12,l.d-.2,'#adc6b4');}
  for(let i=-1;i<=1;i++){add(l.x+i*.85,y+.93,l.z+l.d/2+.03,.5,.65,.06,'#668a95');add(l.x+i*.85,y+.93,l.z+l.d/2+.075,.035,.65,.025,'#e7e0bb');}
  add(l.x,y+.55,l.z+l.d/2+.075,.35,.95,.08,'#344f5b');
  if(l.name==='HILLTOP CLINIC'){add(l.x,y+1.94,l.z,.3,.08,1.1,'#d96d62');add(l.x,y+1.94,l.z,1.1,.08,.3,'#d96d62');}
  for(const side of [-1,1]){planter(l.x+side*(l.w/2+.45),l.z+.55,.55,1.2);bench(l.x+side*1.1,l.z+l.d/2+.65,y);}
  view.makeLabel(l.name,l.x,y+3.4,l.z,5.8);
 }
 // Park with a looping path, playground, pond-like fountain and picnic tables.
 reserve(-22,12,5.8,6);
 for(let z=9.8;z<=14.2;z+=.6)for(let x=-24.2;x<=-19.8;x+=.6){const edge=Math.abs(x+22)>1.6||Math.abs(z-12)>1.6;add(x,ground(x,z)+.045,z,.61,.06,.61,edge?'#c2b58a':'#85a467');}
 for(const [x,z] of [[-24,10],[-20,14],[-24,14]])tree(x,z,0,1.25);
 bench(-22,14);bench(-22,10);
 const py=ground(-22,12);add(-22,py+.22,12,1.1,.4,1.1,'#9faea0');add(-22,py+.44,12,.85,.06,.85,'#69bfc2');add(-22,py+.7,12,.18,.6,.18,'#ccceb0');
 add(-20.5,ground(-20.5,11)+.45,11,.65,.7,.12,'#cf9660');add(-20.5,ground(-20.5,11)+.74,11,.75,.13,.42,'#e9c16e');
 view.makeLabel('WILLOW GARDENS',-22,py+3.1,12,5.8);
 // Market stalls in the center-west block.
 for(const [i,x] of [-15,-12.5].entries()){house(x,-4.6,1.9,1.9,.2+i*.45,true);const y=ground(x,-2.8);for(let k=0;k<3;k++){add(x-.55+k*.5,y+.22,-2.8,.42,.42,.42,'#a7834f');add(x-.55+k*.5,y+.48,-2.8,.35,.12,.35,['#ce7662','#d3b857','#809e5f'][k]);}}
 // Neighborhood sports court, with a marked playing surface and two hoops.
 reserve(-22,-13,5.5,3.3);
 const cy=ground(-22,-13);
 add(-22,cy+.08,-13,5.1,.15,2.9,'#ab986f');add(-22,cy+.17,-13,4.8,.06,2.6,'#648f80');
 for(const z of [-14.15,-11.85])add(-22,cy+.207,z,4.5,.012,.035,'#e6dfb6');
 for(const x of [-24.25,-22,-19.75])add(x,cy+.207,-13,.035,.012,2.3,'#e6dfb6');
 for(const x of [-24.5,-19.5]){add(x,cy+.65,-13,.065,1.3,.065,'#6d7a6a');add(x,cy+1.28,-13,.055,.5,.66,'#e8e0bd');add(x+(x<-22?.23:-.23),cy+1.07,-13,.35,.06,.37,'#cc8658');}
 bench(-22,-11.35,cy);tree(-24.9,-11.5,0,1.1);
 // Residential districts: varied silhouettes, courtyards and roof colors.
 for(let z=-19;z<=19;z+=3.6)for(let x=-29;x<=29;x+=3.8){
  const n=rand(x,z),w=1.55+n*.55,d=1.4+n*.45;
  if(!free(x,z,w+1,d+1)||!clear(x,z,w+.5,d+.9))continue;
  house(x,z,w,d,n,Math.abs(z)<8&&x>7&&n>.55);
 }
 // Sidewalks, zebra crossings, lamps and street furniture.
 for(const c of view.city.roads){
  const y=c.deck*V+.082,h=c.orientation==='h';
  if(!c.bridge){for(const side of [-.43,.43])add(c.x+(h?0:side),y,c.z+(h?side:0),h?1:.1,.06,h?.1:1,'#c1bba3');}
  if([-26,-18,-10,3,13,24].includes(c.x)&&[-17,-9,0,9,17].includes(c.z)){
   for(const side of [-1,1]){const n=view.cellAt(c.x+side,c.z);if(n?.road&&!n.bridge)for(let k=-2;k<=2;k++)add(n.x,n.deck*V+.079,n.z+k*.13,.27,.012,.07,'#e4ddbd');}
  }
  if((c.id%9===0)&&!c.bridge){const x=c.x+(h?0:.6),z=c.z+(h?.6:0);const t=view.cellAt(x,z);if(t&&!t.channel){add(x,y+.6,z,.055,1.2,.055,'#425951');add(x+.1,y+1.19,z,.28,.05,.08,'#425951');add(x+.2,y+1.13,z,.17,.15,.17,'#f2dc93');}}
 }
 // Bank reeds, pebbles and clumps of vegetation, with clear roads and gardens.
 for(const c of view.city.cells){if(c.channel||c.road)continue;const n=rand(c.x+21,c.z+17);
  const bank=[[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dz])=>view.cellAt(c.x+dx,c.z+dz)?.channel);
  if(bank){for(let i=0;i<3;i++){const x=c.x+(i-1)*.2,z=c.z+.22;add(x,c.ground*V+.18,z,.055,.36,.055,i%2?'#b6b273':'#70996a');}if(n>.5)stones.push([c.x+.2,c.ground*V+.12,c.z-.2,.26,.17,.2,'#afbaa0']);}
  else if(n<.13&&free(c.x,c.z,1.3,1.3)&&clear(c.x,c.z,1.2,1.2)){tree(c.x,c.z,c.x>15&&c.z<-5?1:0,.85+n*6);reserve(c.x,c.z,1.3,1.3);}
  else if(n>.88&&free(c.x,c.z,.3,.3)){for(let k=0;k<2;k++)add(c.x+k*.13,c.ground*V+.09,c.z,.035,.17,.035,'#9bae6b');}
 }
 view.batchBoxes(boxes);
 const batches=[[new THREE.ConeGeometry(1,1,4),roofs,Math.PI/4],[new THREE.IcosahedronGeometry(1,0),crowns,0],[new THREE.IcosahedronGeometry(1,0),stones,0]];
 for(const [geo,items,yaw] of batches){const mesh=new THREE.InstancedMesh(geo,new THREE.MeshLambertMaterial({flatShading:true}),items.length);items.forEach((b,i)=>{view.dummy.position.set(b[0],b[1],b[2]);view.dummy.scale.set(b[3],b[4],b[5]);view.dummy.rotation.set(0,yaw,0);view.dummy.updateMatrix();mesh.setMatrixAt(i,view.dummy.matrix);mesh.setColorAt(i,new THREE.Color(b[6]));});mesh.castShadow=true;mesh.receiveShadow=true;view.scene.add(mesh);}
}
