'use strict';
// The receipt is a plain shop receipt. Everything that goes wrong happens in the printing:
// a low-resolution 1-bit thermal head that bleeds more as it heats up, dead dots, uneven
// pressure and paper that slips in the feed. The ribbon on screen and the saved PNG are the same print.
window.PrintReceipt=(()=>{
 let frame=0,current=null;
 const complement=hex=>'#'+hex.slice(1).match(/../g).map(v=>(255-parseInt(v,16)).toString(16).padStart(2,'0')).join('');
 const LAYOUT_W=360,DOTS=180,K=DOTS/LAYOUT_W,SHOW_W=240,FONT='600 18px Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", monospace';
 const PAPER='#EFEFEC',INK=[24,24,22];

 /* ---------- content ---------- */
 function layout(s){const rows=[];let y=40;
  const add=(text,kind='text',step=28,extra)=>{rows.push({text,y,kind,...extra});y+=step};
  const [date,time]=String(s.date).split(/,\s*/);
  add('#'+s.id,'text',30);add(date||'','pair',34,{right:time||''});add('','rule',26);
  const measure=document.createElement('canvas').getContext('2d');measure.font=FONT;
  s.entries.forEach((entry,i)=>{const prefix=String(i+1).padStart(2,'0')+'. ';let line=prefix;
   for(const word of String(entry.text).split(/\s+/)){for(const ch of Array.from(word+' ')){if(measure.measureText(line+ch).width>LAYOUT_W-56){add(line.trimEnd(),'text',28,{item:i});line='    '}line+=ch}}
   if(line.trim())add(line.trimEnd(),'text',28,{item:i});y+=8});
  add('','rule',30);add(String(s.count),'total',38);add('*'.repeat(30),'stars',30);
  return {rows,height:y+40,width:LAYOUT_W,count:s.count||0};
 }
 function drawRow(x,r){x.fillStyle='#000';x.font=FONT;x.textBaseline='top';
  if(r.kind==='rule'){let t='-';while(x.measureText(t+'-').width<=LAYOUT_W-48)t+='-';x.fillText(t,24,0);return}
  if(r.kind==='stars'){let t='*';while(x.measureText(t+'*').width<=LAYOUT_W-48)t+='*';x.fillText(t,24,0);return}
  if(r.kind==='pair'){x.fillText(r.text,24,0);x.fillText(r.right,LAYOUT_W-24-x.measureText(r.right).width,0);return}
  if(r.kind==='total'){x.fillText('TOTAL',24,0);x.fillText(r.text,LAYOUT_W-24-x.measureText(r.text).width,0);return}
  x.fillText(r.text,24,0)}

 /* ---------- the print ---------- */
 // Every fault is tied to a position on the paper (a hash of the seed and the dot), never to how much
 // has been printed since: lines already printed keep the faults they got, whatever is added below them.
 function rng(seed){let n=seed>>>0||1;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296}}
 function hash(seed,a,b=0,c=0){let h=(seed^Math.imul(a+1,374761393)^Math.imul(b+1,668265263)^Math.imul(c+1,2246822519))>>>0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296}
 function print(l,seed){
  const H=Math.ceil(l.height*K),src=document.createElement('canvas');src.width=DOTS;src.height=H;
  const sx=src.getContext('2d');sx.fillStyle='#fff';sx.fillRect(0,0,DOTS,H);sx.save();sx.scale(K,K);
  for(const r of l.rows){sx.save();sx.translate(0,r.y);drawRow(sx,r);sx.restore()}sx.restore();
  const data=sx.getImageData(0,0,DOTS,H).data,ink=new Float32Array(DOTS*H);
  for(let i=0;i<DOTS*H;i++)ink[i]=1-data[i*4]/255;
  const random=rng(seed),dead=new Set([...Array(2+Math.floor(random()*3))].map(()=>Math.floor(18+random()*(DOTS-36))));
  const BAND=21+Math.floor(random()*6),LINE=14,skew=(random()<.5?-1:1)/(160+random()*120);
  const dots=new Uint8Array(DOTS*H);let printed=0;
  for(let y=0;y<H;y++){
   const heat=1-Math.exp(-printed/45000);                 // the head warms with every dot it has burned
   const k=Math.floor(y/LINE),sag=hash(seed,k,7)<.07?.45+hash(seed,k,8)*.25:1;   // A1 brownout: whole lines print weak
   const strength=sag*((y%BAND)<2?.6:1);                 // A2 motor banding at a regular pitch
   for(let x=0;x<DOTS;x++){const i=y*DOTS+x;let sum=0,n=0;
    for(let dy=-1;dy<=0;dy++)for(let dx=-1;dx<=1;dx++){const yy=y+dy,xx=x+dx;if(yy<0||xx<0||xx>=DOTS)continue;sum+=ink[yy*DOTS+xx];n++}
    let v=Math.max(ink[i],(sum/n)*(.55+1.25*heat))*strength;   // bleed into what was just burned (never into lines not printed yet)
    if(y>0)v+=heat*.35*ink[i-DOTS];                       // smear along the feed
    const pressure=.42+.22*Math.pow(x/DOTS,3)+.08*Math.sin(y/37+seed%7);   // weaker on one side
    const on=v>pressure+(hash(seed,x,y,1)-.5)*.22&&!dead.has(x)&&hash(seed,x,y,2)>.025;
    dots[i]=on?1:0;if(on)printed++}
  }
  // A3 head debris: a thin black line dragged down a fixed stretch of the paper
  for(let k=0,n=1+Math.floor(hash(seed,3)*2);k<n;k++){const x=Math.floor(10+hash(seed,k,4)*(DOTS-20)),y0=Math.floor(60+hash(seed,k,5)*500),y1=Math.min(H,y0+Math.floor(160+hash(seed,k,6)*700));for(let y=y0;y<y1;y++)if(hash(seed,x,y,3)>.08)dots[y*DOTS+x]=1}
  // A6 end-of-roll stripe: from the tenth item on, each item printed carries a denser hatch on one edge
  for(const r of l.rows){if(r.item==null||r.item<9)continue;const y0=Math.floor(r.y*K),y1=Math.min(H,Math.floor((r.y+28+8)*K)),dense=Math.min(4,1+Math.floor((r.item-9)/2));
   for(let y=y0;y<y1;y++)for(let x=DOTS-9;x<DOTS-1;x++)if(((x+y)%7)<dense)dots[y*DOTS+x]=1}
  // the feed: rows slip (stretched), skip, shift sideways for a moment, drift (A4 skew), or go through twice (A5)
  const out=[];let shift=0,band=0;
  for(let y=0;y<H;y++){const r=hash(seed,y,9);
   if(band>0)band--;else shift=0;
   if(r<.004){shift=hash(seed,y,10)<.5?-2:2;band=4+Math.floor(hash(seed,y,11)*8)}
   if(r>.997)continue;
   const drift=Math.round(y*skew);
   const reps=r>.992?3+Math.floor(hash(seed,y,12)*4):1;
   for(let k=0;k<reps;k++)out.push([y,shift+drift,null]);
   if(r>.9955&&r<=.997&&y>12){const back=6+Math.floor(hash(seed,y,13)*8),off=1+Math.floor(hash(seed,y,14)*3);for(let k=back;k>0;k--)out.push([y-k,shift+drift+off,y])}}
  const c=document.createElement('canvas');c.width=DOTS;c.height=out.length;const cx=c.getContext('2d'),img=cx.createImageData(DOTS,out.length),p=img.data;
  const paper=PAPER.slice(1).match(/../g).map(v=>parseInt(v,16));
  out.forEach(([y,s,over],oy)=>{const fade=.88+.12*hash(seed,y,15);for(let x=0;x<DOTS;x++){const sxp=x-s,o=(oy*DOTS+x)*4,ghost=over!=null&&dots[over*DOTS+x],on=ghost||(sxp>=0&&sxp<DOTS&&dots[y*DOTS+sxp]);
   for(let ch=0;ch<3;ch++)p[o+ch]=on?Math.round(INK[ch]+(paper[ch]-INK[ch])*(1-fade)*.6):paper[ch];p[o+3]=255}});
  cx.putImageData(img,0,0);return c;
 }

 /* ---------- the ribbon ---------- */
 // Released, the receipt is laid out the way it first was: top first, along a wandering curve, folding
 // where the curve turns tight. The curve starts at the bottom-right corner, where the tail came out.
 const TAIL_DEG=35;
 function cutOf(l){const rules=l.rows.filter(r=>r.kind==='rule');return (rules[1]?rules[1].y:l.height)*K*(SHOW_W/DOTS)}
 // The paper runs straight until there is nowhere left to go, then folds like real paper: two creases close
 // together (the back of the paper shows for a moment between them), and it runs straight again in the new
 // direction, print side up. Pieces laid later lie on top of earlier ones.
 const FEED=150;   // px per second, about the pace of a small thermal printer
 function folds(w,h,length,seed){let n=seed>>>0;const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};
  const rad=TAIL_DEG*Math.PI/180,m=150,inside=(x,y)=>x>=m&&x<=w-m&&y>=m&&y<=h-m,rot=(v,a)=>({x:v.x*Math.cos(a)-v.y*Math.sin(a),y:v.x*Math.sin(a)+v.y*Math.cos(a)});
  let p={x:w+30,y:h+30},d={x:-Math.sin(rad),y:-Math.cos(rad)},s0=0,entered=false;const segs=[];let crease={x:-d.y,y:d.x};
  const room=(q,v)=>{let k=0;while(k<3000){const x=q.x+v.x*(k+6),y=q.y+v.y*(k+6);if(!inside(x,y))break;k+=6}return k};
  while(s0<length+200&&segs.length<60){let len=0;
   while(len<6000){const x=p.x+d.x*(len+6),y=p.y+d.y*(len+6);if(inside(x,y))entered=true;if(entered&&!inside(x,y))break;len+=6}
   len=Math.max(len,40);const seg={p,d,len,s0,back:false,c0:crease};segs.push(seg);s0+=len;p={x:p.x+d.x*len,y:p.y+d.y*len};
   const T=(115+random()*50)*Math.PI/180,sign=room(p,rot(d,-T))>=room(p,rot(d,T))?-1:1,d1=rot(d,sign*T/2),d2=rot(d,sign*T),mid=SHOW_W*(.35+random()*.25);
   const n1=(a,b)=>{const x=a.x+b.x,y=a.y+b.y,l=Math.hypot(x,y)||1;return {x:x/l,y:y/l}};
   seg.c1=n1(d,d1);segs.push({p,d:d1,len:mid,s0,back:true,c0:seg.c1,c1:n1(d1,d2)});s0+=mid;p={x:p.x+d1.x*mid,y:p.y+d1.y*mid};
   crease=n1(d1,d2);d=d2}
  return segs;
 }
 const scale=SHOW_W/DOTS,lengthOf=bmp=>bmp.height*scale;
 const cross=(a,b)=>a.x*b.y-a.y*b.x;
 // the corners of one straight piece: its two edges cut by the crease at each end
 function corners(seg,len){const half=SHOW_W/2,nrm={x:-seg.d.y,y:seg.d.x},end={x:seg.p.x+seg.d.x*len,y:seg.p.y+seg.d.y*len},c1=len<seg.len?nrm:(seg.c1||nrm);
  const hit=(off,q,c)=>{const e={x:seg.p.x+nrm.x*off,y:seg.p.y+nrm.y*off},t=cross({x:q.x-e.x,y:q.y-e.y},c)/(cross(seg.d,c)||1e-6);return {x:e.x+seg.d.x*t,y:e.y+seg.d.y*t}};
  return [hit(half,seg.p,seg.c0),hit(half,end,c1),hit(-half,end,c1),hit(-half,seg.p,seg.c0)]}
 function render(c,bmp,segs,revealed,w,h){const x=c.getContext('2d'),ratio=c.width/w;x.setTransform(ratio,0,0,ratio,0,0);x.clearRect(0,0,w,h);x.imageSmoothingEnabled=false;
  const end=Math.min(lengthOf(bmp),revealed),half=SHOW_W/2;
  for(const seg of segs){if(seg.s0>=end)break;const len=Math.min(seg.len,end-seg.s0),poly=corners(seg,len);
   x.save();x.beginPath();poly.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));x.closePath();
   x.shadowColor='rgba(0,0,0,.35)';x.shadowBlur=6;x.fillStyle=seg.back?'#DCDCD6':PAPER;x.fill();x.shadowColor='transparent';x.clip();
   // print from a little before to a little after this piece, clipped to it (the creases cut it)
   const ang=Math.atan2(seg.d.y,seg.d.x)-Math.PI/2,from=Math.max(0,seg.s0-half),to=Math.min(lengthOf(bmp),seg.s0+len+half);
   x.translate(seg.p.x,seg.p.y);x.rotate(ang);if(seg.back){x.globalAlpha=.07;x.scale(-1,1)}
   x.drawImage(bmp,0,from/scale,DOTS,(to-from)/scale,-half,from-seg.s0,SHOW_W,to-from);x.restore();
   // the crease itself
   x.save();x.strokeStyle='rgba(0,0,0,.18)';x.lineWidth=1;x.beginPath();x.moveTo(poly[0].x,poly[0].y);x.lineTo(poly[3].x,poly[3].y);x.stroke();x.restore()}
 }
 function stop(){cancelAnimationFrame(frame);frame=0;if(current&&current.done)current.done();current=null}
 function start(c,s,hooks={}){stop();const l=layout(s),seed=parseInt(s.id,16)||Date.now(),bmp=print(l,seed),state=current={c,bmp,seed,progress:0,done:hooks.done};let began=null;const duration=Math.min(60000,600+lengthOf(bmp)/FEED*1000);
 function resize(){const w=window.innerWidth,h=window.innerHeight,dpr=Math.min(window.devicePixelRatio||1,2);c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);state.w=w;state.h=h;state.segs=folds(w,h,lengthOf(bmp),seed)}resize();
 if(hooks.begin)hooks.begin();
 const tick=t=>{if(current!==state)return;if(began===null)began=t;state.progress=window.matchMedia('(prefers-reduced-motion: reduce)').matches?1:Math.min(1,(t-began)/duration);if(state.w!==window.innerWidth||state.h!==window.innerHeight)resize();render(c,bmp,state.segs,lengthOf(bmp)*state.progress,state.w,state.h);if(state.progress<1)frame=requestAnimationFrame(tick);else if(state.done){const f=state.done;state.done=null;f()}};frame=requestAnimationFrame(tick);
 }
 window.addEventListener('resize',()=>{if(current&&current.progress===1){const s=current,w=window.innerWidth,h=window.innerHeight,dpr=Math.min(window.devicePixelRatio||1,2);s.c.width=w*dpr;s.c.height=h*dpr;s.w=w;s.h=h;s.segs=folds(w,h,lengthOf(s.bmp),s.seed);render(s.c,s.bmp,s.segs,lengthOf(s.bmp),w,h)}});
 // The PNG is the same print, each dot enlarged to a 4×4 block so the low resolution survives.
 async function exportReceipt(s){const bmp=print(layout(s),parseInt(s.id,16)||1),Z=4,rowsPer=Math.floor(16000/Z),files=[];
  for(let offset=0;offset<bmp.height;offset+=rowsPer){const h=Math.min(rowsPer,bmp.height-offset),c=document.createElement('canvas');c.width=DOTS*Z;c.height=h*Z;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(bmp,0,offset,DOTS,h,0,0,DOTS*Z,h*Z);
   const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Receipt export failed')),'image/png'));files.push({name:'receipt_'+String(files.length+1).padStart(3,'0')+'.png',blob,bytes:new Uint8Array(await blob.arrayBuffer())})}
  return files.length===1?{blob:files[0].blob,extension:'png'}:{blob:PrintExport.zip(files),extension:'zip'}}
 return {layout,print,folds,render,start,stop,export:exportReceipt,complement,showWidth:SHOW_W,tailDeg:TAIL_DEG,cutOf};
})();
