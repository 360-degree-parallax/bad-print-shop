'use strict';
window.PrintEffects=(()=>{
  const names=['PARTICLE','STRETCH','WAVE','TEAR','SHRED','GHOST','SMEAR','ECHO','PIXEL','DITHER','ASCII','HEX','VOID','SCAN','GLYPH','HALO','ROLL'];
  const moving=new Set(['STRETCH','WAVE','TEAR','SHRED','GHOST','SMEAR','ECHO','SCAN','HALO','ROLL']);
  function choose(repeat=0){const pool=repeat===0?['PARTICLE','PARTICLE','PARTICLE','WAVE','DITHER','PIXEL','HALO','STRETCH']:repeat<3?['GHOST','SMEAR','ECHO','TEAR','SHRED','SCAN']:['ASCII','HEX','GLYPH','VOID','PIXEL','SHRED'];return pool[Math.floor(Math.random()*pool.length)]}
  function make(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c}
  function noise(seed,i){const n=Math.sin(seed*12.9898+i*78.233)*43758.5453;return n-Math.floor(n)}
  // First pass: independently selected local patches; untouched regions keep the original strokes.
  function preprocess(source,o){
    const w=source.width,h=source.height,result=make(w,h),r=result.getContext('2d');r.drawImage(source,0,0);
    const outline=make(w,h),z=outline.getContext('2d'),data=source.getContext('2d').getImageData(0,0,w,h).data,edge=z.createImageData(w,h);
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const k=(y*w+x)*4,a=data[k+3];if(!a)continue;const n=Math.min(data[k-4+3],data[k+4+3],data[k-w*4+3],data[k+w*4+3]);edge.data[k]=255;edge.data[k+1]=255;edge.data[k+2]=255;edge.data[k+3]=Math.max(0,a-n)}
    z.putImageData(edge,0,0);
    const strength=.4+(o.intensity??.55)*.6,patchW=Math.max(24,Math.round(o.size*(.7+noise(o.seed,401)*.65))),patchH=Math.max(14,Math.round(o.lineHeight*.42));
    const types=['OUTLINE','TEAR','BLOCK','SMEAR','VOID','STRIPE'];o.baseStats={preserved:0,changed:0,types:[]};
    let patch=0;
    for(let y=10;y<h-10;y+=patchH)for(let x=28;x<w-28;x+=patchW){const k=++patch;if(noise(o.seed,k+503)<.42){o.baseStats.preserved++;continue}
      const pw=Math.min(patchW,w-28-x),ph=Math.min(patchH,h-10-y),type=types[Math.floor(noise(o.seed,k+701)*types.length)],phase=noise(o.seed,k+809)*6.28;
      o.baseStats.changed++;o.baseStats.types.push(type);r.save();r.beginPath();r.rect(x,y,pw,ph);r.clip();r.clearRect(x,y,pw,ph);
      if(type==='OUTLINE')r.drawImage(outline,0,0);
      if(type==='TEAR'){for(let row=y;row<y+ph;row+=3){const sh=Math.min(3,y+ph-row),dx=Math.sin(row*.17+phase)*o.size*.16*strength;r.drawImage(source,x-dx,row,pw,sh,x,row,pw,sh)}}
      if(type==='BLOCK'){const q=2+Math.floor(noise(o.seed,k+907)*4),small=make(Math.ceil(pw/q),Math.ceil(ph/q));small.getContext('2d').drawImage(source,x,y,pw,ph,0,0,small.width,small.height);r.imageSmoothingEnabled=false;r.drawImage(small,x,y,pw,ph)}
      if(type==='SMEAR'){r.drawImage(source,0,0);for(let j=1;j<=3;j++){r.globalAlpha=.24;r.drawImage(source,(j*2)*strength,Math.sin(phase)*j*strength)}}
      if(type==='VOID'){r.drawImage(outline,0,0);r.globalAlpha=.55;r.drawImage(source,Math.cos(phase)*o.size*.1*strength,Math.sin(phase)*4)}
      if(type==='STRIPE'){r.drawImage(source,Math.sin(phase)*8*strength,0);for(let row=y;row<y+ph;row+=5)r.clearRect(x,row,pw,1)}
      r.restore();
    }
    return result;
  }
  function prepare(o){
    const measure=make(1,1).getContext('2d');measure.font=`${o.weight||400} ${o.size}px ${o.font||'DreamHeumul'}`;
    const width=(o.blockWidth||Math.max(...o.lines.map(line=>measure.measureText(line).width)))+o.padding*2+56;
    const c=make(Math.min(1400,width),Math.min(1000,o.lines.length*o.lineHeight+36)),x=c.getContext('2d');
    let mask=make(c.width,c.height);const m=mask.getContext('2d');m.font=`${o.weight||400} ${o.size}px ${o.font||'DreamHeumul'}`;m.textBaseline='top';m.fillStyle='#fff';
    o.lines.forEach((line,i)=>{const dx=28+o.padding,y=i*o.lineHeight+12;
      if(o.blockWidth&&i<o.lines.length-1){const chars=Array.from(line),extra=(o.blockWidth-m.measureText(line).width)/Math.max(1,chars.length-1);let px=dx;for(const char of chars){m.fillText(char,px,y);px+=m.measureText(char).width+extra}}
      else m.fillText(line,dx,y);
    });
    mask=preprocess(mask,o);
    const intensity=o.intensity??.55;
    // Rasterize the glyph only: the unused area stays transparent at every stage.
    const cell=Math.max(1,Math.round(1+intensity*2));
    const small=make(c.width/cell,c.height/cell),sample=small.getContext('2d',{willReadFrequently:true});sample.drawImage(mask,0,0,small.width,small.height);const data=sample.getImageData(0,0,small.width,small.height).data;
    const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];x.fillStyle=o.ink;o.particles=[];
    for(let row=0;row<small.height;row++)for(let col=0;col<small.width;col++){
      const i=row*small.width+col,alpha=data[i*4+3]/255;if(alpha<.035)continue;
      const edge=alpha<.8,threshold=(bayer[(row%4)*4+col%4]+.5)/16;
      const survives=(alpha>.7||alpha>threshold)&&noise(o.seed,i+11)>(edge?.12:.018)+Math.min(.12,o.repeat*.012);
      if(survives){x.globalAlpha=1;x.fillRect(col*cell,row*cell,cell,cell)}
      if(intensity>0&&edge&&noise(o.seed,i+29)>.78&&o.particles.length<140){const spread=3+intensity*14,dx=(noise(o.seed,i+37)-.5)*spread*2,dy=(noise(o.seed,i+53)-.5)*spread;o.particles.push({x:col*cell+dx,y:row*cell+dy,size:Math.max(1,cell*(.35+noise(o.seed,i+67)*.4)),phase:noise(o.seed,i+83)*Math.PI*2,alpha:.28+noise(o.seed,i+97)*.45})}
    }
    if(intensity===0){x.clearRect(0,0,c.width,c.height);x.drawImage(mask,0,0);x.globalCompositeOperation='source-in';x.fillStyle=o.ink;x.fillRect(0,0,c.width,c.height);x.globalCompositeOperation='source-over'}
    x.globalAlpha=1;o.tile=c;o.phase=noise(o.seed,0)*Math.PI*2;o.staticTile=null;
    if(intensity>0&&o.effect==='PIXEL'){const k=4+Math.floor(noise(o.seed,3)*4),low=make(c.width/k,c.height/k);low.getContext('2d').drawImage(c,0,0,low.width,low.height);o.staticTile=make(c.width,c.height);const out=o.staticTile.getContext('2d');out.imageSmoothingEnabled=false;out.drawImage(low,0,0,c.width,c.height)}
    if(intensity>0&&o.effect==='DITHER'){
      const out=make(c.width,c.height),z=out.getContext('2d');z.fillStyle=o.ink;
      for(let row=0;row<small.height;row++)for(let col=0;col<small.width;col++){const alpha=data[(row*small.width+col)*4+3]/255;if(alpha>.72)z.fillRect(col*cell,row*cell,cell,cell);else if(alpha>(bayer[(row%4)*4+col%4]+.5)/16)z.fillRect(col*cell,row*cell,Math.max(1,cell-1),Math.max(1,cell-1))}o.staticTile=out;
    }
    if(intensity>0&&['ASCII','HEX','GLYPH'].includes(o.effect)){
      const step=10,grid=make(c.width/step,c.height/step),g=grid.getContext('2d',{willReadFrequently:true});g.drawImage(mask,0,0,grid.width,grid.height);const a=g.getImageData(0,0,grid.width,grid.height).data;
      const out=make(c.width,c.height),z=out.getContext('2d');z.drawImage(c,0,0);z.fillStyle=o.ink;z.font=`${step+1}px monospace`;z.textBaseline='top';
      const chars=o.effect==='HEX'?'0123456789ABCDEF':o.effect==='GLYPH'?'01□+×<>':'.:-=+*#%@',conversion=Math.min(.9,.18+o.repeat*.12);
      for(let row=0;row<grid.height;row++)for(let col=0;col<grid.width;col++){const i=row*grid.width+col,alpha=a[i*4+3]/255;if(alpha>.12&&noise(o.seed,i+107)<conversion){z.clearRect(col*step,row*step,step,step);const k=o.effect==='ASCII'?Math.min(chars.length-1,Math.floor(alpha*(chars.length-1))):Math.floor(noise(o.seed,i+131)*chars.length);z.fillText(chars[k],col*step,row*step)}}o.staticTile=out;
    }
    if(intensity>0&&o.effect==='VOID'){const out=make(c.width,c.height),z=out.getContext('2d');z.drawImage(c,0,0);z.globalCompositeOperation='destination-out';for(let k=0;k<5;k++){z.fillRect(noise(o.seed,k+7)*c.width,noise(o.seed,k+31)*c.height,12+noise(o.seed,k+59)*50,8+noise(o.seed,k+89)*o.lineHeight*.3)}o.staticTile=out}
    return o;
  }
  function recolor(o,ink){
    if(o.ink===ink)return;o.ink=ink;
    for(const tile of new Set([o.tile,o.staticTile].filter(Boolean))){const x=tile.getContext('2d');x.save();x.globalCompositeOperation='source-in';x.fillStyle=ink;x.fillRect(0,0,tile.width,tile.height);x.restore()}
  }
  function paint(x,o,time){
    const c=o.staticTile||o.tile,w=c.width,h=c.height,t=time*.8+o.phase,strength=(o.intensity??.55)*1.8;
    x.save();x.translate(o.x,o.y);x.rotate(o.rotation);x.scale(o.scale,1);x.transform(1,0,o.skew,1,0,0);
    if(o.motion==='FLOAT')x.translate(Math.sin(t)*2,Math.cos(t*.8)*2);
    if(o.motion==='BREATHE')x.scale(1+Math.sin(t)*.012,1+Math.cos(t)*.01);
    if(o.motion==='ROLL'){const distance=(Math.sin(t)*.5+.5)*32;x.translate(distance,0)}
    switch(strength===0?'NONE':o.effect){
      case 'STRETCH':x.scale(1+(.05+Math.sin(t)*.19)*strength,1+(-.02+Math.cos(t*.65)*.08)*strength);x.drawImage(c,-28,0);break;
      case 'WAVE':for(let col=0;col<w;col+=12){const sw=Math.min(12,w-col),dy=Math.sin(col*.026+t)*6*strength;x.drawImage(c,col,0,sw,h,col-28,dy,sw,h)}break;
      case 'TEAR':for(let row=0;row<h;row+=18){const sh=Math.min(18,h-row),dx=Math.sin(t+row*.43)*8*strength;x.drawImage(c,0,row,w,sh,-28+dx,row,w,sh)}break;
      case 'SHRED':for(let col=0;col<w;col+=17){const sw=Math.min(17,w-col),dy=Math.sin(t*.7+col*.55)*8*strength;x.drawImage(c,col,0,sw,h,col-28,dy,sw,h)}break;
      case 'GHOST':for(let k=3;k>0;k--){x.globalAlpha=.1+.045*k;x.drawImage(c,-28+k*(9+Math.sin(t)*6)*strength,k*6)}x.globalAlpha=1;x.drawImage(c,-28,0);break;
      case 'SMEAR':for(let k=7;k>0;k--){x.globalAlpha=.07;x.drawImage(c,-28+k*(5+Math.sin(t)*2)*strength,k*1.7)}x.globalAlpha=1;x.drawImage(c,-28,0);break;
      case 'ECHO':for(let k=3;k>=0;k--){const scale=1-k*.12*strength;x.globalAlpha=1-k*.21;x.drawImage(c,-28+k*18,(Math.sin(t)*8+22)*k,w*scale,h*scale)}break;
      case 'SCAN':x.drawImage(c,-28,0);{const row=(Math.sin(t*.55)*.5+.5)*Math.max(1,h-24),sh=Math.min(24,h-row);x.drawImage(c,0,row,w,sh,-28+Math.sin(t)*25*strength,row,w,sh);}break;
      case 'HALO':x.shadowColor=o.ink;x.shadowBlur=(12+Math.sin(t)*7)*strength;x.drawImage(c,-28,0);x.shadowBlur=0;x.drawImage(c,-28,0);break;
      case 'ROLL':{x.beginPath();x.rect(0,0,w-56,h);x.clip();const shift=((time*34+o.phase*30)%(w+24));x.drawImage(c,-28-shift,0);x.drawImage(c,w-4-shift,0)}break;
      default:x.drawImage(c,-28,0);
    }
    if(strength>0&&o.motion==='CUT'){const row=(Math.sin(t*.6)*.5+.5)*Math.max(1,h-20);x.globalAlpha=.85;x.drawImage(c,0,row,w,Math.min(20,h-row),-28+Math.sin(t)*22,row,w,Math.min(20,h-row))}
    x.globalAlpha=1;x.fillStyle=o.ink;for(const p of o.particles||[]){x.globalAlpha=p.alpha;const drift=Math.sin(time*.55+p.phase)*(1.5+Math.min(3,o.repeat*.35));x.fillRect(p.x-28+drift,p.y+Math.cos(time*.4+p.phase)*1.7,p.size,p.size)}
    x.restore();
  }
  return {names,moving,choose,preprocess,prepare,recolor,paint};
})();
