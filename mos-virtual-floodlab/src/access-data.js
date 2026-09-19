// Prefer the smaller download, but retain the plain-file fallback on failure.
export async function loadBinary(url, {fetcher=fetch, inflate=inflateGzip}={}) {
 const get=async target=>{
  const response=await fetcher(target,{cache:'no-cache'});
  if(!response.ok)throw Error('A required map file could not be downloaded. Reload to try again.');
  return response.arrayBuffer();
 };
 if(typeof DecompressionStream!=='undefined'){
  try{
   const packed=await get(new URL(url.href+'.gz'));
   const magic=new Uint8Array(packed,0,Math.min(2,packed.byteLength));
   // A host may already have decoded Content-Encoding: gzip.
   return magic[0]===31&&magic[1]===139?await inflate(packed):packed;
  }catch{ /* The public package also contains the uncompressed original. */ }
 }
 return get(url);
}

async function inflateGzip(packed){
 return new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}

export function validateDataset(manifest,{nodes,edges,depth,travel},names){
 const fail=()=>{throw Error('The map files are incomplete or do not match. Reload the page to try again.');};
 if(!manifest||!Number.isSafeInteger(manifest.nodeCount)||manifest.nodeCount<1||
  !Number.isSafeInteger(manifest.edgeCount)||manifest.edgeCount<1||manifest.edgeStride!==10||
  !Array.isArray(manifest.hours)||manifest.hours.length!==19||manifest.hours.some((h,i)=>h!==i*4))fail();
 if(!(nodes instanceof Float64Array)||nodes.length!==manifest.nodeCount*2||
  !(edges instanceof Uint32Array)||edges.length!==manifest.edgeCount*10||
  !(depth instanceof Uint16Array)||depth.length!==manifest.edgeCount*manifest.hours.length||
  !(travel instanceof Float32Array)||travel.length!==manifest.edgeCount*2||
  !Array.isArray(names)||!names.length||names.some(name=>typeof name!=='string'))fail();
 for(let i=0;i<nodes.length;i+=2){
  if(!Number.isFinite(nodes[i])||!Number.isFinite(nodes[i+1])||Math.abs(nodes[i])>180||Math.abs(nodes[i+1])>=90)fail();
 }
 for(let j=0;j<edges.length;j+=10)if(edges[j+4]>=names.length)fail();
}
