// Ryangineer 3D Chess house rules, v1. See docs/tri-dimensional-chess.md.
const glyph={K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
const planes=[
{id:'lower',z:0,x:0,y:0,size:4},{id:'middle',z:1,x:0,y:0,size:4},{id:'upper',z:2,x:0,y:0,size:4},
{id:'attack SW',z:0,x:-2,y:-2,size:2},{id:'attack SE',z:0,x:4,y:-2,size:2},
{id:'attack NW',z:2,x:-2,y:4,size:2},{id:'attack NE',z:2,x:4,y:4,size:2}
];
const key=(x,y,z)=>x+','+y+','+z;
const coords=new Map(), levels=new Map();
for(const p of planes){const baseX=p.size===4?0:p.x,baseY=p.size===4?0:p.y;for(let y=0;y<p.size;y++)for(let x=0;x<p.size;x++){const c={x:baseX+x,y:baseY+y,z:p.z,plane:p.id};coords.set(key(c.x,c.y,c.z),c);}}
const all=[...coords.keys()];
const start=()=>{const b={};const back=['R','N','B','Q'];for(let x=0;x<4;x++){b[key(x,0,0)]=back[x];b[key(x,1,0)]='P';b[key(x,3,2)]=back[x].toLowerCase();b[key(x,2,2)]='p';}b[key(1,0,0)]='K';b[key(1,3,2)]='k';delete b[key(1,1,0)];delete b[key(1,2,2)];b[key(1,1,0)]='P';b[key(1,2,2)]='p';return {b,turn:'w',moves:[],last:null};};
let state=start(),history=[],selected=null,angle=-30,tilt=57,scale=90;
const color=p=>!p?null:p===p.toUpperCase()?'w':'b';
const same=(a,b)=>a.x===b.x&&a.y===b.y&&a.z===b.z;
const direction=(a,b)=>[b.x-a.x,b.y-a.y,b.z-a.z];
function geometry(p,a,b){const [dx,dy,dz]=direction(a,b),v=[Math.abs(dx),Math.abs(dy),Math.abs(dz)],non=v.filter(Boolean),type=p.toUpperCase();
if(type==='N')return v.sort((a,b)=>a-b).join(',')==='0,1,2';
if(type==='K')return Math.max(...v)===1;
if(type==='P'){const f=color(p)==='w'?1:-1;return dz===f&&(dx===0&&dy===0||Math.abs(dx)+Math.abs(dy)===1);}
if(!non.length)return false;
if(type==='R'&&non.length!==1)return false;
if(type==='B'&&(non.length!==2||non[0]!==non[1]))return false;
if(type==='Q'&&!(non.length===1||non.every(n=>n===non[0])))return false;
return true;}
function clearPath(b,a,c,p){const type=p.toUpperCase();if(type==='K'||type==='N'||type==='P')return true;
const d=direction(a,c),steps=Math.max(...d.map(Math.abs)),step=d.map(n=>Math.sign(n));
for(let i=1;i<steps;i++)if(b[key(a.x+step[0]*i,a.y+step[1]*i,a.z+step[2]*i)])return false;
return true;}
function candidate(b,from,to,p){if(same(from,to)||!geometry(p,from,to)||!clearPath(b,from,to,p))return false;
const target=b[key(to.x,to.y,to.z)];if(target&&(color(target)===color(p)||target.toUpperCase()==='K'))return false;
if(p.toUpperCase()==='P'){const [dx,dy]=direction(from,to);return dx===0&&dy===0?!target:!!target;}
return true;}
function threatened(b,square,by){return Object.entries(b).some(([k,p])=>color(p)===by&&(()=>{const from=coords.get(k);if(!from)return false;if(p.toUpperCase()==='P'){const [dx,dy,dz]=direction(from,square);return dz===(by==='w'?1:-1)&&Math.abs(dx)+Math.abs(dy)===1;}return geometry(p,from,square)&&clearPath(b,from,square,p);})());}
function inCheck(b,side){const king=Object.keys(b).find(k=>b[k]===(side==='w'?'K':'k'));return !king||threatened(b,coords.get(king),side==='w'?'b':'w');}
function moveBoard(b,from,to){const next={...b},fk=key(from.x,from.y,from.z),tk=key(to.x,to.y,to.z);let p=next[fk];delete next[fk];if(p.toUpperCase()==='P'&&(to.z===(color(p)==='w'?2:0)))p=color(p)==='w'?'Q':'q';next[tk]=p;return next;}
function legal(b,side){const out=[];for(const [k,p] of Object.entries(b)){if(color(p)!==side)continue;const a=coords.get(k);if(!a)continue;for(const t of all){const c=coords.get(t);if(candidate(b,a,c,p)&&!inCheck(moveBoard(b,a,c),side))out.push({from:k,to:t});}}return out;}
const el=id=>document.getElementById(id),universe=el('universe');
function draw(){universe.replaceChildren();universe.style.transform='rotateX('+tilt+'deg) rotateZ('+angle+'deg) scale('+(scale/90)+')';const options=legal(state.b,state.turn);const destinations=selected?new Set(options.filter(m=>m.from===selected).map(m=>m.to)):new Set();
for(const p of planes){const node=document.createElement('div');node.className='plane';node.style.setProperty('--size',p.size);node.style.setProperty('--width',(p.size===4?252:126)+'px');node.style.setProperty('--x',((p.size===4?0:p.x+1)*63)+'px');node.style.setProperty('--y',((p.size===4?0:p.y+1)*63)+'px');node.style.setProperty('--z',(p.z*150)+'px');const title=document.createElement('small');title.textContent=p.id;node.append(title);for(let row=p.size-1;row>=0;row--)for(let col=0;col<p.size;col++){const x=(p.size===4?0:p.x)+col,y=(p.size===4?0:p.y)+row,k=key(x,y,p.z),piece=state.b[k];const btn=document.createElement('button');btn.type='button';btn.className='square '+((x+y)%2?'dark ':'')+(piece?(color(piece)==='w'?'white':'black'):'')+(selected===k?' selected':'')+(destinations.has(k)?' target':'');btn.textContent=glyph[piece]||'';btn.setAttribute('aria-label',p.id+' square '+x+','+y+(piece?' '+(color(piece)==='w'?'White ':'Black ')+piece.toUpperCase():''));btn.addEventListener('click',()=>choose(k));node.append(btn);}universe.append(node);}
const optionsNow=legal(state.b,state.turn),check=inCheck(state.b,state.turn);el('status').textContent=!optionsNow.length?(check?'Checkmate — '+(state.turn==='w'?'Black':'White')+' wins.':'Stalemate — draw.'):(state.turn==='w'?'White':'Black')+' to move'+(check?' — Check!':'');
el('history').textContent=state.moves.length?state.moves.map((m,i)=>(i+1)+'. '+m).join(' · '):'No moves yet.';el('undo').disabled=!history.length;}
function choose(k){const options=legal(state.b,state.turn);if(!options.length)return;if(selected&&options.some(m=>m.from===selected&&m.to===k)){const from=coords.get(selected),to=coords.get(k),piece=state.b[selected],capture=!!state.b[k];history.push(structuredClone(state));state={b:moveBoard(state.b,from,to),turn:state.turn==='w'?'b':'w',moves:[...state.moves,piece.toUpperCase()+' '+selected+' → '+k+(capture?' ×':'')],last:k};selected=null;draw();return;}selected=color(state.b[k])===state.turn?k:null;draw();}
el('undo').onclick=()=>{if(history.length){state=history.pop();selected=null;draw();}};
el('restart').onclick=()=>{if(confirm('Start a new game?')){state=start();history=[];selected=null;draw();}};
el('left').onclick=()=>{angle-=30;draw();};el('right').onclick=()=>{angle+=30;draw();};el('tilt').onclick=()=>{tilt=tilt===57?32:tilt===32?75:57;draw();};el('resetView').onclick=()=>{angle=-30;tilt=57;scale=90;el('zoom').value=90;draw();};el('zoom').oninput=e=>{scale=Number(e.target.value);draw();};draw();
