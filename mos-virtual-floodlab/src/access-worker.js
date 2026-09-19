import {RoutingGraph,outageWindows} from './access-routing.js';
let graph,version=0;
self.onmessage=async({data})=>{
 if(data.type==='init'){graph=new RoutingGraph(data.nodeCount,data.edges,data.travel);postMessage({type:'ready'});return;}
 if(data.type==='analyze'){
  const token=++version;const {id,a,b,strict,hours}=data;
  try{
   const baseline=graph.solve(a,b,-1),results=[];
   for(let frame=0;frame<hours.length;frame++){
    if(token!==version)return;
    results.push(graph.solve(a,b,frame,strict));postMessage({type:'progress',id,done:frame+1,total:hours.length});
    await new Promise(resolve=>setTimeout(resolve,0));
   }
   if(token===version)postMessage({type:'result',id,baseline,results,outages:outageWindows(results,hours)});
  }catch(error){postMessage({type:'error',id,message:error.message});}
 }
 if(data.type==='reach'){
  const result=graph.solve(data.a,data.b,data.frame,data.strict,true);
  if(result.reachable)postMessage({type:'reach',id:data.id,frame:data.frame,reachable:result.reachable},[result.reachable.buffer]);
 }
};
