// Small spatial index for sampling the same triangles that are drawn on screen.
// In particular, a narrow vector bank must not use the coarse ground grid.
export function surfaceSampler(source, values, onlyBanks=false) {
  const size=1.5,bins=new Map(),v=source.vertices,faces=source.indices;
  for(let k=0;k<faces.length;k+=3){
    const a=faces[k],b=faces[k+1],c=faces[k+2];
    if(onlyBanks&&![a,b,c].some(i=>source.bankFlags[i]))continue;
    const x0=Math.min(v[a*2],v[b*2],v[c*2]),x1=Math.max(v[a*2],v[b*2],v[c*2]);
    const z0=Math.min(v[a*2+1],v[b*2+1],v[c*2+1]),z1=Math.max(v[a*2+1],v[b*2+1],v[c*2+1]);
    for(let x=Math.floor(x0/size);x<=Math.floor(x1/size);x++)for(let z=Math.floor(z0/size);z<=Math.floor(z1/size);z++){
      const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(k);
    }
  }
  return (x,z,field=values)=>{
    for(const k of bins.get(Math.floor(x/size)+','+Math.floor(z/size))??[]){
      const a=faces[k],b=faces[k+1],c=faces[k+2];
      const ax=v[a*2],az=v[a*2+1],bx=v[b*2],bz=v[b*2+1],cx=v[c*2],cz=v[c*2+1];
      const d=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);if(Math.abs(d)<1e-12)continue;
      const u=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/d;
      const w=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/d,t=1-u-w;
      if(u>=-1e-7&&w>=-1e-7&&t>=-1e-7)return field?u*field[a]+w*field[b]+t*field[c]:1;
    }
    return null;
  };
}
