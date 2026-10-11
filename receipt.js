'use strict';
window.PrintReceipt=(()=>{
 let frame=0,current=null;
 const complement=hex=>'#'+hex.slice(1).match(/../g).map(v=>(255-parseInt(v,16)).toString(16).padStart(2,'0')).join('');
 function layout(s){const paper=complement(s.background),rgb=paper.slice(1).match(/../g).map(v=>parseInt(v,16)),ink=rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>145?'#111111':'#FFFFFF',rows=[];let y=32;
 const add=(text,kind='text',step=24)=>{rows.push({text,y,kind});y+=step};
 add('BAD PRINT SHOP','center',32);add('RECEIPT','center',38);add('#'+s.id);add(s.date,'text',32);add('','rule',28);add('QTY  DESCRIPTION');add('','rule',28);
 const measure=document.createElement('canvas').getContext('2d');measure.font='16px monospace';
 s.entries.forEach((entry,i)=>{const prefix=String(i+1).padStart(3,'0')+'  ';let line=prefix;for(const word of entry.text.split(/\s+/)){for(const ch of Array.from(word+' ')){if(measure.measureText(line+ch).width>300){add(line.trimEnd());line='     '}line+=ch}}if(line.trim())add(line.trimEnd());y+=12});
 add('','rule',30);add('TOTAL ITEMS       '+s.count,'text',36);add('END OF RECEIPT','center',32);return {paper,ink,rows,height:y+20,width:360};
 }
 function row(x,r,l){x.fillStyle=l.ink;x.strokeStyle=l.ink;x.lineWidth=1;x.font='16px monospace';x.textBaseline='top';if(r.kind==='rule'){x.beginPath();x.moveTo(24,0);x.lineTo(336,0);x.stroke()}else{x.fillText(r.text,r.kind==='center'?(360-x.measureText(r.text).width)/2:24,0)}}
 function route(w,h,length,seed){let n=seed>>>0;const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};const margin=90,anchors=[{x:90,y:80},{x:w*.78,y:h*.79}],corners=[{x:margin,y:margin},{x:w-margin,y:margin},{x:w-margin,y:h-margin},{x:margin,y:h-margin}];let rough=Math.hypot(w*.78-90,h*.79-80),corner=2;
 while(rough<length+Math.max(w,h)*2){corner=(corner+1)%4;const c=corners[corner],last=anchors.at(-1),p={x:c.x+(random()-.5)*90,y:c.y+(random()-.5)*70};rough+=Math.hypot(p.x-last.x,p.y-last.y);anchors.push(p)}
 const pts=[{...anchors[0],d:0}];for(let i=0;i<anchors.length-1;i++){const a=anchors[Math.max(0,i-1)],b=anchors[i],c=anchors[i+1],d=anchors[Math.min(anchors.length-1,i+2)],steps=Math.max(20,Math.ceil(Math.hypot(c.x-b.x,c.y-b.y)/5));for(let j=1;j<=steps;j++){const t=j/steps,t2=t*t,t3=t2*t,f=k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3),p={x:f('x'),y:f('y')},prev=pts.at(-1);p.d=prev.d+Math.hypot(p.x-prev.x,p.y-prev.y);pts.push(p)}}return pts;
 }
 function at(path,d){let low=0,high=path.length-1;while(low+1<high){const mid=(low+high)>>1;if(path[mid].d<d)low=mid;else high=mid}const a=path[low],b=path[high],t=Math.max(0,Math.min(1,(d-a.d)/(b.d-a.d||1)));return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2(b.y-a.y,b.x-a.x)}}
 function render(c,l,path,revealed,w,h){const x=c.getContext('2d'),ratio=c.width/w;x.setTransform(ratio,0,0,ratio,0,0);x.clearRect(0,0,w,h);const end=Math.min(l.height*.5,revealed);let last=at(path,0),ri=0;
 for(let d=4;d<end+4;d+=4){const distance=Math.min(d,end),p=at(path,distance);x.fillStyle=l.paper;const normal=q=>({x:-Math.sin(q.angle)*90,y:Math.cos(q.angle)*90}),a=normal(last),b=normal(p);x.beginPath();x.moveTo(last.x+a.x,last.y+a.y);x.lineTo(p.x+b.x,p.y+b.y);x.lineTo(p.x-b.x,p.y-b.y);x.lineTo(last.x-a.x,last.y-a.y);x.closePath();x.fill();while(ri<l.rows.length&&(l.rows[ri].y+24)*.5<=distance){const r=l.rows[ri++],pos=at(path,r.y*.5);x.save();x.translate(pos.x,pos.y);x.rotate(pos.angle-Math.PI/2);x.scale(.5,.5);x.translate(-180,0);row(x,r,l);x.restore()}last=p;if(distance===end)break}
 }
 function stop(){cancelAnimationFrame(frame);frame=0;current=null}
 function start(c,s){stop();const l=layout(s),seed=parseInt(s.id,16)||Date.now(),state=current={c,l,seed,progress:0};let began=null;const duration=Math.min(14000,1800+l.height*1.3);
 function resize(){const w=window.innerWidth,h=window.innerHeight,dpr=Math.min(window.devicePixelRatio||1,2);c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);state.w=w;state.h=h;state.path=route(w,h,l.height*.5,seed)}resize();
 const tick=t=>{if(current!==state)return;if(began===null)began=t;state.progress=window.matchMedia('(prefers-reduced-motion: reduce)').matches?1:Math.min(1,(t-began)/duration);if(state.w!==window.innerWidth||state.h!==window.innerHeight)resize();render(c,l,state.path,l.height*.5*state.progress,state.w,state.h);if(state.progress<1)frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);
 }
 window.addEventListener('resize',()=>{if(current&&current.progress===1){const s=current,w=window.innerWidth,h=window.innerHeight,dpr=Math.min(window.devicePixelRatio||1,2);s.c.width=w*dpr;s.c.height=h*dpr;s.w=w;s.h=h;s.path=route(w,h,s.l.height*.5,s.seed);render(s.c,s.l,s.path,s.l.height*.5,w,h)}});
 async function exportReceipt(s){const l=layout(s),chunk=l.height<=16384?l.height:8192,files=[];for(let offset=0;offset<l.height;offset+=chunk){const c=document.createElement('canvas');c.width=360;c.height=Math.min(chunk,l.height-offset);const x=c.getContext('2d');x.fillStyle=l.paper;x.fillRect(0,0,360,c.height);for(const r of l.rows){if(r.y<offset-24||r.y>offset+c.height)continue;x.save();x.translate(0,r.y-offset);row(x,r,l);x.restore()}const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Receipt export failed')),'image/png'));files.push({name:'receipt_'+String(files.length+1).padStart(3,'0')+'.png',blob,bytes:new Uint8Array(await blob.arrayBuffer())})}return files.length===1?{blob:files[0].blob,extension:'png'}:{blob:PrintExport.zip(files),extension:'zip'}}
 return {layout,route,at,render,start,stop,export:exportReceipt,complement};
})();
