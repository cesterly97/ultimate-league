const socket = io();
const $ = id => document.getElementById(id);
let roomState = null, myRoom = null, latestWallet = {credits:1000};
function toast(msg){const t=$("toast");t.textContent=msg;t.style.display="block";clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.style.display="none",3000)}
function name(){return $("name").value.trim()||"Lucky Player"}
function show(which){["entry","team","soloPanel"].forEach(id=>$(id).classList.toggle("hidden",id!==which))}
function fmt(n){return Number(n||0).toLocaleString()}
socket.on("connect",()=>{});
socket.on("wallet:update",w=>{latestWallet=w;$("credits").textContent=fmt(w.credits);if(roomState)renderRoom(roomState)});
socket.on("game:error",toast);
socket.on("room:joined",({code})=>{myRoom=code;$("codeLabel").textContent=code;show("team");});
socket.on("room:update",r=>{roomState=r;myRoom=r.code;renderRoom(r)});
function renderRoom(r){
 $("codeLabel").textContent=r.code;
 $("players").innerHTML=r.players.map(p=>`<div class="player"><strong>${esc(p.name)}${p.id===r.hostId?'<span class="hosttag">HOST</span>':''}</strong><small>${fmt(p.credits)} credits · contributes ${p.contribution}</small><small>Payout share: ${p.sharePct}%</small></div>`).join("");
 const host=socket.id===r.hostId;
 $("shareSettings").innerHTML=r.players.map(p=>`<div class="share-row"><div class="playername">${esc(p.name)}${p.id===r.hostId?' ★':''}</div><label><span>Bet</span><input type="number" min="1" max="100" step="1" data-contrib="${p.id}" value="${p.contribution}" ${host?'':'disabled'}></label><label><span>Share %</span><input type="number" min="0" max="100" step="1" data-share="${p.id}" value="${p.sharePct}" ${host?'':'disabled'}></label></div>`).join("");
 $("saveShares").disabled=!host||r.phase==="spinning";
 $("teamSpin").disabled=!host||r.phase==="spinning"||r.players.length<2;
 $("roomMessage").textContent=r.message||"";
 if(r.lastSpin){
  $("teamReels").innerHTML=r.lastSpin.reels.map(s=>`<span>${s}</span>`).join("");
  const mine=r.lastSpin.allocations.find(a=>a.id===socket.id);
  $("teamResult").textContent=`${r.lastSpin.payout?`Team payout: ${fmt(r.lastSpin.payout)} credits`:"No payout this round"}${mine?` · Your share: ${fmt(mine.payout)}`:""}`;
 }
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
$("create").onclick=()=>socket.emit("room:create",{name:name()});
$("join").onclick=()=>socket.emit("room:join",{code:$("roomCode").value,name:name()});
$("copy").onclick=async()=>{try{await navigator.clipboard.writeText(roomState.code);toast("Room code copied!")}catch{toast("Share room code: "+roomState.code)}};
$("leave").onclick=()=>{socket.emit("room:leave");myRoom=null;roomState=null;show("entry")};
$("saveShares").onclick=()=>{
 if(!roomState)return;
 const shares=roomState.players.map(p=>Number(document.querySelector(`[data-share="${p.id}"]`).value));
 const contributions=roomState.players.map(p=>Number(document.querySelector(`[data-contrib="${p.id}"]`).value));
 if(shares.reduce((a,b)=>a+b,0)!==100)return toast("Payout shares must add up to 100%.");
 socket.emit("team:configure",{shares,contributions});
};
$("teamSpin").onclick=()=>socket.emit("team:spin");
$("solo").onclick=()=>{if(myRoom)return toast("Leave your team room first.");show("soloPanel")};
$("back").onclick=()=>show("entry");
$("soloSpin").onclick=()=>socket.emit("solo:spin",{bet:Number($("bet").value)});
socket.on("solo:result",r=>{
 $("soloReels").innerHTML=r.reels.map(s=>`<span>${s}</span>`).join("");
 $("soloResult").textContent=r.payout?`You won ${fmt(r.payout)} credits · net ${r.net>=0?"+":""}${fmt(r.net)}`:`No win this spin · ${fmt(r.bet)} credits played`;
});
$("reset").onclick=()=>socket.emit("wallet:reset");
