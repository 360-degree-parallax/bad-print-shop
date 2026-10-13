/* Client-side degradation chain. This is a synthetic degradation layer, not an external machine-translation log. */
(function(){
  const routes=[['2차','기존 8차급 훼손'],['3차','스와힐리어'],['4차','스와힐리어'],['5차','스와힐리어'],['6차','스와힐리어'],['7차','스와힐리어']];
  const labels=routes.map(([turn,lang])=>`${turn} ${lang} 왕복`);
  const speakers=['오이디푸스','제우스의 사제','크레온','테이레시아스','합창대','이오카스테','사자','목자','시종','둘째 사자','코린토스 사자'];
  const maps=[
    [['왕','명령하는 사람'],['군주','머리 사람'],['나라','사람의 땅'],['도시','모인 곳'],['궁전','높은 집'],['제단','돌의 자리'],['탄원자','청하는 사람']],
    [['재앙','나쁜 바람'],['역병','몸의 불'],['신탁','입에서 온 명령'],['예언자','먼저 보는 입'],['운명','묶인 길'],['구원','밖으로 꺼냄']],
    [['아버지','먼저 남자'],['어머니','처음 여자'],['아들','나온 몸'],['딸','작은 몸'],['형제','같은 피'],['아내','집의 여자']],
    [['눈','빛 구멍'],['손','잡는 끝'],['피','붉은 물'],['입','말 구멍'],['죄','검은 일'],['침묵','닫힌 말']],
    [['죽','아래로 가'],['낳','몸에서 꺼내'],['보','빛을 먹'],['말','입을 열'],['듣','귀에 넣'],['알','붙잡아 알']]
  ];
  function rng(i,p){let x=((i+1)*2654435761+p*1597334677)>>>0;return()=>{x^=x<<13;x>>>=0;x^=x>>>17;x>>>=0;x^=x<<5;x>>>=0;return x/4294967296};}
  function splitSpeaker(text){const m=text.match(/^([^:]{1,18}: )(.*)$/);if(m&&speakers.some(s=>m[1].includes(s)))return[m[1],m[2]];return['',text];}
  function replaceAll(text,pass,r){for(const table of maps){for(const [a,b] of table){if(r()<0.70+pass*0.035)text=text.split(a).join(b)}}return text;}
  function bruise(text,pass,r){
    text=text.replace(/(은|는|이|가|을|를|에|의|도|만|로|으로|와|과|에게|께서|에서|부터|까지)\b/g,m=>r()<0.20+pass*0.035?'':m);
    text=text.replace(/(하였습니다|했습니다|합니다|하십시오|하소서|하리라|하오|하네|하라|했다|한다|이다|였다|겠소|겠느냐|습니다|습니까)/g,m=>r()<0.30+pass*0.045?['했다','하라','되었다','라고 한다','말했다'][Math.floor(r()*5)]:m);
    const tokens=text.split(/(\s+)/);let blanks=0;
    text=tokens.map(t=>{if(/^\s+$/.test(t)||t.length<2)return t;if(blanks<3&&r()<0.035+pass*0.025&&!speakers.some(s=>t.includes(s))){blanks++;return r()<0.72?'□':''}if(t.length>6&&r()<0.04+pass*0.018)return t.slice(0,Math.max(2,t.length-1-Math.floor(r()*3)));return t}).join('');
    if(r()<0.22+pass*0.035){const parts=text.split(/(?<=[,;.!?])\s*/);if(parts.length>2){const first=parts.shift();parts.splice(Math.floor(r()*parts.length),0,first);text=parts.join(' ')}}
    return text;
  }
  function residue(text,pass,r){const bits=['입은 그렇게 돌아왔다','먼 말이 한국어가 되었다','그 뜻은 물처럼 남았다','이름은 다른 길로 왔다','말의 뼈만 남았다'];if(r()<0.24+pass*0.055)text+=` ${bits[Math.floor(r()*bits.length)]}`;if(r()<0.24)text=text.replace(/,\s*/g,' / ');if(r()<0.18)text=text.replace(/[.。]/g,' ·');return text;}
  function degrade(text,index,pass){const r=rng(index,pass);const [speaker,body]=splitSpeaker(text);let out=replaceAll(body,pass,r);out=bruise(out,pass,r);out=residue(out,pass,r);out=out.replace(/\s+/g,' ').replace(/\s+([,.?!〉」’])/g,'$1').trim();return `${speaker}${out}`.trim()||text;}
  const rows=(window.BookText||[]).map((entry,index)=>{const row=[];row[0]=degrade(entry.text,index,8);for(let i=1;i<6;i++)row[i]=degrade(row[i-1],index,20+i);return row;});
  window.BookGen={labels,route:routes,rows};
})();
