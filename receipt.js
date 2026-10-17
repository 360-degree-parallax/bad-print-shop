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
 // One strip of paper on one track. The track leaves the bottom-right corner at TAIL_DEG (where the tail
 // lies), runs off the screen, comes back in at the top-left and folds its way across the screen. On release
 // the whole strip is pulled along the track: the foot (TOTAL), still inside the printer until now, comes
 // out at the corner, and by the end the foot has arrived at the top-left where the strip came in.
 const TAIL_DEG=35;
 function exitLength(w,h){const r=TAIL_DEG*Math.PI/180;return Math.min(w/Math.sin(r),h/Math.cos(r))+30}
 // Where the items end and the foot begins, in on-screen px of the receipt (the tail stops here).
 function cutOf(l){const rules=l.rows.filter(r=>r.kind==='rule');return (rules[1]?rules[1].y:l.height)*K*(SHOW_W/DOTS)}
 // The part on screen after the strip comes back: straight runs with sharp folds at the corners.
 function route(w,h,length,seed){let n=seed>>>0;const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};
  // short straight runs that fold back on themselves at sharp angles, kept inside the screen
  const m=150,inside=p=>p.x>=m&&p.x<=w-m&&p.y>=m*.8&&p.y<=h-m*.8,anchors=[{x:-160,y:110+random()*60},{x:150+random()*80,y:150+random()*60}];
  let heading=Math.atan2(anchors[1].y-anchors[0].y,anchors[1].x-anchors[0].x),rough=Math.hypot(anchors[1].x+160,anchors[1].y-anchors[0].y),guard=0;
  while(rough<length+400&&guard++<400){const last=anchors.at(-1);let p=null;
   for(let tries=0;tries<24&&!p;tries++){const turn=(random()<.5?-1:1)*(.9+random()*1.5),len=260+random()*300,hd=heading+turn,q={x:last.x+Math.cos(hd)*len,y:last.y+Math.sin(hd)*len};if(inside(q)){p=q;heading=hd}}
   if(!p){p={x:m+random()*(w-2*m),y:m+random()*(h-2*m)};heading=Math.atan2(p.y-last.y,p.x-last.x)}
   rough+=Math.hypot(p.x-last.x,p.y-last.y);anchors.push(p)}
  const pts=[{...anchors[0],d:0}];for(let i=1;i<anchors.length;i++){const a=anchors[i-1],b=anchors[i],len=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(2,Math.ceil(len/6));for(let j=1;j<=steps;j++){const t=j/steps,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},prev=pts.at(-1);p.d=prev.d+Math.hypot(p.x-prev.x,p.y-prev.y);pts.push(p)}}return pts;
 }
 function at(path,d){let low=0,high=path.length-1;while(low+1<high){const mid=(low+high)>>1;if(path[mid].d<d)low=mid;else high=mid}const a=path[low],b=path[high],t=Math.max(0,Math.min(1,(d-a.d)/(b.d-a.d||1)));return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2(b.y-a.y,b.x-a.x)}}
 const scale=SHOW_W/DOTS,lengthOf=bmp=>bmp.height*scale;
 function slice(x,bmp,d,len,px,py,angle){const sy=d/scale,sh=Math.min(bmp.height-sy,len/scale+1);if(sh<=0)return;x.save();x.translate(px,py);x.rotate(angle);x.drawImage(bmp,0,sy,DOTS,sh,-SHOW_W/2,0,SHOW_W,sh*scale+.6);x.restore()}
 // track position s: [0,L1) straight from the corner, [L1,L1+G) off screen, from L1+G on the folded route
 function render(c,bmp,g,off){const {w,h,path,cut,L1,G}=g,x=c.getContext('2d'),ratio=c.width/w;x.setTransform(ratio,0,0,ratio,0,0);x.clearRect(0,0,w,h);x.imageSmoothingEnabled=false;
  const F=lengthOf(bmp),rad=TAIL_DEG*Math.PI/180,ux=-Math.sin(rad),uy=-Math.cos(rad),down=Math.atan2(-uy,-ux)-Math.PI/2,step=2;
  const lo=cut-F+off,hi=cut+off;            // the strip covers track [lo,hi]: foot at lo, top at hi
  x.strokeStyle=PAPER;x.lineWidth=SHOW_W;x.lineCap='butt';x.lineJoin='miter';x.miterLimit=3;
  const a1=Math.max(0,lo),b1=Math.min(L1,hi);if(b1>a1){x.beginPath();x.moveTo(w+ux*a1,h+uy*a1);x.lineTo(w+ux*b1,h+uy*b1);x.stroke()}
  const a2=Math.max(L1+G,lo),b2=hi;if(b2>a2){x.beginPath();for(let s=a2;s<=b2;s+=step){const p=at(path,s-L1-G);s===a2?x.moveTo(p.x,p.y):x.lineTo(p.x,p.y)}const pe=at(path,b2-L1-G);x.lineTo(pe.x,pe.y);x.stroke()}
  for(let d=0;d<F;d+=step){const len=Math.min(step,F-d),s=cut-d+off;      // the piece [d,d+len] has its upper edge at s
   if(s-len<0)continue;
   if(s<=L1)slice(x,bmp,d,len,w+ux*s,h+uy*s,down);
   else if(s>=L1+G){const p=at(path,s-L1-G);slice(x,bmp,d,len,p.x,p.y,p.angle+Math.PI/2)}}
 }
 function stop(){cancelAnimationFrame(frame);frame=0;current=null}
 function geometry(bmp,cut,seed){const w=window.innerWidth,h=window.innerHeight,L1=exitLength(w,h),G=Math.max(0,cut-L1),F=lengthOf(bmp),travel=L1+G+F-cut;return {w,h,cut,L1,G,travel,path:route(w,h,F+40,seed)}}
 function start(c,s){stop();const l=layout(s),seed=parseInt(s.id,16)||Date.now(),bmp=print(l,seed),cut=cutOf(l),state=current={c,bmp,seed,cut,progress:0};let began=null;
 function resize(){const dpr=Math.min(window.devicePixelRatio||1,2);c.width=Math.round(window.innerWidth*dpr);c.height=Math.round(window.innerHeight*dpr);state.g=geometry(bmp,cut,seed)}resize();
 const duration=Math.min(14000,1200+state.g.travel*2.2),ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
 const tick=t=>{if(current!==state)return;if(began===null)began=t;state.progress=window.matchMedia('(prefers-reduced-motion: reduce)').matches?1:Math.min(1,(t-began)/duration);if(state.g.w!==window.innerWidth||state.g.h!==window.innerHeight)resize();render(c,bmp,state.g,state.g.travel*ease(state.progress));if(state.progress<1)frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);
 }
 window.addEventListener('resize',()=>{if(current&&current.progress===1){const s=current,dpr=Math.min(window.devicePixelRatio||1,2);s.c.width=window.innerWidth*dpr;s.c.height=window.innerHeight*dpr;s.g=geometry(s.bmp,s.cut,s.seed);render(s.c,s.bmp,s.g,s.g.travel)}});
 // The PNG is the same print, each dot enlarged to a 4×4 block so the low resolution survives.
 async function exportReceipt(s){const bmp=print(layout(s),parseInt(s.id,16)||1),Z=4,rowsPer=Math.floor(16000/Z),files=[];
  for(let offset=0;offset<bmp.height;offset+=rowsPer){const h=Math.min(rowsPer,bmp.height-offset),c=document.createElement('canvas');c.width=DOTS*Z;c.height=h*Z;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(bmp,0,offset,DOTS,h,0,0,DOTS*Z,h*Z);
   const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Receipt export failed')),'image/png'));files.push({name:'receipt_'+String(files.length+1).padStart(3,'0')+'.png',blob,bytes:new Uint8Array(await blob.arrayBuffer())})}
  return files.length===1?{blob:files[0].blob,extension:'png'}:{blob:PrintExport.zip(files),extension:'zip'}}
 return {layout,print,route,at,render,start,stop,export:exportReceipt,complement,showWidth:SHOW_W,tailDeg:TAIL_DEG,cutOf};
})();
