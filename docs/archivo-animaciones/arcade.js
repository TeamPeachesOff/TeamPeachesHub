/* ---- 4 · Arcade 8 bits: «Selecciona tu luchador» ---- */
async function intro3(st,run){
  st.innerHTML=`${rvRtag()}<div class="ar-intro"><div class="ar-title">PEACHES<br>FIGHTERS</div><div class="ar-ins" id="arIns">INSERT COIN</div><div class="ar-coin" id="arCoin">🪙</div></div>`;
  SFX.thump();await run.wait(950);
  rvQ(st,"#arCoin").classList.add("drop");SFX.tick();await run.wait(700);
  rvQ(st,"#arIns").innerHTML="CREDIT 01<br>PRESS START ▶";SFX.chime();await run.wait(250);
}
const arSide=(p,c,t)=>rvSide(p,c,`<div class="ar-tag">${t}</div><div class="rv-av">${avatar(p)}</div><div class="rv-nm">${esc(p.n)}${rvRec(p)}</div>`);
async function arSweep(run,T,real,target,cls,skip){
  const pool=real.filter(i=>i!==skip&&i!==target),hops=8;let prev=-1;
  for(let k=0;k<=hops;k++){
    let i=target;
    if(k<hops&&pool.length){do{i=pool[Math.random()*pool.length|0]}while(i===prev&&pool.length>1)}
    if(prev>=0)T[prev].classList.remove(cls);
    T[i].classList.add(cls);prev=i;SFX.tick();
    await run.wait(50+k*k*3);
  }
  T[target].classList.add("locked");SFX.chime();await run.wait(450);
}
async function arPix(run,st,sel){      // el retrato «carga» en píxeles gordos y se aclara
  const av=rvQ(st,sel+" .rv-av"),im=av&&av.querySelector("img");
  if(!im||!im.complete||!im.naturalWidth||rvReduced())return;
  const W=av.clientWidth||120,cv=document.createElement("canvas"),t=document.createElement("canvas");
  cv.width=cv.height=W;cv.className="ar-px";av.appendChild(cv);
  try{
    for(const z of [5,9,14,24,40]){
      let ok=true;
      try{const w=im.naturalWidth,h=im.naturalHeight,m=Math.min(w,h),g=cv.getContext("2d");
        t.width=t.height=z;t.getContext("2d").drawImage(im,(w-m)/2,(h-m)/2,m,m,0,0,z,z);
        g.imageSmoothingEnabled=false;g.clearRect(0,0,W,W);g.drawImage(t,0,0,z,z,0,0,W,W)}catch(_){ok=false}
      if(!ok)break;
      await run.wait(110);
    }
  }finally{cv.remove()}
}
async function duel3(st,run,[a,b]){
  const cols=rvSmall()?4:6,n=cols*3;
  const others=shuf(rvPl.filter(p=>p.id!==a.id&&p.id!==b.id)).slice(0,n-2);
  const items=shuf([{p:a},{p:b},...others.map(p=>({p})),...Array(Math.max(0,n-2-others.length)).fill({})]);
  const real=[],ia=items.findIndex(x=>x.p===a),ib=items.findIndex(x=>x.p===b);
  items.forEach((x,i)=>{if(x.p)real.push(i)});
  st.innerHTML=`<div class="ar-scr" id="arScr"><div class="ar-sel">SELECT YOUR FIGHTER</div><div class="ar-grid" style="--cols:${cols};--k:${cols==4?1.33:2}">${items.map(x=>x.p?`<i class="ar-t">${avatar(x.p)}</i>`:`<i class="ar-t q"></i>`).join("")}</div></div><div class="rv-duel">${arSide(a,"rv-a","P1")}<div class="rv-vs">VS</div>${arSide(b,"rv-b","P2")}</div><div class="rv-cap">¡FIGHT!</div>`;
  const T=[...st.querySelectorAll(".ar-t")];
  SFX.whoosh();await run.wait(500);
  await arSweep(run,T,real,ia,"hl1",-1);
  await arSweep(run,T,real,ib,"hl2",ia);
  await run.wait(300);
  const sc=rvQ(st,"#arScr");sc.classList.add("out");await run.wait(380);sc.style.visibility="hidden";
  SFX.whoosh();rvQ(st,".rv-a").classList.add("in");rvQ(st,".rv-b").classList.add("in","d2");
  await run.wait(500);
  const r=await Promise.all([arPix(run,st,".rv-a"),arPix(run,st,".rv-b")].map(x=>x.then(()=>0,e=>e)));
  const er=r.find(Boolean);if(er)throw er;
  rvImpact(st,["#ffd23f","#ff3d9a","#35c8ff"],rvSmall()?6:10);rvQ(st,".rv-vs").classList.add("in");
  await run.wait(500);rvCap(st);
}

