import * as THREE from 'three';

const surfaceVertex=`
varying vec3 vWorld;
void main(){vec4 p=modelMatrix*vec4(position,1.0);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}
`;
const paletteGLSL=`
vec3 rainColor(float v){
  float t=clamp(v,0.0,1.0)*5.0;
  vec3 a=vec3(.114,.227,.369),b=vec3(.153,.494,.694),c=vec3(.314,.737,.718);
  vec3 d=vec3(.910,.839,.435),e=vec3(.918,.561,.298),f=vec3(.733,.259,.369);
  if(t<1.0)return mix(a,b,t);if(t<2.0)return mix(b,c,t-1.0);
  if(t<3.0)return mix(c,d,t-2.0);if(t<4.0)return mix(d,e,t-3.0);return mix(e,f,t-4.0);
}
`;
const groundFragment=`
uniform sampler2D uField;uniform vec4 uBounds;uniform float uOpacity,uColorScale;
varying vec3 vWorld;
${paletteGLSL}
void main(){
  vec2 uv=(vWorld.xz-uBounds.xy)/(uBounds.zw-uBounds.xy);
  if(any(lessThan(uv,vec2(0)))||any(greaterThanEqual(uv,vec2(1))))discard;
  vec4 field=texture2D(uField,uv);
  // Sample the >= 1 inch visibility mask without interpolation so smooth
  // colors cannot spill into cells below the display threshold.
  vec4 mask=texelFetch(uField,ivec2(floor(uv*vec2(textureSize(uField,0)))),0);
  float alpha=mask.g*mask.b*mask.a*uOpacity;
  if(alpha<.03)discard;
  gl_FragColor=vec4(rainColor(field.r*uColorScale),alpha);
}
`;

const cloudFragment=`
precision highp sampler3D;
uniform sampler3D uNoise;uniform sampler2D uCloudField;
uniform vec3 uMin,uMax;uniform vec4 uBounds;uniform float uTime,uOpacity,uUniform;
uniform mat4 projectionMatrix;
varying vec3 vWorld;
float noise(vec3 p){vec4 n=texture(uNoise,p*.011);return n.r*.57+n.g*.29+n.b*.14;}
float density(vec3 p){
  if(uUniform>.5)return step(27.0,p.y)*step(p.y,38.0)*.18;
  vec2 uv=(p.xz-uBounds.xy)/(uBounds.zw-uBounds.xy);
  vec4 field=texture2D(uCloudField,uv);
  float strength=field.r,mask=field.g;
  vec3 wind=vec3(uTime*.025,0,uTime*.008);
  float n=noise(p+wind);
  float base=20.0+texture(uNoise,(p+wind)*.005).g*4.0;
  float top=35.0+strength*37.0;
  float y=(p.y-base)/(top-base);
  float profile=smoothstep(0.0,.16,y)*(1.0-smoothstep(.38,1.0,y));
  float detail=texture(uNoise,(p+wind)*.034).b;
  return max(0.0,n-(1.0-profile)-.53+strength*.17-(1.0-detail)*.085)*mask*(1.65+strength*1.20);
}
void main(){
  vec3 rd=normalize(vWorld-cameraPosition),inv=1.0/rd;
  vec3 t0=(uMin-cameraPosition)*inv,t1=(uMax-cameraPosition)*inv;
  vec3 lo=min(t0,t1),hi=max(t0,t1);
  float enter=max(max(lo.x,lo.y),lo.z),leave=min(min(hi.x,hi.y),hi.z);
  if(leave<=max(enter,0.0))discard;
  enter=max(enter,0.0);
  float stepSize=(leave-enter)/64.0;
  float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
  float t=enter+stepSize*jitter,transmittance=1.0,firstHit=-1.0;
  vec3 radiance=vec3(0),sun=normalize(vec3(-.55,.82,.26));
  for(int i=0;i<64;i++){
    vec3 p=cameraPosition+rd*t;
    float d=density(p);
    if(d>.002){
      if(firstHit<0.0)firstHit=t;
      float sunlight=exp(-density(p+sun*5.0)*7.0-density(p+sun*13.0)*13.0);
      float h=clamp((p.y-21.0)/39.0,0.0,1.0);
      vec3 shade=mix(vec3(.18,.235,.315),vec3(.98,1.01,1.05),.17+sunlight*.66+h*.13);
      if(uUniform>.5)shade=mix(vec3(.32,.39,.48),vec3(.93,.97,1.0),smoothstep(27.0,38.0,p.y));
      float alpha=1.0-exp(-d*stepSize*1.55);
      radiance+=transmittance*alpha*shade;
      transmittance*=1.0-alpha;
      if(transmittance<.015)break;
    }
    t+=stepSize;
  }
  float alpha=(1.0-transmittance)*uOpacity;
  if(alpha<.01||firstHit<0.0)discard;
  vec4 clip=projectionMatrix*viewMatrix*vec4(cameraPosition+rd*firstHit,1.0);
  gl_FragDepth=clip.z/clip.w*.5+.5;
  gl_FragColor=vec4(radiance/max(.001,1.0-transmittance),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
const rainVertex=`
attribute vec4 aDrop;attribute vec2 aExtra;
uniform sampler2D uField;uniform vec4 uBounds;uniform float uTime;
varying float vAlpha;
void main(){
  vec2 uv=(aDrop.xy-uBounds.xy)/(uBounds.zw-uBounds.xy);
  vec4 f=texture2D(uField,uv);
  vec4 mask=texelFetch(uField,ivec2(clamp(floor(uv*vec2(textureSize(uField,0))),vec2(0),vec2(textureSize(uField,0)-1))),0);
  float visible=step(aExtra.y,.06+f.r*.85)*mask.g*mask.b*mask.a;
  float phase=fract(aDrop.z-uTime*.23);
  float top=23.0+f.r*7.0;
  float y=mix(aDrop.w+.1,top,phase)-position.y*(.5+f.r*1.0);
  vec3 p=vec3(aDrop.x+(1.0-phase)*.5,y,aDrop.y+(1.0-phase)*.16);
  vAlpha=visible*smoothstep(aDrop.w,aDrop.w+.7,y)*(.14+f.r*.40)*(1.0-position.y*.4);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
}
`;
const rainFragment=`varying float vAlpha;void main(){if(vAlpha<.01)discard;gl_FragColor=vec4(.65,.81,.90,vAlpha);}`;

export async function createStorms(world,scene){
  const base='./data/rainfall/';
  async function get(path){const r=await fetch(base+path);if(!r.ok)throw new Error(`Storm asset ${path}: ${r.status}`);return r;}
  const catalog=await (await get('catalog.json')).json();
  const bounds=new THREE.Vector4(...catalog.bounds);
  function texture(bytes){const t=new THREE.DataTexture(bytes,catalog.width,catalog.height,THREE.RGBAFormat);t.minFilter=t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t;}
  const cases=await Promise.all(catalog.storms.map(async s=>({...s,field:texture(new Uint8Array(await (await get(s.id+'.rgba')).arrayBuffer())),cloud:texture(new Uint8Array(await (await get(s.id+'-cloud.rgba')).arrayBuffer()))})));
  const noise=new THREE.Data3DTexture(new Uint8Array(await (await get('cloud-noise.rgba')).arrayBuffer()),catalog.noiseSize,catalog.noiseSize,catalog.noiseSize);
  noise.format=THREE.RGBAFormat;noise.minFilter=noise.magFilter=THREE.LinearFilter;noise.wrapS=noise.wrapT=noise.wrapR=THREE.RepeatWrapping;noise.unpackAlignment=1;noise.needsUpdate=true;
  const root=new THREE.Group();root.name='Storm totals and illustrative weather';scene.add(root);
  const state={enabled:false,id:'sst23',clouds:true,rain:true,map:true,cloudOpacity:1,mapOpacity:catalog.defaultMapOpacity??.35,playing:true,time:0};
  const groundMaterial=new THREE.ShaderMaterial({uniforms:{uField:{value:cases[3].field},uBounds:{value:bounds},uOpacity:{value:state.mapOpacity},uColorScale:{value:catalog.colorMax/(cases[3].colorMax??catalog.colorMax)}},vertexShader:surfaceVertex,fragmentShader:groundFragment,transparent:true,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const ground=new THREE.Group();ground.name='Static rainfall color overlay (no depth)';root.add(ground);
  for(const source of [world.groups.terrain.children.find(m=>m.name==='terrain'),world.water]){
    // A paper-thin map draped on existing surfaces. Polygon offset prevents
    // z-fighting; rainfall never raises vertices or changes the water level.
    const geo=source.geometry.clone();
    const mesh=new THREE.Mesh(geo,groundMaterial);mesh.renderOrder=2;mesh.frustumCulled=false;ground.add(mesh);
  }
  const [x0,z0,x1,z1]=catalog.bounds;
  const cloudUniforms={uNoise:{value:noise},uCloudField:{value:cases[3].cloud},uBounds:{value:bounds},uMin:{value:new THREE.Vector3(x0,18,z0)},uMax:{value:new THREE.Vector3(x1,77,z1)},uTime:{value:0},uOpacity:{value:1},uUniform:{value:0}};
  const cloudMaterial=new THREE.ShaderMaterial({uniforms:cloudUniforms,vertexShader:surfaceVertex,fragmentShader:cloudFragment,side:THREE.BackSide,transparent:true,depthWrite:false,depthTest:true});
  const clouds=new THREE.Mesh(new THREE.BoxGeometry(x1-x0,59,z1-z0),cloudMaterial);clouds.position.set((x0+x1)/2,47.5,(z0+z1)/2);clouds.renderOrder=5;clouds.frustumCulled=false;root.add(clouds);

  let seed=91388;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const count=26000,drops=new Float32Array(count*4),extra=new Float32Array(count*2);
  for(let i=0;i<count;i++){const x=x0+random()*(x1-x0),z=z0+random()*(z1-z0);drops.set([x,z,random(),Math.max(world.height(x,z),world.level(z))],i*4);extra.set([random(),random()],i*2);}
  const rainGeometry=new THREE.InstancedBufferGeometry();rainGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,1,0],3));rainGeometry.setAttribute('aDrop',new THREE.InstancedBufferAttribute(drops,4));rainGeometry.setAttribute('aExtra',new THREE.InstancedBufferAttribute(extra,2));rainGeometry.instanceCount=count;
  const rainMaterial=new THREE.ShaderMaterial({uniforms:{uField:{value:cases[3].field},uBounds:{value:bounds},uTime:{value:0}},vertexShader:rainVertex,fragmentShader:rainFragment,transparent:true,depthWrite:false,toneMapped:false});
  const rain=new THREE.LineSegments(rainGeometry,rainMaterial);rain.frustumCulled=false;rain.renderOrder=3;root.add(rain);

  function sync(){root.visible=state.enabled;clouds.visible=state.clouds&&state.cloudOpacity>.001;rain.visible=state.rain;ground.visible=state.map;cloudUniforms.uOpacity.value=state.cloudOpacity;groundMaterial.uniforms.uOpacity.value=state.mapOpacity;}
  function select(id){const s=cases.find(s=>s.id===id);if(!s)return;state.id=id;groundMaterial.uniforms.uField.value=s.field;groundMaterial.uniforms.uColorScale.value=catalog.colorMax/(s.colorMax??catalog.colorMax);rainMaterial.uniforms.uField.value=s.field;cloudUniforms.uCloudField.value=s.cloud;cloudUniforms.uUniform.value=s.kind==='uniform'?1:0;sync();return s;}
  function set(values){Object.assign(state,values);sync();}
  sync();
  return {catalog,cases,state,select,set,get selected(){return cases.find(s=>s.id===state.id);},update(dt){if(state.enabled&&state.playing)state.time+=Math.min(dt,.06);cloudUniforms.uTime.value=state.time;rainMaterial.uniforms.uTime.value=state.time;},dispose(){scene.remove(root);root.traverse(o=>o.geometry?.dispose());groundMaterial.dispose();cloudMaterial.dispose();rainMaterial.dispose();noise.dispose();for(const s of cases){s.field.dispose();s.cloud.dispose();}}};
}
