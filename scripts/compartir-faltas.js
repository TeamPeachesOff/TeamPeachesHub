/* Compartir Faltas: crea una imagen PNG (1080 px de ancho) con la foto de cada miembro que tenga faltas o strikes
 * y cuántos tiene de cada tipo. Fondo propio (ciruela oscuro con luces de color), distinto al del Anuario.
 * Reutiliza de anuario.js: anuLoadImg_ (carga de fotos con respaldo CORS), anuEntregarPng_ (compartir/descargar) y anuFonts_. */
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
  const rr=(c,x,y,w,h,r)=>{ c.beginPath(); if(c.roundRect) c.roundRect(x,y,w,h,r); else { c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); } };

  /* paleta de gravedad */
  const C_FALTA="#ffd23f", C_STRIKE="#ff8a3d", C_STRIKE2="#ff4d5e", C_PERM="#c2183a";
  function gravedad(m){
    const f=num(m.faltas), s=num(m.strikes), p=num(m.strikesPermanentes);
    const fuera=(s+p)>=3;
    const color = fuera||p>0||s>=2 ? C_STRIKE2 : s===1 ? C_STRIKE : C_FALTA;
    return {f,s,p,fuera,color,score:p*1000+s*100+f};
  }

  async function crear(){
    const lista=(DB.miembros||[]).filter(m=>m.nombre).map(m=>({m,g:gravedad(m)})).filter(x=>x.g.f||x.g.s||x.g.p)
      .sort((a,b)=>b.g.score-a.g.score||(a.m.nombre||"").localeCompare(b.m.nombre||""));
    if(!lista.length){ toast("Nadie tiene faltas ni strikes 🎉"); return; }
    toast("Creando tu imagen… 🎨");
    try{ if(typeof anuFonts_==="function") await Promise.race([anuFonts_(),new Promise(r=>setTimeout(r,2500))]); }catch(_){}
    const FD='"Caveat Brush","Segoe Script","Brush Script MT",cursive', FB=(getComputedStyle(document.body).fontFamily||"system-ui")+',system-ui,sans-serif';
    const logoUrl=(typeof ANU_LOGO!=="undefined")?ANU_LOGO:null;
    const [logo,...fotos]=await Promise.all([cargar(logoUrl),...lista.map(x=>cargar(x.m.avatarUrl))]);

    /* medidas */
    const W=1080, COLS=4, PAD=44, GAP=18, CW=(W-2*PAD-(COLS-1)*GAP)/COLS, HEAD=360, FOOT=210;
    const pillsDe=g=>[g.p&&{t:g.p+(g.p===1?" permanente":" permanentes"),bg:C_PERM,fg:"#fff"},g.s&&{t:g.s+(g.s===1?" strike":" strikes"),bg:C_STRIKE2,fg:"#fff"},g.f&&{t:g.f+(g.f===1?" falta":" faltas"),bg:C_FALTA,fg:"#2a1638"}].filter(Boolean);
    const filas=[]; for(let i=0;i<lista.length;i+=COLS) filas.push(lista.slice(i,i+COLS));
    const altoFila=fila=>214+Math.max(...fila.map(x=>pillsDe(x.g).length))*42+14;
    const H=HEAD+filas.reduce((s,f)=>s+altoFila(f)+GAP,0)+FOOT;

    const cv=document.createElement("canvas"); cv.width=W; cv.height=H; const c=cv.getContext("2d");
    const txt=(t,x,y,col,al)=>{ c.fillStyle=col; c.textAlign=al||"center"; c.fillText(t,x,y); };
    const fit=(t,mw,px,fam,wt)=>{ let s=px; c.font=`${wt} ${s}px ${fam}`; while(c.measureText(t).width>mw&&s>13){ s-=1; c.font=`${wt} ${s}px ${fam}`; } };
    const ell=(t,mw)=>{ if(c.measureText(t).width<=mw) return t; while(t.length>1&&c.measureText(t+"…").width>mw) t=t.slice(0,-1); return t+"…"; };

    /* fondo: ciruela con luces de color */
    let g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,"#1c1024"); g.addColorStop(1,"#2b1740"); c.fillStyle=g; c.fillRect(0,0,W,H);
    const luz=(x,y,r,col)=>{ const rg=c.createRadialGradient(x,y,0,x,y,r); rg.addColorStop(0,col); rg.addColorStop(1,"rgba(0,0,0,0)"); c.fillStyle=rg; c.fillRect(x-r,y-r,r*2,r*2); };
    luz(120,160,520,"rgba(239,8,112,.28)"); luz(W-60,420,520,"rgba(255,138,61,.18)"); luz(200,H*.55,560,"rgba(122,215,255,.10)"); luz(W-120,H-120,560,"rgba(194,24,58,.22)");

    /* cabecera */
    c.textBaseline="alphabetic";
    if(logo){ const lh=104, lw=lh*logo.width/logo.height; c.drawImage(logo,W/2-lw/2,38,lw,lh); }
    c.font=`400 112px ${FD}`; txt("Faltas y Strikes",W/2,logo?262:200,"#fff");
    const hoy=new Date(), meses=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    c.font=`700 28px ${FB}`; txt(`${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`,W/2,logo?306:250,"rgba(255,255,255,.62)");
    /* resumen */
    const nStr=lista.filter(x=>x.g.s||x.g.p).length, nFal=lista.length-nStr, nFuera=lista.filter(x=>x.g.fuera).length;
    const chips=[[`${lista.length} ${lista.length===1?"persona":"personas"}`,"rgba(255,255,255,.14)","#fff"],[`${nStr} con strikes`,C_STRIKE2,"#fff"],[`${nFal} solo faltas`,C_FALTA,"#2a1638"]];
    if(nFuera) chips.push([`${nFuera} fuera`,C_PERM,"#fff"]);
    c.font=`800 24px ${FB}`; const cw=chips.map(ch=>c.measureText(ch[0]).width+40), tot=cw.reduce((a,b)=>a+b,0)+(chips.length-1)*12; let cx=W/2-tot/2; const cy=logo?326:268;
    chips.forEach((ch,i)=>{ rr(c,cx,cy,cw[i],42,21); c.fillStyle=ch[1]; c.fill(); c.font=`800 24px ${FB}`; txt(ch[0],cx+cw[i]/2,cy+29,ch[2]); cx+=cw[i]+12; });

    /* tarjetas */
    let y=HEAD+(logo?10:0), k=0;
    filas.forEach(fila=>{
      const rh=altoFila(fila);
      fila.forEach((x,i)=>{
        const px=PAD+i*(CW+GAP), cxm=px+CW/2, ring=x.g.color;
        rr(c,px,y,CW,rh,26); c.fillStyle="rgba(255,255,255,.07)"; c.fill();
        c.lineWidth=x.g.fuera?3.5:2; c.strokeStyle=x.g.fuera?C_PERM:"rgba(255,255,255,.12)"; c.stroke();
        /* foto */
        const R=60, fy=y+26+R, im=fotos[k++];
        c.save(); c.shadowColor=ring; c.shadowBlur=24; c.beginPath(); c.arc(cxm,fy,R+6,0,Math.PI*2); c.fillStyle=ring; c.fill(); c.restore();
        c.save(); c.beginPath(); c.arc(cxm,fy,R,0,Math.PI*2); c.clip();
        if(im){ const s=Math.min(im.width,im.height); c.drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,cxm-R,fy-R,R*2,R*2); }
        else { c.fillStyle="#3b2452"; c.fillRect(cxm-R,fy-R,R*2,R*2); c.font=`800 64px ${FB}`; txt(((x.m.nombre||"?").trim()[0]||"?").toUpperCase(),cxm,fy+22,"#fff"); }
        c.restore();
        if(x.g.fuera){ c.font=`900 17px ${FB}`; const tw=c.measureText("FUERA").width+20; rr(c,px+CW-tw-10,y+10,tw,26,13); c.fillStyle=C_PERM; c.fill(); txt("FUERA",px+CW-tw/2-10,y+29,"#fff"); }
        /* nombre */
        const nm=String(x.m.nombre||"").replace(/@/g,"").trim(); fit(nm,CW-24,27,FB,"800"); txt(ell(nm,CW-24),cxm,fy+R+44,"#fff");
        /* contadores */
        let py=y+208; pillsDe(x.g).forEach(p=>{ const pw=CW-44; rr(c,px+22,py,pw,34,17); c.fillStyle=p.bg; c.fill(); fit(p.t,pw-16,22,FB,"900"); txt(p.t,cxm,py+24,p.fg); py+=42; });
      });
      y+=rh+GAP;
    });

    /* pie: leyenda */
    const ly=H-FOOT+34;
    c.font=`800 22px ${FB}`;
    const leyenda=[["Falta",C_FALTA],["Strike",C_STRIKE2],["Strike permanente",C_PERM]];
    const lw=leyenda.map(l=>c.measureText(l[0]).width+34), lt=lw.reduce((a,b)=>a+b,0)+(leyenda.length-1)*26; let lx=W/2-lt/2;
    leyenda.forEach((l,i)=>{ c.beginPath(); c.arc(lx+9,ly-7,9,0,Math.PI*2); c.fillStyle=l[1]; c.fill(); c.font=`800 22px ${FB}`; txt(l[0],lx+26,ly,"rgba(255,255,255,.8)","left"); lx+=lw[i]+26; });
    c.font=`600 20px ${FB}`; txt("3 strikes (contando los permanentes) = fuera del team",W/2,ly+38,"rgba(255,255,255,.5)");
    c.font=`400 56px ${FD}`; txt("Team Peaches",W/2,H-52,"rgba(255,255,255,.9)");

    const dia=`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;
    if(typeof anuEntregarPng_==="function") await anuEntregarPng_(cv,`faltas-${dia}.png`,"Faltas y Strikes");
    else { const a=document.createElement("a"); a.href=cv.toDataURL("image/png"); a.download=`faltas-${dia}.png`; a.click(); }
  }
})();
