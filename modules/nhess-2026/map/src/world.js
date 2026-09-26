import * as THREE from 'three';
import {surfaceSampler} from './surface.js';

// Procedural, deterministic assets. Every placement uses the same terrain sampler.
export async function buildWorld(data, scene) {
  async function yieldBuild(message){const p=document.querySelector('#loading p');if(p)p.textContent=message;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
  let seed=data.seed;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const range=(a,b)=>a+(b-a)*rand();
  const clamp=THREE.MathUtils.clamp;
  const root=new THREE.Group();root.name='Vermilion illustrative world';scene.add(root);
  const groups={};
  for(const name of ['terrain','water','roads','bridges','buildings','vegetation','landcover','boundaries']) {groups[name]=new THREE.Group();groups[name].name=name;root.add(groups[name]);}
  const hf=data.heightfield;
  const bankHeight=data.terrain.elevations?surfaceSampler(data.terrain,data.terrain.elevations,true):()=>null;
  const waterWeight=data.terrain.elevations?surfaceSampler(data.water,data.water.mainStemWeights):()=>null;
  function height(x,z){
    const bank=bankHeight(x,z);if(bank!==null)return bank;
    const wet=waterWeight(x,z);
    if(wet!==null){const p=data.waterProfile,side=p?.sideStreamBedDepth??.045,main=p?.mainStemBedDepth??.15;return waterSurface(x,z)-(side+(main-side)*wet);}
    return groundHeight(x,z);
  }
  function groundHeight(x,z){
    let u=clamp((x-hf.x0)/hf.step,0,hf.width-1.001),v=clamp((z-hf.z0)/hf.step,0,hf.height-1.001);
    const i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j,k=j*hf.width+i;
    return (hf.values[k]*(1-a)+hf.values[k+1]*a)*(1-b)+(hf.values[k+hf.width]*(1-a)+hf.values[k+hf.width+1]*a)*b;
  }
  const level=z=>data.waterProfile?Math.max(data.waterProfile.seaLevel??-Infinity,data.waterProfile.base+(data.waterProfile.referenceZ-z)*data.waterProfile.slope):1+(93-z)*.025;
  const waterSurface=(x,z)=>data.water.elevations?(waterWeight(x,z,data.water.elevations)??level(z)+.045):level(z)+.045;
  function inside(x,z,poly=data.boundary){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++) {const a=poly[i],b=poly[j];if(((a[1]>z)!==(b[1]>z))&&(x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]))c=!c;}return c;}
  const streamSegments=[];
  const riverBins=new Map(),roadBins=new Map(),binSize=1.5;
  function insertSegment(bins,segment,x0,z0,x1,z1){
    for(let x=Math.floor(Math.min(x0,x1)/binSize);x<=Math.floor(Math.max(x0,x1)/binSize);x++)for(let z=Math.floor(Math.min(z0,z1)/binSize);z<=Math.floor(Math.max(z0,z1)/binSize);z++){
      const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(segment);
    }
  }
  function nearby(bins,x,z,radius){const found=new Set(),ix=Math.floor(x/binSize),iz=Math.floor(z/binSize);for(let i=ix-radius;i<=ix+radius;i++)for(let j=iz-radius;j<=iz+radius;j++)for(const segment of bins.get(i+','+j)??[])found.add(segment);return found;}
  for(const s of data.streams)for(let i=0;i<s.points.length-1;i++){
    const a=s.points[i],b=s.points[i+1],segment=[a[0],a[1],b[0]-a[0],b[1]-a[1],s.width*.5,s.bankWidth??.055];streamSegments.push(segment);insertSegment(riverBins,segment,a[0],a[1],b[0],b[1]);
  }
  function riverDistance(x,z){let min=1e6;for(const [a,b,dx,dz,w] of nearby(riverBins,x,z,3)){const t=clamp(((x-a)*dx+(z-b)*dz)/(dx*dx+dz*dz),0,1);const d=(x-a-dx*t)**2+(z-b-dz*t)**2; if(d<min)min=d;}return Math.sqrt(min);}
  const roadSegments=[];
  function addRoadSegments(points,width){for(let i=1;i<points.length;i++){const segment=[points[i-1],points[i],width];roadSegments.push(segment);insertSegment(roadBins,segment,...points[i-1],...points[i]);}}
  function roadDistance(x,z){let min=1e6;for(const [a,b,w]of nearby(roadBins,x,z,1)){const dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);min=Math.min(min,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)-w/2);}return min;}
  const bounds=data.bounds??[-61,-143,126,111];
  const ringBounds=new WeakMap();
  function inRings(x,z,rings=[]){return rings.some(poly=>{if(!ringBounds.has(poly))ringBounds.set(poly,[Math.min(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1])),Math.max(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[1]))]);const b=ringBounds.get(poly);return x>=b[0]&&x<=b[2]&&z>=b[1]&&z<=b[3]&&inside(x,z,poly);});}
  function nearTown(x,z,extra=0){return data.georeferenced?data.towns.some(t=>inRings(x,z,t.polygons)):data.towns.some(t=>Math.hypot(x-t.x,z-t.z)<t.size+extra);}
  function inSwamp(x,z){return data.swamp?inRings(x,z,data.swamp.polygons):(x>2&&x<31&&z>-31&&z<22);}
  function dry(x,z){return inside(x,z)&&waterWeight(x,z)===null&&height(x,z)>level(z)+(data.georeferenced?.035:.35);}

  const color=new THREE.Color(),grassA=new THREE.Color('#91a16b'),grassB=new THREE.Color('#abb578'),wetA=new THREE.Color('#789986');
  function makeSurface(source,kind){
    const positions=[],colors=[],uvs=[];
    for(let i=0;i<source.vertices.length;i+=2){const x=source.vertices[i],z=source.vertices[i+1];let y=source.elevations?.[i/2]??(kind==='water'?level(z)+.045:height(x,z));
      if(kind==='banks')y=Math.min(y+.03,level(z)+.18);
      if(kind==='swamp')y+=.025;
      positions.push(x,y,z);uvs.push(x/7,z/7);
      if(kind==='terrain'){
        let n=(Math.sin(x*.13+z*.08)+Math.sin(z*.25-x*.04)*.5+1.5)/3;
        color.copy(grassA).lerp(grassB,n*.7);
        const wet=clamp((35+z)/145,0,.68);color.lerp(wetA,wet);
        if(y<level(z)+.6)color.lerp(new THREE.Color('#8eab87'),.6);
        if(z<-57)color.lerp(new THREE.Color('#baaf7c'),clamp((y-10)/13,0,.4));
        if(data.georeferenced&&nearTown(x,z))color.lerp(new THREE.Color('#b6b4a4'),.48);
        const noise=(Math.sin(x*1.77+z*2.67)*Math.sin(z*1.92-x*.66))*.018;
        color.offsetHSL(0,0,noise);
        if(source.bankFlags?.[i/2])color.lerp(new THREE.Color('#887c5e'),(1-source.bankBlend[i/2])*.72);
        colors.push(color.r,color.g,color.b);
      }
      if(kind==='water'&&source.mainStemWeights){color.set('#70a89e').lerp(new THREE.Color('#347f89'),source.mainStemWeights[i/2]);if(source.coastalWeights?.[i/2])color.set('#598eac');colors.push(color.r,color.g,color.b);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    if(colors.length)geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    // Shapely's counter-clockwise XY triangles face down when mapped to XZ.
    const indices=[];for(let i=0;i<source.indices.length;i+=3){const a=source.indices[i],b=source.indices[i+1],c=source.indices[i+2];const ax=positions[a*3],az=positions[a*3+2],bx=positions[b*3],bz=positions[b*3+2],cx=positions[c*3],cz=positions[c*3+2];if((bx-ax)*(cz-az)-(bz-az)*(cx-ax)>0)indices.push(a,c,b);else indices.push(a,b,c);}
    geo.setIndex(indices);geo.computeVertexNormals();
    const mat=kind==='terrain'?new THREE.MeshLambertMaterial({vertexColors:true}):new THREE.MeshStandardMaterial({color:kind==='water'?'#479ca0':kind==='swamp'?'#65805c':'#a9b28a',roughness:kind==='water'?.36:.95,metalness:kind==='water'?.1:0});
    if(kind==='water'&&source.mainStemWeights){mat.color.set(0xffffff);mat.vertexColors=true;mat.roughness=1;mat.metalness=0;}
    const mesh=new THREE.Mesh(geo,mat);mesh.receiveShadow=true;mesh.name=kind;groups[kind==='terrain'?'terrain':kind==='swamp'?'landcover':'water'].add(mesh);return mesh;
  }
  const terrain=makeSurface(data.terrain,'terrain');
  if(data.banks?.indices.length)makeSurface(data.banks,'banks');
  const water=makeSurface(data.water,'water');
  if(data.swamp)makeSurface(data.swamp.mesh,'swamp');
  await yieldBuild('Geographic layers aligned. Laying out the mapped streets…');
  // Subtle procedural ripples, with all texture generation local and reproducible.
  const rippleCanvas=document.createElement('canvas');rippleCanvas.width=rippleCanvas.height=256;
  const rc=rippleCanvas.getContext('2d');rc.fillStyle='#c2e0d5';rc.fillRect(0,0,256,256);
  for(let i=0;i<100;i++){let x=rand()*256,y=rand()*256;rc.strokeStyle=`rgba(255,255,233,${range(.05,.2)})`;rc.lineWidth=range(.4,1);rc.beginPath();rc.ellipse(x,y,range(2,10),.65,-.3,0,Math.PI);rc.stroke();}
  const waterTexture=new THREE.CanvasTexture(rippleCanvas);waterTexture.wrapS=waterTexture.wrapT=THREE.RepeatWrapping;waterTexture.colorSpace=THREE.SRGBColorSpace;
  // The permanent channel is a quiet, opaque color fill meeting the bank toes.
  // It has no animated displacement, glint, or second raised water sheet.
  if(!data.georeferenced)water.material.map=waterTexture;

  // The cut edge follows the watershed; a layered soil section gives it weight.
  const sideMaterials=['#706750','#968363','#bbab7f'];
  for(let band=0;band<3;band++){
    const pos=[];for(let i=0;i<data.boundary.length-1;i++){
      const a=data.boundary[i],b=data.boundary[i+1];const bottom=-7+band*2.4,top=band===2?null:bottom+2.4;
      const ya=top??height(a[0],a[1]),yb=top??height(b[0],b[1]);
      pos.push(a[0],bottom,a[1],b[0],bottom,b[1],b[0],yb,b[1],a[0],bottom,a[1],b[0],yb,b[1],a[0],ya,a[1]);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:sideMaterials[band],side:THREE.DoubleSide}));mesh.castShadow=band===2;mesh.receiveShadow=true;groups.terrain.add(mesh);
  }
  const edge=new THREE.BufferGeometry().setFromPoints(data.boundary.map(([x,z])=>new THREE.Vector3(x,height(x,z)+.06,z)));
  groups.terrain.add(new THREE.LineLoop(edge,new THREE.LineBasicMaterial({color:'#c8c49b',transparent:true,opacity:.65})));
  if(data.georeferenced){for(const t of data.towns)for(const ring of t.polygons){const g=new THREE.BufferGeometry().setFromPoints(ring.map(([x,z])=>new THREE.Vector3(x,height(x,z)+.09,z)));groups.boundaries.add(new THREE.LineLoop(g,new THREE.LineBasicMaterial({color:'#ac8456',transparent:true,opacity:.8})));}groups.boundaries.visible=false;}

  // A small geometry library, drawn with instancing instead of thousands of meshes.
  const roofGeo=new THREE.BufferGeometry();
  roofGeo.setAttribute('position',new THREE.Float32BufferAttribute([
    -.5,0,-.5, 0,1,-.5, .5,0,-.5, -.5,0,.5, .5,0,.5, 0,1,.5,
    -.5,0,-.5, -.5,0,.5, 0,1,.5, -.5,0,-.5, 0,1,.5, 0,1,-.5,
    0,1,-.5, 0,1,.5, .5,0,.5, 0,1,-.5, .5,0,.5, .5,0,-.5
  ],3));roofGeo.computeVertexNormals();
  const geos={box:new THREE.BoxGeometry(1,1,1),roof:roofGeo,leaf:new THREE.IcosahedronGeometry(1,1),smallLeaf:new THREE.IcosahedronGeometry(1,0),cylinder:new THREE.CylinderGeometry(.5,.5,1,8),cone:new THREE.ConeGeometry(.5,1,7),sphere:new THREE.SphereGeometry(.5,10,6)};
  const batches=new Map();const dummy=new THREE.Object3D();let assetContext=null;
  function part(group,type,x,y,z,sx,sy,sz,c,rotation=0){
    if(assetContext){const a=assetContext;x=a.x+(x-a.x)*a.scale;y=a.y+(y-a.y)*a.scale;z=a.z+(z-a.z)*a.scale;sx*=a.scale;sy*=a.scale;sz*=a.scale;}
    const key=group+'/'+type;if(!batches.has(key))batches.set(key,[]);
    dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,rotation,0);dummy.updateMatrix();
    batches.get(key).push([dummy.matrix.clone(),c]);
  }
  function boxPart(group,x,y,z,sx,sy,sz,c,r=0){part(group,'box',x,y,z,sx,sy,sz,c,r);}
  function transform(x,z,dx,dz,a){return [x+dx*Math.cos(a)+dz*Math.sin(a),z-dx*Math.sin(a)+dz*Math.cos(a)];}
  function localPart(group,type,x,y,z,dx,dy,dz,sx,sy,sz,c,a){let [px,pz]=transform(x,z,dx,dz,a);part(group,type,px,y+dy,pz,sx,sy,sz,c,a);}
  function surfacePolygon(points,color,group='landcover',offset=.03){
    // Tessellated fan surfaces follow the same relief as terrain.
    const cx=points.reduce((s,p)=>s+p[0],0)/points.length,cz=points.reduce((s,p)=>s+p[1],0)/points.length;
    const pos=[];
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];const steps=Math.max(1,Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/.7));
      for(let j=0;j<steps;j++){
        const u=j/steps,v=(j+1)/steps;const p=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u],q=[a[0]+(b[0]-a[0])*v,a[1]+(b[1]-a[1])*v];
        const radial=Math.max(2,Math.ceil(Math.hypot(p[0]-cx,p[1]-cz)/.7));
        for(let k=0;k<radial;k++){
          const t=k/radial,s=(k+1)/radial;
          const pts=[[cx+(p[0]-cx)*t,cz+(p[1]-cz)*t],[cx+(q[0]-cx)*t,cz+(q[1]-cz)*t],[cx+(q[0]-cx)*s,cz+(q[1]-cz)*s],[cx+(p[0]-cx)*s,cz+(p[1]-cz)*s]];
          for(const ii of [0,2,1,0,3,2])pos.push(pts[ii][0],height(...pts[ii]) +offset,pts[ii][1]);
        }
      }
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.computeVertexNormals();
    const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide}));m.receiveShadow=true;groups[group].add(m);return m;
  }
  function ribbon(points,width,color,offset=.05,group='roads',heightFn=height){
    const positions=[],idx=[];
    for(let i=0;i<points.length;i++){
      const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz)||1;const nx=-dz/len*width/2,nz=dx/len*width/2;
      for(const sign of [-1,1]){const x=points[i][0]+nx*sign,z=points[i][1]+nz*sign;positions.push(x,heightFn(x,z)+offset,z);}
      if(i>0){const n=i*2;idx.push(n-2,n-1,n,n-1,n+1,n);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(idx);geo.computeVertexNormals();
    const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide}));m.receiveShadow=true;groups[group].add(m);return m;
  }
  function linearPoints(a,b,step=.45){const n=Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/step));return Array.from({length:n+1},(_,i)=>[a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n]);}
  const roadProfiles=[];let bridgeCount=0;
  function road(points,width,main=false){
    addRoadSegments(points,width);
    const crossings=[];
    if(data.terrain.elevations)for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],roadLength=Math.hypot(dx,dz);
      if(roadLength<1e-7)continue;
      for(const [sx,sz,ux,uz,halfWidth,bankWidth] of nearby(riverBins,(a[0]+b[0])/2,(a[1]+b[1])/2,1)){
        const cross=dx*uz-dz*ux;if(Math.abs(cross)<1e-9)continue;
        const qx=sx-a[0],qz=sz-a[1],t=(qx*uz-qz*ux)/cross,u=(qx*dz-qz*dx)/cross;
        if(t<0||t>1||u<0||u>1)continue;
        const x=a[0]+dx*t,z=a[1]+dz*t;if(crossings.some(p=>Math.hypot(p.x-x,p.z-z)<.05))continue;
        const sine=Math.abs(cross)/(roadLength*Math.hypot(ux,uz));
        const len=Math.min(1.2,(2*halfWidth+2*bankWidth+.035)/Math.max(.25,sine));
        const nx=dx/roadLength,nz=dz/roadLength;
        const y=Math.max(groundHeight(x-nx*len/2,z-nz*len/2),groundHeight(x+nx*len/2,z+nz*len/2));
        crossings.push({x,z,nx,nz,len,y,rot:Math.atan2(dx,dz)});
      }
    }
    // Carry the deck smoothly across water; retain embankments near approaches.
    const deck=(x,z)=>{
      if(!data.terrain.elevations)return Math.max(height(x,z),level(z)+(data.georeferenced?.16:.9));
      let y=groundHeight(x,z);
      for(const c of crossings){
        const along=Math.abs((x-c.x)*c.nx+(z-c.z)*c.nz),across=Math.abs((x-c.x)*c.nz-(z-c.z)*c.nx);
        if(across>width+.08)continue;
        const blend=1-clamp((along-c.len/2)/.18,0,1);
        y=Math.max(y,y+(c.y-y)*blend);
      }
      return y;
    };
    ribbon(points,width+(data.georeferenced?.012:.20),'#b8b89b',data.georeferenced?.018:.038,'roads',deck);
    ribbon(points,width,'#788581',data.georeferenced?.026:.063,'roads',deck);
    roadProfiles.push({points,width,deck});
    if(main){
      // Sparse lane paint remains readable without shimmering from a distance.
      for(let i=1;i<points.length-1;i+=data.georeferenced?6:4){const a=points[i],b=points[i+1];ribbon([a,b],data.georeferenced?.008:.035,'#e6daba',data.georeferenced?.031:.079,'roads',deck);}
    }
    if(data.terrain.elevations){
      // A discrete deck covers only the actual stream crossing. Keep it out of
      // the ground-depth overlay; the road approaches retain flood coloring.
      for(const {x,z,len,rot} of crossings){
          const y=deck(x,z)+.032;bridgeCount++;
          boxPart('bridges',x,y,z,width+.013,.012,len,'#788581',rot);
          if(width>=.07)for(const side of [-1,1])localPart('bridges','box',x,y,z,side*(width/2+.004),.023,0,.008,.025,len,'#a7b29d',rot);
      }
      return;
    }
    // Legacy non-geographic scene crossings.
    let start=-1;
    for(let i=0;i<=points.length;i++){
      const wet=i<points.length&&height(...points[i])<level(points[i][1])+(data.georeferenced?.065:.4);
      if(wet&&start<0)start=Math.max(0,i-2);
      if(!wet&&start>=0){
        const end=Math.min(points.length-1,i+1),a=points[start],b=points[end],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,len=Math.hypot(b[0]-a[0],b[1]-a[1]);
        const rot=Math.atan2(b[0]-a[0],b[1]-a[1]),y=Math.max(level(a[1]),level(b[1]))+(data.georeferenced?.20:1.02),f=data.georeferenced?.24:1;
        boxPart('roads',x,y,z,width+.10*f,.19*f,len,'#8e9990',rot);
        for(const side of [-1,1]){
          localPart('roads','box',x,y,z,side*(width/2+.03*f),.20*f,0,.075*f,.12*f,len,'#d1d4b8',rot);
          for(const j of [-.3,.3]) localPart('roads','box',x,y,z,side*width*.32,-.65*f,j*len,.19*f,1.2*f,.2*f,'#9a9b82',rot);
        }
        start=-1;
      }
    }
  }
  for(const r of data.roads)road(r.points,r.width??(r.kind==='highway'?1.05:r.kind==='arterial'?.75:.48),data.georeferenced?r.kind==='highway':r.kind!=='minor');
  mergeGroup(groups.roads);
  await yieldBuild('Streets and bridges ready. Building the neighborhoods…');

  const houses=[];const special=[];let buildingCount=0;
  const roofColors=['#b07859','#835d4c','#556b64','#818871','#a08c66','#726d60'];
  const wallColors=['#e6dcc0','#d9d4b9','#f0e5c9','#c3cdb6','#e4c6a5','#bac6b1'];
  function tree(x,z,s=1,type='oak'){
    if(!dry(x,z))return;
    const y=height(x,z),a=rand()*Math.PI*2;
    part('vegetation','cylinder',x,y+s*.54,z,.12*s,s*1.08,.12*s,'#776e49');
    if(type==='cypress'){
      part('vegetation','cone',x,y+s*1.3,z,.90*s,1.65*s,.90*s,rand()<.5?'#527661':'#69886a',a);
      part('vegetation','cone',x,y+s*1.85,z,.56*s,1.0*s,.56*s,'#648770',a);
    } else {
      const c=rand()<.35?'#738755':rand()<.6?'#688159':'#8a9b61';
      part('vegetation','leaf',x,y+s*1.1,z,s*.63,s*.68,s*.60,c,a);
      if(s>.6){part('vegetation','smallLeaf',x+s*.34,y+s*.98,z+s*.14,s*.43,s*.42,s*.4,c,a);part('vegetation','smallLeaf',x-s*.27,y+s*.93,z-s*.17,s*.4,s*.39,s*.42,'#84965f',a);}
    }
  }
  function car(x,z,angle,c){const y=Math.max(height(x,z),level(z)+.9)+.12;
    boxPart('roads',x,y,z,.24,.17,.46,c,angle);localPart('roads','box',x,y,z,0,.11,-.03,.21,.12,.22,'#4f6565',angle);
    for(const side of [-1,1])for(const end of [-1,1])localPart('roads','box',x,y,z,side*.12,-.05,end*.14,.04,.1,.1,'#4b5147',angle);
  }
  function house(x,z,a=0,scale=1){
    if(!data.georeferenced&&(!dry(x,z)||riverDistance(x,z)<1.3))return;
    const w=range(.72,1.05)*scale,d=range(.88,1.28)*scale,h=range(.52,.80)*scale;const ground=Math.max(height(x-w/2,z-d/2),height(x+w/2,z+d/2));
    if(!data.georeferenced&&[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].some(([dx,dz])=>{const p=transform(x,z,dx,dz,a);return roadDistance(...p)<.12||riverDistance(...p)<1||!dry(...p);}))return;
    const y=ground+.06,wall=wallColors[Math.floor(rand()*wallColors.length)],roof=roofColors[Math.floor(rand()*roofColors.length)];
    boxPart('buildings',x,y-.01,z,w+.13,.18,d+.14,'#b2aa8a',a);
    boxPart('buildings',x,y+h/2,z,w,h,d,wall,a);
    part('buildings','roof',x,y+h,z,w+.14,h*.52,d+.18,roof,a);
    localPart('buildings','box',x,y,z,0,.18,d/2+.04,.18,.34,.04,'#786d58',a);
    for(const side of [-1,1]){localPart('buildings','box',x,y,z,side*w*.31,h*.63,d/2+.025,.17,.18,.025,'#527a7e',a);localPart('buildings','box',x,y,z,side*(w/2+.012),h*.62,0,.025,.18,.22,'#617d7a',a);}
    // Porch, posts and chimney give close views recognizable little houses.
    localPart('buildings','box',x,y,z,0,.035,d/2+(data.georeferenced?.06:.20),w*.55,.08,data.georeferenced?.13:.36,'#c6c0a0',a);
    localPart('buildings','box',x,y,z,0,h*.60,d/2+(data.georeferenced?.04:.17),w*.66,.07,data.georeferenced?.14:.37,roof,a);
    for(const side of [-1,1])localPart('buildings','box',x,y,z,side*w*.27,h*.28,d/2+(data.georeferenced?.09:.29),.035,h*.55,.035,'#e5dabe',a);
    localPart('buildings','box',x,y,z,w*.24,h+.10,-d*.2,.12,.38,.17,'#b19475',a);
    if(!data.georeferenced&&rand()<.5){let p=transform(x,z,w*.8,-.1,a);if(dry(...p)&&roadDistance(...p)>.2)tree(...p,range(.48,.78));}
    houses.push({x,z,width:w,depth:d,rotation:a});buildingCount++;
  }
  function commercial(x,z,a,stories=2,w=1.45,d=1.5){
    if(!data.georeferenced&&(!dry(x,z)||riverDistance(x,z)<1.25))return;
    if(!data.georeferenced&&[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].some(([dx,dz])=>{const p=transform(x,z,dx,dz,a);return roadDistance(...p)<.03||!dry(...p);}))return;
    const y=Math.max(height(x-w/2,z-d/2),height(x+w/2,z+d/2))+.04,h=.58*stories;
    boxPart('buildings',x,y+.02,z,w+.11,.18,d+.11,'#bab69d',a);
    boxPart('buildings',x,y+h/2,z,w,h,d,wallColors[Math.floor(rand()*wallColors.length)],a);
    boxPart('buildings',x,y+h+.07,z,w+.05,.13,d+.05,'#718174',a);
    boxPart('buildings',x,y+h+.13,z,w*.75,.10,d*.75,'#8b998a',a);
    for(let floor=0;floor<stories;floor++)for(let col=0;col<3;col++){
      for(const side of [-1,1])localPart('buildings','box',x,y,z,(col-1)*w*.28,.3+floor*.58,side*(d/2+.01),w*.17,.23,.022,'#6e9490',a);
      for(const side of [-1,1])localPart('buildings','box',x,y,z,side*(w/2+.01),.3+floor*.58,(col-1)*d*.28,.022,.23,d*.17,'#648881',a);
    }
    localPart('buildings','box',x,y,z,0,.46,d/2+.16,w*.92,.065,.32,rand()<.5?'#ba8055':'#687f63',a);
    localPart('buildings','box',x,y,z,-w*.2,h+.23,0,.3,.19,.3,'#b1b7a5',a);
    buildingCount++;
  }
  function church(x,z,a){
    const y=height(x,z),w=1.45,d=2.3;
    boxPart('buildings',x,y+.60,z,w,1.2,d,'#e8dfc1',a);part('buildings','roof',x,y+1.2,z,w+.16,.65,d+.12,'#768475',a);
    localPart('buildings','box',x,y,z,0,1.0,d*.39,.52,2,.58,'#e6dcc1',a);
    localPart('buildings','cone',x,y,z,0,2.6,d*.39,.76,1.2,.76,'#687e71',a);
    localPart('buildings','box',x,y,z,0,3.33,d*.39,.055,.37,.055,'#e1d8b8',a);
    localPart('buildings','box',x,y,z,0,3.37,d*.39,.22,.04,.04,'#e1d8b8',a);
    localPart('buildings','box',x,y,z,0,.32,d/2+.014,.31,.64,.035,'#92735a',a);
    buildingCount++;
  }
  function waterTower(x,z){const y=height(x,z);for(const dx of [-.38,.38])for(const dz of [-.38,.38])boxPart('buildings',x+dx,y+1.3,z+dz,.08,2.6,.08,'#a6b7ae');part('buildings','cylinder',x,y+2.65,z,1.1,.80,1.1,'#d4ded0');part('buildings','sphere',x,y+3.05,z,1.1,.36,1.1,'#d4ded0');}
  function park(t,cx,cz,size){const p=(x,z)=>transform(t.x,t.z,cx+x,cz+z,t.angle);
    surfacePolygon([p(-size,-size),p(size,-size),p(size,size),p(-size,size)],'#9eae75');
    ribbon(linearPoints(p(-size,0),p(size,0)),.20,'#d3c8a3',.045,'landcover');ribbon(linearPoints(p(0,-size),p(0,size)),.20,'#d3c8a3',.045,'landcover');
    const [x,z]=p(0,0),y=height(x,z);
    part('buildings','cylinder',x,y+.11,z,.7,.21,.7,'#d6d0b2');part('buildings','cylinder',x,y+.23,z,.55,.04,.55,'#70afb0');
    for(const dx of [-1,1])for(const dz of [-1,1]){const q=p(dx*size*.66,dz*size*.66);tree(...q,.8);}
    for(const side of [-1,1]){const q=p(side*size*.52,.38);boxPart('buildings',q[0],height(...q)+.15,q[1],.40,.08,.17,'#a18e6b',t.angle);}
  }
  const townStreets=[];
  if(data.buildings){
    for(const b of data.buildings){
      assetContext={x:b.x,z:b.z,y:height(b.x,b.z),scale:b.scale};
      const town=data.towns.find(t=>t.id===b.town),d=town?Math.hypot(b.x-town.x,b.z-town.z):99;
      if(d<2.5||rand()<.16){if(b.kind==='commercial')commercial(b.x,b.z,b.angle,b.stories,.92,1.08);else house(b.x,b.z,b.angle,1);}
      else {
        const y=height(b.x,b.z),h=b.kind==='commercial'?.58*b.stories:.70;
        boxPart('buildings',b.x,y+h*.5,b.z,.86,h,1.04,wallColors[Math.floor(rand()*wallColors.length)],b.angle);
        if(b.kind==='commercial')boxPart('buildings',b.x,y+h+.06,b.z,.94,.12,1.12,'#79887a',b.angle);
        else part('buildings','roof',b.x,y+h,b.z,.98,.35,1.17,roofColors[Math.floor(rand()*roofColors.length)],b.angle);
        for(const side of [-1,1])localPart('buildings','box',b.x,y,b.z,side*.24,.44,.53,.18,.20,.025,'#65877f',b.angle);
        buildingCount++;
      }
      assetContext=null;
    }
    for(const b of data.buildings){if(rand()>.20)continue;const p=transform(b.x,b.z,b.scale*.75,-b.scale*.65,b.angle);if(dry(...p)&&roadDistance(...p)>.07&&!inSwamp(...p))tree(...p,b.scale*range(.65,1.05));}
    await yieldBuild('Neighborhoods placed. Growing the swamp forest…');
  }
  for(const t of data.georeferenced?[]:data.towns){
    const step=t.kind==='city'?3.4:3.2;const n=Math.floor(t.size/step);const extent=n*step+.3;
    const p=(x,z)=>transform(t.x,t.z,x,z,t.angle);
    for(let i=-n;i<=n;i++)for(const axis of [0,1]){
      const a=axis?p(-extent,i*step):p(i*step,-extent),b=axis?p(extent,i*step):p(i*step,extent);
      const pts=linearPoints(a,b);road(pts,.44);townStreets.push({points:pts,angle:t.angle+(axis?Math.PI/2:0)});
      if(i===0||Math.abs(i)===n){for(let j=1;j<pts.length-1;j+=6){const pt=pts[j],dx=axis?0:.45,dz=axis?.45:0;const q=transform(pt[0],pt[1],dx,dz,t.angle);if(dry(...q)&&riverDistance(...q)>1.3)tree(...q,.42);}}
    }
    const centerX=-step*.5,centerZ=-step*.5;
    park(t,centerX,centerZ,step*.40);
    for(let ix=-n;ix<n;ix++)for(let iz=-n;iz<n;iz++){
      if(ix===-1&&iz===-1)continue;
      const downtown=Math.abs(ix+.5)<1.1&&Math.abs(iz+.5)<1.1;
      if(downtown){
        const q=p((ix+.5)*step,(iz+.5)*step);
        if(ix===0&&iz===-1){church(...q,t.angle);continue;}
        for(const dx of [-.69,.69]){const pos=p((ix+.5)*step+dx,(iz+.5)*step);commercial(...pos,t.angle,t.kind==='city'?Math.floor(range(2,6)):Math.floor(range(1,3)),1.16,2.04);}
      } else {
        for(const dx of [.27,.73])for(const dz of [.28,.72]){
          const q=p((ix+dx)*step,(iz+dz)*step);if(!inside(...q)||roadDistance(...q)<.42)continue;
          if(rand()<.07){tree(...q,.82);continue;}
          house(...q,t.angle+(dz<.5?Math.PI:0),range(.80,1.0));
        }
      }
    }
    const q=p(extent-.9,extent-1);waterTower(...q);
    // A school, its play field and an adjacent low-rise civic block.
    if(t.kind!=='village'){
      const q=p(-extent+1.5,extent+2.0);
      if(dry(...q)&&riverDistance(...q)>2){commercial(...q,t.angle,1,2.5,1.4);const field=[p(-extent+3.3,extent+.5),p(-extent+6.5,extent+.5),p(-extent+6.5,extent+3.6),p(-extent+3.3,extent+3.6)];if(field.every(p=>dry(...p)))surfacePolygon(field,'#87a371');}
    }
  }
  // Riverfront greenway, with a continuous pale walking path along a meander.
  if(!data.georeferenced){const front=data.streams[0].points.filter(p=>p[1]>-37&&p[1]<-15).map(([x,z])=>[x-1.6,z]);
  ribbon(front,.24,'#d2c6a1',.05,'landcover');for(let i=0;i<front.length;i+=5)tree(front[i][0]-.65,front[i][1],.65);}

  // Patchwork agricultural land sits between, rather than underneath, the towns.
  const fieldColors=['#b8b786','#a1ac71','#c2b58a','#95a16b','#b1ad75','#9cab7c'];
  let fieldCount=0;
  const fieldStep=data.georeferenced?4.8:7.8;
  for(let x=bounds[0]+2;x<bounds[2]-3;x+=fieldStep)for(let z=bounds[1]+2;z<bounds[3]-18;z+=fieldStep*1.1){
    const xx=x+range(-.4,.4),zz=z+range(-.4,.4),w=range(fieldStep*.65,fieldStep*.87),d=range(fieldStep*.66,fieldStep*.92);
    const pts=[[xx,zz],[xx+w,zz],[xx+w,zz+d],[xx,zz+d]];
    const checks=[...pts,[xx+w/2,zz+d/2],[xx+w/2,zz],[xx+w/2,zz+d],[xx,zz+d/2],[xx+w,zz+d/2]];
    if(!checks.every(p=>dry(...p)&&riverDistance(...p)>(data.georeferenced?.4:2)&&roadDistance(...p)>(data.georeferenced?.2:.9)&&!nearTown(...p,3)&&!inSwamp(...p)))continue;
    if(rand()<.13)continue;
    surfacePolygon(pts,fieldColors[Math.floor(rand()*fieldColors.length)]);fieldCount++;
    for(let row=1;row<d;row+=.48){const points=linearPoints([xx+.15,zz+row],[xx+w-.15,zz+row],.7);ribbon(points,.038,'#8b9b63',.045,'landcover');}
    if(rand()<.18){if(data.georeferenced)assetContext={x:xx+w*.2,z:zz+d*.15,y:height(xx+w*.2,zz+d*.15),scale:.3};house(xx+w*.2,zz+d*.15,0,.7);assetContext=null;}
  }
  // Wooded banks, scattered live oaks, cypress stands, and coastal marsh tufts.
  let treeCount=0;
  if(data.swamp){for(const [x,z,s] of data.swamp.trees){tree(x,z,s,rand()<.7?'cypress':'oak');treeCount++;}}
  for(let i=0;i<14000;i++){
    const x=range(bounds[0],bounds[2]),z=range(bounds[1],bounds[3]);if(!dry(x,z)||nearTown(x,z,1.5)||roadDistance(x,z)<(data.georeferenced?.2:.9)||inSwamp(x,z))continue;
    const dist=riverDistance(x,z),wetland=data.georeferenced?z>74:(x>2&&x<31&&z>-31&&z<22)||(z>61&&x>37);
    const forest=dist<4.0||wetland||Math.sin(x*.24+z*.11)*Math.cos(z*.19)>.74;
    if(!forest&&rand()>.06)continue;
    if(dist<(data.georeferenced?.25:.75))continue;
    if(!wetland&&z>81)continue;
    tree(x,z,(wetland?range(.68,1.25):range(.50,1.0))*(data.georeferenced?.52:1),wetland?'cypress':'oak');treeCount++;
  }
  for(let i=0;i<1200;i++){
    const x=range(bounds[0],bounds[2]),z=range(62,bounds[3]);if(!dry(x,z)||roadDistance(x,z)<.6||nearTown(x,z,2))continue;
    const y=height(x,z),s=range(.16,.38);part('vegetation','cone',x,y+s/2,z,s*.7,s,s*.7,'#8d9b69',rand()*6.28);
  }
  // Parked/moving-in-spirit cars, roadside utility details, and a rail corridor.
  const carColors=['#ede1b6','#597d88','#b78255','#dddcca','#6a7c69'];
  for(const r of townStreets)for(let i=5;i<r.points.length-2;i+=Math.floor(range(9,20))){if(rand()<.35)continue;const p=r.points[i];if(dry(...p))car(p[0]+.12,p[1],r.angle,carColors[Math.floor(rand()*carColors.length)]);}
  if(!data.georeferenced){const rail=data.roads[1].points.filter(p=>p[0]>15).map(([x,z])=>[x,z+2.0]);
  ribbon(rail,.36,'#a8ad93',.05,'roads');
  for(const side of [-1,1])ribbon(rail.map(p=>[p[0],p[1]+side*.10]),.025,'#677668',.075,'roads');
  for(let i=0;i<rail.length;i+=2){let p=rail[i];if(dry(...p))boxPart('roads',p[0],height(...p)+.06,p[1],.12,.04,.35,'#857d62',-.55);}
  }
  for(const s of data.streams.slice(0,1))for(let i=35;i<s.points.length-10;i+=88){const p=s.points[i],q=s.points[i+1],a=Math.atan2(q[0]-p[0],q[1]-p[1]);if(data.georeferenced)assetContext={x:p[0],z:p[1],y:level(p[1]),scale:.25};part('water','sphere',p[0],level(p[1])+.10,p[1],.28,.13,.72,'#e5dbc0',a);boxPart('water',p[0],level(p[1])+.19,p[1],.15,.10,.30,'#a17f55',a);assetContext=null;}

  const mat=new THREE.MeshLambertMaterial({color:0xffffff});
  const bridgeMaterial=new THREE.MeshLambertMaterial({color:0xffffff,polygonOffset:true,polygonOffsetFactor:-5,polygonOffsetUnits:-5});
  for(const [key,instances] of batches){const [group,type]=key.split('/'),mesh=new THREE.InstancedMesh(geos[type],group==='bridges'?bridgeMaterial:mat,instances.length);
    if(group==='bridges')mesh.renderOrder=4;
    instances.forEach(([matrix,c],i)=>{mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,new THREE.Color(c));});
    mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.castShadow=group==='buildings'||group==='vegetation';mesh.receiveShadow=true;mesh.name=key;mesh.computeBoundingSphere();groups[group].add(mesh);
  }
  // Merge static road/field ribbons by material to keep draw calls modest on laptops.
  function mergeGroup(group){
    const byMaterial=new Map();for(const child of [...group.children]){if(!child.isMesh||child.isInstancedMesh||child.material.map)continue;const key=child.material.color.getHexString()+'_'+child.material.side;if(!byMaterial.has(key))byMaterial.set(key,[]);byMaterial.get(key).push(child);}
    for(const meshes of byMaterial.values()){
      if(meshes.length<2)continue;const positions=[],normals=[];
      for(const m of meshes){let g=m.geometry.index?m.geometry.toNonIndexed():m.geometry;positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);if(g!==m.geometry)g.dispose();m.geometry.dispose();group.remove(m);}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));const m=new THREE.Mesh(g,meshes[0].material);m.receiveShadow=true;group.add(m);
    }
  }
  mergeGroup(groups.roads);mergeGroup(groups.landcover);
  return {root,groups,height,level,waterSurface,water,waterTexture,stats:{buildings:buildingCount,trees:treeCount,fields:fieldCount,streams:data.streams.length,bridgeSpans:bridgeCount},data,
    update(time){groups.bridges.visible=groups.roads.visible;waterTexture.offset.y=time*.007;waterTexture.offset.x=time*.002;}};
}
