// Directed, fixed-snapshot, fastest-path routing. No server or external router.

export const STRIDE=10;

class Heap{

 constructor(){this.nodes=[];this.costs=[];}

 push(node,cost){let i=this.nodes.length;this.nodes.push(node);this.costs.push(cost);while(i){const p=(i-1)>>1;if(this.costs[p]<=cost)break;this.nodes[i]=this.nodes[p];this.costs[i]=this.costs[p];i=p;}this.nodes[i]=node;this.costs[i]=cost;}

 pop(){const node=this.nodes[0],cost=this.costs[0],n=this.nodes.pop(),c=this.costs.pop();if(this.nodes.length){let i=0;while(i*2+1<this.nodes.length){let j=i*2+1;if(j+1<this.nodes.length&&this.costs[j+1]<this.costs[j])j++;if(this.costs[j]>=c)break;this.nodes[i]=this.nodes[j];this.costs[i]=this.costs[j];i=j;}this.nodes[i]=n;this.costs[i]=c;}return [node,cost];}

}

export class RoutingGraph{

 constructor(nodeCount,edges,travel){

  this.n=nodeCount;this.edges=edges;this.travel=travel;this.m=edges.length/STRIDE;

  const counts=new Uint32Array(nodeCount);let arcs=0;

  for(let i=0;i<this.m;i++){const j=i*STRIDE,d=edges[j+3];if(d!==2){counts[edges[j]]++;arcs++;}if(d!==1){counts[edges[j+1]]++;arcs++;}}

  this.offset=new Uint32Array(nodeCount+1);for(let i=0;i<nodeCount;i++)this.offset[i+1]=this.offset[i]+counts[i];

  this.to=new Uint32Array(arcs);this.arc=new Uint32Array(arcs);this.reverse=new Uint8Array(arcs);const cursor=this.offset.slice(0,nodeCount);

  for(let i=0;i<this.m;i++){const j=i*STRIDE,u=edges[j],v=edges[j+1],d=edges[j+3];if(d!==2){const k=cursor[u]++;this.to[k]=v;this.arc[k]=i;}if(d!==1){const k=cursor[v]++;this.to[k]=u;this.arc[k]=i;this.reverse[k]=1;}}

  this.dist=new Float64Array(nodeCount);this.parent=new Int32Array(nodeCount);this.via=new Int32Array(nodeCount);

 }

 blocked(edge,frame,strict){if(frame<0)return false;const j=edge*STRIDE,b=1<<frame,e=this.edges;const bridge=!!(e[j+6]&1);return !!((!bridge&&(e[j+7]&b))||(strict&&((!bridge&&(e[j+8]&b))||(e[j+6]&14))));}

 connectors(point,start,frame,strict){

  const j=point.edge*STRIDE,e=this.edges,t=point.t,u=e[j],v=e[j+1],direction=e[j+3];

  if(t<=1e-7)return [{node:u,seconds:0,meters:0}];if(t>=1-1e-7)return [{node:v,seconds:0,meters:0}];

  if(this.blocked(point.edge,frame,strict))return [];

  const items=[],meters=e[j+2]/1000;

  if(direction!==2)items.push({node:start?v:u,seconds:(start?1-t:t)*this.travel[point.edge*2],meters:(start?1-t:t)*meters});

  if(direction!==1)items.push({node:start?u:v,seconds:(start?t:1-t)*this.travel[point.edge*2+1],meters:(start?t:1-t)*meters});

  return items;

 }

 solve(a,b,frame,strict=false,includeReachable=false){

  const e=this.edges,dist=this.dist,parent=this.parent,via=this.via;dist.fill(Infinity);parent.fill(-1);via.fill(-1);

  const start=this.connectors(a,true,frame,strict),end=this.connectors(b,false,frame,strict),heap=new Heap();

  let best=Infinity,goal=null,direct=false;

  if(a.edge===b.edge&&!this.blocked(a.edge,frame,strict)){

   const delta=b.t-a.t,dir=e[a.edge*STRIDE+3];

   if(delta>=0&&dir!==2||delta<=0&&dir!==1){best=Math.abs(delta)*this.travel[a.edge*2+(delta<0?1:0)];direct=true;}

  }

  for(const s of start)if(s.seconds<dist[s.node]){dist[s.node]=s.seconds;heap.push(s.node,s.seconds);}

  while(heap.nodes.length){

   const [u,cost]=heap.pop();if(cost!==dist[u])continue;if(cost>best)break;

   for(const target of end)if(target.node===u&&cost+target.seconds<best){best=cost+target.seconds;goal=target;direct=false;}

   for(let k=this.offset[u];k<this.offset[u+1];k++){

    const edge=this.arc[k];if(this.blocked(edge,frame,strict))continue;

    const v=this.to[k],next=cost+this.travel[edge*2+this.reverse[k]];

    if(next<dist[v]&&next<=best){dist[v]=next;parent[v]=u;via[v]=edge;heap.push(v,next);}

   }

  }

  if(!Number.isFinite(best)){

   const result={connected:false,seconds:null,meters:null,nodes:[],edges:[],originBlocked:!start.length,destinationBlocked:!end.length};

   if(includeReachable){const reachable=new Uint8Array(this.n);for(let i=0;i<this.n;i++)reachable[i]=Number.isFinite(dist[i])?1:0;result.reachable=reachable;}

   return result;

  }

  let path=[],pieces=[],meters=0;

  if(direct){pieces=[a.edge];meters=Math.abs(b.t-a.t)*e[a.edge*STRIDE+2]/1000;}

  else{

   let node=goal.node;meters=goal.meters;

   while(node!==-1){path.push(node);if(via[node]>=0){pieces.push(via[node]);meters+=e[via[node]*STRIDE+2]/1000;}node=parent[node];}

   path.reverse();pieces.reverse();const source=start.find(s=>s.node===path[0]);meters+=source.meters;

   if(source.meters>0)pieces.unshift(a.edge);if(goal.meters>0)pieces.push(b.edge);

  }

  const bit=1<<frame;let unreported=0,belowRoad=0,structures=0,bridges=0,conditional=0,elevationMissing=0;

  for(const edge of new Set(pieces)){const j=edge*STRIDE;if(frame>=0&&(e[j+8]&bit)&&!(e[j+6]&1))unreported++;if(frame>=0&&e[j+9]&bit)belowRoad++;if(e[j+6]&2)structures++;if(e[j+6]&1)bridges++;if(e[j+6]&4)conditional++;if(e[j+6]&8)elevationMissing++;}

  return {connected:true,seconds:best,meters,nodes:path,edges:pieces,unreported,belowRoad,structures,bridges,conditional,elevationMissing};

 }

}

export function outageWindows(results,hours){

 const windows=[];let start=-1;

 for(let i=0;i<=results.length;i++){

  if(i<results.length&&!results[i].connected){if(start<0)start=i;}

  else if(start>=0){const end=i-1;windows.push({first:hours[start],last:hours[end],lossAfter:start?hours[start-1]:null,lossBy:hours[start],returnAfter:hours[end],returnBy:i<results.length?hours[i]:null,minHours:hours[end]-hours[start],maxHours:(i<results.length?hours[i]:hours[end])-(start?hours[start-1]:hours[start]),startIndex:start,endIndex:end});start=-1;}

 }

 return windows;

}

