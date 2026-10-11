'use strict';
const $=s=>document.querySelector(s),canvas=$('#poster'),ctx=canvas.getContext('2d'),posterScroller=$('#posterScroller'),posterSurface=$('#posterSurface'),posterScale=440/840;
const palettes=[['#0047AB','#FFFFFF','#00FF66'],['#FF0033','#FFFFFF','#00FFFF'],['#CCFF00','#191970','#8A2BE2'],['#39FF14','#191970','#FF0033'],['#8A2BE2','#FFFFFF','#FFD700'],['#E30B5C','#FFFFFF','#7FFFD4'],['#FFA500','#191970','#0047AB'],['#00FFFF','#191970','#E30B5C']];
let background='#0047AB',point='#00FF66',textInk='#FFFFFF',paletteIndex=0;
function luminance(hex){const c=hex.match(/\w\w/g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722}
function contrast(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
function setPalette(index){paletteIndex=index;[background,textInk,point]=palettes[index];const root=document.documentElement;root.style.setProperty('--paper',background);root.style.setProperty('--ink',textInk);root.style.setProperty('--hover',point);root.style.setProperty('--hover-ink',contrast(point,background)>contrast(point,textInk)?background:textInk);document.querySelector('meta[name="theme-color"]').content=background;for(const item of items)item.ink=textInk;PrintFlow.recolor(flow,textInk)}
function nextPalette(){const pool=palettes.map((_,i)=>i).filter(i=>i!==paletteIndex);setPalette(pool[Math.floor(Math.random()*pool.length)])}

let items=[],history=[],receipt=null,flow=PrintFlow.create();
const settings={size:32,width:396,intensity:.55};
const sentences=BookText.map(entry=>entry.text);
function render(){const prose=$('#prose');sentences.forEach((text,index)=>{const sentence=document.createElement('span');sentence.className='sentence';sentence.lang=BookText[index].lang;sentence.tabIndex=0;sentence.setAttribute('role','button');sentence.setAttribute('aria-label',text+' 수집');sentence.textContent=text;const collect=()=>steal(text,index);bindPress(sentence,text,index);sentence.addEventListener('click',e=>{if(sentence.suppressClick){sentence.suppressClick=false;e.preventDefault();return}collect()});sentence.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();collect()}});const note=document.createElement('button');note.className='footnote';note.textContent=`[${index+1}]`;note.setAttribute('aria-label',`각주 ${index+1}`);note.onclick=()=>{$('#noteText').textContent=`[${index+1}] ${BookMeta.title} · ${BookText[index].turn===0?'첫 무대 지시':'대사 '+BookText[index].turn} · ${BookText[index].speaker}. ${BookMeta.translation}. 대조 저본: ${BookMeta.basis}. ${BookMeta.source} 이 브라우저에서 수집한 횟수: ${history.filter(h=>h.index===index).length}.` ;$('#note').showModal()};prose.append(sentence,note,document.createTextNode(' '))})}
function draw(follow=false){const viewport=Math.max(400,Math.ceil((posterScroller.clientHeight||622)*840/440));if(canvas.height!==viewport)canvas.height=viewport;const height=Math.max(viewport,PrintFlow.height(flow));posterSurface.style.height=(height*posterScale)+'px';if(follow)posterScroller.scrollTop=Math.max(0,(height-viewport)*posterScale);const offset=(posterScroller.scrollTop||0)/posterScale;ctx.fillStyle=background;ctx.fillRect(0,0,840,canvas.height);ctx.save();ctx.translate(0,-offset);PrintFlow.paint(ctx,flow,offset,viewport);ctx.restore()}
posterScroller.addEventListener('scroll',()=>draw());window.addEventListener('resize',()=>draw());
function makeItem(text,index){
 const previous=items.filter(o=>o.index===index).at(-1),effects=PrintEffects.names.filter(name=>name!==previous?.effect);
 const item={text,index,ink:textInk,size:settings.size*840/440,blockWidth:Math.min(756,settings.width*840/440),intensity:settings.intensity,seed:Math.floor(Math.random()*1000000),effect:effects[Math.floor(Math.random()*effects.length)]};
 item.words=PrintFlow.words(text,item);return item;
}
function remember(item){history.push({text:item.text,index:item.index,ink:item.ink,effect:item.effect});nextPalette()}
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
$('#settingsButton').onclick=()=>$('#settingsDialog').showModal();
for(const key of ['size','width','intensity']){const input=$('#'+key+'Input'),output=$('#'+key+'Value');input.addEventListener('input',()=>{settings[key]=Number(input.value)/(key==='intensity'?100:1);output.textContent=input.value+(key==='intensity'?'%':'px')})}
$('#settleButton').onclick=claim;
function claim(){finishPress(true);receipt={id:crypto.randomUUID().slice(0,8).toUpperCase(),count:history.length,printFlow:PrintFlow.clone(flow),ink:textInk,background,entries:history.map(h=>({...h})),date:new Date().toLocaleString('en-GB',{hour12:false})};
 receipt.printFlow.rows=receipt.printFlow.rows.map(row=>({...row,tokens:row.tokens.map(token=>({...token,tile:null,staticTile:null,ink:receipt.ink}))}));
 $('#receiptDialog').showModal();PrintReceipt.start($('#receiptRibbon'),receipt);
}
canvas.addEventListener('dblclick',claim);document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='s'&&!e.ctrlKey&&!e.metaKey&&!document.querySelector('dialog[open]')){e.preventDefault();claim()}});
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#receiptDialog').addEventListener('close',()=>PrintReceipt.stop());
function download(url,name){const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove()}$('#savePoster').onclick=async()=>{const button=$('#savePoster');button.disabled=true;try{const result=await PrintExport.make(receipt);const url=URL.createObjectURL(result.blob);download(url,`ST0L3N_${receipt.id}.${result.extension}`);setTimeout(()=>URL.revokeObjectURL(url),60000)}finally{button.disabled=false;draw()}};$('#saveReceipt').onclick=async()=>{const button=$('#saveReceipt');button.disabled=true;try{const result=await PrintReceipt.export(receipt);const url=URL.createObjectURL(result.blob);download(url,`RECEIPT_${receipt.id}.${result.extension}`);setTimeout(()=>URL.revokeObjectURL(url),60000)}finally{button.disabled=false}};
setPalette(0);render();draw();document.fonts.ready.then(()=>{for(const row of flow.rows)for(const token of row.tokens)delete token.tile;draw()});
