'use strict';
window.PrintFlow=(()=>{
 const top=32,bottom=1156,left=42,available=756;
 const measure=document.createElement('canvas').getContext('2d');
 const width=(text,size)=>{measure.font=`400 ${size}px DreamHeumul`;return measure.measureText(text).width};
 function create(){return {rows:[],active:null,serial:0,cycles:0,erased:[]}}
 function clone(state){const rows=state.rows.map(r=>({...r,tokens:r.tokens.slice()}));return {...state,erased:state.erased.slice(),rows,active:state.active?rows.find(r=>r.serial===state.active.serial):null}}
 function clearBand(state,row){for(const r of state.rows)if(r!==row&&r.y+r.height>row.y&&r.y<row.y+row.height)state.erased.push({y:r.y,height:r.height});state.rows=state.rows.filter(r=>r===row||r.y+r.height<=row.y||r.y>=row.y+row.height)}
 function newRow(state,style){const y=state.active?state.active.y+state.active.height:top;const row={tokens:[],y,height:Math.max(40,style.size*1.06),width:Math.min(available,style.width),complete:false,serial:++state.serial};state.rows.push(row);state.active=row;return row}
 function used(row){return row.tokens.reduce((sum,t,i)=>sum+t.width+(i?t.gap:0),0)}
 function append(state,item){state.erased=[];const style={size:item.size,width:item.blockWidth};for(const token of item.words){let row=state.active||newRow(state,style);const required=token.width+(row.tokens.length?token.gap:0);
   if(row.tokens.length&&used(row)+required>row.width){row.complete=true;row=newRow(state,style)}
   const height=Math.max(row.height,token.size*1.06);
   row.height=Math.max(row.height,height);row.tokens.push(token);clearBand(state,row);
 }return state}
 function positions(row){const textWidth=row.tokens.reduce((sum,t)=>sum+t.width,0),natural=row.tokens.reduce((sum,t,i)=>sum+(i?t.gap:0),0),extra=row.complete&&row.tokens.length>1?Math.max(0,(row.width-textWidth-natural)/(row.tokens.length-1)):0;
  let x=left+(available-row.width)/2;return row.tokens.map((token,i)=>{if(i)x+=token.gap+extra;const position={token,x,y:row.y};x+=token.width;return position})}
 function words(text,item){let n=0;const list=[];for(const word of text.trim().split(/\s+/)){let part='';for(const char of Array.from(word)){if(part&&width(part+char,item.size)>item.blockWidth){list.push(part);part=char}else part+=char}if(part)list.push(part)}
  return list.map(text=>{const seed=item.seed+(++n)*131,random=k=>{const a=Math.sin(seed*12.9898+k*78.233)*43758.5453;return a-Math.floor(a)},intensity=item.intensity;
   return {text,index:item.index,lines:[text],width:width(text,item.size),gap:width(' ',item.size),size:item.size,lineHeight:item.size,padding:0,font:'DreamHeumul',weight:400,seed,repeat:0,intensity,ink:item.ink,
    effect:n===1?item.effect:PrintEffects.names[Math.floor(random(3)*PrintEffects.names.length)],missing:random(7)<.04+intensity*.18,
    turn:random(11)<.04+intensity*.2?[-Math.PI/2,Math.PI/2,.25,-.35,Math.PI][Math.floor(random(13)*5)]:0,
    x:0,y:0,scale:1,rotation:0,skew:0,motion:'NONE'};
  })
 }
 function recolor(state,ink){for(const row of state.rows)for(const token of row.tokens){if(token.tile)PrintEffects.recolor(token,ink);else token.ink=ink}}
 function paint(target,state,offset=0,viewport=Infinity){for(const row of state.rows.filter(r=>r.y+r.height+400>=offset&&r.y-400<=offset+viewport))for(const {token,x,y} of positions(row)){if(token.missing)continue;if(token.image){target.save();target.imageSmoothingEnabled=false;target.drawImage(token.image,x,y,token.drawW,token.drawH);target.restore();continue}if(!token.tile)PrintEffects.prepare(token);target.save();target.translate(x+token.width/2,y+token.size*.4);target.rotate(token.turn);target.translate(-token.width/2,-token.size*.4);PrintEffects.paint(target,token,0);target.restore()}}
 function height(state){return state.rows.reduce((height,row)=>Math.max(height,row.y+row.height+row.tokens.reduce((margin,t)=>t.image?Math.max(margin,t.drawH):t.turn?Math.max(margin,t.width*.6):margin,96)),1188)}
 return {height,create,clone,append,positions,words,recolor,paint,width};
})();
