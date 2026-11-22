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
  .pa-panel{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:3000;width:min(560px,calc(100vw - 20px));box-sizing:border-box;padding:12px 14px 14px;border-radius:20px;
    background:linear-gradient(180deg,#2d1a40,#1d1128);border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 50px rgba(0,0,0,.6);color:#fff;font-family:inherit;}
  .pa-top{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
  .pa-count{flex:none;padding:4px 10px;border-radius:999px;background:linear-gradient(90deg,var(--peach-2,#ef0870),var(--peach-1,#ff8fb1));font-weight:900;font-size:12px;}
  .pa-act{flex:1;min-width:0;font-size:12px;font-weight:700;color:rgba(255,255,255,.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .pa-x{flex:none;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:16px;font-weight:900;}
  .pa-who{display:flex;align-items:center;gap:10px;margin-bottom:8px;min-width:0;}
  .pa-who img{width:38px;height:38px;border-radius:50%;object-fit:cover;flex:none;}
  .pa-name{font-weight:800;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .pa-song{font-size:12.5px;color:rgba(255,255,255,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .pa-media{border-radius:14px;overflow:hidden;background:rgba(0,0,0,.35);}
  .pa-media iframe{display:block;width:100%;border:0;}
  .pa-media audio,.pa-media video{display:block;width:100%;}
  .pa-media video{max-height:42vh;background:#000;}
  .pa-manual{padding:18px 14px;text-align:center;font-size:13px;color:rgba(255,255,255,.8);}
  .pa-note{margin-top:8px;font-size:11.5px;color:rgba(255,255,255,.55);min-height:14px;}
  .pa-ctl{display:flex;gap:8px;margin-top:10px;}
  .pa-ctl button,.pa-ctl a{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:42px;border-radius:14px;font-weight:800;font-size:13.5px;color:#fff;background:rgba(255,255,255,.1);text-decoration:none;cursor:pointer;}
  .pa-ctl .pa-next{flex:2;background:linear-gradient(90deg,var(--peach-2,#ef0870),var(--peach-1,#ff8fb1));}
  .pa-ctl button:disabled{opacity:.4;cursor:default;}
  .pa-manual a{display:inline-flex;align-items:center;justify-content:center;gap:6px;margin-top:10px;padding:11px 18px;border-radius:14px;font-weight:800;color:#fff;background:linear-gradient(90deg,var(--peach-2,#ef0870),var(--peach-1,#ff8fb1));text-decoration:none;}
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
  let cola=[], idx=-1, tok=0, panel=null, tituloAct="";

  function empezar(idAct,orden){
    const body=document.getElementById("entregas-"+idAct); if(!body) return;
    let rows=[...body.querySelectorAll("tr[data-entrega-row]")].filter(r=>r.offsetParent!==null);
    const items=rows.map(r=>{ const e=(DB.entregas||[]).find(x=>String(x.id)===String(r.dataset.entregaRow)); return e&&String(e.linkGrabacion||"").trim()?{e,row:r}:null; }).filter(Boolean);
    if(!items.length){ tst("No hay entregas con enlace para reproducir."); return; }
    if(orden==="desc") items.reverse();
    const a=(DB.actividades||[]).find(x=>String(x.id)===String(idAct)); tituloAct=a?a.titulo||"":"";
    cola=items; idx=-1; abrirPanel(); ir(0);
  }

  function abrirPanel(){
    if(panel) return;
    panel=document.createElement("div"); panel.className="pa-panel"; panel.setAttribute("role","dialog"); panel.setAttribute("aria-label","Reproductor de entregas");
    panel.innerHTML=`<div class="pa-top"><span class="pa-count"></span><span class="pa-act"></span><button type="button" class="pa-x" aria-label="Cerrar reproductor">✕</button></div>
      <div class="pa-who"><span class="pa-av"></span><div style="min-width:0;"><div class="pa-name"></div><div class="pa-song"></div></div></div>
      <div class="pa-media"></div><div class="pa-note"></div>
      <div class="pa-ctl"><button type="button" class="pa-prev">⏮ Anterior</button><a class="pa-open" target="_blank" rel="noopener noreferrer">Abrir ↗</a><button type="button" class="pa-next">Siguiente ⏭</button></div>`;
    document.body.appendChild(panel);
    panel.querySelector(".pa-x").onclick=cerrar;
    panel.querySelector(".pa-prev").onclick=()=>ir(idx-1);
    panel.querySelector(".pa-next").onclick=()=>ir(idx+1);
  }
  function cerrar(){
    tok++; document.querySelectorAll("tr.pa-now").forEach(r=>r.classList.remove("pa-now"));
    if(panel){ panel.remove(); panel=null; } cola=[]; idx=-1;
  }

  function ir(i){
    if(!panel) return;
    if(i>=cola.length){ tst("Terminó la lista 🎉"); cerrar(); return; }
    if(i<0) return;
    idx=i; const mi=++tok, {e,row}=cola[i], url=String(e.linkGrabacion||"").trim(), k=tipoDe(url);
    document.querySelectorAll("tr.pa-now").forEach(r=>r.classList.remove("pa-now"));
    if(row && row.isConnected){ row.classList.add("pa-now"); try{ row.scrollIntoView({block:"nearest",behavior:"smooth"}); }catch(_){} }
    const q=s=>panel.querySelector(s);
    q(".pa-count").textContent=`${i+1} / ${cola.length}`; q(".pa-act").textContent=tituloAct;
    q(".pa-av").innerHTML=(typeof avatarEntrega_==="function")?avatarEntrega_(e):"";
    q(".pa-name").innerHTML=(typeof personaEntregaHTML_==="function")?personaEntregaHTML_(e):esc(e.nombreUsuario||"");
    q(".pa-song").textContent=e.detalleEntrega||"";
    q(".pa-prev").disabled=i===0; q(".pa-next").innerHTML=i===cola.length-1?"Terminar ✔":"Siguiente ⏭";
    const open=q(".pa-open"); open.href=/^https?:/i.test(url)?url:"#";
    const media=q(".pa-media"), note=q(".pa-note"); media.innerHTML=""; note.textContent="";
    const sig=()=>{ if(mi===tok) ir(idx+1); };
    const iframe=(src,h)=>{ const f=document.createElement("iframe"); f.src=src; f.height=h; f.allow="autoplay; encrypted-media; clipboard-write"; f.setAttribute("allowfullscreen",""); f.loading="eager"; media.appendChild(f); return f; };

    if(k.t==="audio"||k.t==="video"){
      const el=document.createElement(k.t); el.controls=true; el.autoplay=true; el.playsInline=true; el.src=k.src; el.onended=sig;
      el.onerror=()=>{ if(mi===tok){ media.innerHTML=`<div class="pa-manual">No se pudo reproducir aquí.<br><a href="${escUrlSafe(url)}" target="_blank" rel="noopener noreferrer">Abrir enlace ↗</a></div>`; note.textContent="Cuando termines, toca Siguiente."; } };
      media.appendChild(el); note.textContent="Avanza solo al terminar.";
    }else if(k.t==="yt"){
      const f=iframe(`https://www.youtube.com/embed/${k.id}?enablejsapi=1&autoplay=1&playsinline=1&rel=0&origin=${encodeURIComponent(location.origin)}`,200);
      f.onload=()=>{ try{ f.contentWindow.postMessage(JSON.stringify({event:"listening",id:"pa"}),"*"); }catch(_){} };
      listen(mi,f,d=>{ if(d&&d.event==="onStateChange"&&d.info===0) sig(); });
      note.textContent="Avanza solo al terminar.";
    }else if(k.t==="sc"){
      const f=iframe(`https://w.soundcloud.com/player/?url=${encodeURIComponent(k.src)}&auto_play=true&visual=false&show_comments=false`,166);
      const reg=()=>{ try{ f.contentWindow.postMessage(JSON.stringify({method:"addEventListener",value:"finish"}),"*"); }catch(_){} };
      f.onload=reg;
      listen(mi,f,d=>{ if(!d) return; if(d.method==="ready") reg(); if(d.method==="finish") sig(); });
      note.textContent="Avanza solo al terminar.";
    }else if(k.t==="drive"){
      iframe(`https://drive.google.com/file/d/${k.id}/preview`,200);
      note.textContent="Drive no avisa cuándo termina: toca Siguiente.";
    }else if(k.t==="bandlab"){
      iframe(`https://www.bandlab.com/embed/?id=${k.id}&blur=false`,200);
      note.textContent="BandLab no avisa cuándo termina: toca Siguiente. Si no carga, usa «Abrir».";
    }else{
      const nom=k.t==="smule"?"Smule":"Este enlace";
      media.innerHTML=`<div class="pa-manual">${nom} no se puede reproducir dentro del Hub.<br><a href="${escUrlSafe(url)}" target="_blank" rel="noopener noreferrer">Abrir en una pestaña ↗</a></div>`;
      note.textContent="Escúchala y vuelve aquí: toca Siguiente.";
    }
  }
  const escUrlSafe=u=>/^https?:/i.test(u)?esc(u):"#";

  /* mensajes de los reproductores incrustados (YouTube / SoundCloud) */
  const oyentes=[];
  function listen(mi,frame,fn){ oyentes.length=0; oyentes.push({mi,frame,fn}); }
  window.addEventListener("message",ev=>{
    const o=oyentes[0]; if(!o||o.mi!==tok||ev.source!==o.frame.contentWindow) return;
    let d=ev.data; if(typeof d==="string"){ try{ d=JSON.parse(d); }catch(_){ return; } }
    o.fn(d);
  });
})();
