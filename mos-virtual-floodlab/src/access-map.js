// Canvas overlays keep hundreds of thousands of real road pieces out of the DOM.

export function makeRoadLayer(L,lab){

 return new (L.Layer.extend({

  onAdd(map){this.map=map;this.canvas=L.DomUtil.create('canvas','access-network-canvas');map.getPane('overlayPane').append(this.canvas);this.canvas.style.pointerEvents='none';map.on('moveend zoomend resize',this.redraw,this);this.redraw();},

  onRemove(map){map.off('moveend zoomend resize',this.redraw,this);this.canvas.remove();},

  redraw(){

   if(!this.map||!lab.edges)return;

   const map=this.map,size=map.getSize(),ratio=Math.min(devicePixelRatio||1,2),canvas=this.canvas;

   canvas.width=size.x*ratio;canvas.height=size.y*ratio;canvas.style.width=size.x+'px';canvas.style.height=size.y+'px';

   L.DomUtil.setPosition(canvas,map.containerPointToLayerPoint([0,0]));

   const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);

   const scale=256*2**map.getZoom(),origin=map.project(map.getBounds().getNorthWest(),map.getZoom());

   const n=lab.nodes.length/2,e=lab.edges,px=new Float32Array(n),py=new Float32Array(n);

   for(let i=0;i<n;i++){px[i]=lab.world[i*2]*scale-origin.x;py[i]=lab.world[i*2+1]*scale-origin.y;}

   const bit=1<<lab.frame,strict=lab.strict,reachable=lab.reachable,show=lab.$('access-roads').checked;

   const strokes=[['#52616e',map.getZoom()>13?1.3:.8,.35],['#e25452',map.getZoom()>13?3:1.7,.92],['#b77b20',2,.8],['#009688',map.getZoom()>13?3:2,.78],['#fff4d6',map.getZoom()>13?5:3.5,1]];

   for(let state=0;state<5;state++){

    if(!show&&state!==3)continue;if(state===3&&!reachable)continue;

    ctx.beginPath();ctx.strokeStyle=strokes[state][0];ctx.lineWidth=strokes[state][1];ctx.globalAlpha=strokes[state][2];ctx.setLineDash(state===2?[5,3]:[]);

    for(let edge=0;edge<e.length/10;edge++){

     const j=edge*10,u=e[j],v=e[j+1],x=px[u],y=py[u],xx=px[v],yy=py[v];

     if(Math.max(x,xx)<-5||Math.min(x,xx)>size.x+5||Math.max(y,yy)<-5||Math.min(y,yy)>size.y+5)continue;

     const bridge=!!(e[j+6]&1),blocked=!bridge&&!!(e[j+7]&bit),uncertain=!!(!bridge&&(e[j+8]&bit)||e[j+6]&14),surfaceUnknown=!!(e[j+6]&10);

     const dir=e[j+3],fromA=lab.a?.edge===edge;

     const connectedReach=reachable&&((dir!==2&&reachable[u])||(dir!==1&&reachable[v])||fromA)&&!blocked&&!(strict&&uncertain);

     const color=blocked?1:surfaceUnknown||strict&&uncertain?2:bridge?4:connectedReach?3:0;

     if(color!==state)continue;

     if(state===3&&fromA&&dir===1&&!reachable[u]){ctx.moveTo(x+lab.a.t*(xx-x),y+lab.a.t*(yy-y));ctx.lineTo(xx,yy);}

     else if(state===3&&fromA&&dir===2&&!reachable[v]){ctx.moveTo(x,y);ctx.lineTo(x+lab.a.t*(xx-x),y+lab.a.t*(yy-y));}

     else{ctx.moveTo(x,y);ctx.lineTo(xx,yy);}

    }

    ctx.stroke();
    if(state===4){ctx.strokeStyle='#465e64';ctx.lineWidth=map.getZoom()>13?1.7:1;ctx.stroke();}

   }

   ctx.globalAlpha=1;

  }

 }))();

}

export function nearestRoad(nodes,edges,lon,lat,limit=350,accept=null){

 const sx=111320*Math.cos(lat*Math.PI/180),sy=111320;let best=limit*limit,result=null;

 for(let edge=0;edge<edges.length/10;edge++){

  const j=edge*10,u=edges[j]*2,v=edges[j+1]*2;

  const ax=(nodes[u]-lon)*sx,ay=(nodes[u+1]-lat)*sy,bx=(nodes[v]-lon)*sx,by=(nodes[v+1]-lat)*sy;

  if(Math.min(ax,bx)>limit||Math.max(ax,bx)<-limit||Math.min(ay,by)>limit||Math.max(ay,by)<-limit)continue;

  const dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/den)):0,x=ax+t*dx,y=ay+t*dy,d=x*x+y*y;

  if(d<best&&(!accept||accept(edge))){best=d;result={edge,t,lon:nodes[u]+t*(nodes[v]-nodes[u]),lat:nodes[u+1]+t*(nodes[v+1]-nodes[u+1]),snapMeters:Math.sqrt(d)};}

 }

 return result;

}
