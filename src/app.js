/*
==============================================================================
Proyecto: Kriter DataLab
Autor: Jesus R.L. Gonzalez
Derechos Reservados (c) 2026
==============================================================================
*/
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const D = KRITER_DATA;
  const money = n => new Intl.NumberFormat('es-MX', {minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n) || 0);
  const number = n => new Intl.NumberFormat('es-MX', {maximumFractionDigits:2}).format(Number(n) || 0);
  const integer = n => new Intl.NumberFormat('es-MX', {maximumFractionDigits:0}).format(Number(n) || 0);
  const compact = n => new Intl.NumberFormat('es-MX', {notation:'compact', maximumFractionDigits:2}).format(Number(n) || 0);
  const compactShort = n => new Intl.NumberFormat('es-MX', {notation:'compact', maximumFractionDigits:0}).format(Number(n) || 0);
  const percentage = (n,d) => d ? (100*n/d).toLocaleString('es-MX',{maximumFractionDigits:1}) + ' %' : '0 %';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const active = {year:'',region:'',segment:'',brand:'',from:'',to:''};
  let results = null;
  let productSort = 'valor';
  const wkLen = D.weeks.length;
  function fillSelect(id, list, formatter = s=>s) {
    list.forEach((value, idx) => {const opt = document.createElement('option');opt.value=String(idx);opt.textContent=formatter(value);$(id).appendChild(opt)});
  }
  const years=[...new Set(D.weeks.map(w=>w.y))].sort((a,b)=>a-b);
  years.forEach(year=>{const opt=document.createElement('option');opt.value=String(year);opt.textContent=String(year);$('filterYear').appendChild(opt)});
  fillSelect('filterRegion',D.regions);
  fillSelect('filterSegment',D.segments);
  fillSelect('filterBrand',D.brands);
  fillSelect('filterFrom',D.weeks,w=>`${w.label} · ${w.date}`);
  fillSelect('filterTo',D.weeks,w=>`${w.label} · ${w.date}`);
  const filterIds={filterYear:'year',filterRegion:'region',filterSegment:'segment',filterBrand:'brand',filterFrom:'from',filterTo:'to'};
  Object.entries(filterIds).forEach(([id,key])=>$(id).addEventListener('change',()=>{active[key]=$(id).value;recalculate()}));
  $('resetBtn').addEventListener('click',()=>{Object.entries(filterIds).forEach(([id,key])=>{$(id).value='';active[key]=''});$('productSearch').value='';productSort='valor';recalculate()});
  const setMenu=open=>{$('sidebar').classList.toggle('show',open);$('showMenu').setAttribute('aria-expanded',String(open))};
  $('showMenu').addEventListener('click',()=>setMenu(!$('sidebar').classList.contains('show')));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setMenu(false)});
  document.querySelectorAll('[data-page]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('active',b===btn);b.removeAttribute('aria-current')});
    btn.setAttribute('aria-current','page');document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+btn.dataset.page));
    setMenu(false);if(btn.dataset.page==='resumen')requestAnimationFrame(renderOverview);window.scrollTo({top:0,behavior:'smooth'});
  }));
  let resizeFrame=0;
  window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{if(results&&$('page-resumen').classList.contains('active'))drawLine('chartWeekly',results.timeline)})});
  $('productSearch').addEventListener('input',()=>renderTable());
  document.querySelectorAll('[data-sort]').forEach(th=>{const go=()=>{productSort=th.dataset.sort;renderTable()};th.addEventListener('click',go);th.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}})});
  ['scenarioWindow','scenarioHorizon','scenarioPct'].forEach(id=>$(id).addEventListener('input',()=>renderScenario()));
  $('exportBtn').addEventListener('click',exportCSV);
  function chooseDimension(dimension,index){const id={region:'filterRegion',segment:'filterSegment',brand:'filterBrand'}[dimension];if(!id)return;const value=String(index);$(id).value=($(id).value===value?'':value);$(id).dispatchEvent(new Event('change',{bubbles:true}));}
  function compute(){
    const year=active.year ? Number(active.year):null;
    const region=active.region===''?null:Number(active.region);
    const segment=active.segment===''?null:Number(active.segment);
    const brand=active.brand===''?null:Number(active.brand);
    const start=active.from===''?0:Number(active.from);
    const end=active.to===''?wkLen-1:Number(active.to);
    const validWeek=w=>w>=start&&w<=end&&(!year||D.weeks[w].y===year);
    const byWeek=Array(wkLen).fill(0),weekCount=Array(wkLen).fill(0);
    const byRegion=Array(D.regions.length).fill(0),bySegment=Array(D.segments.length).fill(0),byBrand=Array(D.brands.length).fill(0);
    const productMap=new Map(),areaMonth=new Map();let total=0,units=0,count=0;
    if(start<=end){
      for(let i=0;i<D.rows.length;i++){
        const r=D.rows[i]; const [w,a,s,b,p,v,u]=r;
        if(!validWeek(w)||(region!==null&&a!==region)||(segment!==null&&s!==segment)||(brand!==null&&b!==brand))continue;
        total+=v;units+=u;count++;byWeek[w]+=v;weekCount[w]++;byRegion[a]+=v;bySegment[s]+=v;byBrand[b]+=v;
        let prod=productMap.get(p);if(!prod){prod={p,value:0,units:0,records:0};productMap.set(p,prod)}
        prod.value+=v;prod.units+=u;prod.records++;
        const key=a+'|'+D.weeks[w].date.slice(0,7);areaMonth.set(key,(areaMonth.get(key)||0)+v);
      }
    }
    const timeline=D.weeks.map((w,i)=>({...w,i,value:byWeek[i],records:weekCount[i]})).filter(w=>validWeek(w.i));
    const weeksWithRecords=timeline.filter(w=>w.records>0);
    const pList=[...productMap.values()].sort((a,b)=>b.value-a.value);
    return {total,units,count,sku:productMap.size,byWeek,weekCount,byRegion,bySegment,byBrand,productMap,pList,areaMonth,timeline,weeksWithRecords,weekAverage:weeksWithRecords.length?total/weeksWithRecords.length:0};
  }
  function recalculate(){results=compute();renderOverview();renderPortfolio();renderTerritories();renderScenario();renderAudit();const scope=results;
    const from=scope.timeline[0]?.label??'—',to=scope.timeline.at(-1)?.label??'—';
    const inverted=active.from!==''&&active.to!==''&&Number(active.from)>Number(active.to);
    $('scope').textContent=inverted?'Rango de semanas invertido: «Semana desde» es posterior a «Semana hasta». Corrige el periodo o restablece los filtros.':`${integer(scope.count)} registros · ${integer(scope.sku)} productos · ${scope.weeksWithRecords.length} semanas con registros · ${from} a ${to}`;
  }
  function topRanks(values,n=Infinity){return values.map((value,index)=>({index,value})).filter(row=>row.value>0).sort((a,b)=>b.value-a.value).slice(0,n)}
  function bars(target,values,labels,{limit=Infinity,dimension=null,selected=null,showShare=false}={}){
    const list=topRanks(values,limit); const max=list[0]?.value||1;
    if(!list.length){$(target).innerHTML='<div class="empty">Sin ventas para los filtros elegidos.</div>';return}
    $(target).innerHTML=list.map((o)=>{const share=showShare?percentage(o.value,results.total):compact(o.value);const label=esc(labels[o.index]);const cls='baritem'; const detail=`${labels[o.index]}: ${money(o.value)} · ${percentage(o.value,results.total)}`;
      return `<button type="button" class="${cls}${selected===String(o.index)?' selected':''}" ${dimension?`data-dim="${dimension}" data-index="${o.index}" aria-pressed="${selected===String(o.index)}"`:''} title="${esc(detail)}"><span class="bar-name">${label}</span><span class="bartrack"><span class="barprogress" style="width:${Math.max(1,100*o.value/max).toFixed(4)}%"></span></span><span class="bar-num">${share}</span></button>`
    }).join('');
    if(dimension)$(target).querySelectorAll('button[data-dim]').forEach(el=>el.addEventListener('click',()=>chooseDimension(el.dataset.dim,Number(el.dataset.index))));
  }
  function drawLine(target,timeline){
    const svg=$(target); if(!timeline.length){svg.innerHTML='<text x="490" y="130" text-anchor="middle" class="axislabel">Sin semanas para el periodo seleccionado</text>';return}
    const W=Math.max(280, Math.round(svg.getBoundingClientRect().width)),H=260;const left=W<520?49:70,right=W<520?8:18,top=18,bottom=38;const w=W-left-right,h=H-top-bottom;svg.setAttribute("viewBox",`0 0 ${W} ${H}`);
    const max=Math.max(...timeline.map(r=>r.value),1),ceiling=max*1.12;
    const x=i=>left+(timeline.length===1?w/2:i*w/(timeline.length-1));const y=v=>top+h-(v/ceiling)*h;
    const grid=Array.from({length:5},(_,i)=>{const val=ceiling*i/4,py=y(val);return `<line class="gridline" x1="${left}" x2="${W-right}" y1="${py}" y2="${py}"/><text class="axislabel" x="${left-10}" y="${py+4}" text-anchor="end">${compact(val)}</text>`}).join('');
    const coords=timeline.map((r,i)=>[x(i),y(r.value)]);
    const line=coords.map(([a,b],i)=>(i?'L':'M')+a.toFixed(2)+' '+b.toFixed(2)).join(' ');
    const fill=line+` L ${coords.at(-1)[0].toFixed(2)} ${top+h} L ${coords[0][0].toFixed(2)} ${top+h} Z`;
    const positions=W<520?[0,.5,1]:[0,.25,.5,.75,1];const indices=positions.map(v=>Math.floor((timeline.length-1)*v)).filter((x,i,arr)=>arr.indexOf(x)===i);
    const ticks=indices.map(i=>`<text class="axislabel" x="${x(i)}" y="${H-11}" text-anchor="middle">${esc(timeline[i].label)}</text>`).join('');
    const points=timeline.map((r,i)=>`<circle class="plotpoint" cx="${x(i)}" cy="${y(r.value)}" r="${timeline.length>40?2.7:4.7}" aria-label="${esc(r.label)}: ${money(r.value)}"><title>Semana ${esc(r.label)} · ${esc(r.date)} · ${money(r.value)} en valor</title></circle>`).join('');
    svg.innerHTML=grid+`<path class="plotfill" d="${fill}"/><path class="plotline" d="${line}"/>`+points+ticks;
  }
  function renderOverview(){const r=results;
    $('kSales').textContent=money(r.total);$('kUnits').textContent=number(r.units);$('kProducts').textContent=integer(r.sku);$('kAverage').textContent=money(r.weekAverage);
    $('weeksLabel').textContent=r.weeksWithRecords.length+' semanas observadas';drawLine('chartWeekly',r.timeline);
    bars('chartSegments',r.bySegment,D.segments,{dimension:'segment',selected:active.segment});bars('chartAreas',r.byRegion,D.regions,{dimension:'region',selected:active.region});
    const seg=topRanks(r.bySegment,1)[0],reg=topRanks(r.byRegion,1)[0],bra=topRanks(r.byBrand,1)[0];
    $('insightSegment').textContent=seg?D.segments[seg.index]:'—';$('insightRegion').textContent=reg?D.regions[reg.index]:'—';$('insightBrand').textContent=bra?D.brands[bra.index]:'—';
    $('insightNarrative').innerHTML=r.count?`<strong>Concentración observada.</strong> El segmento <strong>${esc(D.segments[seg.index])}</strong> representa ${percentage(seg.value,r.total)} del valor del periodo filtrado. <strong>${esc(D.regions[reg.index])}</strong> es el área de mayor aporte (${percentage(reg.value,r.total)}); la marca líder es <strong>${esc(D.brands[bra.index])}</strong>. Son descripciones, no estimaciones causales.`:'No hay registros que coincidan con los filtros. Ajusta el periodo o las dimensiones para continuar.';
  }
  function renderPortfolio(){bars('chartBrands',results.byBrand,D.brands,{limit:10,dimension:'brand',selected:active.brand});bars('segmentDetail',results.bySegment,D.segments,{dimension:'segment',selected:active.segment,showShare:true});renderTable()}
  function renderTable(){const r=results;if(!r)return;const q=$('productSearch').value.trim().toLocaleLowerCase('es-MX');
    const list=r.pList.filter(item=>{const meta=D.products[item.p];return !q||(meta.name+' '+meta.code).toLocaleLowerCase('es-MX').includes(q)}).sort((a,b)=>productSort==='unidades'?b.units-a.units:b.value-a.value);
    $('tableCount').textContent=integer(list.length)+' productos';$('tableHint').textContent=productSort==='unidades'?'Ordenado por unidades':'Ordenado por valor';
    document.querySelectorAll('[data-sort]').forEach(th=>{const on=th.dataset.sort===productSort;th.setAttribute('aria-sort',on?'descending':'none');th.textContent=th.dataset.label+(on?' ↓':'')});
    $('productRows').innerHTML=list.slice(0,25).map((row,i)=>{const p=D.products[row.p];return `<tr><td>${i+1}</td><td class="prod"><strong>${esc(p.name)}</strong><div class="mono">${esc(p.code)}</div></td><td>${esc(D.brands[p.brand])}</td><td>${esc(D.segments[p.segment])}</td><td class="num">${money(row.value)}</td><td class="num">${number(row.units)}</td><td class="num">${percentage(row.value,r.total)}</td></tr>`}).join('')||'<tr><td colspan="7" class="empty">No hay productos para esta búsqueda.</td></tr>';
  }
  function renderTerritories(){const r=results;const vals=topRanks(r.byRegion);$('areaCards').innerHTML=vals.map(({index,value})=>`<button type="button" class="area-card" data-area="${index}" title="Filtrar por ${esc(D.regions[index])}"><span class="area-n">${esc(D.regions[index])}</span><span class="area-v">${money(value)}</span><span class="area-p">${percentage(value,r.total)} del valor filtrado</span><div class="progress"><i style="width:${100*value/(vals[0]?.value||1)}%"></i></div></button>`).join('')||'<div class="empty">No se registran áreas en esta selección.</div>';
    $('areaCards').querySelectorAll('[data-area]').forEach(el=>el.addEventListener('click',()=>chooseDimension('region',Number(el.dataset.area))));
    const months=[...new Set(r.timeline.map(w=>w.date.slice(0,7)))].sort();
    if(!months.length){$('heatmap').innerHTML='<div class="empty">No hay meses disponibles.</div>';return}
    const areaIdx=D.regions.map((_,i)=>i).filter(i=>active.region===''||i===Number(active.region));
    const valsAll=areaIdx.flatMap(a=>months.map(month=>r.areaMonth.get(a+'|'+month)||0));const max=Math.max(...valsAll,1);
    const head='<thead><tr><th>Área / Mes</th>'+months.map(x=>`<th title="${x}">${esc(x.slice(2))}</th>`).join('')+'</tr></thead>';
    const body='<tbody>'+areaIdx.map(a=>`<tr><td>${esc(D.regions[a])}</td>`+months.map(month=>{const val=r.areaMonth.get(a+'|'+month)||0;const alpha=val/max;
      const bg=val===0?'#f1f4f7':`rgba(12,128,142,${(.13+.75*alpha).toFixed(3)})`;const fg=alpha>.56?'white':'#0f3442';
      return `<td style="background:${bg};color:${fg}" title="${esc(D.regions[a])} · ${month}: ${money(val)}">${val?compactShort(val):'—'}</td>`}).join('')+'</tr>').join('')+'</tbody>';
    $('heatmap').innerHTML=`<table class="heat" aria-label="Mapa de calor del valor de ventas por área y mes">${head}${body}</table>`;
  }
  function renderScenario(){const r=results;if(!r)return;const w=Number($('scenarioWindow').value),h=Number($('scenarioHorizon').value),p=Number($('scenarioPct').value)/100;
    $('scenarioPctLabel').textContent='±'+integer(100*p)+' %';const observed=r.weeksWithRecords.slice(-w),sum=observed.reduce((t,item)=>t+item.value,0);const baseline=observed.length?sum/observed.length:0;
    const base=baseline*h,low=base*(1-p),high=base*(1+p);
    $('scenarioLow').textContent=money(low);$('scenarioBase').textContent=money(base);$('scenarioHigh').textContent=money(high);
    $('scenarioLowDetail').textContent=`${h} semanas · ${integer(100*p)} % bajo la base`;
    $('scenarioBaseDetail').textContent=`${h} semanas · ${money(baseline)} por semana`;
    $('scenarioHighDetail').textContent=`${h} semanas · ${integer(100*p)} % sobre la base`;
    const max=Math.max(high,1); const series=[['Conservador',low,'#b18b55'],['Base',base,'#148e92'],['Optimista',high,'#1f76bc']];
    $('scenarioBars').innerHTML=series.map(([label,val,color])=>`<div class="scenario-line"><strong>${label}</strong><span class="track"><span class="fill" style="width:${(val/max*100).toFixed(3)}%;background:${color}"></span></span><span style="text-align:right;font-variant-numeric:tabular-nums">${compact(val)}</span></div>`).join('');
    $('scenarioNote').innerHTML=`<strong>Base de cálculo:</strong> ${observed.length} semanas observadas (ventana solicitada: ${w}). Promedio semanal de ${money(baseline)}, multiplicado por un horizonte hipotético de ${h} semanas. La simulación respeta los filtros globales y NO incorpora estacionalidad, incertidumbre ni información posterior a la última semana seleccionada.`;
  }
  function renderAudit(){
    const f=D.profile;
    const rows=[
      ['Origen de datos','<span class="ok">Escenario sintético y reproducible</span>'],
      ['Registros comerciales',integer(f.rows)],
      ['Semanas disponibles',integer(f.weeks)],
      ['Productos en catálogo',integer(f.products)],
      ['Áreas comerciales',integer(f.regions)],
      ['Marcas del catálogo',integer(f.brands)],
      ['Segmentos de producto',integer(f.segments)],
      ['Valor total simulado',money(f.sales_value)],
      ['Unidades simuladas',number(f.sales_units)],
      ['Periodo disponible',esc(f.start_date)+' → '+esc(f.end_date)],
      ['Semilla de reproducibilidad',integer(f.seed)],
      ['SHA-256 del dataset',`<span class="mono" style="font-size:10px;word-break:break-all">${esc(D.sha256_csv)}</span>`],
      ['Conexión al servidor','<span class="ok">No requerida: cálculo en el navegador</span>'],
      ['Unidad monetaria','Unidades de valor simuladas, no moneda real']
    ];
    $('auditRows').innerHTML=rows.map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('');
  }
  function exportCSV(){if(!results)return;const list=results.pList.slice().sort((a,b)=>b.value-a.value);
    const csv=[['ITEM_CODE','PRODUCTO','MARCA','SEGMENTO','VENTAS_VALOR','VENTAS_UNIDADES','PARTICIPACION_PCT','REGISTROS'].join(',')];
    function quote(value){const txt=String(value??'');return /[",\n\r]/.test(txt)?'"'+txt.replace(/"/g,'""')+'"':txt}
    for(const row of list){const p=D.products[row.p];csv.push([p.code,p.name,D.brands[p.brand],D.segments[p.segment],row.value.toFixed(4),row.units.toFixed(4),(results.total?100*row.value/results.total:0).toFixed(4),row.records].map(quote).join(','))}
    const blob=new Blob(['\ufeff'+csv.join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='kriter_productos_filtrados.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  recalculate();
})();
