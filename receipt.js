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
 // The roll is not fresh: the receipts of the people before you are still on it, uncut, older and paler
 // the further up they are. Yours starts under the last of them.
 function layout(s){const rows=[];let y=40,age=0;
  const add=(text,kind='text',step=28,extra)=>{rows.push({text,y,kind,age,...extra});y+=step};
  const measure=document.createElement('canvas').getContext('2d');measure.font=FONT;
  const block=(r,own)=>{const [date,time]=String(r.date).split(/,\s*/);
   add('#'+r.id,'pair',30,{right:'을지로3가 · 단말기 07'});add(date||'','pair',34,{right:time||''});add('','rule',26);
   (r.entries||[]).forEach((entry,i)=>{const prefix=String(i+1).padStart(2,'0')+'. ';let line=prefix;const tag=own?{item:i}:{};
    for(const word of String(entry.text).split(/\s+/)){for(const ch of Array.from(word+' ')){if(measure.measureText(line+ch).width>LAYOUT_W-56){add(line.trimEnd(),'text',28,tag);line='    '}line+=ch}}
    if(line.trim())add(line.trimEnd(),'text',28,tag);y+=8});
   add('','rule',30,own?{close:true}:{});add(String(r.count??(r.entries||[]).length),'total',38);add('*'.repeat(30),'stars',30)};
  for(const p of s.prior||[]){age=p.age||.4;block(p,false);y+=14;add('','tear',40)}
  age=0;const ownStart=y;block(s,true);
  return {rows,height:y+40,width:LAYOUT_W,count:s.count||0,ownStart};
 }
 function drawRow(x,r){x.fillStyle='#000';x.font=FONT;x.textBaseline='top';
  if(r.kind==='tear'){for(let i=6;i<LAYOUT_W-6;i+=10)x.fillRect(i,8,5,2);return}
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
  // how old each stretch is (older receipts have faded), and where the head had cooled down between customers
  const age=new Float32Array(H),cool=new Set();for(const r of l.rows){const y0=Math.floor(r.y*K);for(let y=y0;y<Math.min(H,y0+Math.ceil(40*K));y++)age[y]=r.age||0;if(r.kind==='tear')cool.add(y0)}
  const dots=new Uint8Array(DOTS*H);let printed=0;
  for(let y=0;y<H;y++){if(cool.has(y))printed=0;
   const heat=1-Math.exp(-printed/45000);                 // the head warms with every dot it has burned
   const k=Math.floor(y/LINE),sag=hash(seed,k,7)<.07?.45+hash(seed,k,8)*.25:1;   // A1 brownout: whole lines print weak
   const strength=sag*((y%BAND)<2?.6:1);                 // A2 motor banding at a regular pitch
   for(let x=0;x<DOTS;x++){const i=y*DOTS+x;let sum=0,n=0;
    for(let dy=-1;dy<=0;dy++)for(let dx=-1;dx<=1;dx++){const yy=y+dy,xx=x+dx;if(yy<0||xx<0||xx>=DOTS)continue;sum+=ink[yy*DOTS+xx];n++}
    let v=Math.max(ink[i],(sum/n)*(.55+1.25*heat))*strength;   // bleed into what was just burned (never into lines not printed yet)
    if(y>0)v+=heat*.35*ink[i-DOTS];                       // smear along the feed
    const pressure=.42+.22*Math.pow(x/DOTS,3)+.08*Math.sin(y/37+seed%7);   // weaker on one side
    const on=v>pressure+(hash(seed,x,y,1)-.5)*.22&&!dead.has(x)&&hash(seed,x,y,2)>.025+age[y]*.3;
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
  out.forEach(([y,s,over],oy)=>{const fade=(.88+.12*hash(seed,y,15))*(1-age[y]*.75);for(let x=0;x<DOTS;x++){const sxp=x-s,o=(oy*DOTS+x)*4,ghost=over!=null&&dots[over*DOTS+x],on=ghost||(sxp>=0&&sxp<DOTS&&dots[y*DOTS+sxp]);
   for(let ch=0;ch<3;ch++)p[o+ch]=on?Math.round(INK[ch]+(paper[ch]-INK[ch])*(1-fade)*.8):paper[ch];p[o+3]=255}});
  cx.putImageData(img,0,0);return c;
 }

 /* ---------- the ribbon ---------- */
 // While reading, the roll runs straight out of the bottom-right corner along TAIL_DEG, the top furthest
 // out. Its foot (your TOTAL) stays inside the printer until the receipt is pulled.
 const TAIL_DEG=35;
 function tornAt(l){const tears=l.rows.filter(r=>r.kind==='tear');return tears.length?Math.max(0,(l.ownStart*K*(SHOW_W/DOTS))-150):0}
 function cutOf(l){const close=l.rows.find(r=>r.close);return (close?close.y:l.height)*K*(SHOW_W/DOTS)}
 const scale=SHOW_W/DOTS,lengthOf=bmp=>bmp.height*scale;
 const trackCache=new Map();
 // while reading, the tail just runs straight out of the corner along TAIL_DEG
 function straight(w,h){const key='s'+w+'x'+h;if(trackCache.has(key))return trackCache.get(key);const rad=TAIL_DEG*Math.PI/180,ux=-Math.sin(rad),uy=-Math.cos(rad),angle=Math.atan2(uy,ux),pts=[];
  for(let d=0;d<=60000;d+=8)pts.push({x:w+20+ux*d,y:h+20+uy*d,d,angle});trackCache.set(key,pts);return pts}
 function at(path,d){if(path.at&&!Array.isArray(path))return path.at(d);let low=0,high=path.length-1;while(low+1<high){const mid=(low+high)>>1;if(path[mid].d<d)low=mid;else high=mid}const a=path[low],b=path[high],t=Math.max(0,Math.min(1,(d-a.d)/(b.d-a.d||1)));return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2(b.y-a.y,b.x-a.x)}}
 // draw the strip with L px of it out of the printer: receipt row d sits at track position L - d
 // Only rows from `from` on are on screen: what came before was torn off by the customer before you.
 function strip(x,bmp,path,L,from=0){const F=lengthOf(bmp),half=SHOW_W/2,step=2,top=Math.min(F,L),a=Math.max(0,L-top),b=L-Math.max(0,from);if(b<=a)return;
  x.imageSmoothingEnabled=false;x.strokeStyle=PAPER;x.lineWidth=SHOW_W;x.lineJoin='round';x.lineCap='butt';x.beginPath();
  for(let q=a;q<=b;q+=step){const p=at(path,q);q===a?x.moveTo(p.x,p.y):x.lineTo(p.x,p.y)}const pe=at(path,b);x.lineTo(pe.x,pe.y);x.stroke();
  for(let dd=Math.max(0,from);dd<top;dd+=step){const len=Math.min(step,top-dd),p=at(path,L-dd),sy=dd/scale,sh=Math.min(bmp.height-sy,len/scale+1);if(sh<=0)break;
   x.save();x.translate(p.x,p.y);x.rotate(p.angle+Math.PI/2);x.drawImage(bmp,0,sy,DOTS,sh,-half,0,SHOW_W,sh*scale+.6);x.restore()}
  if(from>0){const p=at(path,b);x.save();x.translate(p.x,p.y);x.rotate(p.angle+Math.PI/2);x.globalCompositeOperation='destination-out';x.beginPath();x.moveTo(-half-2,-10);x.lineTo(half+2,-10);
   const n=14,tw=SHOW_W/n;for(let i=n;i>=0;i--)x.lineTo(-half+i*tw,(i%2?6:1)+hash(i,7)*3);x.closePath();x.fill();x.restore()}}
 function render(c,bmp,L,w,h,from){const x=c.getContext('2d'),ratio=c.width/w;x.setTransform(ratio,0,0,ratio,0,0);x.clearRect(0,0,w,h);strip(x,bmp,straight(w,h),L,from)}
 // the tail while reading: the same strip, L = what has been printed so far (the foot is still inside)
 function tail(c,bmp,L,from=0){const w=window.innerWidth,h=window.innerHeight,dpr=Math.min(window.devicePixelRatio||1,2);if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}render(c,bmp,L,w,h,from)}
 function onTail(px,py,L,from=0){const path=straight(window.innerWidth,window.innerHeight);for(let q=0;q<=L-from;q+=8){const p=at(path,q);if(Math.hypot(p.x-px,p.y-py)<SHOW_W/2)return true}return false}
 // The final print. The tail has gone back into the printer; now the whole roll comes up out of a slot at
 // the bottom centre of the screen, straight up: the old receipts quickly, yours at the pace of the head.
 // When the foot is out the cutter cuts it, the paper lifts clear of the slot and can be scrolled through.
 const UP_FAST=1200,UP_SLOW=210,MARGIN_TOP=72,MARGIN_FOOT=96;
 function column(w,h){const sw=Math.min(SHOW_W,w-32);return {sw,sc:sw/DOTS,x0:Math.round((w-sw)/2),slot:h}}
 function bounds(st){const h=window.innerHeight,F=st.bmp.height*column(window.innerWidth,h).sc,low=h-MARGIN_FOOT-F;return {lo:Math.min(MARGIN_TOP,low),hi:Math.max(MARGIN_TOP,low),rest:low}}
 function teeth(x,x0,sw,y){x.save();x.globalCompositeOperation='destination-out';x.beginPath();const n=12,tw=sw/n;x.moveTo(x0-1,y+8);for(let i=0;i<n;i++){x.lineTo(x0+i*tw,y);x.lineTo(x0+i*tw+tw/2,y-5)}x.lineTo(x0+sw,y);x.lineTo(x0+sw+1,y+8);x.closePath();x.fill();x.restore()}
 function renderUp(st){const {c,bmp}=st,w=window.innerWidth,h=window.innerHeight,dpr=Math.min(window.devicePixelRatio||1,2);
  if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}
  const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);x.imageSmoothingEnabled=false;
  const {sw,sc,x0,slot}=column(w,h),F=bmp.height*sc,out=st.cut?F:Math.min(F,st.P),top=st.cut?st.top:slot-out;
  x.save();if(!st.cut){x.beginPath();x.rect(0,0,w,slot);x.clip()}
  const a=Math.max(0,Math.floor(-top/sc)),b=Math.min(bmp.height,Math.ceil((h-top)/sc),Math.ceil(out/sc));
  if(b>a){x.fillStyle='rgba(0,0,0,.18)';x.fillRect(x0+4,top+a*sc+6,sw,(b-a)*sc);x.drawImage(bmp,0,a,DOTS,b-a,x0,top+a*sc,sw,(b-a)*sc)}
  if(st.cut)teeth(x,x0,sw,top+F);x.restore();
  if(!st.cut||st.lift<1){x.fillStyle='rgba(12,12,11,.92)';x.fillRect(x0-16,slot-7,sw+32,7)}}
 function stop(){cancelAnimationFrame(frame);frame=0;if(current&&current.done)current.done();current=null}
 function start(c,s,hooks={}){stop();const l=layout(s),seed=parseInt(s.id,16)||Date.now(),bmp=print(l,seed);
  const st=current={c,bmp,seed,P:0,cut:false,lift:0,top:0,progress:0,done:hooks.done};
  const sc=()=>column(window.innerWidth,window.innerHeight).sc,own=()=>l.ownStart*K*sc(),F=()=>bmp.height*sc();
  const ownLen=F()-own(),slow=Math.max(UP_SLOW,ownLen/14);
  if(hooks.begin)hooks.begin();let last=null,liftFrom=0,liftT=0;
  const tick=t=>{if(current!==st)return;const dt=last===null?0:Math.min(.05,(t-last)/1000);last=t;
   if(window.matchMedia('(prefers-reduced-motion: reduce)').matches&&!st.cut)st.P=F();
   if(!st.cut){st.P+=(st.P<own()?UP_FAST:slow)*dt;
    if(st.P>=F()){st.P=F();st.cut=true;st.top=window.innerHeight-F();liftFrom=st.top;liftT=t;if(st.done){const f=st.done;st.done=null;f()}}}
   else if(st.lift<1){st.lift=Math.min(1,(t-liftT)/700);const e=1-Math.pow(1-st.lift,3);st.top=liftFrom+(bounds(st).rest-liftFrom)*e;if(st.lift>=1){st.progress=1;c.closest('dialog')?.classList.add('scrollable')}}
   renderUp(st);if(st.progress<1)frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick)}
 function scrollBy(dy){const st=current;if(!st||st.progress<1)return;const b=bounds(st);st.top=Math.max(b.lo,Math.min(b.hi,st.top-dy));renderUp(st)}
 window.addEventListener('resize',()=>{if(current&&current.progress===1){const b=bounds(current);current.top=Math.max(b.lo,Math.min(b.hi,current.top));renderUp(current)}});
 // The PNG is the same print, each dot enlarged to a 4×4 block so the low resolution survives.
 async function exportReceipt(s){const bmp=print(layout(s),parseInt(s.id,16)||1),Z=4,rowsPer=Math.floor(16000/Z),files=[];
  for(let offset=0;offset<bmp.height;offset+=rowsPer){const h=Math.min(rowsPer,bmp.height-offset),c=document.createElement('canvas');c.width=DOTS*Z;c.height=h*Z;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(bmp,0,offset,DOTS,h,0,0,DOTS*Z,h*Z);
   const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Receipt export failed')),'image/png'));files.push({name:'receipt_'+String(files.length+1).padStart(3,'0')+'.png',blob,bytes:new Uint8Array(await blob.arrayBuffer())})}
  return files.length===1?{blob:files[0].blob,extension:'png'}:{blob:PrintExport.zip(files),extension:'zip'}}
 return {layout,print,tail,onTail,tornAt,start,stop,scrollBy,export:exportReceipt,complement,showWidth:SHOW_W,tailDeg:TAIL_DEG,cutOf};
})();
