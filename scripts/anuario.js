/* ---------- modal anuario (ventana suelta: una canción → Mejor / Mención) ---------- */
const anuCatIc_=c=>c==="doblaje"?"🎙️":c==="canto"?"🎤":"🥇";
/* Campos de la tarjeta del Anuario donde viven las líneas. «grupales» es una categoría aparte: NO cuenta como medalla (ver MEDALLAS_DEF en index.html). */
const ANU_CAMPOS_=["ganadorCanto","ganadorDoblaje","mencionesHonorificas","grupales"];
/* Botón elegido → destino que entiende el backend */
const anuDestino_=(p,cat)=>p==="mencion"?"mencion":p==="grupal"?"grupal":(cat==="doblaje"?"doblaje":"cancion");
/* Tarjeta de canción: título + usuario, y los botones «Mejor» (según canto/doblaje) y «Mención» */
function anuSongCardHTML_(s,cat,key,pick,done){
  const t=String(s.detalle||"").trim(), u=String(s.nombreUsuario||"").replace(/@/g,"");
  return `<div class="sg-card${pick?" on-"+pick:""}" data-key="${escAttr(key)}"><div><b>${escHtml(t||u||"Entrega")}</b>${t?`<small>${escHtml(u)}</small>`:""}${done?`<span class="sg-done">✓ ya está en el anuario</span>`:""}</div>
    <div class="sg-btns"><button type="button" data-k="mejor" class="${pick==="mejor"?"on":""}">${anuCatIc_(cat)} Mejor</button><button type="button" data-k="mencion" class="${pick==="mencion"?"on":""}">✨ Mención</button><button type="button" data-k="grupal" class="${pick==="grupal"?"on":""}">👥 Grupal</button></div></div>`;
}
/* Guardado en segundo plano: las canciones que se mandan quedan en una cola (una a la vez, en orden, para que no se pisen)
   y mientras tanto se puede seguir añadiendo. _anuPend recuerda las que van en camino para marcarlas como «ya está». */
const _anuPend=new Map(); /* clave → cuántos envíos pendientes la incluyen */
let _anuLotes=[], _anuCorriendo=false;
const anuItemKey_=it=>String(it.nombreUsuario||"").trim()+"|"+String(it.detalle||"").trim();
const anuPendMas_=(items,d)=>items.forEach(it=>{ const k=anuItemKey_(it), n=(_anuPend.get(k)||0)+d; if(n>0) _anuPend.set(k,n); else _anuPend.delete(k); });
function anuEncolar_(items,anchorId,nombre){
  anuPendMas_(items,1);
  _anuLotes.push({items,anchorId,nombre:nombre||""});
  toast(_anuCorriendo?`En cola (${_anuLotes.length}) — puedes seguir añadiendo ⏳`:`Guardando en segundo plano… puedes seguir añadiendo ⏳`);
  if(!_anuCorriendo) anuProcesar_();
}
/* Procesa los envíos UNO A LA VEZ. Si hay varios esperando para la MISMA actividad (la misma tarjeta), se juntan en un solo envío
   (antes salían como varias peticiones seguidas a la misma tarjeta y podían pisarse). Si un envío falla, se vuelve a leer el anuario,
   se reintenta SOLO lo que no quedó guardado y, si aun así no entra, el aviso se queda en pantalla varios segundos. */
async function anuProcesar_(){
  _anuCorriendo=true;
  try{
    while(_anuLotes.length){
      const lote=_anuLotes.shift(), vistos=new Set(), items=[], aSoltar=[...lote.items];
      const juntar=L=>L.forEach(it=>{ const k=anuItemKey_(it)+"|"+it.destino; if(!vistos.has(k)){ vistos.add(k); items.push(it); } });
      juntar(lote.items); let nombre=lote.nombre;
      for(let i=0;i<_anuLotes.length;){ const o=_anuLotes[i];
        if(String(o.anchorId)===String(lote.anchorId)){ juntar(o.items); aSoltar.push(...o.items); if(o.nombre&&!nombre) nombre=o.nombre; _anuLotes.splice(i,1); } else i++; }
      let ok=false; try{ ok=await anuEnviar_(items,lote.anchorId,nombre,"",true); }catch(_){ ok=false; }
      let faltan=[];
      if(!ok){
        const ya=anuYaSet_(true); faltan=items.filter(it=>!ya.has(anuItemKey_(it))); /* anuEnviar_ ya recargó los datos */
        if(!faltan.length) ok=true;
        else{ toast("Reintentando guardar… ⏳"); try{ ok=await anuEnviar_(faltan,lote.anchorId,nombre,"",true); }catch(_){ ok=false; } if(ok) faltan=[]; }
      }
      anuPendMas_(aSoltar,-1);
      if(ok) toast(_anuLotes.length?"Agregado 👑 · guardando el resto…":"Agregado al Anuario 👑");
      else toast(`⚠️ No se guardaron ${faltan.length} canción(es): `+faltan.slice(0,3).map(it=>String(it.detalle||it.nombreUsuario||"").trim()||"entrega").join(", ")+(faltan.length>3?"…":"")+". Revisa tu conexión y vuelve a añadirlas.",8000);
    }
  } finally{ _anuCorriendo=false; }
}
/* Líneas ya guardadas en el anuario, para avisar si una canción ya está (sinPend=true: solo lo que ya está guardado de verdad) */
function anuYaSet_(sinPend){
  const s=new Set(sinPend?[]:_anuPend.keys()); (DB.anuario||[]).forEach(r=>ANU_CAMPOS_.forEach(k=>parseWinnerLines(r[k]).forEach(w=>s.add(String(w.nombre).trim()+"|"+String(w.detalle).trim()))));
  return s;
}
/* Agrega una o varias canciones en UNA sola tarjeta (la de la primera actividad) y, si hace falta, le pone el nombre elegido */
async function anuEnviar_(items,anchorId,nombre,idAnuario,silencioso){
  const nm=String(nombre||"").trim();
  let r=await apiPost({action:"addToAnuarioLote",idActividad:anchorId,items,nombre:nm,idAnuario:idAnuario||""},items.length>1?`Guardando ${items.length} canciones en el Anuario...`:"Agregando al Anuario...",silencioso);
  if(!r.ok&&/acci[oó]n|action|desconoc/i.test(String(r.error||""))){ // backend viejo sin «lote»: modo uno por uno
    for(let i=0;i<items.length;i++){ const it=items[i];
      r=await apiPost({action:"addToAnuario",idActividad:anchorId,destino:it.destino,nombreUsuario:it.nombreUsuario,detalle:it.detalle,link:it.link},`Agregando al Anuario (${i+1}/${items.length})...`,silencioso);
      if(!r.ok) break; }
    if(r.ok&&nm){ await cargarDatos(); const row=(DB.anuario||[]).find(x=>String(x.id)===String(anchorId))||(DB.anuario||[])[(DB.anuario||[]).length-1];
      if(row&&String(row.titulo||"").trim()!==nm){ const data=datosActividadParaGuardar(row,row.imagenUrl||""); data.titulo=nm; data.id=row.id; await apiPost({action:"editAnuario",data},"Guardando el nombre...",silencioso); } } }
  if(!r.ok){ toast("Error: "+(r.error||"")); await cargarDatos(); return false; }
  await cargarDatos();
  return true;
}
function abrirModalAnuario(idActividad,titulo,nombreUsuario,detalle,link){
  anuarioCtx={idActividad,nombreUsuario,detalle,link};
  const act=(DB.actividades||[]).find(a=>String(a.id)===String(idActividad)), cat=act&&act.categoria;
  const ov=document.getElementById("anuarioModal"), v=document.getElementById("viewAnuario");
  ov.classList.toggle("anu-light",!!v&&!v.classList.contains("hidden"));
  document.getElementById("anuarioModalInfo").innerHTML=`<span class="am-lbl">Actividad</span><span class="am-act">${escHtml(titulo)}</span><span class="am-help">Elige cómo entra esta entrega al Anuario</span>`;
  const box=document.getElementById("anuarioModalSong");
  box.innerHTML=anuSongCardHTML_({nombreUsuario,detalle},cat,"x","",anuYaSet_().has(String(nombreUsuario).trim()+"|"+String(detalle).trim()));
  box.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{
    anuEncolar_([{destino:anuDestino_(b.dataset.k,cat),nombreUsuario,detalle,link}],idActividad,""); /* en segundo plano: se cierra y se puede seguir */
    closeModal("anuarioModal");
  });
  openModal("anuarioModal");
}

/* ---------- anuario v6: portada, índice, administración y meses ---------- */
/* Los fondos viven en la carpeta Anuario/ del repo (anuario-fondo-vertical.webp / anuario-fondo-horizontal.webp). */
const ANU_BG="Anuario/anuario-fondo-vertical.webp", ANU_BGH="Anuario/anuario-fondo-horizontal.webp";
const ANU_COLORES=["#f37021","#4a7bf7","#e8363d","#3e2468","#2e9e4f","#d6277f"];
const TIPO_={canto:{t:"Canto",e:"🎤"},doblaje:{t:"Doblaje",e:"🎙️"}};
const CH_L='<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CH_R=CH_L.replace("M15 5l-7 7 7 7","M9 5l7 7-7 7");
const ANU_CROWN='<svg class="anu-crown" viewBox="-6 -10 92 64" aria-hidden="true"><g stroke="#2a1745" stroke-width="2.6" stroke-linecap="round"><path d="M6 14 0 10M18 6l-3-7M62 6l3-7M74 14l6-4M40 -2v-6" fill="none"/><path d="M14 46 8 18l15 12 17-22 17 22 15-12-6 28Z" fill="#ffd23f" stroke-linejoin="round"/><circle cx="8" cy="16" r="4" fill="#ffd23f"/><circle cx="40" cy="6" r="4" fill="#ffd23f"/><circle cx="72" cy="16" r="4" fill="#ffd23f"/></g></svg>';
const ANU_CROWN2='<svg class="anu-crown2" viewBox="-25 -8 145 70" aria-hidden="true"><g fill="none" stroke="#2a1745" stroke-width="2" stroke-linecap="round"><path d="M-10 8l9 5M-21 32l14 2M29 -2l2 9M66 -4l1 8M94 4l8 4M106 24l9 1M105 40l6 1"/></g><g stroke="#2a1745" stroke-width="1.8" stroke-linejoin="round"><path d="M14 54L7.5 22 31 39 52 17 73 39 91 22 84 55Z" fill="#ffd23f"/><g fill="#ffe45c"><circle cx="7.5" cy="21" r="4.6"/><circle cx="52" cy="16" r="4.6"/><circle cx="91" cy="21" r="4.6"/></g></g><g fill="#fff6b0"><circle cx="6.2" cy="19.6" r="1.2"/><circle cx="50.7" cy="14.6" r="1.2"/><circle cx="89.7" cy="19.6" r="1.2"/></g></svg>';
const anuRol_=(id,t)=>`<svg class="anu-rol" viewBox="0 0 100 50" aria-hidden="true"><path id="rol${escAttr(id)}" d="M5 34Q50 22 95 34" fill="none"/><text class="t1"><textPath href="#rol${escAttr(id)}" startOffset="50%" text-anchor="middle">${t}</textPath></text><text class="t2"><textPath href="#rol${escAttr(id)}" startOffset="50%" text-anchor="middle">${t}</textPath></text></svg>`;
const ANU_DEFS='<svg width="0" height="0" style="position:absolute" aria-hidden="true"><linearGradient id="anuLg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#78bb50"/><stop offset="1" stop-color="#b9de8a"/></linearGradient><symbol id="anuLeaf" viewBox="0 0 60 60"><path d="M4 46C2 26 16 12 34 12c0 20-12 34-30 34Z" fill="#a5d36a" stroke="#2a1745" stroke-width="1.6"/><path d="M24 32C24 16 34 6 50 6c0 16-10 26-26 26Z" fill="#7fbf5a" stroke="#2a1745" stroke-width="1.6"/></symbol></svg>';
const anuS={pi:0,key:null,act:null,v:"portada",per:[]};
const $a=id=>document.getElementById(id), pad=n=>String(n).padStart(2,"0");
const anuDesk_=()=>matchMedia("(min-width:900px)").matches;
const anuReduce_=()=>matchMedia("(prefers-reduced-motion:reduce)").matches;
const medHeader_=()=>document.documentElement.style.setProperty("--hh",(document.querySelector("header")?.offsetHeight||64)+"px");
addEventListener("resize",medHeader_);

/* ---------- CONECTAR: tarjeta del miembro ----------
   Tocar un miembro dispara este evento. Para conectarlo:
   document.addEventListener("anuario:miembro",e=>openMemberCard(e.detail.id)); */
function anuAbrirMiembro_(id){ document.dispatchEvent(new CustomEvent("anuario:miembro",{detail:{id}})); }

/* ---------- Marco de miembro (corona, laurel, etiqueta y nombre) ---------- */
const anuMix_=(c,p)=>`color-mix(in srgb,${c} ${p}%,#fff)`;
function anuWreath_(c){
  const lf=(a,r,L,W,fa,off)=>{ const t=a*Math.PI/180;
    return `<path d="M0 ${-L}C${W} ${-L/2} ${W} ${L/2} 0 ${L}C${-W} ${L/2} ${-W} ${-L/2} 0 ${-L}Z" transform="translate(${(50+r*Math.cos(t)).toFixed(1)} ${(50+r*Math.sin(t)).toFixed(1)}) rotate(${(a+off).toFixed(0)})" style="fill:${anuMix_(c,fa)};stroke:${c};stroke-width:.7"/>`; };
  let s=""; for(let k=0;k<13;k++) s+=lf(24+k*10.8,47,8.5,3.2,35,k%2?125:55);
  for(let k=0;k<9;k++) s+=lf(34+k*12.5,41,5.5,2.2,60,k%2?120:60);
  return `<svg class="anu-wr" viewBox="0 0 100 100" aria-hidden="true">${s}</svg>`;
}
/* brote de dos hojas, con la base metida detrás del círculo (arriba a la izquierda) */
const anuSprout_=()=>{ const h=(rot,L,W)=>`<g transform="translate(18 18) rotate(${rot})"><path d="M0 0C${W} ${-L*.25} ${W} ${-L*.75} 0 ${-L}C${-W} ${-L*.75} ${-W} ${-L*.25} 0 0Z" fill="url(#anuLg)"/><path d="M0 -2V${-L*.78}" stroke="#dcf1b8" stroke-width=".9" stroke-linecap="round" fill="none"/></g>`;
  return `<svg class="anu-sp" viewBox="0 0 100 100" aria-hidden="true">${h(-80,30,10)}${h(24,36,12)}</svg>`; };
const anuArc_=(id,t)=>`<svg class="anu-arc" viewBox="0 0 100 100" aria-hidden="true"><path id="arc${escAttr(id)}" d="M2.2 45.8A48 48 0 0 1 97.8 45.8" fill="none"/><text class="t1" textLength="${(t.length*15.6).toFixed(0)}" lengthAdjust="spacing"><textPath href="#arc${escAttr(id)}" startOffset="50%" text-anchor="middle">${t}</textPath></text><text class="t2" textLength="${(t.length*15.6).toFixed(0)}" lengthAdjust="spacing"><textPath href="#arc${escAttr(id)}" startOffset="50%" text-anchor="middle">${t}</textPath></text></svg>`;
const anuIsF_=m=>esTrue(m.fundadora)||esTrue(m.fundador);
const anuFundEt_=m=>(anuKey_(m.nombre).includes("eryck")||(esTrue(m.fundador)&&!esTrue(m.fundadora)))?"Fundador":"Fundadora";
const anuRolDe_=m=>anuIsF_(m)?"f":esTrue(m.lider)?"a":esTrue(m.staff)?"s":null;
function anuStaffIdx_(m){ const q=anuEquipo_((anuP_()||{}).anio), o=[...q.f,...q.s]; return Math.max(0,o.findIndex(x=>String(x.id)===String(m.id))); }
/* Color favorito de cada integrante del equipo (manda sobre el color de la base de datos). Se busca por el nombre sin símbolos ni mayúsculas. */
const ANU_COLOR_FAV_=[["alix","#ff1493"],["eryck","#7b3fc4"],["demon","#f472b6"],["anacoffee","#2f6df0"],["ragna","#e0252d"],["rcc39","#27b0e6"],["rec","#27b0e6",1],
  ["cazador","#e0252d"],["cami","#27b0e6",2],["wagner","#7b3fc4"],["krys","#7b3fc4"]]; /* 1 = nombre exacto · 2 = debe empezar así */
const anuColorFav_=nm=>{ const k=anuKey_(nm); if(!k) return null;
  const h=ANU_COLOR_FAV_.find(([t,,md])=>md===1?k===t:md===2?k.startsWith(t):k.includes(t)); return h?h[1]:null; };
function anuFrame_(m,rol,i){
  const c=anuColorFav_(m.nombre)||m.color||(rol==="f"?"#d6277f":ANU_COLORES[i%ANU_COLORES.length]);
  const et=rol==="f"?anuFundEt_(m):"Staff"; /* todos los que no son fundadores son Staff (ya no hay rótulo aparte de Admin) */
  return {c,et,html:`<span class="anu-av">${rol==="f"?"":anuSprout_()}${anuWreath_(c)}${avatarImgTag(m)}${rol==="f"?ANU_CROWN2+anuArc_("m"+m.id,et.toUpperCase()):anuRol_("m"+m.id,et)}</span>`};
}
function anuMiembro_(m,rol,i){
  const {c,et,html}=anuFrame_(m,rol,i);
  return `<button type="button" class="anu-m${rol==="f"?" f":""}" data-miembro="${escAttr(m.id)}" style="--pc:${c};--nl:${Math.max(6,[...String(m.nombre||"")].length)};--i:${Math.min(i,14)}" aria-label="${et}: ${escAttr(m.nombre||"")}">${html}<span class="anu-pn">${escHtml(m.nombre||"")}</span></button>`;
}
/* Equipo de la página 00 por año. 2025 se arma con esta lista (ese año no existía el rango de admin); los demás años salen de las marcas de DB.miembros.
   Cada nombre se busca en DB.miembros para usar su foto y su ficha; si alguien no aparece ahí, igual se muestra (con la foto por defecto) para que nunca falte nadie. */
const ANU_EQUIPO_={2025:{f:[["AlixTKM","alix"],"Itx_Eryck"],s:["demonnoirexd","anacoffee","RagnaBelzzerion",["RcC39","rec"]]}}; /* [nombre que se muestra, nombre con el que aparece en DB.miembros] */
function anuBuscar_(nombre,alias){
  const L=(DB.miembros||[]).filter(x=>x.nombre&&String(x.nombre).trim()!==""), k=anuKey_(nombre); if(!k) return null;
  const ka=anuKey_(alias||""), exacto=L.find(x=>anuKey_(x.nombre)===k)||(ka&&L.find(x=>anuKey_(x.nombre)===ka)); if(exacto) return exacto;
  const toks=String(nombre).split(/[^A-Za-z0-9]+/).map(anuKey_).filter(t=>t.length>=5); /* «Itx_Eryck» → «eryck» */
  return L.find(x=>{ const a=anuKey_(x.nombre); return a.length>=5&&(a.includes(k)||k.includes(a)||toks.some(t=>a.includes(t))); })||null;
}
function anuEquipo_(anio){
  const L=(DB.miembros||[]).filter(m=>m.nombre&&String(m.nombre).trim()!==""), vistos=new Set();
  const unicos=A=>A.filter(m=>{ const k=anuKey_(m.nombre); if(!k||vistos.has(k)) return false; vistos.add(k); return true; }); /* nadie aparece dos veces */
  const fijo=ANU_EQUIPO_[anio];
  if(fijo){
    const arma=(e,esF)=>{ const n=Array.isArray(e)?e[0]:e, m=anuBuscar_(n,Array.isArray(e)?e[1]:""); return m?{...m,nombre:n}:{id:"anu"+anio+"-"+anuKey_(n),nombre:n,...(esF?{fundadora:true}:{})}; };
    return {f:unicos(fijo.f.map(n=>arma(n,true))),s:unicos(fijo.s.map(n=>arma(n,false)))};
  }
  const f=unicos(L.filter(anuIsF_));
  const s=unicos([...L.filter(m=>esTrue(m.lider)&&!anuIsF_(m)),...L.filter(m=>esTrue(m.staff)&&!anuIsF_(m)&&!esTrue(m.lider))]);
  return {f,s};
}
function anuAdminHTML_(){
  const {f,s}=anuEquipo_(anuP_().anio); let i=0;
  /* Fundadores arriba y todo el staff junto en un solo grupo; todos quedan siempre a la vista (sin recortes ni scroll interno) */
  const sec=(cls,rot,L)=>L.length?`<section class="adm-sec ${cls}"><div class="adm-row ${cls}">${L.map(m=>anuMiembro_(m,rot,i++)).join("")}</div></section>`:"";
  return `<div class="det-h sm adm-h"><h2>Fundadores y Staff</h2></div><div class="adm">${sec("f","f",f)}${sec("s","s",s)}</div>`;
}

/* ---------- Actividades del anuario (datos reales: DB.anuario / DB.actividades / DB.entregas) ---------- */
const anuFecha_=f=>{ const y=toDateInput(f); return new Date(y?y+"T12:00:00":NaN); };
const anuTag_=tp=>{ const x=TIPO_[tp]||{t:"Especial",e:"✨"}; return `<span class="anu-tag tg-${tp}">${x.e} ${x.t}</span>`; };
/* Cada fila de DB.anuario = una tarjeta (una actividad con sus ganadores) */
function anuNorm_(e){
  const tipos=[]; const add=t=>{ if(t&&!tipos.includes(t)) tipos.push(t); };
  if(e.ganadorCanto) add("canto"); if(e.ganadorDoblaje) add("doblaje");
  if(!tipos.length&&(e.categoria==="canto"||e.categoria==="doblaje")) add(e.categoria);
  return {e,f:e.fechaInicio,titulo:e.titulo||"Actividad",tipos:tipos.sort((a,b)=>rankCategoria(a)-rankCategoria(b)),imgs:e.imagenUrl?[e.imagenUrl]:[]};
}
function anuFechaTarjeta_(e){
  const directa=anuFecha_(e.fechaInicio); if(!isNaN(directa)) return directa;
  const lineas=ANU_CAMPOS_.flatMap(k=>parseWinnerLines(e[k]));
  const fechas=anuActsDe_(e,lineas).map(a=>anuFecha_(a.fechaInicio)).filter(d=>!isNaN(d)).sort((a,b)=>a-b);
  return fechas[0]||null;
}
/* Mensual = actividad marcada como obligatoria (⚠️ Oficial). Se toma de la propia tarjeta o de las actividades a las que pertenece. */
function anuEsMensual_(e){
  const ob=v=>String(v||"").trim().toLowerCase()==="obligatoria";
  if(ob(e.participacion)) return true;
  try{ return anuActsDe_(e,ANU_CAMPOS_.flatMap(k=>parseWinnerLines(e[k]))).some(a=>ob(a.participacion)); }catch(_){ return false; }
}
function anuBuild_(){
  const it=[]; (DB.anuario||[]).forEach(e=>{ const n=anuNorm_(e), d=anuFechaTarjeta_(e); if(!d) return;
    it.push({n,mensual:anuEsMensual_(n.e),anio:d.getFullYear(),mes:d.getMonth(),dia:d.getDate(),sem:["dom","lun","mar","mié","jue","vie","sáb"][d.getDay()],t:d.getTime()}); });
  const anios=[...new Set([2025,...it.map(x=>x.anio)])]; if(!it.length&&!anios.includes(new Date().getFullYear())) anios.push(new Date().getFullYear()); anios.sort((x,y)=>x-y);
  anuS.per=anios.map(y=>{
    const ms=y===2026?[...new Set([7,8,9,10,11,...it.filter(x=>x.anio===y).map(x=>x.mes)])].sort((a,b)=>a-b):Array.from({length:12},(_,i)=>i);
    const p={anio:y,titulo:String(y),tema:y===2026?"p":"o",admin:y===2025||y===2026};
    p.cuenta=ms.map(m=>({m,items:it.filter(x=>x.anio===y&&x.mes===m).sort((a,b)=>(b.mensual-a.mensual)||a.t-b.t||rankCategoria(a.n.e.categoria)-rankCategoria(b.n.e.categoria))})); p.n=p.cuenta.reduce((s,c)=>s+c.items.length,0); return p; });
}
const anuP_=()=>anuS.per[anuS.pi];
const anuRows_=p=>[...(p.admin?[{k:"admin",b:"00",t:"Administradores",n:1}]:[]),...p.cuenta.map(c=>({k:p.anio+"-"+c.m,b:pad(c.m+1),t:MESES_LARGO[c.m],n:c.items.length}))];
const anuFirst_=()=>(anuRows_(anuP_()).find(r=>r.n)||{}).k||null;
function anuWinBadges_(e){
  const b=parseWinnerLines(e.ganadorCanto).length+parseWinnerLines(e.ganadorDoblaje).length, m=parseWinnerLines(e.mencionesHonorificas).length, g=parseWinnerLines(e.grupales).length;
  return (b||m||g)?`<span class="anu-win">${b?`<i class="w1">👑 ${b} ${b===1?"Mejor":"Mejores"}</i>`:""}${m?`<i class="w2">🎖️ ${m} ${m===1?"Mención":"Menciones"}</i>`:""}${g?`<i class="w3">👥 ${g} ${g===1?"Grupal":"Grupales"}</i>`:""}</span>`:"";
}
/* ---------- Brillo de cristal de las portadas: toma el color principal de cada portada, muy aclarado ----------
   Se lee un puñado de píldoras de la imagen (ponderando los tonos más vivos); el brillo queda casi blanco con ese matiz.
   Si la imagen no se puede leer (otro dominio sin permiso, portada gris, error), la portada conserva el blanco con un toque de rosa del CSS. */
const anuShineCache_=new Map();
function anuShineColor_(im){
  try{
    /* Histograma por tono (36 tramos). El rosa/magenta de la marca (logo, títulos, pegatinas) sale en TODAS las portadas, así que pesa muy poco:
       solo gana si la imagen no tiene otro color con presencia. Se pondera por área, con un poco de viveza y evitando extremos de luz. */
    const N=48, cv=document.createElement("canvas"); cv.width=cv.height=N; const c=cv.getContext("2d",{willReadFrequently:true});
    c.drawImage(im,0,0,N,N); const d=c.getImageData(0,0,N,N).data;
    const bin=new Array(36).fill(0), sr=new Array(36).fill(0), sg=new Array(36).fill(0), sb=new Array(36).fill(0), sw=new Array(36).fill(0);
    for(let i=0;i<d.length;i+=4){ if(d[i+3]<200) continue;
      const r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255, mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2, dl=mx-mn;
      const s=dl?dl/(1-Math.abs(2*l-1)):0; if(l>.93||l<.1||s<.18) continue;
      let h=mx===r?((g-b)/dl)%6:mx===g?(b-r)/dl+2:(r-g)/dl+4; h*=60; if(h<0) h+=360;
      let w=(.35+Math.min(s,1))*(1-Math.abs(l-.5)*1.2);
      if(h>=295&&h<=350) w*=.12;                                            // rosa de la marca
      const k=Math.floor(h/10)%36; bin[k]+=w; sr[k]+=r*w; sg[k]+=g*w; sb[k]+=b*w; sw[k]+=w; }
    let best=-1,bv=0;
    for(let k=0;k<36;k++){ const v=bin[k]+.5*(bin[(k+35)%36]+bin[(k+1)%36]); if(v>bv){ bv=v; best=k; } }
    if(best<0||bv<1.2) return null;                                         // casi gris o sin color con presencia
    let R=0,G=0,B=0,W=0; for(const k of [(best+35)%36,best,(best+1)%36]){ R+=sr[k]; G+=sg[k]; B+=sb[k]; W+=sw[k]; }
    if(W<=0) return null;
    const r=R/W,g=G/W,b=B/W, mx=Math.max(r,g,b), mn=Math.min(r,g,b), dl=mx-mn;
    let h=0; if(dl){ h=mx===r?((g-b)/dl)%6:mx===g?(b-r)/dl+2:(r-g)/dl+4; h*=60; if(h<0) h+=360; }
    const l0=(mx+mn)/2, s0=dl?dl/(1-Math.abs(2*l0-1)):0, s=Math.min(Math.max(s0,.45),.9);
    const rgb=l=>{ const a=s*Math.min(l,1-l), f=n=>{ const k=(n+h/30)%12; return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))); }; return f(0)+","+f(8)+","+f(4); };
    return [rgb(.9),rgb(.82)];                                             // [brillo claro, brillo del centro]
  }catch(_){ return null; }                                                // lienzo "contaminado" por imagen sin permiso CORS
}
function anuShineTint_(root){
  (root||document).querySelectorAll(".anu-card img.anu-pic").forEach(img=>{
    const card=img.closest(".anu-card"), src=img.getAttribute("src"); if(!card||!src) return;
    const put=c=>{ if(c&&card.isConnected){ card.style.setProperty("--sh1",c[0]); card.style.setProperty("--sh2",c[1]); } };
    if(anuShineCache_.has(src)) return put(anuShineCache_.get(src));
    anuLoadImg_(src).then(im=>{ const c=im?anuShineColor_(im):null; anuShineCache_.set(src,c); put(c); }).catch(()=>{});
  });
}
function anuarioBlockHTML(x,i=0){
  /* La tarjeta ES la portada de la actividad (la portada ya trae el nombre): sin marco, textos ni etiquetas. */
  const n=x.n, r=[-1.6,1.2,-0.8,1.8][i%4], src=n.imgs[0];
  const pic=src?`<img class="anu-pic js-longpress" data-filename="${escAttr(n.titulo+".jpg")}" src="${escAttr(src)}" alt="${escAttr(n.titulo)}" loading="${i<4?"eager":"lazy"}" decoding="async">`:`<span class="anu-pic anu-noimg">${escHtml(n.titulo)}</span>`;
  return `<button type="button" class="anu-card" data-anuario="${escAttr(n.e.id)}" aria-label="${escAttr(n.titulo)}" style="--r:${r}deg;--i:${Math.min(i,10)}">${pic}</button>`;
}


/* ---------- Página de la actividad ---------- */
const anuKey_=v=>String(v||"").replace(/@/g,"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/gi,"").toLowerCase();
const anuMem_=nm=>{ const k=anuKey_(nm); if(!k) return null; const L=DB.miembros||[];
  return L.find(m=>anuKey_(m.nombre)===k)||L.find(m=>["usuarioSmule","usuarioBandlab","usuarioDiscord"].some(f=>anuKey_(m[f])===k))
    ||(k.length>=4?(()=>{ const c=L.filter(m=>{ const n=anuKey_(m.nombre); return n.length>=4&&(n.includes(k)||k.includes(n)); }); return c.length===1?c[0]:null; })():null)||null; };
function anuRowW_(w,mm){
  const m=mm||anuMem_(w.nombre), nm=String(w.nombre||"").replace(/@/g,"");
  return `<div class="act-row"><button type="button" class="act-who"${m?` data-miembro="${escAttr(m.id)}"`:""}><img class="anu-fb" src="${escAttr(anuAv_(m))}" alt=""><span><b>${escHtml(nm||"Miembro")}</b><small>${escHtml(w.detalle||"")}</small></span></button>${w.link?`<a class="act-play" href="${escAttr(w.link)}" target="_blank" rel="noopener" aria-label="Escuchar">▶</a>`:""}</div>`;
}
/* Actividades a las que pertenece una tarjeta: se deducen de sus ganadores/menciones (la entrega que coincide en persona y canción)
   y, además, de las actividades que se llaman igual que la tarjeta. Así salen aunque la tarjeta todavía no tenga ganadores. */
const anuLinea_=(n,d)=>anuKey_(n)+"|"+String(d||"").trim().toLowerCase();
function anuActsDe_(e,lineas){
  const ids=new Set(), ent=DB.entregas||[];
  lineas.forEach(w=>{ const k=anuLinea_(w.nombre,w.detalle); const x=ent.find(r=>anuLinea_(r.nombreUsuario,r.detalleEntrega)===k); if(x) ids.add(String(x.idActividad)); });
  const tk=anuKey_(e.titulo); if(tk) (DB.actividades||[]).forEach(a=>{ if(anuKey_(a.titulo)===tk) ids.add(String(a.id)); });
  return (DB.actividades||[]).filter(a=>ids.has(String(a.id))).sort((a,b)=>(anuFecha_(a.fechaInicio)-anuFecha_(b.fechaInicio))||0);
}
/* «Actividades entregadas»: TODAS las entregas de la(s) actividad(es) de la tarjeta, menos las que ya salen arriba (mejores y menciones).
   Con más de una actividad se separan por actividad; con una sola no hace falta encabezado. */
function anuEntregasHTML_(e,lineas){
  const acts=anuActsDe_(e,lineas); if(!acts.length) return "";
  const ya=new Set(lineas.map(w=>anuLinea_(w.nombre,w.detalle)));
  const grupos=acts.map(a=>({a,es:(DB.entregas||[]).filter(r=>String(r.idActividad)===String(a.id)&&!ya.has(anuLinea_(r.nombreUsuario,r.detalleEntrega)))})).filter(g=>g.es.length);
  if(!grupos.length) return "";
  const total=grupos.reduce((n,g)=>n+g.es.length,0), varias=acts.length>1;
  const fila=r=>{ let m=null; try{ m=(typeof miembrosDeEntrega_==="function"&&miembrosDeEntrega_(r)||[])[0]||null; }catch(_){} return anuRowW_({nombre:r.nombreUsuario,detalle:r.detalleEntrega,link:r.linkGrabacion},m); };
  return `<details class="act-ent"><summary class="act-sec act-tg"><span>📋 Actividades entregadas</span><small class="act-cnt">${total}</small><i class="act-chev" aria-hidden="true"></i></summary>`+grupos.map(g=>{ const x=TIPO_[g.a.categoria]||{t:"Especial",e:"✨"};
    return `${varias?`<h4 class="act-sub"><span>${escHtml(g.a.titulo||"Actividad")}</span><small>${x.e} ${x.t} · ${g.es.length}</small></h4>`:""}<div class="act-list">${g.es.map(fila).join("")}</div>`; }).join("")+`</details>`;
}
function anuActHTML_(id){
  const e=(DB.anuario||[]).find(x=>String(x.id)===String(id)); if(!e) return "";
  const n=anuNorm_(e), f=anuFecha_(n.f), mens=parseWinnerLines(e.mencionesHonorificas), grup=parseWinnerLines(e.grupales);
  /* Si hay GRUPALES, son lo principal de la tarjeta (sección «Grupales»); los mejores van debajo en «Lo mejor de la actividad».
     Sin grupales queda como siempre. */
  const bestOnly=[...parseWinnerLines(e.ganadorCanto).map(w=>({w,l:"Mejor canción"})),...parseWinnerLines(e.ganadorDoblaje).map(w=>({w,l:"Mejor doblaje"}))];
  const grupL=grup.map(w=>({w,l:"Grupal"})), best=[...grupL,...bestOnly];
  const bstHTML=lst=>`<div class="act-best">${lst.map(x=>{ const m=anuMem_(x.w.nombre), nm=String(x.w.nombre||"").replace(/@/g,"");
      const peachys=nm.split(/[,،]/).map(n=>n.trim()).filter(Boolean);
      const nombreHTML=peachys.length>3?`<div class="bst-peachys" data-peachys-toggle role="button" tabindex="0" aria-expanded="false"><span class="bst-count">${peachys.length} Peachys</span><span class="bst-full hidden">${escHtml(peachys.join(", "))}</span></div>`:`<b>${escHtml(nm||"Miembro")}</b>`;
      return `<div class="bst"><span class="bst-l">${x.l}</span><button type="button" class="bst-av"${m?` data-miembro="${escAttr(m.id)}"`:""} aria-label="${escAttr(nm)}">${ANU_CROWN}<img class="anu-fb" src="${escAttr(anuAv_(m))}" alt=""></button>${nombreHTML}<small>${escHtml(x.w.detalle||"")}</small>${x.w.link?`<a class="md-play" href="${escAttr(x.w.link)}" target="_blank" rel="noopener">Ver presentación</a>`:""}</div>`; }).join("")}</div>`;
  const fechaTxt=isNaN(f)?"":`${f.getDate()} de ${MESES_LARGO[f.getMonth()].toLowerCase()} ${f.getFullYear()}`;
  return `<div class="act-pg"><div class="act-h"><div><h2>${escHtml(n.titulo)}</h2><div class="md-meta"><span>${fechaTxt}</span>${n.tipos.map(anuTag_).join("")}</div></div></div>
    ${grupL.length?`<h3 class="act-sec">👥 Grupales</h3>${bstHTML(grupL)}`:""}
    ${bestOnly.length?`<h3 class="act-sec">👑 Lo mejor de la actividad</h3>${bstHTML(bestOnly)}`:(grupL.length?"":`<p class="md-empty" style="text-align:center">Todavía sin ganadores asignados.</p>`)}
    ${mens.length?`<h3 class="act-sec">🎖️ Menciones honoríficas</h3><div class="act-list">${mens.map(w=>anuRowW_(w)).join("")}</div>`:""}
    ${anuEntregasHTML_(e,[...best.map(x=>x.w),...mens])}
    <div class="act-staff"><button type="button" class="shr" data-share-anuario="${escAttr(e.id)}">${ANU_SHARE_ICON}<span>Compartir</span></button><button type="button" data-edit-anuario="${escAttr(e.id)}">✏️ Editar</button>${anuPuedeDividir_(e)?`<button type="button" data-split-anuario="${escAttr(e.id)}">✂️ Dividir</button>`:""}<button type="button" class="del" data-delete-anuario="${escAttr(e.id)}">🗑️ Borrar tarjeta</button></div></div>`;
}
function anuOpenAct_(id){ anuS.act=id; anuView_(); $a("anuDet").scrollTop=0; document.body.scrollTo({top:0}); }

/* ---------- Ventana flotante ---------- */
const mdHide_=()=>{ $a("anuModal").style.display="none"; };
const anuModal_=html=>{ const bx=$a("anuModalBox"); bx.innerHTML=html; $a("anuModal").style.display="flex"; bx.querySelectorAll("[data-close]").forEach(x=>x.onclick=mdHide_); return bx; };

/* ---------- Agregar al anuario (solo staff) ----------
   1) Elige UNA o VARIAS actividades del mes (tarjetas con borde resaltado, sin casillas).
   2) Salen TODAS las canciones de esas actividades, separadas por actividad; en cada canción: «Mejor» (según sea canto o doblaje) o «Mención».
   3) Todo se guarda en una sola tarjeta del anuario; el nombre por defecto es el de la primera actividad, y el staff puede cambiarlo. */
function anuAgregar_(target){
  if(!staffPin) return;
  if(target&&target.preventDefault) target=null; // llamado desde un clic
  const hoy=new Date(); let [y,m]=/^\d+-\d+$/.test(anuS.key||"")?anuS.key.split("-").map(Number):[hoy.getFullYear(),hoy.getMonth()];
  if(target&&target.fecha){ const d=anuFecha_(target.fecha); if(!isNaN(d)){ y=d.getFullYear(); m=d.getMonth(); } }
  const sel=[], picks={}; let paso="acts", nombre="", tocado=false;
  const dm=f=>{ const d=anuFecha_(f); return isNaN(d)?"?":d.getDate()+" "+MESES_LARGO[d.getMonth()].slice(0,3).toLowerCase(); };
  const enMes=a=>{ const d=anuFecha_(a.fechaInicio); return !isNaN(d)&&d.getFullYear()===y&&d.getMonth()===m; }; /* solo cuenta la fecha de ENVÍO; la de entrega (fechaFin) se ignora */
  const entregasDe=a=>(DB.entregas||[]).filter(e=>String(e.idActividad)===String(a.id));
  const nSel=()=>Object.keys(picks).length;
  const eKey=(a,e,i)=>a.id+"|"+((e&&e.id!=null&&String(e.id)!=="")?e.id:"i"+i);
  const drawActs=()=>{
    const enAnu=new Set();
    (DB.anuario||[]).forEach(r=>{
      const lineas=ANU_CAMPOS_.flatMap(k=>parseWinnerLines(r[k]));
      anuActsDe_(r,lineas).forEach(a=>enAnu.add(String(a.id)));
    });
    const L=(DB.actividades||[]).filter(enMes).sort((a,c)=>anuFecha_(a.fechaInicio)-anuFecha_(c.fechaInicio)||rankCategoria(a.categoria)-rankCategoria(c.categoria));
    const b=anuModal_(`<div class="md-body"><h3 class="md-t">Agregar al anuario</h3>
      <div class="md-nav"><button type="button" data-nav="-1" aria-label="Mes anterior">${CH_L}</button><b>${MESES_LARGO[m]} ${y}</b><button type="button" data-nav="1" aria-label="Mes siguiente">${CH_R}</button></div>
      <p class="md-hint">Toca una o varias actividades; después eliges sus canciones.</p>
      <div class="md-list">${L.length?L.map((a,i)=>{ const x=TIPO_[a.categoria]||{t:"Especial",e:"✨"};
        return `<button type="button" class="md-opt${sel.some(s=>String(s.id)===String(a.id))?" sel":""}" data-a="${i}" aria-pressed="${sel.some(s=>String(s.id)===String(a.id))}">${a.imagenUrl?`<img src="${escAttr(a.imagenUrl)}" alt="">`:""}<span><b>${escHtml(a.titulo||"")}</b><small>${x.e} ${x.t} · enviada ${dm(a.fechaInicio)}${enAnu.has(String(a.id))?" · ya está en el anuario":""}</small></span></button>`; }).join(""):`<p class="md-empty">No hay actividades enviadas en este mes.</p>`}</div>
      <div class="md-acts"><button type="button" class="md-sec" data-close>Cerrar</button><button type="button" class="md-pri" id="sgNext" aria-disabled="${sel.length?"false":"true"}">Continuar${sel.length?` (${sel.length})`:""}</button></div></div>`);
    if(target) b.querySelectorAll("[data-close]").forEach(x=>{ x.innerHTML=`<svg class="ico-back" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Volver`; x.onclick=target.volver; });
    b.querySelectorAll("[data-nav]").forEach(x=>x.onclick=()=>{ m+=+x.dataset.nav; if(m<0){m=11;y--;} if(m>11){m=0;y++;} drawActs(); });
    b.querySelectorAll("[data-a]").forEach(x=>x.onclick=()=>{ const a=L[+x.dataset.a], k=sel.findIndex(s=>String(s.id)===String(a.id));
      if(k>=0) sel.splice(k,1); else sel.push(a);
      x.classList.toggle("sel",k<0); x.setAttribute("aria-pressed",String(k<0));
      const nx=$a("sgNext"); nx.setAttribute("aria-disabled",String(!sel.length)); nx.textContent="Continuar"+(sel.length?` (${sel.length})`:""); });
    $a("sgNext").onclick=()=>{ if(!sel.length){ toast("Toca al menos una actividad"); return; } for(const k of Object.keys(picks)) if(!sel.some(s=>k.startsWith(s.id+"|"))) delete picks[k];
      if(!tocado) nombre=sel[0].titulo||""; paso="songs"; drawSongs(); };
  };
  const drawSongs=()=>{
    const ya=anuYaSet_();
    const b=anuModal_(`<div class="md-body"><button type="button" class="md-back" id="mdBack">← Actividades de ${MESES_LARGO[m]}</button><h3 class="md-t">Elige las canciones</h3>
      ${target?`<p class="md-hint">Se agregarán a la tarjeta «${escHtml(target.titulo||"")}».</p>`:`<label class="sg-name-l" for="sgName">Nombre de la tarjeta en el anuario</label><input class="sg-name" id="sgName" type="text" maxlength="120" value="${escAttr(nombre)}" placeholder="${escAttr(sel[0].titulo||"")}">`}
      ${sel.map(a=>{ const es=entregasDe(a), x=TIPO_[a.categoria]||{t:"Especial",e:"✨"};
        return `<section class="sg-grp"><h4 class="sg-gt">${a.imagenUrl?`<img src="${escAttr(a.imagenUrl)}" alt="">`:""}<span>${escHtml(a.titulo||"")}<small>${x.e} ${x.t}</small></span></h4>${es.length?es.map((e,i)=>{ const key=eKey(a,e,i);
          return anuSongCardHTML_({nombreUsuario:e.nombreUsuario,detalle:e.detalleEntrega},a.categoria,key,picks[key]||"",ya.has(String(e.nombreUsuario||"").trim()+"|"+String(e.detalleEntrega||"").trim())); }).join(""):`<p class="md-empty">Esta actividad todavía no tiene entregas.</p>`}</section>`; }).join("")}
      <div class="sg-bar"><button type="button" class="md-sec" data-close>Cerrar</button><button type="button" class="md-pri" id="sgGo" aria-disabled="true">Añadir al anuario</button></div></div>`);
    const upd=()=>{ const n=nSel(), g=$a("sgGo"); g.setAttribute("aria-disabled",String(!n)); g.textContent=n?`Añadir al anuario (${n})`:"Añadir al anuario"; };
    $a("mdBack").onclick=()=>{ paso="acts"; drawActs(); };
    if(target) b.querySelectorAll("[data-close]").forEach(x=>{ x.innerHTML=`<svg class="ico-back" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Volver`; x.onclick=target.volver; });
    if($a("sgName")) $a("sgName").oninput=e=>{ nombre=e.target.value; tocado=true; };
    b.querySelectorAll(".sg-card").forEach(card=>card.querySelectorAll("[data-k]").forEach(btn=>btn.onclick=()=>{
      const key=card.dataset.key, k=btn.dataset.k;
      if(picks[key]===k) delete picks[key]; else picks[key]=k;
      card.classList.remove("on-mejor","on-mencion","on-grupal"); if(picks[key]) card.classList.add("on-"+picks[key]);
      card.querySelectorAll("[data-k]").forEach(x=>x.classList.toggle("on",picks[key]===x.dataset.k)); upd(); }));
    $a("sgGo").onclick=async()=>{
      if(!nSel()){ toast("Elige «Mejor», «Mención» o «Grupal» en al menos una canción"); return; }
      if(b.dataset.busy==="1") return;
      const items=[]; sel.forEach(a=>entregasDe(a).forEach((e,i)=>{ const p=picks[eKey(a,e,i)]; if(!p) return;
        items.push({destino:anuDestino_(p,a.categoria),nombreUsuario:e.nombreUsuario||"",detalle:e.detalleEntrega||"",link:e.linkGrabacion||""}); }));
      if(!items.length) return;
      if(!target){ /* en segundo plano: se guarda solo y la ventana vuelve a las actividades del mes para seguir añadiendo */
        anuEncolar_(items,sel[0].id,tocado?nombre:"");
        sel.length=0; Object.keys(picks).forEach(k=>delete picks[k]); nombre=""; tocado=false; paso="acts"; drawActs(); return; }
      b.dataset.busy="1"; b.querySelectorAll("button,input").forEach(x=>x.disabled=true);
      const ok=await anuEnviar_(items,sel[0].id,"",target.id);
      if(ok){ toast("Agregado al Anuario 👑"); target.volver(); } else { b.dataset.busy="0"; b.querySelectorAll("button,input").forEach(x=>x.disabled=false); upd(); }
    };
    upd();
  };
  drawActs();
}


/* ---------- Editor de tarjeta del Anuario (staff, modo claro) ----------
   Edita SOLO la fila de la hoja Anuario. Jamás toca la actividad original. */
const anuLn_=w=>String(w.nombre||"").trim()+(w.detalle?" - "+w.detalle:"")+(w.link?"::"+w.link:"");
function anuEditarTarjeta_(id){
  if(!staffPin) return;
  const row=(DB.anuario||[]).find(x=>String(x.id)===String(id)); if(!row){ toast("Tarjeta no encontrada"); return; }
  const st={id:row.id,titulo:row.titulo||"",imagenUrl:row.imagenUrl||"",fi:toDateInput(row.fechaInicio),ff:toDateInput(row.fechaFin),L:[],dirty:false,busy:false};
  const actDe=w=>{ const k=anuKey_(w.nombre), d=String(w.detalle||"").trim().toLowerCase();
    const e=(DB.entregas||[]).find(e=>anuKey_(e.nombreUsuario)===k&&String(e.detalleEntrega||"").trim().toLowerCase()===d);
    return e?(DB.actividades||[]).find(a=>String(a.id)===String(e.idActividad))||null:null; };
  [["canto","ganadorCanto"],["doblaje","ganadorDoblaje"],["mencion","mencionesHonorificas"],["grupal","grupales"]].forEach(([t,k])=>parseWinnerLines(row[k]).forEach(w=>{ const act=actDe(w); st.L.push({w,tipo:t,best:(t==="mencion"||t==="grupal")?(act&&act.categoria==="doblaje"?"doblaje":"canto"):t,act}); }));
  const datos=()=>({id:st.id,titulo:st.titulo.trim()||row.titulo||"Actividad",imagenUrl:st.imagenUrl,fechaInicio:st.fi,fechaFin:st.ff,
    ganadorCanto:st.L.filter(i=>i.tipo==="canto").map(i=>anuLn_(i.w)).join("\n"),ganadorDoblaje:st.L.filter(i=>i.tipo==="doblaje").map(i=>anuLn_(i.w)).join("\n"),mencionesHonorificas:st.L.filter(i=>i.tipo==="mencion").map(i=>anuLn_(i.w)).join("\n"),grupales:st.L.filter(i=>i.tipo==="grupal").map(i=>anuLn_(i.w)).join("\n")});
  const guardar=async()=>{ const r=await apiPost({action:"editAnuario",data:datos()},"Guardando tarjeta del Anuario..."); if(!r.ok){ toast("Error: "+(r.error||"")); return false; } st.dirty=false; await cargarDatos(); return true; };
  const grupos=()=>{ const g=new Map(); st.L.forEach((it,i)=>{ const k=it.act?String(it.act.id):"otras"; if(!g.has(k)) g.set(k,{act:it.act,items:[]}); g.get(k).items.push({it,i}); });
    return [...g.values()].sort((a,b)=>(a.act?0:1)-(b.act?0:1)||(anuFecha_(a.act&&a.act.fechaInicio)-anuFecha_(b.act&&b.act.fechaInicio))||0); };
  const draw=()=>{
    const gs=grupos();
    const b=anuModal_(`<div class="md-body"><h3 class="md-t">Editar tarjeta del Anuario</h3><p class="md-hint">Aquí solo cambias esta tarjeta; la actividad original nunca se toca.</p>
      <label class="sg-name-l" for="edT">Nombre de la tarjeta</label><input class="sg-name" id="edT" type="text" maxlength="120" value="${escAttr(st.titulo)}">
      <label class="sg-name-l">Imagen</label><div class="ed-img">${st.imagenUrl?`<img src="${escAttr(st.imagenUrl)}" alt="">`:`<img alt="">`}<input class="sg-name" id="edI" type="text" placeholder="https://…" value="${escAttr(st.imagenUrl)}"><label class="ed-up">Subir<input type="file" id="edF" accept=".jpg,.jpeg,.png,image/jpeg,image/png" hidden></label></div>
      <div class="ed-row"><div><label class="sg-name-l" for="edFi">Fecha inicio</label><input class="sg-name" id="edFi" type="date" value="${escAttr(st.fi)}"><button type="button" class="md-sec" id="edFixMonth" style="margin-top:8px">Corregir mes</button><div id="edMonthWrap" class="hidden" style="margin-top:8px"><label class="sg-name-l" for="edMonth">Mes correcto</label><input class="sg-name" id="edMonth" type="month" value="${escAttr(st.fi.slice(0,7))}"></div></div><div><label class="sg-name-l" for="edFf">Fecha fin</label><input class="sg-name" id="edFf" type="date" value="${escAttr(st.ff)}"></div></div>
      <h4 class="sg-gt" style="margin-top:20px"><span>Actividades incluidas (${gs.filter(x=>x.act).length||0})<small>${st.L.length} ${st.L.length===1?"canción":"canciones"} en total</small></span></h4>
      ${gs.length?gs.map(g=>{ const x=g.act?(TIPO_[g.act.categoria]||{t:"Especial",e:"✨"}):null;
        return `<section class="sg-grp" style="margin-top:12px"><h4 class="sg-gt" style="font-size:20px">${g.act&&g.act.imagenUrl?`<img src="${escAttr(g.act.imagenUrl)}" alt="">`:""}<span>${escHtml(g.act?g.act.titulo||"":"Otras canciones")}<small>${x?x.e+" "+x.t:"No se pudo ligar a una actividad"}</small></span></h4>${g.act?`<div class="ed-grp-btns"><button type="button" data-sep="${escAttr(g.act.id)}">✂️ Separar en su propia tarjeta</button><button type="button" data-quitar="${escAttr(g.act.id)}">Quitar de esta tarjeta</button></div>`:""}${g.items.map(({it,i})=>`<div class="ed-line m-${it.tipo==="mencion"?"mencion":it.tipo==="grupal"?"grupal":"mejor"}"><div><b>${escHtml(String(it.w.nombre||"").replace(/@/g,""))}</b>${it.w.detalle?`<small>${escHtml(it.w.detalle)}</small>`:""}</div><div class="ed-ctl"><button type="button" data-t="mejor" data-i="${i}" class="${it.tipo!=="mencion"&&it.tipo!=="grupal"?"on":""}">👑 Mejor</button><button type="button" data-t="mencion" data-i="${i}" class="${it.tipo==="mencion"?"on":""}">🎖️ Mención</button><button type="button" data-t="grupal" data-i="${i}" class="${it.tipo==="grupal"?"on":""}">👥 Grupal</button><button type="button" class="ed-x" data-x="${i}" aria-label="Quitar">🗑️</button></div></div>`).join("")}</section>`; }).join(""):`<p class="md-empty">Esta tarjeta todavía no tiene canciones.</p>`}
      <div class="ed-big"><button type="button" id="edAdd">＋ Agregar actividad</button><button type="button" id="edMerge">🔀 Fusionar tarjetas</button><button type="button" id="edSplit" class="${gs.length>=2?"":"off"}" aria-disabled="${gs.length>=2?"false":"true"}">✂️ Dividir tarjeta</button></div>
      ${gs.length>=2?"":`<p class="md-hint ed-split-hint">Para dividir una tarjeta necesita 2 o más actividades.</p>`}
      <div class="md-acts"><button type="button" class="md-sec" data-close>Cerrar</button><button type="button" class="md-pri" id="edSave">Guardar</button></div></div>`);
    const val=(sel,f)=>{ const el=b.querySelector(sel); el.oninput=()=>{ f(el.value); st.dirty=true; }; };
    val("#edT",v=>st.titulo=v); val("#edFi",v=>st.fi=v); val("#edFf",v=>st.ff=v);
    b.querySelector("#edFixMonth").onclick=()=>{ const wrap=b.querySelector("#edMonthWrap"); wrap.classList.toggle("hidden"); if(!wrap.classList.contains("hidden")) b.querySelector("#edMonth").focus(); };
    b.querySelector("#edMonth").onchange=e=>{
      const mes=e.target.value.match(/^(\d{4})-(\d{2})$/); if(!mes) return;
      const actual=st.fi.match(/^(\d{4})-(\d{2})-(\d{2})$/), dia=actual?Number(actual[3]):1;
      const maxDia=new Date(Number(mes[1]),Number(mes[2]),0).getDate();
      st.fi=mes[1]+"-"+mes[2]+"-"+String(Math.min(dia,maxDia)).padStart(2,"0");
      b.querySelector("#edFi").value=st.fi; st.dirty=true;
      toast("Mes corregido; guarda la tarjeta para aplicar el cambio.");
    };
    b.querySelector("#edI").oninput=e=>{ st.imagenUrl=e.target.value; st.dirty=true; };
    b.querySelector("#edI").onchange=e=>{ const im=b.querySelector(".ed-img img"); if(im) im.src=e.target.value; };
    b.querySelector("#edF").onchange=async e=>{ const f=e.target.files[0]; if(!f) return;
      try{ const base64Data=await fileToBase64(f); const r=await apiPost({action:"uploadImage",filename:f.name,base64Data},"Subiendo imagen..."); if(r.ok){ st.imagenUrl=r.url; st.dirty=true; draw(); } else toast("Error: "+(r.error||"")); }catch(_){ toast("No se pudo leer la imagen"); } };
    b.querySelectorAll("[data-t]").forEach(bt=>bt.onclick=()=>{ const it=st.L[+bt.dataset.i]; it.tipo=bt.dataset.t==="mencion"?"mencion":bt.dataset.t==="grupal"?"grupal":it.best; st.dirty=true; draw(); });
    b.querySelectorAll("[data-x]").forEach(bt=>bt.onclick=()=>{ st.L.splice(+bt.dataset.x,1); st.dirty=true; draw(); });
    b.querySelectorAll("[data-quitar]").forEach(bt=>bt.onclick=async()=>{ const id=bt.dataset.quitar, n=st.L.filter(i=>i.act&&String(i.act.id)===id).length;
      if(!await confirmarAccion(`¿Quitar de esta tarjeta las ${n} canción(es) de esta actividad? La actividad original no se toca.`)) return;
      st.L=st.L.filter(i=>!(i.act&&String(i.act.id)===id)); st.dirty=true; draw(); });
    b.querySelectorAll("[data-sep]").forEach(bt=>bt.onclick=async()=>{ if(st.busy) return; const id=bt.dataset.sep, grupo=st.L.filter(i=>i.act&&String(i.act.id)===id);
      if(!grupo.length) return;
      if(grupo.length===st.L.length){ toast("Esta tarjeta solo tiene esa actividad; ya está separada"); return; }
      if(!await confirmarAccion(`Se sacarán ${grupo.length} canción(es) de «${st.titulo||row.titulo||"esta tarjeta"}» y quedarán en una tarjeta nueva. ¿Separar?`)) return;
      st.busy=true; const act=grupo[0].act;
      try{
        if(st.dirty&&!await guardar()) return;   /* primero se guardan los cambios pendientes del editor */
        const fresca=(DB.anuario||[]).find(x=>String(x.id)===String(st.id))||row;
        const resto=st.L.filter(i=>!grupo.includes(i));
        const r=await anuSepararReal_(fresca,anuLineasDe_(fresca),grupo.map(i=>({w:i.w,tipo:i.tipo,act:i.act,best:i.best})),resto.map(i=>({w:i.w,tipo:i.tipo,act:i.act,best:i.best})),act,String(act.titulo||"").trim()||"Actividad");
        if(!r.ok){ toast("⚠️ "+r.msg,6000); return; }
        toast("Actividad separada en su propia tarjeta ✅"); mdHide_();
      } finally{ st.busy=false; } });
    const antes=async()=>{ if(st.dirty) return await guardar(); return true; };
    b.querySelector("#edAdd").onclick=async()=>{ if(!await antes()) return; anuAgregar_({id:st.id,titulo:st.titulo,fecha:st.fi,volver:()=>anuEditarTarjeta_(st.id)}); };
    b.querySelector("#edMerge").onclick=async()=>{ if(!await antes()) return; fusion(); };
    b.querySelector("#edSplit").onclick=async()=>{ if(st.busy) return; if(gs.length<2){ toast("Esta tarjeta solo tiene una actividad: no hay nada que dividir"); return; } if(!await antes()) return; anuDividir_(st.id,()=>anuEditarTarjeta_(st.id)); };
    b.querySelector("#edSave").onclick=async()=>{ if(st.busy) return; st.busy=true; const ok=await guardar(); st.busy=false; if(ok){ toast("Tarjeta guardada ✅"); mdHide_(); } };
  };
  const fusion=()=>{
    const cur=(DB.anuario||[]).find(x=>String(x.id)===String(st.id))||row;
    const otras=(DB.anuario||[]).filter(x=>String(x.id)!==String(st.id)).sort((a,c)=>anuFecha_(c.fechaInicio)-anuFecha_(a.fechaInicio)); const sel=new Set();
    const nL=r=>ANU_CAMPOS_.reduce((s,k)=>s+parseWinnerLines(r[k]).length,0);
    const dm=f=>{ const d=anuFecha_(f); return isNaN(d)?"":d.getDate()+" "+MESES_LARGO[d.getMonth()].slice(0,3).toLowerCase()+" "+d.getFullYear(); };
    const d1=()=>{ const b=anuModal_(`<div class="md-body"><button type="button" class="md-back" id="fuBack"><svg class="ico-back" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Volver a la tarjeta</button><h3 class="md-t">Fusionar tarjetas</h3><p class="md-hint">Elige las tarjetas que quieres juntar dentro de «${escHtml(cur.titulo||"")}». Sus canciones pasan a esta tarjeta y las otras se borran.</p>
        <div class="md-list">${otras.length?otras.map((r,i)=>`<button type="button" class="md-opt${sel.has(String(r.id))?" sel":""}" data-f="${i}">${r.imagenUrl?`<img src="${escAttr(r.imagenUrl)}" alt="">`:""}<span><b>${escHtml(r.titulo||"")}</b><small>${dm(r.fechaInicio)} · ${nL(r)} ${nL(r)===1?"canción":"canciones"}</small></span></button>`).join(""):`<p class="md-empty">No hay otras tarjetas en el Anuario.</p>`}</div>
        <div class="md-acts"><button type="button" class="md-sec" id="fuBack2">Cancelar</button><button type="button" class="md-pri" id="fuGo" aria-disabled="${sel.size?"false":"true"}">Continuar${sel.size?` (${sel.size})`:""}</button></div></div>`);
      b.querySelector("#fuBack").onclick=b.querySelector("#fuBack2").onclick=()=>anuEditarTarjeta_(st.id);
      b.querySelectorAll("[data-f]").forEach(x=>x.onclick=()=>{ const r=otras[+x.dataset.f], k=String(r.id); if(sel.has(k)) sel.delete(k); else sel.add(k); x.classList.toggle("sel",sel.has(k)); const g=b.querySelector("#fuGo"); g.setAttribute("aria-disabled",String(!sel.size)); g.textContent="Continuar"+(sel.size?` (${sel.size})`:""); });
      b.querySelector("#fuGo").onclick=()=>{ if(!sel.size){ toast("Elige al menos una tarjeta"); return; } d2(); }; };
    const d2=()=>{ const lista=otras.filter(r=>sel.has(String(r.id))), n=lista.reduce((s,r)=>s+nL(r),0);
      const b=anuModal_(`<div class="md-body"><h3 class="md-t">¿Fusionar?</h3><div class="ed-warn">Se pasarán hasta ${n} ${n===1?"canción":"canciones"} de ${lista.length} ${lista.length===1?"tarjeta":"tarjetas"} a «${escHtml(cur.titulo||"")}» (sin repetir). Después se borrarán: ${lista.map(r=>"«"+escHtml(r.titulo||"")+"»").join(", ")}.<br>Ninguna actividad original se modifica.</div>
        <div class="md-acts"><button type="button" class="md-sec" id="fuNo">Volver</button><button type="button" class="md-pri" id="fuYes">Fusionar</button></div></div>`);
      b.querySelector("#fuNo").onclick=d1;
      b.querySelector("#fuYes").onclick=async()=>{ const y=b.querySelector("#fuYes"); if(y.dataset.b) return; y.dataset.b="1"; const r=await apiPost({action:"fusionarAnuario",idDestino:st.id,idsOrigen:lista.map(x=>String(x.id))},"Fusionando tarjetas..."); y.dataset.b="";
        if(r.ok){ toast("Tarjetas fusionadas ✅"); await cargarDatos(); anuEditarTarjeta_(st.id); } else toast("Error: "+(r.error||"")); }; };
    d1(); };
  draw();
}

/* ---------- Dividir tarjeta (staff, modo claro) ----------
   Reparte las actividades de UNA tarjeta del Anuario en DOS: unas se quedan y otras pasan a una tarjeta nueva.
   Las canciones se mueven tal cual (siguen siendo «Mejor / Mención / Grupal»), así que no hay que volver a elegirlas.
   La actividad original nunca se toca. Si algo falla a medias, se deshace todo y la tarjeta queda como estaba. */
function anuLineasDe_(row){
  const actDe=w=>{ const k=anuKey_(w.nombre), d=String(w.detalle||"").trim().toLowerCase();
    const e=(DB.entregas||[]).find(e=>anuKey_(e.nombreUsuario)===k&&String(e.detalleEntrega||"").trim().toLowerCase()===d);
    return e?(DB.actividades||[]).find(a=>String(a.id)===String(e.idActividad))||null:null; };
  const L=[]; [["canto","ganadorCanto"],["doblaje","ganadorDoblaje"],["mencion","mencionesHonorificas"],["grupal","grupales"]].forEach(([t,k])=>parseWinnerLines(row[k]).forEach(w=>{
    const act=actDe(w); L.push({w,tipo:t,act,best:(t==="mencion"||t==="grupal")?(act&&act.categoria==="doblaje"?"doblaje":"canto"):t}); }));
  return L;
}
/* Agrupa las líneas por actividad (las que no se pueden ligar a una actividad van juntas en «otras») */
function anuGruposDe_(L){
  const g=new Map(); L.forEach(it=>{ const k=it.act?String(it.act.id):"otras"; if(!g.has(k)) g.set(k,{k,act:it.act,items:[]}); g.get(k).items.push(it); });
  return [...g.values()].sort((a,b)=>(a.act?0:1)-(b.act?0:1)||(anuFecha_(a.act&&a.act.fechaInicio)-anuFecha_(b.act&&b.act.fechaInicio))||0);
}
const anuDatosDe_=(row,L)=>({id:row.id,titulo:row.titulo||"Actividad",imagenUrl:row.imagenUrl||"",fechaInicio:toDateInput(row.fechaInicio),fechaFin:toDateInput(row.fechaFin),
  ganadorCanto:L.filter(i=>i.tipo==="canto").map(i=>anuLn_(i.w)).join("\n"),ganadorDoblaje:L.filter(i=>i.tipo==="doblaje").map(i=>anuLn_(i.w)).join("\n"),
  mencionesHonorificas:L.filter(i=>i.tipo==="mencion").map(i=>anuLn_(i.w)).join("\n"),grupales:L.filter(i=>i.tipo==="grupal").map(i=>anuLn_(i.w)).join("\n")});
/* ¿Se puede dividir? Hace falta que la tarjeta tenga 2 o más actividades. */
const anuPuedeDividir_=row=>anuGruposDe_(anuLineasDe_(row)).length>=2;

/* Reparte una tarjeta en DOS tarjetas realmente separadas (la original conserva su nombre; la nueva lleva el nombre elegido).
   El servidor, al agregar canciones, vuelve a meterlas en la tarjeta que «reconoce» (por fechas/título de la actividad) y por eso
   las tarjetas se volvían a juntar. Para evitarlo: mientras se crea la nueva, la original lleva un título y una fecha provisionales
   que el servidor no puede confundir; al final se le devuelven su nombre y fechas. Después se VERIFICA que sean 2 tarjetas distintas;
   si no lo son, se deshace todo y se avisa (nunca se da por bueno algo que no quedó separado). */
const anuClaveLinea_=w=>String(w.nombre||"").trim()+"|"+String(w.detalle||"").trim();
const anuClavesDe_=r=>{ const s=new Set(); ANU_CAMPOS_.forEach(k=>parseWinnerLines(r[k]).forEach(w=>s.add(anuClaveLinea_(w)))); return s; };
async function anuSepararReal_(row,L,mover,resto,ancla,nombre){
  const orig=anuDatosDe_(row,L), quedar=anuDatosDe_(row,resto), idsAntes=new Set((DB.anuario||[]).map(r=>String(r.id)));
  const kMover=mover.map(i=>anuClaveLinea_(i.w)), kResto=resto.map(i=>anuClaveLinea_(i.w));
  const edit=async(data,msg)=>{ const r=await apiPost({action:"editAnuario",data},msg,true); return !!(r&&r.ok); };
  const deshacer=async()=>{ try{ await cargarDatos();
    for(const r of (DB.anuario||[]).filter(r=>!idsAntes.has(String(r.id)))) await apiPost({action:"deleteAnuario",id:r.id},"Deshaciendo...",true);
    await edit(orig,"Restaurando tarjeta..."); await cargarDatos(); }catch(_){} };
  /* 1) la original, sin las canciones que se van y con huella provisional */
  const huella=Object.assign({},quedar,{titulo:"__dividiendo__"+Date.now(),fechaInicio:"1900-01-01",fechaFin:"1900-01-01"});
  if(!await edit(huella,"Dividiendo la tarjeta...")){ await deshacer(); return {ok:false,msg:"No se pudo preparar la división"}; }
  try{
    /* 2) la tarjeta nueva, con las canciones que se mueven */
    const items=mover.map(i=>({destino:anuDestino_(i.tipo==="mencion"?"mencion":i.tipo==="grupal"?"grupal":"mejor",i.tipo),nombreUsuario:i.w.nombre||"",detalle:i.w.detalle||"",link:i.w.link||""}));
    const ok=await anuEnviar_(items,ancla.id,nombre,"");
    if(!ok){ await deshacer(); return {ok:false,msg:"No se pudo crear la tarjeta nueva"}; }
    /* 3) ¿quedó en una tarjeta APARTE de la original? (id distinto y con todas las canciones que se movieron) */
    const nueva=(DB.anuario||[]).find(r=>String(r.id)!==String(row.id)&&!idsAntes.has(String(r.id))&&kMover.every(k=>anuClavesDe_(r).has(k)));
    if(!nueva){ await deshacer(); return {ok:false,msg:"El servidor volvió a unir las canciones en la misma tarjeta; todo quedó como estaba"}; }
    /* 4) devolverle a la original su nombre y fechas; y a la nueva, el nombre elegido */
    if(!await edit(quedar,"Restaurando la tarjeta original...")){ await deshacer(); return {ok:false,msg:"No se pudo restaurar la tarjeta original"}; }
    if(String(nueva.titulo||"").trim()!==nombre){ const d=anuDatosDe_(nueva,anuLineasDe_(nueva)); d.titulo=nombre; if(!await edit(d,"Nombrando la tarjeta nueva...")){ await deshacer(); return {ok:false,msg:"No se pudo nombrar la tarjeta nueva"}; } }
    /* 5) verificación final: recargar y comprobar las DOS tarjetas */
    await cargarDatos();
    const A=(DB.anuario||[]).find(r=>String(r.id)===String(row.id)), B=(DB.anuario||[]).find(r=>String(r.id)===String(nueva.id));
    const kA=A?anuClavesDe_(A):new Set(), kB=B?anuClavesDe_(B):new Set();
    const bien=A&&B&&String(A.id)!==String(B.id)&&kResto.every(k=>kA.has(k))&&kMover.every(k=>kB.has(k))&&!kMover.some(k=>kA.has(k))&&!kResto.some(k=>kB.has(k))&&String(B.titulo||"").trim()===nombre&&String(A.titulo||"").trim()===String(row.titulo||"").trim();
    if(!bien){ await deshacer(); return {ok:false,msg:"No quedaron separadas correctamente; todo quedó como estaba"}; }
    return {ok:true};
  }catch(err){ await deshacer(); return {ok:false,msg:"Error al dividir; todo quedó como estaba"}; }
}
function anuDividir_(id,volver){
  if(!staffPin) return;
  const row=(DB.anuario||[]).find(x=>String(x.id)===String(id)); if(!row){ toast("Tarjeta no encontrada"); return; }
  const L=anuLineasDe_(row), gs=anuGruposDe_(L), atras=volver||(()=>mdHide_());
  if(gs.length<2){ toast("Esta tarjeta solo tiene una actividad: no hay nada que dividir"); return; }
  const sel=new Set(); let nombre="", tocado=false, busy=false;
  const tipoDe=g=>g.act?(TIPO_[g.act.categoria]||{t:"Especial",e:"✨"}):{t:"Sin actividad ligada",e:"🎵"};
  const plural=n=>n+" "+(n===1?"canción":"canciones");
  const nombreAuto=()=>{ const g=gs.find(x=>sel.has(x.k)&&x.act); return g?String(g.act.titulo||""):""; };
  const b=anuModal_(`<div class="md-body"><button type="button" class="md-back" id="dvBack"><svg class="ico-back" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Volver a la tarjeta</button>
    <h3 class="md-t">Dividir tarjeta</h3>
    <p class="md-hint">Toca las actividades que pasarán a una <b>tarjeta nueva</b>. Las demás se quedan en «${escHtml(row.titulo||"esta tarjeta")}». Las canciones se mueven tal cual: no hay que volver a elegirlas.</p>
    <div class="md-list">${gs.map((g,i)=>{ const x=tipoDe(g);
      return `<button type="button" class="md-opt dv-opt" data-g="${i}" aria-pressed="false">${g.act&&g.act.imagenUrl?`<img src="${escAttr(g.act.imagenUrl)}" alt="">`:`<span class="dv-ph" aria-hidden="true">🎵</span>`}<span class="dv-tx"><i class="dv-tag">Se queda</i><b>${escHtml(g.act?(g.act.titulo||"Actividad"):"Otras canciones")}</b><small>${x.e} ${x.t} · ${plural(g.items.length)}</small></span></button>`; }).join("")}</div>
    <label class="sg-name-l" for="dvName">Nombre de la tarjeta nueva</label><input class="sg-name" id="dvName" type="text" maxlength="120" value="">
    <div class="dv-sum" id="dvSum" role="status"></div>
    <div class="md-acts"><button type="button" class="md-sec" id="dvNo">Cancelar</button><button type="button" class="md-pri" id="dvGo" aria-disabled="true">✂️ Dividir</button></div></div>`);
  const estado=()=>{ const pasan=gs.filter(g=>sel.has(g.k)), quedan=gs.filter(g=>!sel.has(g.k)), ancla=pasan.find(g=>g.act);
    return {pasan,quedan,ancla,ok:!!(pasan.length&&quedan.length&&ancla)}; };
  const upd=()=>{
    const e=estado(), inp=b.querySelector("#dvName");
    b.querySelectorAll("[data-g]").forEach(x=>{ const on=sel.has(gs[+x.dataset.g].k); x.classList.toggle("sel",on); x.setAttribute("aria-pressed",String(on)); x.querySelector(".dv-tag").textContent=on?"Tarjeta nueva":"Se queda"; });
    if(!tocado){ nombre=nombreAuto(); inp.value=nombre; }
    b.querySelector("#dvSum").innerHTML=e.ok?`<b>${e.pasan.length}</b> ${e.pasan.length===1?"actividad pasa":"actividades pasan"} a la tarjeta nueva · <b>${e.quedan.length}</b> ${e.quedan.length===1?"se queda":"se quedan"} en la actual`
      :(e.pasan.length&&!e.ancla)?"Las canciones sin actividad ligada solo pueden pasar junto a una actividad."
      :!e.pasan.length?"Elige al menos una actividad para la tarjeta nueva.":"Deja al menos una actividad en la tarjeta actual.";
    b.querySelector("#dvGo").setAttribute("aria-disabled",String(!e.ok||busy));
  };
  b.querySelector("#dvBack").onclick=b.querySelector("#dvNo").onclick=()=>{ if(!busy) atras(); };
  b.querySelectorAll("[data-g]").forEach(x=>x.onclick=()=>{ if(busy) return; const k=gs[+x.dataset.g].k; if(sel.has(k)) sel.delete(k); else sel.add(k); upd(); });
  b.querySelector("#dvName").oninput=ev=>{ nombre=ev.target.value; tocado=true; };
  b.querySelector("#dvGo").onclick=async()=>{
    if(busy) return; const e=estado();
    if(!e.ok){ toast(e.pasan.length&&!e.ancla?"Incluye al menos una actividad con su nombre":!e.pasan.length?"Elige al menos una actividad para la tarjeta nueva":"Deja al menos una actividad en la tarjeta actual"); return; }
    busy=true; upd();
    const nm=String(nombre||"").trim()||String(e.ancla.act.titulo||"")||"Actividad";
    const mover=e.pasan.flatMap(g=>g.items), resto=e.quedan.flatMap(g=>g.items);
    try{
      const r=await anuSepararReal_(row,L,mover,resto,e.ancla.act,nm);
      if(!r.ok){ toast("⚠️ "+r.msg,6000); return; }
      toast("Tarjeta dividida en dos ✅"); mdHide_();
    } finally{ busy=false; if(b.isConnected) upd(); }
  };
  upd();
}

/* ---------- Imagen de respaldo y compartir (PNG) ---------- */
const ANU_SHOW="https://raw.githubusercontent.com/TeamPeachesOff/TeamPeachesHub/main/Anuario/ShowPeaches.png";
/* Foto del miembro; si no existe o no está vinculado → ShowPeaches (foto de todos) */
const anuAv_=m=>(m&&m.avatarUrl)||ANU_SHOW;
const ANU_SHARE_ICON='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.2 20c.1-7 4.3-10.8 11.8-10.8"/><path d="M12.6 3.6 19.4 9.2l-6.8 5.6"/><path d="M20.6 16.2v.01M17.6 19.6v.01" stroke-width="3.2"/></svg>';
const anuLoadImg_=(url,ms=5000)=>{ const one=(u,t)=>new Promise(res=>{ if(!u) return res(null); const im=new Image(); if(!/^data:/.test(u)) im.crossOrigin="anonymous"; let d=false; const f=v=>{ if(!d){ d=true; res(v); } }; im.onload=()=>f(im); im.onerror=()=>f(null); setTimeout(()=>f(null),t); im.src=u; });
  return one(url,ms).then(r=>r||(/^data:/.test(url||"")||!url?null:one(url+(url.includes("?")?"&":"?")+"_cb="+Date.now(),3000)))
    .then(r=>r||(/^data:/.test(url||"")||!url?null:one("https://wsrv.nl/?w=600&output=png&url="+encodeURIComponent(url),6000))); };
/* Tarjeta cuadrada (1:1) si solo hay «mejor»; vertical (9:16) si además hay menciones honoríficas. Siempre 1080 px de ancho. */
let _anuBusy=false;
async function anuCompartir_(id){
  if(_anuBusy){ toast("Ya se está creando la imagen… ⏳"); return; }
  _anuBusy=true; try{ await anuCompartirImpl_(id); } catch(err){ toast("No se pudo crear la imagen ❌"); console.error(err); } finally{ _anuBusy=false; }
}
async function anuCompartirImpl_(id){
  const e=(DB.anuario||[]).find(x=>String(x.id)===String(id)); if(!e) return;
  const n=anuNorm_(e), f=anuFecha_(n.f), mens=parseWinnerLines(e.mencionesHonorificas);
  const best=[...parseWinnerLines(e.grupales).map(w=>({w,l:"GRUPAL"})),...parseWinnerLines(e.ganadorCanto).map(w=>({w,l:"MEJOR CANCIÓN"})),...parseWinnerLines(e.ganadorDoblaje).map(w=>({w,l:"MEJOR DOBLAJE"}))];
  if(!best.length&&!mens.length){ toast("Esta tarjeta todavía no tiene ganadores 🍑"); return; }
  toast("Creando tu imagen… 🎨");
  const tall=mens.length>0, W=1080, H=tall?1920:1080;
  try{ await Promise.race([anuFonts_(),new Promise(r=>setTimeout(r,2500))]); }catch(_){}
  const FD='"Caveat Brush","Segoe Script","Brush Script MT",cursive', FB=(getComputedStyle(document.body).fontFamily||"system-ui")+',system-ui,sans-serif';
  const clean=s=>String(s||"").replace(/@/g,"").trim();
  const people=[...best.map(b=>b.w),...mens].map(w=>anuMem_(w.nombre));
  const urlsAv=people.map(m=>m&&m.avatarUrl), cache=new Map(); const ld=u=>{ if(!u) return Promise.resolve(null); if(!cache.has(u)) cache.set(u,anuLoadImg_(u)); return cache.get(u); };
  const [bg,show,logo,...av]=await Promise.all([ld(ANU_BG),ld(ANU_SHOW),ld(ANU_LOGO),...urlsAv.map(ld)]);
  const cv=document.createElement("canvas"); cv.width=W; cv.height=H; const c=cv.getContext("2d");
  const cover=(im,x,y,w,h)=>{ const r=Math.max(w/im.width,h/im.height), sw=w/r, sh=h/r; c.drawImage(im,(im.width-sw)/2,(im.height-sh)/2,sw,sh,x,y,w,h); };
  const rr=(x,y,w,h,r)=>{ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); };
  const fit=(t,maxW,size,font,wt)=>{ let s=size; for(;s>18;s-=2){ c.font=`${wt} ${s}px ${font}`; if(c.measureText(t).width<=maxW) break; } c.font=`${wt} ${s}px ${font}`; return s; };
  const ell=(t,maxW)=>{ t=String(t); if(c.measureText(t).width<=maxW) return t; while(t.length>1&&c.measureText(t+"…").width>maxW) t=t.slice(0,-1); return t+"…"; };
  const txt=(t,x,y,col,al="center")=>{ c.fillStyle=col; c.textAlign=al; c.textBaseline="alphabetic"; c.fillText(t,x,y); };
  /* fondo */
  const g=c.createLinearGradient(0,0,W,H); g.addColorStop(0,"#fff1e6"); g.addColorStop(1,"#ffd9ec"); c.fillStyle=g; c.fillRect(0,0,W,H);
  if(bg){ cover(bg,0,0,W,H); c.fillStyle="rgba(255,248,242,.38)"; c.fillRect(0,0,W,H); }
  c.save(); c.shadowColor="rgba(63,33,104,.22)"; c.shadowBlur=40; c.shadowOffsetY=14; c.fillStyle="rgba(255,255,255,.8)"; rr(44,44,W-88,H-88,64); c.fill(); c.restore();
  c.strokeStyle="rgba(255,210,63,.9)"; c.lineWidth=5; rr(60,60,W-120,H-120,50); c.stroke();
  /* cabecera */
  let y=tall?150:132;
  const yr=isNaN(f)?"":f.getFullYear();
  c.font=`400 ${tall?92:78}px ${FD}`; c.textAlign="center"; txt(("Anuario "+yr).trim(),W/2,y+(tall?20:14),"#f81e8e");
  y+=tall?58:46;
  let ts=tall?132:104, lines; const words=clean(n.titulo).split(/\s+/);
  for(;ts>52;ts-=4){ c.font=`400 ${ts}px ${FD}`; lines=[]; let cur=""; words.forEach(w=>{ const t=cur?cur+" "+w:w; if(c.measureText(t).width>W-240&&cur){ lines.push(cur); cur=w; } else cur=t; }); lines.push(cur); if(lines.length<=2&&Math.max(...lines.map(l=>c.measureText(l).width))<=W-240) break; }
  lines.slice(0,2).forEach(l=>{ y+=ts*.92; txt(l,W/2,y,"#3f2168"); });
  y+=tall?52:44;
  if(!isNaN(f)){ c.font=`800 ${tall?36:30}px ${FB}`; txt(`${f.getDate()} de ${MESES_LARGO[f.getMonth()].toLowerCase()} ${f.getFullYear()}`,W/2,y,"#8a5fb8"); y+=tall?30:44; }
  /* ganadores */
  const footY=H-(tall?198:186);
  const cols=best.length<=1?1:best.length<=4?2:3, colW=(W-160)/cols, rowsB=Math.ceil(best.length/cols);
  const bH=z=>z+z*.22+190;
  let nM=tall?Math.min(mens.length,12):0, rowH=128; const mH=()=>nM?132+nM*rowH:0;
  const availAll=footY-y-(tall?10:0), szMin=cols===1?300:cols===2?230:170;
  if(tall){ for(;;){ if(availAll-mH()>=rowsB*bH(szMin)) break; if(rowH>88) rowH-=8; else if(nM>1) nM--; else break; } }
  let sz=tall?(cols===1?380:cols===2?300:230):(cols===1?340:cols===2?290:200);
  while(sz>110&&rowsB*bH(sz)>availAll-mH()) sz-=10;
  y+=Math.max(0,Math.min(110,(availAll-(rowsB*bH(sz)+mH()))/2));
  const crown=(cx,cy,w)=>{ const h=w*.7; c.save(); c.translate(cx-w/2,cy); c.fillStyle="#ffc928"; c.strokeStyle="#c98a00"; c.lineWidth=4; c.lineJoin="round";
    c.beginPath(); c.moveTo(0,h); c.lineTo(0,h*.28); c.lineTo(w*.25,h*.62); c.lineTo(w*.5,0); c.lineTo(w*.75,h*.62); c.lineTo(w,h*.28); c.lineTo(w,h); c.closePath(); c.fill(); c.stroke(); c.restore(); };
  const face=(img,cx,cy,r,ring,rw,nm)=>{ c.save(); c.shadowColor="rgba(0,0,0,.2)"; c.shadowBlur=22; c.shadowOffsetY=8; c.fillStyle="#fff"; c.beginPath(); c.arc(cx,cy,r+rw,0,7); c.fill(); c.restore();
    c.save(); c.beginPath(); c.arc(cx,cy,r,0,7); c.clip(); const im=img||show;
    if(im) cover(im,cx-r,cy-r,2*r,2*r); else { c.fillStyle="#ffb48a"; c.fillRect(cx-r,cy-r,2*r,2*r); c.font=`800 ${r}px ${FB}`; txt((nm||"?").charAt(0).toUpperCase(),cx,cy+r*.34,"#fff"); } c.restore();
    c.strokeStyle=ring; c.lineWidth=rw; c.beginPath(); c.arc(cx,cy,r+rw/2,0,7); c.stroke(); };
  best.forEach((b,i)=>{ const r=Math.floor(i/cols), k=i%cols, inRow=Math.min(cols,best.length-r*cols), cx=W/2+(k-(inRow-1)/2)*colW, top=y+r*(sz+sz*.22+190)+(tall?10:0);
    c.font=`800 ${tall?28:25}px ${FB}`; const lw=c.measureText(b.l).width+64; c.fillStyle="#ffd23f"; rr(cx-lw/2,top,lw,52,26); c.fill(); txt(b.l,cx,top+35,"#5a3a00");
    const ch=sz*.22, cy=top+52+16+ch+sz/2+4; crown(cx,top+52+16,sz*.34);
    face(av[i],cx,cy,sz/2,"#ffc928",10,clean(b.w.nombre));
    const nm=clean(b.w.nombre)||"Miembro"; fit(nm,colW-30,tall?46:42,FB,"800"); txt(ell(nm,colW-30),cx,cy+sz/2+60,"#2a1745");
    if(b.w.detalle){ fit(b.w.detalle,colW-30,tall?32:28,FB,"600"); txt(ell(clean(b.w.detalle),colW-30),cx,cy+sz/2+60+40,"#6b5683"); } });
  /* menciones honoríficas */
  if(tall&&nM){ const my=y+rowsB*bH(sz)+32; c.font=`400 80px ${FD}`; txt("Menciones honoríficas",W/2,my+62,"#f81e8e");
    const lim=mens.slice(0,nM), extra=mens.length-lim.length, pw=W-240, px=120, ph=rowH-16, r0=Math.min(54,ph/2-9);
    lim.forEach((w,i)=>{ const yy=my+96+i*rowH, cyy=yy+ph/2, idx=best.length+i;
      c.fillStyle="#fff"; c.save(); c.shadowColor="rgba(63,33,104,.14)"; c.shadowBlur=16; c.shadowOffsetY=5; rr(px,yy,pw,ph,ph/2); c.fill(); c.restore();
      face(av[idx],px+ph/2,cyy,r0,"#a45fc7",6,clean(w.nombre));
      const tx=px+ph+10, mw=pw-ph-10-44, nm=clean(w.nombre)||"Miembro";
      const hasD=!!w.detalle; fit(nm,mw,hasD?42:46,FB,"800"); txt(ell(nm,mw),tx,hasD?cyy-2:cyy+14,"#2a1745","left");
      if(hasD){ fit(w.detalle,mw,30,FB,"600"); txt(ell(clean(w.detalle),mw),tx,cyy+36,"#6b5683","left"); } });
    if(extra>0){ c.font=`800 28px ${FB}`; txt(`+${extra} más en el anuario`,W/2,my+96+lim.length*rowH+8,"#8a5fb8"); } }
  /* pie */
  if(logo){ const lh=tall?96:84, lw=lh*logo.width/logo.height; c.drawImage(logo,W/2-lw/2,H-80-lh,lw,lh); }
  else { c.font=`400 54px ${FD}`; txt("Peaches",W/2,H-86,"#3f2168"); }
  const nombreArch="anuario-"+(clean(n.titulo).toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi,"-").replace(/^-|-$/g,"")||"actividad")+".png";
  await anuEntregarPng_(cv,nombreArch,"Anuario "+yr);
}
/* Entrega un lienzo como PNG: en celular abre «compartir» del sistema; si no se puede, descarga (y muestra la imagen por si hay que guardarla a mano). */
async function anuEntregarPng_(cv,nombreArch,titulo){
  const bl=await new Promise(res=>{ try{ cv.toBlob(res,"image/png"); }catch(_){ res(null); } });
  if(!bl){ toast("No se pudo crear la imagen ❌ (alguna foto bloquea el lienzo)"); return; }
  const file=new File([bl],nombreArch,{type:"image/png"});
  const touch=matchMedia("(pointer:coarse)").matches;
  if(touch&&navigator.canShare&&navigator.canShare({files:[file]})){
    try{ await navigator.share({files:[file],title:titulo}); toast("Imagen lista ✅"); return; }catch(err){ if(err&&err.name==="AbortError"){ return; } }
  }
  const u=URL.createObjectURL(bl), a=document.createElement("a"); a.href=u; a.download=nombreArch; a.rel="noopener"; a.style.display="none";
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),60000);
  toast("Imagen lista ✅");
  if(touch) anuVistaPng_(u); // respaldo: si el navegador no descarga solo, se puede mantener presionada
}
/* ---------- Imagen PNG de un ranking (v3.64) ----------
   o = {titulo, sub, archivo, items:[{nombre, avatar, total, detalle}]} (ya ordenado, hasta 10). Mismo look que la tarjeta del Anuario:
   fondo durazno + tarjeta blanca con marco dorado, top 3 en podio (rosa / morado / celeste como en la app) y el resto en filas. 1080 px de ancho. */
async function rankCompartir_(o){
  if(_anuBusy){ toast("Ya se está creando la imagen… ⏳"); return; }
  _anuBusy=true; try{ await rankCompartirImpl_(o); } catch(err){ toast("No se pudo crear la imagen ❌"); console.error(err); } finally{ _anuBusy=false; }
}
async function rankCompartirImpl_(o){
  const items=(o&&o.items||[]).slice(0,10); if(!items.length){ toast("Todavía no hay nada que compartir 🍑"); return; }
  toast("Creando tu imagen… 🎨");
  try{ await Promise.race([anuFonts_(),new Promise(r=>setTimeout(r,2500))]); }catch(_){}
  const W=1080, FD='"Caveat Brush","Segoe Script","Brush Script MT",cursive', FB=(getComputedStyle(document.body).fontFamily||"system-ui")+',system-ui,sans-serif';
  const clean=s=>String(s||"").replace(/@/g,"").trim();
  const cache=new Map(), ld=u=>{ if(!u) return Promise.resolve(null); if(!cache.has(u)) cache.set(u,anuLoadImg_(u)); return cache.get(u); };
  const [bg,show,logo,...av]=await Promise.all([ld(ANU_BG),ld(ANU_SHOW),ld(ANU_LOGO),...items.map(it=>ld(it.avatar))]);
  const top=items.slice(0,3), rest=items.slice(3);
  const HDR=370, YB=HDR+640, ROWH=118, ROWG=14, restH=rest.length?rest.length*(ROWH+ROWG)+30:0, LOGOH=92;
  const H=Math.max(1350,YB+70+restH+LOGOH+120);
  const cv=document.createElement("canvas"); cv.width=W; cv.height=H; const c=cv.getContext("2d");
  const cover=(im,x,y,w,h)=>{ const r=Math.max(w/im.width,h/im.height), sw=w/r, sh=h/r; c.drawImage(im,(im.width-sw)/2,(im.height-sh)/2,sw,sh,x,y,w,h); };
  const rr=(x,y,w,h,r)=>{ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); };
  const fit=(t,maxW,size,font,wt)=>{ let s=size; for(;s>16;s-=2){ c.font=`${wt} ${s}px ${font}`; if(c.measureText(t).width<=maxW) break; } c.font=`${wt} ${s}px ${font}`; return s; };
  const ell=(t,maxW)=>{ t=String(t); if(c.measureText(t).width<=maxW) return t; while(t.length>1&&c.measureText(t+"…").width>maxW) t=t.slice(0,-1); return t+"…"; };
  const txt=(t,x,y,col,al="center")=>{ c.fillStyle=col; c.textAlign=al; c.textBaseline="alphabetic"; c.fillText(t,x,y); };
  const face=(img,cx,cy,r,ring,rw,nm)=>{ c.save(); c.shadowColor="rgba(0,0,0,.2)"; c.shadowBlur=20; c.shadowOffsetY=7; c.fillStyle="#fff"; c.beginPath(); c.arc(cx,cy,r+rw,0,7); c.fill(); c.restore();
    c.save(); c.beginPath(); c.arc(cx,cy,r,0,7); c.clip(); const im=img||show;
    if(im) cover(im,cx-r,cy-r,2*r,2*r); else { c.fillStyle="#ffb48a"; c.fillRect(cx-r,cy-r,2*r,2*r); c.font=`800 ${r}px ${FB}`; txt((nm||"?").charAt(0).toUpperCase(),cx,cy+r*.34,"#fff"); } c.restore();
    c.strokeStyle=ring; c.lineWidth=rw; c.beginPath(); c.arc(cx,cy,r+rw/2,0,7); c.stroke(); };
  const crown=(cx,cy,w)=>{ const h=w*.7; c.save(); c.translate(cx-w/2,cy); c.fillStyle="#ffc928"; c.strokeStyle="#c98a00"; c.lineWidth=4; c.lineJoin="round";
    c.beginPath(); c.moveTo(0,h); c.lineTo(0,h*.28); c.lineTo(w*.25,h*.62); c.lineTo(w*.5,0); c.lineTo(w*.75,h*.62); c.lineTo(w,h*.28); c.lineTo(w,h); c.closePath(); c.fill(); c.stroke(); c.restore(); };
  /* fondo y tarjeta */
  const g=c.createLinearGradient(0,0,W,H); g.addColorStop(0,"#fff1e6"); g.addColorStop(1,"#ffd9ec"); c.fillStyle=g; c.fillRect(0,0,W,H);
  if(bg){ cover(bg,0,0,W,H); c.fillStyle="rgba(255,248,242,.38)"; c.fillRect(0,0,W,H); }
  c.save(); c.shadowColor="rgba(63,33,104,.22)"; c.shadowBlur=40; c.shadowOffsetY=14; c.fillStyle="rgba(255,255,255,.82)"; rr(44,44,W-88,H-88,64); c.fill(); c.restore();
  c.strokeStyle="rgba(255,210,63,.9)"; c.lineWidth=5; rr(60,60,W-120,H-120,50); c.stroke();
  /* cabecera */
  let ts=108; for(;ts>54;ts-=4){ c.font=`400 ${ts}px ${FD}`; if(c.measureText(clean(o.titulo)).width<=W-240) break; }
  c.font=`400 ${ts}px ${FD}`; txt(clean(o.titulo),W/2,196,"#f81e8e");
  if(o.sub){ fit(clean(o.sub),W-240,38,FB,"800"); txt(ell(clean(o.sub),W-240),W/2,258,"#8a5fb8"); }
  /* podio: 2 · 1 · 3 */
  const COL={1:{ring:"#FF006A",c1:"#FF5C9D",c2:"#FF006A",bh:170,r:112},2:{ring:"#B200FE",c1:"#CF5CFF",c2:"#B200FE",bh:124,r:88},3:{ring:"#00B8FF",c1:"#6ED8FF",c2:"#00A0E0",bh:90,r:88}};
  const colW=(W-150)/3, pos=p=>W/2+(p===2?-1:p===3?1:0)*colW;
  [2,1,3].forEach(p=>{ const it=top[p-1]; if(!it) return; const k=COL[p], cx=pos(p), bw=colW-14, bt=YB-k.bh;
    /* bloque */
    const gr=c.createLinearGradient(0,bt,0,YB); gr.addColorStop(0,k.c1); gr.addColorStop(1,k.c2);
    c.fillStyle=gr; c.beginPath(); c.moveTo(cx-bw/2,YB); c.lineTo(cx-bw/2,bt+16); c.arcTo(cx-bw/2,bt,cx-bw/2+16,bt,16); c.lineTo(cx+bw/2-16,bt); c.arcTo(cx+bw/2,bt,cx+bw/2,bt+16,16); c.lineTo(cx+bw/2,YB); c.closePath(); c.fill();
    c.font=`900 ${p===1?84:70}px ${FB}`; txt(String(p),cx,bt+(p===1?96:80),"rgba(255,255,255,.62)");
    /* total */
    const tp=String(it.total); c.font=`900 34px ${FB}`; const tw=Math.max(72,c.measureText(tp).width+44), ty=bt-12-50;
    c.fillStyle=k.c2; rr(cx-tw/2,ty,tw,50,25); c.fill(); txt(tp,cx,ty+36,"#fff");
    /* detalle + nombre */
    let yy=ty-16;
    if(it.detalle){ /* el desglose se parte en líneas (por « · ») para que no se encoja si es largo */
      c.font=`600 25px ${FB}`; const partes=clean(it.detalle).split(" · "), lin=[]; let cur="";
      partes.forEach(s=>{ const t=cur?cur+" · "+s:s; if(cur&&c.measureText(t).width>colW-26){ lin.push(cur); cur=s; } else cur=t; }); if(cur) lin.push(cur);
      for(let li=lin.length-1;li>=0;li--){ c.font=`600 25px ${FB}`; txt(ell(lin[li],colW-26),cx,yy,"#6b5683"); yy-=30; }
      yy-=8; }
    const nm=clean(it.nombre)||"Miembro"; fit(nm,colW-26,p===1?40:36,FB,"800"); txt(ell(nm,colW-26),cx,yy,"#2a1745"); yy-=38;
    const cy=yy-k.r-10; face(av[p-1],cx,cy,k.r,k.ring,10,nm);
    if(p===1) crown(cx,cy-k.r-62,88);
  });
  /* resto (4.º en adelante) */
  rest.forEach((it,i)=>{ const yy=YB+70+i*(ROWH+ROWG), px=120, pw=W-240, cyy=yy+ROWH/2, idx=3+i;
    c.save(); c.shadowColor="rgba(63,33,104,.14)"; c.shadowBlur=16; c.shadowOffsetY=5; c.fillStyle="#fff"; rr(px,yy,pw,ROWH,ROWH/2); c.fill(); c.restore();
    const bx=px+ROWH/2, gb=c.createLinearGradient(bx-26,cyy-26,bx+26,cyy+26); gb.addColorStop(0,"#f81e8e"); gb.addColorStop(1,"#a45fc7");
    c.fillStyle=gb; c.beginPath(); c.arc(bx,cyy,26,0,7); c.fill(); c.font=`900 28px ${FB}`; txt(String(idx+1),bx,cyy+10,"#fff");
    face(av[idx],px+ROWH/2+72,cyy,40,"#a45fc7",5,clean(it.nombre));
    const tx=px+ROWH/2+72+40+22, tp=String(it.total); c.font=`900 38px ${FB}`; const tw=Math.max(76,c.measureText(tp).width+44), bxr=px+pw-34-tw;
    const mw=bxr-tx-16, nm=clean(it.nombre)||"Miembro", hasD=!!it.detalle;
    fit(nm,mw,hasD?38:42,FB,"800"); txt(ell(nm,mw),tx,hasD?cyy-4:cyy+13,"#2a1745","left");
    if(hasD){ fit(clean(it.detalle),mw,26,FB,"600"); txt(ell(clean(it.detalle),mw),tx,cyy+34,"#6b5683","left"); }
    c.fillStyle="#fde3f0"; rr(bxr,cyy-26,tw,52,26); c.fill(); c.font=`900 34px ${FB}`; txt(tp,bxr+tw/2,cyy+12,"#d6277f");
  });
  /* pie */
  if(logo){ const lw=LOGOH*logo.width/logo.height; c.drawImage(logo,W/2-lw/2,H-80-LOGOH,lw,LOGOH); }
  else { c.font=`400 54px ${FD}`; txt("Peaches",W/2,H-96,"#3f2168"); }
  const slug=String(o.archivo||"ranking").toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi,"-").replace(/^-|-$/g,"")||"ranking";
  await anuEntregarPng_(cv,slug+".png",clean(o.titulo)+(o.sub?" · "+clean(o.sub):""));
}
function anuVistaPng_(u){
  const bx=anuModal_(`<div class="md-body" style="text-align:center"><h3 class="md-t">Tu imagen</h3><p class="md-hint">Si no se descargó sola, mantén presionada la imagen y guárdala.</p><img src="${u}" alt="Imagen del anuario" style="max-width:100%;max-height:60vh;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.2)"><div class="md-acts"><button type="button" class="md-pri" data-close>Listo</button></div></div>`);
}

/* ---------- Vista Miembro / Staff (interruptor temporal al final de la página) ---------- */
function anuAplicarVista_(){ document.body.classList.toggle("anu-staff",!!staffPin); }
/* Tarjeta del miembro: al tocar un miembro se abre la ficha normal de la app */
document.addEventListener("anuario:miembro",e=>openMemberModal(e.detail.id,true));

/* ---------- Pantallas: portada, índice, detalle ---------- */
function anuIdx_(){
  const p=anuP_(), rows=anuRows_(p), el=$a("anuIdx");
  el.className=`anu-idx t-${p.tema}`;
  el.innerHTML=`<div class="idx-h"><img class="idx-peach" src="${ANU_DURAZNO}" alt=""><h3>Índice ${p.titulo}</h3></div>${p.n||p.admin?"":`<p class="anu-help">Aún no hay actividades en este año.</p>`}
    <ol class="anu-il">${rows.map(r=>`<li><button type="button" class="anu-row${r.k===anuS.key?" on":""}" data-k="${r.k}"${r.n?"":" disabled"}${r.k===anuS.key?' aria-current="true"':""}><b>${r.b}</b><i></i><span>${r.t}</span></button></li>`).join("")}</ol>`;
  el.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>anuPick_(b.dataset.k));
}
/* ---------- Tamaño de las portadas del mes ----------
   Al ENTRAR a la página de un mes se mide el espacio libre y se calcula UN ancho de tarjeta para que quepan 2 de lado a lado y 2 de arriba
   a abajo (las 4 primeras) sin recortar nada: solo se reduce el tamaño de la portada. Si hay más, se llega a ellas con scroll.
   La medida NO se recalcula si la pantalla cambia de tamaño ni cuando la app se refresca en segundo plano; solo al salir de la página
   (a otro mes, a una actividad, a la portada) y volver a entrar. Las filas incompletas quedan centradas (3 → 2 arriba y 1 al centro). */
const anuTop_=el=>{ let y=0; for(let e=el;e;e=e.offsetParent) y+=e.offsetTop; return y; };
function anuFitMide_(g){
  const det=$a("anuDet"), cards=[...g.querySelectorAll(":scope>.anu-card")].slice(0,4); if(!det||!cards.length) return 0;
  const cs=getComputedStyle(g), cg=parseFloat(cs.columnGap)||14, rg=parseFloat(cs.rowGap)||22, wMax=Math.floor((g.clientWidth-cg)/2); if(wMax<=0) return 0;
  const R=cards.map(c=>{ const im=c.querySelector("img.anu-pic"); return im&&im.naturalWidth?im.naturalHeight/im.naturalWidth:1; });
  const filas=[]; for(let i=0;i<R.length;i+=2) filas.push(Math.max(R[i],R[i+1]||0));
  const dcs=getComputedStyle(det), enDet=/auto|scroll/.test(dcs.overflowY);   // escritorio: scrollea #anuDet · celular: scrollea <body>
  const arriba=anuTop_(g)-(enDet?anuTop_(det)+det.clientTop:0);                // posición de la cuadrícula con el scroll en 0 (no depende de transformaciones ni de dónde esté el scroll)
  const alto=enDet?det.clientHeight-(parseFloat(dcs.paddingBottom)||0):document.body.clientHeight;
  const libre=alto-arriba-14-rg*(filas.length-1);                              // 14px de aire para la inclinación y la sombra de las tarjetas
  const w=Math.max(Math.floor(Math.min(wMax,libre/filas.reduce((a,b)=>a+b,0))),Math.min(wMax,80));
  /* Teléfono (pantalla angosta) y pocas tarjetas: se prueba también UNA columna (tarjetas a lo ancho, una bajo otra, en zigzag si no llegan al ancho completo)
     y se elige la distribución que deja las portadas más grandes. 2 tarjetas → normalmente una bajo otra; 3 → 2 arriba y 1 abajo salvo que quepan las 3 en columna. */
  const total=g.querySelectorAll(":scope>.anu-card").length, W=g.clientWidth;
  if(!anuDesk_()&&total<=4&&cards.length===total&&W>0){
    const libre1=alto-arriba-14-rg*(total-1), w1=Math.floor(Math.min(W,libre1/R.reduce((a,b)=>a+b,0)));
    if(w1>=Math.min(W,80)&&w1>=w) return {w:w1,cols:1,zz:w1<W*.88};
  }
  /* 4 portadas en teléfono: 2 por fila con zigzag (la columna derecha baja lo que haga falta, hasta ~1 portada) para que el conjunto llene todo el alto disponible y no quede vacío abajo */
  if(!anuDesk_()&&total===4&&cards.length===4&&W>0){
    const hMax=Math.max(...R), sumR=filas.reduce((a,b)=>a+b,0);
    let ww=wMax, off=Math.min(libre-sumR*ww,.95*ww*hMax);   // v3.59: el zigzag ya puede bajar hasta ~1 portada para que el conjunto llegue hasta el fondo (antes tope .34)
    if(off<.1*ww*hMax){ ww=Math.floor(Math.min(wMax,libre/(sumR+.1*hMax))); off=Math.round(.1*ww*hMax); }
    if(ww>=w) return {w:ww,cols:2,zz:false,zo:Math.max(0,Math.floor(off))};
  }
  return {w,cols:2,zz:false};
}
function anuFitPon_(g,r){ g.style.setProperty("--cw",r.w+"px"); g.dataset.cols=r.cols||2; if(r.zz) g.dataset.zz="1"; else delete g.dataset.zz;
  if(r.zo>0){ g.style.setProperty("--zo",r.zo+"px"); g.dataset.zig="1"; } else { g.style.removeProperty("--zo"); delete g.dataset.zig; } }
function anuFit_(g,sig){
  const fin=()=>g.classList.remove("fitting");
  const imgs=[...g.querySelectorAll(":scope>.anu-card img.anu-pic")].slice(0,4);
  const listas=imgs.map(im=>im.complete?Promise.resolve():new Promise(r=>{ im.addEventListener("load",r,{once:true}); im.addEventListener("error",r,{once:true}); }));
  Promise.race([Promise.all(listas),new Promise(r=>setTimeout(r,2500))])
    .then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
    .then(()=>{ if(!g.isConnected) return;
      try{ const r=anuFitMide_(g); if(r&&r.w){ anuFitPon_(g,r); anuS.fit={sig,...r}; } }catch(_){}
      fin(); })
    .catch(fin);
}
function anuDet_(){
  const p=anuP_(), d=$a("anuDet"); let h="";
  /* «enter» solo se pone cuando se ENTRA a una página distinta (un mes, Administradores, una actividad, otro año): ahí los elementos aparecen con animación.
     Si el libro solo se vuelve a dibujar (refresco de datos en segundo plano) no se repite, para que nada parpadee. */
  { const sig=(anuS.act?"a"+anuS.act:anuS.key?"k"+anuS.key:"i")+"|"+p.anio, entra=sig!==anuS.animSig; anuS.animSig=sig;
    d.className=`anu-detail t-${p.tema}${entra?" enter":""}`; }
  if(anuS.act) h=anuActHTML_(anuS.act);
  else if(anuS.key==="admin") h=anuAdminHTML_();
  else if(anuS.key){ const [y,m]=anuS.key.split("-").map(Number), c=p.cuenta.find(c=>c.m===m), n=c.items.length;
    h=`<div class="det-h"><h2>${MESES_LARGO[m]} <small>${y}</small></h2><span class="anu-n">${n} ${n===1?"actividad":"actividades"}</span></div><div class="anu-grid">${c.items.map((x,i)=>anuarioBlockHTML(x,i)).join("")}</div>`; }
  else h=`<div class="anu-hint"><img src="${ANU_DURAZNO}" alt=""><p>${p.n?"Elige un mes del índice.":"Aquí aparecerán las actividades."}</p></div>`;
  d.innerHTML=h;
  { const g=d.querySelector(".anu-grid");
    if(!g||anuS.v!=="libro"||anuS.act) anuS.fit=null;                                   // salió de la página de un mes: la próxima vez se vuelve a medir
    else { const sig=anuS.key+"|"+[...g.children].map(c=>c.dataset.anuario).join(",");
      if(anuS.fit&&anuS.fit.sig===sig) anuFitPon_(g,anuS.fit);   // misma visita (cambio de tamaño, refresco en segundo plano): se conserva la medida
      else { g.classList.add("fitting"); anuFit_(g,sig); } } }
  anuShineTint_(d);
  d.querySelectorAll("[data-anuario]").forEach(t=>t.onclick=()=>anuOpenAct_(t.dataset.anuario));
  d.querySelectorAll("[data-miembro]").forEach(t=>t.onclick=()=>anuAbrirMiembro_(t.dataset.miembro));
  d.querySelectorAll("[data-peachys-toggle]").forEach(bt=>{ const alt=()=>{
    const card=bt.closest(".bst"), open=bt.getAttribute("aria-expanded")!=="true";
    card.querySelector(".bst-count").classList.toggle("hidden",open);
    card.querySelector(".bst-full").classList.toggle("hidden",!open);
    bt.setAttribute("aria-expanded",String(open)); };
    bt.onclick=alt; bt.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); alt(); } }; });

  d.querySelectorAll(".act-pg img.js-longpress").forEach(img=>enableLongPress(img,img.dataset.filename));
  d.querySelectorAll("img.anu-fb").forEach(im=>{ const fb=()=>{ if(im.dataset.fb) return; im.dataset.fb="1"; im.src=ANU_SHOW; }; im.addEventListener("error",fb); if(im.complete&&im.naturalWidth===0) fb(); });
  d.querySelectorAll("[data-share-anuario]").forEach(bt=>bt.onclick=()=>anuCompartir_(bt.dataset.shareAnuario));
  d.querySelectorAll("[data-edit-anuario]").forEach(bt=>bt.onclick=()=>anuEditarTarjeta_(bt.dataset.editAnuario));
  d.querySelectorAll("[data-split-anuario]").forEach(bt=>bt.onclick=()=>anuDividir_(bt.dataset.splitAnuario,()=>mdHide_()));
  d.querySelectorAll("[data-delete-anuario]").forEach(bt=>bt.onclick=async()=>{
    if(!await confirmarAccion("¿Seguro que quieres borrar esta tarjeta completa del Anuario?")) return;
    const r=await apiPost({action:"deleteAnuario",id:bt.dataset.deleteAnuario}); if(r.ok){ toast("Borrado 🗑️"); anuS.act=null; await cargarDatos(); } else toast("Error: "+(r.error||"")); });
  d.querySelectorAll(".anu-card img.js-longpress").forEach(img=>enableLongPress(img,img.dataset.filename));
  bindAvatarFallbacks();
}
function anuLock_(){ document.body.classList.toggle("anu-lock",anuS.v==="libro"&&!!$a("viewAnuario")&&!$a("viewAnuario").classList.contains("hidden")); }
function anuView_(){
  anuLock_(); document.documentElement.setAttribute("data-anu-v",anuS.v);
  const p=anuP_(), inDet=!anuDesk_()&&anuS.key;
  $a("anuWrap").dataset.v=anuS.v; $a("anuBook").dataset.s=anuS.key?"det":"idx";
  $a("anuBackT").textContent=anuS.act?MESES_LARGO[+anuS.key.split("-")[1]]:inDet?"Índice":"Portada";
  $a("anuBarT").textContent=anuS.act?"Actividad":inDet?(anuS.key==="admin"?"Administración":MESES_LARGO[+anuS.key.split("-")[1]]):"Anuario "+p.titulo;
  anuIdx_(); anuDet_(); anuTabsAncho_();
}
/* Barra superior del libro (teléfono): cuando el contenido pasa por debajo, se le pone fondo para que no se solape con el título. */
(function(){ let t=false; const bar=()=>document.querySelector("#viewAnuario .anu-bar");
  const y=e=>{ const el=e&&e.target; return (!el||el===document||el===document.documentElement||el===document.body)?(document.body.scrollTop||document.documentElement.scrollTop||0):(el.scrollTop||0); };
  addEventListener("scroll",e=>{ if(t) return; t=true; const v=y(e); requestAnimationFrame(()=>{ t=false; const b=bar(); if(b) b.classList.toggle("sc",v>6); }); },{passive:true,capture:true}); })();
/* Ancho de las pestañas flotantes (Actividades/Anuario): la barra del libro se aparta justo lo necesario en pantalla ancha. */
function anuTabsAncho_(){
  const R=document.documentElement, tb=document.querySelector("header .tabs"), bk=$a("anuBook"), tw=tb&&tb.offsetWidth;
  if(tw) R.style.setProperty("--anu-tabs-w",tw+"px");
  if(!bk||!matchMedia("(min-width:900px)").matches) return;
  const r=bk.getBoundingClientRect(); if(!r.width) return;
  /* a la izquierda: el menú flotante ocupa ~62px desde el borde; a la derecha: las pestañas flotantes. Solo se aparta lo que haga falta. */
  R.style.setProperty("--anu-bar-pl",Math.max(0,Math.round(64-r.left))+"px");
  R.style.setProperty("--anu-bar-pr",Math.max(0,Math.round((tw||230)+36-(R.clientWidth-r.right)))+"px");
  /* el ancho útil cambia después de entrar (aparece la barra de scroll, carga el contenido): se recalcula solo para que las pestañas nunca tapen «Agregar» */
  if(window.ResizeObserver&&_anuRoEl!==bk){ if(_anuRO) _anuRO.disconnect(); _anuRoEl=bk; _anuRO=new ResizeObserver(()=>anuTabsAncho_()); _anuRO.observe(bk); _anuRO.observe(document.documentElement); }
}
let _anuRO=null,_anuRoEl=null;
addEventListener("resize",()=>{ if(document.body.classList.contains("anuario-mode")) anuTabsAncho_(); });
/* El año de la portada: si el tema del año trae «anioImg» se muestra esa imagen (la letra exacta de ese año); si no, texto con la letra del tema */
const _anuTV={};
function anuYearSet_(){
  const p=anuS.per[anuS.pi], y=$a("yrVal"); if(!p||!y) return; const t=_anuTV[p.anio];
  if(t&&t.anioImg){ const src=t._b+t.anioImg; if(!(y.firstElementChild&&y.firstElementChild.getAttribute("src")===src)) y.innerHTML=`<img src="${src}" alt="${p.titulo}" draggable="false">`; }
  else y.textContent=p.titulo;
}
function anuCover_(d){
  const per=anuS.per, y=$a("yrVal"), pe=$a("cvPeach");
  // Actualiza el año inmediatamente; la carga del tema y sus imágenes continúa en paralelo.
  if(!d) anuYearSet_(); y.className="cv-yv"; pe.classList.remove("wob"); void y.offsetWidth;
  if(d) pe.classList.add("wob");
  if(d) anuAplicarTema_(false);
  $a("yrPrev").disabled=anuS.pi===0; $a("yrNext").disabled=anuS.pi===per.length-1;
}
function anuYear_(d){ const n=anuS.pi+d; if(n<0||n>=anuS.per.length) return; anuS.pi=n; anuS.key=null; anuS.act=null; anuCover_(d); }
/* Cambio portada <-> libro con fundido suave de toda la pantalla (View Transitions); sin soporte, corte directo como antes */
function anuVT_(fn){
  if(anuReduce_()||!document.startViewTransition){ fn(); return; }
  const H=document.documentElement; H.classList.add("anu-vt","anu-vt-s");
  const end=()=>H.classList.remove("anu-vt","anu-vt-s");
  let t; try{ t=document.startViewTransition(async()=>{ fn(); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); }); }catch(_){ end(); fn(); return; }
  t.finished.catch(()=>{}).then(end);
}
function anuEnter_(){
  const c=$a("anuCover"); if(anuS.v!=="portada"||c.classList.contains("out")) return;
  const go=()=>{ anuS.v="libro"; anuS.act=null; anuS.key=anuDesk_()?anuFirst_():null; c.classList.remove("out"); anuView_(); document.body.scrollTo({top:0}); };
  if(anuReduce_()) return go();
  c.classList.add("out"); setTimeout(go,300);
}
function anuPick_(k){ anuS.key=k; anuS.act=null; anuView_(); $a("anuDet").scrollTop=0; document.body.scrollTo({top:0,behavior:anuReduce_()?"auto":"smooth"}); }
function anuBack_(){
  const toCover=!anuS.act&&!(!anuDesk_()&&anuS.key);
  const run=()=>{ if(anuS.act){ anuS.act=null; } else if(!anuDesk_()&&anuS.key){ anuS.key=null; } else { anuS.v="portada"; anuS.key=null; }
    anuView_(); document.body.scrollTo({top:0}); };
  run();
}
/* Abre el libro directo en la página de una tarjeta (lo usan las medallas del perfil). Devuelve false si la tarjeta no tiene fecha/año. */
function anuIrA_(id){
  const e=(DB.anuario||[]).find(x=>String(x.id)===String(id)); if(!e||!anuS.per||!anuS.per.length) return false;
  const d=anuFechaTarjeta_(e); if(!d) return false;
  const pi=anuS.per.findIndex(p=>p.anio===d.getFullYear()); if(pi<0) return false;
  const antes=anuS.pi, c=$a("anuCover");
  Object.assign(anuS,{pi,key:d.getFullYear()+"-"+d.getMonth(),act:String(e.id),v:"libro"});
  if(c) c.classList.remove("out");
  anuCover_(pi===antes?0:(pi>antes?1:-1));
  anuView_(); const det=$a("anuDet"); if(det) det.scrollTop=0;
  return true;
}
function renderAnuario(){
  (document.getElementById("anuBgCss")||document.head.appendChild(Object.assign(document.createElement("style"),{id:"anuBgCss"}))).textContent=anuS.bgCss||anuBgCss_(ANU_BG,ANU_BGH);
  const prev=anuS.v==="libro"?{pi:anuS.pi,key:anuS.key,act:anuS.act}:null;
  anuBuild_(); const d=anuS.per.map(p=>p.n>0).lastIndexOf(true);
  Object.assign(anuS,{pi:d<0?anuS.per.length-1:d,key:null,act:null,v:"portada"});
  if(prev&&prev.pi<anuS.per.length){ Object.assign(anuS,prev,{v:"libro"}); if(anuS.act&&!(DB.anuario||[]).some(x=>String(x.id)===String(anuS.act))) anuS.act=null; }
  anuAplicarVista_();
  $a("anuarioGrid").innerHTML=`<div class="anu-wrap" id="anuWrap" data-v="portada">${ANU_DEFS}
    <section class="anu-cover" id="anuCover"><div class="cv-main" id="cvMain"><div class="cv-poster" id="cvPoster"><img alt="Portada del Anuario"></div><img class="cv-logo" src="${ANU_LOGO}" alt="Peaches"><h1 class="cv-t"><span>Anuario</span><span>Peaches</span></h1>
      <div class="cv-peach" id="cvPeach"><img src="${ANU_DURAZNO}" alt="Durazno de Team Peaches"></div>
      <div class="cv25" id="cv25" aria-hidden="true"></div>
      <div class="cv-yr"><button type="button" class="cv-arr" id="yrPrev" aria-label="Año anterior">${CH_L}</button><div class="cv-yv" id="yrVal" aria-live="polite"></div><button type="button" class="cv-arr" id="yrNext" aria-label="Año siguiente">${CH_R}</button></div></div>
      <button type="button" class="cv-go" id="anuGo">Continuar</button></section>
    <section class="anu-book" id="anuBook"><div class="anu-bar"><button type="button" class="anu-menu" id="anuMenu" aria-label="Abrir menú"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg></button><button type="button" class="anu-bk" id="anuBack">${CH_L}<span id="anuBackT">Portada</span></button><div class="anu-bt" id="anuBarT"></div><button type="button" class="anu-add" id="anuAdd" aria-label="Agregar al anuario">＋<span class="lbl"> Agregar</span></button><button type="button" class="anu-home" id="anuHome" aria-label="Volver a Actividades" title="Volver a Actividades"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="hm-door" d="M9.5 20v-5.5h5V20z"/><path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M5.8 9.6V19a1 1 0 0 0 1 1h10.4a1 1 0 0 0 1-1V9.6"/><path d="M9.5 20v-5.5h5V20"/></svg></button></div>
      <div class="anu-cols"><aside id="anuIdx" aria-label="Índice por meses"></aside><div id="anuDet" aria-live="polite"></div></div></section></div>`;
  $a("yrPrev").onclick=()=>anuYear_(-1); $a("yrNext").onclick=()=>anuYear_(1);
  $a("anuGo").onclick=anuEnter_; $a("anuBack").onclick=anuBack_; $a("anuAdd").onclick=anuAgregar_;
  $a("anuMenu").onclick=()=>{ const h=document.getElementById("hamburgerBtn"); if(h) h.click(); };
  $a("anuHome").onclick=()=>{ const t=document.querySelector('.tab-btn[data-tab="actividades"]'); if(t) t.click(); };
  if(!window.anuInit){ window.anuInit=1;
    matchMedia("(min-width:900px)").addEventListener("change",()=>{ if(anuS.v==="libro"){ if(anuDesk_()&&!anuS.key) anuS.key=anuFirst_(); anuView_(); } });
    $a("anuModal").addEventListener("click",e=>{ if(e.target===e.currentTarget) mdHide_(); });
    addEventListener("keydown",e=>{ if(e.key==="Escape") mdHide_(); }); }
  const _p0=anuP_(); if(!(_p0&&anuListo_(_p0.anio))){ $a("anuWrap").classList.add("anu-wait"); document.documentElement.classList.remove("anu-ready"); }
  anuEscena_(); medHeader_(); anuCover_(0); anuView_(); anuS.th=undefined; anuAplicarTema_(true);
  setTimeout(()=>{ const w=$a("anuWrap"); if(w) w.classList.remove("anu-wait"); document.documentElement.classList.add("anu-ready"); },6000); /* red de seguridad: nunca se queda oculta */
  anuFonts_(); // La portada se muestra de inmediato; las fuentes con font-display:swap se aplican al terminar de cargar.
}
/* Preload display fonts without blocking the cover; the typeface swaps in when ready. */
let _anuFontsP=null;
function anuFonts_(){
  if(_anuFontsP) return _anuFontsP;
  const f=["Caveat Brush","Lilita One","Kaushan Script","Playfair Display"].map(n=>{ try{ return document.fonts.load('40px "'+n+'"'); }catch(_){ return Promise.resolve(); } });
  _anuFontsP=Promise.race([Promise.all(f).catch(()=>{}),new Promise(r=>setTimeout(r,1800))]);
  return _anuFontsP;
}
setTimeout(()=>anuFonts_(),300);


/* ---------- Temas por año: Anuario/<año>/tema.json (si falta algo, se usa el diseño de 2026) ---------- */
const ANU_TH_VARS={acento:"--anu-acc",acento2:"--anu-acc2",tinta:"--anu-ink",suave:"--anu-mut",tinte1:"--anu-t1",tinte2:"--anu-t2",titulo:"--anu-title",linea:"--anu-line",anioFuente:"--anu-yrfont",anioColor:"--anu-yrcolor",flechaFondo:"--anu-arrbg",flechaTexto:"--anu-arrfg"};
const anuBgCss_=(v,h)=>`#anuarioBg{background-image:url("${v}")}@media (min-width:900px){#anuarioBg{background-image:url("${h}")}}`;
const _anuTemas={};
function anuTema_(anio){
  return _anuTemas[anio]||(_anuTemas[anio]=fetch(`Anuario/${anio}/tema.json`).then(r=>r.ok?r.json():null)
    .then(t=>t&&typeof t==="object"?Object.assign(t,{_b:`Anuario/${anio}/`}):null).catch(()=>null).then(t=>{ _anuTV[anio]=t; return t; }));
}
/* ---------- Portada por CAPAS (tema.json → "capas"): cada elemento es una imagen suelta con su animación ---------- */
function anuEscena_(){
  if($a("anuScene")) return; const sc=document.createElement("div"); sc.id="anuScene"; sc.setAttribute("aria-hidden","true");
  sc.innerHTML='<div class="sc-in"><div class="sc-g sc-gl"><img class="sc-p sc-it" alt=""><img class="sc-p sc-ib" alt=""></div><div class="sc-g sc-gr"><img class="sc-p sc-dt" alt=""><img class="sc-p sc-db" alt=""></div><img class="sc-v sc-pt" alt=""><img class="sc-v sc-pb" alt=""></div><img class="sc-f sc-fm" alt=""><img class="sc-f sc-fp" alt=""><img class="sc-f sc-fg" alt=""><div class="sc-26"></div>';
  document.body.appendChild(sc);
  const sm=document.createElement("div"); sm.id="anuSceneM"; sm.setAttribute("aria-hidden","true");
  sm.innerHTML='<div class="sm-dots"></div><div class="sm-in"><img class="sm-p sm-morado" alt=""><img class="sm-p sm-azul" alt=""><img class="sm-p sm-verde" alt=""></div>';
  document.body.appendChild(sm);
}
/* Fondo de los MESES por piezas: papel + puntos + formas ancladas a su borde (tema.json → "mes") */
function anuMes_(t){
  const sm=$a("anuSceneM"); if(!sm) return; const m=t&&t.mes;
  if(!m){ sm.classList.remove("on"); return; }
  const B=t._b+(m.carpeta||"fondo/");
  (m.piezas||[]).forEach(n=>{ const im=sm.querySelector(".sm-"+n); if(im&&im.dataset.s!==B+n){ im.dataset.s=B+n; im.src=B+n+".svg"; } });
  sm.style.setProperty("--paper-m",m.papel||"#f6f2db");
  if(m.puntos) sm.style.setProperty("--dots-m",`url("${B}${m.puntos}")`);
  sm.classList.add("on");
}
/* Escena por piezas sueltas (tema.json → "escena"): papel limpio + piezas ancladas a los bordes, cada una con su respiración.
   Las posiciones vienen en unidades de un lienzo de referencia (ancho×alto) para horizontal ("h") y vertical ("v"). */
function anuEsc26_(t,sc){
  const e=t&&t.escena, box=sc&&sc.querySelector(".sc-26"); if(!box) return;
  sc.classList.toggle("esc",!!e);
  let st=document.getElementById("anuEsc26Css");
  if(!e){ box.innerHTML=""; delete box.dataset.k; if(st) st.textContent=""; return; }
  const B=t._b+(e.carpeta||"escena/"); if(box.dataset.k===B) return; box.dataset.k=B;
  const ord=(e.orden||[]).filter(n=>(e.h&&e.h.piezas&&e.h.piezas[n])||(e.v&&e.v.piezas&&e.v.piezas[n]));
  box.innerHTML=ord.map((n,i)=>`<img class="s26 s26-${n}" src="${B}${n}.webp" alt="" draggable="false" style="--d:${(8+(i*1.7)%5).toFixed(1)}s;--dl:${(-i*2.3).toFixed(1)}s">`).join("");
  const k=v=>`calc(var(--u26)*${v})`;
  const bloque=(o,mq)=>{ const g=e[o]; if(!g||!g.piezas) return "";
    const W=g.ancho||100, H=g.alto||100;
    return `@media ${mq}{#anuScene{--u26:min(calc(100vw / ${W}),calc(100vh / ${H}))}@supports (height:100dvh){#anuScene{--u26:min(calc(100vw / ${W}),calc(100dvh / ${H}))}}`+
      ord.map(n=>{ const p=g.piezas[n]; if(!p) return `#anuScene .s26-${n}{display:none}`;
        let r=`display:block;width:${k(p.w)};`;
        if(p.l!=null) r+=`left:${k(p.l)};`; if(p.r!=null) r+=`right:${k(p.r)};`;
        if(p.t!=null) r+=`top:${k(p.t)};`; if(p.b!=null) r+=`bottom:${k(p.b)};`;
        if(p.m!=null) r+=`top:calc(50% + ${k(p.m)});`;
        r+=`transform-origin:${p.r!=null&&p.l==null?"100%":"0"} ${p.t!=null?"0":p.b!=null?"100%":"50%"};`;
        return `#anuScene .s26-${n}{${r}}`; }).join("")+`}`; };
  if(!st){ st=document.createElement("style"); st.id="anuEsc26Css"; document.head.appendChild(st); }
  st.textContent=bloque("h","(orientation:landscape)")+bloque("v","(orientation:portrait)");
}
function anuCapas_(t,w){
  const c=t&&t.capas, e=t&&t.escena, box=$a("cv25"), sc=$a("anuScene"); if(!box) return;
  w.classList.toggle("c25",!!c);
  anuEsc26_(t,sc);
  if(!c&&e){ box.innerHTML=""; delete box.dataset.k; if(sc){ sc.style.setProperty("--paper",e.papel||"#f8f8f7"); sc.classList.add("on"); } return; }
  if(!c){ box.innerHTML=""; delete box.dataset.k; if(sc) sc.classList.remove("on"); return; }
  const B=t._b+(c.carpeta||"capas/"), M=c.piezas||{}, E=c.esquinas||{};
  if(!box.dataset.k||box.dataset.k!==B){ box.dataset.k=B;
    box.innerHTML=(c.orden||[]).map((n,i)=>{ const m=M[n]; if(!m) return ""; return `<img class="l25 l-${n}" src="${B}${n}.webp" alt="" draggable="false" style="--l:${m.l}%;--t:${m.t}%;--w:${m.w}%;--d:0s">`; }).join(""); }
  if(sc){ ["it","dt","ib","db","pt","pb","fg","fp","fm"].forEach(k=>{ const im=sc.querySelector(".sc-"+k), e=E[k]; if(im&&e&&im.dataset.s!==B+k){ im.dataset.s=B+k; im.src=B+k+".webp"; im.style.setProperty("--pw",e.w); } });
    sc.style.setProperty("--paper",c.papel||"#f0dcda"); sc.classList.add("on"); }
}
/* Imágenes ya descargadas y decodificadas (_anuOK) o que fallaron (_anuBad): así no se vuelve a esperar por ellas */
const _anuOK=new Set(), _anuBad=new Set();
const anuPre_=u=>new Promise(r=>{ if(_anuOK.has(u)){ r(!_anuBad.has(u)); return; } const i=new Image();
  i.onload=()=>{ const fin=()=>{ _anuOK.add(u); r(true); }; if(i.decode) i.decode().then(fin,fin); else fin(); };
  i.onerror=()=>{ _anuOK.add(u); _anuBad.add(u); r(false); }; i.src=u; });
const anuWait_=ms=>new Promise(r=>setTimeout(r,ms));
/* Todo lo que necesita un año para mostrarse completo (capas, esquinas, fondos de meses, año, portada) */
function anuUrls_(t,anio){
  if(!t) return [ANU_BG,ANU_BGH,ANU_DURAZNO];
  const B=t._b, u=[], pick=a=>Array.isArray(a)&&a.length?B+a[anio%a.length]:null;
  const fv=pick(t.fondos&&t.fondos.vertical), fh=pick(t.fondos&&t.fondos.horizontal)||fv; if(fv||fh) u.push(fv||fh,fh||fv);
  if(!(fv||fh)) u.push(ANU_BG,ANU_BGH,ANU_DURAZNO); /* sin «fondos» propios: los meses usan el fondo de siempre */
  const es=t.escena; if(es){ const eb=B+(es.carpeta||"escena/"); (es.orden||[]).forEach(n=>u.push(eb+n+".webp")); }
  if(t.portada) u.push(B+t.portada);
  if(t.anioImg) u.push(B+t.anioImg);
  const c=t.capas; if(c){ const cb=B+(c.carpeta||"capas/"); (c.orden||[]).forEach(n=>{ if((c.piezas||{})[n]) u.push(cb+n+".webp"); }); Object.keys(c.esquinas||{}).forEach(k=>u.push(cb+k+".webp")); }
  const m=t.mes; if(m){ const mb=B+(m.carpeta||"fondo/"); (m.piezas||[]).forEach(n=>u.push(mb+n+".svg")); if(m.puntos) u.push(mb+m.puntos); }
  return [...new Set(u)];
}
const anuListo_=anio=>(anio in _anuTV)&&anuUrls_(_anuTV[anio],anio).every(u=>_anuOK.has(u));
/* Espera a que TODO esté descargado y decodificado (máx. ms, para no quedarse colgado con mala señal) */
const anuPreAll_=(urls,ms)=>{ const pend=urls.filter(u=>!_anuOK.has(u)); if(!pend.length) return Promise.resolve();
  return Promise.race([Promise.all([...pend.map(anuPre_),anuFonts_()]),anuWait_(ms||3500)]); };
let _anuThSeq=0, _anuThSwapT=0;
/* Cambia el fondo del Anuario (con fundido). Estaba referenciada pero se había borrado en la reorganización v3.1 */
async function anuFondo_(v,h,instant){
  const css=anuBgCss_(v,h); if(anuS.bgCss===css||(!anuS.bgCss&&v===ANU_BG)) { anuS.bgCss=css; return; }
  const st=$a("anuBgCss"), b1=$a("anuarioBg");
  if(instant||anuReduce_()||!b1){ anuS.bgCss=css; if(st) st.textContent=css; return; }
  await Promise.race([Promise.all([anuPre_(v),anuPre_(h)]),anuWait_(2500)]);
  let b2=$a("anuarioBg2"); if(!b2){ b2=document.createElement("div"); b2.id="anuarioBg2"; b1.after(b2); }
  b2.style.setProperty("--bgv",`url("${v}")`); b2.style.setProperty("--bgh",`url("${h}")`); void b2.offsetWidth; b2.classList.add("on");
  anuS.bgCss=css;
  setTimeout(()=>{ if(anuS.bgCss!==css) return; if(st) st.textContent=css; b2.style.transition="none"; b2.classList.remove("on"); void b2.offsetWidth; b2.style.transition=""; },950);
}
/* Color de fondo de cada año (para la cortina de transición). Sin tema = el color base del diseño 2026 */
const anuColor_=t=>(t&&t.capas&&t.capas.papel)||(t&&t.escena&&t.escena.papel)||(t&&t.mes&&t.mes.papel)||"#fcf5ef";
function anuCortina_(){ let e=$a("anuCurtain"); if(!e){ e=document.createElement("div"); e.id="anuCurtain"; e.setAttribute("aria-hidden","true"); document.body.appendChild(e); } return e; }
const anuW_=ms=>anuWait_(anuReduce_()?0:ms);
/* Cambio de año en 4 tiempos: (1) sale lo viejo y entra una cortina de color  (2) la cortina pasa al color del año nuevo
   (3) aparecen los BORDES  (4) aparece el CENTRO. Todo se prepara detrás de la cortina, así nada entra "a medias". */
async function anuAplicarTema_(instant){
  const seq=++_anuThSeq, H=document.documentElement, w=$a("anuWrap"), c=$a("anuCover"), tLoad0=Date.now();
  clearTimeout(_anuThSwapT); H.classList.remove("anu-swapping"); if(c) c.classList.remove("sw");
  const p=anuS.per[anuS.pi]; if(!p) return;
  let t=await anuTema_(p.anio); if(seq!==_anuThSeq) return;
  const B=t&&t._b, pick=a=>Array.isArray(a)&&a.length?B+a[p.anio%a.length]:null;
  let v=pick(t&&t.fondos&&t.fondos.vertical), h=pick(t&&t.fondos&&t.fondos.horizontal)||v; v=v||h;
  let port=t&&t.portada?B+t.portada:null;
  /* Nada se muestra hasta que TODAS las piezas estén listas: así entran juntas */
  await anuPreAll_(anuUrls_(t,p.anio)); if(seq!==_anuThSeq) return;
  if((v&&_anuBad.has(v))||(h&&_anuBad.has(h))) v=h=null; if(port&&_anuBad.has(port)) port=null;
  if(!w||!c) return;
  /* Si todo ya estaba cargado (casi no hubo espera) la transición dura solo lo necesario; si hubo que esperar descargas, conserva los tiempos largos de siempre */
  const rapido=(Date.now()-tLoad0)<250, T=rapido?{leave:400,hold:480,edge:380,col:".5s"}:{leave:580,hold:1100,edge:560,col:"1s"};
  const key=t?String(p.anio):"def", first=instant||anuS.th===undefined, cur=anuCortina_();
  if(instant){ cur.classList.remove("on"); H.classList.remove("anu-x-hide"); w.classList.remove("anu-leave"); }
  if(!instant&&key===anuS.th){ /* mismo diseño: solo cambia el número del año */
    w.classList.add("anu-leave"); await anuW_(380); if(seq!==_anuThSeq) return;
    anuYearSet_(); w.classList.remove("anu-leave","anu-wait"); return;
  }
  const staged=first&&w.classList.contains("anu-wait");
  if(!first){
    /* 1) sale lo viejo y entra la cortina con el color del año actual */
    if(!cur.classList.contains("on")){ cur.style.transition="none"; cur.style.backgroundColor=anuS.col||"#fcf5ef"; void cur.offsetWidth; cur.style.transition=""; }
    cur.style.transition="opacity .55s ease,background-color "+T.col+" ease";
    w.classList.add("anu-leave"); cur.classList.add("on");
    await anuW_(T.leave); if(seq!==_anuThSeq) return;
    cur.style.backgroundColor=anuColor_(t); /* 2) la cortina pasa al color del año nuevo (y detrás se cambia todo) */
  }
  anuS.th=key; anuS.col=anuColor_(t);
  if(!first||staged) H.classList.add("anu-x-hide"); /* los bordes del año nuevo nacen ocultos */
  anuFondo_(v||ANU_BG,h||ANU_BGH,first);
  const col=(t&&t.colores)||{};
  Object.keys(ANU_TH_VARS).forEach(k=>{ if(col[k]) H.style.setProperty(ANU_TH_VARS[k],col[k]); else H.style.removeProperty(ANU_TH_VARS[k]); });
  if(t&&(t.capas||t.mes||t.colores||t.fondos||t.portada)) H.setAttribute("data-anu-th",String(p.anio)); else H.removeAttribute("data-anu-th");
  const img=$a("cvPoster").querySelector("img");
  if(t&&port){ img.src=port; w.classList.add("poster"); } else { w.classList.remove("poster"); img.removeAttribute("src"); }
  anuCapas_(t,w); anuMes_(t); anuYearSet_();
  if(!first){
    await anuW_(T.hold); if(seq!==_anuThSeq) return;                                /* se queda un momento en el color intermedio */
    cur.classList.remove("on"); H.classList.remove("anu-x-hide"); H.classList.add("anu-ready"); /* 3) bordes */
    await anuW_(T.edge); if(seq!==_anuThSeq) return;
    cur.style.transition="";
    w.classList.remove("anu-leave","anu-wait");                                      /* 4) centro */
  } else if(staged){
    await anuW_(380); if(seq!==_anuThSeq) return;
    H.classList.remove("anu-x-hide"); H.classList.add("anu-ready");                  /* bordes */
    await anuW_(480); if(seq!==_anuThSeq) return;
    w.classList.remove("anu-wait");                                                  /* centro */
  } else { w.classList.remove("anu-wait"); H.classList.add("anu-ready"); }
}

/* ---------- Cambio de tema oscuro (app) <-> claro (Anuario): velo central de transición ---------- */
(function(){
  let _ld=null, _ldT=0, _ldMinT=0, _ldSince=0;
  const ldEl=()=>{ if(_ld) return _ld; _ld=document.createElement("div"); _ld.id="anuLoad"; _ld.setAttribute("role","status"); _ld.setAttribute("aria-live","polite");
    _ld.innerHTML=`<div class="al-card"><span class="al-spark al-spark-a" aria-hidden="true">✦</span><span class="al-spark al-spark-b" aria-hidden="true">✧</span><span class="al-peach-wrap"><span class="al-peach-ring"></span><img class="al-peach" src="${ANU_DURAZNO}" alt=""></span><span class="al-brand">TEAM PEACHES</span><strong class="al-t"></strong><span class="al-sub"></span><span class="al-track" aria-hidden="true"><i></i></span></div>`;
    document.body.appendChild(_ld); return _ld; };
  const ldShow=(txt,toA)=>{ const e=ldEl(); clearTimeout(_ldT); clearTimeout(_ldMinT); e.querySelector(".al-t").textContent=txt; e.querySelector(".al-sub").textContent=toA?"Preparando tu anuario de recuerdos":"Volviendo a la página principal"; _ldSince=Date.now(); e.classList.add("on"); _ldT=setTimeout(ldHide,9000); };
  const ldHide=()=>{ clearTimeout(_ldT); clearTimeout(_ldMinT); if(!_ld) return; const min=matchMedia("(prefers-reduced-motion:reduce)").matches?180:350, wait=Math.max(0,min-(Date.now()-_ldSince)); _ldMinT=setTimeout(()=>{ if(_ld) _ld.classList.remove("on"); },wait); };
  const ldDone=()=>{ const t0=Date.now(), H=document.documentElement, v=document.getElementById("viewAnuario");
    (function p(){ if(!v||v.classList.contains("hidden")||H.classList.contains("anu-ready")||Date.now()-t0>4200) ldHide(); else setTimeout(p,80); })(); };
  const wrap=()=>{ const o=window.switchTab; if(typeof o!=="function"||o._anuVT) return;
    const n=function(tab){
      const toA=tab==="anuario", inA=document.body.classList.contains("anuario-mode"), args=arguments, self=this;
      if(toA===inA) return o.apply(self,args);
      ldShow(toA?"Abriendo el Anuario":"Volviendo",toA);
      /* Pintamos el velo primero; la pestaña y el Anuario se actualizan detrás sin capturar toda la app. */
      requestAnimationFrame(()=>requestAnimationFrame(()=>{ o.apply(self,args); requestAnimationFrame(()=>ldDone()); }));
    };
    n._anuVT=1; window.switchTab=n; };
  addEventListener("load",()=>{ wrap(); setTimeout(wrap,800); }); setTimeout(wrap,2500);
})();
