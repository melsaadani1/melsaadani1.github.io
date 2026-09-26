import * as THREE from 'three';

export async function createThematics(world,scene,onChange=()=>{}){
  const base='./data/thematic/';
  const response=await fetch(base+'catalog.json');if(!response.ok)throw new Error('Thematic catalog unavailable');
  const catalog=await response.json(),state={enabled:false,id:'atlas-clusters',loadedId:null,loading:false,error:null,opacity:.72};
  const root=new THREE.Group();root.name='Author cluster and HAND maps';root.visible=false;scene.add(root);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,
    polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,
    uniforms:{uMap:{value:null},uBounds:{value:new THREE.Vector4(...catalog.bounds)},uScale:{value:.01},
      uOpacity:{value:.72},uCount:{value:5},uBreaks:{value:new Float32Array(7)},uColors:{value:Array.from({length:8},()=>new THREE.Vector3())}},
    vertexShader:`varying vec3 vWorld;void main(){vec4 p=modelMatrix*vec4(position,1.0);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`uniform sampler2D uMap;uniform vec4 uBounds;uniform float uScale,uOpacity;
      uniform int uCount;uniform float uBreaks[7];uniform vec3 uColors[8];varying vec3 vWorld;
      void main(){vec2 uv=(vWorld.xz-uBounds.xy)/(uBounds.zw-uBounds.xy);
        if(any(lessThan(uv,vec2(0)))||any(greaterThanEqual(uv,vec2(1))))discard;
        vec2 bytes=round(texelFetch(uMap,ivec2(floor(uv*vec2(textureSize(uMap,0)))),0).rg*255.0);
        float code=dot(bytes,vec2(1,256));if(code<.5)discard;float value=(code-1.0)*uScale;
        int bin=0;for(int i=0;i<7;i++){if(i<uCount-1&&value>=uBreaks[i])bin=i+1;}
        gl_FragColor=vec4(uColors[bin],uOpacity);}`});
  const meshes=[];
  for(const source of [world.groups.terrain.children.find(m=>m.name==='terrain'),world.water,...world.groups.landcover.children,...world.groups.roads.children]){
    if(!source?.isMesh||source.isInstancedMesh)continue;
    const mesh=new THREE.Mesh(source.geometry,material);mesh.position.copy(source.position);mesh.quaternion.copy(source.quaternion);mesh.scale.copy(source.scale);mesh.renderOrder=3;mesh.frustumCulled=false;root.add(mesh);meshes.push({source,mesh});
  }
  const cache=new Map();let revision=0;
  const selected=()=>catalog.maps.find(m=>m.id===state.id);
  function sync(){root.visible=state.enabled&&!state.loading&&!state.error&&state.loadedId===state.id;material.uniforms.uOpacity.value=state.opacity;onChange();}
  async function asset(id){
    if(cache.has(id))return cache.get(id);
    const task=(async()=>{const map=catalog.maps.find(m=>m.id===id),r=await fetch(base+map.asset);if(!r.ok)throw new Error('Map could not load');
      const buffer=await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      if(buffer.byteLength!==map.width*map.height*2)throw new Error('Incomplete map');
      const bytes=new Uint8Array(buffer),texture=new THREE.DataTexture(bytes,map.width,map.height,THREE.RGFormat);
      texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.unpackAlignment=1;texture.needsUpdate=true;return {bytes,texture,map};})();
    cache.set(id,task);try{return await task;}catch(e){cache.delete(id);throw e;}
  }
  let current=null;
  async function select(id){
    if(!catalog.maps.some(m=>m.id===id))return;
    const token=++revision;state.id=id;state.error=null;state.loading=state.enabled&&state.loadedId!==id;sync();if(!state.enabled)return;
    try{const entry=await asset(id);if(token!==revision)return;current=entry;
      material.uniforms.uMap.value=entry.texture;material.uniforms.uScale.value=entry.map.unitScale;
      material.uniforms.uCount.value=entry.map.palette.length;
      entry.map.breaks.forEach((b,i)=>material.uniforms.uBreaks.value[i]=b);
      entry.map.palette.forEach((color,i)=>{const rgb=color.slice(1).match(/../g).map(c=>parseInt(c,16)/255);material.uniforms.uColors.value[i].set(...rgb);});
      state.loadedId=id;state.loading=false;sync();
    }catch(e){if(token===revision){state.error='Map could not load. Choose it again to retry.';state.loading=false;sync();}console.error(e);}
  }
  function set(values){const reload=values.id!==undefined&&values.id!==state.id||values.enabled===true&&!state.enabled;Object.assign(state,values);if(reload)void select(state.id);else sync();}
  function sample(x,z){if(!root.visible||!current)return null;const [x0,z0,x1,z1]=catalog.bounds,{map,bytes}=current;
    const col=Math.floor((x-x0)/(x1-x0)*map.width),row=Math.floor((z-z0)/(z1-z0)*map.height);
    if(col<0||row<0||col>=map.width||row>=map.height)return null;const i=(row*map.width+col)*2,code=bytes[i]+256*bytes[i+1];return code?{value:(code-1)*map.unitScale,units:map.units}:null;}
  return {catalog,state,set,select,sample,prepare:ids=>Promise.all(ids.map(asset)),get selected(){return selected();},
    update(){for(const {source,mesh} of meshes)mesh.visible=source.visible&&source.parent.visible;}};
}
