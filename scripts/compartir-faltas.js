/* Compartir Faltas: crea una imagen PNG (1408 px de ancho) para anunciar faltas y strikes, con el mismo estilo de los anuncios
 * de la patrona: fondo crema con puntitos, logo, fecha en letra de pincel, ramas de duraznos y el título «Strikes y faltas».
 * Cada miembro lleva su foto redonda con marquito blanco (sin VIP) y su conteo escrito a mano debajo del nombre.
 * Los adornos están en /faltas-assets/ (PNG con transparencia). Si alguno no carga, la imagen se hace igual, solo sin ese adorno.
 * Reutiliza de anuario.js: anuLoadImg_ (fotos con respaldo CORS) y anuEntregarPng_ (compartir/descargar). */
(function(){
  "use strict";
  const btn=document.getElementById("compartirFaltasBtn"); if(!btn) return;
  let ocupado=false;
  btn.onclick=async()=>{
    if(ocupado){ toast("Ya se está creando la imagen… ⏳"); return; }
    ocupado=true;
    try{ await crear(); }catch(err){ console.error(err); toast("No se pudo crear la imagen ❌"); }
    finally{ ocupado=false; }
  };

  const num=v=>Number(v)||0;
  const cargar=(u)=>{
    if(!u) return Promise.resolve(null);
    if(typeof anuLoadImg_==="function") return anuLoadImg_(u);
    return new Promise(res=>{ const im=new Image(); im.crossOrigin="anonymous"; im.onload=()=>res(im); im.onerror=()=>res(null); setTimeout(()=>res(null),6000); im.src=u; });
  };
  const cargarLocal=(u)=>new Promise(res=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=()=>res(null); setTimeout(()=>res(null),8000); im.src=u; });
  const fuente=(f)=>{ try{ return Promise.race([document.fonts.load(f),new Promise(r=>setTimeout(r,2500))]); }catch(_){ return Promise.resolve(); } };

  /* paleta del anuncio (sacada del diseño original) */
  const CREMA="#ffffeb", PUNTO="rgba(240,170,150,.22)", ROSA="#d0106a", TINTA="#3d2230", VINO="#7a1f3a", ROJO="#a8303c", ORO="#f0d070";
  const HOJA="#8fb56a", DURAZNO="#ff7f9a", DURAZNO_P="#c23a63";

  function gravedad(m){
    const f=num(m.faltas), s=num(m.strikes), p=num(m.strikesPermanentes);
    return {f,s,p,fuera:(s+p)>=3,score:p*1000+s*100+f};
  }

  /* iconos pequeños dibujados a mano (con contorno oscuro, como los adornos) */
  function hoja(c,x,y,s){ c.save(); c.translate(x,y); c.rotate(-0.6); c.beginPath(); c.moveTo(-s,0); c.quadraticCurveTo(0,-s*.95,s,0); c.quadraticCurveTo(0,s*.95,-s,0); c.closePath(); c.fillStyle=HOJA; c.fill(); c.lineWidth=2; c.strokeStyle=TINTA; c.lineJoin="round"; c.stroke(); c.beginPath(); c.moveTo(-s*.7,0); c.lineTo(s*.7,0); c.lineWidth=1.2; c.strokeStyle="rgba(61,34,48,.55)"; c.stroke(); c.restore(); }
  function durazno(c,x,y,s,col){ c.save(); c.beginPath(); c.arc(x-s*.32,y,s*.72,0,Math.PI*2); c.arc(x+s*.32,y,s*.72,0,Math.PI*2); c.fillStyle=col; c.fill(); c.beginPath(); c.arc(x-s*.32,y,s*.72,Math.PI*.55,Math.PI*1.5); c.arc(x+s*.32,y,s*.72,Math.PI*1.5,Math.PI*.45); c.closePath(); c.lineWidth=2; c.strokeStyle=TINTA; c.lineJoin="round"; c.stroke(); c.beginPath(); c.moveTo(x,y-s*.55); c.quadraticCurveTo(x-s*.1,y,x,y+s*.7); c.lineWidth=1.4; c.strokeStyle="rgba(61,34,48,.6)"; c.stroke(); c.restore(); hoja(c,x+s*.1,y-s*.95,s*.5); }

  async function crear(){
    const lista=(DB.miembros||[]).filter(m=>m.nombre).map(m=>({m,g:gravedad(m)})).filter(x=>x.g.f||x.g.s||x.g.p)
      .sort((a,b)=>b.g.score-a.g.score||(a.m.nombre||"").localeCompare(b.m.nombre||""));
    if(!lista.length){ toast("Nadie tiene faltas ni strikes 🎉"); return; }
    toast("Creando tu imagen… 🎨");
    const FD='"Kaushan Script","Caveat Brush","Segoe Script","Brush Script MT",cursive', FB='"Bree Serif","Georgia",serif';
    await Promise.all([fuente('64px "Kaushan Script"'),fuente('30px "Bree Serif"')]);
    const base="faltas-assets/";
    const [aLogo,aTitulo,aSup,aInf,...fotos]=await Promise.all([cargarLocal(base+"logo.png"),cargarLocal(base+"titulo.png"),cargarLocal(base+"rama-sup.png"),cargarLocal(base+"rama-inf.png"),...lista.map(x=>cargar(x.m.avatarUrl))]);

    /* medidas */
    const W=1408, R=80, RING=11, CELDA=262, HEAD=aTitulo?352:250, PIE=96;
    const n=lista.length, cols=n<=4?n:(n<=8?Math.ceil(n/2):5);
    const filas=[]; for(let i=0;i<n;i+=cols) filas.push(lista.slice(i,i+cols));
    const lineasDe=g=>{ const L=[]; if(g.p) L.push({k:"p",t:g.p+(g.p===1?" strike permanente":" strikes permanentes")}); if(g.s) L.push({k:"s",t:g.s+(g.s===1?" strike":" strikes")}); if(g.f) L.push({k:"f",t:g.f+(g.f===1?" falta":" faltas")}); if(g.fuera) L.push({k:"x",t:"fuera del team"}); return L; };
    const altoFila=fila=>2*(R+RING)+18+44+Math.max(...fila.map(x=>lineasDe(x.g).length))*31+30;
    const H=Math.max(801,Math.round(HEAD+filas.reduce((s,f)=>s+altoFila(f),0)+PIE));

    const cv=document.createElement("canvas"); cv.width=W; cv.height=H; const c=cv.getContext("2d");
    const txt=(t,x,y,col,al)=>{ c.fillStyle=col; c.textAlign=al||"center"; c.fillText(t,x,y); };
    const fit=(t,mw,px,fam,wt)=>{ let s=px; c.font=`${wt} ${s}px ${fam}`; while(c.measureText(t).width>mw&&s>14){ s-=1; c.font=`${wt} ${s}px ${fam}`; } };
    const ell=(t,mw)=>{ if(c.measureText(t).width<=mw) return t; while(t.length>1&&c.measureText(t+"…").width>mw) t=t.slice(0,-1); return t+"…"; };
    c.textBaseline="alphabetic";

    /* fondo crema con puntitos */
    c.fillStyle=CREMA; c.fillRect(0,0,W,H);
    c.fillStyle=PUNTO; for(let y=14;y<H+20;y+=29) for(let x=((y/29|0)%2?29:14);x<W+20;x+=29){ c.beginPath(); c.arc(x,y,5.2,0,Math.PI*2); c.fill(); }

    /* adornos de las esquinas (detrás del contenido) */
    if(aSup) c.drawImage(aSup,W-aSup.width,0);
    if(aInf) c.drawImage(aInf,0,H-aInf.height-6);

    /* cabecera: logo, fecha y título */
    if(aLogo) c.drawImage(aLogo,40,14);
    const hoy=new Date(), meses=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    const fecha=`${hoy.getDate()} de ${meses[hoy.getMonth()]}`;
    c.font=`400 74px ${FD}`; c.textAlign="center"; c.lineJoin="round"; c.lineWidth=10; c.strokeStyle=ORO; c.strokeText(fecha,W/2,100); txt(fecha,W/2,100,ROJO);
    const fw=c.measureText(fecha).width; c.beginPath(); c.moveTo(W/2-fw*.1,124); c.quadraticCurveTo(W/2+fw*.22,142,W/2+fw*.5,112); c.lineWidth=7; c.lineCap="round"; c.strokeStyle=ORO; c.stroke(); c.lineWidth=3.5; c.strokeStyle=ROJO; c.stroke();
    if(aTitulo) c.drawImage(aTitulo,W/2-aTitulo.width/2,148);
    else { c.font=`400 96px ${FD}`; txt("Strikes y faltas",W/2,230,ROSA); }

    /* miembros */
    let y=HEAD, k=0;
    filas.forEach(fila=>{
      const rh=altoFila(fila), x0=W/2-fila.length*CELDA/2;
      fila.forEach((x,i)=>{
        const cxm=x0+i*CELDA+CELDA/2, fy=y+RING+R, im=fotos[k++];
        /* marquito blanco con sombra suave */
        c.save(); c.shadowColor="rgba(120,40,70,.28)"; c.shadowBlur=18; c.shadowOffsetY=5; c.beginPath(); c.arc(cxm,fy,R+RING,0,Math.PI*2); c.fillStyle="#fff"; c.fill(); c.restore();
        c.save(); c.beginPath(); c.arc(cxm,fy,R,0,Math.PI*2); c.clip();
        if(im){ const s=Math.min(im.width,im.height); c.drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,cxm-R,fy-R,R*2,R*2); }
        else { c.fillStyle="#f6c3d3"; c.fillRect(cxm-R,fy-R,R*2,R*2); c.font=`400 78px ${FB}`; txt(((x.m.nombre||"?").trim()[0]||"?").toUpperCase(),cxm,fy+26,ROSA); }
        c.restore();
        c.beginPath(); c.arc(cxm,fy,R,0,Math.PI*2); c.lineWidth=1.5; c.strokeStyle="rgba(120,40,70,.18)"; c.stroke();
        /* nombre */
        const nm=String(x.m.nombre||"").replace(/@/g,"").trim(); fit(nm,CELDA-26,31,FB,"400"); txt(ell(nm,CELDA-26),cxm,fy+R+RING+40,ROSA);
        /* conteo escrito a mano, con su iconito */
        let ly=fy+R+RING+40+31;
        lineasDe(x.g).forEach(l=>{
          c.font=`400 22px ${FB}`; const col=l.k==="x"?ROJO:TINTA; const tw=c.measureText(l.t).width, ic=l.k==="x"?0:30, ini=cxm-(tw+ic)/2;
          if(l.k==="f") hoja(c,ini+11,ly-7,10); else if(l.k==="s") durazno(c,ini+13,ly-7,10,DURAZNO); else if(l.k==="p") durazno(c,ini+13,ly-7,10,DURAZNO_P);
          c.font=l.k==="x"?`400 24px ${FD}`:`400 22px ${FB}`; txt(l.t,ini+ic,ly,col,"left"); ly+=31;
        });
      });
      y+=rh;
    });

    /* pie */
    c.font=`400 19px ${FB}`; txt("3 strikes (contando los permanentes) = fuera del team",W/2,H-34,"rgba(61,34,48,.6)");

    const dia=`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;
    if(typeof anuEntregarPng_==="function") await anuEntregarPng_(cv,`faltas-${dia}.png`,"Strikes y faltas");
    else { const a=document.createElement("a"); a.href=cv.toDataURL("image/png"); a.download=`faltas-${dia}.png`; a.click(); }
  }
})();
