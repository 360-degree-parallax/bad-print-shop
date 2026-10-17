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
   for(const word of String(entry.text).split(/\s+/)){for(const ch of Array.from(word+' ')){if(measure.measureText(line+ch).width>LAYOUT_W-56){add(line.trimEnd());line='    '}line+=ch}}
   if(line.trim())add(line.trimEnd());y+=8});
  add('','rule',30);add(String(s.count),'total',38);add('*'.repeat(30),'stars',30);
  return {rows,height:y+40,width:LAYOUT_W};
 }
 function drawRow(x,r){x.fillStyle='#000';x.font=FONT;x.textBaseline='top';
  if(r.kind==='rule'){let t='-';while(x.measureText(t+'-').width<=LAYOUT_W-48)t+='-';x.fillText(t,24,0);return}
  if(r.kind==='stars'){let t='*';while(x.measureText(t+'*').width<=LAYOUT_W-48)t+='*';x.fillText(t,24,0);return}
  if(r.kind==='pair'){x.fillText(r.text,24,0);x.fillText(r.right,LAYOUT_W-24-x.measureText(r.right).width,0);return}
  if(r.kind==='total'){x.fillText('TOTAL',24,0);x.fillText(r.text,LAYOUT_W-24-x.measureText(r.text).width,0);return}
  x.fillText(r.text,24,0)}

 /* ---------- the print ---------- */
 function rng(seed){let n=seed>>>0||1;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296}}
 function print(l,seed){
  const H=Math.ceil(l.height*K),src=document.createElement('canvas');src.width=DOTS;src.height=H;
  const sx=src.getContext('2d');sx.fillStyle='#fff';sx.fillRect(0,0,DOTS,H);sx.save();sx.scale(K,K);
  for(const r of l.rows){sx.save();sx.translate(0,r.y);drawRow(sx,r);sx.restore()}sx.restore();
  const data=sx.getImageData(0,0,DOTS,H).data,ink=new Float32Array(DOTS*H);
  for(let i=0;i<DOTS*H;i++)ink[i]=1-data[i*4]/255;
  const random=rng(seed),dead=new Set([...Array(2+Math.floor(random()*3))].map(()=>Math.floor(18+random()*(DOTS-36))));
  const dots=new Uint8Array(DOTS*H);let printed=0;
  for(let y=0;y<H;y++){
   const heat=1-Math.exp(-printed/45000);                 // the head warms with every dot it has burned
   for(let x=0;x<DOTS;x++){const i=y*DOTS+x;let sum=0,n=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const yy=y+dy,xx=x+dx;if(yy<0||yy>=H||xx<0||xx>=DOTS)continue;sum+=ink[yy*DOTS+xx];n++}
    let v=Math.max(ink[i],(sum/n)*(.55+1.25*heat));       // bleed: ink spreads into its neighbours
    if(y>0)v+=heat*.35*ink[i-DOTS];                       // smear along the feed
    const pressure=.42+.22*Math.pow(x/DOTS,3)+.08*Math.sin(y/37+seed%7);   // weaker on one side
    const on=v>pressure+(random()-.5)*.22&&!dead.has(x)&&random()>.025;
    dots[i]=on?1:0;if(on)printed++}
  }
  // the feed: rows slip (stretched), skip, or shift sideways for a moment
  const out=[];let shift=0,band=0;
  for(let y=0;y<H;y++){const r=random();
   if(band>0)band--;else shift=0;
   if(r<.004){shift=random()<.5?-2:2;band=4+Math.floor(random()*8)}
   if(r>.997)continue;
   const reps=r>.992?3+Math.floor(random()*4):1;
   for(let k=0;k<reps;k++)out.push([y,shift])}
  const c=document.createElement('canvas');c.width=DOTS;c.height=out.length;const cx=c.getContext('2d'),img=cx.createImageData(DOTS,out.length),p=img.data;
  const paper=PAPER.slice(1).match(/../g).map(v=>parseInt(v,16));
  out.forEach(([y,s],oy)=>{const fade=.88+.12*random();for(let x=0;x<DOTS;x++){const sxp=x-s,o=(oy*DOTS+x)*4,on=sxp>=0&&sxp<DOTS&&dots[y*DOTS+sxp];
   for(let ch=0;ch<3;ch++)p[o+ch]=on?Math.round(INK[ch]+(paper[ch]-INK[ch])*(1-fade)*.6):paper[ch];p[o+3]=255}});
  cx.putImageData(img,0,0);return c;
 }

 /* ---------- the ribbon ---------- */
 function route(w,h,length,seed){let n=seed>>>0;const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};const margin=150,anchors=[{x:150,y:120},{x:w*.78,y:h*.79}],corners=[{x:margin,y:margin},{x:w-margin,y:margin},{x:w-margin,y:h-margin},{x:margin,y:h-margin}];let rough=Math.hypot(w*.78-150,h*.79-120),corner=2;
 while(rough<length+Math.max(w,h)*2){corner=(corner+1)%4;const c=corners[corner],last=anchors.at(-1),p={x:c.x+(random()-.5)*90,y:c.y+(random()-.5)*70};rough+=Math.hypot(p.x-last.x,p.y-last.y);anchors.push(p)}
 const pts=[{...anchors[0],d:0}];for(let i=0;i<anchors.length-1;i++){const a=anchors[Math.max(0,i-1)],b=anchors[i],c=anchors[i+1],d=anchors[Math.min(anchors.length-1,i+2)],steps=Math.max(20,Math.ceil(Math.hypot(c.x-b.x,c.y-b.y)/5));for(let j=1;j<=steps;j++){const t=j/steps,t2=t*t,t3=t2*t,f=k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3),p={x:f('x'),y:f('y')},prev=pts.at(-1);p.d=prev.d+Math.hypot(p.x-prev.x,p.y-prev.y);pts.push(p)}}return pts;
 }
 function at(path,d){let low=0,high=path.length-1;while(low+1<high){const mid=(low+high)>>1;if(path[mid].d<d)low=mid;else high=mid}const a=path[low],b=path[high],t=Math.max(0,Math.min(1,(d-a.d)/(b.d-a.d||1)));return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2(b.y-a.y,b.x-a.x)}}
 const scale=SHOW_W/DOTS,lengthOf=bmp=>bmp.height*scale;
 function render(c,bmp,path,revealed,w,h){const x=c.getContext('2d'),ratio=c.width/w;x.setTransform(ratio,0,0,ratio,0,0);x.clearRect(0,0,w,h);x.imageSmoothingEnabled=false;
  const end=Math.min(lengthOf(bmp),revealed),step=2,half=SHOW_W/2;
  // paper first, as a continuous band, so tight turns never open gaps between the printed slices
  x.fillStyle=PAPER;let last=at(path,0);for(let d=step;d<end+step;d+=step){const p=at(path,Math.min(d,end)),n=q=>({x:-Math.sin(q.angle)*half,y:Math.cos(q.angle)*half}),a=n(last),b=n(p);x.beginPath();x.moveTo(last.x+a.x,last.y+a.y);x.lineTo(p.x+b.x,p.y+b.y);x.lineTo(p.x-b.x,p.y-b.y);x.lineTo(last.x-a.x,last.y-a.y);x.closePath();x.fill();last=p;if(d>=end)break}
  for(let d=0;d<end;d+=step){const len=Math.min(step,end-d),p=at(path,d),sy=d/scale,sh=Math.min(bmp.height-sy,len/scale+1);if(sh<=0)break;
   x.save();x.translate(p.x,p.y);x.rotate(p.angle-Math.PI/2);x.drawImage(bmp,0,sy,DOTS,sh,-SHOW_W/2,0,SHOW_W,sh*scale+.6);x.restore()}
 }
 function stop(){cancelAnimationFrame(frame);frame=0;current=null}
 function start(c,s){stop();const l=layout(s),seed=parseInt(s.id,16)||Date.now(),bmp=print(l,seed),state=current={c,bmp,seed,progress:0};let began=null;const duration=Math.min(16000,1800+lengthOf(bmp)*2.2);
 function resize(){const w=window.innerWidth,h=window.innerHeight,dpr=Math.min(window.devicePixelRatio||1,2);c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);state.w=w;state.h=h;state.path=route(w,h,lengthOf(bmp),seed)}resize();
 const tick=t=>{if(current!==state)return;if(began===null)began=t;state.progress=window.matchMedia('(prefers-reduced-motion: reduce)').matches?1:Math.min(1,(t-began)/duration);if(state.w!==window.innerWidth||state.h!==window.innerHeight)resize();render(c,bmp,state.path,lengthOf(bmp)*state.progress,state.w,state.h);if(state.progress<1)frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);
 }
 window.addEventListener('resize',()=>{if(current&&current.progress===1){const s=current,w=window.innerWidth,h=window.innerHeight,dpr=Math.min(window.devicePixelRatio||1,2);s.c.width=w*dpr;s.c.height=h*dpr;s.w=w;s.h=h;s.path=route(w,h,lengthOf(s.bmp),s.seed);render(s.c,s.bmp,s.path,lengthOf(s.bmp),w,h)}});
 // The PNG is the same print, each dot enlarged to a 4×4 block so the low resolution survives.
 async function exportReceipt(s){const bmp=print(layout(s),parseInt(s.id,16)||1),Z=4,rowsPer=Math.floor(16000/Z),files=[];
  for(let offset=0;offset<bmp.height;offset+=rowsPer){const h=Math.min(rowsPer,bmp.height-offset),c=document.createElement('canvas');c.width=DOTS*Z;c.height=h*Z;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(bmp,0,offset,DOTS,h,0,0,DOTS*Z,h*Z);
   const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Receipt export failed')),'image/png'));files.push({name:'receipt_'+String(files.length+1).padStart(3,'0')+'.png',blob,bytes:new Uint8Array(await blob.arrayBuffer())})}
  return files.length===1?{blob:files[0].blob,extension:'png'}:{blob:PrintExport.zip(files),extension:'zip'}}
 return {layout,print,route,at,render,start,stop,export:exportReceipt,complement,showWidth:SHOW_W};
})();
