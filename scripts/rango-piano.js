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
  /* s = subtipos (rangos de referencia aproximados; ajústalos aquí si quieres otros) */
  const VOCES=[
    {k:"bajo",         t:"Bajo",         lo:40, hi:64, c:"#ff7a2e", s:[   // Mi2 – Mi4
      {t:"Bajo profundo",lo:36,hi:60},{t:"Bajo cantante",lo:40,hi:64},{t:"Bajo bufo",lo:41,hi:65}]},
    {k:"baritono",     t:"Barítono",     lo:45, hi:69, c:"#ffc61a", s:[   // La2 – La4
      {t:"Bajo-barítono",lo:41,hi:65},{t:"Barítono",lo:45,hi:69},{t:"Barítono lírico",lo:47,hi:71}]},
    {k:"tenor",        t:"Tenor",        lo:48, hi:72, c:"#1fe3c9", s:[   // Do3 – Do5
      {t:"Baritenor",lo:47,hi:69},{t:"Tenor dramático",lo:48,hi:70},{t:"Tenor lírico",lo:48,hi:72},{t:"Tenor ligero",lo:50,hi:74}]},
    {k:"contralto",    t:"Contralto",    lo:53, hi:77, c:"#4d9bff", s:[   // Fa3 – Fa5
      {t:"Contralto dramático",lo:52,hi:76},{t:"Contralto lírico",lo:53,hi:77}]},
    {k:"mezzosoprano", t:"Mezzosoprano", lo:57, hi:81, c:"#c05cff", s:[   // La3 – La5
      {t:"Mezzo dramático",lo:55,hi:82},{t:"Mezzo lírico",lo:57,hi:81}]},
    {k:"soprano",      t:"Soprano",      lo:60, hi:84, c:"#ff4d9a", s:[   // Do4 – Do6
      {t:"Soprano dramático",lo:57,hi:84},{t:"Soprano lírico",lo:60,hi:84},{t:"Soprano ligero",lo:60,hi:89}]}
  ];
  const ORDEN_VOZ=["soprano","mezzosoprano","contralto","tenor","baritono","bajo"];  // orden pedido
  const VOZ=Object.fromEntries(VOCES.map(v=>[v.k,v]));
  const COLOR_OTRO="#c9a8e6";

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
  const est={orden:"tesitura",nota:"ES",sonido:true,ref:true,sel:null,exp:new Set(),cer:new Set()};   // exp: subtipos desplegados · cer: grupos plegados (solo esta sesión)   // sel: id del miembro seleccionado (o null)
  try{ const p=JSON.parse(localStorage.getItem(LS)||"{}");
    if(["tesitura","voz","az"].indexOf(p.orden)>=0) est.orden=p.orden;
    if(p.nota==="EN"||p.nota==="ES") est.nota=p.nota;
    if(p.sonido===false) est.sonido=false;
    if(p.ref===false) est.ref=false; }catch(e){}
  const guardar=()=>{ try{ localStorage.setItem(LS,JSON.stringify({orden:est.orden,nota:est.nota,sonido:est.sonido,ref:est.ref})); }catch(e){} };

  /* ---------- Sonido: sintetizado con WebAudio (sin archivos). Suena la tecla que se toca. ---------- */
  let ac=null, bus=null;
  function audio(){
    if(!ac){
      const C=window.AudioContext||window.webkitAudioContext; if(!C) return null;
      try{ ac=new C(); }catch(e){ return null; }
      const comp=ac.createDynamicsCompressor(), g=ac.createGain(); g.gain.value=.55;
      comp.connect(g); g.connect(ac.destination); bus=comp;
    }
    if(ac.state==="suspended") ac.resume();
    return ac;
  }
  const hz=n=>440*Math.pow(2,(n-69)/12);
  function tocar(n){
    if(!est.sonido) return;
    const a=audio(); if(!a) return;
    const t=a.currentTime, f=hz(n), dur=Math.max(1.2,3-(n-21)/40);
    const env=a.createGain(), lp=a.createBiquadFilter();
    lp.type="lowpass"; lp.Q.value=.4;
    lp.frequency.setValueAtTime(Math.min(f*9,10000),t); lp.frequency.exponentialRampToValueAtTime(Math.max(f*2.2,400),t+.7);
    env.gain.setValueAtTime(0,t); env.gain.linearRampToValueAtTime(.5/(1+f/1400),t+.006);
    env.gain.exponentialRampToValueAtTime(.0008,t+dur);
    [[1,1,"sine"],[2,.45,"sine"],[3,.22,"sine"],[4,.12,"triangle"],[6,.05,"sine"]].forEach(p=>{
      if(f*p[0]>12000) return;
      const o=a.createOscillator(), g=a.createGain();
      o.type=p[2]; o.frequency.value=f*p[0]; o.detune.value=(Math.random()-.5)*4;
      g.gain.value=p[1]; o.connect(g); g.connect(env);
      o.start(t); o.stop(t+dur+.05);
    });
    env.connect(lp); lp.connect(bus);
  }

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
            <button type="button" class="rp-snd" id="rpSnd" aria-pressed="true" title="Sonido de las teclas"></button>
            <button type="button" class="rp-ref" id="rpRef" aria-pressed="true" title="Mostrar u ocultar los rangos de referencia de cada tipo de voz"><i></i>Referencia</button>
            <button type="button" class="rp-switch" id="rpNota" role="switch" title="Cambiar nombres de notas: C D E… / Do Re Mi…">
              <span class="rp-sw-l">C</span><span class="rp-sw-l">Do</span><i class="rp-sw-thumb"></i>
            </button>
          </div>
          <button type="button" class="rp-x" data-rp-close aria-label="Cerrar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5L19 19M19 5L5 19"/></svg></button>
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
      if(e.target.closest("#rpRef")){ est.ref=!est.ref; guardar(); pintarRef(); return; }
      const rf=e.target.closest("[data-rp-ref]");                  // tocar la línea de referencia = desplegar / plegar sus subtipos
      if(rf){ const g=rf.closest(".rp-g"), k=g.dataset.g; if(est.exp.has(k)) est.exp.delete(k); else est.exp.add(k); g.classList.toggle("ex",est.exp.has(k)); return; }
      const gh=e.target.closest(".rp-gb,.rp-gc");                  // tocar el encabezado = ocultar / mostrar a todos los de ese tipo
      if(gh){ const g=gh.closest(".rp-g"), k=g.dataset.g; if(est.cer.has(k)) est.cer.delete(k); else est.cer.add(k); g.classList.toggle("cerr",est.cer.has(k)); return; }
      if(e.target.closest("#rpSnd")){ est.sonido=!est.sonido; guardar(); pintarSnd(); if(est.sonido) tocar(60); return; }
      if(e.target.closest("#rpNota")){ est.nota=est.nota==="ES"?"EN":"ES"; guardar(); pintar(true); return; }
      const it=e.target.closest("[data-rp-id]"); if(!it) return;
      const id=String(it.dataset.rpId);
      if(lpHecho){ lpHecho=false; return; }                       // venía de mantener presionado: la tarjeta ya se abrió
      const ahora=Date.now();
      if(lastTap && lastTap.id===id && ahora-lastTap.t<400){ lastTap=null; abrirTarjeta(id); return; }   // doble toque
      lastTap={id,t:ahora};
      est.sel=id; resaltar(true);                                  // un toque en la zona de color = señalar su rango en el piano
    });
    /* mantener presionado cualquier zona de la línea = abrir la tarjeta */
    let lp=null, lpHecho=false, lastTap=null;
    const lpOff=()=>{ if(lp){ clearTimeout(lp.t); lp=null; } };
    scroller.addEventListener("pointerdown",e=>{
      const it=e.target.closest(".rp-row"); lpOff(); if(!it) return;
      const id=String(it.dataset.rpId), x=e.clientX, y=e.clientY;
      lp={x,y,t:setTimeout(()=>{ lp=null; lpHecho=true; lastTap=null; abrirTarjeta(id); },520)};
    });
    scroller.addEventListener("pointermove",e=>{ if(lp && Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>9) lpOff(); });
    ["pointerup","pointercancel","pointerleave"].forEach(ev=>scroller.addEventListener(ev,lpOff));
    scroller.addEventListener("contextmenu",e=>{ if(e.target.closest(".rp-row")) e.preventDefault(); });
    /* tocar una tecla = escucharla; con el dedo/mouse presionado, al arrastrar van sonando las teclas que cruzas (glissando) */
    let press=null;
    scroller.addEventListener("pointerdown",e=>{
      const k=e.target.closest(".rp-piano [data-m]"); if(!k) return;
      press={id:e.pointerId,last:k}; pulsar(k);
    });
    scroller.addEventListener("pointermove",e=>{
      if(!press||e.pointerId!==press.id) return;
      const el=document.elementFromPoint(e.clientX,e.clientY), k=el&&el.closest&&el.closest(".rp-piano [data-m]");
      if(k&&k!==press.last){ press.last=k; pulsar(k); }
    });
    ["pointerup","pointercancel"].forEach(ev=>window.addEventListener(ev,e=>{ if(press&&e.pointerId===press.id) press=null; }));
    window.addEventListener("resize",()=>{ if(overlay) anchoNombre(); });
    overlay.addEventListener("keydown",e=>{
      if(!(e.target.matches && e.target.matches(".rp-row"))) return;
      if(e.key==="Enter"){ e.preventDefault(); abrirTarjeta(String(e.target.dataset.rpId)); }
      else if(e.key===" "){ e.preventDefault(); est.sel=String(e.target.dataset.rpId); resaltar(true); }
    });
    document.addEventListener("keydown",e=>{
      if(e.key!=="Escape" || !overlay.classList.contains("open")) return;
      const mm=document.getElementById("memberModal"); if(mm && mm.classList.contains("open")) return;
      cerrar();
    });
  }

  function abrirTarjeta(id){ est.sel=String(id); resaltar(true); openMemberModal(id); }
  let infoT=0;
  function pulsar(k){
    const n=parseInt(k.dataset.m,10); tocar(n);
    k.classList.add("hit"); setTimeout(()=>k.classList.remove("hit"),170);
    infoEl.innerHTML=`${est.sonido?"🔊":"🔇"} <b>${nombreNota(n,est.nota)}</b> · ${Math.round(hz(n))} Hz`;
    clearTimeout(infoT); infoT=setTimeout(()=>resaltar(false),1500);
  }
  function pintarRef(){
    const b=overlay.querySelector("#rpRef"); if(b){ b.classList.toggle("on",est.ref); b.setAttribute("aria-pressed",est.ref?"true":"false"); }
    const l=scroller.querySelector(".rp-lanes"); if(l) l.classList.toggle("noref",!est.ref);
  }
  function pintarSnd(){
    const b=overlay.querySelector("#rpSnd"); if(!b) return;
    b.textContent=est.sonido?"🔊":"🔇"; b.setAttribute("aria-pressed",est.sonido?"true":"false"); b.classList.toggle("off",!est.sonido);
  }
  /* ancho de la columna del nombre (fija a la izquierda de la ventana); también define el margen al abrir */
  let anchoNom=150;
  function anchoNombre(){ anchoNom=Math.round(Math.min(190,Math.max(120,window.innerWidth*.34))); overlay.style.setProperty("--rp-namew",anchoNom+"px"); }

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

  /* ---------- Color a partir de la foto de perfil ----------
   * Se saca el color dominante "vivo" de la foto y se suaviza (sin tonos oscuros ni apagados).
   * Si el servidor de la imagen no permite leerla (CORS) o la foto es gris, se usa el color del tipo de voz. */
  const LS_COL="tph_rangoPiano_colores_v2";   // v2: paleta más viva (se recalcula)
  const colorCache=new Map();
  try{ const o=JSON.parse(localStorage.getItem(LS_COL)||"{}"); Object.keys(o).forEach(k=>colorCache.set(k,o[k])); }catch(e){}
  const guardarColores=()=>{ try{ const o={}; colorCache.forEach((v,k)=>{ if(v) o[k]=v; }); localStorage.setItem(LS_COL,JSON.stringify(o)); }catch(e){} };
  const urlAvatar=m=>(m&&m.avatarUrl)||(typeof LOGO_DEFAULT!=="undefined"?LOGO_DEFAULT:"");
  const colorDe=x=>colorCache.get(urlAvatar(x.m))||x.color;

  function rgb2hsl(r,g,b){
    r/=255; g/=255; b/=255; const mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2, d=mx-mn;
    if(!d) return [0,0,l];
    const sa=l>.5?d/(2-mx-mn):d/(mx+mn);
    let h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;
    return [h*60,sa,l];
  }
  function hsl2hex(h,sa,l){
    const c=(1-Math.abs(2*l-1))*sa, x=c*(1-Math.abs((h/60)%2-1)), mm=l-c/2;
    const [r,g,b]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
    return "#"+[r,g,b].map(v=>Math.round((v+mm)*255).toString(16).padStart(2,"0")).join("");
  }
  function colorDeImagen(url){
    return new Promise(res=>{
      if(!url) return res(null);
      const im=new Image(); im.crossOrigin="anonymous";
      im.onload=()=>{
        try{
          const S=32, cv=document.createElement("canvas"); cv.width=cv.height=S;
          const cx=cv.getContext("2d",{willReadFrequently:true}); cx.drawImage(im,0,0,S,S);
          const px=cx.getImageData(0,0,S,S).data, bins=Array.from({length:24},()=>({w:0,h:0,sa:0}));
          for(let i=0;i<px.length;i+=4){
            if(px[i+3]<200) continue;
            const [h,sa,l]=rgb2hsl(px[i],px[i+1],px[i+2]);
            if(sa<.2||l<.16||l>.93) continue;                       // fuera grises, negros y blancos
            const w=sa*(1-Math.abs(l-.5)*1.1), bn=bins[Math.floor(h/15)%24];
            bn.w+=w; bn.h+=h*w; bn.sa+=sa*w;
          }
          const best=bins.reduce((a,b)=>b.w>a.w?b:a);
          if(best.w<=0) return res(null);
          const h=best.h/best.w, sa=Math.min(.95,Math.max(.7,best.sa/best.w*1.12));
          res(hsl2hex(h,sa,.6));                                    // luminosidad fija: viva pero no chillona
        }catch(e){ res(null); }                                     // imagen "tainted" (sin CORS)
      };
      im.onerror=()=>res(null);
      im.src=url;
    });
  }
  let colorGen=0;
  async function pintarColores(lista){
    const gen=++colorGen;
    const urls=[...new Set(lista.map(x=>urlAvatar(x.m)))].filter(u=>u&&!colorCache.has(u));
    for(let i=0;i<urls.length;i+=6){
      await Promise.all(urls.slice(i,i+6).map(async u=>{
        const c=await colorDeImagen(u); colorCache.set(u,c||"");
        if(gen!==colorGen||!overlay) return;
        if(c) lista.forEach(x=>{ if(urlAvatar(x.m)===u){
          overlay.querySelectorAll(`.rp-row[data-rp-id="${CSS.escape(String(x.m.id))}"]`).forEach(r=>r.style.setProperty("--vc",c));
        }});
      }));
    }
    guardarColores();
    if(gen===colorGen && est.sel) resaltar(false);   // si hay alguien seleccionado, las teclas toman su color final
  }

  /* ---------- Fila: nombre fijo a la izquierda de la ventana · franja de color con el tipo de voz anclado a su extremo izquierdo
   * y la tesitura anclada a su extremo derecho ---------- */
  const TOT=52;
  function filaHTML(x){
    const m=x.m, s=inicioU(x.lo), n=finU(x.hi)-inicioU(x.lo);
    const voz=rangosDeM(m).join(" · ");
    return `<div class="rp-row" role="button" tabindex="0" data-rp-id="${escAttr(m.id)}" style="--vc:${colorDe(x)};--s:${s};--n:${n}" title="${escAttr(m.nombre||"")}">
      <div class="rp-band"><span class="rp-vt">${escHtml(voz)}</span><span class="rp-t">${nombreNota(x.lo,est.nota)} – ${nombreNota(x.hi,est.nota)}</span></div>
      <div class="rp-line"><div class="rp-l">${avatarImgTag(m)}<span class="rp-cn">${escHtml(m.nombre||"")}</span></div></div>
    </div>`;
  }

  /* Encabezado de grupo (orden por tipo de voz): badge a la izquierda, cantidad a la derecha de la ventana
   * y, en el espacio de en medio, de dónde a dónde va ese tipo de voz (y sus subtipos), de forma discreta. */
  function refHTML(v){
    const ln=(r,top,cls,txt)=>{
      const s=inicioU(r.lo), w=finU(r.hi)-inicioU(r.lo), flip=(s+w)>TOT-10;
      const d=cls==="main"?" data-rp-ref":"";
      return `<i class="rp-rb ${cls}"${d} style="top:${top}px;--s:${s};--n:${w}"></i>`+
        `<span class="rp-rt ${cls}${flip?" flip":""}"${d} style="top:${top-6}px;--s:${s};--n:${w}">${txt}</span>`;
    };
    const rng=r=>nombreNota(r.lo,est.nota)+" – "+nombreNota(r.hi,est.nota);
    let h=ln(v,13,"main",rng(v));
    v.s.forEach((r,i)=>{ h+=ln(r,34+i*15,"sub",escHtml(r.t)+" · "+rng(r)); });
    return `<div class="rp-refs">${h}</div>`;
  }
  const altoGrupo=v=>30+(v?v.s.length*15+4:0);
  function contenidoHTML(){
    const d=datosPiano();
    const piano=`<div class="rp-piano-wrap">${pianoHTML()}</div>`;
    if(!d.lista.length){
      return `<div class="rp-stage">${piano}<div class="rp-empty">🎹 Todavía nadie tiene notas exactas registradas${d.total?` (0 de ${d.total} miembros)`:""}.<br>
        Agrégalas en <b>Editar miembro → Notas exactas</b> (nota más baja y más alta) y aparecerán aquí.</div></div>`;
    }
    let cuerpo="";
    if(est.orden==="az"){
      let letra="";
      d.lista.forEach(x=>{
        const L=(normalizar(x.m.nombre).trim().charAt(0)||"#").toUpperCase(), l=/[A-Z]/.test(L)?L:"#";
        if(l!==letra){ letra=l; cuerpo+=`<div class="rp-letter">${l}</div>`; }
        cuerpo+=filaHTML(x);
      });
    } else if(est.orden==="voz"){
      d.grupos.forEach(g=>{
        const v=g.k?VOZ[g.k]:null;
        const key=g.k||"_otros";
        cuerpo+=`<section class="rp-g${est.cer.has(key)?" cerr":""}${est.exp.has(key)?" ex":""}" data-g="${key}" style="--vc:${g.color};--hx:${altoGrupo(v)}px">
          <div class="rp-group">${v?refHTML(v):""}<b class="rp-gb">${g.titulo}</b><em class="rp-gc">${g.items.length}</em></div>`;
        g.items.forEach(x=>{ cuerpo+=filaHTML(x); });
        cuerpo+=`</section>`;
      });
    } else {
      d.lista.forEach(x=>{ cuerpo+=filaHTML(x); });
    }
    return `<div class="rp-stage">${piano}<div class="rp-lanes${est.ref?"":" noref"}">${cuerpo}</div></div>`;
  }

  /* ---------- Selección / resaltado en el piano ---------- */
  function datosSel(){
    if(!est.sel) return null;
    const m=(DB.miembros||[]).find(x=>String(x.id)===String(est.sel));
    if(!m) return null;
    const lo=parseNota(m.notaBaja), hi=parseNota(m.notaAlta); if(lo===null||hi===null) return null;
    const k=rangosDeM(m).map(claveVoz).filter(Boolean)[0]||null;
    const x={m,lo:Math.min(lo,hi),hi:Math.max(lo,hi),color:k?VOZ[k].c:COLOR_OTRO};
    x.color=colorDe(x); return x;
  }
  const INFO_BASE="Teclas: toca o arrastra para escuchar · Rango: 1 toque lo señala; 2 toques o mantener = tarjeta";
  function resaltar(mover){
    if(!overlay) return;
    overlay.querySelectorAll(".rp-w.on,.rp-b.on").forEach(el=>{ el.classList.remove("on"); el.style.removeProperty("--vc"); });
    overlay.querySelectorAll(".rp-row.sel").forEach(el=>el.classList.remove("sel"));
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

  /* ---------- Pintar ---------- */
  function pintar(conservarScroll){
    const sl=scroller.scrollLeft, st=scroller.scrollTop;
    scroller.innerHTML=contenidoHTML();
    overlay.querySelectorAll(".rp-seg button").forEach(b=>b.classList.toggle("on",b.dataset.o===est.orden));
    const sw=overlay.querySelector("#rpNota"); sw.dataset.n=est.nota; sw.setAttribute("aria-checked",est.nota==="ES"?"true":"false");
    pintarSnd(); overlay.dataset.ord=est.orden;
    if(conservarScroll){ scroller.scrollLeft=sl; scroller.scrollTop=st; }
    bindAvatarFallbacks();
    pintarRef();
    resaltar(false);   // al repintar (cambiar orden / notación) no se mueve la vista
    pintarColores(datosPiano().lista);
  }

  /* ---------- Abrir / cerrar ---------- */
  function abrir(){
    if(!overlay) construir();
    est.sel=null; anchoNombre();
    openModal("rangoPianoModal");
    scroller.scrollTo(0,0);
    pintar(false);
    // al abrir se acomoda desde la nota más grave registrada (sin mostrar octavas bajas de más),
    // dejando un margen igual a la columna de nombres para que no los tape. Si no hay nadie, se centra en el Do central.
    requestAnimationFrame(()=>{
      const w=overlay.querySelector('.rp-w[data-m="60"]'); if(!w) return;
      const kw=w.getBoundingClientRect().width, lista=datosPiano().lista;
      if(lista.length){
        const lo=Math.min.apply(null,lista.map(x=>x.lo));
        scroller.scrollLeft=Math.max(0,inicioU(lo)*kw-anchoNom-12);
      } else scroller.scrollLeft=Math.max(0,16+(blancaIdx[60]+.5)*kw-scroller.clientWidth/2);
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
      b.innerHTML=`<span>🎹</span>Piano de rangos vocales`;
      b.onclick=()=>{ closeModal("miembrosOrdenModal"); abrir(); };
      const ref=cont.querySelector('[data-orden="rango"]');
      if(ref) ref.insertAdjacentElement("afterend",b); else cont.appendChild(b);
    });
  }
})();
