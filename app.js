'use strict';
const $=s=>document.querySelector(s),canvas=$('#poster'),ctx=canvas.getContext('2d'),posterScroller=$('#posterScroller'),posterSurface=$('#posterSurface'),posterScale=438/840;
const palettes=[['#000000','#F2F2F2','#F2F2F2'],['#000000','#FFFFFF','#FFFFFF'],['#000000','#BDBDBD','#BDBDBD'],['#000000','#8E8E8E','#8E8E8E'],['#000000','#D9D9D9','#D9D9D9']];
let background='#000000',point='#F2F2F2',textInk='#F2F2F2',paletteIndex=0;
function luminance(hex){const c=hex.match(/\w\w/g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722}
function contrast(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
function setPalette(index){paletteIndex=index;[background,textInk,point]=palettes[index];const root=document.documentElement;root.style.setProperty('--paper',background);root.style.setProperty('--ink',textInk);for(const item of items)item.ink=textInk;PrintFlow.recolor(flow,textInk)}
function nextPalette(){const pool=palettes.map((_,i)=>i).filter(i=>i!==paletteIndex);setPalette(pool[Math.floor(Math.random()*pool.length)])}

let items=[],history=[],receipt=null,flow=PrintFlow.create();
const settings={size:32,width:396,intensity:.55};
const sentences=BookText.map(entry=>entry.text);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const book=$('#book'),sentenceNodes=[];
function heading(level,num,title,id){const h=el(level,'wiki-h');h.id=id;const a=el('span','num',num+'.');a.onclick=()=>scrollToId('toc');h.append(a,document.createTextNode(' '+title),el('span','edit','[편집]'));return h}
function scrollToId(id){const target=document.getElementById(id);if(target)book.scrollTo({top:target.offsetTop-12,behavior:'smooth'})}
const figureModes=['left','right','inline','left','right'];
function figure(number,caption){const code=String(number).padStart(2,'0'),mode=figureModes[Math.floor(Math.random()*figureModes.length)],f=el('span','fig fig-'+mode);f.title=caption;
 const width=mode==='inline'?64+Math.round(Math.random()*48):mode==='center'?30+Math.round(Math.random()*20):24+Math.round(Math.random()*16);
 f.style.width=mode==='inline'?width+'px':width+'%';if(mode==='center')f.style.marginLeft=Math.round(Math.random()*(100-width))+'%';
 f.style.aspectRatio=['4/5','1/1','3/4','4/5'][Math.floor(Math.random()*4)];
 const img=new Image();img.alt=caption;img.loading='lazy';img.src=`images/${code}.png`;img.onerror=()=>{const ph=el('span','ph');img.replaceWith(ph)};f.append(img);return f}
function sentenceNode(entry,index){const span=el('span','sentence');span.lang=entry.lang;span.tabIndex=0;span.setAttribute('role','button');span.setAttribute('aria-label',entry.text+' 수집');const prefix=entry.speaker+': ';
 if(entry.text.startsWith(prefix)){span.append(el('b','who',entry.speaker+': '),document.createTextNode(entry.text.slice(prefix.length)))}else span.textContent=entry.text;
 const collect=()=>steal(entry.text,index);bindPress(span,entry.text,index);span.addEventListener('click',e=>{if(span.suppressClick){span.suppressClick=false;e.preventDefault();return}collect()});span.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();collect()}});sentenceNodes[index]=span;return span}
function footnote(turn,speaker){const n=el('span','fn',`[${turn===0?'*':turn}]`);n.setAttribute('role','button');n.tabIndex=0;n.title=turn===0?'첫 무대 지시':`대사 ${turn} · ${speaker}`;n.onclick=()=>{const count=history.filter(h=>BookText[h.index].turn===turn).length;$('#noteText').textContent=`[${turn===0?'*':turn}] ${BookMeta.title} · ${turn===0?'첫 무대 지시':'대사 '+turn} · ${speaker}. 소포클레스가 신화에서 가져왔고, 프랜시스 스토어가 1912년 영어로 옮겼고, AI가 한국어로 옮겼다. 이 브라우저에서 이 대사를 가져간 횟수: ${count}.`;$('#note').showModal()};return n}
function render(){const W=window.WikiDoc,prose=$('#prose');
 const cats=$('#categories');cats.append(el('b','','분류'));for(const c of W.categories)cats.append(el('span','',c));
 const notice=el('div','notice');notice.append(el('i','','ⓘ'),el('span','',W.notice));prose.append(notice);
 const box=el('table','infobox'),cap=el('caption');cap.append(document.createTextNode('오이디푸스 왕'),el('small','','Οἰδίπους Τύραννος | Oedipus the King'));box.append(cap);for(const [k,v] of W.infobox){const tr=el('tr');tr.append(el('th','',k),el('td','',v));box.append(tr)}prose.append(box);
 const toc=el('div','toc');toc.id='toc';toc.append(el('div','toc-title','목차'));
 const tocLine=(num,title,id,sub)=>{const d=el('div',sub?'sub':'');const a=el('a');a.href='#'+id;a.onclick=e=>{e.preventDefault();scrollToId(id)};a.append(el('span','num',num+'.'),document.createTextNode(title));d.append(a);toc.append(d)};
 tocLine('1','개요','s-1');tocLine('2','본문','s-2');W.sections.forEach((s,i)=>tocLine('2.'+(i+1),s.title,'s-2-'+(i+1),true));tocLine('3','관련 문서','s-3');prose.append(toc);
 prose.append(heading('h2','1','개요','s-1'));const ov=el('p');W.overview.forEach(t=>{ov.append(el('span','',t),document.createTextNode(' '))});prose.append(ov);
 prose.append(heading('h2','2','본문','s-2'));
 const byTurn=new Map();BookText.forEach((entry,index)=>{if(!byTurn.has(entry.turn))byTurn.set(entry.turn,[]);byTurn.get(entry.turn).push(index)});
 const figs=new Map(W.figures.map((f,i)=>[f.after,{...f,number:i+1}]));
 W.sections.forEach((s,i)=>{prose.append(heading('h3','2.'+(i+1),s.title,'s-2-'+(i+1)));
  for(let turn=s.from;turn<=s.to;turn++){const list=byTurn.get(turn);if(!list)continue;const first=BookText[list[0]],p=el('p','turn'+(first.speaker==='지문'?' stage':''));
   const f=figs.get(turn),at=f?Math.floor(Math.random()*list.length):-1;
   list.forEach((index,k)=>{if(k===at)p.append(figure(f.number,f.caption));p.append(sentenceNode(BookText[index],index),document.createTextNode(' '))});p.append(footnote(turn,first.speaker));prose.append(p)}
 });
 prose.append(heading('h2','3','관련 문서','s-3'));const rel=el('p');rel.textContent='오이디푸스 · 테이레시아스 · 이오카스테 · 자기 실현적 예언 · 오이디푸스 콤플렉스';prose.append(rel);
 updateMeta();
}
function updateMeta(){const d=history.length?new Date():WikiDoc.updated,pad=n=>String(n).padStart(2,'0');$('#updatedAt').textContent=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;$('#updatedBy').textContent=history.length?`(익명 방문자가 문장 ${history.length}개를 가져감)`:''}
function draw(follow=false){const viewport=Math.max(400,Math.ceil((posterScroller.clientHeight||622)*840/438));if(canvas.height!==viewport)canvas.height=viewport;const height=Math.max(viewport,PrintFlow.height(flow));posterSurface.style.height=(height*posterScale)+'px';if(follow)posterScroller.scrollTop=Math.max(0,(height-viewport)*posterScale);const offset=(posterScroller.scrollTop||0)/posterScale;ctx.fillStyle=background;ctx.fillRect(0,0,840,canvas.height);ctx.save();ctx.translate(0,-offset);PrintFlow.paint(ctx,flow,offset,viewport);ctx.restore()}
posterScroller.addEventListener('scroll',()=>draw());window.addEventListener('resize',()=>draw());
function makeItem(text,index){
 const previous=items.filter(o=>o.index===index).at(-1),effects=PrintEffects.names.filter(name=>name!==previous?.effect);
 const item={text,index,ink:textInk,size:settings.size*840/440,blockWidth:Math.min(756,settings.width*840/440),intensity:settings.intensity,seed:Math.floor(Math.random()*1000000),effect:effects[Math.floor(Math.random()*effects.length)]};
 item.words=PrintFlow.words(text,item);return item;
}
function remember(item){history.push({text:item.text,index:item.index,ink:item.ink,effect:item.effect});sentenceNodes[item.index]?.classList.add('taken');updateMeta();nextPalette()}
function steal(text,index){const item=makeItem(text,index);PrintFlow.append(flow,item);items.push(item);remember(item);delete item.words;draw(true)}
let press=null;
function finishPress(commit){if(!press)return;const p=press;press=null;clearTimeout(p.timer);clearInterval(p.cycle);
 if(p.slot!==undefined){p.element.suppressClick=true;if(commit){remember(items[p.slot]);delete items[p.slot].words}else{items.splice(p.slot,1);flow=p.base}draw(commit)}
}
function bindPress(element,text,index){
 element.addEventListener('pointerdown',e=>{if(e.button!==0)return;finishPress(false);element.suppressClick=false;
 const p=press={element,text,index,pointerId:e.pointerId};element.setPointerCapture?.(e.pointerId);
 p.timer=setTimeout(()=>{if(press!==p)return;p.slot=items.length;p.base=PrintFlow.clone(flow);const item=makeItem(text,index);items.push(item);PrintFlow.append(flow,item);draw(true);
 p.cycle=setInterval(()=>{items[p.slot]=makeItem(text,index);flow=PrintFlow.clone(p.base);PrintFlow.append(flow,items[p.slot]);draw(true)},240)},380);
 });
 element.addEventListener('pointerup',e=>{if(press?.element===element&&press.pointerId===e.pointerId)finishPress(true)});
 element.addEventListener('pointercancel',()=>{if(press?.element===element)finishPress(false)});
 element.addEventListener('contextmenu',e=>e.preventDefault());
}
window.addEventListener('blur',()=>finishPress(false));
document.addEventListener('visibilitychange',()=>{if(document.hidden)finishPress(false)});
document.addEventListener('keydown',e=>{if(e.key===','&&!document.querySelector('dialog[open]'))$('#settingsDialog').showModal()});
for(const key of ['size','width','intensity']){const input=$('#'+key+'Input'),output=$('#'+key+'Value');input.addEventListener('input',()=>{settings[key]=Number(input.value)/(key==='intensity'?100:1);output.textContent=input.value+(key==='intensity'?'%':'px')})}
function claim(){finishPress(true);receipt={id:crypto.randomUUID().slice(0,8).toUpperCase(),count:history.length,printFlow:PrintFlow.clone(flow),ink:textInk,background,entries:history.map(h=>({...h})),date:new Date().toLocaleString('en-GB',{hour12:false})};
 receipt.printFlow.rows=receipt.printFlow.rows.map(row=>({...row,tokens:row.tokens.map(token=>({...token,tile:null,staticTile:null,ink:receipt.ink}))}));
 $('#receiptDialog').showModal();PrintReceipt.start($('#receiptRibbon'),receipt);
}
canvas.addEventListener('dblclick',claim);document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='s'&&!e.ctrlKey&&!e.metaKey&&!document.querySelector('dialog[open]')){e.preventDefault();claim()}});
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#receiptDialog').addEventListener('close',()=>PrintReceipt.stop());
function download(url,name){const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove()}$('#savePoster').onclick=async()=>{const button=$('#savePoster');button.disabled=true;try{const result=await PrintExport.make(receipt);const url=URL.createObjectURL(result.blob);download(url,`ST0L3N_${receipt.id}.${result.extension}`);setTimeout(()=>URL.revokeObjectURL(url),60000)}finally{button.disabled=false;draw()}};$('#saveReceipt').onclick=async()=>{const button=$('#saveReceipt');button.disabled=true;try{const result=await PrintReceipt.export(receipt);const url=URL.createObjectURL(result.blob);download(url,`RECEIPT_${receipt.id}.${result.extension}`);setTimeout(()=>URL.revokeObjectURL(url),60000)}finally{button.disabled=false}};
setPalette(0);render();draw();document.fonts.ready.then(()=>{for(const row of flow.rows)for(const token of row.tokens)delete token.tile;draw()});
