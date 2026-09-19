import {ExperimentGate} from './experiment-gate.js?v=1.6.0';
import {BUILDINGS,FT,createInventory,fractionAt,evaluate,money} from './data.js';
import {FloodScene} from './scene.js';
import {RoadLab} from './road-app.js';
import {AccessibilityLab} from './access-app.js?v=1.6.2';
let accessibilityLab;

const $=id=>document.getElementById(id);
let config=BUILDINGS.house1,items=createInventory(config),waterM=config.ffe+FT,selected='range',category='contents',chartDollars=false,playing=false,animationLast=0,scene,toastTimer,lessonIndex=0;
let previousFractions=new Map();
let activeLesson=null;
let roadLab;
let expanded=false,nativeExpanded=false,expandedPanel='none',pageScroll={x:0,y:0};
const workspace=document.querySelector('.workspace');
workspace.id='lab-workspace';
const lossPanel=document.querySelector('.loss-panel');
lossPanel.id='loss-panel';
const expandedTools=document.createElement('div');
expandedTools.className='expanded-tools';
expandedTools.innerHTML='<select id="expanded-building" aria-label="Choose a building in expanded view"><option value="house1">F1 · One-story home</option><option value="house2">F3 · Two-story home</option><option value="clinic">F12 · Neighborhood clinic</option></select><button type="button" data-expanded-panel="loss" aria-controls="loss-panel" aria-expanded="false">Damage &amp; curves</button><button type="button" data-expanded-panel="item" aria-controls="inspector" aria-expanded="false">Selected item</button><button type="button" id="expanded-guide">Guide</button><button type="button" id="expanded-about" aria-label="Model assumptions in expanded view">?</button>';
document.querySelector('.scene-toolbar').prepend(expandedTools);
for(const [panel,label]of [[lossPanel,'Damage & curves'],[$('inspector'),'Selected item']]){
 const header=document.createElement('div');header.className='expanded-panel-title';
 const title=document.createElement('strong');title.textContent=label;
 const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close '+label.toLowerCase()+' panel');close.addEventListener('click',()=>setExpandedPanel('none'));
 header.append(title,close);panel.prepend(header);
}
// Reuse the live controls and dialogs in fullscreen rather than copying their state.
workspace.append($('about'),$('lesson'));
const lessonCoach=document.createElement('div');lessonCoach.className='lesson-coach';lessonCoach.hidden=true;
lessonCoach.innerHTML='<div><strong id="coach-title"></strong><p id="coach-text"></p></div><button type="button" id="coach-steps">Steps</button><button type="button" id="coach-close" aria-label="Hide experiment reminder">×</button>';
document.querySelector('.water-controls').prepend(lessonCoach);
$('fullscreen').setAttribute('aria-pressed','false');
const percent=n=>(100*n).toFixed(1)+'%';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const ns='http://www.w3.org/2000/svg';
function svgNode(tag,attrs,parent,text){const el=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);if(text!==undefined)el.textContent=text;parent.appendChild(el);return el;}

function initializeScene(){
 if(scene)return;
 try{
 scene=new FloodScene($('scene'),id=>{selectItem(id);if(expanded)setExpandedPanel('item');},(id,event)=>{
  const tip=$('hover-tip');if(!id){tip.hidden=true;return;}const item=items.find(i=>i.id===id);if(!item)return;
  const f=fractionAt(item,waterM);tip.replaceChildren();const b=document.createElement('b');b.textContent=item.name;const s=document.createElement('span');s.textContent=f?percent(f)+' damage · '+money(f*item.value)+' loss':'No modeled loss · '+money(item.value)+' value';tip.append(b,s);tip.hidden=false;
  const r=$('scene').getBoundingClientRect();tip.style.left=clamp(event.clientX-r.left+12,10,r.width-tip.offsetWidth-10)+'px';tip.style.top=clamp(event.clientY-r.top-60,10,r.height-tip.offsetHeight-40)+'px';
 });
 scene.rebuild(config,items);$('loading').remove();scene.select(selected);scene.setWater(waterM);
}catch(err){
 console.error(err);$('loading').innerHTML='<div class="fatal"><strong>The 3D view could not start.</strong><p>Enable hardware acceleration or try a current browser.<br>The damage controls and receipt still work below.</p></div>';
}

}

function buildReceipt(){
 const panel=$('receipt');panel.replaceChildren();
 for(const item of items.filter(i=>i.group===category)){
  const b=document.createElement('button');b.type='button';b.className='receipt-row';b.dataset.item=item.id;b.innerHTML='<span class="receipt-name"></span><span class="receipt-value"></span><strong class="receipt-cost"></strong><span class="receipt-fraction"></span><span class="receipt-meter"><span></span></span>';
  b.querySelector('.receipt-name').textContent=item.name;b.querySelector('.receipt-value').textContent=money(item.value)+' value';b.addEventListener('click',()=>selectItem(item.id));panel.appendChild(b);
 }
 $('receipt').setAttribute('aria-labelledby',category+'-tab');
 document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.category===category)));
}
function setCategory(c){category=c;buildReceipt();updateReceipt();}
function updateReceipt(){
 const totals=evaluate(items,waterM);
 for(const row of $('receipt').children){const item=items.find(i=>i.id===row.dataset.item),f=fractionAt(item,waterM);row.classList.toggle('active',item.id===selected);row.classList.toggle('is-dry',f<.00001);row.setAttribute('aria-pressed',String(item.id===selected));row.querySelector('.receipt-cost').textContent=money(item.value*f);row.querySelector('.receipt-fraction').textContent=f<.00001?'Unaffected':f>=.999?'100% · '+(category==='contents'?'replace':'loss'):percent(f)+' damaged';row.querySelector('.receipt-meter span').style.width=100*f+'%';}
 $('receipt-subtotal').textContent=money(totals[category].loss);$('receipt-total-label').textContent=(category==='contents'?'Contents':'Building')+' subtotal';
}
function selectItem(id){
 const item=items.find(i=>i.id===id);if(!item)return;selected=id;
 if(category!==item.group)setCategory(item.group);
 // Keep the selected component visible when inspecting a different floor.
 if(config.floors===2){const visible=$('floor-view').value;if((item.level===1&&visible==='ground')||(item.level===0&&visible==='upper')){$('floor-view').value=item.level?'upper':'ground';scene?.setFloor($('floor-view').value);}}
 scene?.select(id);updateReceipt();updateInspector();
}
function updateInspector(){
 const item=items.find(i=>i.id===selected);if(!item)return;
 const f=fractionAt(item,waterM),elevation=(item.baseM+(item.elevated?2*FT:0))/FT;
 $('item-category').textContent='SELECTED COMPONENT / '+item.group.toUpperCase()+(item.level?' / UPSTAIRS':'');$('item-name').textContent=item.name;$('item-state').textContent=f<.00001?'Unaffected':f>=.999?(item.group==='contents'?'Replace':'Full modeled loss'):'Partly damaged';$('item-state').classList.toggle('dry',f<.00001);
 $('item-value').textContent=money(item.value);$('item-damage').textContent=percent(f);$('item-loss').textContent=money(item.value*f);$('item-explanation').textContent=item.description;
 $('elevate').hidden=item.canElevate===false;$('elevate').textContent=item.elevated?'Put item back ↓':'Raise item 2 ft ↑';
 $('savings').hidden=!item.elevated;
 if(item.elevated){const baseline=fractionAt(item,waterM,true)*item.value;$('savings').textContent='Raised 2 ft · '+money(baseline-f*item.value)+' less damage cost at the same water level';}
}
function toast(message){clearTimeout(toastTimer);$('damage-toast').textContent=message;$('damage-toast').classList.add('visible');toastTimer=setTimeout(()=>$('damage-toast').classList.remove('visible'),3300);}
function setWaterFt(feet,notify=true){waterM=clamp(feet,0,config.maxFt)*FT;update(notify);}
function update(notify=false){
 const totals=evaluate(items,waterM),ft=waterM/FT,inside=(waterM-config.ffe)/FT;
 $('depth').value=ft;if(document.activeElement!==$('depth-number'))$('depth-number').value=ft.toFixed(1);$('water-label').innerHTML=ft.toFixed(1)+' <small>ft</small>';$('floor-label').textContent=Math.abs(inside).toFixed(1)+' ft '+(inside<0?'below':'above')+' first floor';
 for(const group of ['contents','building']){const t=totals[group];$(group+'-loss').textContent=money(t.loss);$(group+'-percent').textContent=percent(t.loss/t.value)+' of '+money(t.value);$(group+'-count').textContent=items.filter(i=>i.group===group&&fractionAt(i,waterM)>0).length+'/'+items.filter(i=>i.group===group).length;}
 $('total-loss').textContent=money(totals.total);$('total-percent').textContent=percent(totals.total/totals.value)+' of total value';
 document.querySelectorAll('[data-inside]').forEach(b=>b.classList.toggle('active',b.dataset.inside==='dry'?ft<.001:Math.abs(inside-Number(b.dataset.inside))<.06));
 const full=[],newly=[];
 for(const item of items){const f=fractionAt(item,waterM),prev=previousFractions.get(item.id)??f;if(notify&&item.group==='contents'){if(f>=1&&prev<1)full.push(item);else if(f>0&&prev===0)newly.push(item);}previousFractions.set(item.id,f);}
 if(full.length)toast((full.length===1?full[0].name:full.length+' items')+' → full replacement · '+money(full.reduce((s,i)=>s+i.value,0))+' in the receipt');
 else if(newly.length)toast('Water reaches '+(newly.length===1?newly[0].name.toLowerCase():newly.length+' more items'));
 scene?.setWater(waterM);updateReceipt();updateInspector();drawChart();
}
function switchBuilding(id){
 lessonCoach.hidden=true;activeLesson=null;
 stopPlay();config=BUILDINGS[id];items=createInventory(config);waterM=config.ffe+FT;selected=id==='clinic'?'imaging':'range';previousFractions.clear();
 $('expanded-building').value=id;
 document.querySelectorAll('[data-building]').forEach(b=>{const active=b.dataset.building===id;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 $('depth').max=config.maxFt;$('depth-number').max=config.maxFt;$('max-depth').textContent=config.maxFt+' ft';$('floor-datum').textContent='First floor · '+(config.ffe/FT).toFixed(1)+' ft';$('floor-view').hidden=config.floors===1;$('floor-view').value='all';$('cutaway').setAttribute('aria-pressed','true');$('scene-title').textContent=config.code+' / CUTAWAY VIEW';
 if(scene){scene.floorView='all';scene.cutaway=true;scene.rebuild(config,items);scene.select(selected);}
 category='contents';buildReceipt();update();
}

function drawChart(){
 const el=$('damage-chart'),w=$('chart-container').clientWidth;if(!w)return;
 const h=matchMedia('(max-width:900px)').matches?230:185,m={l:37,r:10,t:16,b:36},pw=w-m.l-m.r,ph=h-m.t-m.b;
 el.setAttribute('viewBox',`0 0 ${w} ${h}`);el.setAttribute('height',h);el.replaceChildren();
 const total=evaluate(items,waterM),extent=chartDollars?Math.max(total.contents.value,total.building.value):100;
 const x=v=>m.l+v/config.maxFt*pw,y=v=>m.t+ph-(v/extent)*ph;
 const value=(g,ft)=>{const t=evaluate(items,ft*FT)[g];return chartDollars?t.loss:t.loss/t.value*100;};
 const title=svgNode('title',{},el,'Flood depth versus '+(chartDollars?'loss in dollars':'loss as percent of category value'));
 for(let k=0;k<=4;k++){const v=extent*k/4;svgNode('line',{x1:m.l,x2:w-m.r,y1:y(v),y2:y(v),stroke:'#334751','stroke-width':.7},el);svgNode('text',{x:m.l-7,y:y(v)+3,'text-anchor':'end'},el,chartDollars?'$'+Math.round(v/1000)+'k':Math.round(v)+'%');}
 const ticks=config.maxFt===25?[0,5,10,15,20,25]:[0,3,6,9,12,15,18];
 for(const t of ticks){svgNode('text',{x:x(t),y:h-m.b+17,'text-anchor':t===0?'start':t===config.maxFt?'end':'middle'},el,t);}
 svgNode('text',{x:m.l+pw/2,y:h-2,'text-anchor':'middle'},el,'Water above ground (ft)');
 const ffe=config.ffe/FT;svgNode('line',{x1:x(ffe),x2:x(ffe),y1:m.t,y2:m.t+ph,stroke:'#87969a','stroke-dasharray':'2 4','stroke-opacity':.6},el);
 svgNode('text',{x:Math.min(w-85,x(ffe)+5),y:m.t+9,fill:'#b7c6ca'},el,'First floor');
 for(const [g,color]of [['contents','#b4f5d0'],['building','#f7b07f']]){
  // Include every component breakpoint for exact piecewise-linear aggregation.
  const points=[0,config.maxFt,...items.flatMap(i=>i.curve.map(p=>p[0]+i.baseM/FT+(i.elevated?2:0)))].filter(v=>v>=0&&v<=config.maxFt).sort((a,b)=>a-b);
  const path=points.map((ft,i)=>(i?'L':'M')+x(ft).toFixed(2)+','+y(value(g,ft)).toFixed(2)).join(' ');
  svgNode('path',{d:path,fill:'none',stroke:color,'stroke-width':2.3,'stroke-linejoin':'round'},el);
  svgNode('circle',{cx:x(waterM/FT),cy:y(value(g,waterM/FT)),r:4.5,fill:color,stroke:'#15252f','stroke-width':2},el);
 }
 svgNode('line',{x1:x(waterM/FT),x2:x(waterM/FT),y1:m.t,y2:m.t+ph,stroke:'#f1f5ef','stroke-width':1,'stroke-opacity':.5},el);
 const hoverGroup=svgNode('g',{},el);
 const hit=svgNode('rect',{x:m.l,y:m.t,width:pw,height:ph,fill:'transparent'},el);
 function hover(e){const rect=el.getBoundingClientRect(),px=(e.clientX-rect.left)/rect.width*w,ft=clamp((px-m.l)/pw*config.maxFt,0,config.maxFt);hoverGroup.replaceChildren();svgNode('line',{x1:x(ft),x2:x(ft),y1:m.t,y2:m.t+ph,stroke:'#e5eae5','stroke-dasharray':'3 3'},hoverGroup);for(const [g,c]of [['contents','#b4f5d0'],['building','#f7b07f']])svgNode('circle',{cx:x(ft),cy:y(value(g,ft)),r:3,fill:c},hoverGroup);const t=evaluate(items,ft*FT);$('chart-tooltip').textContent=ft.toFixed(1)+' ft above ground\nContents '+money(t.contents.loss)+' · '+percent(t.contents.loss/t.contents.value)+'\nBuilding '+money(t.building.loss)+' · '+percent(t.building.loss/t.building.value);$('chart-tooltip').hidden=false;}
 hit.addEventListener('pointermove',hover);hit.addEventListener('pointerleave',()=>{hoverGroup.replaceChildren();$('chart-tooltip').hidden=true;});hit.addEventListener('click',e=>{const r=el.getBoundingClientRect();stopPlay();setWaterFt(((e.clientX-r.left)/r.width*w-m.l)/pw*config.maxFt);});
 $('chart-tooltip').hidden=true;
}

document.querySelectorAll('[data-building]').forEach(b=>b.addEventListener('click',()=>switchBuilding(b.dataset.building)));
document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>setCategory(b.dataset.category)));
$('contents-summary').addEventListener('click',()=>setCategory('contents'));$('building-summary').addEventListener('click',()=>setCategory('building'));
$('depth').addEventListener('input',e=>{stopPlay();setWaterFt(Number(e.target.value));});
$('depth-number').addEventListener('input',e=>{if(e.target.value==='')return;const n=Number(e.target.value);if(Number.isFinite(n)){stopPlay();setWaterFt(n);}});
$('depth-number').addEventListener('change',e=>{const n=Number(e.target.value);if(Number.isFinite(n)){stopPlay();setWaterFt(n);}else update();e.target.value=(waterM/FT).toFixed(1);});
document.querySelectorAll('[data-inside]').forEach(b=>b.addEventListener('click',()=>{stopPlay();setWaterFt(b.dataset.inside==='dry'?0:config.ffe/FT+Number(b.dataset.inside));}));
$('elevate').addEventListener('click',()=>{const i=items.find(i=>i.id===selected);i.elevated=!i.elevated;update();scene?.select(selected);toast(i.elevated?i.name+' raised 2 ft · watch the curve shift':'Original height restored');});
$('cutaway').addEventListener('click',()=>{const active=$('cutaway').getAttribute('aria-pressed')!=='true';$('cutaway').setAttribute('aria-pressed',String(active));scene?.setCutaway(active);$('scene-title').textContent=config.code+(active?' / CUTAWAY VIEW':' / EXTERIOR VIEW');});
$('floor-view').addEventListener('change',e=>scene?.setFloor(e.target.value));$('home-view').addEventListener('click',()=>scene?.home());
function setExpandedPanel(panel){
 const previous=expandedPanel,restoreFocus=panel==='none'&&document.activeElement?.closest('.loss-panel,#inspector');
 expandedPanel=panel;workspace.dataset.panel=panel;
 document.querySelectorAll('[data-expanded-panel]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.expandedPanel===panel)));
 if(restoreFocus)document.querySelector('[data-expanded-panel="'+previous+'"]')?.focus({preventScroll:true});
 requestAnimationFrame(()=>{scene?.resize();drawChart();});
}
function applyExpanded(active){
 expanded=active;workspace.classList.toggle('is-expanded',active);document.body.classList.toggle('lab-expanded',active);
 document.querySelectorAll('.topbar,.intro,.archetypes,.module-tabs,#lab-welcome,footer').forEach(el=>el.inert=active);
 $('fullscreen').textContent=active?'Exit ×':'⛶';$('fullscreen').setAttribute('aria-label',active?'Exit expanded view':'Expand 3D view');$('fullscreen').setAttribute('aria-pressed',String(active));
 $('hover-tip').hidden=true;
 if(!active){setExpandedPanel('none');requestAnimationFrame(()=>{window.scrollTo(pageScroll.x,pageScroll.y);$('fullscreen').focus({preventScroll:true});});}
 requestAnimationFrame(()=>{scene?.resize();drawChart();});
}
async function enterExpanded(){
 pageScroll={x:window.scrollX,y:window.scrollY};setExpandedPanel('none');applyExpanded(true);
 // A viewport-filling layout also works in browsers that do not expose fullscreen.
 try{if(workspace.requestFullscreen)await workspace.requestFullscreen();}catch{ /* Keep the usable expanded layout. */ }
}
async function exitExpanded(){
 if(document.fullscreenElement===workspace){try{await document.exitFullscreen();}catch{}}
 if(expanded)applyExpanded(false);
 nativeExpanded=false;
}
$('fullscreen').addEventListener('click',()=>{if(expanded)exitExpanded();else enterExpanded();});
document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement===workspace){nativeExpanded=true;}else if(nativeExpanded){nativeExpanded=false;applyExpanded(false);}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&expanded&&!document.querySelector('dialog[open]')){event.preventDefault();exitExpanded();}});
document.querySelectorAll('[data-expanded-panel]').forEach(b=>b.addEventListener('click',()=>setExpandedPanel(expandedPanel===b.dataset.expandedPanel?'none':b.dataset.expandedPanel)));
$('expanded-building').addEventListener('change',event=>switchBuilding(event.target.value));
$('expanded-guide').addEventListener('click',()=>$('lesson-open').click());
$('expanded-about').addEventListener('click',()=>$('about-open').click());
$('chart-mode').addEventListener('click',()=>{chartDollars=!chartDollars;$('chart-mode').textContent=chartDollars?'Show percentages':'Show dollars';$('chart-unit').textContent=chartDollars?'Illustrative loss ($)':'% of category value';drawChart();});
function stopPlay(){playing=false;$('play').setAttribute('aria-pressed','false');$('play').innerHTML='▶ <span>Raise water</span>';}
function animate(ts){if(!playing)return;if(!animationLast)animationLast=ts;const dt=Math.min((ts-animationLast)/1000,.08);animationLast=ts;setWaterFt(waterM/FT+dt*.6);if(waterM/FT>=config.maxFt){stopPlay();return;}requestAnimationFrame(animate);}
$('play').addEventListener('click',()=>{if(playing)stopPlay();else{if(waterM/FT>=config.maxFt)setWaterFt(0,false);playing=true;animationLast=0;$('play').setAttribute('aria-pressed','true');$('play').innerHTML='Ⅱ <span>Pause flood</span>';requestAnimationFrame(animate);}});
const showAbout=()=>{stopPlay();$('about').showModal();};$('about-open').addEventListener('click',showAbout);$('assumptions').addEventListener('click',showAbout);
document.querySelectorAll('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
const lessons=[
 {title:'Can damage start below the floor?',text:'We’ll open the one-story house with no floodwater and select the equipment under its floor.',steps:['Click “Set up this experiment,” then slowly move the water slider from 0 to 3 ft above ground.','Watch the cost of damage to the equipment under the floor. The rooms are still above the water.','Choose “1 ft inside” to bring the water into the rooms, then check the furniture and appliances.'],takeaway:'The house floor is about 3.3 ft above ground. Equipment underneath it can be damaged before the rooms get wet.',reminder:'Move the slider from 0 to 3 ft. Watch the equipment under the floor, then try “1 ft inside.”',apply:()=>{switchBuilding('house1');setWaterFt(0);setCategory('building');selectItem('duct');}},
 {title:'Why does the stove get hit first?',text:'We’ll put 2 ft of water inside the one-story house. That means 2 ft above the room’s floor, not above the ground outside.',steps:['Click “Set up this experiment.” The countertop microwave will be selected. Check its damage cost.','Select “Stove / range” in the item list. Compare its damage percentage and cost with the microwave’s.','Try “6 ft inside,” then check the microwave again. In enlarged view, use “Damage & curves” for the list and “Selected item” for the calculation.'],takeaway:'The microwave starts higher up. The stove’s low electrical parts can be damaged while the microwave is still dry.',reminder:'Compare the microwave with the stove in the item list. Then try “6 ft inside.”',apply:()=>{switchBuilding('house1');setWaterFt(config.ffe/FT+2);selectItem('microwave');}},
 {title:'Lift the clinic machine. Lower the cost.',text:'We’ll open the clinic with water 1 ft above its floor and select the medical imaging machine. Its made-up replacement value is $180,000.',steps:['Click “Set up this experiment.” Read the selected machine’s damage cost: $162,000 in this example.','Click “Raise item 2 ft.” This puts the machine on a pretend platform, two feet higher. Keep the water at the same level.','Compare the new damage cost with the old one. Check the “Contents” total too: that adds up damage to all the equipment and furniture.'],takeaway:'In this example, raising the machine reduces its damage cost from $162,000 to $0. Other wet items still have costs. The platform’s cost is not included.',reminder:'Click “Raise item 2 ft.” Compare the machine’s damage cost before and after, without changing the water.',apply:()=>{switchBuilding('clinic');setWaterFt(config.ffe/FT+1);selectItem('imaging');}},
 {title:'What stays dry upstairs?',text:'We’ll open the two-story house with 3 ft of water above the downstairs floor and select the upstairs bed.',steps:['Click “Set up this experiment.” Check the upstairs bed’s damage cost. It starts at $0.','Use the floor menu to view “Ground floor,” then “Upper floor.” Compare the wet downstairs rooms with the dry upstairs room.','Keep the upper floor visible and slowly raise the water slider. Watch when the upstairs bed’s damage cost starts to rise.'],takeaway:'Water in the downstairs rooms does not mean everything upstairs is damaged. Each item’s height changes when water can reach it.',reminder:'Compare the two floors. Then raise the water and watch when the upstairs bed starts to show damage.',apply:()=>{switchBuilding('house2');setWaterFt(config.ffe/FT+3);$('floor-view').value='upper';scene?.setFloor('upper');selectItem('upper-bed');}}
];
function renderLesson(){const l=lessons[lessonIndex];$('lesson-number').textContent=String(lessonIndex+1).padStart(2,'0');$('lesson-counter').textContent=String(lessonIndex+1).padStart(2,'0')+' / 04';$('lesson-title').textContent=l.title;$('lesson-text').textContent=l.text;$('lesson-steps').replaceChildren(...l.steps.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));$('lesson-takeaway').textContent=l.takeaway;$('lesson-next').textContent=lessonIndex===3?'First experiment ↺':'Next experiment →';}
$('lesson-open').addEventListener('click',()=>{stopPlay();renderLesson();$('lesson').showModal();});
$('lesson-next').addEventListener('click',()=>{lessonIndex=(lessonIndex+1)%lessons.length;renderLesson();});
$('lesson-apply').addEventListener('click',()=>{const l=lessons[lessonIndex];l.apply();activeLesson=lessonIndex;$('coach-title').textContent='Experiment '+(lessonIndex+1)+' / '+l.title;$('coach-text').textContent=l.reminder;lessonCoach.hidden=false;$('lesson').close();if(expanded)setExpandedPanel(lessonIndex===0?'loss':'item');else lessonCoach.scrollIntoView({block:'center',behavior:'smooth'});toast('Experiment ready. Follow the steps below.');});
$('coach-steps').addEventListener('click',()=>{if(activeLesson!==null)lessonIndex=activeLesson;$('lesson-open').click();});
$('coach-close').addEventListener('click',()=>{lessonCoach.hidden=true;$('depth').focus({preventScroll:true});});

const experimentGate=new ExperimentGate();
const experimentNames={buildings:'Building economic losses',roads:'Road network economic losses',accessibility:'Flood & accessibility'};
const moduleLinks={buildings:'building-module-link',roads:'road-module-link',accessibility:'access-module-link'};
let moduleNavigation=0;
const requestedModule=()=>location.hash==='#buildings'?'buildings':location.hash==='#roads'?'roads':location.hash==='#accessibility'?'accessibility':'home';
function renderModule(route){
 document.body.dataset.module=route;
 $('lab-welcome').hidden=route!=='home';$('building-module').hidden=route!=='buildings';$('road-module').hidden=route!=='roads';$('access-module').hidden=route!=='accessibility';$('hub-footer').hidden=route==='buildings';document.querySelector('.top-actions').hidden=route!=='buildings';
 for(const [id,value]of [['building-module-link','buildings'],['road-module-link','roads'],['access-module-link','accessibility']]){if(route===value)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current');}
 document.title=(route==='home'?'':route==='buildings'?'Building losses | ':route==='roads'?'Road network losses | ':'Flood accessibility | ')+ 'Mo’s Virtual FloodLab';
}
async function showModule(){
 const request=++moduleNavigation,route=requestedModule();
 experimentGate.cancel();stopPlay();
 document.querySelectorAll('dialog[open]').forEach(d=>d.close());
 const exits=[];
 if(expanded)exits.push(exitExpanded());
 if(roadLab?.expanded)exits.push(roadLab.expand(false));
 if(accessibilityLab?.expanded)exits.push(accessibilityLab.expand(false));
 renderModule('home');
 await Promise.allSettled(exits);
 if(request!==moduleNavigation)return;
 roadLab?.hide();accessibilityLab?.hide();
 window.scrollTo(0,0);
 if(route==='home')return;
 const acknowledged=await experimentGate.request(experimentNames[route]);
 if(request!==moduleNavigation||route!==requestedModule())return;
 if(!acknowledged){
  history.replaceState(null,'','#home');
  $(moduleLinks[route]).focus({preventScroll:true});
  return;
 }
 renderModule(route);
 if(route==='buildings'){initializeScene();requestAnimationFrame(()=>{scene?.resize();drawChart();});}
 if(route==='roads'){roadLab??=new RoadLab($('road-lab'));roadLab.show();}
 if(route==='accessibility'){accessibilityLab??=new AccessibilityLab($('access-lab'));accessibilityLab.show();}
 const heading=$(route==='buildings'?'building-module':route==='roads'?'road-module':'access-module').querySelector('h1');
 if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
}
window.addEventListener('hashchange',showModule);
new ResizeObserver(drawChart).observe($('chart-container'));
$('floor-view').hidden=true;$('floor-datum').textContent='First floor · '+(config.ffe/FT).toFixed(1)+' ft';buildReceipt();update();
showModule();
// Read-only state for transparent inspection and automated acceptance checks.
window.floodLab={getState:()=>({building:config.id,waterFt:waterM/FT,firstFloorFt:config.ffe/FT,insideFt:(waterM-config.ffe)/FT,selected,category,totals:evaluate(items,waterM),items:items.map(i=>({id:i.id,group:i.group,value:i.value,level:i.level,elevated:i.elevated,damage:fractionAt(i,waterM)})),threeReady:!!scene})};
