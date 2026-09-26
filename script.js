document.getElementById("year").textContent = new Date().getFullYear();

const header = document.querySelector(".site-header");

window.addEventListener("scroll", () => {
  const current = window.scrollY;
  header.dataset.compact = current > 24 ? "true" : "false";
  header.style.boxShadow = current > 24 ? "0 10px 28px rgba(23, 32, 38, 0.08)" : "none";
});

const resourceTabs=[...document.querySelectorAll('.resource-tabs [role="tab"]')];
function chooseResourceTab(tab,focus=false){
  for(const item of resourceTabs){const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;document.getElementById(item.getAttribute('aria-controls')).hidden=!active;}
  if(focus)tab.focus();
}
resourceTabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>chooseResourceTab(tab));
  tab.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?resourceTabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+resourceTabs.length)%resourceTabs.length;
    chooseResourceTab(resourceTabs[next],true);
  });
});
function resourceAnchor(){
  if(location.hash==='#interactive-modules')chooseResourceTab(document.getElementById('modules-tab'));
  if(location.hash==='#classes')chooseResourceTab(document.getElementById('classes-tab'));
  if(['#teaching','#interactive-modules','#classes'].includes(location.hash))document.getElementById('learning-resources').scrollIntoView({behavior:'instant',block:'start'});
}
window.addEventListener('hashchange',resourceAnchor);
window.addEventListener('load',()=>requestAnimationFrame(resourceAnchor),{once:true});
resourceAnchor();
