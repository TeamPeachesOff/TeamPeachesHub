/* Reproducir Todo (lista de reproducción de entregas) — módulo AUTÓNOMO y reversible.
 * Para quitarlo por completo: borra la línea <script src="scripts/reproducir-todo.js..."> de index.html (y esta entrada en sw.js).
 * No modifica nada de lo existente: inyecta su botón junto a «Ver Actividades Entregadas» solo cuando esa sección está abierta.
 * Reproduce en orden las entregas con enlace. Avanza solo cuando la plataforma avisa que terminó (audio/video directo, YouTube, SoundCloud);
 * con BandLab, Drive, Smule y otros hay un botón «Siguiente» (Smule y otros se abren en su pestaña, porque no permiten incrustarse). */
(function(){
  "use strict";
  if(window.__paTodo) return; window.__paTodo=true;

  /* ---------- estilos (se inyectan aquí para que quitar el módulo no deje restos) ---------- */
  const st=document.createElement("style"); st.id="pa-style";
  st.textContent=`
  .card-play-all.card-copy-hashtags{width:auto;padding:0 13px 0 14px;border-radius:15px;gap:7px;font-size:12px;font-weight:800;white-space:nowrap;cursor:pointer;}
  .card-play-all[hidden]{display:none!important;}
  .card-play-all svg{display:block;flex:none;}
  .accordion.pa-has .accordion-toggle[data-toggle^="entregas-"]{padding-right:170px;}
  .pa-menu{position:absolute;z-index:6;right:20px;top:calc(var(--tgh,41px)/2 + 20px);min-width:210px;padding:6px;border-radius:14px;background:#2a1638;border:1px solid rgba(255,255,255,.12);box-shadow:0 12px 30px rgba(0,0,0,.5);display:flex;flex-direction:column;gap:4px;}
  .pa-menu button{display:flex;align-items:center;gap:8px;text-align:left;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.05);color:#fff;font-weight:700;font-size:13px;}
  .pa-menu button:hover,.pa-menu button:focus-visible{background:linear-gradient(90deg,var(--peach-2,#ef0870),var(--peach-1,#ff8fb1));}
  tr.pa-now td{background:rgba(239,8,112,.22)!important;}
  /* ----- reproductor grande (estilo YouTube) ----- */
  .pa-root{position:fixed;inset:0;z-index:3000;display:grid;grid-template-columns:minmax(0,1fr) 380px;grid-template-rows:auto minmax(0,1fr);overflow:hidden;
    background:linear-gradient(180deg,#1d1128,#120a19);color:#fff;font-family:inherit;}
  .pa-top{grid-column:1/-1;display:flex;align-items:center;gap:10px;padding:10px 16px;}
  .pa-count{flex:none;padding:4px 11px;border-radius:999px;background:linear-gradient(90deg,var(--peach-2,#ef0870),var(--peach-1,#ff8fb1));font-weight:900;font-size:12px;}
  .pa-act{flex:1;min-width:0;font-size:13px;font-weight:800;color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .pa-x{flex:none;width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;display:grid;place-items:center;cursor:pointer;}
  .pa-x svg,.pa-ico svg{display:block;}
  .pa-main{grid-column:1;grid-row:2;min-width:0;min-height:0;overflow-y:auto;padding:0 18px 18px 20px;}
  .pa-col{width:min(100%,max(300px,calc((100vh - 230px)*16/9)));}
  .pa-player{position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:16px;overflow:hidden;box-shadow:0 14px 40px rgba(0,0,0,.5);}
  .pa-media{position:absolute;inset:0;}
  .pa-media iframe{position:absolute;inset:0;width:100%;height:100%;border:0;}
  .pa-media video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;}
  .pa-poster{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#1a0f24 center/cover no-repeat;}
  .pa-poster::before{content:"";position:absolute;inset:0;background:inherit;filter:blur(26px) brightness(.55);transform:scale(1.2);}
  .pa-poster img{position:relative;height:72%;aspect-ratio:1;border-radius:50%;object-fit:cover;box-shadow:0 10px 40px rgba(0,0,0,.6);}
  .pa-prog{position:absolute;left:0;right:0;bottom:0;height:22px;display:flex;align-items:flex-end;cursor:pointer;z-index:1;background:linear-gradient(0deg,rgba(0,0,0,.55),transparent);}
  .pa-prog i{display:block;height:4px;width:0;background:linear-gradient(90deg,var(--peach-2,#ef0870),var(--peach-1,#ff8fb1));}
  .pa-time{position:absolute;right:10px;bottom:9px;font-size:11px;font-weight:800;color:rgba(255,255,255,.85);z-index:1;pointer-events:none;}
  .pa-msg{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;text-align:center;background:rgba(18,10,25,.88);font-size:14px;font-weight:700;}
  .pa-msg small{font-weight:600;color:rgba(255,255,255,.65);font-size:12.5px;}
  .pa-msg a{display:inline-flex;align-items:center;gap:6px;padding:11px 18px;border-radius:14px;font-weight:800;color:#fff;text-decoration:none;background:linear-gradient(90deg,var(--peach-2,#ef0870),var(--peach-1,#ff8fb1));}
  .pa-ctl{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin-top:12px;}
  .pa-ctl .pa-l{justify-self:start;}.pa-ctl .pa-r{justify-self:end;}
  .pa-center{display:flex;align-items:center;gap:12px;}
  .pa-ico{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.1);color:#fff;cursor:pointer;}
  .pa-ico.big{width:56px;height:56px;background:linear-gradient(90deg,var(--peach-2,#ef0870),var(--peach-1,#ff8fb1));}
  .pa-ico:disabled{opacity:.35;cursor:default;}
  .pa-pill{display:inline-flex;align-items:center;gap:7px;height:40px;padding:0 15px;border-radius:999px;background:rgba(255,255,255,.1);color:#fff;font-weight:800;font-size:13px;text-decoration:none;cursor:pointer;white-space:nowrap;}
  .pa-info{margin-top:14px;}
  .pa-name{font-weight:900;font-size:18px;display:flex;align-items:center;gap:10px;min-width:0;}
  .pa-name img{width:34px;height:34px;border-radius:50%;object-fit:cover;flex:none;}
  .pa-song{margin-top:4px;font-size:14px;color:rgba(255,255,255,.72);}
  .pa-note{margin-top:8px;font-size:12px;color:rgba(255,255,255,.5);}
  /* panel de cola (derecha) */
  .pa-queue{grid-column:2;grid-row:2;display:flex;flex-direction:column;min-height:0;border-left:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.18);}
  .pa-qh{padding:12px 16px;font-weight:900;font-size:14px;display:flex;justify-content:space-between;gap:8px;}
  .pa-qh span{font-weight:700;color:rgba(255,255,255,.55);font-size:12px;}
  .pa-qlist{flex:1;min-height:0;overflow-y:auto;padding:0 10px 14px;display:flex;flex-direction:column;gap:6px;}
  .pa-qi{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.05);color:#fff;cursor:pointer;}
  .pa-qi:hover{background:rgba(255,255,255,.1);}
  .pa-qi.now{background:linear-gradient(90deg,rgba(239,8,112,.45),rgba(255,143,177,.22));box-shadow:inset 0 0 0 1px rgba(255,143,177,.5);}
  .pa-qi.done{opacity:.55;}
  .pa-qn{flex:none;width:20px;text-align:center;font-size:11px;font-weight:800;color:rgba(255,255,255,.55);}
  .pa-qi.now .pa-qn{color:#fff;}
  .pa-qi img{width:38px;height:38px;border-radius:50%;object-fit:cover;flex:none;}
  .pa-qt{flex:1;min-width:0;}
  .pa-qt b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .pa-qt em{display:block;font-style:normal;font-size:11.5px;color:rgba(255,255,255,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .pa-st{flex:none;font-size:11px;font-weight:900;padding:2px 7px;border-radius:999px;}
  .pa-st.ok{color:#5be3a1;background:rgba(91,227,161,.14);}
  .pa-st.roto{color:#ff6b7d;background:rgba(255,107,125,.16);}
  .pa-st.limit{color:#ffc247;background:rgba(255,194,71,.16);}
  /* minimizado: solo el cuadrado del reproductor, abajo a la derecha */
  .pa-shield,.pa-miniov{display:none;}
  .pa-root.mini{inset:auto 14px 14px auto;display:block;width:min(300px,64vw);background:none;overflow:visible;border-radius:16px;box-shadow:0 14px 38px rgba(0,0,0,.65);}
  .pa-root.mini .pa-top,.pa-root.mini .pa-queue,.pa-root.mini .pa-ctl,.pa-root.mini .pa-info,.pa-root.mini .pa-note,.pa-root.mini .pa-prog,.pa-root.mini .pa-time{display:none;}
  .pa-root.mini .pa-main{padding:0;overflow:visible;}
  .pa-root.mini .pa-col{width:100%;}
  .pa-root.mini .pa-player{border-radius:16px;box-shadow:none;}
  .pa-root.mini .pa-shield{display:block;position:absolute;inset:0;z-index:3;cursor:pointer;}
  .pa-root.mini .pa-miniov{position:absolute;inset:0;z-index:4;display:none;align-items:center;justify-content:center;gap:16px;background:rgba(0,0,0,.5);}
  .pa-root.mini.ov .pa-miniov{display:flex;}
  .pa-root.mini .pa-msg{font-size:11.5px;padding:8px;gap:6px;}
  .pa-root.mini .pa-msg small{display:none;}
  @media (max-width:860px){
    .pa-root{grid-template-columns:1fr;grid-template-rows:auto auto auto;overflow-y:auto;}
    .pa-main{grid-column:1;grid-row:2;overflow:visible;padding:0 12px 12px;}
    .pa-col{width:100%;}
    .pa-queue{grid-column:1;grid-row:3;border-left:0;border-top:1px solid rgba(255,255,255,.1);}
    .pa-qlist{overflow:visible;}
    .pa-root.mini{display:block;overflow:visible;}
  }
  `;
  document.head.appendChild(st);

  const PLAY_SVG='<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M7 4.6v14.8a1 1 0 0 0 1.5.86l12-7.4a1 1 0 0 0 0-1.72l-12-7.4A1 1 0 0 0 7 4.6z"/></svg>';
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const tst=m=>{ try{ toast(m); }catch(_){} };

  /* ---------- botón junto a «Ver Actividades Entregadas» ---------- */
  function sync(){
    document.querySelectorAll('.accordion > .accordion-toggle[data-toggle^="entregas-"]').forEach(tg=>{
      const acc=tg.parentElement, body=document.getElementById(tg.dataset.toggle);
      let b=acc.querySelector(":scope > .card-play-all");
      const show=!!(body && body.classList.contains("open") && body.querySelector("tr[data-entrega-row]"));
      if(!show){ if(b && !b.hidden) b.hidden=true; if(acc.classList.contains("pa-has")) acc.classList.remove("pa-has"); return; }
      if(!b){
        b=document.createElement("button"); b.type="button"; b.className="btn-small btn-family card-copy-hashtags card-play-all";
        b.setAttribute("aria-label","Reproducir todas las entregas"); b.innerHTML=`Reproducir Todo ${PLAY_SVG}`;
        b.dataset.paAct=tg.dataset.toggle.replace("entregas-","");
        acc.appendChild(b);
      }
      if(b.hidden) b.hidden=false;
      if(!acc.classList.contains("pa-has")) acc.classList.add("pa-has");
      const h=tg.offsetHeight+"px"; if(b.style.getPropertyValue("--tgh")!==h) b.style.setProperty("--tgh",h);
    });
  }
  let raf=0; const prog=()=>{ if(!raf) raf=requestAnimationFrame(()=>{ raf=0; sync(); }); };
  new MutationObserver(prog).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
  window.addEventListener("resize",prog); prog();

  /* ---------- menú: primero → último / último → primero ---------- */
  let menu=null;
  const cerrarMenu=()=>{ if(menu){ menu.remove(); menu=null; } };
  document.addEventListener("pointerdown",e=>{ if(menu && !e.target.closest(".pa-menu,.card-play-all")) cerrarMenu(); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape") cerrarMenu(); });
  document.addEventListener("click",e=>{
    const b=e.target.closest(".card-play-all"); if(!b) return;
    e.stopPropagation();
    if(menu){ cerrarMenu(); return; }
    const acc=b.parentElement; menu=document.createElement("div"); menu.className="pa-menu";
    menu.innerHTML=`<button type="button" data-o="asc">⬇️ Del primero al último</button><button type="button" data-o="desc">⬆️ Del último al primero</button>`;
    menu.style.setProperty("--tgh",b.style.getPropertyValue("--tgh")||"41px");
    acc.appendChild(menu);
    menu.onclick=ev=>{ const o=ev.target.closest("[data-o]"); if(!o) return; const id=b.dataset.paAct, ord=o.dataset.o; cerrarMenu(); empezar(id,ord); };
  },true);

  /* ---------- cola ---------- */
  function tipoDe(url){
    const u=String(url||"").trim(); let m;
    if(/\.(mp3|m4a|aac|wav|ogg|oga|opus|flac)(\?|#|$)/i.test(u)) return {t:"audio",src:u,auto:true};
    if(/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u)) return {t:"video",src:u,auto:true};
    if((m=u.match(/youtu\.be\/([\w-]{11})/)||u.match(/[?&]v=([\w-]{11})/)||u.match(/youtube\.com\/(?:embed|shorts|live)\/([\w-]{11})/))) return {t:"yt",id:m[1],auto:true};
    if(/soundcloud\.com/i.test(u)) return {t:"sc",src:u,auto:true};
    if(/drive\.google\.com/i.test(u) && (m=u.match(/\/file\/d\/([\w-]+)/)||u.match(/[?&]id=([\w-]+)/))) return {t:"drive",id:m[1],auto:false};
    if(/bandlab\.com/i.test(u) && (m=u.match(/bandlab\.com\/(?:post|track|revisions?)\/([\w-]+)/))) return {t:"bandlab",id:m[1],auto:false};
    if(/smule\.com/i.test(u)) return {t:"smule",auto:false};
    return {t:"otro",auto:false};
  }
  const IC={
    prev:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 5h2.4v14H6zM20 5.6v12.8a.8.8 0 0 1-1.2.7L9.6 12.7a.8.8 0 0 1 0-1.4l9.2-5.4A.8.8 0 0 1 20 5.6z"/></svg>',
    next:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M15.6 5H18v14h-2.4zM4 5.6v12.8a.8.8 0 0 0 1.2.7l9.2-5.4a.8.8 0 0 0 0-1.4L5.2 5A.8.8 0 0 0 4 5.6z"/></svg>',
    play:'<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M7 4.6v14.8a1 1 0 0 0 1.5.86l12-7.4a1 1 0 0 0 0-1.72l-12-7.4A1 1 0 0 0 7 4.6z"/></svg>',
    pause:'<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><rect x="6" y="4.5" width="4.2" height="15" rx="1.2"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.2"/></svg>',
    open:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></svg>',
    min:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><rect x="12" y="12" width="7" height="5.5" rx="1" fill="currentColor"/></svg>',
    max:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>',
    x:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>'
  };
  const POSTER_DEF=()=>(typeof ENT_SHOW_IMG!=="undefined"?ENT_SHOW_IMG:"");
  const nombreDe=e=>{ try{ const t=document.createElement("div"); t.innerHTML=(typeof personaEntregaHTML_==="function")?personaEntregaHTML_(e):esc(e.nombreUsuario||""); return (t.textContent||"").trim()||String(e.nombreUsuario||""); }catch(_){ return String(e.nombreUsuario||""); } };
  const fotoDe=e=>{ try{ const ms=(typeof miembrosDeEntrega_==="function")?miembrosDeEntrega_(e):[]; return (ms[0]&&ms[0].avatarUrl)||POSTER_DEF(); }catch(_){ return POSTER_DEF(); } };
  const fmtT=t=>{ if(!isFinite(t)) return "0:00"; t=Math.max(0,Math.floor(t)); return Math.floor(t/60)+":"+String(t%60).padStart(2,"0"); };

  let cola=[], idx=-1, tok=0, root=null, tituloAct="", cur=null, playing=false, dir=1, estado=new Map(), vivo=false, qEls=[], onMsg=null;

  function empezar(idAct,orden){
    const body=document.getElementById("entregas-"+idAct); if(!body) return;
    const rows=[...body.querySelectorAll("tr[data-entrega-row]")].filter(r=>r.offsetParent!==null);
    const items=rows.map(r=>{ const e=(DB.entregas||[]).find(x=>String(x.id)===String(r.dataset.entregaRow)); const url=e?String(e.linkGrabacion||"").trim():""; return url?{e,row:r,url,k:tipoDe(url)}:null; }).filter(Boolean);
    if(!items.length){ tst("No hay entregas con enlace para reproducir."); return; }
    if(orden==="desc") items.reverse();
    const a=(DB.actividades||[]).find(x=>String(x.id)===String(idAct)); tituloAct=a?a.titulo||"":"";
    if(root) cerrar();
    cola=items; idx=-1; estado=new Map(); vivo=true; abrir(); ir(0,1); verificarTodo(tok0());
  }
  const tok0=()=>cola;   // la verificación se detiene si cambia la cola (cerrar / nueva lista)

  function abrir(){
    root=document.createElement("div"); root.className="pa-root"; root.setAttribute("role","dialog"); root.setAttribute("aria-label","Reproductor de entregas");
    root.innerHTML=`
      <div class="pa-top"><span class="pa-count"></span><span class="pa-act"></span><button type="button" class="pa-x" aria-label="Cerrar reproductor">${IC.x}</button></div>
      <div class="pa-main"><div class="pa-col">
        <div class="pa-player"><div class="pa-media"></div><div class="pa-prog" hidden><i></i></div><span class="pa-time" hidden></span>
          <div class="pa-shield"></div>
          <div class="pa-miniov"><button type="button" class="pa-ico big pa-mpause" aria-label="Pausa"></button><button type="button" class="pa-ico pa-mmax" aria-label="Maximizar">${IC.max}</button></div>
        </div>
        <div class="pa-ctl">
          <div class="pa-l"><a class="pa-pill pa-open" target="_blank" rel="noopener noreferrer">${IC.open} Abrir</a></div>
          <div class="pa-center"><button type="button" class="pa-ico pa-prev" aria-label="Anterior">${IC.prev}</button><button type="button" class="pa-ico big pa-pause" aria-label="Pausa"></button><button type="button" class="pa-ico pa-next" aria-label="Siguiente">${IC.next}</button></div>
          <div class="pa-r"><button type="button" class="pa-pill pa-min">${IC.min} Minimizar</button></div>
        </div>
        <div class="pa-info"><div class="pa-name"></div><div class="pa-song"></div><div class="pa-note"></div></div>
      </div></div>
      <aside class="pa-queue"><div class="pa-qh">En cola<span class="pa-qc"></span></div><div class="pa-qlist"></div></aside>`;
    document.body.appendChild(root);
    const q=s=>root.querySelector(s);
    q(".pa-x").onclick=cerrar;
    q(".pa-prev").onclick=()=>{ dir=-1; ir(idx-1,-1); };
    q(".pa-next").onclick=()=>{ dir=1; ir(idx+1,1); };
    q(".pa-pause").onclick=q(".pa-mpause").onclick=alternar;
    q(".pa-min").onclick=()=>minimizar(true);
    q(".pa-mmax").onclick=()=>minimizar(false);
    q(".pa-shield").onclick=()=>{ root.classList.add("ov"); clearTimeout(root._ovT); root._ovT=setTimeout(()=>root&&root.classList.remove("ov"),3500); };
    q(".pa-miniov").onclick=e=>{ if(e.target===e.currentTarget) root.classList.remove("ov"); };
    q(".pa-prog").onclick=e=>{ if(cur&&cur.el&&isFinite(cur.el.duration)){ const r=e.currentTarget.getBoundingClientRect(); cur.el.currentTime=cur.el.duration*Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)); } };
    /* lista de cola */
    const list=q(".pa-qlist"); qEls=[];
    cola.forEach((it,i)=>{
      const b=document.createElement("button"); b.type="button"; b.className="pa-qi";
      b.innerHTML=`<span class="pa-qn">${i+1}</span><img alt="" src="${esc(fotoDe(it.e))}" onerror="this.onerror=null;this.src='${esc(POSTER_DEF())}'"><span class="pa-qt"><b>${esc(nombreDe(it.e))}</b><em>${esc(it.e.detalleEntrega||"")}</em></span><span class="pa-st" hidden></span>`;
      b.onclick=()=>{ dir=i>=idx?1:-1; ir(i,dir); };
      list.appendChild(b); qEls.push(b);
    });
    q(".pa-qc").textContent=cola.length+" entrega"+(cola.length===1?"":"s");
    pintarPausa();
  }
  function minimizar(v){ if(!root) return; root.classList.toggle("mini",v); root.classList.remove("ov"); }
  function cerrar(){
    tok++; vivo=false; document.querySelectorAll("tr.pa-now").forEach(r=>r.classList.remove("pa-now"));
    if(cur&&cur.el){ try{ cur.el.pause(); cur.el.removeAttribute("src"); cur.el.load(); }catch(_){} }
    if(root){ root.remove(); root=null; } cola=[]; idx=-1; cur=null; qEls=[]; onMsg=null;
  }

  /* ---------- pausa / reanudar según el tipo de reproductor ---------- */
  const post=(f,o)=>{ try{ f.contentWindow.postMessage(JSON.stringify(o),"*"); }catch(_){} };
  function puedePausar(){ return !!(cur&&(cur.el||cur.yt||cur.sc)); }
  function alternar(){
    if(!puedePausar()) return;
    const quiere=playing?"pause":"play";
    if(cur.el){ quiere==="pause"?cur.el.pause():cur.el.play(); }
    else if(cur.yt) post(cur.frame,{event:"command",func:quiere==="pause"?"pauseVideo":"playVideo",args:[]});
    else if(cur.sc) post(cur.frame,{method:quiere});
    setPlaying(!playing);   // optimista; los eventos del reproductor lo corrigen si hace falta
  }
  function setPlaying(v){ playing=v; pintarPausa(); }
  function pintarPausa(){
    if(!root) return;
    const ok=puedePausar();
    root.querySelectorAll(".pa-pause,.pa-mpause").forEach(b=>{ b.innerHTML=playing?IC.pause:IC.play; b.disabled=!ok; b.title=ok?(playing?"Pausa":"Reproducir"):"Este tipo de enlace no permite pausar desde aquí"; b.setAttribute("aria-label",playing?"Pausa":"Reproducir"); });
  }

  /* ---------- verificación de enlaces ---------- */
  function marcar(it,v){
    estado.set(String(it.e.id),v);
    const i=cola.indexOf(it); if(i<0||!qEls[i]) return;
    const el=qEls[i].querySelector(".pa-st"); if(!el) return;
    const txt={ok:"✔",roto:"⚠ roto",limit:"⚠ limitado"}[v];
    if(!txt){ el.hidden=true; return; }
    el.hidden=false; el.className="pa-st "+v; el.textContent=txt;
    el.title=v==="ok"?"El enlace responde":v==="roto"?"El enlace ya no existe o falló":"Puede no reproducirse dentro del Hub";
  }
  const fetchT=(url,ms)=>{ const c=new AbortController(), t=setTimeout(()=>c.abort(),ms); return fetch(url,{mode:"cors",signal:c.signal,cache:"no-store"}).finally(()=>clearTimeout(t)); };
  const probeMedia=(it)=>new Promise(res=>{
    const el=document.createElement(it.k.t==="video"?"video":"audio"); el.preload="metadata"; let d=false;
    const f=v=>{ if(!d){ d=true; try{ el.removeAttribute("src"); el.load(); }catch(_){} res(v); } };
    el.onloadedmetadata=()=>f("ok"); el.onerror=()=>f("roto"); setTimeout(()=>f(null),9000); el.src=it.k.src;
  });
  /* Qué se puede comprobar de verdad desde el navegador: audio/video directos (se intenta cargar), YouTube y SoundCloud (su servicio oEmbed
     responde 404 si el video/pista se borró). Drive, BandLab, Smule y otros NO se pueden comprobar (el navegador lo impide): se quedan sin marca. */
  async function chequear(it){
    try{
      const k=it.k;
      if(k.t==="audio"||k.t==="video") return await probeMedia(it);
      let url=null; if(k.t==="yt") url="https://www.youtube.com/oembed?format=json&url="+encodeURIComponent("https://www.youtube.com/watch?v="+k.id);
      if(k.t==="sc") url="https://soundcloud.com/oembed?format=json&url="+encodeURIComponent(k.src);
      if(!url) return null;
      const r=await fetchT(url,8000);
      if(r.ok) return "ok"; if(r.status===404) return "roto"; if(r.status===401||r.status===403) return k.t==="yt"?"limit":"roto";
    }catch(_){}
    return null;   // sin respuesta (bloqueo del navegador, sin internet…): no se marca nada
  }
  async function verificarTodo(c){
    const pend=cola.map((it,i)=>i), N=3;
    await Promise.all(Array.from({length:N},async()=>{
      while(pend.length && cola===c && vivo){ const it=cola[pend.shift()]; if(!it||estado.has(String(it.e.id))) continue; const v=await chequear(it); if(cola!==c||!vivo) return; if(v){ marcar(it,v); if(v==="roto"&&cola[idx]===it&&root&&!root.querySelector(".pa-msg")) falla(tok,"roto"); } }
    }));
  }

  /* ---------- reproducir el elemento i ---------- */
  function ir(i,d){
    if(!root) return;
    if(i>=cola.length){ const rotos=cola.filter(it=>estado.get(String(it.e.id))==="roto").length; tst(rotos?`Terminó la lista 🎉 (${rotos} enlace(s) no funcionaban)`:"Terminó la lista 🎉"); cerrar(); return; }
    if(i<0) return;
    idx=i; dir=d||dir; const mi=++tok, it=cola[i], e=it.e, url=it.url, k=it.k;
    document.querySelectorAll("tr.pa-now").forEach(r=>r.classList.remove("pa-now"));
    if(it.row&&it.row.isConnected){ it.row.classList.add("pa-now"); }
    const q=s=>root.querySelector(s);
    q(".pa-count").textContent=`${i+1} / ${cola.length}`; q(".pa-act").textContent=tituloAct;
    q(".pa-name").innerHTML=`<img alt="" src="${esc(fotoDe(e))}" onerror="this.onerror=null;this.src='${esc(POSTER_DEF())}'"><span>${esc(nombreDe(e))}</span>`;
    q(".pa-song").textContent=e.detalleEntrega||"";
    qEls.forEach((b,j)=>{ b.classList.toggle("now",j===i); b.classList.toggle("done",j<i); b.querySelector(".pa-qn").textContent=j===i?"▶":String(j+1); });
    if(qEls[i]) try{ qEls[i].scrollIntoView({block:"nearest",behavior:"smooth"}); }catch(_){}
    q(".pa-prev").disabled=i===0;
    const open=q(".pa-open"); open.href=/^https?:/i.test(url)?url:"#";
    const media=q(".pa-media"), note=q(".pa-note"), prog=q(".pa-prog"), time=q(".pa-time");
    if(cur&&cur.el){ try{ cur.el.pause(); cur.el.removeAttribute("src"); cur.el.load(); }catch(_){} }
    media.innerHTML=""; note.textContent=""; prog.hidden=true; time.hidden=true; cur=null; onMsg=null; setPlaying(false);

    /* enlace ya comprobado como roto: se salta (en la dirección en que vas) */
    if(estado.get(String(e.id))==="roto"){ falla(mi,"roto"); return; }

    const sig=()=>{ if(mi===tok) ir(idx+1,1); };
    const frame=(src)=>{ const f=document.createElement("iframe"); f.src=src; f.allow="autoplay; encrypted-media; clipboard-write; fullscreen"; f.setAttribute("allowfullscreen",""); media.appendChild(f); return f; };
    const poster=()=>{ const p=document.createElement("div"); p.className="pa-poster"; p.style.backgroundImage=`url("${fotoDe(e).replace(/"/g,"%22")}")`; p.innerHTML=`<img alt="" src="${esc(fotoDe(e))}">`; media.appendChild(p); };

    if(k.t==="audio"||k.t==="video"){
      if(k.t==="audio") poster();
      const el=document.createElement(k.t); el.autoplay=true; el.playsInline=true; el.src=k.src; if(k.t==="audio") el.style.display="none"; media.appendChild(el);
      cur={el}; prog.hidden=false; time.hidden=false;
      el.onplay=()=>setPlaying(true); el.onpause=()=>{ if(!el.ended) setPlaying(false); }; el.onended=sig;
      el.ontimeupdate=()=>{ prog.firstElementChild.style.width=(el.duration?100*el.currentTime/el.duration:0)+"%"; time.textContent=fmtT(el.currentTime)+" / "+fmtT(el.duration); };
      el.onerror=()=>{ if(mi===tok){ marcar(it,"roto"); falla(mi,"roto"); } };
      note.textContent="Avanza solo al terminar.";
    }else if(k.t==="yt"){
      const f=frame(`https://www.youtube.com/embed/${k.id}?enablejsapi=1&autoplay=1&playsinline=1&rel=0&origin=${encodeURIComponent(location.origin)}`);
      cur={yt:true,frame:f}; f.onload=()=>post(f,{event:"listening",id:"pa"});
      onMsg=(ev,d)=>{
        if(ev.source!==f.contentWindow||!d) return;
        const est=d.event==="onStateChange"?d.info:(d.event==="infoDelivery"&&d.info&&typeof d.info.playerState==="number"?d.info.playerState:null);
        if(est===0) sig(); else if(est===1) setPlaying(true); else if(est===2) setPlaying(false);
        if(d.event==="onError"){ if(d.info===100){ marcar(it,"roto"); falla(mi,"roto"); } else { marcar(it,"limit"); falla(mi,"noinc"); } }
      };
      note.textContent="Avanza solo al terminar.";
    }else if(k.t==="sc"){
      const f=frame(`https://w.soundcloud.com/player/?url=${encodeURIComponent(k.src)}&auto_play=true&visual=true&show_comments=false`);
      cur={sc:true,frame:f};
      const reg=()=>["finish","play","pause"].forEach(v=>post(f,{method:"addEventListener",value:v}));
      f.onload=reg;
      onMsg=(ev,d)=>{ if(ev.source!==f.contentWindow||!d) return; if(d.method==="ready") reg(); else if(d.method==="finish") sig(); else if(d.method==="play") setPlaying(true); else if(d.method==="pause") setPlaying(false); };
      note.textContent="Avanza solo al terminar.";
    }else if(k.t==="drive"){
      frame(`https://drive.google.com/file/d/${k.id}/preview`);
      note.textContent="Drive no avisa cuándo termina ni permite pausar desde aquí: usa Siguiente. Si el archivo se borró, Google lo mostrará en el recuadro.";
    }else if(k.t==="bandlab"){
      frame(`https://www.bandlab.com/embed/?id=${k.id}&blur=false`);
      note.textContent="BandLab no avisa cuándo termina ni permite pausar desde aquí: usa Siguiente. Si no carga, usa «Abrir».";
    }else{
      poster(); falla(mi,"manual");
      note.textContent="Escúchala en su pestaña y vuelve aquí: toca Siguiente.";
    }
    pintarPausa();
  }

  /* Mensaje sobre el reproductor: roto (se salta solo), noinc (existe pero no se deja incrustar) o manual (Smule y otros) */
  function falla(mi,tipo){
    if(!root||mi!==tok) return;
    const it=cola[idx], url=it.url, media=root.querySelector(".pa-media"), ab=/^https?:/i.test(url)?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${IC.open} Abrir enlace</a>`:"";
    const m=document.createElement("div"); m.className="pa-msg";
    const nom=it.k.t==="smule"?"Smule":"Este enlace";
    if(tipo==="roto"){
      m.innerHTML=`<div>⚠ Este enlace no está disponible</div><small>Se borró, es privado o falló. ${dir<0?"Retrocediendo…":"Pasando a la siguiente…"}</small>${ab}`;
      media.appendChild(m);
      setTimeout(()=>{ if(root&&mi===tok){ if(dir<0){ if(idx>0) ir(idx-1,-1); else { m.querySelector("small").textContent="Es la primera de la lista."; } } else ir(idx+1,1); } },2600);
    }else if(tipo==="noinc"){
      m.innerHTML=`<div>Este video no se deja reproducir dentro del Hub</div><small>Existe, pero su dueño bloqueó la reproducción externa.</small>${ab}`; media.appendChild(m);
    }else{
      m.innerHTML=`<div>${nom} no se puede reproducir dentro del Hub</div>${ab}`; media.appendChild(m);
    }
  }

  /* mensajes de los reproductores incrustados (YouTube / SoundCloud) */
  window.addEventListener("message",ev=>{
    if(!onMsg) return;
    let d=ev.data; if(typeof d==="string"){ try{ d=JSON.parse(d); }catch(_){ return; } }
    onMsg(ev,d);
  });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&root&&!root.classList.contains("mini")&&!menu) minimizar(true); });
})();
