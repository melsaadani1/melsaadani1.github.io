import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {buildWorld} from './world.js';
import {createStorms} from './storms.js';
import {createFloods} from './floods.js';
import {createThematics} from './thematics.js';

const $=id=>document.getElementById(id),stage=$('stage'),canvas=$('world');
const scene=new THREE.Scene();scene.background=new THREE.Color('#e4e9dd');scene.fog=new THREE.Fog('#e4e9dd',370,850);
const camera=new THREE.PerspectiveCamera(37,1,.03,1800);camera.position.set(211,230,263);
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});}
catch(e){$('loading').innerHTML='<h2>This world needs WebGL.</h2><p>Please enable hardware acceleration in your browser and reload.</p>';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(stage.clientWidth,stage.clientHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.17;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
const controls=new OrbitControls(camera,canvas);controls.target.set(17,0,-16);controls.enableDamping=true;controls.dampingFactor=.075;controls.screenSpacePanning=false;controls.minDistance=.65;controls.maxDistance=720;controls.maxPolarAngle=Math.PI*.48;controls.autoRotateSpeed=.4;
controls.mouseButtons.LEFT=THREE.MOUSE.PAN;controls.mouseButtons.RIGHT=THREE.MOUSE.DOLLY;controls.mouseButtons.MIDDLE=THREE.MOUSE.ROTATE;
controls.touches.ONE=THREE.TOUCH.PAN;controls.touches.TWO=THREE.TOUCH.DOLLY_ROTATE;
controls.listenToKeyEvents(canvas);
canvas.addEventListener('contextmenu',event=>event.preventDefault());
const ambient=new THREE.HemisphereLight('#e5f0e7','#96957a',2.1);scene.add(ambient);
const sun=new THREE.DirectionalLight('#fff1d3',3.4);sun.position.set(-130,230,100);sun.target.position.set(16,0,-10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-175;sun.shadow.camera.right=175;sun.shadow.camera.top=165;sun.shadow.camera.bottom=-165;sun.shadow.camera.near=1;sun.shadow.camera.far=650;sun.shadow.bias=-.00025;sun.shadow.normalBias=.16;sun.shadow.radius=2;scene.add(sun,sun.target);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(2600,2600),new THREE.MeshLambertMaterial({color:'#e4e9dd'}));floor.rotation.x=-Math.PI/2;floor.position.y=-7.2;floor.receiveShadow=true;scene.add(floor);

let world,data,selected=null,transition=null,labels=[],clean=false,toastTimer,ready=false;
let stormSystem=null,stormMode=false,lastFrameTime=0;
let floodSystem=null,surfaceMode='rainfall',depthPick=null;
let thematicSystem=null,clusterId='atlas-clusters';
const isThematic=()=>surfaceMode==='clusters'||surfaceMode==='hand';
const clearWeather={background:scene.background.clone(),sun:sun.color.clone(),sunIntensity:sun.intensity,ambientIntensity:ambient.intensity};
const landscapePlaces={
  tributary:{id:'tributary',name:'A city tributary',x:-46.7266,z:-35.061,size:2,channel:true,viewOffset:[1.35,1.15,1.7],subtitle:'A shallow channel through Lafayette',description:'A smaller stream with a narrow water surface and sloping banks that meet the neighborhood ground.'},
  vermilion:{id:'vermilion',name:'The Vermilion banks',x:-39.2811,z:-32.4775,size:3,channel:true,viewOffset:[2.3,1.8,2.8],subtitle:'A wider channel below the main-stem bench',description:'The main river has a wider, more pronounced channel. The higher ground beside it remains distinct from the gentler tributary neighborhoods.'},
  uplands:{id:'uplands',name:'Northern uplands',x:-23,z:-98,size:13,subtitle:'Small tributaries, rolling terrain and agricultural fields',description:'The northern reach is higher and narrower. Follow the tributaries through the folds in the terrain toward the main river.'},
  wetlands:{id:'wetlands',name:'Cypress lowlands',x:18,z:-9,size:10,subtitle:'A quiet, wooded landscape beside the river corridor',description:'Cypress stands, bayous and shallow ponds form a broad lowland east of the main river.'},
  coast:{id:'coast',name:'The coastal plain',x:14,z:82,size:18,subtitle:'Where the river meets a wider, lower landscape',description:'The basin opens into marsh, distributary channels and a sheltered bay. The Vermilion River connects this coastal landscape to the inland watershed.'}
};
const homeTarget=new THREE.Vector3(18,1,-17),homeDirection=new THREE.Vector3(.77,.95,1.02).normalize();
function fitBasin(){
  const right=new THREE.Vector3(0,1,0).cross(homeDirection).normalize(),up=homeDirection.clone().cross(right).normalize();
  const points=data.boundary.map(([x,z])=>new THREE.Vector3(x,world.height(x,z),z));
  for(const ring of data.coast?.rings??[])for(const [x,z] of ring)points.push(new THREE.Vector3(x,data.coast.seaLevel,z));
  const xs=points.map(p=>p.dot(right)),ys=points.map(p=>p.dot(up));
  const target=homeTarget.clone();target.addScaledVector(right,(Math.min(...xs)+Math.max(...xs))/2-target.dot(right));target.addScaledVector(up,(Math.min(...ys)+Math.max(...ys))/2-target.dot(up));
  const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));let distance=0;
  for(const p of points){const rel=p.clone().sub(target);distance=Math.max(distance,rel.dot(homeDirection)+Math.max(Math.abs(rel.dot(up))/(tan*.78),Math.abs(rel.dot(right))/(tan*camera.aspect*.88)));}
  return {target,position:target.clone().addScaledVector(homeDirection,distance)};
}
function resize(){camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();renderer.setSize(stage.clientWidth,stage.clientHeight);}
new ResizeObserver(resize).observe(stage);
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2400);}
function fly(position,target,duration=1700){controls.autoRotate=false;$('orbit').classList.remove('active');$('orbit').setAttribute('aria-pressed','false');transition={fromP:camera.position.clone(),fromT:controls.target.clone(),toP:position.clone(),toT:target.clone(),start:performance.now(),duration};}
function stopCameraMotion(){transition=null;controls.autoRotate=false;$('orbit').classList.remove('active');$('orbit').setAttribute('aria-pressed','false');}
controls.addEventListener('start',stopCameraMotion);
controls.addEventListener('change',()=>{canvas.dataset.cameraPose=JSON.stringify({camera:camera.position.toArray(),target:controls.target.toArray()});});
function setNavigationMode(mode,notify=true){
  stopCameraMotion();
  const rotate=mode==='rotate';
  controls.mouseButtons.LEFT=rotate?THREE.MOUSE.ROTATE:THREE.MOUSE.PAN;
  controls.touches.ONE=rotate?THREE.TOUCH.ROTATE:THREE.TOUCH.PAN;
  canvas.dataset.navigationMode=mode;
  $('nav-pan').classList.toggle('active',!rotate);$('nav-pan').setAttribute('aria-pressed',String(!rotate));
  $('nav-rotate').classList.toggle('active',rotate);$('nav-rotate').setAttribute('aria-pressed',String(rotate));
  $('navigation-hint').textContent=`Left drag: ${rotate?'rotate / tilt':'pan'} · Wheel: zoom · Wheel drag: rotate`;
  if(notify)toast(rotate?'Rotate mode · left-drag to turn or tilt':'Pan mode · left-drag to move across the map');
}
function zoomView(factor){
  if(!ready)return;
  const offset=camera.position.clone().sub(controls.target);
  offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));
  fly(controls.target.clone().add(offset),controls.target,280);
}
function northUp(){
  if(!ready)return;
  const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  spherical.theta=0;
  fly(controls.target.clone().add(new THREE.Vector3().setFromSpherical(spherical)),controls.target,600);
}
$('nav-pan').addEventListener('click',()=>setNavigationMode('pan'));
$('nav-rotate').addEventListener('click',()=>setNavigationMode('rotate'));
$('zoom-in').addEventListener('click',()=>zoomView(.78));$('zoom-out').addEventListener('click',()=>zoomView(1/.78));
$('north-up').addEventListener('click',northUp);
setNavigationMode('pan',false);
function clearSelection(){selected=null;$('place-select').value='';for(const el of document.querySelectorAll('.destination,.place-label'))el.classList.remove('active','selected');$('location-card').hidden=true;}
function overview(animate=true){
  clearSelection();$('location-title').textContent='The Vermilion watershed';$('location-subtitle').textContent='From the northern uplands to the coastal plain';
  const fit=fitBasin();
  if(animate)fly(fit.position,fit.target,1900);else{camera.position.copy(fit.position);controls.target.copy(fit.target);}
  $('overview').classList.add('active');$('topdown').classList.remove('active');$('region-view').classList.remove('active');
}
function focusPlace(id){
  const t=data.towns.find(t=>t.id===id)??data.places?.[id]??landscapePlaces[id];if(!t)return;
  clearSelection();selected=t;
  $('place-select').value=id;document.querySelector(`[data-label="${id}"]`)?.classList.add('selected');
  $('location-title').textContent=t.name;$('location-subtitle').textContent=t.subtitle;
  $('location-kicker').textContent='A PLACE IN THE WATERSHED';$('location-name').textContent=t.name;$('location-description').textContent=t.id==='region'?'Scott joins Lafayette to the west; Broussard and Youngsville extend south. Wooded wetlands form the eastern edge.':data.towns.some(town=>town.id===t.id)?'Explore the mapped streets and waterways around '+t.name+'. The buildings illustrate how neighborhoods fit into the landscape.':t.description;$('location-card').hidden=false;
  const target=new THREE.Vector3(t.x,t.channel?world.waterSurface(t.x,t.z)+.01:world.height(t.x,t.z),t.z);const size=Math.max(7,t.size);
  fly(target.clone().add(t.viewOffset?new THREE.Vector3(...t.viewOffset):id==='region'?new THREE.Vector3(size*.40,size*2.1,size*2.1):new THREE.Vector3(size*1.30,size*1.65,size*1.70)),target,2100);
  $('overview').classList.remove('active');$('topdown').classList.remove('active');
  $('region-view').classList.toggle('active',id==='region');
}
function label(name,x,z,id,river=false){
  const el=document.createElement(river?'span':'button');el.className='place-label'+(river?' river':'');el.textContent=name;el.dataset.label=id;
  if(!river){el.tabIndex=-1;el.addEventListener('click',()=>focusPlace(id));}
  $('labels').append(el);labels.push({el,position:new THREE.Vector3(x,world.height(x,z)+(river?.25:data.georeferenced?.6:2.8),z),river,id});
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function setClean(){clean=!clean;document.body.classList.toggle('clean',clean);$('restore').hidden=!clean;resize();}
$('clean').addEventListener('click',setClean);$('restore').addEventListener('click',setClean);
$('overview').addEventListener('click',()=>overview());
$('region-view').addEventListener('click',()=>focusPlace('region'));
$('topdown').addEventListener('click',()=>{const t=controls.target.clone(),d=camera.position.distanceTo(t);fly(t.clone().add(new THREE.Vector3(0,d,.01)),t);$('topdown').classList.add('active');$('overview').classList.remove('active');});
$('orbit').addEventListener('click',()=>{transition=null;controls.autoRotate=!controls.autoRotate;$('orbit').classList.toggle('active',controls.autoRotate);$('orbit').setAttribute('aria-pressed',String(controls.autoRotate));});
$('street-view').addEventListener('click',()=>{if(!selected)return;const t=selected;let x=t.x,z=t.z;if(data.buildings){const options=data.buildings.filter(b=>b.town===t.id);if(options.length){const b=options.reduce((best,b)=>Math.hypot(b.x-t.x,b.z-t.z)<Math.hypot(best.x-t.x,best.z-t.z)?b:best,options[0]);x=b.x;z=b.z;}}const target=new THREE.Vector3(x,world.height(x,z)+.09,z);const offset=data.georeferenced?new THREE.Vector3(1.0,.86,1.20):new THREE.Vector3(10,6.5,12);fly(target.clone().add(offset),target,1800);toast('Neighborhood view · drag to explore');});
$('labels-toggle').addEventListener('change',e=>{$('labels').hidden=!e.target.checked;});
document.querySelectorAll('[data-layer]').forEach(input=>input.addEventListener('change',()=>{if(!world)return;world.groups[input.dataset.layer].visible=input.checked;renderer.shadowMap.needsUpdate=true;}));
document.querySelectorAll('[data-landscape]').forEach(button=>button.addEventListener('click',()=>focusPlace(button.dataset.landscape)));
$('mobile-layers').addEventListener('click',()=>setPanel(!document.body.classList.contains('panel-open')));
$('panel-close').addEventListener('click',()=>setPanel(false));
$('panel-shade').addEventListener('click',()=>setPanel(false));
$('sun').addEventListener('input',e=>{const t=Number(e.target.value);sun.position.set(-180+350*t,220-90*t,70+50*t);sun.color.set(t>.65?'#ffe0ac':'#fff1d3');sun.intensity=3.4-t*.45;renderer.shadowMap.needsUpdate=true;});
$('snapshot').addEventListener('click',()=>{renderer.render(scene,camera);canvas.toBlob(blob=>{if(blob){download(blob,`vermilion-${stormMode?stormSystem.state.id:selected?.id??'watershed'}.png`);toast('Clean scene image saved');}});});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Use Hide panels for a larger view');}});
window.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select')||e.ctrlKey||e.metaKey||e.altKey||!ready)return;
  const key=e.key.toLowerCase();
  if(key==='h')setClean();if(key==='o'||e.key==='Insert')overview();
  if(key==='p')setNavigationMode('pan');if(key==='r')setNavigationMode('rotate');if(key==='n')northUp();
  if(key==='+'||key==='='){e.preventDefault();zoomView(.78);}
  if(key==='-'||key==='_'){e.preventDefault();zoomView(1/.78);}
  if(e.key.startsWith('Arrow'))stopCameraMotion();
});
// Double-click the terrain to reposition the orbit point without losing context.
const raycaster=new THREE.Raycaster();
canvas.addEventListener('dblclick',event=>{if(!world)return;const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),camera);const hits=raycaster.intersectObject(world.groups.terrain,true);if(hits.length){const p=hits[0].point,offset=camera.position.clone().sub(controls.target);fly(p.clone().add(offset.multiplyScalar(.70)),p,900);}});

function syncStormUI(){
  if(!stormSystem)return;
  syncWorkflow();
  const s=stormSystem.state,selected=stormSystem.selected;
  const flood=surfaceMode==='flood',f=floodSystem?.state;
  canvas.dataset.stormState=JSON.stringify(s);
  canvas.dataset.surfaceMode=surfaceMode;
  canvas.dataset.floodState=JSON.stringify(f??{available:false});
  document.body.classList.toggle('thematic-mode',stormMode&&isThematic());
  $('thematic-controls').hidden=!stormMode||!isThematic();$('thematic-legend').hidden=!stormMode||!isThematic();
  for(const key of ['rainfall','flood','clusters','hand'])$('surface-'+key).setAttribute('aria-pressed',String(stormMode&&surfaceMode===key));
  if(isThematic()){
    document.body.classList.remove('flood-mode','storm-clouds');
    $('flood-readout').hidden=true;$('flood-status').hidden=true;
    $('storm-cloud-toggle').hidden=true;$('storm-pause').hidden=true;
    $('storm-dive').textContent='City + swamp';$('storm-dive').title='Inspect Lafayette and Scott';
    syncThematicUI();return;
  }
  document.body.classList.toggle('flood-mode',stormMode&&flood);
  $('surface-rainfall').setAttribute('aria-pressed',String(stormMode&&!flood));$('surface-flood').setAttribute('aria-pressed',String(stormMode&&flood));
  $('surface-badge').textContent=flood?'Maximum depth · feet':'Storm total · inches';
  $('map-legend-title').textContent=flood?'Maximum flood depth · feet':'Total rainfall · inches';
  $('rain-legend').setAttribute('aria-label',flood?'Maximum flood depth legend':'Total storm rainfall legend');
  $('storm-dive').textContent=flood?'City + swamp':'Through clouds ↓';
  $('storm-dive').title=flood?'Inspect the mapped flooding around Lafayette and Scott':'A silent camera move through the cloud layer; drag to stop';
  $('storm-cloud-toggle').hidden=flood;$('storm-pause').hidden=flood;
  $('flood-readout').hidden=!stormMode||!flood||!f||f.loading||!!f.error;
  $('flood-readout-value').textContent=depthPick?(depthPick.wet?`≈ ${depthPick.depthFt.toFixed(2)} ft`:'No positive depth in this map cell'):'Click the ground to read depth';
  $('flood-status').hidden=!stormMode||!flood||(!f?.loading&&!f?.error);
  $('flood-status-text').textContent=f?.error??`Loading ${selected.title} flood map…`;
  $('flood-retry').hidden=!f?.error;
  if(f){$('flood-opacity').value=Math.round(f.opacity*100);$('flood-opacity-value').textContent=`${Math.round(f.opacity*100)}%`;}
  document.body.classList.toggle('storm-clouds',stormMode&&s.clouds&&s.cloudOpacity>.25);
  $('storm-clouds').checked=s.clouds;$('storm-rain').checked=s.rain;$('storm-map').checked=s.map;
  const cloudsVisible=s.clouds&&s.cloudOpacity>.001;
  $('storm-cloud-toggle').textContent=cloudsVisible?'Hide clouds':'Show clouds';
  $('storm-cloud-toggle').title=cloudsVisible?'Remove clouds and keep the selected map visible':'Show clouds above the selected map';
  $('cloud-opacity').value=Math.round(s.cloudOpacity*100);$('cloud-opacity-value').textContent=`${Math.round(s.cloudOpacity*100)}%`;
  $('rain-opacity').value=Math.round(s.mapOpacity*100);$('rain-opacity-value').textContent=`${Math.round(s.mapOpacity*100)}%`;
  $('storm-pause').textContent=s.playing?'Pause':'Play';$('storm-pause').setAttribute('aria-pressed',String(!s.playing));
  $('rain-case-name').textContent=selected.title;
  const colorMax=selected.colorMax??stormSystem.catalog.colorMax;
  const ticks=flood?[0,1,3,6,10,15]:Array.from({length:5},(_,i)=>Number((colorMax*i/4).toFixed(i===4?2:1)));
  document.querySelector('.rain-ticks').replaceChildren(...ticks.map((value,i)=>{const el=document.createElement('span');el.textContent=String(value)+(flood&&i===ticks.length-1?'+':'');if(flood)el.style.left=`${value/15*100}%`;return el;}));
  $('rain-scale-note').textContent=flood?'Same depth scale for all four storms':['sst1','sst15'].includes(selected.id)?'Full palette to this storm’s maximum':'Atlas / SST 23 · shared 0–32 in scale';
  $('rain-case-note').textContent=flood?'Positive depths only · darkest blue ≥15 ft':'Below 1 in transparent · color only, no water depth';
  $('storm-caption').textContent=flood?'Where did water accumulate? These colors come from the study flood model. Darker blue means deeper flooding. Click the ground to read a depth.':selected.kind==='uniform'?'A uniform 12.19 inches, shown as a translucent color map. The rigid cloud tile makes the uniform assumption visible.':'Storm totals appear as a translucent color map on the landscape. Clouds and falling rain illustrate the pattern; they do not add water depth.';
  $('surface-note').textContent=flood?'Maximum depth at each location over the whole simulation, not one instant in time. Color shows water depth on the illustrative landscape; it does not set a basin-wide water level.':'A flat color overlay shows total rainfall. Below 1 inch is transparent. Rainfall adds no water depth. Choose Flood depth to see the modeled flooding.';
  document.querySelectorAll('[data-storm]').forEach(el=>{const active=el.dataset.storm===s.id;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));const img=el.querySelector('img');img.src=`./data/${flood?'flood':'rainfall'}/${el.dataset.storm}.png`;img.alt=`${el.querySelector('strong').textContent} ${flood?'maximum flood depth':'total rainfall'} pattern`;el.querySelector('small').textContent=flood?'Peak flood depth':el.dataset.storm==='atlas'?'Uniform design rain':'Spatial storm';});
}
function setSurfaceMode(mode){
  if(!stormSystem||mode==='flood'&&!floodSystem)return;
  if((mode==='clusters'||mode==='hand')&&!thematicSystem)return;
  surfaceMode=mode;depthPick=null;stopCameraMotion();
  const flood=mode==='flood';
  stormSystem.set({map:mode==='rainfall',...(mode!=='rainfall'?{clouds:false,rain:false}:{})});
  floodSystem?.set({id:stormSystem.state.id,enabled:stormMode&&flood});
  thematicSystem?.set({id:mode==='hand'?'hand':clusterId,enabled:stormMode&&isThematic()});
  syncStormUI();
}
function setStormMode(enabled){
  if(!stormSystem)return;
  stormMode=enabled;
  stormSystem.set({enabled});
  floodSystem?.set({enabled:enabled&&surfaceMode==='flood'});
  thematicSystem?.set({enabled:enabled&&isThematic()});
  document.body.classList.toggle('storm-mode',enabled);
  scene.background.set(enabled?'#cbd9e2':clearWeather.background);
  scene.fog.color.copy(scene.background);floor.material.color.copy(scene.background);
  sun.color.set(enabled?'#e1edff':clearWeather.sun);sun.intensity=enabled?2.75:clearWeather.sunIntensity;
  ambient.intensity=enabled?1.8:clearWeather.ambientIntensity;
  renderer.shadowMap.needsUpdate=true;syncStormUI();
}
function chooseMap(mode){
  if(mode==='landscape'){setStormMode(false);return;}
  setSurfaceMode(mode);setStormMode(true);
}
function stormView(view){
  if(!stormSystem||!ready)return;
  clearSelection();
  for(const [id,key] of [['storm-overview','overview'],['storm-ground','map'],['storm-dive','dive']])$(id).classList.toggle('active',key===view);
  if(view==='map'){
    stormSystem.set({clouds:false,rain:false,map:surfaceMode==='rainfall'});
    const b=data.bounds,target=new THREE.Vector3((b[0]+b[2])/2,2,(b[1]+b[3])/2);
    const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),distance=Math.max((b[2]-b[0])/(2*tan*camera.aspect),(b[3]-b[1])/(2*tan))*1.15;
    fly(target.clone().add(new THREE.Vector3(0,distance,.01)),target,1700);
  }else if(view==='dive'){
    if(surfaceMode!=='rainfall'){focusPlace('region');syncStormUI();return;}
    stormSystem.set({clouds:true,rain:true,map:true,playing:true});
    const [x,z]=stormSystem.selected.focus,y=Math.max(world.height(x,z),world.level(z));
    const positions=new THREE.CatmullRomCurve3([new THREE.Vector3(x+55,y+150,z+70),new THREE.Vector3(x+22,61,z+32),new THREE.Vector3(x+9,30,z+15),new THREE.Vector3(x+3.8,y+4.5,z+5.7)]);
    const targets=new THREE.CatmullRomCurve3([new THREE.Vector3(x,20,z),new THREE.Vector3(x,16,z),new THREE.Vector3(x,y+1,z),new THREE.Vector3(x,y+.1,z)]);
    stopCameraMotion();camera.position.copy(positions.getPoint(0));controls.target.copy(targets.getPoint(0));
    transition={start:performance.now(),duration:11500,sample(f){camera.position.copy(positions.getPoint(f));controls.target.copy(targets.getPoint(f));}};
  }else{
    setSurfaceMode('rainfall');
    stormSystem.set({clouds:true,rain:true,map:true});
    const fit=fitBasin();fit.target.y+=17;fit.position.y+=38;
    fit.position.sub(fit.target).multiplyScalar(.91).add(fit.target);
    fly(fit.position,fit.target,1700);
  }
  syncStormUI();
}
$('storm-toggle').addEventListener('click',()=>chooseMap('landscape'));
$('surface-rainfall').addEventListener('click',()=>chooseMap('rainfall'));
$('surface-flood').addEventListener('click',()=>chooseMap('flood'));
for(const key of ['clusters','hand'])$('surface-'+key).addEventListener('click',()=>chooseMap(key));
$('thematic-opacity').addEventListener('input',e=>thematicSystem?.set({opacity:Number(e.target.value)/100}));

document.querySelectorAll('[data-cluster]').forEach(el=>el.addEventListener('click',()=>{clusterId=el.dataset.cluster;void thematicSystem?.select(clusterId);}));
function syncThematicUI(){
  if(!thematicSystem||!isThematic())return;
  syncWorkflow();
  const {state,selected}=thematicSystem,hand=surfaceMode==='hand';
  canvas.dataset.thematicState=JSON.stringify(state);
  $('surface-badge').textContent=hand?'Height above drainage · m':'Inundated-building clusters';
  $('thematic-title').textContent=hand?'Height above drainage':'Building exposure clusters';
  $('cluster-cases').hidden=hand;
  $('thematic-description').textContent=hand?'HAND measures height above the connected drainage channel. It is neither flood depth nor elevation above sea level.':clusterId==='sstmax-clusters'?'Where inundated buildings cluster under SSTmax: the greatest depth at each location across all 50 SST simulations. SSTmax is an ensemble envelope, not a single storm.':'Where inundated buildings cluster under the uniform Atlas 14 design storm. Stronger colors indicate denser concentrations of inundated buildings.';
  $('thematic-legend-title').textContent=hand?'HAND · meters':selected.title+' · cluster intensity';
  $('thematic-swatches').replaceChildren(...selected.palette.map((color,i)=>{const row=document.createElement('span'),swatch=document.createElement('i');swatch.style.background=color;row.append(swatch,selected.labels[i]);return row;}));
  $('thematic-opacity-value').textContent=Math.round(state.opacity*100)+'%';$('thematic-opacity').value=Math.round(state.opacity*100);
  $('thematic-readout').textContent='Click the ground to inspect a value';
  $('thematic-status').textContent=state.error??(state.loading?'Loading map…':'');
  document.querySelectorAll('[data-cluster]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.cluster===clusterId)));
}
$('flood-opacity').addEventListener('input',e=>floodSystem?.set({opacity:Number(e.target.value)/100}));
$('flood-retry').addEventListener('click',()=>void floodSystem?.select(stormSystem.state.id));

$('storm-cloud-toggle').addEventListener('click',()=>{
  if(!stormSystem)return;
  const s=stormSystem.state,show=!(s.clouds&&s.cloudOpacity>.001);
  stormSystem.set({clouds:show,map:true,...(show&&s.cloudOpacity<=.001?{cloudOpacity:1}:{})});
  syncStormUI();
});
document.querySelectorAll('[data-storm]').forEach(el=>el.addEventListener('click',()=>{if(!stormSystem)return;if(transition?.sample)stopCameraMotion();depthPick=null;stormSystem.select(el.dataset.storm);floodSystem?.set({id:el.dataset.storm});syncStormUI();}));
for(const [id,key] of [['storm-clouds','clouds'],['storm-rain','rain'],['storm-map','map']])$(id).addEventListener('change',e=>{stormSystem?.set({[key]:e.target.checked});syncStormUI();});
$('cloud-opacity').addEventListener('input',e=>{stormSystem?.set({cloudOpacity:Number(e.target.value)/100});syncStormUI();});
$('rain-opacity').addEventListener('input',e=>{stormSystem?.set({mapOpacity:Number(e.target.value)/100});syncStormUI();});
$('storm-overview').addEventListener('click',()=>stormView('overview'));$('storm-ground').addEventListener('click',()=>stormView('map'));$('storm-dive').addEventListener('click',()=>stormView('dive'));
$('storm-pause').addEventListener('click',()=>{if(!stormSystem)return;const playing=!stormSystem.state.playing;if(transition?.sample){if(!playing)transition.pausedAt=performance.now();else if(transition.pausedAt){transition.start+=performance.now()-transition.pausedAt;delete transition.pausedAt;}}stormSystem.set({playing});syncStormUI();});

let lastMetrics=0,frameCount=0;
let mapPointer=null;
canvas.addEventListener('pointerdown',e=>{mapPointer=e.button===0?{id:e.pointerId,x:e.clientX,y:e.clientY}:null;});
canvas.addEventListener('pointerup',e=>{
  const down=mapPointer;mapPointer=null;
  if(down&&down.id===e.pointerId&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<=4&&stormMode&&isThematic()&&thematicSystem){
    const rect=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
    const hit=raycaster.intersectObjects([world.groups.terrain,world.water],true)[0],sample=hit&&thematicSystem.sample(hit.point.x,hit.point.z);
    $('thematic-readout').textContent=sample?`${sample.value.toFixed(2)} ${sample.units}`:'No valid value here';return;
  }
  if(!down||down.id!==e.pointerId||Math.hypot(e.clientX-down.x,e.clientY-down.y)>4||!stormMode||surfaceMode!=='flood'||!floodSystem)return;
  const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
  const hit=raycaster.intersectObjects([world.groups.terrain,world.water],true)[0];
  if(hit){depthPick=floodSystem.sample(hit.point.x,hit.point.z);canvas.dataset.floodPick=JSON.stringify(depthPick);syncStormUI();}
});
function animate(now){
  requestAnimationFrame(animate);if(document.hidden)return;
  if(transition&&!(transition.sample&&!stormSystem?.state.playing)){const f=THREE.MathUtils.clamp((now-transition.start)/transition.duration,0,1),s=f*f*f*(f*(f*6-15)+10);if(transition.sample)transition.sample(s);else{camera.position.lerpVectors(transition.fromP,transition.toP,s);controls.target.lerpVectors(transition.fromT,transition.toT,s);}if(f===1)transition=null;}
  controls.update();world?.update(now*.001);
  floodSystem?.update();
  thematicSystem?.update();
  stormSystem?.update(lastFrameTime?Math.min((now-lastFrameTime)/1000,.06):0);lastFrameTime=now;
  const projected=new THREE.Vector3();const forward=new THREE.Vector3();camera.getWorldDirection(forward);
  for(const l of labels){projected.copy(l.position).project(camera);const d=camera.position.distanceTo(l.position),dist=camera.position.distanceTo(controls.target);const compact=stage.clientWidth<670;const major=selected?.id==='region'?['lafayette','scott','broussard','youngsville','marsh']:['lafayette','abbeville','new-iberia'];const allowed=!compact||l.id===selected?.id||major.includes(l.id)||(l.river&&dist>90);const visible=allowed&&projected.z<1&&projected.z>-1&&Math.abs(projected.x)<1.2&&Math.abs(projected.y)<1.2&&(selected?.id==='region'||dist>90||l.id===selected?.id||d<dist*1.12);
    l.el.style.display=visible?'':'none';l.el.style.left=`${(projected.x*.5+.5)*stage.clientWidth}px`;l.el.style.top=`${(-projected.y*.5+.5)*stage.clientHeight}px`;l.el.style.opacity=l.river&&dist<70?'0':dist<26&&l.id===selected?.id?'0':'1';}
  const azimuth=controls.getAzimuthalAngle();$('north-arrow').style.transform=`rotate(${-azimuth*180/Math.PI}deg)`;
  renderer.render(scene,camera);
  frameCount++;if(ready&&now-lastMetrics>1500){canvas.dataset.renderStats=JSON.stringify({fps:Math.round(frameCount*1000/(now-lastMetrics)),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,place:selected?.id??'overview',camera:camera.position.toArray().map(v=>+v.toFixed(3)),target:controls.target.toArray().map(v=>+v.toFixed(3))});lastMetrics=now;frameCount=0;}
}
requestAnimationFrame(animate);
try{
  const response=await fetch('./data/world.json.gz');if(!response.ok)throw new Error(`World data: HTTP ${response.status}`);data=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
  await new Promise(resolve=>setTimeout(resolve,40));
  const buildStart=performance.now();world=await buildWorld(data,scene);canvas.dataset.buildMs=Math.round(performance.now()-buildStart);renderer.shadowMap.needsUpdate=true;
  const descriptions={lafayette:'The river & the urban center',abbeville:'Southern river town','new-iberia':'The eastern corridor',broussard:'Homes at the swamp edge',scott:'Connected western neighborhoods',youngsville:'Southern neighborhoods',jeanerette:'A small bayou settlement',franklin:'The lower coastal plain'};
  data.towns.forEach(t=>{
    const option=document.createElement('option');option.value=t.id;option.textContent=t.name;
    $('town-options').append(option);label(t.name,t.x,t.z,t.id);
  });
  document.querySelectorAll('[data-world-control]').forEach(el=>el.disabled=false);
  if(data.georeferenced){const s=data.streams.find(s=>s.name==='Vermilion River'),p=s.points[Math.floor(s.points.length*.5)];label('Vermilion River',...p,'river-north',true);label('Swamp',data.places.wetlands.x,data.places.wetlands.z,'marsh',true);}else{label('Vermilion River',-9,-68,'river-north',true);label('Coastal marsh',40,81,'marsh',true);}
  overview(false);ready=true;$('loading').remove();
  canvas.dataset.worldStats=JSON.stringify(world.stats);
  canvas.dataset.channelGeometry=data.channelGeometryVersion??'legacy';
  try{
    stormSystem=await createStorms(world,scene);stormSystem.select('atlas');stormSystem.set({clouds:false,rain:false});
    $('storm-toggle').disabled=false;$('surface-rainfall').disabled=false;
    try{floodSystem=await createFloods(world,scene,syncStormUI);surfaceMode='rainfall';$('surface-flood').disabled=false;}
    catch(error){console.error(error);$('surface-flood').disabled=true;$('surface-flood').title='Flood assets could not load; reload to retry.';toast('Flood assets could not load. Rainfall is still available.');}
    setStormMode(true);
    try{thematicSystem=await createThematics(world,scene,syncThematicUI);$('surface-clusters').disabled=false;$('surface-hand').disabled=false;}
    catch(error){console.error(error);toast('Cluster and HAND maps could not load.');}
  }catch(error){console.error(error);$('storm-toggle').disabled=true;toast('The landscape is ready; rainfall assets could not load.');}
}catch(error){console.error(error);$('loading').innerHTML='<h2>The landscape could not load.</h2><p>Please reload the page. This interactive map needs a current browser with WebGL and JavaScript enabled.</p>';}

function syncWorkflow(){
  const mode=stormMode?surfaceMode:'landscape';
  document.body.dataset.map=mode;
  const labels={rainfall:'Rainfall',flood:'Maximum flood depth',clusters:'Building exposure clusters',hand:'Height above drainage',landscape:'Landscape'};
  $('active-layer').textContent=labels[mode];
  $('active-scenario').textContent=mode==='landscape'?'The Vermilion watershed':mode==='hand'?'HAND · connected drainage':mode==='clusters'?(clusterId==='atlas-clusters'?'Atlas 14':'SSTmax · 50 simulations'):stormSystem?.selected.title??'Loading…';
  $('rain-legend').hidden=!stormMode||isThematic();
  $('storm-toggle').setAttribute('aria-pressed',String(!stormMode));
  document.querySelector('.storm-catalog').hidden=!['rainfall','flood'].includes(mode);
  $('cluster-cases').hidden=mode!=='clusters';
  $('scenario-heading').textContent=mode==='clusters'?'Choose a scenario':mode==='hand'||mode==='landscape'?'Map context':'Choose a storm';
  $('scenario-message').hidden=!['hand','landscape'].includes(mode);
  $('scenario-message').textContent=mode==='hand'?'One terrain map for all scenarios. HAND is the height above the connected drainage channel.':'A view of the basin with the study overlays turned off.';
}
function setPanel(open){
  document.body.classList.toggle('panel-open',open);
  $('mobile-layers').setAttribute('aria-expanded',String(open));
  if(matchMedia('(max-width: 760px)').matches){
    $('sidebar').inert=!open;$('stage').inert=open;
    if(open)requestAnimationFrame(()=>$('panel-close').focus({preventScroll:true}));else $('mobile-layers').focus();
  }
}
$('place-select').addEventListener('change',event=>{if(event.target.value)focusPlace(event.target.value);else overview();});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&document.body.classList.contains('panel-open'))setPanel(false);
  if(event.key==='Tab'&&matchMedia('(max-width: 760px)').matches&&document.body.classList.contains('panel-open')){
    const items=[...$('sidebar').querySelectorAll('button:not(:disabled),select,a,input,summary')].filter(el=>el.getClientRects().length&&!el.closest('[hidden]'));
    if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1).focus();}
    else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0].focus();}
  }
});
const narrow=matchMedia('(max-width: 760px)');
function updatePanelLayout(){const mobile=narrow.matches;$('sidebar').inert=mobile&&!document.body.classList.contains('panel-open');$('stage').inert=mobile&&document.body.classList.contains('panel-open');}
narrow.addEventListener('change',updatePanelLayout);updatePanelLayout();
