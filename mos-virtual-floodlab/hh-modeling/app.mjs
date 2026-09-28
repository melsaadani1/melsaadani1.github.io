import {bindEquationDemos} from './equations.mjs';
import {WatershedWorld} from './world.mjs';
import {hydrology,clamp,landUse,ZONES} from './model.mjs';
import {floodIllustration,STUDY_POINT} from './flood-illustration.mjs';
import {showProcessLens} from './process-effects.mjs';
import {STEPS,INFO,METHODS} from './lesson-content.mjs';
import {ExperimentGate} from '../src/experiment-gate.js';
const $=id=>document.getElementById(id),fmt=(n,d=1)=>Number(n).toFixed(d);
const state={step:0,unlocked:0,phase:'watershed',layer:'landscape',process:'none',seen:new Set(),hydro:null,hydraulic:null,baseline:null,changed:null,showOriginal:false,pins:[],pinSerial:0,frame:0,output:'depth',playing:false,inspected:null};
let world,toastTimer,changeTimer,playLast=0;
const inputs=()=>({rain:+$('rain').value,duration:+$('duration').value,infiltration:+$('infiltration').value,wetness:'dry',development:$('development').value==='developed',pattern:$('pattern').value});
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3200);}
function openDetails(title,html){stop();$('details-title').textContent=title;$('details-content').innerHTML=html;bindEquationDemos($('details-content'));$('details-dialog').showModal();$('details-dialog').scrollTop=0;}
function explain(key){openDetails(...INFO[key]);}
function beacon(selector,text){document.querySelectorAll('.next-target').forEach(b=>b.classList.remove('next-target'));document.querySelector(selector)?.classList.add('next-target');$('instruction-text').textContent=text;}
function syncBeacon(){
 if(state.step===0){beacon('#step-next','Choose your rainfall and infiltration, then click the glowing “2 · Follow the runoff” button.');return;}
 if(state.step===1){
  $('check-infiltration').classList.toggle('done',state.seen.has('infiltration'));$('check-overland').classList.toggle('done',state.seen.has('overland'));$('check-hydrograph').classList.toggle('done',!!state.hydro);
  if(state.hydro){beacon('#step-next','Your curve shows flow, not depth. Next, turn this flow into a flood map.');return;}
  if(!state.seen.has('infiltration')){beacon('[data-process="infiltration"]','Click the glowing Infiltration button beneath the map. Watch water enter the soil.');return;}
  if(!state.seen.has('overland')){beacon('[data-process="overland"]','Now click Overland flow. Follow the surface paths into streams.');return;}
  beacon('#run-hydro','Click Create hydrograph to see how much water reaches the outlet, and when.');return;
 }
 if(state.step===2)beacon('#inspect-village','Click Locate village edge. Read the depth and water elevation at that fixed point.');
 if(state.step===3)beacon('#more-rain','Try more rain, or choose lower infiltration. The changed flood updates automatically.');
}
function stop(){state.playing=false;$('replay').textContent='▶ Replay flood';}
function setProcess(process){state.process=process;world?.setProcess(process);if(process!=='none'&&process!=='rainfall')setLayer('landscape');showProcessLens($('process-lens'),process);$('map-legend').hidden=process!=='none';document.querySelectorAll('[data-process]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.process===process)));if($('close-process'))$('close-process').onclick=()=>setProcess('none');}
function setLayer(layer){state.layer=layer;world?.setLayer(layer);document.querySelectorAll('[data-layer]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layer===layer)));legend();}
function legend(){$('map-scenario').hidden=state.step<2;$('map-scenario').textContent=(state.step===3?(state.showOriginal?'ORIGINAL STORM':'CHANGED STORM'):'YOUR STORM')+' · '+(state.step===3&&state.showOriginal?state.baseline.h.options.rain:inputs().rain)+' mm';let html='';const row=(c,t)=>`<span><i style="background:${c}"></i>${t}</span>`;
 if(state.step>=2&&state.hydraulic){const scales={depth:['WATER DEPTH · m','#a2d7cb,#268c9d,#314e85',['0.10','1.5','3.0+'],'Water above the ground'],height:['WATER ELEVATION · m','#cadf9d,#348fa1,#4c4277',['6','12','18+'],'Above the scene’s local datum'],velocity:['ILLUSTRATED SPEED · m/s','#bce3c3,#137f88,#e5b35f',['0','1.0','2.0+'],'Illustrative downstream movement']};if(state.output==='extent')html='<span class="legend-title">INUNDATION EXTENT</span><div class="legend-items">'+row('#399ba6','Water depth greater than 0.10 m')+'</div>';else {const [label,colors,ticks,note]=scales[state.output];html=`<span class="legend-title">${label}</span><div class="legend-ramp" style="background:linear-gradient(90deg,${colors})"></div><div class="legend-ticks">${ticks.map(t=>`<span>${t}</span>`).join('')}</div><p>${note}</p>`;}if(state.step===3&&!state.showOriginal)html+='<p><span style="color:#ad812a">━</span> Gold: original peak flood edge<br><span style="color:#bc6946">□</span> Newly reached buildings</p>';html+='<p>Illustrative flood · '+(state.step===3?(state.showOriginal?'original':'changed')+' storm':'your storm')+'</p>';
 }else if(state.layer==='terrain')html='<span class="legend-title">GROUND ELEVATION · m</span><div class="legend-ramp" style="background:linear-gradient(90deg,#648671,#a8b77b,#e2c178,#ba8867,#877478,#e8ded0)"></div><div class="legend-ticks"><span>6</span><span>18</span><span>70</span><span>156</span></div>';
 else if(state.layer==='landuse')html='<span class="legend-title">LAND COVER</span><div class="legend-items">'+row('#68ab5f','Forest')+row('#ab6c28','Farmland')+row('#dec5c5','Developed')+row('#b8d9eb','Wetland')+'</div><p>NLCD-inspired colors.</p>';
 else if(state.layer==='rainfall')html=`<span class="legend-title">RAINFALL · ${inputs().rain} mm in ${inputs().duration} h</span><p>Rainfall input, not floodwater depth.</p>`;
 else if(state.layer==='mesh')html='<span class="legend-title">TERRAIN MESH</span><p>50 m cells represent terrain across the floodplain.</p>';
 else html='<span class="legend-title">ONE WATERSHED · ONE OUTLET</span><p>The tributaries carry water downhill into Rohan Creek.</p>';
 $('map-legend').innerHTML=html;
}
function goStep(i){if(i>state.unlocked)return;clearTimeout(changeTimer);stop();state.step=i;state.phase=i<2?'hydrology':'hydraulics';document.body.dataset.step=i;
 if(i===3&&!state.baseline){if(!state.hydro)calculateHydro();if(!state.hydraulic)state.hydraulic=floodIllustration(state.hydro);state.baseline={h:state.hydro,f:state.hydraulic};state.changed=null;state.showOriginal=true;}
 const s=STEPS[i];$('step-kicker').textContent=`STEP ${i+1} OF 4`;$('lesson-title').textContent=s.title;$('lesson-copy').textContent=s.copy;$('step-next').textContent=s.next;$('step-back').disabled=i===0;$('step-next').disabled=i===1&&!state.hydro;
 document.querySelectorAll('[data-step]').forEach(b=>{const n=+b.dataset.step;b.disabled=n>state.unlocked;b.classList.toggle('complete',n<i);if(n===i)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
 $('scenario-inputs').hidden=!(i===0||i===3);$('runoff-actions').hidden=i!==1;$('flood-actions').hidden=i!==2;$('compare-actions').hidden=i!==3;$('process-strip').hidden=i!==1;$('hydraulic-bar').hidden=i<2;$('flood-readout').hidden=i<2;$('compare-panel').hidden=i!==3;$('hydro-results').hidden=i!==1||!state.hydro;
 $('pin-hydro').hidden=i!==3;$('pinned-runs').hidden=i!==3;$('hydro-title').textContent=i===3?'Compare hydrographs':'The outlet hydrograph';
 if(i===3)$('hydro-results').hidden=false;
 document.querySelectorAll('[data-layer]').forEach(b=>b.hidden=i>=2&&!['landscape','terrain','mesh'].includes(b.dataset.layer)||i<2&&b.dataset.layer==='mesh');
 world?.setPhase(state.phase);setProcess('none');setLayer(i===0?'rainfall':'landscape');world.showInflows=false;
 $('map-inspector').hidden=true;state.inspected=null;world.pick.visible=false;
 if(i<2){world.floodGroup.visible=false;world.setData({options:inputs()});world.home();if(i===0)world.setProcess('rainfall');}
 if(i===1){setProcess('infiltration');renderHydro();}
 if(i===2){state.hydraulic=floodIllustration(state.hydro);setFrame(state.hydraulic.peakFrame);world.fly(-80,2920,50);$('run-status').textContent='Peak flood shown. Use replay to watch water rise and recede.';}
 if(i===3){updateComparison();world.fly(-80,2920,50);}
 if(i===0)$('run-status').textContent='Start with the default storm, or choose your own.';
 if(i===1)$('run-status').textContent=state.hydro?'Hydrograph ready. Continue to the flood map.':'Watch the processes, then create the hydrograph.';
 syncBeacon();$('steps').scrollIntoView({behavior:'smooth',block:'start'});
}
function calculateHydro(){state.hydro=hydrology(inputs());world.setData(state.hydro);$('pin-hydro').disabled=false;renderHydro();return state.hydro;}
function runHydro(){calculateHydro();state.hydraulic=null;state.baseline=null;state.changed=null;setProcess('routing');$('hydro-results').hidden=false;$('step-next').disabled=false;state.unlocked=Math.max(state.unlocked,2);$('run-status').textContent=`Hydrology ready: peak ${fmt(state.hydro.peak)} m³/s at ${fmt(state.hydro.peakTime)} hours.`;document.querySelector('[data-step="2"]').disabled=false;syncBeacon();$('hydro-results').scrollIntoView({behavior:'smooth',block:'center'});}
function renderHydro(){if(!state.hydro)return;const h=state.hydro;$('results-metrics').innerHTML=[[fmt(h.peak),'m³/s','Peak discharge'],[fmt(h.peakTime),'h','Time to peak'],[fmt(h.runoffFraction*100,0),'%','Rain becoming runoff']].map(([v,u,l])=>`<div><span>${l}</span><strong>${v} <small>${u}</small></strong></div>`).join('');drawChart();}
function setFrame(n){if(!state.hydraulic)return;state.frame=clamp(Math.round(n),0,96);const f=state.hydraulic.frames[state.frame];$('flood-time').value=state.frame;$('clock').textContent=String(Math.floor(f.time)).padStart(2,'0')+':'+String(Math.round(f.time%1*60)).padStart(2,'0');world.setFlood(state.hydraulic,state.frame,state.output);world.floodGroup.visible=state.step>=2;
 $('area-reading').innerHTML=fmt(f.wetArea/10000)+' <small>ha</small>';$('depth-reading').innerHTML=f.probeDepth>.1?fmt(f.probeDepth,2)+' <small>m</small>':'Dry';$('level-reading').innerHTML=f.probeDepth>.1?fmt(f.probeLevel,2)+' <small>m</small>':'—';renderInspector();legend();}
function replay(){if(state.playing){stop();return;}setFrame(0);state.playing=true;playLast=0;$('replay').textContent='Ⅱ Pause';requestAnimationFrame(playFrame);}
function playFrame(t){if(!state.playing)return;if(!playLast||t-playLast>190){setFrame(state.frame+1);playLast=t;if(state.frame>=96){stop();return;}}requestAnimationFrame(playFrame);}
function inputChanged(){clearTimeout(changeTimer);stop();$('rain-value').textContent=$('rain').value+' mm';if(state.step===3){$('run-status').textContent='Updating the changed storm…';$('pin-hydro').disabled=true;$('show-changed').disabled=true;changeTimer=setTimeout(updateComparison,160);}else{state.hydro=null;state.hydraulic=null;state.baseline=null;state.changed=null;state.unlocked=1;world.setData({options:inputs()});$('run-status').textContent='Inputs set. Continue to step 2.';document.querySelectorAll('[data-step]').forEach(b=>b.disabled=+b.dataset.step>1);legend();}}
function updateComparison(){if(!state.baseline)return;stop();
 const same=Object.entries(inputs()).every(([key,value])=>state.baseline.h.options[key]===value);
 if(same){state.changed=null;state.hydro=state.baseline.h;$('pin-hydro').disabled=false;showScenario(true);renderHydro();renderComparison();$('run-status').textContent='Original storm ready. Change an input to add a comparison.';beacon('#more-rain','Pin the original hydrograph if you want to keep it, then change rainfall or infiltration.');return;}
 calculateHydro();state.changed={h:state.hydro,f:floodIllustration(state.hydro)};state.changed.f.originalFrame=state.baseline.f.frames[state.baseline.f.peakFrame];state.showOriginal=false;showScenario(false);renderComparison();$('run-status').textContent='Updated: the map shows your changed storm at peak flow.';beacon('#show-original','Switch between Original flood and Changed flood to compare the same landscape.');}
function showScenario(original){const s=original?state.baseline:state.changed;if(!s)return;state.showOriginal=original;state.hydraulic=s.f;world.setData(s.h);$('show-original').setAttribute('aria-pressed',String(original));$('show-changed').setAttribute('aria-pressed',String(!original));setFrame(s.f.peakFrame);}
function buildingsReached(f,result){return world.buildingSites.filter(p=>{const k=Math.floor((p.z-result.grid.z0)/50)*64+Math.floor((p.x-result.grid.x0)/50);return f.connected[k]&&bedAt(p.z)+f.stage-p.ground>.1;}).length;}
function renderComparison(){
 const a=state.baseline,b=state.changed,af=a.f.frames[a.f.peakFrame],bf=b?.f.frames[b.f.peakFrame],infil=o=>({2:'Higher',1:'Medium',0.3:'Lower'})[o.infiltration];
 const values=(run,f)=>[run.h.options.rain+' mm',infil(run.h.options),fmt(run.h.peak)+' m³/s',fmt(f.wetArea/10000)+' ha',buildingsReached(f,run.f),f.probeDepth>.1?fmt(f.probeDepth,2)+' m':'Dry',f.probeDepth>.1?fmt(f.probeLevel,2)+' m':'—'];
 const labels=['Rainfall','Infiltration','Peak discharge','Flooded land','Building locations reached','Depth at village edge','Water elevation there'],original=values(a,af),comparison=b?values(b,bf):labels.map(()=>'—');
 $('compare-values').innerHTML=labels.map((label,i)=>`<tr><th scope="row">${label}</th><td>${original[i]}</td><td>${comparison[i]}</td></tr>`).join('');$('show-changed').disabled=!b;
 if(!b){$('compare-story').textContent='No comparison yet. Change rainfall or infiltration to add a second result.';return;}
 const d=b.h.peak-a.h.peak,area=(bf.wetArea-af.wetArea)/10000;$('compare-story').textContent=Math.abs(d)<.01?'These input choices give nearly the same peak discharge. Compare their timing and flood footprint.':`The changed storm produces ${fmt(Math.abs(d))} m³/s ${d>0?'more':'less'} peak discharge. The illustrated flooded area is ${fmt(Math.abs(area))} ha ${area>=0?'larger':'smaller'}, reaching ${buildingsReached(bf,b.f)} building locations versus ${buildingsReached(af,a.f)} originally.`;
}
function renderInspector(){const p=state.inspected;if(!p)return;$('inspect-title').textContent=p.name;let html=`<p>Ground elevation <strong>${fmt(p.height,2)} m</strong></p>`;if(state.step>=2&&state.hydraulic){const f=state.hydraulic.frames[state.frame];const z=f.stage+bedAt(p.z),d=f.connected[p.index]?Math.max(0,z-p.height):0,v=Math.hypot(f.ux[p.index],f.uz[p.index]);html+=d>.1?`<p>Water depth <strong>${fmt(d,2)} m</strong></p><p>Water elevation <strong>${fmt(z,2)} m</strong></p><p>Illustrated speed <strong>${fmt(v,2)} m/s</strong></p>`:'<p><strong>Dry at this time.</strong></p>';html+='<p class="mini">Elevation relative to the scene’s local datum.</p>';}else html+=`<p>${['Forest','Farmland','Developed land','Wetland'][landUse(p.x,p.z,inputs().development)]}</p>`;$('inspect-values').innerHTML=html;}
// Same local datum as the scene terrain.
import {bed as bedAt} from './model.mjs';
function budget(){if(!state.hydro){openDetails('Where did the rain go?','<p>Create a hydrograph in step 2 to see the water balance.</p>');return;}const h=state.hydro,b=h.balance,mm=v=>fmt(v/h.area*1000,2),rows=[['Rainfall input',b.rain],['Evapotranspiration',b.evap],['Soil storage',b.soil],['Canopy storage',b.canopy],['Still travelling on land / in streams',b.hill+b.reach],['Passed the outlet',b.outflow]];openDetails('Where did the rain go?',`<p>Basin-equivalent millimetres after 24 hours; these are volumes divided by basin area, not flood depth.</p>${rows.map(([s,v])=>`<div class="budget-row"><span>${s}</span><b>${mm(v)} mm</b></div>`).join('')}<p>Hydrologic balance residual: ${Math.abs(h.massError)<.01?'less than 0.01':fmt(Math.abs(h.massError),2)} m³.</p><p>The flood map uses an illustrative flow-to-level relation. It has no separate numerical hydraulic water-balance claim.</p>`);}
function setInputs(o){$('rain').value=o.rain;$('duration').value=o.duration;$('infiltration').value=o.infiltration;$('development').value=o.development?'developed':'current';$('pattern').value=o.pattern;$('rain-value').textContent=o.rain+' mm';}
function restart(){clearTimeout(changeTimer);state.hydro=null;state.hydraulic=null;state.baseline=null;state.changed=null;state.showOriginal=false;state.unlocked=1;state.seen.clear();state.pins=[];state.pinSerial=0;state.output='depth';renderPins();$('pinned-runs').open=false;$('more-inputs').open=false;document.querySelectorAll('[data-output]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.output==='depth')));setInputs({rain:85,duration:6,infiltration:1,development:false,pattern:'uniform'});goStep(0);}
document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>goStep(+b.dataset.step));
document.querySelectorAll('[data-info]').forEach(b=>b.onclick=()=>explain(b.dataset.info));$('step-info').onclick=()=>explain(STEPS[state.step].info);
document.querySelectorAll('[data-layer]').forEach(b=>b.onclick=()=>{setProcess('none');setLayer(b.dataset.layer);});
document.querySelectorAll('[data-process]').forEach(b=>b.onclick=()=>{setProcess(b.dataset.process);state.seen.add(b.dataset.process);syncBeacon();$('world-wrap').scrollIntoView({behavior:'smooth',block:'center'});});
document.querySelectorAll('[data-output]').forEach(b=>b.onclick=()=>{state.output=b.dataset.output;document.querySelectorAll('[data-output]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));setFrame(state.frame);});
$('step-next').onclick=()=>{if(state.step===3){stop();$('complete-dialog').showModal();return;}state.unlocked=Math.max(state.unlocked,state.step+1);goStep(state.step+1);};
$('complete-restart').onclick=()=>{$('complete-dialog').close();restart();};
$('complete-close').onclick=()=>$('complete-dialog').close();
$('step-back').onclick=()=>goStep(state.step-1);$('restart-guide').onclick=restart;$('run-hydro').onclick=runHydro;
for(const id of ['rain','infiltration','duration','development','pattern'])$(id).addEventListener(id==='rain'?'input':'change',inputChanged);
$('more-rain').onclick=()=>{$('rain').value=Math.min(160,state.baseline.h.options.rain+40);inputChanged();};$('less-infiltration').onclick=()=>{$('infiltration').value=.3;inputChanged();};$('restore-original').onclick=()=>{setInputs(state.baseline.h.options);inputChanged();};
$('show-original').onclick=()=>{stop();showScenario(true);$('world-wrap').scrollIntoView({behavior:'smooth',block:'center'});};$('show-changed').onclick=()=>{stop();showScenario(false);$('world-wrap').scrollIntoView({behavior:'smooth',block:'center'});};
$('pin-hydro').onclick=pin;$('clear-pins').onclick=()=>{state.pins=[];renderPins();drawChart();};$('replay').onclick=replay;$('flood-time').oninput=e=>{stop();setFrame(+e.target.value);};$('peak-flood').onclick=()=>{stop();setFrame(state.hydraulic.peakFrame);};
$('inspect-village').onclick=()=>{world.fly(STUDY_POINT.x,STUDY_POINT.z,26);world.inspect(STUDY_POINT.x,STUDY_POINT.z,STUDY_POINT.name);beacon('#step-next','You have read the flood depth. Continue to step 4 and test a different storm.');$('world-wrap').scrollIntoView({behavior:'smooth',block:'center'});};
$('show-mesh').onclick=()=>{setLayer(state.layer==='mesh'?'landscape':'mesh');$('show-mesh').textContent=state.layer==='mesh'?'Hide the terrain mesh':'Show the terrain mesh';};
$('equations-open').onclick=()=>openDetails('Equations & model details',METHODS);$('budget-open').onclick=budget;document.querySelector('.dialog-close').onclick=()=>$('details-dialog').close();$('inspect-close').onclick=()=>{$('map-inspector').hidden=true;state.inspected=null;world.pick.visible=false;};
$('flow-toggle').onchange=e=>world.waterEffects.enabled=e.target.checked;$('cloud-toggle').onchange=e=>world.waterEffects.cloudsEnabled=e.target.checked;$('labels-toggle').onchange=e=>world.showLabels=e.target.checked;
$('camera-home').onclick=()=>world.home();$('camera-top').onclick=()=>world.top();$('camera-rotate').onclick=()=>world.rotate();$('camera-plus').onclick=()=>world.zoom(.8);$('camera-minus').onclick=()=>world.zoom(1.25);$('expand').onclick=()=>{const expanded=document.body.classList.toggle('is-expanded');$('expand').setAttribute('aria-pressed',String(expanded));$('expand').setAttribute('aria-label',expanded?'Return to page layout':'Expand laboratory');requestAnimationFrame(()=>world.resize());};document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('details-dialog').open&&document.body.classList.contains('is-expanded'))$('expand').click();});
const PIN_COLORS=['#ae713f','#785f99','#307fa4','#ad557e','#708329','#7d6552','#4968a7','#9b7724'];
function updateWeather(){const o=inputs();$('weather-reading').textContent=`Rainfall preview · ${fmt(o.rain/o.duration)} mm/h average · ${o.rain} mm over ${o.duration} h`;}
function pin(){if(state.step!==3||!state.hydro)return;const key=JSON.stringify(state.hydro.options),existing=state.pins.find(p=>p.key===key);if(existing){existing.visible=true;renderPins();drawChart();toast('This set of inputs is already saved. Its curve is visible.');return;}const h=state.hydro,id=++state.pinSerial;
 const label=`${h.options.rain} mm / ${h.options.duration} h · ${({2:'higher',1:'medium',0.3:'lower'})[h.options.infiltration]} infiltration · ${h.options.development?'more developed':'current land'} · ${h.options.pattern==='uniform'?'uniform rain':'upstream rain'}`;
 state.pins.push({id,key,label,h,visible:true,color:PIN_COLORS[(id-1)%PIN_COLORS.length]});$('pinned-runs').open=true;renderPins();drawChart();toast(`Run ${id} saved. ${state.pins.length} hydrographs pinned; change an input and run again to compare.`);
}
function renderPins(){const list=$('pin-list');list.replaceChildren();$('pin-count').textContent=state.pins.length+' '+(state.pins.length===1?'run':'runs');$('clear-pins').hidden=!state.pins.length;
 for(const p of state.pins){const row=document.createElement('div');row.className='pin-row';row.setAttribute('role','listitem');const label=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.checked=p.visible;box.setAttribute('aria-label',`Show saved run ${p.id}`);box.onchange=()=>{p.visible=box.checked;drawChart();};const swatch=document.createElement('i');swatch.style.background=p.color;const text=document.createElement('span');text.textContent=`${p.id}. ${p.label}`;label.append(box,swatch,text);const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label',`Remove saved run ${p.id}`);remove.onclick=()=>{state.pins=state.pins.filter(q=>q!==p);renderPins();drawChart();};row.append(label,remove);list.append(row);}
}

function drawChart(){const svg=$('hydrograph'),h=state.hydro;svg.replaceChildren();if(!h){$('chart-key').textContent='Time since rainfall begins · storm runoff only';return;}const W=640,H=210,m={l:46,r:13,t:42,b:31},pw=W-m.l-m.r,ph=H-m.t-m.b,hydraulic=false,plotQ=hydraulic?h.time.map((_,i)=>h.laterals.reduce((sum,a)=>sum+a[i],0)):h.q,plotPeak=Math.max(...plotQ),showParts=false,compare=state.step===3?[...(state.baseline&&state.changed?[{id:'original',h:state.baseline.h,color:'#ac8147'}]:[]),...state.pins.filter(p=>p.visible)]:[],all=[...plotQ,...compare.flatMap(p=>Array.from(p.h.q)),...(showParts?h.laterals.flatMap(x=>Array.from(x)):[])],ymax=Math.max(5,Math.ceil(Math.max(...all)/10)*10),x=t=>m.l+t/24*pw,y=q=>H-m.b-q/ymax*ph;
 const node=(tag,attrs,text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;svg.append(n);return n;};
 node('text',{x:m.l,y:10,fill:'#557361','font-size':10,'font-family':'Segoe UI, sans-serif'},'Q (m³/s)');
 for(let j=0;j<=4;j++){const v=ymax*j/4;node('line',{x1:m.l,x2:W-m.r,y1:y(v),y2:y(v),stroke:'#dce3d5','stroke-width':.7});node('text',{x:m.l-8,y:y(v)+3,'text-anchor':'end',fill:'#789078','font-size':9},fmt(v,v%1?1:0));}
 for(let t=0;t<=24;t+=6)node('text',{x:x(t),y:H-14,'text-anchor':'middle',fill:'#789078','font-size':9},t+' h');
 const path=arr=>Array.from(arr,(q,i)=>(i?'L':'M')+fmt(x(h.time[i]),1)+','+fmt(y(q),1)).join('');
 const rainMax=Math.max(...h.rain,1);for(let i=0;i<h.rain.length;i++)if(h.rain[i])node('rect',{x:x(h.time[i]),y:19,width:Math.max(1,pw/288),height:h.rain[i]/rainMax*15,fill:'#a8c2b1',opacity:.68});
 node('text',{x:W-m.r,y:10,'text-anchor':'end',fill:'#879981','font-size':9},'Rainfall · '+h.options.rain+' mm / '+h.options.duration+' h');
 node('path',{d:path(plotQ)+`L${x(24)},${y(0)}L${x(0)},${y(0)}Z`,fill:'#72a893',opacity:.14});
 for(const p of compare)node('path',{d:path(p.h.q),fill:'none',stroke:p.color,'stroke-width':2,'stroke-dasharray':p.id>8?'2 3':'7 3'});
 if(showParts)h.laterals.forEach((arr,j)=>node('path',{d:path(arr),fill:'none',stroke:ZONES[j].color,'stroke-width':1.5,'stroke-dasharray':'3 3'}));
 node('path',{d:path(plotQ),fill:'none',stroke:'#326e60','stroke-width':2.7,'stroke-linejoin':'round'});
 let markerTime=h.time[plotQ.indexOf(plotPeak)];let n=Math.min(288,Math.round(markerTime*12));
 node('line',{x1:x(markerTime),x2:x(markerTime),y1:36,y2:H-m.b,stroke:'#849b7c','stroke-width':1,'stroke-dasharray':'3 3'});node('circle',{cx:x(markerTime),cy:y(plotQ[n]),r:3.7,fill:'#326e60',stroke:'#faf9eb','stroke-width':1.5});
 const label=`Peak ${fmt(h.peak)} m³/s`;node('text',{x:Math.min(W-115,x(markerTime)+7),y:Math.max(41,y(plotQ[n])-10),fill:'#356a59','font-size':10},label);
 $('chart-key').innerHTML='<span><i style="color:#326e60"></i>'+(hydraulic?'Total tributary inflow':'Outlet estimate')+'</span>'+compare.map(p=>`<span><i style="color:${p.color};border-top-style:dashed"></i>${p.id==='original'?'Original storm':'Saved '+p.id}</span>`).join('')+(showParts?ZONES.map((z,i)=>`<span><i style="color:${z.color}"></i>${['Headwaters','Eastern','Lower basin'][i]}</span>`).join(''):'<span>Time since rain begins · hours</span>');
}

const accepted=await new ExperimentGate().request('H&H modeling · From rainfall to floodplain');
if(!accepted)location.href='../#home';else try{world=new WatershedWorld($('world'),p=>{state.inspected=p;$('map-inspector').hidden=false;renderInspector();});$('loading').hidden=true;$('experience').inert=false;state.unlocked=1;renderPins();goStep(0);}catch(error){$('loading').innerHTML='<strong>The landscape could not start.</strong><p>Please reload in a browser with WebGL enabled.</p>';console.error(error);}
