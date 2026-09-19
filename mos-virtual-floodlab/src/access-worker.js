import {RoutingGraph,outageWindows} from './access-routing.js?v=1.6.2';

export function createWorkerHandler(send,yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0))){
 let graph,version=0,activeId=null;
 return async({data})=>{
  if(!data||typeof data!=='object')return;
  if(data.type==='cancel'){version++;activeId=null;return;}
  let token=version;
  try{
   if(data.type==='init'){
    version++;activeId=null;graph=null;
    graph=new RoutingGraph(data.nodeCount,data.edges,data.travel);
    send({type:'ready'});return;
   }
   if(data.type==='analyze'){
    token=++version;activeId=data.id;
    if(!graph)throw Error('The road network is not ready. Reload the page to try again.');
    const {id,a,b,strict,hours}=data;
    if(!Array.isArray(hours)||hours.length!==19||hours.some((h,i)=>h!==i*4))throw Error('The flood snapshots do not match this experiment.');
    const baseline=graph.solve(a,b,-1),results=[];
    for(let frame=0;frame<hours.length;frame++){
     if(token!==version)return;
     results.push(graph.solve(a,b,frame,strict));send({type:'progress',id,done:frame+1,total:hours.length});
     await yieldTask();
    }
    if(token===version)send({type:'result',id,baseline,results,outages:outageWindows(results,hours)});
   }
   if(data.type==='reach'&&data.id===activeId){
    const result=graph.solve(data.a,data.b,data.frame,data.strict,true);
    if(result.reachable)send({type:'reach',id:data.id,frame:data.frame,reachable:result.reachable},[result.reachable.buffer]);
   }
  }catch(error){
   if(data.type==='init'||token===version)send({type:'error',id:data.id,initialization:data.type==='init',message:error.message});
  }
 };
}

if(typeof self!=='undefined')self.onmessage=createWorkerHandler((data,transfer)=>self.postMessage(data,transfer||[]));
