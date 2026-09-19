import * as THREE from 'three';
import {stormIntensity} from './road-life.js';

// Visual weather only. The event clock also drives evacuation and the water level.
export class RoadWeather{
 constructor(view){
  this.view=view;this.active=false;
  this.clearSky=new THREE.Color('#193941');this.stormSky=new THREE.Color('#152333');
  this.overlay=document.createElement('div');this.overlay.className='road-storm';this.overlay.hidden=true;this.overlay.setAttribute('aria-hidden','true');
  this.overlay.innerHTML=`<svg class="road-storm-clouds" viewBox="0 0 1000 240" preserveAspectRatio="none"><path fill="#162438" d="M0 0H1000V73Q940 103 875 78Q820 143 720 92Q653 133 586 88Q497 125 418 75Q349 114 281 78Q173 119 114 68Q47 102 0 70Z"/><path fill="#263449" opacity=".65" d="M0 0H1000V27Q911 58 847 33Q744 77 662 41Q564 85 472 36Q385 63 317 35Q237 64 162 27Q76 59 0 29Z"/></svg><svg class="road-storm-lightning" viewBox="0 0 1000 600" preserveAspectRatio="none"><path d="M235 25L210 77L233 71L196 139L204 104L181 113L211 59L195 64Z"/></svg>`;
  view.host.append(this.overlay);this.bolt=this.overlay.querySelector('.road-storm-lightning');
  this.drops=Array.from({length:850},(_,i)=>{
   const seed=(Math.sin(i*127.1+41)*43758.5453)%1;
   const cell=view.city.cells[(i*83+17)%view.city.cells.length];
   return {cell,x:cell.x+seed*.35,z:cell.z+seed*.25,phase:Math.abs(seed)*18,length:.6+Math.abs(seed)*.65};
  });
  this.positions=new Float32Array(this.drops.length*6);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));
  this.rain=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#aacbdc',transparent:true,opacity:.48,depthWrite:false}));
  this.rain.frustumCulled=false;this.rain.renderOrder=9;this.rain.visible=false;view.scene.add(this.rain);
 }
 set(elapsed){
  const amount=stormIntensity(elapsed);
  if(amount<=0){this.clear();return;}
  this.active=true;this.overlay.hidden=false;this.rain.visible=true;this.overlay.style.opacity=amount;
  // A few isolated, gentle lightning pulses; no repeated strobe effect.
  const pulses=[350,1920,3260];let flash=0,index=0;
  pulses.forEach((at,i)=>{const f=Math.max(0,1-Math.abs(elapsed-at)/140);if(f>flash){flash=f;index=i;}});
  this.bolt.style.opacity=flash*.7;this.bolt.style.transform=`translateX(${[0,42,18][index]}%)`;
  this.view.ambient.intensity=1.9*(1-.28*amount)+flash*amount*.16;
  this.view.sun.intensity=2.3*(1-.72*amount)+flash*amount*.45;
  this.view.scene.background.copy(this.clearSky).lerp(this.stormSky,amount);
  this.rain.material.opacity=.52*amount;
  let k=0;
  for(const d of this.drops){
   const surface=Math.max(d.cell.ground,this.view.stage)*.8+.15;
   const height=18-((elapsed*.014+d.phase)%18),x=d.x+height*.12,z=d.z+height*.045,y=surface+height;
   this.positions[k++]=x;this.positions[k++]=y;this.positions[k++]=z;
   this.positions[k++]=x+d.length*.12;this.positions[k++]=y+d.length;this.positions[k++]=z+d.length*.045;
  }
  this.rain.geometry.attributes.position.needsUpdate=true;
 }
 clear(){
  if(!this.active)return;
  this.active=false;this.overlay.hidden=true;this.rain.visible=false;this.bolt.style.opacity=0;
  this.view.ambient.intensity=1.9;this.view.sun.intensity=2.3;this.view.scene.background.copy(this.clearSky);
 }
}
