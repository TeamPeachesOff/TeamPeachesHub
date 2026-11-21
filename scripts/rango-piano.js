/* ============ Rango vocal en piano ============
 * Vista nueva dentro de "Ordenar miembros". No modifica ninguna función ni variable existente:
 * solo agrega un botón al modal de orden y su propia ventana (#rangoPianoModal).
 * Usa globales que ya existen en index.html: DB, normalizar, escHtml, escAttr, avatarImgTag,
 * bindAvatarFallbacks, openMemberModal, openModal, closeModal. */
(function(){
  "use strict";
  if(window.__rangoPianoInit) return; window.__rangoPianoInit=true;

  /* ---------- Piano: 88 teclas, de La0 (MIDI 21) a Do8 (MIDI 108) ---------- */
  const MIN=21, MAX=108;
  const NOTAS={
    EN:["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"],
    ES:["Do","Do♯","Re","Re♯","Mi","Fa","Fa♯","Sol","Sol♯","La","La♯","Si"]
  };
  const NEGRAS=[1,3,6,8,10];
  const esNegra=n=>NEGRAS.indexOf(n%12)>=0;
  const blancaIdx={}; let totalBlancas=0;
  for(let n=MIN;n<=MAX;n++){ if(!esNegra(n)) blancaIdx[n]=totalBlancas++; }       // 52 blancas
  const octava=n=>Math.floor(n/12)-1;
  const nombreNota=(n,sis,conOct)=>NOTAS[sis][n%12]+(conOct===false?"":octava(n));
  const inicioU=n=>esNegra(n)?blancaIdx[n-1]+.5:blancaIdx[n];                      // borde izquierdo (en teclas blancas)
  const finU=n=>esNegra(n)?blancaIdx[n-1]+1.5:blancaIdx[n]+1;                      // borde derecho

  /* ---------- Tipos de voz y su tesitura de referencia (notas MIDI) ----------
   * Están en orden de tesitura: de la más grave a la más aguda. */
  const VOCES=[
    {k:"bajo",         t:"Bajo",         lo:40, hi:64, c:"#ff8a4c"},   // Mi2  – Mi4
    {k:"baritono",     t:"Barítono",     lo:45, hi:69, c:"#ffcb57"},   // La2  – La4
    {k:"tenor",        t:"Tenor",        lo:48, hi:72, c:"#3fd6c4"},   // Do3  – Do5
    {k:"contralto",    t:"Contralto",    lo:53, hi:77, c:"#6fa8ff"},   // Fa3  – Fa5
    {k:"mezzosoprano", t:"Mezzosoprano", lo:57, hi:81, c:"#c77dff"},   // La3  – La5
    {k:"soprano",      t:"Soprano",      lo:60, hi:84, c:"#ff6fa5"}    // Do4  – Do6
  ];
  const ORDEN_VOZ=["soprano","mezzosoprano","contralto","tenor","baritono","bajo"];  // orden pedido
  const VOZ=Object.fromEntries(VOCES.map(v=>[v.k,v]));
  const COLOR_OTRO="#b9a3c9";

  /* "Alto" se agrupa con Contralto; "Mezzo" con Mezzosoprano. Lo demás va a "Otros". */
  function claveVoz(raw){
    const n=normalizar(raw).trim();
    if(!n) return null;
    if(/contra\s*tenor/.test(n)) return null;
    if(/mezzo/.test(n)) return "mezzosoprano";
    if(/contralto|^alto\b/.test(n)) return "contralto";
    if(/soprano/.test(n)) return "soprano";
    if(/tenor/.test(n)) return "tenor";
    if(/baritono|baritone/.test(n)) return "baritono";
    if(/^bajo\b|^bass\b|^baixo\b/.test(n)) return "bajo";
    return null;
  }
  /* ---------- Notas exactas: "C3", "Do3", "F#3", "Sib2", "La♭4"… → número MIDI ---------- */
  const PC={c:0,d:2,e:4,f:5,g:7,a:9,b:11};
  const SOLF={do:"c",re:"d",mi:"e",fa:"f",sol:"g",la:"a",si:"b"};
  function parseNota(s){
    const t=String(s==null?"":s).trim().replace(/♯/g,"#").replace(/♭/g,"b");
    const m=t.match(/^(sol|do|re|mi|fa|la|si|[a-g])\s*([#b]?)\s*(-?\d{1,2})$/i);
    if(!m) return null;
    const nom=m[1].toLowerCase(), letra=SOLF[nom]||nom;
    const acc=m[2]==="#"?1:(m[2]?-1:0);
    const midi=(parseInt(m[3],10)+1)*12+PC[letra]+acc;
    return (midi>=MIN&&midi<=MAX)?midi:null;
  }
  const notaCanon=n=>NOTAS.EN[n%12].replace("♯","#")+octava(n);   // lo que se guarda en la hoja: "C#4"
  window.tphParseNota=parseNota; window.tphNotaCanon=notaCanon;   // los usa el formulario de miembros
  const rangosDeM=m=>String((m&&m.rangoVocal)||"").split(",").map(x=>x.trim()).filter(Boolean);
  const porNombre=(a,b)=>String(a.nombre||"").localeCompare(String(b.nombre||""),"es",{sensitivity:"base"});
  const cap=t=>t?t.charAt(0).toUpperCase()+t.slice(1):t;

  /* ---------- Preferencias (se recuerdan en este dispositivo) ---------- */
  const LS="tph_rangoPiano_v1";
  const est={orden:"tesitura",nota:"ES",sel:null};   // sel: id del miembro seleccionado (o null)
  try{ const p=JSON.parse(localStorage.getItem(LS)||"{}");
    if(["tesitura","voz","az"].indexOf(p.orden)>=0) est.orden=p.orden;
    if(p.nota==="EN"||p.nota==="ES") est.nota=p.nota; }catch(e){}
  const guardar=()=>{ try{ localStorage.setItem(LS,JSON.stringify({orden:est.orden,nota:est.nota})); }catch(e){} };

  /* ---------- Datos ----------
   * Solo entran al piano los miembros con notaBaja Y notaAlta válidas. El resto no se muestra. */
  function datosPiano(){
    const todos=(DB.miembros||[]).filter(m=>m.nombre && String(m.nombre).trim()!=="");
    const lista=[];
    todos.forEach(m=>{
      const x=parseNota(m.notaBaja), y=parseNota(m.notaAlta);
      if(x===null||y===null) return;
      const k=rangosDeM(m).map(claveVoz).filter(Boolean)[0]||null;   // tipo de voz principal (el primero que tenga)
      lista.push({m,lo:Math.min(x,y),hi:Math.max(x,y),k,color:k?VOZ[k].c:COLOR_OTRO});
    });
    const porTes=(a,b)=>a.lo-b.lo||a.hi-b.hi||porNombre(a.m,b.m);
    let grupos=null;
    if(est.orden==="tesitura") lista.sort(porTes);
    else if(est.orden==="az") lista.sort((a,b)=>porNombre(a.m,b.m));
    else {
      lista.sort(porTes);
      grupos=ORDEN_VOZ.map(k=>({k,titulo:VOZ[k].t,color:VOZ[k].c,items:lista.filter(x=>x.k===k)}));
      grupos.push({k:null,titulo:"Otras voces / sin tipo",color:COLOR_OTRO,items:lista.filter(x=>!x.k)});
      grupos=grupos.filter(g=>g.items.length);
    }
    return {total:todos.length,lista,grupos};
  }

  /* ---------- DOM ---------- */
  let overlay=null, scroller=null, infoEl=null;

  function construir(){
    overlay=document.createElement("div");
    overlay.className="modal-overlay";
    overlay.id="rangoPianoModal";
    overlay.innerHTML=`
      <div class="rp-box" role="dialog" aria-modal="true" aria-label="Rango vocal en piano">
        <div class="rp-head">
          <div class="rp-title">
            <span class="rp-ico" aria-hidden="true">🎹</span>
            <div><h3>Rango vocal</h3><p class="rp-info" id="rpInfo"></p></div>
          </div>
          <div class="rp-ctrls">
            <div class="rp-seg" role="group" aria-label="Orden">
              <button type="button" data-o="tesitura" title="De la nota más grave a la más aguda">Tesitura</button>
              <button type="button" data-o="voz" title="Soprano, Mezzosoprano, Contralto, Tenor, Barítono, Bajo">Tipo de voz</button>
              <button type="button" data-o="az" title="Orden alfabético">A–Z</button>
            </div>
            <button type="button" class="rp-switch" id="rpNota" role="switch" title="Cambiar nombres de notas: C D E… / Do Re Mi…">
              <span class="rp-sw-l">C</span><span class="rp-sw-l">Do</span><i class="rp-sw-thumb"></i>
            </button>
          </div>
          <button type="button" class="rp-x" data-rp-close aria-label="Cerrar">✕</button>
        </div>
        <div class="rp-scroll" id="rpScroll"></div>
      </div>`;
    document.body.appendChild(overlay);
    scroller=overlay.querySelector("#rpScroll");
    infoEl=overlay.querySelector("#rpInfo");

    overlay.addEventListener("click",e=>{
      if(e.target.closest("[data-rp-close]")){ cerrar(); return; }
      const o=e.target.closest("[data-o]");
      if(o){ if(est.orden!==o.dataset.o){ est.orden=o.dataset.o; guardar(); pintar(true); } return; }
      if(e.target.closest("#rpNota")){ est.nota=est.nota==="ES"?"EN":"ES"; guardar(); pintar(true); return; }
      const prof=e.target.closest("[data-rp-prof]");
      if(prof){ e.stopPropagation(); openMemberModal(prof.dataset.rpProf); return; }
      const it=e.target.closest("[data-rp-id]");
      if(it){ alternar(it.dataset.rpId); return; }
    });
    overlay.addEventListener("keydown",e=>{
      if((e.key==="Enter"||e.key===" ") && e.target.matches && e.target.matches(".rp-chip")){ e.preventDefault(); e.target.click(); }
    });
    document.addEventListener("keydown",e=>{
      if(e.key!=="Escape" || !overlay.classList.contains("open")) return;
      const mm=document.getElementById("memberModal"); if(mm && mm.classList.contains("open")) return;
      cerrar();
    });
  }

  function pianoHTML(){
    let h="";
    for(let n=MIN;n<=MAX;n++){
      if(esNegra(n)) continue;
      const c=(n%12===0)?" c":"";
      h+=`<div class="rp-w${c}" data-m="${n}" style="left:calc(var(--kw) * ${blancaIdx[n]})"><span class="rp-n">${nombreNota(n,est.nota)}</span></div>`;
    }
    for(let n=MIN;n<=MAX;n++){
      if(!esNegra(n)) continue;
      h+=`<div class="rp-b" data-m="${n}" style="left:calc(var(--kw) * ${(blancaIdx[n-1]+1-.31).toFixed(3)})"><span class="rp-n">${nombreNota(n,est.nota,false)}</span></div>`;
    }
    return `<div class="rp-piano" role="img" aria-label="Piano de 88 teclas">${h}</div>`;
  }

  function chipHTML(x,pildoras){
    const m=x.m;
    const pills=pildoras?`<div class="rp-pills">${rangosDeM(m).map(r=>{ const k=claveVoz(r); return `<span class="rp-pill" style="--vc:${k?VOZ[k].c:COLOR_OTRO}">${escHtml(r)}</span>`; }).join("")}</div>`:"";
    return `<div class="rp-chip" role="button" tabindex="0" data-rp-id="${escAttr(m.id)}" style="--vc:${x.color}">
      ${avatarImgTag(m)}
      <div class="rp-ci"><div class="rp-cn">${escHtml(m.nombre||"")}</div><div class="rp-notes">${nombreNota(x.lo,est.nota)} – ${nombreNota(x.hi,est.nota)}</div>${pills}</div>
      <button type="button" class="rp-prof" data-rp-prof="${escAttr(m.id)}" aria-label="Ver perfil de ${escAttr(m.nombre||"")}" title="Ver perfil">↗</button>
    </div>`;
  }
  function filaHTML(x,pildoras){
    const s=inicioU(x.lo), n=finU(x.hi)-inicioU(x.lo);
    return `<div class="rp-row" style="--vc:${x.color};--s:${s};--n:${n}">
      <button type="button" class="rp-track" data-rp-id="${escAttr(x.m.id)}" aria-label="${escAttr(x.m.nombre||"")}: ${nombreNota(x.lo,est.nota)} a ${nombreNota(x.hi,est.nota)}"></button>
      ${chipHTML(x,pildoras)}
    </div>`;
  }

  function contenidoHTML(){
    const d=datosPiano();
    const piano=`<div class="rp-piano-wrap">${pianoHTML()}</div>`;
    if(!d.lista.length){
      return `<div class="rp-stage">${piano}<div class="rp-empty">🎹 Todavía nadie tiene notas exactas registradas${d.total?` (0 de ${d.total} miembros)`:""}.<br>
        Agrégalas en <b>Editar miembro → Notas exactas</b> (nota más baja y más alta) y aparecerán aquí.</div></div>`;
    }
    const conteo=`${d.lista.length} de ${d.total} miembros tienen notas registradas`;
    let hint, cuerpo="";
    if(est.orden==="az"){
      hint=`Orden alfabético · ${conteo}`;
      let letra="";
      d.lista.forEach(x=>{
        const L=(normalizar(x.m.nombre).trim().charAt(0)||"#").toUpperCase(), l=/[A-Z]/.test(L)?L:"#";
        if(l!==letra){ letra=l; cuerpo+=`<div class="rp-letter">${l}</div>`; }
        cuerpo+=filaHTML(x,true);
      });
    } else if(est.orden==="voz"){
      hint=`Tipo de voz · Soprano → Mezzosoprano → Contralto → Tenor → Barítono → Bajo · ${conteo}`;
      d.grupos.forEach(g=>{
        cuerpo+=`<div class="rp-group" style="--vc:${g.color}"><b>${g.titulo}</b><em>${g.items.length}</em></div>`;
        g.items.forEach(x=>{ cuerpo+=filaHTML(x,false); });
      });
    } else {
      hint=`Tesitura · de la nota más grave a la más aguda · ${conteo}`;
      d.lista.forEach(x=>{ cuerpo+=filaHTML(x,true); });
    }
    return `<div class="rp-stage">${piano}<div class="rp-hint">${hint}</div><div class="rp-lanes">${cuerpo}</div></div>`;
  }

  /* ---------- Selección / resaltado en el piano ---------- */
  function datosSel(){
    if(!est.sel) return null;
    const m=(DB.miembros||[]).find(x=>String(x.id)===String(est.sel));
    if(!m) return null;
    const lo=parseNota(m.notaBaja), hi=parseNota(m.notaAlta); if(lo===null||hi===null) return null;
    const k=rangosDeM(m).map(claveVoz).filter(Boolean)[0]||null;
    return {m,lo:Math.min(lo,hi),hi:Math.max(lo,hi),color:k?VOZ[k].c:COLOR_OTRO};
  }
  const INFO_BASE="Toca un miembro para ver sus notas sobre el piano";
  function resaltar(mover){
    if(!overlay) return;
    overlay.querySelectorAll(".rp-w.on,.rp-b.on").forEach(el=>{ el.classList.remove("on"); el.style.removeProperty("--vc"); });
    overlay.querySelectorAll(".rp-track.sel,.rp-chip.sel").forEach(el=>el.classList.remove("sel"));
    const x=datosSel();
    if(!x){ est.sel=null; infoEl.textContent=INFO_BASE; return; }
    for(let n=x.lo;n<=x.hi;n++){
      const el=overlay.querySelector(`.rp-piano [data-m="${n}"]`);
      if(el){ el.classList.add("on"); el.style.setProperty("--vc",x.color); }
    }
    overlay.querySelectorAll(`[data-rp-id="${CSS.escape(String(est.sel))}"]`).forEach(el=>el.classList.add("sel"));
    infoEl.innerHTML=`<b>${escHtml(x.m.nombre||"")}</b> · ${nombreNota(x.lo,est.nota)} – ${nombreNota(x.hi,est.nota)}`;
    if(mover && scroller){
      const kw=overlay.querySelector(".rp-w").getBoundingClientRect().width;
      const centro=16+((inicioU(x.lo)+finU(x.hi))/2)*kw;
      scroller.scrollTo({left:Math.max(0,centro-scroller.clientWidth/2),behavior:"smooth"});
    }
  }
  function alternar(id){ est.sel=(String(est.sel)===String(id))?null:String(id); resaltar(true); }

  /* ---------- Pintar ---------- */
  function pintar(conservarScroll){
    const sl=scroller.scrollLeft, st=scroller.scrollTop;
    scroller.innerHTML=contenidoHTML();
    overlay.querySelectorAll(".rp-seg button").forEach(b=>b.classList.toggle("on",b.dataset.o===est.orden));
    const sw=overlay.querySelector("#rpNota"); sw.dataset.n=est.nota; sw.setAttribute("aria-checked",est.nota==="ES"?"true":"false");
    if(conservarScroll){ scroller.scrollLeft=sl; scroller.scrollTop=st; }
    bindAvatarFallbacks();
    resaltar(false);   // al repintar (cambiar orden / notación) no se mueve la vista
  }

  /* ---------- Abrir / cerrar ---------- */
  function abrir(){
    if(!overlay) construir();
    est.sel=null;
    openModal("rangoPianoModal");
    scroller.scrollTo(0,0);
    pintar(false);
    // al abrir se centra en el Do central (Do4), que es donde viven la mayoría de las voces
    requestAnimationFrame(()=>{
      const w=overlay.querySelector('.rp-w[data-m="60"]'); if(!w) return;
      const kw=w.getBoundingClientRect().width;
      scroller.scrollLeft=Math.max(0,16+(blancaIdx[60]+.5)*kw-scroller.clientWidth/2);
    });
  }
  function cerrar(){ closeModal("rangoPianoModal"); }

  /* ---------- Botón dentro de "Ordenar miembros" ----------
   * El modal de orden vuelve a pintar sus opciones cada vez que se abre; después de ese pintado
   * (el handler original ya corrió) se agrega este botón justo debajo de "Por rango vocal". */
  const filtroBtn=document.getElementById("miembrosFiltroBtn");
  if(filtroBtn){
    filtroBtn.addEventListener("click",()=>{
      const cont=document.getElementById("miembrosOrdenOpciones"); if(!cont) return;
      if(cont.querySelector("[data-rp-abrir]")) return;
      const b=document.createElement("button");
      b.type="button"; b.className="orden-opcion"; b.setAttribute("data-rp-abrir","1");
      b.innerHTML=`<span>🎹</span>Piano de rangos vocales (pantalla completa)`;
      b.onclick=()=>{ closeModal("miembrosOrdenModal"); abrir(); };
      const ref=cont.querySelector('[data-orden="rango"]');
      if(ref) ref.insertAdjacentElement("afterend",b); else cont.appendChild(b);
    });
  }
})();
