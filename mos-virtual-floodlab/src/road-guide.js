import {analyzeFlood,FT} from './road-model.js';

const cash=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const lessons=[
 {short:'Run a flood',title:'First, give Riverbend a 4 ft flood.',intro:'Start with a prediction: which streets will get wet, and which will stay dry?',steps:['Run the example below. A storm sends residents to dry high ground before the streams rise.','Watch the water spread out from the streams, then drain away.','Look for the red road pieces left behind. They still need cleanup or repair.'],notice:'The water leaves quickly on screen, but the repair work remains. Red does not mean a road has collapsed.',setup:'Starts a fresh 4 ft flood with 2 crews and resets the repair timeline. The short animation represents an assumed 24-hour flood.',action:'Run a 4 ft flood ↗',reminder:'Watch the storm clear, then find the red roads that remain after the water drains.'},
 {short:'High vs. low',title:'Same flood. Different road heights.',intro:'“4 ft” means 4 ft above the stream banks. It is not the depth on every road.',steps:['Show the flooded road below. Read its surface height and the water depth over that piece.','Use “Compare a dry road” in the reminder to jump to a high bridge deck.','Switch between the two. The blue overlay shows the same peak water level in both places.'],notice:'A low road connected to the stream gets wet. A higher road can stay dry. A low spot behind higher ground can also stay dry until water finds a way in.',setup:'Loads the 4 ft flood result at day 0 with 2 crews, then shows peak water for comparison.',action:'Show a flooded road ↗',reminder:'Compare the selected road’s height with the 4 ft water level. Then jump to the dry bridge.'},
 {short:'The repair bill',title:'How does one wet piece become a bill?',intro:'Each small road piece has a replacement value. Its water depth decides what fraction of that value becomes a repair cost.',steps:['Inspect the selected 10 m × 10 m piece. Its assumed replacement value is $25,000.','Multiply $25,000 by its damage percentage to get that piece’s cost. The calculation uses the unrounded percentage.','Read the section bill below it, then the town total above. Each adds up its flooded pieces once; dry pieces add $0.'],notice:'Open the damage curve to see the link between local water depth and repair cost. A small damage percentage can mean cleanup and surface repairs, without replacing the whole road.',setup:'Loads the 4 ft result at day 0 with 2 crews and selects a flooded road piece. All dollar values and curve points are teaching assumptions.',action:'Inspect a road’s repair bill ↗',reminder:'Follow the bill from one piece → its street section → the town. Open the curve to see where the percentage comes from.'},
 {short:'Crew challenge',title:'Can more crews beat the clock?',intro:'Keep the flood exactly the same. Change only how many crews can work at once.',steps:['Start with one crew below. Note the town’s repair bill and “All work finished” day.','Use “Try 4 crews” in the reminder, then compare the finish day.','Open Curves to see the recovery line change. The damage curve and original bill stay the same.'],notice:'More crews share the jobs and shorten the queue. They do not undo the flood damage. Every plan also includes one shared day for inspection before repairs start.',setup:'Loads the 4 ft result at day 0 with 1 crew. The comparison changes the schedule, not the flood or repair quantities.',action:'Try one repair crew ↗',reminder:'Record the finish day with one crew. Try four crews and compare—does the original repair bill change?'},
 {short:'Town recovery',title:'Watch the streets come back to life.',intro:'Now turn the repair schedule into a story: crews arrive, roads reopen in the model, and residents return.',steps:['Play recovery below. Read the day counter as crews work on red street sections.','Use “Find a crew” to pause at a job and zoom in. Press Play recovery to continue.','Watch completed sections turn green. Residents return when connected dry or repaired routes are available.'],notice:'The timeline moves through days, not seconds. Drag it backward to revisit earlier work. The event bill stays recorded even when every repair is finished.',setup:'Loads the 4 ft result at day 0 with 2 crews and starts playback. People and crews are illustrations, not real evacuation or road-safety predictions.',action:'Play recovery ↗',reminder:'Red = work remains. Green = work finished. Watch residents return along open routes; scrub the timeline to compare days.'},
 {short:'Make a prediction',title:'What changes with a 6 ft flood?',intro:'Before you run it, predict what happens to the wet road length, repair bill and time needed.',steps:['Compare the 4 ft and 6 ft examples below. Both use the same two crews and work rates.','Run the 6 ft flood. Look for newly flooded roads and deeper water over roads that were already low.','Inspect a road and replay recovery. Explain why the larger flood costs more and takes longer in this model.'],notice:'A larger flood can affect more road pieces and increase the repair fraction on pieces already flooded. Depth, cost and time are linked, but they are not the same quantity.',setup:'Starts a fresh 6 ft flood with 2 crews and resets the repair timeline. These are comparisons within this teaching model, not town forecasts.',action:'Run a 6 ft flood ↗',reminder:'Compare this event with the 4 ft example. Which changed: the number of wet pieces, their damage percentages, or both?'}
];

export class RoadGuide{
 constructor(lab){
  this.lab=lab;this.index=0;this.active=null;const $=lab.$;
  $('road-workspace').insertAdjacentHTML('beforeend',`<dialog id="road-guide" aria-labelledby="road-guide-title"><div class="dialog-header"><span class="eyebrow">RIVERBEND / GUIDED EXPERIMENT</span><button id="road-guide-close" class="close-dialog" aria-label="Close road guide">×</button></div><nav class="road-guide-nav" aria-label="Road guide steps">${lessons.map((l,i)=>`<button data-road-lesson="${i}"><span>${i+1}</span>${l.short}</button>`).join('')}</nav><span id="road-guide-count" class="eyebrow"></span><h2 id="road-guide-title" tabindex="-1"></h2><p id="road-guide-intro"></p><ol id="road-guide-instructions"></ol><div class="road-guide-notice"><strong>What to notice</strong><p id="road-guide-notice"></p></div><div id="road-guide-comparison" hidden></div><p id="road-guide-setup" class="road-guide-setup"></p><div class="road-guide-actions"><button id="road-guide-apply" class="primary-button"></button><div><button id="road-guide-back">← Back</button><button id="road-guide-next">Next topic →</button></div></div></dialog>`);
  lab.host.querySelector('.road-map-tools').insertAdjacentHTML('afterend',`<section id="road-guide-coach" class="road-guide-coach" aria-label="Current road guide step" hidden><div><span id="road-coach-count" class="eyebrow"></span><strong id="road-coach-title"></strong><p id="road-coach-reminder"></p><p id="road-coach-result"></p></div><div class="road-coach-actions"><button id="road-coach-try" hidden></button><button id="road-coach-steps">Steps</button><button id="road-coach-next">Next step →</button></div><button id="road-coach-hide" aria-label="Hide guide reminder">×</button></section>`);
  this.dialog=$('road-guide');this.start=document.getElementById('road-guide-start');
  if(this.start)this.start.onclick=()=>this.open();$('road-guide-toolbar').onclick=()=>this.open();
  $('road-guide-close').onclick=()=>this.dialog.close();
  this.dialog.querySelectorAll('[data-road-lesson]').forEach(b=>b.onclick=()=>this.open(+b.dataset.roadLesson));
  $('road-guide-back').onclick=()=>this.open(this.index-1);$('road-guide-next').onclick=()=>this.open(this.index+1);$('road-guide-apply').onclick=()=>this.apply();
  $('road-coach-steps').onclick=()=>this.open(this.active);$('road-coach-hide').onclick=()=>this.dismiss();
  $('road-coach-next').onclick=()=>{if(this.active===lessons.length-1){this.dismiss();lab.announce('Guide finished. Keep exploring your own flood and crew combinations.');$('road-guide-toolbar').focus();}else this.open(this.active+1);};
  $('road-coach-try').onclick=()=>this.tryComparison();
 }
 open(index=this.active??this.index){
  if(this.lab.running)return;this.lab.stopRepair();this.index=Math.max(0,Math.min(lessons.length-1,index));const l=lessons[this.index],$=this.lab.$;
  this.dialog.querySelectorAll('[data-road-lesson]').forEach(b=>{if(+b.dataset.roadLesson===this.index)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  $('road-guide-count').textContent=`STEP ${this.index+1} OF ${lessons.length}`;$('road-guide-title').textContent=l.title;$('road-guide-intro').textContent=l.intro;
  $('road-guide-instructions').replaceChildren(...l.steps.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  $('road-guide-notice').textContent=l.notice;$('road-guide-setup').textContent=l.setup;$('road-guide-apply').textContent=l.action;
  $('road-guide-back').disabled=this.index===0;$('road-guide-next').hidden=this.index===lessons.length-1;
  const compare=$('road-guide-comparison');compare.hidden=this.index!==5;
  if(this.index===5)compare.innerHTML=`<table><caption>Same town · same 2 crews</caption><thead><tr><th>Peak</th><th>Wet roads</th><th>Repair bill</th><th>Finish day</th></tr></thead><tbody>${[4,6].map(peak=>{const e=analyzeFlood(this.lab.city,peak,2);return `<tr><th>${peak} ft</th><td>${(e.wetLength/1000).toFixed(2)} km</td><td>${cash(e.cost)}</td><td>${e.end.toFixed(1)}</td></tr>`;}).join('')}</tbody></table>`;
  if(!this.dialog.open)this.dialog.showModal();this.dialog.scrollTop=0;$('road-guide-title').focus({preventScroll:true});
 }
 prepareResult(crews=2){
  const lab=this.lab;lab.stopRepair();lab.day=0;lab.crews=crews;lab.$('road-crews').value=crews;lab.setPeak(4);lab.prepareEvent(4);
  lab.$('road-peek').checked=false;lab.scene?.beginEvacuation(4);lab.scene?.evacuate(1);lab.setWater(0,'WATER DRAINED / WORK REMAINS');lab.lock(false);lab.update();
 }
 inspect(cell){this.lab.select(cell.group,cell.id);this.lab.scene?.focus(cell);this.revealPanel('inspect');}
 wetRoad(){return [...this.lab.city.roads].sort((a,b)=>this.lab.event.damage.get(b.id).depth-this.lab.event.damage.get(a.id).depth)[0];}
 revealPanel(panel){
  const lab=this.lab;lab.panel(panel);lab.host.querySelector('.road-sidebar').scrollTop=0;
  if(matchMedia('(max-width:900px)').matches){if(lab.expanded)lab.info(true);else lab.host.querySelector('.road-sidebar').scrollIntoView({block:'start'});}
 }
 apply(){
  if(this.lab.running)return;const lab=this.lab,index=this.index;this.dialog.close();this.dismiss();
  if(index===0||index===5){lab.reset();lab.crews=2;lab.$('road-crews').value=2;lab.setPeak(index===0?4:6);lab.scene?.home();if(lab.expanded)lab.info(false);lab.startFlood();}
  else{
   this.prepareResult(index===3?1:2);
   if(index===1){lab.$('road-peek').checked=true;lab.setWater(4*FT,'PEAK WATER / INSPECTION OVERLAY');lab.update();this.inspect(this.wetRoad());}
   if(index===2)this.inspect(this.wetRoad());
   if(index===3){lab.scene?.home();this.revealPanel('curves');}
   if(index===4){lab.scene?.home();if(lab.expanded)lab.info(false);lab.playRepair();}
  }
  this.active=index;const $=lab.$,l=lessons[index];$('road-guide-coach').hidden=false;$('road-coach-count').textContent=`GUIDE / ${index+1} OF ${lessons.length}`;$('road-coach-title').textContent=l.short;$('road-coach-reminder').textContent=l.reminder;$('road-coach-next').textContent=index===lessons.length-1?'Finish guide ✓':'Next step →';this.refresh();
  if(!lab.expanded&&(index===0||index===4||index===5))$('road-guide-coach').scrollIntoView({block:'start'});
  // Move focus out of the closed dialog without shifting the map or mobile information panel.
  $('road-coach-hide').focus({preventScroll:true});lab.announce(`Guide step ${index+1}: ${l.reminder}`);
 }
 tryComparison(){
  const lab=this.lab;if(lab.running)return;
  if(this.active===1){const hit=lab.event.damage.get(lab.spot);this.inspect(hit?.depth>0?lab.city.roads.find(c=>c.bridge&&lab.event.damage.get(c.id).depth===0):this.wetRoad());}
  if(this.active===2)this.revealPanel(lab.$('road-panel-curves').hidden?'curves':'inspect');
  if(this.active===3){lab.crews=lab.crews===4?1:4;lab.$('road-crews').value=lab.crews;lab.stopRepair();lab.day=0;lab.prepareEvent(lab.event.peakFt);lab.update();this.revealPanel('curves');}
  if(this.active===4)lab.watchCrew();this.refresh();
 }
 refresh(){
  const lab=this.lab,$=lab.$;if(this.start)this.start.disabled=lab.running;$('road-guide-toolbar').disabled=lab.running;
  if(this.active===null)return;
  ['road-coach-steps','road-coach-next','road-coach-try'].forEach(id=>$(id).disabled=lab.running);
  const button=$('road-coach-try'),hit=lab.event?.damage.get(lab.spot);button.hidden=![1,2,3,4].includes(this.active);
  button.textContent=this.active===1?(hit?.depth>0?'Compare a dry road ↗':'Compare a flooded road ↗'):this.active===2?(lab.$('road-panel-curves').hidden?'Open damage curve ↗':'Return to repair bill ↗'):this.active===3?(lab.crews===4?'Try 1 crew ↗':'Try 4 crews ↗'):'Find a crew ↗';
  const result=$('road-coach-result');result.textContent=this.active===1&&hit?`Selected piece: ${(lab.city.cells[lab.spot].deck/FT).toFixed(1)} ft above banks · ${(hit.depth/FT).toFixed(2)} ft of water over the road.`:this.active===3&&lab.event?`${lab.crews} ${lab.crews===1?'crew':'crews'} · ${cash(lab.event.cost)} original bill · all work finished by day ${lab.event.end.toFixed(1)}.`:'';result.hidden=!result.textContent;
 }
 dismiss(){this.active=null;this.lab.$('road-guide-coach').hidden=true;}
}
