import {GUIDES,GUIDE_VERSION} from '../src/guide-content.js?v=20260928-intro2';
const durations={buildings:'1 minute',roads:'1 minute',accessibility:'1 minute',hh:'1 minute'};
const names={buildings:'Building economic losses',roads:'Road network economic losses',accessibility:'Flood & accessibility',hh:'Hydrologic & hydraulic modeling'};
Object.entries(GUIDES).forEach(([key,data],i)=>{
 const card=document.createElement('article');card.id=key;
 const top=document.createElement('div');top.className='card-top';
 const number=document.createElement('span');number.className='number';number.textContent=String(i+1).padStart(2,'0');
 const title=document.createElement('h2');title.textContent=names[key];const duration=document.createElement('span');duration.className='duration';duration.textContent=durations[key];top.append(number,title,duration);
 const goal=document.createElement('p');goal.textContent=data.goal;
 const video=document.createElement('video');video.controls=true;video.preload='none';video.playsInline=true;video.poster=`./media/${key}.jpg?v=${GUIDE_VERSION}`;video.src=`./media/${key}.mp4?v=${GUIDE_VERSION}`;video.setAttribute('aria-label',names[key]+' module introduction');
 video.addEventListener('play',()=>document.querySelectorAll('video').forEach(v=>{if(v!==video)v.pause();}));
 const track=document.createElement('track');track.kind='captions';track.srclang='en';track.label='English (also shown in video)';track.src=`./media/${key}.vtt?v=${GUIDE_VERSION}`;video.append(track);
 const links=document.createElement('div');links.className='links';const open=document.createElement('a');open.className='open';open.href=key==='hh'?'../hh-modeling/':`../#${key}`;open.textContent='Try this experiment ↗';const download=document.createElement('a');download.href=`./media/${key}.mp4?v=${GUIDE_VERSION}`;download.download=`HIST-430-${key}-introduction.mp4`;download.textContent='Download video';links.append(open,download);
 const transcript=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Read the transcript';transcript.append(summary);data.narration.forEach(t=>{const p=document.createElement('p');p.textContent=t;transcript.append(p);});
 card.append(top,goal,video,links,transcript);document.getElementById('guide-library').append(card);
});
