/* ---- 1 · Duelo de Titanes ---- */
async function intro0(st,run){
  st.innerHTML=`${rvRtag()}<div class="rv-pulse"></div><div class="rv-title">¡LOS TITANES<br>SE ENFRENTAN!</div>`;
  SFX.thump();await run.wait(520);SFX.thump();await run.wait(520);SFX.impact();
}
async function duel0(st,run,[a,b]){
  st.innerHTML=`<div class="rv-pulse"></div><div class="rv-bolts"><i class="rv-bolt a"></i><i class="rv-bolt b"></i></div><div class="rv-duel">${rvSide(a,"rv-a")}<div class="rv-vs">VS</div>${rvSide(b,"rv-b")}</div><div class="rv-cap">Una sola canción… un solo ganador</div>`;
  SFX.whoosh();await run.wait(260);
  rvQ(st,".rv-a").classList.add("in");rvQ(st,".rv-b").classList.add("in","d2");
  await run.wait(640);
  rvImpact(st,["#ff2d95","#2d8bff","#fff"]);rvQ(st,".rv-vs").classList.add("in");
  await run.wait(420);rvCap(st);
}

