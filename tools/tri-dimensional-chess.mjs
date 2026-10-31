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
let state=start(),history=[],selected=null,angle=-30,tilt=57,scale=90,mode='computer',difficulty='medium',thinking=false,aiTimer=null;
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
const pieceValue={P:100,N:320,B:330,R:500,Q:900,K:20000};
function evaluate(b){let score=0;for(const [k,p] of Object.entries(b)){const c=coords.get(k);const value=pieceValue[p.toUpperCase()]+(p.toUpperCase()==='P'?(color(p)==='b'?2-c.z:c.z)*15:0);score+=(color(p)==='b'?1:-1)*value;}return score;}
function terminalScore(b,turn,depth){const moves=legal(b,turn);if(moves.length)return null;return inCheck(b,turn)?(turn==='b'?-100000-depth:100000+depth):0;}
function search(b,turn,depth,alpha,beta){const end=terminalScore(b,turn,depth);if(end!==null)return end;if(depth===0)return evaluate(b);
const options=legal(b,turn).sort((a,c)=>(pieceValue[(b[c.to]||'').toUpperCase()]||0)-(pieceValue[(b[a.to]||'').toUpperCase()]||0));
if(turn==='b'){let best=-Infinity;for(const m of options){best=Math.max(best,search(moveBoard(b,coords.get(m.from),coords.get(m.to)),'w',depth-1,alpha,beta));alpha=Math.max(alpha,best);if(beta<=alpha)break;}return best;}
let best=Infinity;for(const m of options){best=Math.min(best,search(moveBoard(b,coords.get(m.from),coords.get(m.to)),'b',depth-1,alpha,beta));beta=Math.min(beta,best);if(beta<=alpha)break;}return best;}
function computerMove(){if(mode!=='computer'||state.turn!=='b')return;const options=legal(state.b,'b');if(!options.length){thinking=false;draw();return;}
let choice=options[0];if(difficulty==='easy'){choice=options[Math.floor(Math.random()*options.length)];}else{const depth=difficulty==='hard'?2:1;let best=-Infinity;for(const m of options){const next=moveBoard(state.b,coords.get(m.from),coords.get(m.to));const score=search(next,'w',depth,-Infinity,Infinity)+Math.random()*(difficulty==='medium'?15:0);if(score>best){best=score;choice=m;}}}
thinking=false;commitMove(choice); }
function queueComputer(){clearTimeout(aiTimer);if(mode==='computer'&&state.turn==='b'&&legal(state.b,'b').length){thinking=true;draw();aiTimer=setTimeout(computerMove,180);}}
function commitMove(m){const from=coords.get(m.from),to=coords.get(m.to),piece=state.b[m.from],capture=!!state.b[m.to];history.push(structuredClone(state));state={b:moveBoard(state.b,from,to),turn:state.turn==='w'?'b':'w',moves:[...state.moves,piece.toUpperCase()+' '+m.from+' → '+m.to+(capture?' ×':'')],last:m.to};selected=null;draw();if(mode==='computer'&&state.turn==='b')queueComputer();}
const el=id=>document.getElementById(id),universe=el('universe');
let view='top';function setView(next){view=next;el('stage').classList.toggle('flat-stage',next==='flat');el('stage').classList.toggle('top-stage',next==='top');el('topView').setAttribute('aria-pressed',String(next==='top'));el('flatView').setAttribute('aria-pressed',String(next==='flat'));el('threeDView').setAttribute('aria-pressed',String(next==='3d'));el('cameraControls').hidden=next!=='3d';draw();}
el('topView').onclick=()=>setView('top');el('flatView').onclick=()=>setView('flat');el('threeDView').onclick=()=>setView('3d');
function draw(){universe.replaceChildren();if(view==='top'){drawTop();return;}universe.style.transform=view==='flat'?'none':'rotateX('+tilt+'deg) rotateZ('+angle+'deg) scale('+(scale/90)+')';const options=legal(state.b,state.turn);const destinations=selected?new Set(options.filter(m=>m.from===selected).map(m=>m.to)):new Set();
for(const p of planes){const node=document.createElement('div');node.className='plane';node.style.setProperty('--size',p.size);node.style.setProperty('--width',(p.size===4?252:126)+'px');node.style.setProperty('--x',((p.size===4?0:p.x+1)*63)+'px');node.style.setProperty('--y',((p.size===4?0:p.y+1)*63)+'px');node.style.setProperty('--z',(p.z*150)+'px');const title=document.createElement('small');title.textContent=p.id;node.append(title);for(let row=p.size-1;row>=0;row--)for(let col=0;col<p.size;col++){const x=(p.size===4?0:p.x)+col,y=(p.size===4?0:p.y)+row,k=key(x,y,p.z),piece=state.b[k];const btn=document.createElement('button');btn.type='button';btn.className='square '+((x+y)%2?'dark ':'')+(piece?(color(piece)==='w'?'white':'black'):'')+(selected===k?' selected':'')+(destinations.has(k)?' target':'');btn.textContent=glyph[piece]||'';btn.setAttribute('aria-label',p.id+' square '+x+','+y+(piece?' '+(color(piece)==='w'?'White ':'Black ')+piece.toUpperCase():''));btn.addEventListener('click',()=>choose(k));node.append(btn);}universe.append(node);}
const optionsNow=legal(state.b,state.turn),check=inCheck(state.b,state.turn);el('status').textContent=thinking?'Computer thinking…':!optionsNow.length?(check?'Checkmate — '+(state.turn==='w'?'Black':'White')+' wins.':'Stalemate — draw.'):(state.turn==='w'?'White':'Black')+' to move'+(check?' — Check!':'');
el('history').textContent=state.moves.length?state.moves.map((m,i)=>(i+1)+'. '+m).join(' · '):'No moves yet.';el('undo').disabled=!history.length;}
function drawTop(){
universe.style.transform='none';
const options=legal(state.b,state.turn),destinations=selected?new Set(options.filter(m=>m.from===selected).map(m=>m.to)):new Set();
const stack=document.createElement('div');stack.className='stack-grid';
const levels=[{id:'upper',z:2,label:'T'},{id:'middle',z:1,label:'M'},{id:'lower',z:0,label:'B'}];
for(let y=3;y>=0;y--)for(let x=0;x<4;x++){
const cell=document.createElement('div');cell.className='stack-cell';
for(const p of levels){const k=key(x,y,p.z),piece=state.b[k],btn=document.createElement('button');btn.type='button';btn.className='stack-token '+p.id+(selected===k?' selected':'')+(destinations.has(k)?' target':'')+(!piece?' empty':'');
const tag=document.createElement('span');tag.className='level-tag';tag.textContent=p.label;const symbol=document.createElement('span');symbol.textContent=glyph[piece]||'·';btn.append(tag,symbol);
btn.setAttribute('aria-label',p.id+' '+x+','+y+(piece?' '+(color(piece)==='w'?'White ':'Black ')+piece.toUpperCase():' empty'));btn.onclick=()=>choose(k);cell.append(btn);}
stack.append(cell);}
universe.append(stack);
const attacks=document.createElement('div');attacks.className='attack-list';
for(const p of planes.filter(p=>p.size===2)){const card=document.createElement('div');card.className='attack-card';const heading=document.createElement('strong');heading.textContent=p.id;card.append(heading);const squares=document.createElement('div');squares.className='attack-squares';
for(let y=p.y+1;y>=p.y;y--)for(let x=p.x;x<p.x+2;x++){const k=key(x,y,p.z),piece=state.b[k],btn=document.createElement('button');btn.type='button';btn.textContent=glyph[piece]||'·';btn.className=(selected===k?'selected ':'')+(destinations.has(k)?'target':'');btn.setAttribute('aria-label',p.id+' '+x+','+y+(piece?' '+piece:''));btn.onclick=()=>choose(k);squares.append(btn);}card.append(squares);attacks.append(card);}
universe.append(attacks);
const legend=document.createElement('div');legend.className='top-legend';legend.textContent='T = top (blue) · M = middle (gold) · B = bottom (green). All three levels share exact square coordinates.';universe.append(legend);
const check=inCheck(state.b,state.turn);el('status').textContent=thinking?'Computer thinking…':!options.length?(check?'Checkmate — '+(state.turn==='w'?'Black':'White')+' wins.':'Stalemate — draw.'):(state.turn==='w'?'White':'Black')+' to move'+(check?' — Check!':'');
el('history').textContent=state.moves.length?state.moves.map((m,i)=>(i+1)+'. '+m).join(' · '):'No moves yet.';el('undo').disabled=!history.length;
}
function choose(k){if(thinking||(mode==='computer'&&state.turn==='b'))return;const options=legal(state.b,state.turn);if(!options.length)return;if(selected){const move=options.find(m=>m.from===selected&&m.to===k);if(move){commitMove(move);return;}}selected=color(state.b[k])===state.turn?k:null;draw();}
el('undo').onclick=()=>{clearTimeout(aiTimer);thinking=false;if(history.length){state=history.pop();if(mode==='computer'&&state.turn==='b'&&history.length)state=history.pop();selected=null;draw();if(mode==='computer'&&state.turn==='b')queueComputer();}};
el('restart').onclick=()=>{if(confirm('Start a new game?')){clearTimeout(aiTimer);thinking=false;state=start();history=[];selected=null;draw();}};
el('mode').onchange=e=>{clearTimeout(aiTimer);thinking=false;mode=e.target.value;state=start();history=[];selected=null;draw();};
el('difficulty').onchange=e=>{difficulty=e.target.value;};
// Pointer gestures control the optional 3D camera without obstructing square taps.
const stage=el('stage'), pointers=new Map();
let gestureMoved=false, lastPinch=null;
stage.addEventListener('pointerdown',e=>{
 if(view!=='3d')return;
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 gestureMoved=false;
 lastPinch=null;
 stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove',e=>{
 if(view!=='3d'||!pointers.has(e.pointerId))return;
 const previous=pointers.get(e.pointerId);
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size===2){
  const [a,b]=[...pointers.values()];
  const distance=Math.hypot(a.x-b.x,a.y-b.y);
  if(lastPinch!==null){scale=Math.max(50,Math.min(170,scale+(distance-lastPinch)*.24));}
  lastPinch=distance;gestureMoved=true;draw();return;
 }
 const dx=e.clientX-previous.x,dy=e.clientY-previous.y;
 if(Math.abs(dx)+Math.abs(dy)>1){angle+=dx*.48;tilt=Math.max(10,Math.min(85,tilt+dy*.35));gestureMoved=true;draw();}
});
function releasePointer(e){pointers.delete(e.pointerId);lastPinch=null;if(!pointers.size){stage.classList.remove('dragging');}}
stage.addEventListener('pointerup',releasePointer);
stage.addEventListener('pointercancel',releasePointer);
stage.addEventListener('pointermove',()=>{stage.classList.toggle('dragging',view==='3d'&&pointers.size>0);});
stage.addEventListener('click',e=>{if(view==='3d'&&gestureMoved){e.preventDefault();e.stopPropagation();gestureMoved=false;}},true);
stage.addEventListener('wheel',e=>{if(view!=='3d')return;e.preventDefault();scale=Math.max(50,Math.min(170,scale-e.deltaY*.1));draw();},{passive:false});
el('resetView').onclick=()=>{angle=-30;tilt=57;scale=90;el('zoom').value=90;draw();};el('zoom').oninput=e=>{scale=Number(e.target.value);draw();};draw();
