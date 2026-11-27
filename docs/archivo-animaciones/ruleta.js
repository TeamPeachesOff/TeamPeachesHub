/* «Ruleta» — archivado en v4.33 (salió de modulos/competencia/competencia.html).
   Cómo reactivarlo: ver LEEME.md.
   Usa BJ_IMG, bjCard, bjBurst, fnFly, fnFlip (del Abanico), rvImpact, rvSmoke, SFX, rvRtag, rvCap. */
/* ---- Cartas · Propuesta 4 «Ruleta»: un carrusel de cartas gira, frena con «tic», se pasa un poco y vuelve a caer en el elegido ---- */
const rlEase={out:t=>1-Math.pow(1-t,3.4),io:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,q:t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2};
function rlBuild(fan,bw){
  const N=12,fw=bw*.42,fh=fw*1.425,Rx=bw*.5,Ry=fh*.3,cards=[];
  for(let i=0;i<N;i++){const k=i%2?"b":"a",el=document.createElement("div");
    el.className="fn-c";el.dataset.k=k;
    el.style.cssText=`width:${fw}px;height:${fh}px;left:${-fw/2}px;top:${-fh/2}px`;
    el.innerHTML=`<div class="fn-i"><img src="${BJ_IMG[k]}" alt="" draggable="false"><i class="rl-sh"></i></div>`;
    el._sh=el.querySelector(".rl-sh");fan.appendChild(el);cards.push(el)}
  const ptr=document.createElement("i");ptr.className="rl-ptr";ptr.style.top=(Ry+fh*.5+8)+"px";fan.appendChild(ptr);
  const g={cards,N,fw,fh,Rx,Ry,bw,step:360/N,ang:0,ptr,th:Array(N).fill(0)};
  rlPlace(g,0);return g;
}
function rlPlace(g,ang){
  for(let i=0;i<g.N;i++){const f=(ang+i*g.step)*Math.PI/180,z=Math.cos(f),u=(z+1)/2,sc=.6+.4*u,el=g.cards[i];
    el.style.transform=`translate(${g.Rx*Math.sin(f)}px,${g.Ry*z}px) scale(${sc})`;
    el.style.zIndex=Math.round(u*100);el._sh.style.opacity=((1-u)*.6).toFixed(2)}
}
/* Anima el ángulo del carrusel; suena un «tic» cada vez que una carta pasa por el puntero. */
const rlAnim=(run,g,a0,a1,dur,ease,tick)=>new Promise(res=>{
  const t0=performance.now();let last=Math.round(-a0/g.step),lt=0;
  const f=now=>{
    if(run.dead)return res();
    let t=Math.min(1,(now-t0)/dur);if(run.fast)t=1;
    const a=a0+(a1-a0)*ease(t);g.ang=a;rlPlace(g,a);
    const q=-a/g.step,k=Math.round(q);
    if(tick&&k!==last){last=k;if(now-lt>45){lt=now;SFX.tick()}}
    g.ptr.style.transform=`rotate(${(-26*(1-(((q%1)+1)%1))).toFixed(1)}deg)`;
    if(t<1)requestAnimationFrame(f);else{g.ptr.style.transform="";res()}
  };
  requestAnimationFrame(f);
});
async function intro3(st,run){
  st.innerHTML=`${rvRtag()}<div class="rv-duel bj fn rl"><div class="bj-deck fn-m" style="position:absolute;visibility:hidden"></div><div class="fn-fan"></div></div><div class="rv-cap">La ruleta del destino…</div>`;
  const fan=rvQ(st,".fn-fan"),g=rlBuild(fan,rvQ(st,".fn-m").offsetWidth);
  rvCap(st);
  fan.animate([{opacity:0,transform:"scale(.3)"},{opacity:1,transform:"scale(1.25)"}],{duration:500,easing:"cubic-bezier(.2,.9,.3,1.2)",fill:"forwards"});
  SFX.whoosh();await run.wait(380);
  SFX.riser(1.5);
  await rlAnim(run,g,0,-360*3.3,1700,rlEase.io,true);
  const a=g.ang;
  SFX.thump();await rlAnim(run,g,a,a-g.step*.4,160,rlEase.q,false);
  await rlAnim(run,g,g.ang,Math.round(g.ang/g.step)*g.step,240,rlEase.q,false);
  await run.wait(200);
}
/* Gira y se detiene en la carta elegida: pasa de largo un poco y vuelve (tensión). */
async function rlSpin(run,g,t,kind){
  const rgb=kind=="a"?"255,111,174":"106,160,255",fb=-t*g.step,need=g.ang-360*(1.6+Math.random()*.7),final=fb+360*Math.floor((need-fb)/360);
  SFX.whoosh();
  await rlAnim(run,g,g.ang,final-g.step*.42,1650,rlEase.out,true);
  await run.wait(90);
  await rlAnim(run,g,g.ang,final,340,rlEase.q,true);
  const c=g.cards[t];c.style.setProperty("--hc",rgb);c.classList.add("hl");SFX.pick(1);
  await run.wait(300);
}
async function rlPick(st,run,g,pos,kind){
  const par=kind=="a"?0:1,libres=g.cards.map((c,i)=>i).filter(i=>i%2==par&&g.cards[i].style.visibility!="hidden"),
    t=libres[Math.floor(Math.random()*libres.length)];
  await rlSpin(run,g,t,kind);
  g.cards[t].classList.remove("hl");
  SFX.whoosh();fnFly(g,t,pos);await run.wait(640);
  SFX.deal();await fnFlip(st,run,pos);
}
async function duel3(st,run,[a,b],i){
  st.innerHTML=`<div class="rv-duel bj fn rl"><div class="fn-fan"></div>${bjCard(a,"a")}${bjCard(b,"b")}<div class="bj-vsw"><div class="rv-vs">VS</div></div></div>`;
  const duel=rvQ(st,".rv-duel"),fan=rvQ(st,".fn-fan"),pa=rvQ(st,".bj-a"),pb=rvQ(st,".bj-b");
  pa.style.opacity="0";pb.style.opacity="0";
  const g=rlBuild(fan,pa.offsetWidth);
  fan.animate([{opacity:0,transform:"scale(.4)"},{opacity:1,transform:"none"}],{duration:i?320:260,easing:"cubic-bezier(.2,.9,.3,1.2)",fill:"backwards"});
  SFX.flick();await run.wait(i?340:200);
  duel.classList.add("idle");
  await rlPick(st,run,g,pa,"a");
  await run.hold("Toca para girar por el rival");
  await rlPick(st,run,g,pb,"b");
  fan.style.transition="opacity .25s";fan.style.opacity="0";
  duel.classList.add("clash");await run.wait(260);
  rvImpact(st,["#ff6fae","#6aa0ff","#fff"]);rvSmoke(st,2);rvQ(st,".rv-vs").classList.add("in");
  await run.wait(520);
}
