// A fresh, explicit acknowledgement is required for each experiment entry.
// No acceptance record, cookie or personal information is collected.
export class ExperimentGate{
 constructor(){
  this.dialog=document.createElement('dialog');
  this.dialog.id='experiment-disclaimer';
  this.dialog.setAttribute('aria-labelledby','disclaimer-title');
  this.dialog.setAttribute('aria-describedby','disclaimer-purpose');
  this.dialog.innerHTML=`<div class="disclaimer-heading"><span class="eyebrow">BEFORE YOU EXPLORE</span><span id="disclaimer-experiment"></span><h2 id="disclaimer-title" tabindex="-1" autofocus>Research & educational use only</h2></div>
   <div class="disclaimer-copy"><p id="disclaimer-purpose"><strong>Mo’s Virtual FloodLab is a research and teaching product.</strong> Its numbers, maps, simulations, routes, damage estimates and recovery times are illustrative examples based on simplified models and assumptions. They may contain errors and <strong>do not necessarily represent actual or current real-world conditions or predict future outcomes.</strong></p>
   <h3>Do not use for real-world decisions</h3><p>This product does not establish that any road, building or location is safe. Do not rely on it for navigation, evacuation, emergency response, engineering design, insurance, regulatory decisions or other decisions involving safety, property or finances. Use official information and appropriately qualified professional advice for those purposes.</p>
   <h3>No warranties; limitation of liability</h3><p>The product is provided “as is” and “as available,” without express or implied warranties, including accuracy, completeness, merchantability or fitness for a particular purpose. To the fullest extent permitted by applicable law, its creators, contributors and affiliated institutions disclaim liability for losses or damages arising from use of, or reliance on, this product. This notice does not exclude liability that cannot lawfully be excluded.</p>
   <p class="disclaimer-understanding">By selecting <strong>Acknowledge</strong>, you confirm that you have read and understood this research-use notice. Otherwise, select <strong>Leave</strong>.</p></div>
   <div class="disclaimer-actions"><button id="disclaimer-leave" type="button">Leave</button><button id="disclaimer-acknowledge" class="primary-button" type="button">Acknowledge</button></div>`;
  document.body.append(this.dialog);
  this.dialog.querySelector('#disclaimer-acknowledge').onclick=()=>this.finish(true);
  this.dialog.querySelector('#disclaimer-leave').onclick=()=>this.finish(false);
  this.dialog.addEventListener('cancel',event=>{event.preventDefault();this.finish(false);});
  // An unexpected close is never acceptance. A queued close from an earlier
  // entry must not cancel a new notice that is already open.
  this.dialog.addEventListener('close',()=>{if(!this.dialog.open)this.finish(false);});
 }
 request(name){
  this.cancel();
  this.dialog.querySelector('#disclaimer-experiment').textContent=name;
  this.dialog.scrollTop=0;
  return new Promise(resolve=>{
   this.pending=resolve;document.body.classList.add('disclaimer-open');
   this.dialog.showModal();this.dialog.querySelector('#disclaimer-title').focus({preventScroll:true});
  });
 }
 finish(accepted){
  const resolve=this.pending;this.pending=null;
  if(this.dialog.open)this.dialog.close();
  document.body.classList.remove('disclaimer-open');
  resolve?.(accepted===true);
 }
 cancel(){this.finish(false);}
}
