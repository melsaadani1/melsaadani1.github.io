const player=document.getElementById('film-player');
const clock=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
fetch('./media/chapters.json').then(response=>{if(!response.ok)throw new Error('Chapters unavailable');return response.json();}).then(catalog=>{
  for(const [index,chapter] of catalog.chapters.entries()){
    const button=document.createElement('button');const number=document.createElement('span');const title=document.createElement('strong');const time=document.createElement('small');
    number.textContent=String(index+1).padStart(2,'0');title.textContent=chapter.title;time.textContent=clock(chapter.start);button.append(number,title,time);
    button.addEventListener('click',()=>{player.currentTime=chapter.start;player.play().catch(()=>{});player.scrollIntoView({behavior:'smooth',block:'center'});});document.getElementById('chapters').append(button);
  }
}).catch(()=>{document.getElementById('chapters').textContent='Use the video controls to explore the complete film.';});
