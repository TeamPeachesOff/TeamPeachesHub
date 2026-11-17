/* ---------- modal anuario (ventana suelta: una canción → Mejor / Mención) ---------- */
const anuCatIc_=c=>c==="doblaje"?"🎙️":c==="canto"?"🎤":"🥇";
/* Tarjeta de canción: título + usuario, y los botones «Mejor» (según canto/doblaje) y «Mención» */
function anuSongCardHTML_(s,cat,key,pick,done){
  const t=String(s.detalle||"").trim(), u=String(s.nombreUsuario||"").replace(/@/g,"");
  return `<div class="sg-card${pick?" on-"+pick:""}" data-key="${escAttr(key)}"><div><b>${escHtml(t||u||"Entrega")}</b>${t?`<small>${escHtml(u)}</small>`:""}${done?`<span class="sg-done">✓ ya está en el anuario</span>`:""}</div>
    <div class="sg-btns"><button type="button" data-k="mejor" class="${pick==="mejor"?"on":""}">${anuCatIc_(cat)} Mejor</button><button type="button" data-k="mencion" class="${pick==="mencion"?"on":""}">✨ Mención</button></div></div>`;
}
/* Líneas ya guardadas en el anuario, para avisar si una canción ya está */
function anuYaSet_(){
  const s=new Set(); (DB.anuario||[]).forEach(r=>["ganadorCanto","ganadorDoblaje","mencionesHonorificas"].forEach(k=>parseWinnerLines(r[k]).forEach(w=>s.add(String(w.nombre).trim()+"|"+String(w.detalle).trim()))));
  return s;
}
/* Agrega una o varias canciones en UNA sola tarjeta (la de la primera actividad) y, si hace falta, le pone el nombre elegido */
async function anuEnviar_(items,anchorId,nombre,idAnuario){
  const nm=String(nombre||"").trim();
  let r=await apiPost({action:"addToAnuarioLote",idActividad:anchorId,items,nombre:nm,idAnuario:idAnuario||""},items.length>1?`Guardando ${items.length} canciones en el Anuario...`:"Agregando al Anuario...");
  if(!r.ok&&/acci[oó]n|action|desconoc/i.test(String(r.error||""))){ // backend viejo sin «lote»: modo uno por uno
    for(let i=0;i<items.length;i++){ const it=items[i];
      r=await apiPost({action:"addToAnuario",idActividad:anchorId,destino:it.destino,nombreUsuario:it.nombreUsuario,detalle:it.detalle,link:it.link},`Agregando al Anuario (${i+1}/${items.length})...`);
      if(!r.ok) break; }
    if(r.ok&&nm){ await cargarDatos(); const row=(DB.anuario||[]).find(x=>String(x.id)===String(anchorId))||(DB.anuario||[])[(DB.anuario||[]).length-1];
      if(row&&String(row.titulo||"").trim()!==nm){ const data=datosActividadParaGuardar(row,row.imagenUrl||""); data.titulo=nm; data.id=row.id; await apiPost({action:"editAnuario",data},"Guardando el nombre..."); } } }
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
  box.querySelectorAll("[data-k]").forEach(b=>b.onclick=async()=>{
    box.querySelectorAll("[data-k]").forEach(x=>x.disabled=true);
    const ok=await anuEnviar_([{destino:b.dataset.k==="mencion"?"mencion":(cat==="doblaje"?"doblaje":"cancion"),nombreUsuario,detalle,link}],idActividad,"");
    if(ok){ toast("Agregado al Anuario 👑"); closeModal("anuarioModal"); } else box.querySelectorAll("[data-k]").forEach(x=>x.disabled=false);
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
const anuArc_=(id,t)=>`<svg class="anu-arc" viewBox="0 0 100 100" aria-hidden="true"><path id="arc${escAttr(id)}" d="M2.2 45.8A48 48 0 0 1 97.8 45.8" fill="none"/><text class="t1" textLength="${(t.length*14.5).toFixed(0)}" lengthAdjust="spacing"><textPath href="#arc${escAttr(id)}" startOffset="50%" text-anchor="middle">${t}</textPath></text><text class="t2" textLength="${(t.length*14.5).toFixed(0)}" lengthAdjust="spacing"><textPath href="#arc${escAttr(id)}" startOffset="50%" text-anchor="middle">${t}</textPath></text></svg>`;
const anuIsF_=m=>esTrue(m.fundadora)||esTrue(m.fundador);
const anuFundEt_=m=>(anuKey_(m.nombre).startsWith("eryck")||(esTrue(m.fundador)&&!esTrue(m.fundadora)))?"Fundador":"Fundadora";
const anuRolDe_=m=>anuIsF_(m)?"f":esTrue(m.lider)?"a":esTrue(m.staff)?"s":null;
function anuStaffIdx_(m){ const ok=x=>x.nombre&&String(x.nombre).trim()!=="", L=(DB.miembros||[]).filter(ok);
  const o=[...L.filter(anuIsF_),...L.filter(x=>esTrue(x.lider)&&!anuIsF_(x)),...L.filter(x=>esTrue(x.staff)&&!anuIsF_(x)&&!esTrue(x.lider))]; return Math.max(0,o.findIndex(x=>String(x.id)===String(m.id))); }
function anuFrame_(m,rol,i){
  const c=m.color||(rol==="f"?"#d6277f":ANU_COLORES[i%ANU_COLORES.length]);
  const et=rol==="f"?anuFundEt_(m):rol==="a"?"Admin":"Staff";
  return {c,et,html:`<span class="anu-av">${rol==="f"?"":anuSprout_()}${anuWreath_(c)}${avatarImgTag(m)}${rol==="f"?ANU_CROWN2+anuArc_("m"+m.id,et.toUpperCase()):anuRol_("m"+m.id,et)}</span>`};
}
function anuMiembro_(m,rol,i){
  const {c,et,html}=anuFrame_(m,rol,i);
  return `<button type="button" class="anu-m${rol==="f"?" f":""}" data-miembro="${escAttr(m.id)}" style="--pc:${c};--nl:${Math.max(6,[...String(m.nombre||"")].length)}" aria-label="${et}: ${escAttr(m.nombre||"")}">${html}<span class="anu-pn">${escHtml(m.nombre||"")}</span></button>`;
}
function anuAdminHTML_(){
  const ok=m=>m.nombre&&String(m.nombre).trim()!=="", isF=m=>esTrue(m.fundadora)||esTrue(m.fundador);
  const fund=DB.miembros.filter(m=>ok(m)&&isF(m));
  const adm=DB.miembros.filter(m=>ok(m)&&esTrue(m.lider)&&!isF(m));
  const stf=DB.miembros.filter(m=>ok(m)&&esTrue(m.staff)&&!isF(m)&&!esTrue(m.lider));
  let i=0;
  return `<div class="det-h sm"><h2>Administración y Staff</h2></div><div class="adm">${fund.length?`<div class="adm-row f">${fund.map(m=>anuMiembro_(m,"f",i++)).join("")}</div>`:""}<div class="adm-row">${adm.map(m=>anuMiembro_(m,"a",i++)).join("")}${stf.map(m=>anuMiembro_(m,"s",i++)).join("")}</div></div>`;
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
function anuBuild_(){
  const it=[]; (DB.anuario||[]).forEach(e=>{ const n=anuNorm_(e); if(!n.f) return; const d=anuFecha_(n.f); if(isNaN(d)) return;
    it.push({n,anio:d.getFullYear(),mes:d.getMonth(),dia:d.getDate(),sem:["dom","lun","mar","mié","jue","vie","sáb"][d.getDay()],t:d.getTime()}); });
  const anios=[...new Set(it.map(x=>x.anio))].sort((x,y)=>x-y); if(!anios.length) anios.push(new Date().getFullYear());
  anuS.per=anios.map(y=>{
    const ms=y===2026?[...new Set([7,8,9,10,11,...it.filter(x=>x.anio===y).map(x=>x.mes)])].sort((a,b)=>a-b):Array.from({length:12},(_,i)=>i);
    const p={anio:y,titulo:String(y),tema:y===2026?"p":"o",admin:y===2026};
    p.cuenta=ms.map(m=>({m,items:it.filter(x=>x.anio===y&&x.mes===m).sort((a,b)=>a.t-b.t||rankCategoria(a.n.e.categoria)-rankCategoria(b.n.e.categoria))})); p.n=p.cuenta.reduce((s,c)=>s+c.items.length,0); return p; });
}
const anuP_=()=>anuS.per[anuS.pi];
const anuRows_=p=>[...(p.admin?[{k:"admin",b:"00",t:"Administradores",n:1}]:[]),...p.cuenta.map(c=>({k:p.anio+"-"+c.m,b:pad(c.m+1),t:MESES_LARGO[c.m],n:c.items.length}))];
const anuFirst_=()=>(anuRows_(anuP_()).find(r=>r.n)||{}).k||null;
function anuWinBadges_(e){
  const b=parseWinnerLines(e.ganadorCanto).length+parseWinnerLines(e.ganadorDoblaje).length, m=parseWinnerLines(e.mencionesHonorificas).length;
  return (b||m)?`<span class="anu-win">${b?`<i class="w1">👑 ${b} ${b===1?"Mejor":"Mejores"}</i>`:""}${m?`<i class="w2">🎖️ ${m} ${m===1?"Mención":"Menciones"}</i>`:""}</span>`:"";
}
function anuarioBlockHTML(x,i=0){
  const n=x.n, im=n.imgs, r=[-1.6,1.2,-0.8,1.8][i%4], img=(s,f)=>`<img${f?` class="js-longpress" data-filename="${escAttr(n.titulo+".jpg")}"`:""} src="${escAttr(s)}" alt="" loading="lazy" decoding="async">`;
  const pics=im.length>1?`<span class="anu-pics two">${img(im[1])}${img(im[0],1)}</span>`:`<span class="anu-pics">${im[0]?img(im[0],1):""}</span>`;
  return `<button type="button" class="anu-card" data-anuario="${escAttr(n.e.id)}" style="--r:${r}deg;--i:${Math.min(i,10)}">${pics}<span class="anu-cb"><span class="anu-ct">${escHtml(n.titulo)}</span>${anuWinBadges_(n.e)}<span class="anu-tags">${n.tipos.map(anuTag_).join("")}<span class="anu-day">${x.dia} ${MESES_LARGO[x.mes].slice(0,3).toLowerCase()}</span></span></span></button>`;
}


/* ---------- Página de la actividad ---------- */
const anuKey_=v=>String(v||"").replace(/@/g,"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/gi,"").toLowerCase();
const anuMem_=nm=>{ const k=anuKey_(nm); if(!k) return null; const L=DB.miembros||[];
  return L.find(m=>anuKey_(m.nombre)===k)||L.find(m=>["usuarioSmule","usuarioBandlab","usuarioDiscord"].some(f=>anuKey_(m[f])===k))
    ||(k.length>=4?(()=>{ const c=L.filter(m=>{ const n=anuKey_(m.nombre); return n.length>=4&&(n.includes(k)||k.includes(n)); }); return c.length===1?c[0]:null; })():null)||null; };
function anuRowW_(w){
  const m=anuMem_(w.nombre), nm=String(w.nombre||"").replace(/@/g,"");
  return `<div class="act-row"><button type="button" class="act-who"${m?` data-miembro="${escAttr(m.id)}"`:""}><img class="anu-fb" src="${escAttr(anuAv_(m))}" alt=""><span><b>${escHtml(nm||"Miembro")}</b><small>${escHtml(w.detalle||"")}</small></span></button>${w.link?`<a class="act-play" href="${escAttr(w.link)}" target="_blank" rel="noopener" aria-label="Escuchar">▶</a>`:""}</div>`;
}
function anuActHTML_(id){
  const e=(DB.anuario||[]).find(x=>String(x.id)===String(id)); if(!e) return "";
  const n=anuNorm_(e), f=anuFecha_(n.f), mens=parseWinnerLines(e.mencionesHonorificas);
  const best=[...parseWinnerLines(e.ganadorCanto).map(w=>({w,l:"Mejor canción"})),...parseWinnerLines(e.ganadorDoblaje).map(w=>({w,l:"Mejor doblaje"}))];
  const fechaTxt=isNaN(f)?"":`${f.getDate()} de ${MESES_LARGO[f.getMonth()].toLowerCase()} ${f.getFullYear()}`;
  return `<div class="act-pg"><div class="act-h">${n.imgs.length?`<span class="act-ps"><img class="js-longpress" data-filename="${escAttr(n.titulo+".jpg")}" src="${escAttr(n.imgs[0])}" alt=""></span>`:""}<div><h2>${escHtml(n.titulo)}</h2><div class="md-meta"><span>${fechaTxt}</span>${n.tipos.map(anuTag_).join("")}</div></div></div>
    <h3 class="act-sec">👑 Lo mejor de la actividad</h3>
    ${best.length?`<div class="act-best">${best.map(x=>{ const m=anuMem_(x.w.nombre), nm=String(x.w.nombre||"").replace(/@/g,"");
      return `<div class="bst"><span class="bst-l">${x.l}</span><button type="button" class="bst-av"${m?` data-miembro="${escAttr(m.id)}"`:""} aria-label="${escAttr(nm)}">${ANU_CROWN}<img class="anu-fb" src="${escAttr(anuAv_(m))}" alt=""></button><b>${escHtml(nm||"Miembro")}</b><small>${escHtml(x.w.detalle||"")}</small>${x.w.link?`<a class="md-play" href="${escAttr(x.w.link)}" target="_blank" rel="noopener">Ver presentación</a>`:""}</div>`; }).join("")}</div>`:`<p class="md-empty" style="text-align:center">Todavía sin ganadores asignados.</p>`}
    ${mens.length?`<h3 class="act-sec">🎖️ Menciones honoríficas</h3><div class="act-list">${mens.map(anuRowW_).join("")}</div>`:""}
    <div class="act-staff"><button type="button" class="shr" data-share-anuario="${escAttr(e.id)}">${ANU_SHARE_ICON}<span>Compartir</span></button><button type="button" data-edit-anuario="${escAttr(e.id)}">✏️ Editar</button><button type="button" class="del" data-delete-anuario="${escAttr(e.id)}">🗑️ Borrar tarjeta</button></div></div>`;
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
  const enMes=a=>[a.fechaInicio,a.fechaFin].some(f=>{ const d=anuFecha_(f); return !isNaN(d)&&d.getFullYear()===y&&d.getMonth()===m; });
  const entregasDe=a=>(DB.entregas||[]).filter(e=>String(e.idActividad)===String(a.id));
  const nSel=()=>Object.keys(picks).length;
  const drawActs=()=>{
    const enAnu=new Set((DB.anuario||[]).map(r=>String(r.id)));
    const L=(DB.actividades||[]).filter(enMes).sort((a,c)=>anuFecha_(a.fechaInicio)-anuFecha_(c.fechaInicio)||rankCategoria(a.categoria)-rankCategoria(c.categoria));
    const b=anuModal_(`<div class="md-body"><h3 class="md-t">Agregar al anuario</h3>
      <div class="md-nav"><button type="button" data-nav="-1" aria-label="Mes anterior">${CH_L}</button><b>${MESES_LARGO[m]} ${y}</b><button type="button" data-nav="1" aria-label="Mes siguiente">${CH_R}</button></div>
      <p class="md-hint">Toca una o varias actividades; después eliges sus canciones.</p>
      <div class="md-list">${L.length?L.map((a,i)=>{ const x=TIPO_[a.categoria]||{t:"Especial",e:"✨"};
        return `<button type="button" class="md-opt${sel.some(s=>String(s.id)===String(a.id))?" sel":""}" data-a="${i}" aria-pressed="${sel.some(s=>String(s.id)===String(a.id))}">${a.imagenUrl?`<img src="${escAttr(a.imagenUrl)}" alt="">`:""}<span><b>${escHtml(a.titulo||"")}</b><small>${x.e} ${x.t} · ${dm(a.fechaInicio)} → ${dm(a.fechaFin)}${enAnu.has(String(a.id))?" · ya está en el anuario":""}</small></span></button>`; }).join(""):`<p class="md-empty">No hay actividades con fecha en este mes.</p>`}</div>
      <div class="md-acts"><button type="button" class="md-sec" data-close>Cerrar</button><button type="button" class="md-pri" id="sgNext" aria-disabled="${sel.length?"false":"true"}">Continuar${sel.length?` (${sel.length})`:""}</button></div></div>`);
    if(target) b.querySelectorAll("[data-close]").forEach(x=>{ x.textContent="← Volver"; x.onclick=target.volver; });
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
        return `<section class="sg-grp"><h4 class="sg-gt">${a.imagenUrl?`<img src="${escAttr(a.imagenUrl)}" alt="">`:""}<span>${escHtml(a.titulo||"")}<small>${x.e} ${x.t}</small></span></h4>${es.length?es.map((e,i)=>{ const key=a.id+"|"+i;
          return anuSongCardHTML_({nombreUsuario:e.nombreUsuario,detalle:e.detalleEntrega},a.categoria,key,picks[key]||"",ya.has(String(e.nombreUsuario||"").trim()+"|"+String(e.detalleEntrega||"").trim())); }).join(""):`<p class="md-empty">Esta actividad todavía no tiene entregas.</p>`}</section>`; }).join("")}
      <div class="sg-bar"><button type="button" class="md-sec" data-close>Cerrar</button><button type="button" class="md-pri" id="sgGo" aria-disabled="true">Añadir al anuario</button></div></div>`);
    const upd=()=>{ const n=nSel(), g=$a("sgGo"); g.setAttribute("aria-disabled",String(!n)); g.textContent=n?`Añadir al anuario (${n})`:"Añadir al anuario"; };
    $a("mdBack").onclick=()=>{ paso="acts"; drawActs(); };
    if(target) b.querySelectorAll("[data-close]").forEach(x=>{ x.textContent="← Volver"; x.onclick=target.volver; });
    if($a("sgName")) $a("sgName").oninput=e=>{ nombre=e.target.value; tocado=true; };
    b.querySelectorAll(".sg-card").forEach(card=>card.querySelectorAll("[data-k]").forEach(btn=>btn.onclick=()=>{
      const key=card.dataset.key, k=btn.dataset.k;
      if(picks[key]===k) delete picks[key]; else picks[key]=k;
      card.classList.remove("on-mejor","on-mencion"); if(picks[key]) card.classList.add("on-"+picks[key]);
      card.querySelectorAll("[data-k]").forEach(x=>x.classList.toggle("on",picks[key]===x.dataset.k)); upd(); }));
    $a("sgGo").onclick=async()=>{
      if(!nSel()){ toast("Elige «Mejor» o «Mención» en al menos una canción"); return; }
      if(b.dataset.busy==="1") return;
      const items=[]; sel.forEach(a=>entregasDe(a).forEach((e,i)=>{ const p=picks[a.id+"|"+i]; if(!p) return;
        items.push({destino:p==="mencion"?"mencion":(a.categoria==="doblaje"?"doblaje":"cancion"),nombreUsuario:e.nombreUsuario||"",detalle:e.detalleEntrega||"",link:e.linkGrabacion||""}); }));
      if(!items.length) return;
      b.dataset.busy="1"; b.querySelectorAll("button,input").forEach(x=>x.disabled=true);
      const ok=await anuEnviar_(items,sel[0].id,(!target&&tocado)?nombre:"",target&&target.id);
      if(ok){ toast("Agregado al Anuario 👑"); if(target) target.volver(); else mdHide_(); } else { b.dataset.busy="0"; b.querySelectorAll("button,input").forEach(x=>x.disabled=false); upd(); }
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
  [["canto","ganadorCanto"],["doblaje","ganadorDoblaje"],["mencion","mencionesHonorificas"]].forEach(([t,k])=>parseWinnerLines(row[k]).forEach(w=>{ const act=actDe(w); st.L.push({w,tipo:t,best:t==="mencion"?(act&&act.categoria==="doblaje"?"doblaje":"canto"):t,act}); }));
  const datos=()=>({id:st.id,titulo:st.titulo.trim()||row.titulo||"Actividad",imagenUrl:st.imagenUrl,fechaInicio:st.fi,fechaFin:st.ff,
    ganadorCanto:st.L.filter(i=>i.tipo==="canto").map(i=>anuLn_(i.w)).join("\n"),ganadorDoblaje:st.L.filter(i=>i.tipo==="doblaje").map(i=>anuLn_(i.w)).join("\n"),mencionesHonorificas:st.L.filter(i=>i.tipo==="mencion").map(i=>anuLn_(i.w)).join("\n")});
  const guardar=async()=>{ const r=await apiPost({action:"editAnuario",data:datos()},"Guardando tarjeta del Anuario..."); if(!r.ok){ toast("Error: "+(r.error||"")); return false; } st.dirty=false; await cargarDatos(); return true; };
  const grupos=()=>{ const g=new Map(); st.L.forEach((it,i)=>{ const k=it.act?String(it.act.id):"otras"; if(!g.has(k)) g.set(k,{act:it.act,items:[]}); g.get(k).items.push({it,i}); });
    return [...g.values()].sort((a,b)=>(a.act?0:1)-(b.act?0:1)||(anuFecha_(a.act&&a.act.fechaInicio)-anuFecha_(b.act&&b.act.fechaInicio))||0); };
  const draw=()=>{
    const gs=grupos();
    const b=anuModal_(`<div class="md-body"><h3 class="md-t">Editar tarjeta del Anuario</h3><p class="md-hint">Aquí solo cambias esta tarjeta; la actividad original nunca se toca.</p>
      <label class="sg-name-l" for="edT">Nombre de la tarjeta</label><input class="sg-name" id="edT" type="text" maxlength="120" value="${escAttr(st.titulo)}">
      <label class="sg-name-l">Imagen</label><div class="ed-img">${st.imagenUrl?`<img src="${escAttr(st.imagenUrl)}" alt="">`:`<img alt="">`}<input class="sg-name" id="edI" type="text" placeholder="https://…" value="${escAttr(st.imagenUrl)}"><label class="ed-up">Subir<input type="file" id="edF" accept=".jpg,.jpeg,.png,image/jpeg,image/png" hidden></label></div>
      <div class="ed-row"><div><label class="sg-name-l" for="edFi">Fecha inicio</label><input class="sg-name" id="edFi" type="date" value="${escAttr(st.fi)}"></div><div><label class="sg-name-l" for="edFf">Fecha fin</label><input class="sg-name" id="edFf" type="date" value="${escAttr(st.ff)}"></div></div>
      <h4 class="sg-gt" style="margin-top:20px"><span>Actividades incluidas (${gs.filter(x=>x.act).length||0})<small>${st.L.length} ${st.L.length===1?"canción":"canciones"} en total</small></span></h4>
      ${gs.length?gs.map(g=>{ const x=g.act?(TIPO_[g.act.categoria]||{t:"Especial",e:"✨"}):null;
        return `<section class="sg-grp" style="margin-top:12px"><h4 class="sg-gt" style="font-size:20px">${g.act&&g.act.imagenUrl?`<img src="${escAttr(g.act.imagenUrl)}" alt="">`:""}<span>${escHtml(g.act?g.act.titulo||"":"Otras canciones")}<small>${x?x.e+" "+x.t:"No se pudo ligar a una actividad"}</small></span></h4>${g.items.map(({it,i})=>`<div class="ed-line m-${it.tipo==="mencion"?"mencion":"mejor"}"><div><b>${escHtml(String(it.w.nombre||"").replace(/@/g,""))}</b>${it.w.detalle?`<small>${escHtml(it.w.detalle)}</small>`:""}</div><div class="ed-ctl"><button type="button" data-t="mejor" data-i="${i}" class="${it.tipo!=="mencion"?"on":""}">👑 Mejor</button><button type="button" data-t="mencion" data-i="${i}" class="${it.tipo==="mencion"?"on":""}">🎖️ Mención</button><button type="button" class="ed-x" data-x="${i}" aria-label="Quitar">🗑️</button></div></div>`).join("")}</section>`; }).join(""):`<p class="md-empty">Esta tarjeta todavía no tiene canciones.</p>`}
      <div class="ed-big"><button type="button" id="edAdd">＋ Agregar actividad</button><button type="button" id="edMerge">🔀 Fusionar tarjetas</button></div>
      <div class="md-acts"><button type="button" class="md-sec" data-close>Cerrar</button><button type="button" class="md-pri" id="edSave">Guardar</button></div></div>`);
    const val=(sel,f)=>{ const el=b.querySelector(sel); el.oninput=()=>{ f(el.value); st.dirty=true; }; };
    val("#edT",v=>st.titulo=v); val("#edFi",v=>st.fi=v); val("#edFf",v=>st.ff=v);
    b.querySelector("#edI").oninput=e=>{ st.imagenUrl=e.target.value; st.dirty=true; };
    b.querySelector("#edI").onchange=e=>{ const im=b.querySelector(".ed-img img"); if(im) im.src=e.target.value; };
    b.querySelector("#edF").onchange=async e=>{ const f=e.target.files[0]; if(!f) return;
      try{ const base64Data=await fileToBase64(f); const r=await apiPost({action:"uploadImage",filename:f.name,base64Data},"Subiendo imagen..."); if(r.ok){ st.imagenUrl=r.url; st.dirty=true; draw(); } else toast("Error: "+(r.error||"")); }catch(_){ toast("No se pudo leer la imagen"); } };
    b.querySelectorAll("[data-t]").forEach(bt=>bt.onclick=()=>{ const it=st.L[+bt.dataset.i]; it.tipo=bt.dataset.t==="mencion"?"mencion":it.best; st.dirty=true; draw(); });
    b.querySelectorAll("[data-x]").forEach(bt=>bt.onclick=()=>{ st.L.splice(+bt.dataset.x,1); st.dirty=true; draw(); });
    const antes=async()=>{ if(st.dirty) return await guardar(); return true; };
    b.querySelector("#edAdd").onclick=async()=>{ if(!await antes()) return; anuAgregar_({id:st.id,titulo:st.titulo,fecha:st.fi,volver:()=>anuEditarTarjeta_(st.id)}); };
    b.querySelector("#edMerge").onclick=async()=>{ if(!await antes()) return; fusion(); };
    b.querySelector("#edSave").onclick=async()=>{ if(st.busy) return; st.busy=true; const ok=await guardar(); st.busy=false; if(ok){ toast("Tarjeta guardada ✅"); mdHide_(); } };
  };
  const fusion=()=>{
    const cur=(DB.anuario||[]).find(x=>String(x.id)===String(st.id))||row;
    const otras=(DB.anuario||[]).filter(x=>String(x.id)!==String(st.id)).sort((a,c)=>anuFecha_(c.fechaInicio)-anuFecha_(a.fechaInicio)); const sel=new Set();
    const nL=r=>["ganadorCanto","ganadorDoblaje","mencionesHonorificas"].reduce((s,k)=>s+parseWinnerLines(r[k]).length,0);
    const dm=f=>{ const d=anuFecha_(f); return isNaN(d)?"":d.getDate()+" "+MESES_LARGO[d.getMonth()].slice(0,3).toLowerCase()+" "+d.getFullYear(); };
    const d1=()=>{ const b=anuModal_(`<div class="md-body"><button type="button" class="md-back" id="fuBack">← Volver a la tarjeta</button><h3 class="md-t">Fusionar tarjetas</h3><p class="md-hint">Elige las tarjetas que quieres juntar dentro de «${escHtml(cur.titulo||"")}». Sus canciones pasan a esta tarjeta y las otras se borran.</p>
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
  const best=[...parseWinnerLines(e.ganadorCanto).map(w=>({w,l:"MEJOR CANCIÓN"})),...parseWinnerLines(e.ganadorDoblaje).map(w=>({w,l:"MEJOR DOBLAJE"}))];
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
  const bl=await new Promise(res=>{ try{ cv.toBlob(res,"image/png"); }catch(_){ res(null); } });
  if(!bl){ toast("No se pudo crear la imagen ❌ (alguna foto bloquea el lienzo)"); return; }
  const nombreArch="anuario-"+(clean(n.titulo).toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi,"-").replace(/^-|-$/g,"")||"actividad")+".png";
  const file=new File([bl],nombreArch,{type:"image/png"});
  const touch=matchMedia("(pointer:coarse)").matches;
  if(touch&&navigator.canShare&&navigator.canShare({files:[file]})){
    try{ await navigator.share({files:[file],title:"Anuario "+yr}); toast("Imagen lista ✅"); return; }catch(err){ if(err&&err.name==="AbortError"){ return; } }
  }
  const u=URL.createObjectURL(bl), a=document.createElement("a"); a.href=u; a.download=nombreArch; a.rel="noopener"; a.style.display="none";
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),60000);
  toast("Imagen lista ✅");
  if(touch) anuVistaPng_(u); // respaldo: si el navegador no descarga solo, se puede mantener presionada
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
function anuDet_(){
  const p=anuP_(), d=$a("anuDet"); d.className=`anu-detail t-${p.tema}`; let h="";
  if(anuS.act) h=anuActHTML_(anuS.act);
  else if(anuS.key==="admin") h=anuAdminHTML_();
  else if(anuS.key){ const [y,m]=anuS.key.split("-").map(Number), c=p.cuenta.find(c=>c.m===m), n=c.items.length;
    h=`<div class="det-h"><h2>${MESES_LARGO[m]} <small>${y}</small></h2><span class="anu-n">${n} ${n===1?"actividad":"actividades"}</span></div><div class="anu-grid">${c.items.map((x,i)=>anuarioBlockHTML(x,i)).join("")}</div>`; }
  else h=`<div class="anu-hint"><img src="${ANU_DURAZNO}" alt=""><p>${p.n?"Elige un mes del índice.":"Aquí aparecerán las actividades."}</p></div>`;
  d.innerHTML=h;
  d.querySelectorAll("[data-anuario]").forEach(t=>t.onclick=()=>anuOpenAct_(t.dataset.anuario));
  d.querySelectorAll("[data-miembro]").forEach(t=>t.onclick=()=>anuAbrirMiembro_(t.dataset.miembro));
  d.querySelectorAll(".act-pg img.js-longpress").forEach(img=>enableLongPress(img,img.dataset.filename));
  d.querySelectorAll("img.anu-fb").forEach(im=>{ const fb=()=>{ if(im.dataset.fb) return; im.dataset.fb="1"; im.src=ANU_SHOW; }; im.addEventListener("error",fb); if(im.complete&&im.naturalWidth===0) fb(); });
  d.querySelectorAll("[data-share-anuario]").forEach(bt=>bt.onclick=()=>anuCompartir_(bt.dataset.shareAnuario));
  d.querySelectorAll("[data-edit-anuario]").forEach(bt=>bt.onclick=()=>anuEditarTarjeta_(bt.dataset.editAnuario));
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
  anuIdx_(); anuDet_();
}
/* El año de la portada: si el tema del año trae «anioImg» se muestra esa imagen (la letra exacta de ese año); si no, texto con la letra del tema */
const _anuTV={};
function anuYearSet_(){
  const p=anuS.per[anuS.pi], y=$a("yrVal"); if(!p||!y) return; const t=_anuTV[p.anio];
  if(t&&t.anioImg){ const src=t._b+t.anioImg; if(!(y.firstElementChild&&y.firstElementChild.getAttribute("src")===src)) y.innerHTML=`<img src="${src}" alt="${p.titulo}" draggable="false">`; }
  else y.textContent=p.titulo;
}
function anuCover_(d){
  const per=anuS.per, y=$a("yrVal"), pe=$a("cvPeach");
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
    <section class="anu-book" id="anuBook"><div class="anu-bar"><button type="button" class="anu-bk" id="anuBack">${CH_L}<span id="anuBackT">Portada</span></button><div class="anu-bt" id="anuBarT"></div><button type="button" class="anu-add" id="anuAdd" aria-label="Agregar al anuario">＋<span class="lbl"> Agregar</span></button></div>
      <div class="anu-cols"><aside id="anuIdx" aria-label="Índice por meses"></aside><div id="anuDet" aria-live="polite"></div></div></section></div>`;
  $a("yrPrev").onclick=()=>anuYear_(-1); $a("yrNext").onclick=()=>anuYear_(1);
  $a("anuGo").onclick=anuEnter_; $a("anuBack").onclick=anuBack_; $a("anuAdd").onclick=anuAgregar_;
  if(!window.anuInit){ window.anuInit=1;
    matchMedia("(min-width:900px)").addEventListener("change",()=>{ if(anuS.v==="libro"){ if(anuDesk_()&&!anuS.key) anuS.key=anuFirst_(); anuView_(); } });
    $a("anuModal").addEventListener("click",e=>{ if(e.target===e.currentTarget) mdHide_(); });
    addEventListener("keydown",e=>{ if(e.key==="Escape") mdHide_(); }); }
  anuEscena_(); medHeader_(); anuCover_(0); anuView_(); anuS.th=undefined; anuAplicarTema_(true);
  anuFonts_(); // La portada se muestra de inmediato; las fuentes con font-display:swap se aplican al terminar de cargar.
}
/* Preload display fonts without blocking the cover; the typeface swaps in when ready. */
let _anuFontsP=null;
function anuFonts_(){
  if(_anuFontsP) return _anuFontsP;
  const f=["Caveat Brush","Lilita One","Kaushan Script"].map(n=>{ try{ return document.fonts.load('40px "'+n+'"'); }catch(_){ return Promise.resolve(); } });
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
  sc.innerHTML='<div class="sc-in"><div class="sc-g sc-gl"><img class="sc-p sc-it" alt=""><img class="sc-p sc-ib" alt=""></div><div class="sc-g sc-gr"><img class="sc-p sc-dt" alt=""><img class="sc-p sc-db" alt=""></div><img class="sc-v sc-pt" alt=""><img class="sc-v sc-pb" alt=""></div><img class="sc-f sc-fm" alt=""><img class="sc-f sc-fp" alt=""><img class="sc-f sc-fg" alt="">';
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
function anuCapas_(t,w){
  const c=t&&t.capas, box=$a("cv25"), sc=$a("anuScene"); if(!box) return;
  w.classList.toggle("c25",!!c);
  if(!c){ box.innerHTML=""; delete box.dataset.k; if(sc) sc.classList.remove("on"); return; }
  const B=t._b+(c.carpeta||"capas/"), M=c.piezas||{}, E=c.esquinas||{};
  if(!box.dataset.k||box.dataset.k!==B){ box.dataset.k=B;
    box.innerHTML=(c.orden||[]).map((n,i)=>{ const m=M[n]; if(!m) return ""; return `<img class="l25 l-${n}" src="${B}${n}.webp" alt="" draggable="false" style="--l:${m.l}%;--t:${m.t}%;--w:${m.w}%;--d:${(i*0.11).toFixed(2)}s">`; }).join(""); }
  if(sc){ ["it","dt","ib","db","pt","pb","fg","fp","fm"].forEach(k=>{ const im=sc.querySelector(".sc-"+k), e=E[k]; if(im&&e&&im.dataset.s!==B+k){ im.dataset.s=B+k; im.src=B+k+".webp"; im.style.setProperty("--pw",e.w); } });
    sc.style.setProperty("--paper",c.papel||"#f0dcda"); sc.classList.add("on"); }
}
const anuPre_=u=>new Promise(r=>{ const i=new Image(); i.onload=()=>r(true); i.onerror=()=>r(false); i.src=u; });
const anuWait_=ms=>new Promise(r=>setTimeout(r,ms));
let _anuThSeq=0, _anuThSwapT=0;
async function anuAplicarTema_(instant){
  const seq=++_anuThSeq, H=document.documentElement, w=$a("anuWrap"), c=$a("anuCover");
  clearTimeout(_anuThSwapT); H.classList.remove("anu-swapping"); if(c) c.classList.remove("sw");
  const p=anuS.per[anuS.pi]; if(!p) return;
  let t=await anuTema_(p.anio); if(seq!==_anuThSeq) return;
  const B=t&&t._b, pick=a=>Array.isArray(a)&&a.length?B+a[p.anio%a.length]:null;
  let v=pick(t&&t.fondos&&t.fondos.vertical), h=pick(t&&t.fondos&&t.fondos.horizontal)||v; v=v||h;
  let port=t&&t.portada?B+t.portada:null;
  if(!instant&&t&&(v||port)){ const ok=await Promise.all([v?anuPre_(v):1,h?anuPre_(h):1,port?anuPre_(port):1]); if(seq!==_anuThSeq) return; if(!ok[0]||!ok[1]) v=h=null; if(!ok[2]) port=null; }
  const key=t?String(p.anio):"def", first=instant||anuS.th===undefined;
  if(!instant&&key===anuS.th){
    H.classList.add("anu-swapping"); c.classList.add("sw"); await anuWait_(520);
    if(seq!==_anuThSeq) return;
    anuYearSet_(); H.classList.remove("anu-swapping");
    _anuThSwapT=setTimeout(()=>{ if(seq===_anuThSeq) c.classList.remove("sw"); },520);
    return;
  }
  anuS.th=key; anuFondo_(v||ANU_BG,h||ANU_BGH,first);
  if(!w||!c) return;
  if(!first){ H.classList.add("anu-swapping"); c.classList.add("sw"); await anuWait_(520); if(seq!==_anuThSeq) return; }
  const col=(t&&t.colores)||{};
  Object.keys(ANU_TH_VARS).forEach(k=>{ if(col[k]) H.style.setProperty(ANU_TH_VARS[k],col[k]); else H.style.removeProperty(ANU_TH_VARS[k]); });
  if(t) H.setAttribute("data-anu-th",String(p.anio)); else H.removeAttribute("data-anu-th");
  const img=$a("cvPoster").querySelector("img");
  if(t&&port){ img.src=port; w.classList.add("poster"); } else { w.classList.remove("poster"); img.removeAttribute("src"); }
  anuCapas_(t,w); anuMes_(t); anuYearSet_(); H.classList.remove("anu-swapping");
  if(!first) _anuThSwapT=setTimeout(()=>{ if(seq===_anuThSeq) c.classList.remove("sw"); },520);
}

/* ---------- Cambio de tema oscuro (app) <-> claro (Anuario): velo central de transición ---------- */
(function(){
  let _ld=null, _ldT=0, _ldMinT=0, _ldSince=0;
  const ldEl=()=>{ if(_ld) return _ld; _ld=document.createElement("div"); _ld.id="anuLoad"; _ld.setAttribute("role","status"); _ld.setAttribute("aria-live","polite");
    _ld.innerHTML=`<div class="al-card"><span class="al-spark al-spark-a" aria-hidden="true">✦</span><span class="al-spark al-spark-b" aria-hidden="true">✧</span><span class="al-peach-wrap"><span class="al-peach-ring"></span><img class="al-peach" src="${ANU_DURAZNO}" alt=""></span><span class="al-brand">TEAM PEACHES</span><strong class="al-t"></strong><span class="al-sub"></span><span class="al-track" aria-hidden="true"><i></i></span></div>`;
    document.body.appendChild(_ld); return _ld; };
  const ldShow=(txt,toA)=>{ const e=ldEl(); clearTimeout(_ldT); clearTimeout(_ldMinT); e.querySelector(".al-t").textContent=txt; e.querySelector(".al-sub").textContent=toA?"Preparando tu anuario de recuerdos":"Volviendo a la página principal"; _ldSince=Date.now(); e.classList.add("on"); _ldT=setTimeout(ldHide,9000); };
  const ldHide=()=>{ clearTimeout(_ldT); clearTimeout(_ldMinT); if(!_ld) return; const min=matchMedia("(prefers-reduced-motion:reduce)").matches?300:650, wait=Math.max(0,min-(Date.now()-_ldSince)); _ldMinT=setTimeout(()=>{ if(_ld) _ld.classList.remove("on"); },wait); };
  const ldDone=toA=>{ if(!toA){ ldHide(); return; } const t0=Date.now(); (function p(){ const sc=document.getElementById("anuScene"); if((sc&&sc.classList.contains("on"))||Date.now()-t0>3000) ldHide(); else setTimeout(p,100); })(); };
  const wrap=()=>{ const o=window.switchTab; if(typeof o!=="function"||o._anuVT) return;
    const n=function(tab){
      const toA=tab==="anuario", inA=document.body.classList.contains("anuario-mode"), args=arguments, self=this;
      if(toA===inA) return o.apply(self,args);
      ldShow(toA?"Abriendo el Anuario":"Volviendo",toA);
      const go=()=>{
        if(!document.startViewTransition||matchMedia("(prefers-reduced-motion:reduce)").matches){ o.apply(self,args); requestAnimationFrame(()=>ldDone(toA)); return; }
        const H=document.documentElement; H.classList.add("anu-vt");
        let t; try{ t=document.startViewTransition(async()=>{ o.apply(null,args); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); }); }catch(_){ H.classList.remove("anu-vt"); o.apply(self,args); ldDone(toA); return; }
        t.finished.catch(()=>{}).then(()=>{ H.classList.remove("anu-vt"); ldDone(toA); });
      };
      requestAnimationFrame(()=>requestAnimationFrame(go));
    };
    n._anuVT=1; window.switchTab=n; };
  addEventListener("load",()=>{ wrap(); setTimeout(wrap,800); }); setTimeout(wrap,2500);
})();