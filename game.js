const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hud = document.getElementById("hud");
const rosterBox = document.getElementById("roster");

const roles = [
  { name:"陈弘毅", rarity:"legend", hp:500, speed:8, color:"#ffcf5a", atkCd:0.9, atk:26, s1:"装备大师", s2:"超远扣杀", desc:"冲撞型。S1自强化(20%概率50%减伤/80%概率伤害+35%，持续10s)，S2远程重击并短晕。", debuff:"知识伤害翻倍"},
  { name:"李语晨", rarity:"treasure", hp:400, speed:6, color:"#6ef7ff", atkCd:0.45, atk:8, s1:"欧巴魅力", s2:"化学炸弹", desc:"高攻速毒伤。S1减伤，S2投掷毒云。", debuff:"连续移动10s后减速2s"},
  { name:"石傲天", rarity:"epic", hp:400, speed:8, color:"#ff8a8a", atkCd:1.2, atk:18, s1:"三分球", s2:"身残志坚", desc:"蓄力远程。低血量自动进入车形态，冲撞更快。", debuff:"远程伤害+30%，车形态受伤+50%"},
  { name:"万济齐", rarity:"epic", hp:300, speed:7, color:"#c7a7ff", atkCd:1.2, atk:20, s1:"虚空乒乓", s2:"动量定理", desc:"弹射球+短时远程强化。", debuff:"弹射球会误伤自己(简化友伤)"},
  { name:"王若伊", rarity:"rare", hp:230, speed:6, color:"#ffd1f5", atkCd:1.8, atk:25, s1:"情真意切", s2:"狙击玩家", desc:"S1回复并降普攻。S2原地瞄准3秒狙击200。", debuff:"被打断则技能失败"},
  { name:"郭则名", rarity:"treasure", hp:450, speed:10, color:"#9dff9f", atkCd:1.3, atk:16, s1:"快攻上篮", s2:"体贴弱者", desc:"短距瞬移连击，S2一次性护盾。", debuff:"无法斩杀(目标最低留1血)"},
  { name:"陶飞杰", rarity:"legend", hp:480, speed:8, color:"#ffa560", atkCd:1.0, atk:12, s1:"硬血朗骨", s2:"寻真自我", desc:"S1短暂无敌增伤，S2范围爆发。", debuff:"S2有50%概率伤害-30%"},
  { name:"顾楚晨", rarity:"rare", hp:300, speed:7, color:"#8ce9a2", atkCd:1.5, atk:22, s1:"摩擦系数", s2:"心理委员", desc:"随机牌伤害，S2低血时回血。", debuff:"治疗目标死亡会沉默4s(1v1改为自己低血触发沉默)"},
];

function rarityText(r){return ({legend:"传说",epic:"史诗",treasure:"珍宝",rare:"稀有"})[r]}
function drawRoster(){ rosterBox.innerHTML = roles.map(r=>`<div class='role'><b>${r.name}</b><span class='tag rarity-${r.rarity}'>${rarityText(r.rarity)}</span><br>HP:${r.hp} 速度:${r.speed}<br>${r.desc}<br><i>负面:${r.debuff}</i></div>`).join(''); }
drawRoster();

const p1 = JSON.parse(JSON.stringify(roles[(Math.random()*roles.length)|0]));
let p2idx = (Math.random()*roles.length)|0; if (roles[p2idx].name===p1.name) p2idx=(p2idx+1)%roles.length;
const p2 = JSON.parse(JSON.stringify(roles[p2idx]));

function initPlayer(base, x, controls){ return { ...base, x, y:0, vx:0, vy:0, dir:1, cd:0, s1cd:0, s2cd:0, hpMax:base.hp, stun:0, inv:0, buff:0, shield:0, lock:false, focus:0, poison:0, trail:0, controls, movingT:0, slowT:0 }; }
const A = initPlayer(p1, -20, {u:'w',d:'s',l:'a',r:'d',atk:'f',s1:'g',s2:'h'});
const B = initPlayer(p2, 20, {u:'ArrowUp',d:'ArrowDown',l:'ArrowLeft',r:'ArrowRight',atk:'/',s1:'.',s2:','});
let over = false; const keys = new Set();

addEventListener('keydown',e=>keys.add(e.key)); addEventListener('keyup',e=>keys.delete(e.key));
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
function damage(src,tgt,val,kind='normal'){
  if(tgt.inv>0) return;
  if(tgt.shield>0){ tgt.shield=0; return; }
  let d=val;
  if(tgt.name==='陈弘毅'&&kind==='knowledge') d*=2;
  if(src.name==='郭则名' && tgt.hp-d<=0) d=Math.max(0,tgt.hp-1);
  if(tgt.buff>0 && tgt.name==='李语晨' && kind!=='knowledge') d*=0.5;
  tgt.hp -= d;
}
function attack(att, def){ if(att.cd>0||att.stun>0||att.lock) return; if(dist(att,def)>4) return; att.cd=att.atkCd; damage(att,def,att.atk); if(att.name==='李语晨') def.poison=5; }
function cast1(att,def){ if(att.s1cd>0||att.stun>0) return; att.s1cd=12;
  if(att.name==='王若伊'){ att.buff=6; att.atk=15; }
  else if(att.name==='郭则名'){ att.trail=0.8; for(let i=0;i<4;i++) setTimeout(()=>damage(att,def,15*(i+1)),i*120); }
  else if(att.name==='陶飞杰'){ att.inv=3; att.buff=3; }
  else if(att.name==='陈弘毅'){ att.buff=10; if(Math.random()<0.2) att.inv=10; }
  else if(att.name==='石傲天'){ att.lock=true; setTimeout(()=>{att.lock=false; if(dist(att,def)<18) damage(att,def,70);},1500); }
  else if(att.name==='万济齐'){ bullets.push({x:att.x,y:att.y,vx:(def.x-att.x)/2,vy:(def.y-att.y)/2,r:0.6,t:5,from:att,bounce:2,dmg:20,kind:'normal'}); }
  else if(att.name==='顾楚晨'){ const n=(Math.random()*10)|0; damage(att,def,n*5); }
  else if(att.name==='李语晨'){ att.inv=3; }
}
function cast2(att,def){ if(att.s2cd>0||att.stun>0) return; att.s2cd=16;
  if(att.name==='王若伊'){ att.lock=true; setTimeout(()=>{att.lock=false; if(dist(att,def)<40) damage(att,def,200);},3000); }
  else if(att.name==='郭则名'){ att.shield=1; }
  else if(att.name==='陶飞杰'){ const nerf=Math.random()<0.5?0.7:1; if(dist(att,def)<7) damage(att,def,350*nerf,'knowledge'); }
  else if(att.name==='陈弘毅'){ if(dist(att,def)<22){damage(att,def,120,'knowledge'); def.stun=1.2;} else damage(att,def,25); }
  else if(att.name==='石傲天'){ if(att.hp<100){att.speed=10; if(dist(att,def)<6) damage(att,def,50);} }
  else if(att.name==='万济齐'){ att.buff=10; }
  else if(att.name==='顾楚晨'){ if(att.hp/att.hpMax<0.3) att.hp=clamp(att.hp+80,0,att.hpMax); else att.stun=1; }
  else if(att.name==='李语晨'){ zones.push({x:def.x,y:def.y,r:5,t:5,owner:att}); }
}
const bullets=[]; const zones=[];
let last=performance.now();
function tick(now){ const dt=Math.min(0.033,(now-last)/1000); last=now;
  if(!over){ [A,B].forEach((p,i)=>{
    const enemy=i===0?B:A;
    const c=p.controls; const sp=(p.slowT>0?4:p.speed) + (p.trail>0?3:0);
    if(p.stun<=0 && !p.lock){ p.vx=(keys.has(c.r)?1:0)-(keys.has(c.l)?1:0); p.vy=(keys.has(c.d)?1:0)-(keys.has(c.u)?1:0); }
    const l=Math.hypot(p.vx,p.vy)||1; p.x += (p.vx/l)*sp*dt; p.y += (p.vy/l)*sp*dt;
    p.x=clamp(p.x,-25,25); p.y=clamp(p.y,-25,25);
    if(Math.hypot(p.vx,p.vy)>0.1) p.movingT += dt; else p.movingT=0;
    if(p.name==='李语晨' && p.movingT>10){ p.slowT=2; p.movingT=0; }
    if(keys.has(c.atk)) attack(p,enemy); if(keys.has(c.s1)) cast1(p,enemy); if(keys.has(c.s2)) cast2(p,enemy);
    ["cd","s1cd","s2cd","stun","inv","buff","trail","slowT"].forEach(k=>p[k]=Math.max(0,p[k]-dt));
    if(p.poison>0){ p.hp-=2*dt; p.poison-=dt; }
    if(p.name==='石傲天' && p.hp<100) p.speed=10;
  });
  bullets.forEach(b=>{ b.x+=b.vx*dt*4; b.y+=b.vy*dt*4; if(Math.abs(b.x)>25){b.vx*=-1;b.bounce--;} if(Math.abs(b.y)>25){b.vy*=-1;b.bounce--;} [A,B].forEach(p=>{ if(p!==b.from && Math.hypot(p.x-b.x,p.y-b.y)<1.2){ damage(b.from,p,b.from.name==='万济齐'&&b.from.buff>0?b.dmg+40:b.dmg,b.from.buff>0?'knowledge':'normal'); b.t=0; }}); b.t-=dt; });
  zones.forEach(z=>{ [A,B].forEach(p=>{ if(p!==z.owner && Math.hypot(p.x-z.x,p.y-z.y)<z.r){ p.stun=Math.max(p.stun,0.2); p.poison=5; damage(z.owner,p,10*dt,'knowledge'); }}); z.t-=dt; });
  for(let i=bullets.length-1;i>=0;i--) if(bullets[i].t<=0||bullets[i].bounce<0) bullets.splice(i,1);
  for(let i=zones.length-1;i>=0;i--) if(zones[i].t<=0) zones.splice(i,1);
  if(A.hp<=0||B.hp<=0){ over=true; }
 }
 draw(); requestAnimationFrame(tick);
}
function worldToScreen(x,y){ return {x:(x+25)/50*canvas.width, y:(y+25)/50*canvas.height}; }
function drawPlayer(p,color){ const s=worldToScreen(p.x,p.y); const px=14; ctx.fillStyle=color; ctx.fillRect(s.x-px,s.y-px,px*2,px*2); ctx.fillStyle="#111"; ctx.fillRect(s.x-4,s.y-3,3,3); ctx.fillRect(s.x+1,s.y-3,3,3); if(p.stun>0){ctx.fillStyle='#fff';ctx.fillText('晕',s.x-4,s.y-18);} }
function draw(){ ctx.clearRect(0,0,canvas.width,canvas.height); ctx.strokeStyle="#2f3d6d"; for(let i=0;i<=10;i++){ const x=i/10*canvas.width; const y=i/10*canvas.height; ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke(); ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke(); }
  zones.forEach(z=>{ const s=worldToScreen(z.x,z.y); ctx.beginPath(); ctx.fillStyle='rgba(120,255,120,0.25)'; ctx.arc(s.x,s.y,z.r/50*canvas.width,0,Math.PI*2); ctx.fill(); });
  bullets.forEach(b=>{ const s=worldToScreen(b.x,b.y); ctx.fillStyle='#fff'; ctx.fillRect(s.x-3,s.y-3,6,6); });
  drawPlayer(A,A.color); drawPlayer(B,B.color);
  const winner = A.hp<=0?B.name:B.hp<=0?A.name:'';
  hud.innerHTML = `<div class='card'><b>P1 ${A.name}</b> HP ${Math.max(0,A.hp|0)}/${A.hpMax}<br>CD: A:${A.cd.toFixed(1)} S1:${A.s1cd.toFixed(1)} S2:${A.s2cd.toFixed(1)}</div><div class='card'><b>P2 ${B.name}</b> HP ${Math.max(0,B.hp|0)}/${B.hpMax}<br>CD: A:${B.cd.toFixed(1)} S1:${B.s1cd.toFixed(1)} S2:${B.s2cd.toFixed(1)}</div>`;
  if(over){ ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#fff'; ctx.font='32px monospace'; ctx.fillText(`胜者: ${winner}`,canvas.width/2-90,canvas.height/2); }
}
requestAnimationFrame(tick);
