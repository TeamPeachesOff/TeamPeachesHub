/* «Lluvia de cartas» — archivado en v4.33 (salió de modulos/competencia/competencia.html).
   Cómo reactivarlo: ver LEEME.md.
   Usa BJ_IMG, bjCard, bjBurst, rvImpact, rvSmoke, SFX, rvRtag, rvCap. */
/* ---- Cartas · Propuesta 3 «Lluvia de cartas»: llueven cartas, se apilan sobre cada rival y la pila se destapa con tensión ---- */
async function intro2(st,run){
  st.innerHTML=`${rvRtag()}<div class="bj-deck" style="position:absolute;visibility:hidden"></div><div class="ll-rain"></div><div class="rv-cap">Llueven cartas…</div>`;
  const W0=rvQ(st,".bj-deck").offsetWidth,rain=rvQ(st,".ll-rain"),sw=st.clientWidth,sh=st.clientHeight,N=rvSmall()?24:34;
  rvCap(st);SFX.riffle(1.3,N);
  for(let i=0;i<N;i++){
    const sc=.3+Math.random()*.34,w=W0*sc,h=w/.7018,k=Math.random()<.5?"a":"b",el=document.createElement("img");
    el.className="ll-rc";el.src=BJ_IMG[k];el.draggable=false;
    el.style.cssText=`width:${w}px;height:${h}px;left:${Math.random()*(sw-w)}px;opacity:${(.5+.5*(sc-.3)/.34).toFixed(2)};z-index:${Math.round(sc*10)}`;
    const r0=(Math.random()-.5)*60,r1=r0+(Math.random()<.5?-1:1)*(120+Math.random()*240),dx=(Math.random()-.5)*w*1.2;
    el.animate([{transform:`translate(0px,${-h*1.4}px) rotate(${r0}deg)`},{transform:`translate(${dx}px,${sh+h*1.5}px) rotate(${r1}deg)`}],
      {duration:850+Math.random()*650,delay:i*36+Math.random()*60,easing:"cubic-bezier(.45,0,.9,.6)",fill:"both"});
    rain.appendChild(el);
  }
  await run.wait(N*36+900);
  rvQ(st,".rv-cap").textContent="Bajo cada pila se esconde un rival…";
  SFX.thump();await run.wait(420);
}

/* Una pila de cartas cae sobre la carta de un jugador. La carta real queda oculta debajo. */
function llPile(pos,n,own){
  const fl=pos.querySelector(".bj-flt"),pile=document.createElement("div"),W=pos.offsetWidth,H=pos.offsetHeight,out=[];
  pile.className="ll-pile";fl.appendChild(pile);
  for(let j=0;j<n;j++){
    const top=j==n-1,x=(Math.random()-.5)*W*(top?.03:.16),y=(Math.random()-.5)*H*(top?.03:.1),r=(Math.random()-.5)*(top?6:20),
      el=document.createElement("img");
    el.className="ll-pc";el.src=BJ_IMG[top?own:(Math.random()<.5?"a":"b")];el.draggable=false;
    const f=`translate(${x}px,${y}px) rotate(${r}deg)`;el.style.transform=f;el._f={x,y,r};
    pile.appendChild(el);out.push({el,x,y,r,f});
  }
  return{pile,cards:out,W,H};
}
/* Cae una carta de la pila: viene de arriba girando, aterriza y rebota un poco. */
function llDrop(c,pos,W,H){
  const top=Math.max(pos.getBoundingClientRect().top,0),sg=Math.random()<.5?-1:1,
    sx=c.x+(Math.random()-.5)*W*1.3,sy=c.y-(top+H*(1.3+Math.random()*.7)),sr=c.r+sg*(110+Math.random()*220),d=520+Math.random()*180;
  c.el.animate([{transform:`translate(${sx}px,${sy}px) rotate(${sr}deg)`,easing:"cubic-bezier(.5,0,.9,.55)"},
    {transform:`translate(${c.x}px,${c.y}px) rotate(${c.r}deg)`,offset:.84,easing:"ease-out"},
    {transform:`translate(${c.x}px,${c.y-H*.028}px) rotate(${c.r}deg)`,offset:.92,easing:"ease-in"},
    {transform:c.f}],{duration:d,fill:"backwards"});
  return d;
}
/* Sale una carta de la pila: salta hacia un lado y se desvanece. */
function llPeel(c,W,H,slow){
  const sg=Math.random()<.5?-1:1,
    to=`translate(${c.x+sg*W*(slow?.12:.9+Math.random()*.9)}px,${c.y-H*(slow?.75:.15+Math.random()*.6)}px) rotate(${c.r+sg*(slow?16:90+Math.random()*150)}deg)`;
  const an=c.el.animate([{transform:c.f,opacity:1},{transform:to,opacity:0}],{duration:slow?640:420,easing:"cubic-bezier(.25,.6,.4,1)",fill:"forwards"});
  an.onfinish=()=>c.el.remove();
}
/* Destapar: la pila tiembla (tensión) → salen las cartas una tras otra → pausa → sale la última → la carta sube y se voltea. */
async function llReveal(st,run,pos,pl){
  const slot=pos.querySelector(".bj-slot"),fi=pos.querySelector(".bj-fi"),other=[...st.querySelectorAll(".bj-pos")].find(x=>x!==pos),os=other&&other.querySelector(".bj-slot"),
    cs=pl.cards.slice().reverse(),n=cs.length;
  pos.classList.add("focus","trem");
  const dimmed=os&&!other.querySelector(".bj-fi.flip");if(dimmed)os.classList.add("dim");
  SFX.riser(.5);SFX.roll(.5);await run.wait(520);
  pos.classList.remove("trem");
  for(let q=0;q<n-1;q++){llPeel(cs[q],pl.W,pl.H,false);SFX.flick();await run.wait(46)}
  await run.wait(170);
  SFX.thump();await run.wait(300);            // la última carta se hace esperar
  llPeel(cs[n-1],pl.W,pl.H,true);SFX.whoosh();slot.classList.add("lift");
  await run.wait(250);
  fi.classList.add("flip");SFX.snap();await run.wait(380);
  slot.classList.remove("lift");slot.classList.add("up");
  SFX.chime();bjBurst(pos);if(dimmed)os.classList.remove("dim");
  await run.wait(380);
}
async function duel2(st,run,[a,b],i){
  st.innerHTML=`<div class="rv-duel bj ll">${bjCard(a,"a")}${bjCard(b,"b")}<div class="bj-vsw"><div class="rv-vs">VS</div></div></div>`;
  const duel=rvQ(st,".rv-duel"),pa=rvQ(st,".bj-a"),pb=rvQ(st,".bj-b"),n=rvSmall()?5:6;
  const sa=pa.querySelector(".bj-slot"),sb=pb.querySelector(".bj-slot");sa.style.opacity="0";sb.style.opacity="0";
  const A=llPile(pa,n,"a"),B=llPile(pb,n,"b");
  setTimeout(()=>{sa.style.opacity="1";sb.style.opacity="1"},620);      // la carta real aparece cuando ya cayó la primera capa
  SFX.flick();await run.wait(i?160:60);
  /* llueve: las dos pilas se llenan al mismo tiempo, carta por carta */
  let last=0;
  for(let j=0;j<n;j++){
    for(const [P,pos] of [[A,pa],[B,pb]]){
      const d=llDrop(P.cards[j],pos,P.W,P.H);last=d;SFX.flick();
      if(j%2==0)setTimeout(()=>{if(!run.dead)SFX.land()},d*.86);
      await run.wait(52);
    }
  }
  await run.wait(last*.9);
  SFX.thump();duel.classList.add("idle");
  [A,B].forEach(P=>P.pile.animate([{transform:"scale(1)"},{transform:"scale(1.035)"},{transform:"scale(1)"}],{duration:260}));
  await run.hold("Toca para destapar la primera carta");
  await llReveal(st,run,pa,A);
  await run.hold("Toca para destapar la segunda");
  await llReveal(st,run,pb,B);
  duel.classList.add("clash");await run.wait(260);
  rvImpact(st,["#ff6fae","#6aa0ff","#fff"]);rvSmoke(st,2);rvQ(st,".rv-vs").classList.add("in");
  await run.wait(520);
}
