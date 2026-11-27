/* «La Baraja» — archivado en v4.33 (salió de modulos/competencia/competencia.html).
   Cómo reactivarlo: ver LEEME.md.
   Usa también las funciones que siguen en el módulo: BJ_IMG, bjCard, bjFrame, bjBurst, rvImpact, rvSmoke, SFX. */
const bjDeckHTML=spec=>spec.map((k,i)=>`<div class="bj-dc" style="transform:translate(0px,${-i*1.2}px);z-index:${i}"><img src="${BJ_IMG[k]}" alt="" draggable="false"></div>`).join("");
const bjTf=(x,y,r)=>`translate(${x}px,${y}px) rotate(${r}deg)`;

/* Intro: el mazo (mitad azul, mitad rosa) se parte en dos y se intercala dos veces, como una barajada de verdad. */
async function intro0(st,run){
  st.innerHTML=`${rvRtag()}<div class="bj-deck" id="bjD">${bjDeckHTML([...Array(8).fill("b"),...Array(8).fill("a")])}</div><div class="rv-cap">Barajando…</div>`;
  const dk=rvQ(st,"#bjD"),W=dk.offsetWidth,H=dk.offsetHeight;
  let els=[...dk.children];
  rvCap(st);
  dk.animate([{opacity:0,transform:"scale(.8) translateY(30px)"},{opacity:1,transform:"none"}],{duration:300,easing:"cubic-bezier(.2,.9,.3,1.2)"});
  SFX.flick();await run.wait(380);
  for(const step of [52,40]){
    const n=els.length,h=n/2,L=els.slice(0,h),R=els.slice(h);
    SFX.flick();
    els.forEach((el,i)=>{const left=i<h,j=left?i:i-h,x=(left?-1:1)*W*.6,r=left?-9:9,to=bjTf(x,-j*1.2,r);
      el.animate([{transform:el.style.transform},{transform:to}],{duration:300,easing:"cubic-bezier(.3,.8,.3,1)",fill:"forwards"});el._s=to;el._x=x;el._r=r});
    await run.wait(330);
    els.forEach(el=>{el.getAnimations().forEach(a=>a.cancel());el.style.transform=el._s});
    const order=[];for(let j=0;j<h;j++){order.push(L[j]);order.push(R[j])}
    SFX.riffle((n-1)*step/1000+.28,n);
    order.forEach((el,o)=>{const fin=bjTf(0,-o*1.2,0);el.style.zIndex=o;
      el.animate([{transform:el._s},{transform:bjTf(el._x*.4,-H*.32,el._r*.4),offset:.5},{transform:fin}],{duration:280,delay:o*step,easing:"ease-in-out",fill:"both"});el._s=fin});
    await run.wait((n-1)*step+300);
    order.forEach(el=>{el.getAnimations().forEach(a=>a.cancel());el.style.transform=el._s});
    els=order;await run.wait(70);
  }
  dk.animate([{transform:"scale(1)"},{transform:"scale(1.06)"},{transform:"scale(1)"}],{duration:260});
  SFX.thump();rvQ(st,".rv-cap").textContent="¡Las cartas están echadas!";
  await run.wait(380);
}
/* Voltear una carta: sube y tiembla (tensión) → gira → destello. La otra se oscurece mientras tanto. */
async function bjFlip(st,run,pos){
  const slot=pos.querySelector(".bj-slot"),fi=pos.querySelector(".bj-fi"),other=[...st.querySelectorAll(".bj-pos")].find(x=>x!==pos),os=other&&other.querySelector(".bj-slot");
  pos.classList.add("focus","trem");slot.classList.add("lift");
  const dimmed=os&&!other.querySelector(".bj-fi.flip");if(dimmed)os.classList.add("dim");
  SFX.riser(.45);await run.wait(460);
  pos.classList.remove("trem");fi.classList.add("flip");SFX.snap();
  await run.wait(380);
  slot.classList.remove("lift");slot.classList.add("up");
  SFX.chime();bjBurst(pos);if(dimmed)os.classList.remove("dim");
  await run.wait(420);
}
/* Duelo: sale el mazo, se reparten dos cartas boca abajo → toque: se voltea la primera → toque: la segunda → choque + VS. */
async function duel0(st,run,[a,b],i){
  st.innerHTML=`<div class="rv-duel bj"><div class="bj-deck">${bjDeckHTML(Array.from({length:16},(_,k)=>k%2?"a":"b"))}</div>${bjCard(a,"a")}${bjCard(b,"b")}<div class="bj-vsw"><div class="rv-vs">VS</div></div></div>`;
  const duel=rvQ(st,".rv-duel"),dk=rvQ(st,".bj-deck"),pa=rvQ(st,".bj-a"),pb=rvQ(st,".bj-b");
  const ctr=el=>{const r=el.getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2]};
  const [cx,cy]=ctr(dk);
  const deal=(el,rot)=>{const [x,y]=ctr(el),dx=cx-x,dy=cy-y;
    el.animate([{transform:`translate(${dx}px,${dy}px) rotate(0deg)`},{transform:`translate(${dx*.4}px,${dy*.4-34}px) rotate(${rot}deg)`,offset:.45},{transform:"translate(0px,0px) rotate(0deg)"}],{duration:580,easing:"cubic-bezier(.22,.8,.3,1)",fill:"backwards"})};
  if(i)dk.animate([{opacity:0,transform:"scale(.85)"},{opacity:1,transform:"none"}],{duration:200,fill:"backwards"});
  SFX.flick();await run.wait(i?240:120);
  SFX.deal();deal(pa,-14);await run.wait(170);
  SFX.deal();deal(pb,12);await run.wait(580);
  SFX.thump();dk.animate([{opacity:1},{opacity:0}],{duration:300,fill:"forwards"});
  duel.classList.add("idle");
  await run.hold("Toca para voltear la primera carta");
  await bjFlip(st,run,pa);
  await run.hold("Toca para voltear la segunda");
  await bjFlip(st,run,pb);
  duel.classList.add("clash");await run.wait(260);
  rvImpact(st,["#ff6fae","#6aa0ff","#fff"]);rvSmoke(st,2);rvQ(st,".rv-vs").classList.add("in");
  await run.wait(520);
}
