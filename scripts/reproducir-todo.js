/* Reproducir Todo (lista de reproducción de entregas) — v3: también en la tarjeta de miembro (Canto / Doblaje / Ambas).
 * Reproducir Todo (lista de reproducción de entregas) — módulo AUTÓNOMO y reversible.
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
  /* index.html fija .card .card-copy-hashtags.btn-small en 30x30 redondo (mayor especificidad): se iguala para que el botón se alargue lo que pida su texto */
  .card .card-play-all.card-copy-hashtags.btn-small{width:auto;min-width:30px;height:30px;padding:0 13px 0 14px;border-radius:15px;white-space:nowrap;}
  .card .card-play-all.card-copy-hashtags.btn-small span{white-space:nowrap;}
  .card-play-all[hidden]{display:none!important;}
  .card-play-all .pa-ls{display:none;}
  @media (max-width:640px){ .card-play-all .pa-lf{display:none;} .card-play-all .pa-ls{display:inline;} }
  .card-play-all svg{display:block;flex:none;}
  .accordion.pa-has .accordion-toggle[data-toggle^="entregas-"]{padding-right:170px;}
  .pa-menu{position:fixed;z-index:3500;width:248px;max-width:calc(100vw - 20px);padding:8px;border-radius:16px;background:#2a1638;border:1px solid rgba(255,255,255,.12);box-shadow:0 16px 40px rgba(0,0,0,.55);display:flex;flex-direction:column;gap:5px;}
  .pa-mh{display:flex;align-items:center;gap:6px;padding:3px 4px 5px;font-size:11.5px;font-weight:800;letter-spacing:.02em;color:rgba(255,255,255,.6);}
  .pa-mh .pa-mb{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;flex:none;}
  .pa-mh .pa-mb:hover{background:rgba(255,255,255,.16);}
  .pa-menu .pa-mo{display:flex;align-items:center;gap:10px;text-align:left;padding:10px 12px;border-radius:11px;background:rgba(255,255,255,.05);color:#fff;font-weight:700;font-size:13px;cursor:pointer;}
  .pa-menu .pa-mo svg{flex:none;display:block;}
  .pa-menu .pa-mo small{margin-left:auto;font-size:11px;font-weight:800;opacity:.7;}
  .pa-menu .pa-mo:hover:not(:disabled),.pa-menu .pa-mo:focus-visible{background:linear-gradient(90deg,var(--peach-2,#ef0870),var(--peach-1,#ff8fb1));}
  .pa-menu .pa-mo:disabled{opacity:.38;cursor:default;}
  .pa-mem-all{display:flex;flex:1 0 100%;width:100%;box-sizing:border-box;align-items:center;justify-content:center;gap:7px;padding:11px 16px;border-radius:999px;font-weight:800;font-size:13px;color:#fff;cursor:pointer;white-space:nowrap;background:linear-gradient(90deg,var(--peach-2,#ef0870),var(--peach-1,#ff8fb1));box-shadow:0 4px 14px rgba(239,8,112,.3);}
  .pa-mem-all svg{display:block;flex:none;}
  table.entregas-table tr[data-entrega-row].pa-now{border-radius:14px;background:linear-gradient(90deg,rgba(239,8,112,.20),rgba(255,143,177,.07));box-shadow:inset 0 0 0 1.5px rgba(255,143,177,.5);border-bottom-color:transparent;padding-left:8px;padding-right:8px;}
  table.entregas-table tr[data-entrega-row].pa-now td{background:none!important;}
  /* ----- reproductor grande (estilo YouTube) ----- */
  .pa-root{position:fixed;inset:0;z-index:3000;display:grid;grid-template-columns:minmax(0,1fr) 380px;grid-template-rows:auto minmax(0,1fr);overflow:hidden;
    background:linear-gradient(180deg,#1d1128,#120a19);color:#fff;font-family:inherit;}
  .pa-top{grid-column:1/-1;display:flex;align-items:center;gap:8px;padding:6px 12px;}
  .pa-count{flex:none;padding:4px 11px;border-radius:999px;background:linear-gradient(90deg,var(--peach-2,#ef0870),var(--peach-1,#ff8fb1));font-weight:900;font-size:12px;}
  .pa-act{flex:1;min-width:0;font-size:13px;line-height:1.2;font-weight:800;color:rgba(255,255,255,.8);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
  .pa-x{flex:none;position:relative;width:40px;height:40px;padding:0;border:0;background:transparent;color:#fff;display:grid;place-items:center;cursor:pointer;-webkit-tap-highlight-color:transparent;}
  .pa-x svg{width:24px;height:24px;fill:none;stroke:#fff;stroke-width:3.6;stroke-linecap:round;filter:drop-shadow(0 0 5px rgba(239,8,112,.9)) drop-shadow(0 0 11px rgba(239,8,112,.45));transition:transform .28s cubic-bezier(.3,1.5,.5,1),stroke .2s;}
  .pa-x:hover svg,.pa-x:focus-visible svg{transform:rotate(90deg) scale(1.15);stroke:#ff8fb1;}
  .pa-x:active svg{transform:rotate(90deg) scale(.88);}
  .pa-x svg,.pa-ico svg{display:block;}
  .pa-main{grid-column:1;grid-row:2;min-width:0;min-height:0;overflow-y:auto;padding:0 18px 18px 20px;}
  .pa-col{width:min(100%,max(300px,calc((100vh - 230px)*16/9)));margin-left:auto;margin-right:auto;}
  .pa-player{position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:16px;overflow:hidden;box-shadow:0 14px 40px rgba(0,0,0,.5);}
  .pa-media{position:absolute;inset:0;}
  .pa-media iframe{position:absolute;left:0;top:0;width:100%;height:100%;max-width:100%;max-height:100%;border:0;display:block;}
  .pa-media video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;}
  .pa-poster{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#1a0f24 center/cover no-repeat;}
  .pa-poster::before{content:"";position:absolute;inset:0;background:inherit;filter:blur(26px) brightness(.55);transform:scale(1.2);}
  .pa-poster img{position:relative;height:72%;aspect-ratio:1;border-radius:50%;object-fit:cover;box-shadow:0 10px 40px rgba(0,0,0,.6);}
  .pa-prog{touch-action:none;position:absolute;left:0;right:0;bottom:0;height:26px;display:flex;align-items:flex-end;cursor:pointer;z-index:1;background:linear-gradient(0deg,rgba(0,0,0,.55),transparent);}
  .pa-prog i{display:block;height:4px;width:0;background:linear-gradient(90deg,var(--peach-2,#ef0870),var(--peach-1,#ff8fb1));}
  .pa-time{position:absolute;right:10px;bottom:9px;font-size:11px;font-weight:800;color:rgba(255,255,255,.85);z-index:1;pointer-events:none;}
  .pa-msg{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;text-align:center;background:rgba(18,10,25,.88);font-size:14px;font-weight:700;}
  .pa-msg small{font-weight:600;color:rgba(255,255,255,.65);font-size:12.5px;}
  .pa-msg>div{display:flex;align-items:center;justify-content:center;gap:7px;}
  .pa-msg a{display:inline-flex;align-items:center;gap:8px;margin-top:6px;padding:12px 28px;border-radius:999px;font-weight:900;font-size:14.5px;color:#fff;text-decoration:none;background:linear-gradient(90deg,var(--peach-2,#ef0870),var(--peach-1,#ff8fb1));box-shadow:0 8px 22px rgba(239,8,112,.42);transition:transform .15s,filter .15s,box-shadow .15s;}
  .pa-msg a:hover{transform:translateY(-1px) scale(1.04);filter:brightness(1.08);box-shadow:0 10px 26px rgba(239,8,112,.58);}
  .pa-msg a svg{display:block;}
  .pa-root.mini .pa-msg a{padding:7px 16px;font-size:12px;margin-top:2px;}
  .pa-ctl{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:10px;margin-top:12px;}
  .pa-ctl .pa-l{justify-self:start;min-width:0;width:100%;}.pa-ctl .pa-r{justify-self:end;display:flex;align-items:center;gap:2px;}
  .pa-vol{display:flex;align-items:center;gap:4px;min-width:0;transition:opacity .2s;}
  .pa-vol.off{opacity:.35;pointer-events:none;}
  .pa-vb,.pa-ib{width:38px;height:38px;flex:none;display:grid;place-items:center;border-radius:50%;background:none;color:rgba(255,255,255,.78);cursor:pointer;text-decoration:none;transition:color .15s,transform .15s;}
  .pa-vb:hover,.pa-ib:hover{color:#fff;transform:scale(1.1);}
  .pa-vb svg,.pa-ib svg{display:block;}
  .pa-ib[hidden]{display:none;}
  .pa-spin{width:22px;height:22px;border-radius:50%;border:3px solid rgba(255,255,255,.22);border-top-color:var(--peach-1,#ff8fb1);animation:paspin .8s linear infinite;}
  @keyframes paspin{to{transform:rotate(360deg);}}
  .pa-vr{-webkit-appearance:none;appearance:none;flex:1;min-width:0;width:110px;max-width:110px;height:20px;margin:0;background:transparent;cursor:pointer;--v:80%;}
  .pa-vr:focus{outline:none;}
  .pa-vr::-webkit-slider-runnable-track{height:5px;border-radius:999px;background:linear-gradient(90deg,var(--peach-2,#ef0870),var(--peach-1,#ff8fb1)) 0 0/var(--v) 100% no-repeat,rgba(255,255,255,.18);}
  .pa-vr::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;margin-top:-4.5px;border-radius:50%;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.55);transition:transform .12s;}
  .pa-vr:hover::-webkit-slider-thumb,.pa-vr:active::-webkit-slider-thumb{transform:scale(1.25);}
  .pa-vr::-moz-range-track{height:5px;border-radius:999px;background:rgba(255,255,255,.18);}
  .pa-vr::-moz-range-progress{height:5px;border-radius:999px;background:linear-gradient(90deg,var(--peach-2,#ef0870),var(--peach-1,#ff8fb1));}
  .pa-vr::-moz-range-thumb{width:14px;height:14px;border:0;border-radius:50%;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.55);}
  .pa-center{display:flex;align-items:center;gap:12px;}
  .pa-ico{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.1);color:#fff;cursor:pointer;}
  .pa-ico.big{width:56px;height:56px;background:linear-gradient(90deg,var(--peach-2,#ef0870),var(--peach-1,#ff8fb1));}
  .pa-ico:disabled{opacity:.35;cursor:default;}
  .pa-info{margin-top:14px;}
  .pa-name{font-weight:900;font-size:18px;display:flex;align-items:center;gap:10px;min-width:0;}
  .pa-name img{width:34px;height:34px;border-radius:50%;object-fit:cover;flex:none;}
  .pa-song{margin-top:4px;font-size:14px;color:rgba(255,255,255,.72);}
  .pa-note{display:none!important;}
  /* controles de pantalla completa: misma X de todo el Hub (sin botón, con brillo rosa) + rotar */
  .pa-fsx,.pa-rotb{display:none;position:absolute;top:calc(6px + env(safe-area-inset-top,0px));z-index:6;width:44px;height:44px;padding:0;border:0;background:transparent;color:#fff;place-items:center;cursor:pointer;-webkit-tap-highlight-color:transparent;}
  .pa-fsx{right:calc(6px + env(safe-area-inset-right,0px));}
  .pa-rotb{right:calc(54px + env(safe-area-inset-right,0px));}
  .pa-fsx svg,.pa-rotb svg{display:block;fill:none;stroke:#fff;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 4px rgba(0,0,0,.7)) drop-shadow(0 0 6px rgba(239,8,112,.9)) drop-shadow(0 0 12px rgba(239,8,112,.45));transition:transform .28s cubic-bezier(.3,1.5,.5,1),stroke .2s;}
  .pa-fsx svg{width:26px;height:26px;stroke-width:3.6;}
  .pa-rotb svg{width:26px;height:26px;stroke-width:2.4;}
  .pa-fsx:hover svg,.pa-fsx:focus-visible svg{transform:rotate(90deg) scale(1.15);stroke:#ff8fb1;}
  .pa-fsx:active svg{transform:rotate(90deg) scale(.88);}
  .pa-rotb:active svg{transform:rotate(90deg);}
  .pa-root.fakefs .pa-fsx,.pa-root.fakefs .pa-rotb,.pa-player:fullscreen .pa-fsx,.pa-player:fullscreen .pa-rotb,.pa-player:-webkit-full-screen .pa-fsx,.pa-player:-webkit-full-screen .pa-rotb{display:grid;}
  .pa-player:fullscreen,.pa-player:-webkit-full-screen{width:100vw;height:100vh;aspect-ratio:auto;border-radius:0;}
  .pa-root.fakefs .pa-player{position:fixed;inset:0;z-index:5;width:100vw;height:100vh;aspect-ratio:auto;border-radius:0;}
  @supports (height:100dvh){ .pa-root.fakefs .pa-player{height:100dvh;} .pa-player:fullscreen{height:100dvh;} }
  /* «rotar» simulado (iPhone o si el navegador no deja bloquear la orientación): el recuadro se gira 90° y ocupa toda la pantalla */
  .pa-root.fakefs.rot .pa-player{inset:auto;top:0;left:100vw;width:100vh;height:100vw;transform:rotate(90deg);transform-origin:0 0;}
  @supports (height:100dvh){ .pa-root.fakefs.rot .pa-player{width:100dvh;} }
  .pa-root.fakefs{overflow:hidden;}
  /* Drive necesita más alto que 16:9 para mostrar sus controles sin recortarse (sobre todo en teléfono) */
  .pa-player.drv{min-height:min(300px,70vh);}
  /* panel de cola (derecha) */
  .pa-queue{grid-column:2;grid-row:2;display:flex;flex-direction:column;min-height:0;border-left:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.18);}
  .pa-qh{padding:12px 16px;font-weight:900;font-size:14px;display:flex;justify-content:space-between;gap:8px;}
  .pa-qh span{font-weight:700;color:rgba(255,255,255,.55);font-size:12px;}
  .pa-qlist{flex:1;min-height:0;overflow-y:auto;padding:0 10px calc(28px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:6px;}
  .pa-qi{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.05);color:#fff;cursor:pointer;flex:none;content-visibility:auto;contain-intrinsic-size:auto 56px;-webkit-tap-highlight-color:transparent;}
  .pa-qi:hover{background:rgba(255,255,255,.1);}
  .pa-qi.now{background:linear-gradient(90deg,rgba(239,8,112,.45),rgba(255,143,177,.22));box-shadow:inset 0 0 0 1px rgba(255,143,177,.5);}
  .pa-qi.done{opacity:.55;}
  .pa-qn{flex:none;width:20px;text-align:center;font-size:11px;font-weight:800;color:rgba(255,255,255,.55);}
  .pa-qi.now .pa-qn{color:#fff;}
  .pa-qi img{width:38px;height:38px;border-radius:50%;object-fit:cover;flex:none;}
  .pa-qt{flex:1;min-width:0;}
  .pa-qt b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .pa-qt em{display:block;font-style:normal;font-size:11.5px;color:rgba(255,255,255,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .pa-st{flex:none;display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:900;padding:2px 7px;border-radius:999px;}
  .pa-qn svg{display:inline-block;vertical-align:middle;}
  .pa-st[hidden]{display:none;}
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
  @supports (height:100dvh){ .pa-root:not(.mini){height:100dvh;bottom:auto;} }
  @media (max-width:860px){
    .pa-root{display:flex;flex-direction:column;flex-wrap:nowrap;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;}
    .pa-root>.pa-top,.pa-root>.pa-main,.pa-root>.pa-queue{flex:none;width:100%;box-sizing:border-box;}
    .pa-top{padding:4px 8px;}
    .pa-main{overflow:visible;padding:0;min-height:auto;}
    .pa-col{width:100%;margin:0;}
    .pa-player{border-radius:0;box-shadow:none;}
    .pa-ctl{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"c c" "l r";gap:6px 10px;margin-top:10px;padding:0 12px;}
    .pa-ctl .pa-center{grid-area:c;justify-self:center;}
    .pa-ctl .pa-l{grid-area:l;}
    .pa-ctl .pa-r{grid-area:r;}
    .pa-vr{width:100%;max-width:150px;}
    .pa-info{padding:0 14px;}
    .pa-name span{min-width:0;overflow-wrap:anywhere;}
    .pa-queue{border-left:0;border-top:1px solid rgba(255,255,255,.1);margin-top:14px;min-height:auto;}
    .pa-qlist{overflow:visible;flex:none;}
    .pa-root.mini{display:block;overflow:visible;}
  }
  .pa-info{overflow-wrap:anywhere;}
  .pa-player{contain:layout paint;}
  /* ----- aviso de descarga (centro de la pantalla) ----- */
  .pa-dlov{position:fixed;inset:0;z-index:4000;display:grid;place-items:center;padding:20px;background:rgba(10,5,16,.72);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);animation:padlIn .22s ease-out;}
  @keyframes padlIn{from{opacity:0}to{opacity:1}}
  .pa-dlc{width:min(100%,340px);padding:26px 22px 20px;border-radius:24px;text-align:center;color:#fff;background:linear-gradient(180deg,#2a1638,#1a0f24);border:1px solid rgba(255,255,255,.12);box-shadow:0 24px 70px rgba(0,0,0,.65);animation:padlPop .4s cubic-bezier(.2,1.4,.4,1);}
  @keyframes padlPop{from{transform:scale(.82);opacity:0}to{transform:scale(1);opacity:1}}
  .pa-dlk{width:92px;height:92px;margin:0 auto 14px;display:block;overflow:visible;}
  .pa-dlk circle{fill:none;stroke:var(--pk);stroke-width:5;stroke-linecap:round;stroke-dasharray:289;stroke-dashoffset:289;transform:rotate(-90deg);transform-origin:50% 50%;animation:padlC .65s .1s cubic-bezier(.65,0,.35,1) forwards;}
  .pa-dlk path{fill:none;stroke:var(--pk);stroke-width:6;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:60;stroke-dashoffset:60;animation:padlC .4s .65s cubic-bezier(.65,0,.35,1) forwards;}
  .pa-dlk .pa-dlg{fill:var(--pk);stroke:none;opacity:0;transform-origin:50% 50%;animation:padlG .6s .7s ease-out;}
  @keyframes padlC{to{stroke-dashoffset:0}}
  @keyframes padlG{0%{opacity:.35;transform:scale(.6)}100%{opacity:0;transform:scale(1.5)}}
  .pa-dlt{font-weight:900;font-size:19px;}
  .pa-dls{margin-top:6px;font-size:14px;font-weight:700;color:rgba(255,255,255,.85);}
  .pa-dlm{margin-top:3px;font-size:12.5px;font-weight:600;color:rgba(255,255,255,.6);}
  .pa-dlbar{margin:16px 4px 14px;height:4px;border-radius:999px;background:rgba(255,255,255,.14);overflow:hidden;}
  .pa-dlbar i{display:block;height:100%;width:0;background:var(--pk);animation:padlB 2.4s linear forwards;}
  @keyframes padlB{to{width:100%}}
  .pa-dlb{display:flex;gap:8px;justify-content:center;}
  .pa-dlb a,.pa-dlb button{flex:1;display:flex;align-items:center;justify-content:center;border:0;font-family:inherit;line-height:1.1;padding:12px;border-radius:999px;font-weight:900;font-size:13.5px;color:#fff;text-decoration:none;cursor:pointer;background:rgba(255,255,255,.1);}
  .pa-dlb a{background:var(--pk);}
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
        b.setAttribute("aria-label","Reproducir todas las entregas"); b.innerHTML=`<span class="pa-lf">Reproducir Todo</span><span class="pa-ls">Todo</span>${PLAY_SVG}`;
        b.dataset.paAct=tg.dataset.toggle.replace("entregas-","");
        acc.appendChild(b);
      }
      if(b.hidden) b.hidden=false;
      if(!acc.classList.contains("pa-has")) acc.classList.add("pa-has");
      const h=tg.offsetHeight+"px"; if(b.style.getPropertyValue("--tgh")!==h) b.style.setProperty("--tgh",h);
    });
  }
  /* tarjeta de miembro: el botón va justo después de los filtros Canto / Doblaje */
  let memId=null;
  try{ const o=window.openMemberModal; if(typeof o==="function"&&!o.__pa){ const w=function(id){ memId=id; return o.apply(this,arguments); }; w.__pa=1; window.openMemberModal=w; } }catch(_){}
  function syncMiembro(){
    const f=document.getElementById("meEntregasFiltro"); if(!f||memId==null) return;
    const ya=f.querySelector(":scope > .pa-mem-all");
    if(ya){ if(ya.dataset.paMem===String(memId)) return; ya.remove(); }
    if(!itemsMiembro(memId,"ambas","canto","asc").length) return;
    const b=document.createElement("button"); b.type="button"; b.className="pa-mem-all"; b.dataset.paMem=String(memId);
    b.setAttribute("aria-label","Reproducir todas las entregas"); b.innerHTML=`Reproducir todo ${PLAY_SVG}`;
    f.appendChild(b);
  }
  let raf=0, tmr=0; const prog=()=>{ if(raf||tmr) return; tmr=setTimeout(()=>{ tmr=0; raf=requestAnimationFrame(()=>{ raf=0; sync(); syncMiembro(); }); },90); };
  /* ignora los cambios que ocurren dentro del propio reproductor / menús (cada segundo hay clases cambiando ahí) */
  new MutationObserver(ms=>{ for(let i=0;i<ms.length;i++){ const t=ms[i].target; if(!(t.closest&&t.closest(".pa-root,.pa-menu,.pa-dlov,#toast"))){ prog(); return; } } }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
  window.addEventListener("resize",prog); prog();

  /* ---------- menú de pasos (SVG, sin emojis) ----------
     Actividad: Orden.  Miembro: Canto / Doblaje / Ambas → (si Ambas: cuál primero) → Orden. */
  let menu=null;
  const cerrarMenu=()=>{ if(menu){ menu.remove(); menu=null; } };
  document.addEventListener("pointerdown",e=>{ if(menu && !e.target.closest(".pa-menu,.card-play-all,.pa-mem-all")) cerrarMenu(); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape") cerrarMenu(); });
  window.addEventListener("scroll",e=>{ if(menu && !(e.target.closest&&e.target.closest(".pa-menu"))) cerrarMenu(); },true);
  window.addEventListener("resize",cerrarMenu);
  function abrirMenu(btn,ctx){
    cerrarMenu();
    const m=document.createElement("div"); m.className="pa-menu"; document.body.appendChild(m); menu=m;
    const hist=[]; let sel={cats:null,first:"canto"};
    const conteo=ctx.modo==="mem"?{canto:itemsMiembro(ctx.id,"canto","canto","asc").length,doblaje:itemsMiembro(ctx.id,"doblaje","canto","asc").length}:null;
    const opt=(k,ico,txt,extra,dis)=>`<button type="button" class="pa-mo" data-k="${k}"${dis?" disabled":""}>${ico}<span>${txt}</span>${extra!=null?`<small>${extra}</small>`:""}</button>`;
    const ORD=ctx.modo==="mem"
      ? opt("asc",IC.dn,"Primero el más viejo")+opt("desc",IC.up,"Primero el más nuevo")
      : opt("asc",IC.dn,"Del primero al último")+opt("desc",IC.up,"Del último al primero");
    const PASOS={
      cat:()=>({t:"¿Qué quieres reproducir?",h:opt("canto",IC.mic,"Reproducir canto",conteo.canto,!conteo.canto)+opt("doblaje",IC.hp,"Reproducir doblaje",conteo.doblaje,!conteo.doblaje)+opt("ambas",IC.both,"Ambas",conteo.canto+conteo.doblaje,!(conteo.canto&&conteo.doblaje))}),
      first:()=>({t:"¿Cuál va primero?",h:opt("canto",IC.mic,"Primero canto")+opt("doblaje",IC.hp,"Primero doblaje")}),
      ord:()=>({t:"Orden",h:ORD})
    };
    function pos(){
      const r=btn.getBoundingClientRect(), w=m.offsetWidth, h=m.offsetHeight, vw=window.innerWidth, vh=window.innerHeight;
      let left=ctx.modo==="mem"?r.left:r.right-w; left=Math.max(10,Math.min(left,vw-w-10));
      let top=r.bottom+8; if(top+h>vh-10) top=Math.max(10,r.top-h-8);
      m.style.left=left+"px"; m.style.top=top+"px";
    }
    function pinta(paso){
      const d=PASOS[paso](); m.dataset.paso=paso;
      m.innerHTML=`<div class="pa-mh">${hist.length?`<button type="button" class="pa-mb" data-back aria-label="Atrás">${IC.back}</button>`:""}<span>${d.t}</span></div>${d.h}`;
      pos();
    }
    m.onclick=ev=>{
      if(ev.target.closest("[data-back]")){ pinta(hist.pop()); return; }
      const o=ev.target.closest(".pa-mo"); if(!o||o.disabled) return; const k=o.dataset.k, paso=m.dataset.paso;
      if(paso==="cat"){ sel.cats=k; hist.push("cat"); pinta(k==="ambas"?"first":"ord"); }
      else if(paso==="first"){ sel.first=k; hist.push("first"); pinta("ord"); }
      else{
        cerrarMenu();
        if(ctx.modo==="mem") empezarMiembro(ctx.id,sel.cats,sel.first,k); else empezar(ctx.id,k);
      }
    };
    pinta(ctx.modo==="mem"?"cat":"ord");
  }
  document.addEventListener("click",e=>{
    const mb=e.target.closest(".pa-mem-all");
    if(mb){ e.stopPropagation(); if(menu){ cerrarMenu(); return; } abrirMenu(mb,{modo:"mem",id:mb.dataset.paMem}); return; }
    const b=e.target.closest(".card-play-all"); if(!b) return;
    e.stopPropagation();
    if(menu){ cerrarMenu(); return; }
    abrirMenu(b,{modo:"act",id:b.dataset.paAct});
  },true);

  /* ---------- cola ---------- */
  function tipoDe(url){
    const u=String(url||"").trim(); let m;
    if(/\.(mp3|m4a|aac|wav|ogg|oga|opus|flac)(\?|#|$)/i.test(u)) return {t:"audio",src:u,auto:true};
    if(/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u)) return {t:"video",src:u,auto:true};
    try{
      const p=new URL(u), host=p.hostname.toLowerCase(), path=p.pathname;
      if(p.protocol==="https:"||p.protocol==="http:"){
        if(host==="youtu.be"){
          const id=path.split("/").filter(Boolean)[0]; if(id&&/^[\w-]{11}$/.test(id)) return {t:"yt",id,auto:true};
        }
        if(host==="youtube.com"||host==="www.youtube.com"||host==="m.youtube.com"||host==="youtube-nocookie.com"||host==="www.youtube-nocookie.com"){
          const id=p.searchParams.get("v")||((path.match(/\/(?:embed|shorts|live)\/([\w-]{11})(?:\/|$)/)||[])[1]);
          if(id&&/^[\w-]{11}$/.test(id)) return {t:"yt",id,auto:true};
        }
      }
    }catch(_){}
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
    open:'<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></svg>',
    min:'<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><rect x="12" y="12" width="7" height="5.5" rx="1" fill="currentColor"/></svg>',
    max:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>',
    dl:'<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>',
    vhi:'<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5v5h3.6L12 18.6V5.4L7.6 9.5z" fill="currentColor"/><path d="M15.5 8.8a4.6 4.6 0 0 1 0 6.4M18.2 6.2a8.4 8.4 0 0 1 0 11.6"/></svg>',
    vlo:'<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5v5h3.6L12 18.6V5.4L7.6 9.5z" fill="currentColor"/><path d="M15.5 8.8a4.6 4.6 0 0 1 0 6.4"/></svg>',
    vmu:'<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5v5h3.6L12 18.6V5.4L7.6 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
    warn:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.8L2.8 19.5h18.4z"/><path d="M12 10v4.4M12 17.2v.1"/></svg>',
    warnS:'<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.8L2.8 19.5h18.4z"/><path d="M12 10v4.4M12 17.2v.1"/></svg>',
    qplay:'<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M7 4.6v14.8a1 1 0 0 0 1.5.86l12-7.4a1 1 0 0 0 0-1.72l-12-7.4A1 1 0 0 0 7 4.6z"/></svg>',
    back:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    mic:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    hp:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="7" rx="1.5"/><rect x="16.5" y="14" width="4.5" height="7" rx="1.5"/></svg>',
    both:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>',
    dn:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16M6 14l6 6 6-6"/></svg>',
    up:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V4M6 10l6-6 6 6"/></svg>',
    fs:'<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    fsx:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
    rot:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2.4" transform="rotate(45 12 12)"/><path d="M4 9a8.5 8.5 0 0 1 3.2-4M20 15a8.5 8.5 0 0 1-3.2 4"/></svg>',
    x:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5L19 19M19 5L5 19"/></svg>'
  };
  const POSTER_DEF=()=>(typeof ENT_SHOW_IMG!=="undefined"?ENT_SHOW_IMG:"");
  const nombreDe=e=>{ try{
    const t=document.createElement("div"); t.innerHTML=(typeof personaEntregaHTML_==="function")?personaEntregaHTML_(e):esc(e.nombreUsuario||"");
    /* grupos: «13 Peachys» + lista oculta → «13 Peachys: Alix, Hikari, …» (antes se pegaban sin separador) */
    t.querySelectorAll("[data-grupo]").forEach(g=>{
      const lab=g.querySelector("[data-grupo-toggle]"), lis=g.querySelector(".pg-lista");
      const l=lab?(lab.textContent||"").trim():"", n=lis?(lis.textContent||"").replace(/\s+/g," ").trim():"";
      g.textContent=l&&n?l+": "+n:(l||n);
    });
    return (t.textContent||"").replace(/\s+/g," ").trim()||String(e.nombreUsuario||"");
  }catch(_){ return String(e.nombreUsuario||""); } };
  const fotoDe=e=>{ try{ const ms=(typeof miembrosDeEntrega_==="function")?miembrosDeEntrega_(e):[]; return (ms[0]&&ms[0].avatarUrl)||POSTER_DEF(); }catch(_){ return POSTER_DEF(); } };
  const fmtT=t=>{ if(!isFinite(t)) return "0:00"; t=Math.max(0,Math.floor(t)); return Math.floor(t/60)+":"+String(t%60).padStart(2,"0"); };

  let vol=80, muted=false; try{ const sv=parseInt(localStorage.getItem("pa-vol"),10); if(sv>=0&&sv<=100) vol=sv; }catch(_){}
  let curRO=null, cola=[], idx=-1, tok=0, root=null, tituloAct="", cur=null, playing=false, dir=1, estado=new Map(), vivo=false, qEls=[], onMsg=null;

  function empezar(idAct,orden){
    const body=document.getElementById("entregas-"+idAct); if(!body) return;
    const rows=[...body.querySelectorAll("tr[data-entrega-row]")].filter(r=>r.offsetParent!==null);
    const items=rows.map(r=>{ const e=(DB.entregas||[]).find(x=>String(x.id)===String(r.dataset.entregaRow)); const url=e?String(e.linkGrabacion||"").trim():""; return url?{e,row:r,url,k:tipoDe(url)}:null; }).filter(Boolean);
    if(orden==="desc") items.reverse();
    const a=(DB.actividades||[]).find(x=>String(x.id)===String(idAct));
    lanzar(items,a?a.titulo||"":"");
  }
  /* velocidad: se abren las conexiones a YouTube / SoundCloud antes de pedir el primer video */
  function precalentar(items){
    try{
      const hosts=new Set(); items.forEach(it=>{
        if(it.k.t==="yt"){ hosts.add("https://www.youtube.com"); hosts.add("https://i.ytimg.com"); }
        else if(it.k.t==="sc") hosts.add("https://w.soundcloud.com");
        else if(it.k.t==="drive"){ hosts.add("https://drive.google.com"); hosts.add("https://www.gstatic.com"); }
        else if(it.k.t==="bandlab") hosts.add("https://www.bandlab.com");
        else if(it.k.src){ try{ hosts.add(new URL(it.k.src).origin); }catch(_){} }
      });
      hosts.forEach(h=>{ if(document.head.querySelector('link[data-pa-pc="'+h+'"]')) return; const l=document.createElement("link"); l.rel="preconnect"; l.href=h; l.setAttribute("data-pa-pc",h); document.head.appendChild(l); });
    }catch(_){}
  }
  function lanzar(items,tit){
    if(!items.length){ tst("No hay entregas con enlace para reproducir."); return; }
    if(root) cerrar();
    tituloAct=tit||""; cola=items; idx=-1; estado=new Map(); vivo=true; abrir(); ir(0,1); const c0=tok0(); setTimeout(()=>{ if(cola===c0&&vivo) verificarTodo(c0); },700);
    precalentar(items);
  }
  /* Entregas de un miembro (con enlace). cats: canto|doblaje|ambas · first: cuál categoría va primero si es «ambas» ·
     ord: asc = más viejo primero, desc = más nuevo primero (la fecha real es la de la actividad, igual que en la tarjeta). */
  function itemsMiembro(idM,cats,first,ord){
    const acts=new Map((DB.actividades||[]).map(a=>[String(a.id),a]));
    const t=e=>{ const a=acts.get(String(e.idActividad)); const f=new Date((a&&a.fechaFin)?a.fechaFin:e.fecha); return isNaN(f)?-Infinity:f.getTime(); };
    const cmp=(x,y)=>{ const a=t(x),b=t(y); return a===b?0:(a<b?-1:1); };
    const mias=(DB.entregas||[]).filter(e=>idsDeEntrega_(e).includes(String(idM))&&String(e.linkGrabacion||"").trim());
    const por=c=>{ const l=mias.filter(e=>categoriaDeEntrega_(e)===c).sort(cmp); return ord==="desc"?l.reverse():l; };
    const orden=cats==="ambas"?(first==="doblaje"?["doblaje","canto"]:["canto","doblaje"]):[cats];
    return orden.flatMap(por).map(e=>{ const url=String(e.linkGrabacion).trim(), a=acts.get(String(e.idActividad)); return {e,row:null,url,k:tipoDe(url),mem:true,titulo:e.tituloActividad||(a&&a.titulo)||""}; });
  }
  function empezarMiembro(idM,cats,first,ord){ lanzar(itemsMiembro(idM,cats,first,ord),""); }
  const tok0=()=>cola;   // la verificación se detiene si cambia la cola (cerrar / nueva lista)

  function abrir(){
    root=document.createElement("div"); root.className="pa-root"; root.setAttribute("role","dialog"); root.setAttribute("aria-label","Reproductor de entregas");
    root.innerHTML=`
      <div class="pa-top"><span class="pa-count"></span><span class="pa-act"></span><button type="button" class="pa-x" aria-label="Cerrar reproductor">${IC.x}</button></div>
      <div class="pa-main"><div class="pa-col">
        <div class="pa-player"><div class="pa-media"></div><div class="pa-prog" hidden><i></i></div><span class="pa-time" hidden></span>
          <div class="pa-shield"></div><button type="button" class="pa-rotb" aria-label="Rotar pantalla" title="Rotar">${IC.rot}</button><button type="button" class="pa-fsx" aria-label="Salir de pantalla completa" title="Salir">${IC.x}</button>
          <div class="pa-miniov"><button type="button" class="pa-ico big pa-mpause" aria-label="Pausa"></button><button type="button" class="pa-ico pa-mmax" aria-label="Maximizar">${IC.max}</button></div>
        </div>
        <div class="pa-ctl">
          <div class="pa-l"><div class="pa-vol"><button type="button" class="pa-vb" aria-label="Silenciar"></button><input type="range" class="pa-vr" min="0" max="100" step="1" aria-label="Volumen"></div></div>
          <div class="pa-center"><button type="button" class="pa-ico pa-prev" aria-label="Anterior">${IC.prev}</button><button type="button" class="pa-ico big pa-pause" aria-label="Pausa"></button><button type="button" class="pa-ico pa-next" aria-label="Siguiente">${IC.next}</button></div>
          <div class="pa-r"><button type="button" class="pa-ib pa-dl" title="Descargar" aria-label="Descargar" hidden>${IC.dl}</button><a class="pa-ib pa-open" target="_blank" rel="noopener noreferrer" title="Abrir enlace" aria-label="Abrir enlace">${IC.open}</a><button type="button" class="pa-ib pa-fs" title="Pantalla completa" aria-label="Pantalla completa">${IC.fs}</button><button type="button" class="pa-ib pa-min" title="Minimizar" aria-label="Minimizar">${IC.min}</button></div>
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
    q(".pa-fs").onclick=q(".pa-fsx").onclick=pantallaCompleta; q(".pa-rotb").onclick=rotar;
    q(".pa-dl").onclick=descargar;
    q(".pa-vr").oninput=e=>{ vol=+e.target.value; muted=false; try{ localStorage.setItem("pa-vol",String(vol)); }catch(_){} aplicarVol(); };
    q(".pa-vb").onclick=()=>{ if(muted||vol===0){ muted=false; if(vol===0) vol=50; } else muted=true; aplicarVol(); };
    q(".pa-mmax").onclick=()=>minimizar(false);
    q(".pa-shield").onclick=()=>{ root.classList.add("ov"); clearTimeout(root._ovT); root._ovT=setTimeout(()=>root&&root.classList.remove("ov"),3500); };
    q(".pa-miniov").onclick=e=>{ if(e.target===e.currentTarget) root.classList.remove("ov"); };
    { const pg=q(".pa-prog"); let arr=false;
      const ir_=e=>{ if(cur&&cur.el&&isFinite(cur.el.duration)){ const r=pg.getBoundingClientRect(); cur.el.currentTime=cur.el.duration*Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)); } };
      pg.onpointerdown=e=>{ arr=true; try{ pg.setPointerCapture(e.pointerId); }catch(_){} ir_(e); };
      pg.onpointermove=e=>{ if(arr) ir_(e); };
      pg.onpointerup=pg.onpointercancel=()=>{ arr=false; }; }
    /* lista de cola */
    const list=q(".pa-qlist"); qEls=[];
    cola.forEach((it,i)=>{
      const b=document.createElement("button"); b.type="button"; b.className="pa-qi";
      b.innerHTML=`<span class="pa-qn">${i+1}</span><img alt="" loading="lazy" decoding="async" src="${esc(fotoDe(it.e))}" onerror="this.onerror=null;this.src='${esc(POSTER_DEF())}'"><span class="pa-qt"><b>${esc(it.mem?it.titulo:nombreDe(it.e))}</b><em>${esc(it.e.detalleEntrega||"")}</em></span><span class="pa-st" hidden></span>`;
      b.onclick=()=>{ dir=i>=idx?1:-1; ir(i,dir); if(window.innerWidth<=860&&root){ try{ root.scrollTo({top:0,behavior:"smooth"}); }catch(_){ root.scrollTop=0; } } };   /* en teléfono la cola queda debajo: se sube para ver el video */
      list.appendChild(b); qEls.push(b);
    });
    q(".pa-qc").textContent=cola.length+" entrega"+(cola.length===1?"":"s");
    pintarPausa(); aplicarVol();
  }
  /* pantalla completa del recuadro del video. Nativa si el navegador deja (y en teléfono se pide horizontal); si no (iPhone),
     video nativo o «pantalla completa simulada». «Rotar» bloquea la orientación o, si no se puede, gira el recuadro con CSS. */
  const dFs=()=>document.fullscreenElement||document.webkitFullscreenElement;
  const lockOri=(t)=>{ try{ const o=screen.orientation; if(o&&o.lock){ const r=o.lock(t); if(r&&r.catch) return r.then(()=>true,()=>false); return Promise.resolve(true); } }catch(_){} return Promise.resolve(false); };
  const unlockOri=()=>{ try{ screen.orientation&&screen.orientation.unlock&&screen.orientation.unlock(); }catch(_){} };
  function salirFs(){
    const d=document; if(root) root.classList.remove("fakefs","rot");
    if(dFs()){ try{ const r=(d.exitFullscreen||d.webkitExitFullscreen).call(d); if(r&&r.catch) r.catch(()=>{}); }catch(_){} }
    unlockOri();
  }
  function pantallaCompleta(){
    if(!root) return;
    if(root.classList.contains("fakefs")||dFs()){ salirFs(); return; }
    const p=root.querySelector(".pa-player");
    const falso=()=>{
      if(cur&&cur.el&&cur.el.tagName==="VIDEO"&&cur.el.webkitEnterFullscreen){ try{ cur.el.webkitEnterFullscreen(); return; }catch(_){} }
      root.classList.add("fakefs");
    };
    const rf=p.requestFullscreen||p.webkitRequestFullscreen;
    if(!rf){ falso(); return; }
    try{
      const r=rf.call(p);
      const ok=()=>{ if(window.innerHeight>window.innerWidth&&(navigator.maxTouchPoints||0)>0) lockOri("landscape"); };   // en teléfono: horizontal, como YouTube
      if(r&&r.then) r.then(ok,falso); else ok();
    }catch(_){ falso(); }
  }
  function rotar(){
    if(!root) return;
    if(dFs()){
      const o=screen.orientation, t=o&&String(o.type||"").indexOf("landscape")===0?"portrait":"landscape";
      lockOri(t).then(ok=>{ if(!ok&&root){ salirFs(); root.classList.add("fakefs","rot"); } });
      return;
    }
    root.classList.add("fakefs"); root.classList.toggle("rot");
  }
  ["fullscreenchange","webkitfullscreenchange"].forEach(ev=>document.addEventListener(ev,()=>{ if(!dFs()){ unlockOri(); } }));
  function minimizar(v){ if(!root) return; root.classList.toggle("mini",v); root.classList.remove("ov"); }
  function cerrar(){
    tok++; vivo=false; document.querySelectorAll("tr.pa-now").forEach(r=>r.classList.remove("pa-now"));
    if(cur&&cur.el){ try{ cur.el.pause(); cur.el.removeAttribute("src"); cur.el.load(); }catch(_){} }
    if(curRO){ try{ curRO.disconnect(); }catch(_){} curRO=null; }
    if(dFs()) salirFs(); else unlockOri();
    if(root){ root.remove(); root=null; } cola=[]; idx=-1; cur=null; qEls=[]; onMsg=null;
    try{ if(navigator.mediaSession){ navigator.mediaSession.metadata=null; ["play","pause","nexttrack","previoustrack"].forEach(a=>{ try{ navigator.mediaSession.setActionHandler(a,null); }catch(_){} }); } }catch(_){}
  }
  /* controles de la pantalla de bloqueo / notificación (teléfono): título, foto, play/pausa, anterior y siguiente */
  function sesion(it){
    try{
      const ms=navigator.mediaSession; if(!ms||typeof MediaMetadata==="undefined") return;
      const f=fotoDe(it.e); ms.metadata=new MediaMetadata({title:it.e.detalleEntrega||nombreDe(it.e),artist:nombreDe(it.e),album:it.titulo||tituloAct||"Team Peaches",artwork:/^https?:/i.test(f)?[{src:f,sizes:"512x512"}]:[]});
      ms.setActionHandler("play",()=>{ if(!playing) alternar(); }); ms.setActionHandler("pause",()=>{ if(playing) alternar(); });
      ms.setActionHandler("nexttrack",()=>{ dir=1; ir(idx+1,1); }); ms.setActionHandler("previoustrack",()=>{ if(idx>0){ dir=-1; ir(idx-1,-1); } });
    }catch(_){}
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
  /* volumen: audio/video directos, YouTube y SoundCloud lo aceptan; Drive, BandLab y demás no (el control se apaga) */
  function aplicarVol(){
    if(!root) return;
    const v=muted?0:vol, r=root.querySelector(".pa-vr"), vb=root.querySelector(".pa-vb"), bx=root.querySelector(".pa-vol");
    r.value=v; r.style.setProperty("--v",v+"%");
    vb.innerHTML=v===0?IC.vmu:v<50?IC.vlo:IC.vhi; vb.setAttribute("aria-label",v===0?"Quitar silencio":"Silenciar");
    const ok=!!(cur&&(cur.el||cur.yt||cur.sc)); bx.classList.toggle("off",!ok);
    if(!ok) return;
    if(cur.el){ try{ cur.el.volume=v/100; }catch(_){} }
    else if(cur.yt) post(cur.frame,{event:"command",func:"setVolume",args:[v]});
    else if(cur.sc) post(cur.frame,{method:"setVolume",value:v});
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
    const txt={roto:"roto",limit:"limitado"}[v];   // «ok» no se marca: solo se avisa de lo que falla
    if(!txt){ el.hidden=true; return; }
    el.hidden=false; el.className="pa-st "+v; el.innerHTML=IC.warnS+"<span>"+txt+"</span>";
    el.title=v==="roto"?"El enlace ya no existe o falló":"Puede no reproducirse dentro del Hub";
  }
  const fetchT=(url,ms)=>{ const c=new AbortController(), t=setTimeout(()=>c.abort(),ms); return fetch(url,{mode:"cors",signal:c.signal,cache:"no-store"}).finally(()=>clearTimeout(t)); };
  const probeMedia=(it)=>new Promise(res=>{
    const el=document.createElement(it.k.t==="video"?"video":"audio"); el.preload="metadata"; let d=false;
    const f=v=>{ if(!d){ d=true; try{ el.removeAttribute("src"); el.load(); }catch(_){} res(v); } };
    el.onloadedmetadata=()=>f("ok"); el.onerror=()=>f("roto"); setTimeout(()=>f(null),6000); el.src=it.k.src;
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
      const r=await fetchT(url,5000);
      if(r.ok) return "ok"; if(r.status===404) return "roto"; if(r.status===401||r.status===403) return k.t==="yt"?"limit":"roto";
    }catch(_){}
    return null;   // sin respuesta (bloqueo del navegador, sin internet…): no se marca nada
  }
  async function verificarTodo(c){
    const pend=cola.map((it,i)=>i).sort((x,y)=>Math.abs(x-idx)-Math.abs(y-idx)), N=6;
    await Promise.all(Array.from({length:N},async()=>{
      while(pend.length && cola===c && vivo){ const it=cola[pend.shift()]; if(!it||estado.has(String(it.e.id))) continue; const v=await chequear(it); if(cola!==c||!vivo) return; if(v){ marcar(it,v); if(v==="roto"&&cola[idx]===it&&root&&!root.querySelector(".pa-msg")) falla(tok,"roto"); } }
    }));
  }

  /* ---------- BandLab: pedir al servidor (Apps Script, acción resolverMedia) el archivo y si la pista existe. Smule ya no se intenta. ---------- */
  async function conTiempo(url,ms,opts){
    const ac=new AbortController(), t=setTimeout(()=>ac.abort(),ms);
    try{ return await fetch(url,Object.assign({signal:ac.signal},opts||{})); } finally{ clearTimeout(t); }
  }
  async function resolverMedia(it){
    if(it.media!==undefined) return it.media;
    let med=null;
    try{
      if(typeof apiPost==="function"){
        const r=await Promise.race([apiPost({action:"resolverMedia",url:it.url,clave:(typeof memberPin!=="undefined"&&memberPin)?memberPin:""},"",true),new Promise(res=>setTimeout(()=>res(null),7000))]);
        if(r&&r.ok&&r.url) med={url:r.url,tipo:r.tipo==="video"?"video":"audio"};
        else if(r&&typeof r.existe==="boolean") it.existe=r.existe;   // BandLab: el servidor sabe si la pista existe
      }
    }catch(_){}
    // YouTube no ofrece un archivo descargable al reproductor embebido. Solo se acepta una URL directa
    // si el backend ya configurado la devuelve; no se extrae desde reproductores ni proxies públicos.
    // (sin respaldo en el navegador: los «lectores» públicos eran lentos y casi nunca funcionaban con Smule/BandLab)
    if(med){
      try{ const murl=new URL(med.url); if(!/^https?:$/.test(murl.protocol)||!["audio","video"].includes(med.tipo)) med=null; }
      catch(_){ med=null; }
    }
    it.media=med; return med;
  }

  /* ---------- descarga: solo enlaces válidos y archivos ya resueltos ---------- */
  function puedeDescargar(it){
    if(!it) return false;
    try{
      const p=new URL(it.url); if(p.protocol!=="https:"&&p.protocol!=="http:") return false;
      if(it.k.t==="audio") return /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac)$/i.test(p.pathname);
      if(it.k.t==="video") return /\.(mp4|webm|mov|m4v)$/i.test(p.pathname);
      if(it.k.t==="drive") return p.hostname.toLowerCase()==="drive.google.com"&&!!it.k.id;
      if(it.k.t==="yt") return ["youtube.com","www.youtube.com","m.youtube.com","youtu.be","youtube-nocookie.com","www.youtube-nocookie.com"].includes(p.hostname.toLowerCase());
      if(it.k.t==="smule") return (/(^|\.)smule\.com$/i.test(p.hostname))&&p.pathname!=="/";
      if(it.k.t==="bandlab") return !!it.media&&(/(^|\.)bandlab\.com$/i.test(p.hostname))&&!!it.k.id;
    }catch(_){}
    return false;
  }
  const limpiaNombre=n=>String(n||"").replace(/[\\/:*?"<>|\u0000-\u001f]+/g," ").replace(/\s+/g," ").trim().slice(0,110);
  function guardarBlob(blob,nombre){
    const u=URL.createObjectURL(blob), a=document.createElement("a"); a.href=u; a.download=nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),30000);
  }
  /* Smule y YouTube no dan un archivo descargable desde aquí: se copia el enlace, se avisa en el centro de la pantalla y se abre
     un descargador externo para que solo pegues el enlace. */
  const DESCARGADORES={
    smule:{nombre:"Smule",color:"#4B41DB",url:"https://smuledownloader.online/"},
    yt:{nombre:"YouTube",color:"#FF0133",url:"https://id.yt1z.net/en/"}
  };
  async function copiarTexto(t){
    try{ if(navigator.clipboard&&window.isSecureContext){ await navigator.clipboard.writeText(t); return true; } }catch(_){}
    try{ const ta=document.createElement("textarea"); ta.value=t; ta.setAttribute("readonly",""); ta.style.cssText="position:fixed;left:-9999px;top:0;opacity:0"; document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0,t.length); const ok=document.execCommand("copy"); ta.remove(); return !!ok; }catch(_){ return false; }
  }
  async function avisoDescarga(it){
    const d=DESCARGADORES[it.k.t]; if(!d) return;
    const ok=await copiarTexto(it.url);
    const old=document.querySelector(".pa-dlov"); if(old) old.remove();
    const ov=document.createElement("div"); ov.className="pa-dlov"; ov.style.setProperty("--pk",d.color); ov.setAttribute("role","dialog"); ov.setAttribute("aria-label","Redirigiendo a descarga");
    ov.innerHTML=`<div class="pa-dlc">
      <svg class="pa-dlk" viewBox="0 0 100 100" aria-hidden="true"><circle class="pa-dlg" cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="46"/><path d="M30 52l14 14 27-29"/></svg>
      <div class="pa-dlt">${ok?"¡Enlace copiado!":"Copia el enlace"}</div>
      <div class="pa-dls">Redirigiendo a descarga de ${esc(d.nombre)}…</div>
      <div class="pa-dlm">${ok?"Pégalo en la página que se abrirá":"No pude copiarlo solo: mantén presionado el enlace del reproductor"}</div>
      <div class="pa-dlbar"><i></i></div>
      <div class="pa-dlb"><button type="button" class="pa-dlx">Cancelar</button><a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer" class="pa-dlgo">Ir ahora</a></div></div>`;
    document.body.appendChild(ov);
    let t=null; const cerrarAv=()=>{ clearTimeout(t); ov.remove(); };
    ov.querySelector(".pa-dlx").onclick=cerrarAv;
    ov.querySelector(".pa-dlgo").onclick=()=>{ clearTimeout(t); setTimeout(()=>ov.remove(),300); };
    ov.onclick=e=>{ if(e.target===ov) cerrarAv(); };
    t=setTimeout(()=>{   // con «noopener» el navegador no dice si bloqueó la ventana: se deja el aviso unos segundos con el botón «Ir ahora»
      try{ window.open(d.url,"_blank","noopener,noreferrer"); }catch(_){}
      const m=ov.querySelector(".pa-dlm"); if(m) m.textContent="Si no se abrió la página, toca «Ir ahora»";
      t=setTimeout(()=>ov.remove(),7000);
    },2500);
  }
  async function descargar(){
    const it=cola[idx]; if(!puedeDescargar(it)) return; const k=it.k; let url=null;
    if(k.t==="smule"||k.t==="yt"){ avisoDescarga(it); return; }
    if(k.t==="audio"||k.t==="video") url=k.src;
    else if(k.t==="drive") url="https://drive.google.com/uc?export=download&id="+k.id;
    else{
      tst("Preparando descarga…");
      const r=await resolverMedia(it);
      if(!r){ tst("No se pudo obtener el archivo de este enlace. Usa Abrir."); return; }
      url=r.url;
    }
    const ext=(String(url).split(/[?#]/)[0].match(/\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|mp4|webm|mov|m4v)$/i)||[])[1];
    const base=limpiaNombre(nombreDe(it.e)+" - "+(it.e.detalleEntrega||it.titulo||"entrega"))||"entrega";
    const nombre=ext?base+"."+ext.toLowerCase():base;
    if(k.t!=="drive"){   // si el servidor del archivo lo permite (CORS), se guarda con buen nombre sin salir del Hub
      try{ const r=await conTiempo(url,60000,{mode:"cors"}); if(r.ok){ guardarBlob(await r.blob(),nombre); tst("Descarga lista"); return; } }catch(_){}
    }
    const a=document.createElement("a"); a.href=url; a.target="_blank"; a.rel="noopener noreferrer"; if(k.t!=="drive") a.download=nombre;   // respaldo: que lo maneje el navegador
    document.body.appendChild(a); a.click(); a.remove();
    tst(k.t==="drive"?"Si Drive pide confirmación, acéptala en la pestaña que se abrió.":"Si se abrió el archivo en vez de bajarse, usa «Guardar como» en esa pestaña.");
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
    q(".pa-count").textContent=`${i+1} / ${cola.length}`; q(".pa-act").textContent=it.titulo||tituloAct;
    q(".pa-name").innerHTML=`<img alt="" src="${esc(fotoDe(e))}" onerror="this.onerror=null;this.src='${esc(POSTER_DEF())}'"><span>${esc(nombreDe(e))}</span>`;
    q(".pa-song").textContent=e.detalleEntrega||"";
    qEls.forEach((b,j)=>{ b.classList.toggle("now",j===i); b.classList.toggle("done",j<i); b.querySelector(".pa-qn").innerHTML=j===i?IC.qplay:String(j+1); });
    /* solo se desplaza la LISTA de la cola (en escritorio). scrollIntoView movía toda la pantalla y en teléfono dejaba el video recortado/corrido */
    if(qEls[i]&&window.innerWidth>860){ try{ const L=qEls[i].parentElement; if(L&&L.scrollHeight>L.clientHeight){ const top=qEls[i].offsetTop-(L.clientHeight-qEls[i].offsetHeight)/2; L.scrollTo({top:Math.max(0,top),behavior:"smooth"}); } }catch(_){} }
    q(".pa-prev").disabled=i===0; q(".pa-dl").hidden=!puedeDescargar(it);
    const open=q(".pa-open"); open.href=/^https?:/i.test(url)?url:"#";
    const media=q(".pa-media"), note=q(".pa-note"), prog=q(".pa-prog"), time=q(".pa-time");
    if(cur&&cur.el){ try{ cur.el.pause(); cur.el.removeAttribute("src"); cur.el.load(); }catch(_){} }
    if(curRO){ try{ curRO.disconnect(); }catch(_){} curRO=null; }
    media.innerHTML=""; note.textContent=""; prog.hidden=true; time.hidden=true; cur=null; onMsg=null; setPlaying(false);
    q(".pa-player").classList.toggle("drv",k.t==="drive");
    if(root.classList.contains("fakefs")&&!root.classList.contains("rot")){ /* se mantiene la pantalla completa entre pistas */ }
    sesion(it);

    /* enlace ya comprobado como roto: se salta (en la dirección en que vas) */
    if(estado.get(String(e.id))==="roto"){ falla(mi,"roto"); return; }

    const sig=()=>{ if(mi===tok) ir(idx+1,1); };
    const cur_k_drive=k.t==="drive";
    const frame=(src)=>{
      const f=document.createElement("iframe"); f.setAttribute("loading","eager");
      /* Drive NO recibe permiso de pantalla completa propia: su botón se quedaba atrapado en vertical y sin forma de salir. Se usa la del Hub (con rotar y cerrar). */
      if(cur_k_drive) f.allow="autoplay; encrypted-media; clipboard-write"; else { f.allow="autoplay; encrypted-media; clipboard-write; fullscreen"; f.setAttribute("allowfullscreen",""); }
      f.setAttribute("scrolling","no");
      const pl=q(".pa-player"), aj=()=>{ if(!pl||!f.isConnected||pl.classList.contains("fx")) return; const w=pl.clientWidth, h=pl.clientHeight; if(w&&h){ f.style.width=w+"px"; f.style.height=h+"px"; } };
      media.appendChild(f); aj(); f.src=src;
      if(window.ResizeObserver&&pl){ const ro=new ResizeObserver(aj); ro.observe(pl); f._ro=ro; curRO=ro; }
      return f;
    };
    const poster=()=>{ const p=document.createElement("div"); p.className="pa-poster"; p.style.backgroundImage=`url("${fotoDe(e).replace(/"/g,"%22")}")`; p.innerHTML=`<img alt="" src="${esc(fotoDe(e))}">`; media.appendChild(p); };

    /* reproductor propio (audio/video directo, o el archivo que resolvió el servidor para Smule/BandLab) */
    const nativo=(tipo,src,aviso,alFallar)=>{
      if(tipo==="audio") poster();
      const el=document.createElement(tipo); el.autoplay=true; el.playsInline=true; el.preload="auto"; el.src=src; if(tipo==="audio") el.style.display="none"; media.appendChild(el);
      cur={el}; prog.hidden=false; time.hidden=false;
      el.onplay=()=>setPlaying(true); el.onpause=()=>{ if(!el.ended) setPlaying(false); }; el.onended=sig;
      el.ontimeupdate=()=>{ prog.firstElementChild.style.width=(el.duration?100*el.currentTime/el.duration:0)+"%"; time.textContent=fmtT(el.currentTime)+" / "+fmtT(el.duration); };
      el.onerror=()=>{ if(mi===tok){ if(alFallar) alFallar(); else { marcar(it,"roto"); falla(mi,"roto"); } } };
      aplicarVol();

    };
    /* Smule: no se puede incrustar ni sacar el archivo → botón «Abrir» al instante (sin esperar).
       BandLab: se comprueba el enlace; si carga se reproduce (archivo propio, o su reproductor si el servidor confirma que existe); si no, botón «Abrir». */
    const sinArchivo=()=>{
      media.innerHTML=""; prog.hidden=true; time.hidden=true; cur=null; setPlaying(false);
      if(k.t==="bandlab"&&it.existe===true){
        frame(`https://www.bandlab.com/embed/?id=${k.id}&blur=false`);
      }else{
        poster(); falla(mi,"manual");
      }
      pintarPausa(); aplicarVol();
    };

    if(k.t==="audio"||k.t==="video"){
      nativo(k.t,k.src,"Avanza solo al terminar.");
    }else if(k.t==="yt"){
      const f=frame(`https://www.youtube.com/embed/${k.id}?enablejsapi=1&autoplay=1&playsinline=1&rel=0&origin=${encodeURIComponent(location.origin)}`);
      resolverMedia(it).then(()=>{ if(mi===tok&&root) q(".pa-dl").hidden=!puedeDescargar(it); });
      cur={yt:true,frame:f}; f.onload=()=>{ post(f,{event:"listening",id:"pa"}); aplicarVol(); setTimeout(()=>{ if(mi===tok) aplicarVol(); },900); };
      onMsg=(ev,d)=>{
        if(ev.source!==f.contentWindow||!d) return;
        const est=d.event==="onStateChange"?d.info:(d.event==="infoDelivery"&&d.info&&typeof d.info.playerState==="number"?d.info.playerState:null);
        if(est===0) sig(); else if(est===1){ setPlaying(true); if(!f._v){ f._v=1; aplicarVol(); } } else if(est===2) setPlaying(false);
        if(d.event==="onError"){ if(d.info===100){ marcar(it,"roto"); falla(mi,"roto"); } else { marcar(it,"limit"); falla(mi,"noinc"); } }
      };
    }else if(k.t==="sc"){
      const f=frame(`https://w.soundcloud.com/player/?url=${encodeURIComponent(k.src)}&auto_play=true&visual=true&show_comments=false`);
      cur={sc:true,frame:f};
      const reg=()=>["finish","play","pause"].forEach(v=>post(f,{method:"addEventListener",value:v}));
      f.onload=()=>{ reg(); aplicarVol(); };
      onMsg=(ev,d)=>{ if(ev.source!==f.contentWindow||!d) return; if(d.method==="ready"){ reg(); aplicarVol(); } else if(d.method==="finish") sig(); else if(d.method==="play") setPlaying(true); else if(d.method==="pause") setPlaying(false); };
    }else if(k.t==="drive"){
      frame(`https://drive.google.com/file/d/${k.id}/preview`);
    }else if(k.t==="smule"){
      poster(); falla(mi,"manual");
    }else if(k.t==="bandlab"){
      const ld=document.createElement("div"); ld.className="pa-msg"; ld.innerHTML='<span class="pa-spin"></span><div>Revisando el enlace…</div>'; media.appendChild(ld);
      resolverMedia(it).then(r=>{
        if(mi!==tok||!root) return;
        q(".pa-dl").hidden=!puedeDescargar(it);
        media.innerHTML="";
        if(r) nativo(r.tipo,r.url,"Avanza solo al terminar.",sinArchivo); else sinArchivo();
        pintarPausa(); aplicarVol();
      });
    }else{
      poster(); falla(mi,"manual");
    }
    pintarPausa(); aplicarVol();
  }

  /* Mensaje sobre el reproductor: roto (se salta solo), noinc (existe pero no se deja incrustar) o manual (Smule y otros) */
  function falla(mi,tipo){
    if(!root||mi!==tok) return;
    const it=cola[idx], url=it.url, media=root.querySelector(".pa-media"), ab=/^https?:/i.test(url)?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${IC.open} Abrir</a>`:"";
    const m=document.createElement("div"); m.className="pa-msg";
        if(tipo==="roto"){
      m.innerHTML=`<div>${IC.warn}<span>Este enlace no está disponible</span></div><small>Se borró, es privado o falló. ${dir<0?"Retrocediendo…":"Pasando a la siguiente…"}</small>${ab}`;
      media.appendChild(m);
      setTimeout(()=>{ if(root&&mi===tok){ if(dir<0){ if(idx>0) ir(idx-1,-1); else { m.querySelector("small").textContent="Es la primera de la lista."; } } else ir(idx+1,1); } },2600);
    }else if(tipo==="noinc"){
      m.innerHTML=`<div>Este video no se deja reproducir dentro del Hub</div><small>Existe, pero su dueño bloqueó la reproducción externa.</small>${ab}`; media.appendChild(m);
    }else{
      m.innerHTML=`<div>Este enlace no se puede reproducir dentro del Hub</div>${ab}`; media.appendChild(m);
    }
  }

  /* mensajes de los reproductores incrustados (YouTube / SoundCloud) */
  window.addEventListener("message",ev=>{
    if(!onMsg) return;
    let d=ev.data; if(typeof d==="string"){ try{ d=JSON.parse(d); }catch(_){ return; } }
    onMsg(ev,d);
  });
  document.addEventListener("keydown",e=>{ if(e.key!=="Escape"||!root||menu) return; if(root.classList.contains("fakefs")){ salirFs(); return; } if(!root.classList.contains("mini")&&!dFs()) minimizar(true); });
})();
