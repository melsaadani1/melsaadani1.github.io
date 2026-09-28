import {GUIDES,GUIDE_VERSION} from './guide-content.js?v=20260928-intro2';
const MEDIA=new URL('../guides/media/',import.meta.url);
const mediaFile=(name)=>new URL(name+'?v='+GUIDE_VERSION,MEDIA).href;
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
const button=(text,fn,cls)=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
let active;
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&active&&!document.querySelector('dialog[open]')){event.preventDefault();event.stopImmediatePropagation();active.close();}},true);
export class StudentGuide {
 constructor(key,{mount,entry,before,prepare,extra,extraLabel,follow}={}){
  this.key=key;this.data=GUIDES[key];this.mount=mount;this.prepare=prepare;this.extra=extra;this.follow=follow;this.index=0;
  this.entry=el('section','learn-entry');this.entry.setAttribute('aria-label','Experiment guide');
  const intro=el('div');intro.append(el('strong','',this.data.title),el('p','',`${this.data.time} · ${this.data.goal}`));
  const actions=el('div','learn-actions');this.launch=button('Step-by-step guide',()=>this.open());actions.append(this.launch,button('▶ One-minute introduction',()=>this.watch()));this.entry.append(intro,actions);
  if(before)entry.insertBefore(this.entry,before);else entry.append(this.entry);
  this.panel=el('section','learn-panel');this.panel.hidden=true;this.panel.setAttribute('aria-label','Step-by-step experiment guide');this.panel.innerHTML='<div class="learn-top"><span></span></div><div class="learn-progress" aria-hidden="true"></div><div class="learn-body"><h2 tabindex="-1"></h2><p class="learn-action"></p><div class="learn-notice"><strong>What to notice</strong><p></p></div><p class="learn-question"></p><p class="learn-wait" role="status"></p></div><div class="learn-navigation"></div><div class="learn-foot"></div>';
  this.panel.querySelector('.learn-body').tabIndex=0;this.panel.querySelector('.learn-body').setAttribute('aria-label','Guide instructions');
  this.panel.querySelector('.learn-top').append(button('−',()=>this.minimize(), 'learn-minimize'),button('×',()=>this.close(),'learn-close'));
  this.panel.querySelector('.learn-minimize').setAttribute('aria-label','Minimize guide');this.panel.querySelector('.learn-close').setAttribute('aria-label','Close guide');
  this.cues=el('div','learn-cues');this.cues.setAttribute('aria-label','Locate a control');this.panel.querySelector('.learn-navigation').append(this.cues);
  this.nav=el('div','learn-nav');this.back=button('← Back',()=>this.move(-1));this.next=button('Next →',()=>this.move(1),'learn-primary');this.nav.append(this.back,this.next);this.panel.querySelector('.learn-navigation').append(this.nav);
  this.panel.querySelector('.learn-foot').append(button('▶ Module introduction',()=>this.watch()),button(follow?'Back to lesson':'Restart guide',()=>{if(follow){this.close();return;}this.clearTarget();this.index=0;this.render();}));
  if(extra){this.panel.querySelector('.learn-foot').append(button(extraLabel||'More challenges',()=>{this.close(false);extra();}));}
  mount.append(this.panel);
  this.pointer=el('div','learn-pointer');this.pointer.hidden=true;this.pointer.setAttribute('aria-hidden','true');
  this.pointer.innerHTML='<span class="learn-click-ring"></span><svg width="34" height="43" viewBox="0 0 34 43"><path d="M3 2 L29 25 L18 26 L25 38 L18 42 L11 29 L3 36 Z" fill="#fffdf6" stroke="#315649" stroke-width="2.5" stroke-linejoin="round"/></svg><span class="learn-pointer-label"></span>';
  mount.append(this.pointer);
  // This is an illustrative pointer. It never moves the real mouse or clicks for the student.
  document.addEventListener('click',e=>{if(this.target?.contains(e.target)){this.pointer.hidden=true;this.target.classList.remove('learn-target');}},true);
  document.addEventListener('scroll',()=>{if(this.target&&!this.pointer.hidden){this.position();this.placePointer(false);}},true);
  this.panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();this.close();}});
  this.dialog=el('dialog','learn-video');this.dialog.setAttribute('aria-labelledby',`learn-video-${key}`);const head=el('header');const title=el('h2','',this.data.title);title.id=`learn-video-${key}`;const close=button('×',()=>this.dialog.close());close.setAttribute('aria-label','Close video guide');head.append(title,close);
  this.video=document.createElement('video');this.video.controls=true;this.video.preload='none';this.video.playsInline=true;this.video.poster=mediaFile(key+'.jpg');this.video.setAttribute('aria-label',this.data.title+' module introduction');
  const track=el('track');track.kind='captions';track.srclang='en';track.label='English (also shown in video)';track.src=mediaFile(key+'.vtt');this.video.append(track);
  const transcript=el('details');transcript.append(el('summary','','Read the transcript'));const list=el('ol');this.data.narration.forEach(t=>list.append(el('li','',t)));transcript.append(list);
  const download=el('a','','Download video');download.href=mediaFile(key+'.mp4');download.download=key+'-introduction.mp4';
  this.dialog.append(head,this.video,el('p','learn-media-note','One minute on what you will learn and the features you can explore. Use the step-by-step guide to locate individual controls.'),download,transcript);mount.append(this.dialog);
  this.dialog.addEventListener('close',()=>{this.video.pause();this.returnFocus?.focus({preventScroll:true});});
  document.addEventListener('fullscreenchange',()=>{if(!this.panel.hidden)this.position();});
  window.addEventListener('resize',()=>{if(!this.panel.hidden){this.position();this.placePointer(false);}});
  if(follow)document.addEventListener('hh:step',()=>{this.index=follow();if(!this.panel.hidden){this.render();this.clearTarget();}});
 }
 open(){active?.close(false);active=this;this.returnFocus=document.activeElement;this.panel.hidden=false;this.panel.dataset.minimized='false';const minimize=this.panel.querySelector('.learn-minimize');minimize.textContent='−';minimize.setAttribute('aria-label','Minimize guide');if(this.follow)this.index=this.follow();this.render();this.position();this.panel.querySelector('h2').focus({preventScroll:true});}
 close(focus=true){this.panel.hidden=true;this.clearTarget();if(active===this)active=null;if(focus)(this.returnFocus?.isConnected&&this.returnFocus.getClientRects().length?this.returnFocus:this.launch)?.focus({preventScroll:true});}
 minimize(){const small=this.panel.dataset.minimized!=='true';this.panel.dataset.minimized=String(small);const b=this.panel.querySelector('.learn-minimize');b.textContent=small?'+':'−';b.setAttribute('aria-label',small?'Expand guide':'Minimize guide');this.position();}
 render(){const d=this.data,s=d.steps[this.index];this.panel.querySelector('.learn-top span').textContent=d.follow?'Guide · matches your lesson':`Your guide · ${this.index+1} / ${d.steps.length}`;this.panel.querySelector('h2').textContent=s.title;this.panel.querySelector('.learn-action').textContent=s.action;this.panel.querySelector('.learn-notice p').textContent=s.notice;const q=this.panel.querySelector('.learn-question');q.textContent=s.question||'';q.hidden=!s.question;this.panel.querySelector('.learn-progress').replaceChildren(...d.steps.map((_,i)=>el('span',i<=this.index?'active':'')));this.panel.querySelector('.learn-wait').textContent='';this.cues.replaceChildren(...s.cues.map(c=>button('↗ '+c.label,()=>this.showTarget(c),'learn-cue')));this.back.disabled=this.index===0;this.next.textContent=this.index===d.steps.length-1?'Finish guide ✓':'Next →';this.nav.hidden=!!d.follow;this.position();}
 move(delta){this.clearTarget();if(this.index+delta>=this.data.steps.length){this.close();return;}this.index=Math.max(0,this.index+delta);this.render();this.panel.querySelector('h2').focus({preventScroll:true});}
 clearTarget(){this.target?.classList.remove('learn-target');this.target=null;this.pointer.hidden=true;this.pointer.getAnimations().forEach(a=>a.cancel());this.locateId=(this.locateId||0)+1;}
 async showTarget(cue=this.data.steps[this.index].cues[0]){
  this.clearTarget();const id=this.locateId;this.activeCue=cue;const origin=document.activeElement?.getBoundingClientRect();
  const hint=this.prepare?.(this.index,cue);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));if(id!==this.locateId||this.panel.hidden)return;
  const target=[...document.querySelectorAll(cue.target)].find(t=>t.getClientRects().length&&!t.closest('[hidden],[inert]')&&getComputedStyle(t).visibility!=='hidden');
  const status=this.panel.querySelector('.learn-wait');if(!target||hint){status.textContent=hint||'Complete the preceding action first. This control will appear when it is ready.';return;}
  this.target=target;target.classList.add('learn-target');status.textContent=target.disabled?'This control is available after the preceding calculation or animation finishes.':cue.note||'Follow the pointer. The guide stays open while you use the control.';
  // Move the view, never collapse the instructions as a side effect of locating a control.
  target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});this.position();this.placePointer(true,origin);
 }
 position(){
  const p=this.panel;if(p.hidden)return;const margin=innerWidth<701?12:18;
  p.style.left=margin+'px';p.style.right='auto';p.style.bottom=margin+'px';p.style.top='auto';p.style.maxHeight='';
  const r=this.target?.getBoundingClientRect();if(!r)return;
  let w=p.offsetWidth,h=p.offsetHeight;
  const choices=()=>[{left:margin,top:innerHeight-h-margin},{left:innerWidth-w-margin,top:innerHeight-h-margin},{left:margin,top:margin},{left:innerWidth-w-margin,top:margin}];
  const overlap=c=>Math.max(0,Math.min(c.left+w,r.right+16)-Math.max(c.left,r.left-16))*Math.max(0,Math.min(c.top+h,r.bottom+20)-Math.max(c.top,r.top-20));
  let candidates=choices().sort((a,b)=>overlap(a)-overlap(b));
  if(overlap(candidates[0])>0&&p.dataset.minimized!=='true'){
   // Keep the card open; only its instructions scroll on a narrow screen.
   const space=Math.max(r.top-margin-24,innerHeight-r.bottom-margin-24);
   if(space>=230){p.style.maxHeight=Math.floor(Math.min(space,innerHeight-2*margin))+'px';h=p.offsetHeight;candidates=choices().sort((a,b)=>overlap(a)-overlap(b));}
  }
  p.style.left=Math.max(margin,candidates[0].left)+'px';p.style.top=Math.max(margin,candidates[0].top)+'px';p.style.bottom='auto';
 }
 placePointer(animate=false,origin){
  if(!this.target||this.panel.hidden)return;const r=this.target.getBoundingClientRect();
  if(r.bottom<0||r.top>innerHeight){this.pointer.hidden=true;return;}
  const x=Math.max(14,Math.min(innerWidth-52,r.left+Math.min(r.width*.7,r.width-10))),y=Math.max(14,Math.min(innerHeight-65,r.top+Math.min(r.height*.55,28)));
  this.pointer.hidden=false;this.pointer.style.left=x+'px';this.pointer.style.top=y+'px';this.pointer.querySelector('.learn-pointer-label').textContent=this.activeCue?.pointer===false?'Look here':this.target.matches('input[type=range]')?'Drag here':'Click here';
  this.pointer.classList.toggle('label-left',x>innerWidth-150);
  if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const sx=(origin?.left||x-120)-x,sy=(origin?.top||y+80)-y;this.pointer.animate([{transform:`translate(${sx}px,${sy}px)`,opacity:0},{opacity:1,offset:.12},{transform:'translate(0,0)',opacity:1}],{duration:950,easing:'cubic-bezier(.22,.61,.36,1)'});}
 }
 watch(){this.returnFocus=document.activeElement;this.pointer.hidden=true;if(!this.video.getAttribute('src'))this.video.src=mediaFile(this.key+'.mp4');this.dialog.showModal();}
 toolbar(buttonElement){buttonElement.textContent='Guide';buttonElement.onclick=()=>this.open();buttonElement.setAttribute('aria-haspopup','false');}
}
export function closeStudentGuides(){active?.close(false);document.querySelectorAll('.learn-video[open]').forEach(d=>d.close());}
