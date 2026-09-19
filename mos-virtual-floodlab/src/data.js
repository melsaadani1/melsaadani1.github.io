// All costs and damage functions in this file are invented classroom examples.
// Curve coordinates: [feet of water above component's reference floor, loss fraction].
export const FT=0.3048;
export const BUILDINGS={
  house1:{id:'house1',code:'F1',name:'One-story home',ffe:1,floors:1,maxFt:18,width:11.8,depth:8.6},
  house2:{id:'house2',code:'F3',name:'Two-story home',ffe:1,floors:2,maxFt:25,width:11.8,depth:8.6},
  clinic:{id:'clinic',code:'F12',name:'Neighborhood clinic',ffe:0.2,floors:1,maxFt:18,width:15,depth:10.5}
};
const C={
 chair:[[0,0],[.1,0],[.5,.5],[1,1],[20,1]],
 sofa:[[0,0],[.1,0],[.5,.5],[1,1],[20,1]],
 stove:[[0,0],[.25,0],[1,.75],[1.5,1],[20,1]],
 fridge:[[0,0],[.15,0],[.5,.6],[1,1],[20,1]],
 microwave:[[0,0],[3.1,0],[3.4,1],[20,1]],
 tv:[[0,0],[2.2,0],[2.7,1],[20,1]],
 bed:[[0,0],[.7,0],[1,.25],[2,1],[20,1]],
 other:[[0,0],[.5,.05],[1,.15],[2,.4],[3,.65],[4,.85],[5,1],[20,1]],
 dining:[[0,0],[.2,0],[1,.2],[2,.65],[3,1],[20,1]],
 washer:[[0,0],[.2,0],[.8,.7],[1.5,1],[20,1]],
 rug:[[0,0],[.03,0],[.15,1],[20,1]],
 walls:[[0,0],[.1,.04],[1,.2],[2,.4],[3,.6],[5,1],[20,1]],
 floors:[[0,0],[.1,.1],[.5,.45],[1,.6],[2,.9],[3,1],[20,1]],
 cabinets:[[0,0],[.25,0],[1,.15],[2,.6],[3,.9],[4,1],[20,1]],
 electric:[[0,0],[.5,0],[1,.1],[2,.3],[3,.55],[5,.85],[8,1],[20,1]],
 hvac:[[0,0],[.25,0],[1,.45],[2,.8],[3,1],[20,1]],
 shell:[[0,0],[1,.003],[2,.01],[3,.02],[5,.07],[10,.15],[20,.3]],
 foundation:[[0,0],[1,.005],[2,.01],[3,.015],[5,.03],[10,.06],[20,.12]],
 duct:[[0,0],[.1,0],[.6,.25],[1.5,.8],[2,1],[20,1]],
 medbed:[[0,0],[.2,0],[.7,.35],[1.5,.8],[2.5,1],[20,1]],
 monitor:[[0,0],[2.4,0],[2.8,.5],[3.1,1],[20,1]],
 imaging:[[0,0],[.1,0],[.6,.7],[1.2,1],[20,1]],
 lab:[[0,0],[2.8,0],[3.2,.4],[3.6,1],[20,1]]
};
const texts={
 chair:'The fabric and padding have low water tolerance. Full loss is reached at 1 ft above this item’s floor.',
 sofa:'Upholstery takes damage early. The whole sofa is highlighted as its repair/replacement fraction rises.',
 stove:'Low electrical parts make this appliance vulnerable before its cooktop goes underwater.',
 fridge:'The lower electrical and mechanical components are assumed to be highly water-sensitive.',
 microwave:'This microwave starts on a countertop. Its damage begins at 3.1 ft above the floor, later than the stove.',
 tv:'The television is already elevated on a stand; modeled damage starts at 2.2 ft above the floor.',
 bed:'The raised mattress delays damage, but the bed reaches full replacement loss at 2 ft.',
 other:'An aggregate of possessions at different heights. Its gradual curve represents successive items getting wet.',
 dining:'Mixed wood furniture is assigned a gradual repair-to-replacement curve.',
 washer:'Electrical and mechanical components near the base are assumed to fail before full submersion.',
 rug:'A very shallow flood is enough to incur full assumed replacement loss for this rug.',
 walls:'Repair loss grows as a larger height of drywall and insulation gets wet. Red follows the waterline.',
 floors:'This is the floor finish, not the slab. The curve represents an increasing repair/replacement fraction.',
 cabinets:'Built-in cabinets are part of building value. Appliances are counted separately under contents.',
 electric:'Only a fraction of the building’s wiring, outlets and panels is reached at shallow depths.',
 hvac:'Sensitive lower equipment drives a steep illustrative loss curve.',
 shell:'A small repair allowance for framing and exterior components. Red does not imply structural failure.',
 foundation:'A small illustrative repair allowance. Flooding a slab does not automatically mean replacing it.',
 duct:'Air ducts and other equipment below the rooms can get wet first. Here, their damage depends on water depth above the ground.',
 medbed:'Motors and controls make this medical bed more vulnerable than a simple metal frame.',
 monitor:'The elevated monitor stays dry longer; its full value is lost once its vulnerable electronics are reached.',
 imaging:'This expensive machine has electrical parts near its base. Damage to this one machine can make up much of the clinic’s total equipment cost.',
 lab:'Laboratory instruments start on a worktop and remain protected until water reaches that height.'
};
export function createInventory(config){
 const a=[];
 const add=(id,name,group,value,curve,type,x,z,level=0,extra={})=>a.push({id,name,group,value,curve:C[curve],curveName:curve,type,x,z,level,baseM:config.ffe+level*3.2,elevated:false,description:texts[curve],...extra});
 if(config.id!=='clinic'){
  add('chair','Lounge chair','contents',400,'chair','chair',-1.8,2.2);
  add('sofa','Living-room sofa','contents',1800,'sofa','sofa',-4,1.3);
  add('range','Stove / range','contents',1200,'stove','stove',-4.9,-3.4);
  add('fridge','Refrigerator','contents',1800,'fridge','fridge',-.6,-3.4);
  add('microwave','Countertop microwave','contents',300,'microwave','microwave',-2.55,-3.38);
  add('tv','TV and stand','contents',900,'tv','tv',-.2,.3);
  add('bed','Bed and mattress','contents',2600,'bed','bed',3.3,-2.2);
  add('belongings','Shelves and belongings','contents',6000,'other','shelf',4.65,-3.65);
  add('dining','Dining table and chairs','contents',1300,'dining','dining',-2,-.85);
  add('washer','Washing machine','contents',900,'washer','washer',4.65,2.8);
  add('rug','Living-room rug','contents',700,'rug','rug',-3.2,1.7);
  if(config.floors===2){
   add('upper-bed','Upstairs bed','contents',2200,'bed','bed',3.1,-2,1);
   add('upper-sofa','Upstairs sofa','contents',1500,'sofa','sofa',-3.6,1.2,1);
   add('upper-tv','Upstairs TV','contents',700,'tv','tv',-.2,.4,1);
   add('upper-desk','Desk and chair','contents',1400,'dining','desk',-3.3,-2.5,1);
   add('upper-belongings','Upstairs belongings','contents',6000,'other','shelf',4.65,-3.6,1);
   add('upper-rug','Upstairs rug','contents',500,'rug','rug',-3.2,1.7,1);
  }
 }else{
  add('bed-a','Treatment bed A','contents',18000,'medbed','medbed',-5.2,1.8);
  add('monitor-a','Patient monitor A','contents',7000,'monitor','monitor',-3.7,.9);
  add('bed-b','Treatment bed B','contents',18000,'medbed','medbed',-1.6,1.8);
  add('monitor-b','Patient monitor B','contents',7000,'monitor','monitor',-.2,.9);
  add('imaging','Medical imaging machine','contents',180000,'imaging','scanner',4,-2);
  add('lab','Laboratory instruments','contents',45000,'lab','lab',-4.4,-3.8);
  add('reception','Reception computers','contents',5000,'tv','desk',3,3.4);
  add('medfridge','Medical refrigerator','contents',12000,'fridge','fridge',-1.4,-3.9);
  add('waiting','Waiting-room seating','contents',2500,'chair','seating',5.8,2.7);
  add('supplies','Medical supplies','contents',30000,'other','shelf',.8,-4.2);
 }
 for(let f=0;f<config.floors;f++){
  const prefix=f?'upper-':'', suffix=f?' · upstairs':'';
  const clinic=config.id==='clinic';
  add(prefix+'walls','Drywall and insulation'+suffix,'building',clinic?48000:35000,'walls','walls',0,0,f,{canElevate:false});
  add(prefix+'floors','Floor finishes'+suffix,'building',clinic?42000:25000,'floors','floors',0,0,f,{canElevate:false});
  add(prefix+'cabinets','Built-in cabinetry'+suffix,'building',clinic?35000:(f?12000:20000),'cabinets','cabinets',0,0,f,{canElevate:false});
  add(prefix+'electric','Electrical system'+suffix,'building',clinic?50000:15000,'electric','electric',0,0,f,{canElevate:false});
 }
 add('hvac','Heating and cooling','building',config.id==='clinic'?60000:20000,'hvac','hvac',config.width/2+.8,-2,0,{canElevate:true});
 add('shell','Framing, roof and exterior','building',config.id==='clinic'?250000:config.floors===2?155000:97000,'shell','shell',0,0,0,{canElevate:false});
 add('foundation',config.id==='clinic'?'Slab and foundation':'Foundation','building',config.id==='clinic'?65000:config.floors===2?45000:30000,'foundation','foundation',0,0,0,{baseM:0,canElevate:false});
 if(config.ffe===1)add('duct','Equipment under the floor','building',8000,'duct','duct',0,0,0,{baseM:0,canElevate:false});
 return a;
}
export function fractionAt(item,waterM,ignoreElevation=false){
 const d=(waterM-item.baseM)/FT-(!ignoreElevation&&item.elevated?2:0),p=item.curve;
 if(d<=p[0][0])return p[0][1];
 for(let n=1;n<p.length;n++)if(d<=p[n][0])return p[n-1][1]+(p[n][1]-p[n-1][1])*(d-p[n-1][0])/(p[n][0]-p[n-1][0]);
 return p[p.length-1][1];
}
export function evaluate(items,waterM){
 const result={contents:{value:0,loss:0},building:{value:0,loss:0}};
 for(const item of items){result[item.group].value+=item.value;result[item.group].loss+=item.value*fractionAt(item,waterM);}
 result.total=result.contents.loss+result.building.loss;
 result.value=result.contents.value+result.building.value;
 return result;
}
export const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
