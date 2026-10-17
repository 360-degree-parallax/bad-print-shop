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
// Every sentence taken leaves its next, more damaged copy behind in the document (content-gen.js, built by tools/compress.mjs).
const BUILD="202610171217";
// A new build may change what each sentence's saves are; takes stored by an older build are dropped.
try{if(localStorage.getItem("bp-build")!==BUILD){localStorage.removeItem("bp-takes");localStorage.setItem("bp-build",BUILD)}}catch(e){}
const TAKE_KEY="bp-takes";
const takes=(()=>{try{return JSON.parse(localStorage.getItem(TAKE_KEY)||"{}")||{}}catch(e){return {}}})();
const saveTakes=()=>{try{localStorage.setItem(TAKE_KEY,JSON.stringify(takes))}catch(e){}};
// Distinct versions only: a take always leaves a copy that differs from the one taken.
const versionCache=new Map();
function versions(index){if(!versionCache.has(index)){const list=[BookText[index].text];for(const g of window.BookGen?.rows?.[index]||[])if(g&&g!==list.at(-1))list.push(g);versionCache.set(index,list)}return versionCache.get(index)}
// Some sentences are already in circulation: they open as a 5th/10th/15th save and go on from there.
function startOf(index){const g=window.BookGen?.start?.[index];if(!g)return 0;const v=versions(index),t=window.BookGen.rows[index][g-1];const k=v.indexOf(t);return k<0?Math.min(g,v.length-1):k}
function displayText(index){const entry=BookText[index];if(!entry)return "";const v=versions(index);return withCount(v[Math.min(startOf(index)+(takes[index]||0),v.length-1)])}
// {n}: the overview reports the live count of untouched sentences, in whatever state the sentence itself is in.
function withCount(text){return text.includes("{n}")?text.split("{n}").join(originalCount().toLocaleString("ko-KR")):text}
function originalCount(){let n=0;for(let i=0;i<overviewStart;i++)if(!takes[i]&&!startOf(i))n++;return n}
function updateOriginalCount(){const n=document.getElementById("originalCount");if(n)n.textContent=originalCount().toLocaleString("ko-KR");for(let i=overviewStart;i<BookText.length;i++){const span=sentenceNodes[i];if(span&&versions(i).some(t=>t.includes("{n}")))fillSentence(span,BookText[i],displayText(i))}}
function fillSentence(span,entry,text){span.replaceChildren();span.setAttribute("aria-label",text+" 수집");const m=text.match(/^([^:\s〈][^:]{0,11}): /);
 if(m){const who=el("b","who");linkify(who,m[1]);who.append(": ");span.append(who);linkify(span,text.slice(m[0].length))}else linkify(span,text)}
function degrade(index){if(index<0||index>=BookText.length)return;takes[index]=(takes[index]||0)+1;saveTakes();const span=sentenceNodes[index];if(span)fillSentence(span,BookText[index],displayText(index));updateOriginalCount()}
const sentences=BookText.map(entry=>entry.text);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const book=$('#book'),sentenceNodes=[];
function heading(level,num,title,id){const h=el(level,'wiki-h');h.id=id;const fold=el('span','fold');fold.setAttribute('aria-hidden','true');const a=el('span','num',num+'.');a.onclick=e=>{e.stopPropagation();scrollToId('toc')};h.append(fold,a,el('span','title',title),el('span','edit','[편집]'));
 const body=el('div','wiki-sec');h.tabIndex=0;h.setAttribute('role','button');h.setAttribute('aria-expanded','true');const toggle=()=>{body.hidden=!body.hidden;h.classList.toggle('folded',body.hidden);h.setAttribute('aria-expanded',String(!body.hidden))};h.addEventListener('click',toggle);h.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();toggle()}});return [h,body]}
function scrollToId(id){const target=document.getElementById(id);if(target)book.scrollTo({top:target.offsetTop-12,behavior:'smooth'})}
const figureModes=['left','right','inline','left','right'];
function figure(code,caption,ratio){const mode=figureModes[Math.floor(Math.random()*figureModes.length)],f=el('span','fig fig-'+mode);f.title=caption;f.dataset.cap=caption;
 const width=mode==='inline'?128+Math.round(Math.random()*64):mode==='center'?48+Math.round(Math.random()*24):40+Math.round(Math.random()*18);
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
function sentenceNode(entry,index){const span=el("span","sentence");span.lang=entry.lang;span.tabIndex=0;span.setAttribute("role","button");fillSentence(span,entry,displayText(index));
 const collect=()=>steal(displayText(index),index);bindPress(span,()=>displayText(index),index);span.addEventListener("click",e=>{if(span.suppressClick){span.suppressClick=false;e.preventDefault();return}collect()});span.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();collect()}});sentenceNodes[index]=span;return span}
// Critical apparatus: damaged sentences of this turn are recorded as cruxes or as variant readings of other manuscripts.
const UNREADABLE=/[■□\uFFFD]|&#\d+;|[\u00C0-\u00FF\u2122\u2022]|[\u4E00-\u9FFF]/;
const ro=w=>{const c=(w.at(-1)||'').charCodeAt(0)-0xAC00;if(c<0||c>11171)return '로';const j=c%28;return j===0||j===8?'로':'으로'};
function apparatus(turn){const strip=t=>t.replace(/^([^:\s〈][^:]{0,11}): /,''),clean=w=>(w||'').replace(/^[〈"“‘(]+|[〉"”’).,!?;:]+$/g,''),lines=[];
 for(let i=0;i<overviewStart&&lines.length<3;i++){if(BookText[i].turn!==turn)continue;const o=strip(BookText[i].text),c=strip(displayText(i));if(o===c)continue;
  const m=c.match(UNREADABLE);if(m){const a=Math.max(0,m.index-3);lines.push(`†${c.slice(a,a+9)}† 판독 불가. 다른 사본에는 이 행이 없다.`);continue}
  let d=0;while(d<o.length&&o[d]===c[d])d++;const ws=o.lastIndexOf(' ',d-1)+1,w=clean(o.slice(ws).split(' ')[0]),v=clean(c.slice(ws).split(' ')[0]);
  if(w&&v&&w!==v)lines.push(`사본 L에는 ‘${w}’${ro(w)}, 사본 V에는 ‘${v}’${ro(v)} 되어 있다.`)}
 return lines.length?'\n\n'+lines.join('\n'):''}
function footnote(turn,speaker){const n=el('span','fn',`[${turn===0?'*':turn}]`);n.setAttribute('role','button');n.tabIndex=0;n.title=turn===0?'첫 무대 지시':`대사 ${turn} · ${speaker}`;n.onclick=()=>{const text=BookText.slice(0,overviewStart).filter(e=>e.turn===turn).map(e=>e.text).join(' ');$('#noteText').textContent=`[${turn===0?'*':turn}] ${BookMeta.title} · ${turn===0?'첫 무대 지시':'대사 '+turn} · ${speaker}\n\n`+Footnotes.build(turn,text,turn===0?'무대 지시':speaker)+apparatus(turn);$('#note').showModal()};return n}
function render(){const W=window.WikiDoc,prose=$('#prose');
 const fold=(label)=>{const r=el('button','foldbar',label||'[ 펼치기 · 접기 ]');r.type='button';return r};
 {const nb=el('div','navbox');nb.append(el('div','navbox-title',W.navbox.title));const t=fold(),list=el('div','navbox-list');list.hidden=true;t.onclick=()=>{list.hidden=!list.hidden};
  for(const [name,year] of W.navbox.rows){const row=el('div','navbox-row');row.append(el('span','',name),el('span','',year));list.append(row)}nb.append(t,list);prose.append(nb)}
 const pair=el('div','top-pair');
 const toc=el('div','toc');toc.id='toc';const tt=el('button','toc-title');tt.type='button';tt.append(el('span','','목차'),el('span','toc-fold'));const tl=el('div','toc-list');tt.onclick=()=>{tl.hidden=!tl.hidden;toc.classList.toggle('folded',tl.hidden)};toc.append(tt,tl);
 const tocLine=(num,title,id,depth)=>{const d=el('div','d'+depth);const a=el('a');a.href='#'+id;a.onclick=e=>{e.preventDefault();scrollToId(id)};a.append(el('span','num',num+'.'),el('span','t',title.replace(/ /g,'\u00A0')));d.append(a);tl.append(d)};
 tocLine('1','개요','s-1',0);tocLine('2','본문','s-2',0);W.sections.forEach((x,i)=>tocLine('2.'+(i+1),x.title,'s-2-'+(i+1),1));tocLine('3','관련 문서','s-3',0);
 const info=el('div','infobox'),I=W.infoTop;
 const pic=el('div','info-pic');pic.dataset.cap=I.caption;pic.style.aspectRatio=I.ratio||'3/4';const img=new Image();img.alt=I.caption;img.src='images/00.png';img.onerror=()=>{img.replaceWith(el('span','ph'))};pic.append(img);bindImageSteal(pic,img,'00',I.caption);info.append(pic);
 const row=(k,v)=>{const r=el('div','info-row');const th=el('div','info-k',k),td=el('div','info-v');if(typeof v==='string')td.textContent=v;else td.append(...v);r.append(th,td);return r};
 const get=k=>(W.infobox.find(x=>x[0]===k)||[])[1]||'';
 info.append(row('작가',get('작가')),row('초연',get('초연')),row('장르',get('장르')));
 // the cast list is not shown; character names in the text still link to their first line
 info.append(row('영문 저본',get('영문 저본')),row('한국어 번역',get('한국어 번역')),row('원문 일치',[Object.assign(el('span','',originalCount().toLocaleString('ko-KR')),{id:'originalCount'})]));
 pair.append(toc,info);prose.append(pair);
 {const [h,b]=heading('h2','1','개요','s-1');prose.append(h,b);const ov=el('p');W.overview.forEach((t,k)=>{const i=overviewStart+k;ov.append(sentenceNode(BookText[i],i));if(t.includes('{n}')&&W.overviewNote){const fn=el('span','fn','[1]');fn.setAttribute('role','button');fn.tabIndex=0;fn.onclick=()=>{$('#noteText').textContent=W.overviewNote;$('#note').showModal()};ov.append(fn)}ov.append(document.createTextNode(' '))});b.append(ov)}
 const [mainH,mainB]=heading('h2','2','본문','s-2');prose.append(mainH,mainB);
 const byTurn=new Map();BookText.forEach((entry,index)=>{if(!byTurn.has(entry.turn))byTurn.set(entry.turn,[]);byTurn.get(entry.turn).push(index)});
 const figs=new Map(W.figures.map(f=>[f.after,f]));
 W.sections.forEach((s,i)=>{const [sh,sb]=heading('h3','2.'+(i+1),s.title,'s-2-'+(i+1));mainB.append(sh,sb);
  for(let turn=s.from;turn<=s.to;turn++){const list=byTurn.get(turn);if(!list)continue;const first=BookText[list[0]],p=el('p','turn'+(first.speaker==='지문'?' stage':''));
   const f=figs.get(turn),at=f?Math.floor(Math.random()*list.length):-1;
   list.forEach((index,k)=>{if(k===at)p.append(figure(f.code,f.caption,f.ratio));p.append(sentenceNode(BookText[index],index),document.createTextNode(' '))});p.append(footnote(turn,first.speaker));sb.append(p)}
 });
 {const [h,b]=heading('h2','3','관련 문서','s-3');prose.append(h,b);const rel=el('p');rel.textContent='오이디푸스 · 테이레시아스 · 이오카스테 · 자기 실현적 예언 · 오이디푸스 콤플렉스';b.append(rel)}
 {const foot=document.querySelector('.wiki-foot');if(foot&&W.history){const box=el('div','doc-history');box.append(el('p','doc-history-title','문서 역사'));for(const [y,t] of W.history){const r=el('p');r.append(el('span','y',y),document.createTextNode(' '+t));box.append(r)}foot.prepend(box)}}
 updateMeta();
}
// The receipt has been printing since the first take: its tail grows out of the bottom edge of the
// screen with every take (the real print, top first). From half a sheet the tail can be pulled to print.
// Near the end of the sheet the poster gets the hatched end-of-roll mark that thermal paper carries.
const SHEET=14,SESSION_ID=crypto.randomUUID().slice(0,8).toUpperCase(),tail=document.getElementById("receiptTail");
// where each take ended on the poster, in poster units, so the end-of-roll mark stays on the stretch it was printed on
const takeEnds=[];
// The receipt starts printing at the first take, so its date and time are that moment's and never change.
let printedAt=null;
function receiptState(){if(!printedAt)printedAt=new Date().toLocaleString("en-GB",{hour12:false});return {id:SESSION_ID,count:history.length,entries:history.map(h=>({...h})),date:printedAt,background}}
// The tail is the receipt itself on its track, as far out as it has been printed so far. It slides out to
// its new length over a moment after each take, the way the paper is pushed out of the printer.
let tailBmp=null,tailShown=0,tailAnim=0;
function updateMeta(){if(!tail)return;const used=history.length;tail.hidden=!used;if(!used)return;tail.classList.toggle("pullable",used>=SHEET/2);
 const s=receiptState(),l=PrintReceipt.layout(s);tailBmp=PrintReceipt.print(l,parseInt(SESSION_ID,16)||1);
 tailLead=Math.round(PrintReceipt.cutOf(l));   // the foot (TOTAL) stays inside the printer until the receipt is pulled
 cancelAnimationFrame(tailAnim);const from=tailShown,to=tailLead,t0=performance.now(),dur=Math.max(300,(to-from)/150*1000);
 const step=t=>{const k=Math.min(1,(t-t0)/dur);tailShown=from+(to-from)*k;PrintReceipt.tail(tail,tailBmp,tailShown);if(k<1)tailAnim=requestAnimationFrame(step)};tailAnim=requestAnimationFrame(step)}
window.addEventListener("resize",()=>{if(tailBmp&&!tail.hidden)PrintReceipt.tail(tail,tailBmp,tailShown)});
let tailLead=0;
function draw(follow=false){const viewport=Math.max(400,Math.ceil((posterScroller.clientHeight||622)*840/438));if(canvas.height!==viewport)canvas.height=viewport;const height=Math.max(viewport,PrintFlow.height(flow));posterSurface.style.height=(height*posterScale)+'px';if(follow)posterScroller.scrollTop=Math.max(0,(height-viewport)*posterScale);const offset=(posterScroller.scrollTop||0)/posterScale;ctx.fillStyle=background;ctx.fillRect(0,0,840,canvas.height);ctx.save();ctx.translate(0,-offset);PrintFlow.paint(ctx,flow,offset,viewport);ctx.restore();paintDefects(offset,canvas.height);paintEndMark(canvas.height)}
// The poster's own print faults, fixed to the paper so they scroll with it: motor banding at a regular pitch
// and lines where the supply sagged and the ink came out weak.
function paintDefects(offset,h){ctx.save();ctx.fillStyle=background;const pitch=47;for(let y=-((offset%pitch)+pitch)%pitch;y<h;y+=pitch){ctx.globalAlpha=.42;ctx.fillRect(0,y,840,3)}
 const strip=36;for(let y=-(offset%strip);y<h;y+=strip){const k=Math.floor((y+offset)/strip),r=Math.abs(Math.sin(k*12.9898)*43758.5453)%1;if(r<.07){ctx.globalAlpha=.5;ctx.fillRect(0,y,840,strip)}}ctx.restore()}
function paintEndMark(h){const offset=(posterScroller.scrollTop||0)/posterScale;ctx.save();ctx.strokeStyle='#9A9A9A';ctx.lineWidth=5;
 for(let k=SHEET-5;k<takeEnds.length;k++){const top=(takeEnds[k-1]||0)-offset,bottom=takeEnds[k]-offset;if(bottom<0||top>h)continue;ctx.save();ctx.globalAlpha=.55*Math.min(1,(k-(SHEET-6))/5);ctx.beginPath();ctx.rect(840-22,top,22,bottom-top);ctx.clip();for(let y=top-40;y<bottom+40;y+=14){ctx.beginPath();ctx.moveTo(840-30,y+30);ctx.lineTo(848,y-8);ctx.stroke()}ctx.restore()}
 ctx.restore()}
posterScroller.addEventListener('scroll',()=>draw());window.addEventListener('resize',()=>draw());
function makeItem(text,index){
 const previous=items.filter(o=>o.index===index).at(-1),effects=PrintEffects.names.filter(name=>name!==previous?.effect);
 const item={text,index,ink:textInk,size:settings.size*840/440,blockWidth:Math.min(756,settings.width*840/440),intensity:settings.intensity,seed:Math.floor(Math.random()*1000000),effect:effects[Math.floor(Math.random()*effects.length)]};
 item.words=PrintFlow.words(text,item);return item;
}
// Every take is heard as a thermal print: one of four recordings, never the same one twice in a row.
const printSounds=[1,2,3,4].map(i=>{const a=new Audio(`assets/sound/print-${i}.mp3`);a.preload="auto";return a});let lastSound=-1;
// While the receipt is printing, the four recordings follow one another without a gap (each starts a
// moment before the last one ends) until the paper stops.
let printLoop=0;
function startPrintLoop(){stopPrintLoop();const next=()=>{playPrint();printLoop=setTimeout(next,2780)};next()}
function stopPrintLoop(){clearTimeout(printLoop);printLoop=0;for(const a of playing)a.pause();playing.clear()}
const playing=new Set();
function playPrint(){let i=Math.floor(Math.random()*printSounds.length);if(i===lastSound)i=(i+1)%printSounds.length;lastSound=i;const a=printSounds[i].cloneNode();a.volume=.7;playing.add(a);a.onended=()=>playing.delete(a);a.play().catch(()=>{})}
function remember(item){playPrint();history.push({text:item.text,index:item.index,ink:item.ink,effect:item.effect});takeEnds.push(PrintFlow.height(flow));degrade(item.index);updateMeta();nextPalette()}
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
function bindPress(element,text,index){const textOf=typeof text==='function'?text:()=>text;
 element.addEventListener('pointerdown',e=>{if(e.button!==0)return;finishPress(false);element.suppressClick=false;
 const p=press={element,text,index,pointerId:e.pointerId};element.setPointerCapture?.(e.pointerId);
 p.timer=setTimeout(()=>{if(press!==p)return;p.slot=items.length;p.base=PrintFlow.clone(flow);const item=makeItem(textOf(),index);items.push(item);PrintFlow.append(flow,item);draw(true);
 p.cycle=setInterval(()=>{items[p.slot]=makeItem(textOf(),index);flow=PrintFlow.clone(p.base);PrintFlow.append(flow,items[p.slot]);draw(true)},240)},380);
 });
 element.addEventListener('pointerup',e=>{if(press?.element===element&&press.pointerId===e.pointerId)finishPress(true)});
 element.addEventListener('pointercancel',()=>{if(press?.element===element)finishPress(false)});
 element.addEventListener('contextmenu',e=>e.preventDefault());
}
window.addEventListener('blur',()=>finishPress(false));
document.addEventListener('visibilitychange',()=>{if(document.hidden)finishPress(false)});
document.addEventListener('keydown',e=>{if(e.key===','&&!document.querySelector('dialog[open]'))$('#settingsDialog').showModal()});
for(const key of ['size','width','intensity']){const input=$('#'+key+'Input'),output=$('#'+key+'Value');input.addEventListener('input',()=>{settings[key]=Number(input.value)/(key==='intensity'?100:1);output.textContent=input.value+(key==='intensity'?'%':'px')})}
function claim(){finishPress(true);if(tail)tail.hidden=true;receipt={lead:tailLead,id:SESSION_ID,count:history.length,printFlow:PrintFlow.clone(flow),ink:textInk,background,entries:history.map(h=>({...h})),date:receiptState().date};
 receipt.printFlow.rows=receipt.printFlow.rows.map(row=>({...row,tokens:row.tokens.map(token=>({...token,tile:null,staticTile:null,ink:receipt.ink}))}));
 $('#receiptDialog').showModal();PrintReceipt.start($('#receiptRibbon'),receipt,{begin:startPrintLoop,done:stopPrintLoop});
}

// The receipt prints only when the reader reaches the end of the play.
const receiptOpen=()=>$('#receiptDialog').open;
function settleOnLeave(){if(history.length&&!receiptOpen())claim()}
// The play ends: reaching the bottom of the document settles the account.
new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))settleOnLeave()},{threshold:.6}).observe(document.querySelector('.wiki-foot'));

document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#receiptDialog').addEventListener('close',()=>PrintReceipt.stop());
function download(url,name){const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove()}$('#savePoster').onclick=async()=>{const button=$('#savePoster');button.disabled=true;try{const result=await PrintExport.make(receipt);const url=URL.createObjectURL(result.blob);download(url,`ST0L3N_${receipt.id}.${result.extension}`);setTimeout(()=>URL.revokeObjectURL(url),60000)}finally{button.disabled=false;draw()}};$('#saveReceipt').onclick=async()=>{const button=$('#saveReceipt');button.disabled=true;try{const result=await PrintReceipt.export(receipt);const url=URL.createObjectURL(result.blob);download(url,`RECEIPT_${receipt.id}.${result.extension}`);setTimeout(()=>URL.revokeObjectURL(url),60000)}finally{button.disabled=false}};
setPalette(0);render();draw();document.fonts.ready.then(()=>{for(const row of flow.rows)for(const token of row.tokens)delete token.tile;draw()});
// the tail canvas lets pointer events through; the paper itself is hit-tested against its track
document.addEventListener("click",e=>{if(!tail||tail.hidden||!tail.classList.contains("pullable")||receiptOpen())return;if(PrintReceipt.onTail(e.clientX,e.clientY,tailShown)){e.preventDefault();e.stopPropagation();claim()}},true);
document.addEventListener("mousemove",e=>{if(!tail||tail.hidden)return;const on=tail.classList.contains("pullable")&&!receiptOpen()&&PrintReceipt.onTail(e.clientX,e.clientY,tailShown);document.documentElement.classList.toggle("over-tail",on)});
$('#receiptDialog').addEventListener('close',()=>updateMeta());
updateMeta();
