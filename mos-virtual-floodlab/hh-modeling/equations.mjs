// Optional teaching graphics. These do not change the watershed experiment.
const fraction=(top,bottom)=>`<span class="eq-fraction"><span>${top}</span><span>${bottom}</span></span>`;
const derivative=(term,axis)=>fraction('∂'+term,'∂'+axis);
const arrowDefs=`<defs><marker id="eq-teal-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#387c77"/></marker><marker id="eq-gold-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#ac7d30"/></marker><marker id="eq-rust-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#ad624d"/></marker><marker id="eq-axis-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#8d9d87"/></marker></defs>`;
export const METHODS=`
<div class="equation-explainer">
 <p class="eq-intro">Two physical ideas work together: <strong>continuity keeps track of water</strong>; <strong>momentum describes how its motion changes</strong>.</p>
 <div class="eq-overview"><a href="#continuity-explanation"><span>01</span><strong>How much water stays?</strong><small>Conservation of mass</small></a><a href="#momentum-explanation"><span>02</span><strong>How does water move?</strong><small>Balance of momentum</small></a></div>
 <section id="continuity-explanation" class="eq-section" aria-labelledby="continuity-title">
  <p class="eyebrow">01 / CONTINUITY</p><h3 id="continuity-title">Water in. Water out. Water stored.</h3>
  <p>For water of nearly constant density, conserving mass means conserving volume. If more water enters a cell than leaves it, storage increases and its depth rises. Continuity accounts for the water; it does not, by itself, determine the flow speed.</p>
  <div class="eq-demo">
   <div class="eq-demo-heading"><strong>One 50 m × 50 m cell</strong><span>Example over 100 seconds · no rainfall added here</span></div>
   <div class="eq-options" role="group" aria-label="Continuity examples"><button data-continuity="filling" aria-pressed="true">Filling</button><button data-continuity="balanced" aria-pressed="false">Balanced</button><button data-continuity="draining" aria-pressed="false">Draining</button></div>
   <svg class="continuity-diagram" viewBox="0 0 620 252" role="img" aria-labelledby="cell-diagram-title"><title id="cell-diagram-title">Water enters and leaves a model cell; the difference changes stored water.</title>${arrowDefs}
    <path d="M188 182L188 76L406 76L406 182Z" fill="#edf2e6" stroke="#bdcbb3" stroke-width="2"/>
    <path id="eq-cell-water" d="M188 132L406 132L406 182L188 182Z" fill="#86bab0" opacity=".72"/>
    <path d="M188 132H406" stroke="#647f70" stroke-dasharray="4 4"/><text x="298" y="68" text-anchor="middle">Storage in this cell</text>
    <path id="eq-in-arrow" class="eq-flow-line" d="M60 136H172" fill="none" stroke="#387c77" stroke-width="6" marker-end="url(#eq-teal-arrow)"/>
    <path id="eq-out-arrow" class="eq-flow-line" d="M422 136H538" fill="none" stroke="#ac7d30" stroke-width="3" marker-end="url(#eq-gold-arrow)"/>
    <text x="106" y="112" text-anchor="middle">Inflow</text><text id="eq-in-label" x="106" y="177" text-anchor="middle" class="eq-svg-value">6 m³/s</text>
    <text x="504" y="112" text-anchor="middle">Outflow</text><text id="eq-out-label" x="504" y="177" text-anchor="middle" class="eq-svg-value">2 m³/s</text>
    <text x="297" y="211" text-anchor="middle">Dashed line: starting depth 0.60 m</text><text id="eq-depth-label" x="297" y="236" text-anchor="middle" class="eq-svg-value">After 100 s: 0.76 m</text>
   </svg>
   <div id="continuity-reading" class="eq-reading" role="status"></div>
  </div>
  <div class="eq-plain">Rate of storage change = inflow − outflow + local sources</div>
  <div class="eq-formula" role="img" aria-label="Partial h over partial t plus partial h u over partial x plus partial h v over partial y equals s"><span class="eq-storage">${derivative('h','t')}</span> + <span class="eq-transport">${derivative('(hu)','x')} + ${derivative('(hv)','y')}</span> = <span class="eq-source">s</span></div>
  <dl class="eq-term-list"><div><dt>Storage change · ∂h/∂t</dt><dd>How quickly depth changes at one location.</dd></div><div><dt>Net outward flow · ∂(hu)/∂x + ∂(hv)/∂y</dt><dd>More leaving than arriving reduces storage. hu and hv are flow per unit width in the two map directions.</dd></div><div><dt>Local sources · s</dt><dd>Water added or removed per unit area, such as rainfall or infiltration; positive adds water. Each term has units of m/s.</dd></div></dl>
 </section>
 <section id="momentum-explanation" class="eq-section" aria-labelledby="momentum-title">
  <p class="eyebrow">02 / MOMENTUM</p><h3 id="momentum-title">Why does water speed up, slow down, or turn?</h3>
  <p>Momentum is mass times velocity. Its balance is Newton’s law applied to moving water: a net force changes motion. A sloping water surface drives acceleration; bed and vegetation resistance oppose movement. Inertia means the existing flow does not instantly adopt a new speed or direction.</p>
  <div class="eq-demo">
   <div class="eq-demo-heading"><strong>Two directions across the map</strong><span>x and y are horizontal · h is water depth</span></div>
   <div class="eq-options" role="group" aria-label="Momentum direction examples"><button data-momentum="x" aria-pressed="false">Along x</button><button data-momentum="y" aria-pressed="false">Along y</button><button data-momentum="both" aria-pressed="true">Both directions</button></div>
   <svg class="momentum-diagram" viewBox="0 0 620 275" role="img" aria-labelledby="momentum-diagram-title"><title id="momentum-diagram-title">Plan view showing water-surface slope pushing water, flow direction, and opposing resistance in the x and y directions.</title>
    <rect x="147" y="25" width="240" height="220" rx="8" fill="#e4eee3" stroke="#c8d6c1"/>
    <path d="M147 98H387M147 172H387M227 25V245M307 25V245" stroke="#bacfbf" stroke-width="1"/>
    <rect x="227" y="98" width="80" height="74" fill="#a6cfc3" stroke="#7da89a"/>
    <path d="M109 235H184M109 235V161" fill="none" stroke="#8d9d87" stroke-width="1.5" marker-end="url(#eq-axis-arrow)"/><text x="188" y="240">+x</text><text x="93" y="155">+y</text>
    <path id="eq-direction-projection" d="M267 135H337V65" fill="none" stroke="#92aa95" stroke-dasharray="4 4"/>
    <path id="eq-slope-vector" d="M267 135L337 65" fill="none" stroke="#ac7d30" stroke-width="4" marker-end="url(#eq-gold-arrow)"/>
    <path id="eq-friction-vector" d="M267 135L235 167" fill="none" stroke="#ad624d" stroke-width="4" marker-end="url(#eq-rust-arrow)"/>
    <circle cx="267" cy="135" r="5" fill="#3e6c5f"/>
    <path id="eq-velocity-vector" class="eq-flow-line" d="M286 159L333 112" fill="none" stroke="#387c77" stroke-width="3" marker-end="url(#eq-teal-arrow)"/>
    <path d="M418 83H449" stroke="#ac7d30" stroke-width="4"/><text x="461" y="87">Slope driving force</text>
    <path d="M418 121H449" stroke="#ad624d" stroke-width="4"/><text x="461" y="125">Opposing resistance</text>
    <path d="M418 159H449" stroke="#387c77" stroke-width="3"/><text x="461" y="163">Existing movement</text>
    <text x="269" y="265" text-anchor="middle">A plan view of neighboring mesh cells</text>
   </svg>
   <div id="momentum-reading" class="eq-reading" role="status"></div><p class="eq-caption">Direction sketch, not force magnitudes. Water is already moving downhill in these examples; friction opposes that motion.</p>
  </div>
  <p class="eq-plain">Water accelerates when driving and resisting forces do not balance.</p>
  <h4>x-direction momentum · changes in u</h4>
  <div class="eq-formula eq-momentum" role="img" aria-label="x momentum: partial u over partial t plus u partial u over partial x plus v partial u over partial y equals minus g partial eta over partial x minus g S f x"><span class="eq-storage">${derivative('u','t')}</span> + <span class="eq-transport">u ${derivative('u','x')} + v ${derivative('u','y')}</span> = <span class="eq-slope">−g ${derivative('η','x')}</span> <span class="eq-friction">− gS<sub>fx</sub></span></div>
  <h4>y-direction momentum · changes in v</h4>
  <div class="eq-formula eq-momentum" role="img" aria-label="y momentum: partial v over partial t plus u partial v over partial x plus v partial v over partial y equals minus g partial eta over partial y minus g S f y"><span class="eq-storage">${derivative('v','t')}</span> + <span class="eq-transport">u ${derivative('v','x')} + v ${derivative('v','y')}</span> = <span class="eq-slope">−g ${derivative('η','y')}</span> <span class="eq-friction">− gS<sub>fy</sub></span></div>
  <dl class="eq-term-list"><div><dt>Local acceleration</dt><dd>∂u/∂t and ∂v/∂t: speed components changing with time at a fixed point.</dd></div><div><dt>Advective acceleration</dt><dd>The u and v terms account for water moving into places with different velocities. Even a steady flow can accelerate through space.</dd></div><div><dt>Water-surface slope</dt><dd>−g∂η/∂x and −g∂η/∂y drive acceleration toward lower water-surface elevation. Ground slope alone is not enough.</dd></div><div><dt>Friction</dt><dd>S<sub>fx</sub> and S<sub>fy</sub> are signed resistance-slope components. Their negative terms oppose motion. All momentum terms have units of m/s².</dd></div></dl>
  <details class="eq-details"><summary>Symbols and simplifying assumptions</summary><div class="eq-symbols"><span><b>h</b> water depth (m)</span><span><b>u, v</b> depth-averaged velocities in x, y (m/s)</span><span><b>η = z + h</b> water-surface elevation (m)</span><span><b>z</b> ground elevation (m)</span><span><b>g</b> gravitational acceleration (m/s²)</span><span><b>t</b> time (s)</span></div><p>These are simplified shallow-water momentum equations for wet cells, with hydrostatic pressure and constant density. Wind, Earth’s rotation, turbulent mixing and momentum introduced by external water sources are omitted here.</p><p>Further reading: <a href="https://www.hec.usace.army.mil/confluence/rasdocs/hecras/latest/technical-reference/hydraulic-equations/shallow-water-equations" target="_blank" rel="noopener noreferrer">USACE HEC-RAS: shallow-water equations</a>.</p></details>
 </section>
 <details class="eq-details"><summary>Hydrology: rainfall, storage and the hydrograph</summary><div class="equation">P = E + ΔS + R<small>Rainfall = evapotranspiration + storage change + runoff</small></div><p>Three contributing areas partition rainfall between canopy storage, infiltration and excess runoff. Higher / medium / lower infiltration multiply assumed storage and capacity by 2 / 1 / 0.3. Land use controls impervious fractions. Evaporation removes only available stored water.</p><div class="equation">dS/dt = I − Q &nbsp; · &nbsp; Q = S/K<small>I: inflow · Q: outflow · S: stored volume · K: response time</small></div><p>Conceptual hillslope and stream reservoirs spread runoff in time. The model accounts for water volume over 24 hours, rather than resolving detailed soil or groundwater flow.</p></details>
 <details class="eq-details"><summary>What this teaching scene actually calculates</summary><p>The flood scene is an illustration; it <strong>does not solve the shallow-water equations above</strong>. Its water level follows H = 0.16 Q<sup>0.78</sup>, with Q in m³/s and H in metres, above the sloping channel bed. The coefficient is chosen for the synthetic terrain, not calibrated to a river.</p><p>Connected ground below that surface floods. Depth is water elevation minus ground; speed and flow traces are illustrative. The same relation applies to every scenario. Flood volume is not a conservation result; hydrologic water accounting is separate.</p><p>Map cells are 50 m; the displayed surface is clipped to terrain at 12.5 m intervals. Extent counts non-channel cells deeper than 0.10 m. Buildings and bridges are decorative.</p></details>
</div>`;

export function bindEquationDemos(host){
 if(!host.querySelector('.equation-explainer'))return;
 const find=s=>host.querySelector(s);
 const continuity=mode=>{
  const [inflow,outflow]=({filling:[6,2],balanced:[4,4],draining:[2,6]})[mode],net=inflow-outflow,volume=net*100,dh=volume/2500,end=.6+dh,y=182-end/.6*50;
  host.querySelectorAll('[data-continuity]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.continuity===mode)));
  find('#eq-cell-water').setAttribute('d',`M188 ${y}L406 ${y}L406 182L188 182Z`);
  find('#eq-in-arrow').setAttribute('stroke-width',inflow);find('#eq-out-arrow').setAttribute('stroke-width',outflow);
  find('#eq-in-label').textContent=inflow+' m³/s';find('#eq-out-label').textContent=outflow+' m³/s';find('#eq-depth-label').textContent='After 100 s: '+end.toFixed(2)+' m';
  find('#continuity-reading').innerHTML=net===0?'<strong>Storage change: 4 in − 4 out = 0 m³/s.</strong><span>Water keeps moving through the cell, but depth stays at 0.60 m.</span>':`<strong>Storage change: ${inflow} in − ${outflow} out = ${net>0?'+':''}${net} m³/s.</strong><span>${Math.abs(volume)} m³ ${net>0?'accumulates':'leaves storage'} in 100 seconds. Over 2,500 m², depth ${net>0?'rises':'falls'} by ${Math.abs(dh).toFixed(2)} m.</span>`;
 };
 const momentum=mode=>{
  const [dx,dy]=({x:[100,0],y:[0,-92],both:[70,-70]})[mode],cx=267,cy=135;
  host.querySelectorAll('[data-momentum]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.momentum===mode)));
  find('#eq-slope-vector').setAttribute('d',`M${cx} ${cy}L${cx+dx} ${cy+dy}`);
  find('#eq-friction-vector').setAttribute('d',`M${cx} ${cy}L${cx-dx*.45} ${cy-dy*.45}`);
  find('#eq-velocity-vector').setAttribute('d',`M${cx+21} ${cy+23}L${cx+21+dx*.58} ${cy+23+dy*.58}`);
  find('#eq-direction-projection').setAttribute('d',mode==='both'?`M${cx} ${cy}H${cx+dx}V${cy+dy}`:'');
  find('#momentum-reading').innerHTML=({x:'<strong>Surface tilts toward +x.</strong><span>The x-equation describes changes in u. This sketch has no y-directed slope force.</span>',y:'<strong>Surface tilts toward +y.</strong><span>The y-equation describes changes in v. This is movement across the map, not a change in depth.</span>',both:'<strong>Surface tilts in both map directions.</strong><span>Both momentum equations are needed: u describes the x component and v the y component of motion.</span>'})[mode];
 };
 host.querySelectorAll('[data-continuity]').forEach(b=>b.onclick=()=>continuity(b.dataset.continuity));
 host.querySelectorAll('[data-momentum]').forEach(b=>b.onclick=()=>momentum(b.dataset.momentum));
 host.querySelectorAll('.eq-overview a').forEach(a=>a.onclick=e=>{e.preventDefault();find(a.getAttribute('href')).scrollIntoView({behavior:'smooth',block:'start'});});
 continuity('filling');momentum('both');
}
