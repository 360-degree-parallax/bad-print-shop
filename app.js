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
const GEN_KEY="bp-gen";
const loadGen=()=>{try{return localStorage.getItem(GEN_KEY)||"0"}catch(e){return "0"}};
const saveGen=v=>{try{localStorage.setItem(GEN_KEY,v)}catch(e){}};
settings.gen=loadGen();
const mixPick=new Map();
function genFor(turn){if(settings.gen!=="mix")return Number(settings.gen);if(!mixPick.has(turn))mixPick.set(turn,Math.floor(Math.random()*6)+1);return mixPick.get(turn)}
function displayText(index){const entry=BookText[index];if(!entry)return "";if(entry.turn===-1||index>=overviewStart)return entry.text;const g=genFor(entry.turn);if(!g)return entry.text;return window.BookGen?.rows?.[index]?.[g-1]||entry.text}
const sentences=BookText.map(entry=>entry.text);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const book=$('#book'),sentenceNodes=[];
function heading(level,num,title,id){const h=el(level,'wiki-h');h.id=id;const fold=el('span','fold');fold.setAttribute('aria-hidden','true');const a=el('span','num',num+'.');a.onclick=e=>{e.stopPropagation();scrollToId('toc')};h.append(fold,a,el('span','title',title),el('span','edit','[편집]'));
 const body=el('div','wiki-sec');h.tabIndex=0;h.setAttribute('role','button');h.setAttribute('aria-expanded','true');const toggle=()=>{body.hidden=!body.hidden;h.classList.toggle('folded',body.hidden);h.setAttribute('aria-expanded',String(!body.hidden))};h.addEventListener('click',toggle);h.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();toggle()}});return [h,body]}
function scrollToId(id){const target=document.getElementById(id);if(target)book.scrollTo({top:target.offsetTop-12,behavior:'smooth'})}
const figureModes=['left','right','inline','left','right'];
function figure(code,caption,ratio){const mode=figureModes[Math.floor(Math.random()*figureModes.length)],f=el('span','fig fig-'+mode);f.title=caption;
 const width=mode==='inline'?64+Math.round(Math.random()*48):mode==='center'?30+Math.round(Math.random()*20):24+Math.round(Math.random()*16);
 f.style.width=mode==='inline'?width+'px':width+'%';if(mode==='center')f.style.marginLeft=Math.round(Math.random()*(100-width))+'%';
 f.style.aspectRatio=ratio||'4/5';
 const img=new Image();img.alt=caption;img.loading='lazy';img.src=`images/${code}.png`;img.onerror=()=>{const ph=el('span','ph');img.replaceWith(ph)};f.append(img);bindImageSteal(f,img,code,caption);return f}
const overviewStart=BookText.length;for(const t of window.WikiDoc.overview)BookText.push({text:t,lang:'ko',turn:-1,speaker:'개요',group:-1});
const firstLine=new Map();BookText.forEach((x,i)=>{if(!firstLine.has(x.speaker))firstLine.set(x.speaker,i)});
const charNames=(window.WikiDoc.characters||[]).map(c=>c.name).sort((a,b)=>b.length-a.length);
const charPattern=new RegExp('('+charNames.map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','g');
function charLink(name,label){const a=el('a','char',label||name);a.href='#';a.title=name;a.addEventListener('pointerdown',e=>e.stopPropagation());a.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();gotoCharacter(name)});return a}
function linkify(target,text){let last=0;text.replace(charPattern,(m,_,at)=>{if(at>last)target.append(document.createTextNode(text.slice(last,at)));target.append(charLink(m));last=at+m.length;return m});if(last<text.length)target.append(document.createTextNode(text.slice(last)))}
function gotoCharacter(name){const index=firstLine.get(name);const node=sentenceNodes[index];if(!node)return;
 for(let sec=node.closest('.wiki-sec');sec;sec=sec.parentElement.closest('.wiki-sec')){if(sec.hidden){sec.hidden=false;const h=sec.previousElementSibling;h?.classList.remove('folded');h?.setAttribute('aria-expanded','true')}}
 const r=node.getBoundingClientRect(),b=book.getBoundingClientRect();book.scrollTo({top:book.scrollTop+r.top-b.top-120,behavior:'smooth'});node.classList.remove('flash');void node.offsetWidth;node.classList.add('flash');setTimeout(()=>node.classList.remove('flash'),1600)}
function sentenceNode(entry,index){const text=displayText(index);const span=el('span','sentence');span.lang=entry.lang;span.tabIndex=0;span.setAttribute('role','button');span.setAttribute('aria-label',text+' 수집');const prefix=entry.speaker+': ';
 if(text.startsWith(prefix)){const who=el('b','who');linkify(who,entry.speaker);who.append(': ');span.append(who);linkify(span,text.slice(prefix.length))}else linkify(span,text);
 const collect=()=>steal(text,index);bindPress(span,text,index);span.addEventListener('click',e=>{if(span.suppressClick){span.suppressClick=false;e.preventDefault();return}collect()});span.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();collect()}});sentenceNodes[index]=span;return span}
function footnote(turn,speaker){const n=el('span','fn',`[${turn===0?'*':turn}]`);n.setAttribute('role','button');n.tabIndex=0;n.title=turn===0?'첫 무대 지시':`대사 ${turn} · ${speaker}`;n.onclick=()=>{const count=history.filter(h=>BookText[h.index]?.turn===turn).length;$('#noteText').textContent=`[${turn===0?'*':turn}] ${BookMeta.title} · ${turn===0?'첫 무대 지시':'대사 '+turn} · ${speaker}. 소포클레스가 신화에서 가져왔고, 프랜시스 스토어가 1912년 영어로 옮겼고, AI가 한국어로 옮겼다. 이 브라우저에서 이 대사를 가져간 횟수: ${count}.`;$('#note').showModal()};return n}
function render(){const W=window.WikiDoc,prose=$('#prose');
 const fold=(label)=>{const r=el('button','foldbar',label||'[ 펼치기 · 접기 ]');r.type='button';return r};
 {const nb=el('div','navbox');nb.append(el('div','navbox-title',W.navbox.title));const t=fold(),list=el('div','navbox-list');list.hidden=true;t.onclick=()=>{list.hidden=!list.hidden};
  for(const [name,year] of W.navbox.rows){const row=el('div','navbox-row');row.append(el('span','',name),el('span','',year));list.append(row)}nb.append(t,list);prose.append(nb)}
 const pair=el('div','top-pair');
 const toc=el('div','toc');toc.id='toc';const tt=el('button','toc-title');tt.type='button';tt.append(el('span','','목차'),el('span','toc-fold'));const tl=el('div','toc-list');tt.onclick=()=>{tl.hidden=!tl.hidden;toc.classList.toggle('folded',tl.hidden)};toc.append(tt,tl);
 const tocLine=(num,title,id,depth)=>{const d=el('div','d'+depth);const a=el('a');a.href='#'+id;a.onclick=e=>{e.preventDefault();scrollToId(id)};a.append(el('span','num',num+'.'),document.createTextNode(' '+title));d.append(a);tl.append(d)};
 tocLine('1','개요','s-1',0);tocLine('2','본문','s-2',0);W.sections.forEach((x,i)=>tocLine('2.'+(i+1),x.title,'s-2-'+(i+1),1));tocLine('3','관련 문서','s-3',0);
 const info=el('div','infobox'),I=W.infoTop,head=el('div','info-head');head.append(el('div','info-eyebrow',I.eyebrow),el('div','info-title',I.title),el('div','info-sub',I.sub.join('  |  ')));info.append(head);
 const pic=el('div','info-pic');pic.style.aspectRatio=I.ratio||'3/4';const img=new Image();img.alt=I.caption;img.src='images/00.png';img.onerror=()=>{img.replaceWith(el('span','ph'))};pic.append(img);bindImageSteal(pic,img,'00',I.caption);info.append(pic,el('div','info-caption',I.caption));
 const row=(k,v)=>{const r=el('div','info-row');const th=el('div','info-k',k),td=el('div','info-v');if(typeof v==='string')td.textContent=v;else td.append(...v);r.append(th,td);return r};
 const get=k=>(W.infobox.find(x=>x[0]===k)||[])[1]||'';
 info.append(row('작가',get('작가')),row('초연',get('초연')),row('장르',get('장르')));
 const ft=fold(),cast=el('div','info-cast');ft.onclick=()=>{cast.hidden=!cast.hidden};
 const castList=W.characters.map(c=>{const line=el('div','cast-line');line.append(charLink(c.name),el('small','',' ('+c.role+')'));return line});cast.append(row('등장인물',castList));info.append(ft,cast);
 info.append(row('영문 저본',get('영문 저본')),row('한국어 번역',get('한국어 번역')),row('문장 수',get('문장 수')));
 pair.append(toc,info);prose.append(pair);
 {const [h,b]=heading('h2','1','개요','s-1');prose.append(h,b);const ov=el('p');W.overview.forEach((t,k)=>{const i=overviewStart+k;ov.append(sentenceNode(BookText[i],i),document.createTextNode(' '))});b.append(ov)}
 const [mainH,mainB]=heading('h2','2','본문','s-2');prose.append(mainH,mainB);
 const byTurn=new Map();BookText.forEach((entry,index)=>{if(!byTurn.has(entry.turn))byTurn.set(entry.turn,[]);byTurn.get(entry.turn).push(index)});
 const figs=new Map(W.figures.map(f=>[f.after,f]));
 W.sections.forEach((s,i)=>{const [sh,sb]=heading('h3','2.'+(i+1),s.title,'s-2-'+(i+1));mainB.append(sh,sb);
  for(let turn=s.from;turn<=s.to;turn++){const list=byTurn.get(turn);if(!list)continue;const first=BookText[list[0]],p=el('p','turn'+(first.speaker==='지문'?' stage':''));
   const f=figs.get(turn),at=f?Math.floor(Math.random()*list.length):-1;
   list.forEach((index,k)=>{if(k===at)p.append(figure(f.code,f.caption,f.ratio));p.append(sentenceNode(BookText[index],index),document.createTextNode(' '))});p.append(footnote(turn,first.speaker));sb.append(p)}
 });
 {const [h,b]=heading('h2','3','관련 문서','s-3');prose.append(h,b);const rel=el('p');rel.textContent='오이디푸스 · 테이레시아스 · 이오카스테 · 자기 실현적 예언 · 오이디푸스 콤플렉스';b.append(rel)}
 updateMeta();
}
function updateMeta(){}
function draw(follow=false){const viewport=Math.max(400,Math.ceil((posterScroller.clientHeight||622)*840/438));if(canvas.height!==viewport)canvas.height=viewport;const height=Math.max(viewport,PrintFlow.height(flow));posterSurface.style.height=(height*posterScale)+'px';if(follow)posterScroller.scrollTop=Math.max(0,(height-viewport)*posterScale);const offset=(posterScroller.scrollTop||0)/posterScale;ctx.fillStyle=background;ctx.fillRect(0,0,840,canvas.height);ctx.save();ctx.translate(0,-offset);PrintFlow.paint(ctx,flow,offset,viewport);ctx.restore()}
posterScroller.addEventListener('scroll',()=>draw());window.addEventListener('resize',()=>draw());
function makeItem(text,index){
 const previous=items.filter(o=>o.index===index).at(-1),effects=PrintEffects.names.filter(name=>name!==previous?.effect);
 const item={text,index,ink:textInk,size:settings.size*840/440,blockWidth:Math.min(756,settings.width*840/440),intensity:settings.intensity,seed:Math.floor(Math.random()*1000000),effect:effects[Math.floor(Math.random()*effects.length)]};
 item.words=PrintFlow.words(text,item);return item;
}
function remember(item){history.push({text:item.text,index:item.index,ink:item.ink,effect:item.effect});sentenceNodes[item.index]?.classList.add('taken');updateMeta();nextPalette()}
function bindImageSteal(holder,img,code,caption){holder.classList.add('stealable');holder.tabIndex=0;holder.setAttribute('role','button');holder.setAttribute('aria-label',caption+' 사진 수집');
 const go=()=>{if(img.complete&&img.naturalWidth)stealImage(img,code,caption)};holder.addEventListener('click',e=>{e.stopPropagation();go()});holder.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();go()}})}
function stealImage(img,code,caption){const size=settings.size*840/440,drawH=Math.round(size*(2+Math.random()*1.6)),drawW=Math.min(560,Math.round(drawH*img.naturalWidth/img.naturalHeight));
 const cell=3+Math.floor(Math.random()*4),small=document.createElement('canvas');small.width=Math.max(1,Math.round(drawW/cell));small.height=Math.max(1,Math.round(drawH/cell));const x=small.getContext('2d');x.filter='grayscale(1) contrast(1.15)';x.drawImage(img,0,0,small.width,small.height);
 const token={text:'',image:small,drawW,drawH,width:Math.min(drawW,Math.round(size*(1.5+Math.random()*2))),gap:PrintFlow.width(' ',size),size,turn:0,ink:textInk};
 const item={text:`[사진 ${code}] ${caption}`,index:-1,ink:textInk,size,blockWidth:Math.min(756,settings.width*840/440),words:[token],effect:'IMAGE'};
 PrintFlow.append(flow,item);items.push(item);remember(item);delete item.words;draw(true)}
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
const genSelect=$("#genSelect");if(genSelect){genSelect.value=settings.gen;genSelect.addEventListener("change",()=>{settings.gen=genSelect.value;saveGen(settings.gen);reRender()})}
function reRender(){$("#prose").replaceChildren();sentenceNodes.length=0;render();for(const h of history)sentenceNodes[h.index]?.classList.add("taken")}
for(const key of ['size','width','intensity']){const input=$('#'+key+'Input'),output=$('#'+key+'Value');input.addEventListener('input',()=>{settings[key]=Number(input.value)/(key==='intensity'?100:1);output.textContent=input.value+(key==='intensity'?'%':'px')})}
function claim(){finishPress(true);receipt={id:crypto.randomUUID().slice(0,8).toUpperCase(),count:history.length,printFlow:PrintFlow.clone(flow),ink:textInk,background,entries:history.map(h=>({...h})),date:new Date().toLocaleString('en-GB',{hour12:false})};
 receipt.printFlow.rows=receipt.printFlow.rows.map(row=>({...row,tokens:row.tokens.map(token=>({...token,tile:null,staticTile:null,ink:receipt.ink}))}));
 $('#receiptDialog').showModal();PrintReceipt.start($('#receiptRibbon'),receipt);
}

// The receipt prints only when the reader reaches the end of the play.
const receiptOpen=()=>$('#receiptDialog').open;
function settleOnLeave(){if(history.length&&!receiptOpen())claim()}
// The play ends: reaching the bottom of the document settles the account.
new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))settleOnLeave()},{root:book,threshold:.6}).observe(document.querySelector('.wiki-foot'));

document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#receiptDialog').addEventListener('close',()=>PrintReceipt.stop());
function download(url,name){const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove()}$('#savePoster').onclick=async()=>{const button=$('#savePoster');button.disabled=true;try{const result=await PrintExport.make(receipt);const url=URL.createObjectURL(result.blob);download(url,`ST0L3N_${receipt.id}.${result.extension}`);setTimeout(()=>URL.revokeObjectURL(url),60000)}finally{button.disabled=false;draw()}};$('#saveReceipt').onclick=async()=>{const button=$('#saveReceipt');button.disabled=true;try{const result=await PrintReceipt.export(receipt);const url=URL.createObjectURL(result.blob);download(url,`RECEIPT_${receipt.id}.${result.extension}`);setTimeout(()=>URL.revokeObjectURL(url),60000)}finally{button.disabled=false}};
setPalette(0);render();draw();document.fonts.ready.then(()=>{for(const row of flow.rows)for(const token of row.tokens)delete token.tile;draw()});
