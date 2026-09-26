import * as THREE from 'three';

const vertexShader=`
varying vec3 vWorld;
void main(){vec4 p=modelMatrix*vec4(position,1.0);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}
`;
const fragmentShader=`
uniform sampler2D uDepth;uniform vec4 uBounds;uniform float uOpacity;
varying vec3 vWorld;
vec3 depthColor(float d){
  vec3 a=vec3(.690,.894,.898),b=vec3(.443,.812,.875),c=vec3(.220,.659,.812);
  vec3 e=vec3(.149,.463,.706),f=vec3(.141,.318,.600),g=vec3(.133,.180,.412);
  if(d<1.0)return mix(a,b,d);if(d<3.0)return mix(b,c,(d-1.0)/2.0);
  if(d<6.0)return mix(c,e,(d-3.0)/3.0);if(d<10.0)return mix(e,f,(d-6.0)/4.0);
  return mix(f,g,clamp((d-10.0)/5.0,0.0,1.0));
}
void main(){
  vec2 uv=(vWorld.xz-uBounds.xy)/(uBounds.zw-uBounds.xy);
  if(any(lessThan(uv,vec2(0)))||any(greaterThanEqual(uv,vec2(1))))discard;
  // Decode the nearest source sample, never interpolate a wet/dry boundary.
  vec2 encoded=texelFetch(uDepth,ivec2(floor(uv*vec2(textureSize(uDepth,0)))),0).rg;
  float code=dot(round(encoded*255.0),vec2(1.0,256.0));
  if(code<.5)discard;
  gl_FragColor=vec4(depthColor(code*.01),uOpacity);
}
`;

export async function createFloods(world,scene,onChange=()=>{}){
  const base='./data/flood/';
  async function get(file){const r=await fetch(base+file);if(!r.ok)throw new Error(`Flood asset ${file}: ${r.status}`);return r;}
  const catalog=await (await get('catalog.json')).json();
  const state={enabled:false,id:'sst23',loading:false,loadedId:null,error:null,opacity:catalog.defaultOpacity};
  const root=new THREE.Group();root.name='Supplied maximum flood depth · surface colors';root.visible=false;scene.add(root);
  const material=new THREE.ShaderMaterial({uniforms:{uDepth:{value:null},uBounds:{value:new THREE.Vector4(...catalog.bounds)},uOpacity:{value:state.opacity}},vertexShader,fragmentShader,transparent:true,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  // The world is illustrative: drape measured depth colors, rather than adding
  // them to invented terrain elevations to claim an absolute water surface.
  const surfaces=[world.groups.terrain.children.find(m=>m.name==='terrain'),world.water,
    ...world.groups.landcover.children,...world.groups.roads.children];
  const meshes=[];
  for(const source of surfaces){
    if(!source?.isMesh||source.isInstancedMesh)continue;
    const mesh=new THREE.Mesh(source.geometry,material);mesh.position.copy(source.position);mesh.quaternion.copy(source.quaternion);mesh.scale.copy(source.scale);mesh.renderOrder=3;mesh.frustumCulled=false;root.add(mesh);meshes.push({source,mesh});
  }
  const cache=new Map(),pending=new Map();let revision=0,disposed=false;
  function sync(){root.visible=state.enabled&&!state.loading&&!state.error&&state.loadedId===state.id;material.uniforms.uOpacity.value=state.opacity;onChange({...state});}
  async function asset(id){
    if(cache.has(id)){const entry=cache.get(id);cache.delete(id);cache.set(id,entry);return entry;}
    if(pending.has(id))return pending.get(id);
    const task=(async()=>{
      const item=catalog.storms.find(s=>s.id===id);if(!item)throw new Error('Unknown flood map');
      const response=await get(item.asset);
      const buffer=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      if(buffer.byteLength!==catalog.width*catalog.height*2)throw new Error('Incomplete flood map');
      const bytes=new Uint8Array(buffer),texture=new THREE.DataTexture(bytes,catalog.width,catalog.height,THREE.RGFormat);
      texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.unpackAlignment=1;texture.needsUpdate=true;
      const entry={bytes,texture};if(disposed){texture.dispose();return entry;}cache.set(id,entry);return entry;
    })();
    pending.set(id,task);try{return await task;}finally{pending.delete(id);}
  }
  function prune(){for(const [id,entry] of cache){if(cache.size<=2)break;if(id===state.loadedId||id===state.id)continue;entry.texture.dispose();cache.delete(id);}}
  async function select(id){
    if(!catalog.storms.some(s=>s.id===id))return;
    const token=++revision;state.id=id;state.error=null;state.loading=state.enabled&&state.loadedId!==id;sync();
    if(!state.enabled)return;
    try{
      const entry=await asset(id);
      if(disposed||token!==revision){prune();return;}
      material.uniforms.uDepth.value=entry.texture;state.loadedId=id;state.loading=false;prune();sync();
    }catch(error){if(!disposed&&token===revision){state.error='This flood map could not load. Try again.';state.loading=false;sync();console.error(error);}}
  }
  function set(values){const reload=values.id!==undefined&&values.id!==state.id||values.enabled===true&&!state.enabled;Object.assign(state,values);if(reload)void select(state.id);else sync();}
  function sample(x,z){
    const entry=cache.get(state.loadedId);if(!root.visible||!entry)return null;
    const [x0,z0,x1,z1]=catalog.bounds,c=Math.floor((x-x0)/(x1-x0)*catalog.width),r=Math.floor((z-z0)/(z1-z0)*catalog.height);
    if(c<0||r<0||c>=catalog.width||r>=catalog.height)return null;
    const i=(r*catalog.width+c)*2,code=entry.bytes[i]+256*entry.bytes[i+1];return {depthFt:code*.01,wet:code>0,column:c,row:r};
  }
  return {catalog,state,set,select,sample,prepare:ids=>Promise.all(ids.map(asset)),setVisualOpacity(value){material.uniforms.uOpacity.value=value;},get selected(){return catalog.storms.find(s=>s.id===state.id);},update(){for(const {source,mesh} of meshes)mesh.visible=source.visible&&source.parent.visible;},dispose(){disposed=true;revision++;scene.remove(root);material.dispose();for(const e of cache.values())e.texture.dispose();cache.clear();}};
}
