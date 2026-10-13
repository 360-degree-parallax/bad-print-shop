/* Literary degradation chain. Six variants per sentence; no placeholder blanks. */
(function(){
  const labels=['1차 훼손','2차 훼손','3차 훼손','4차 훼손','5차 훼손','6차 훼손'];
  const route=labels.map((label,i)=>[`${i+1}차`,'연출형 왕복 훼손']);
  const speakers=['오이디푸스','제우스의 사제','크레온','테이레시아스','합창대','이오카스테','사자','목자','시종','둘째 사자','코린토스 사자'];
  const drift=[
    [['왕','높은 사람'],['군주','명령하는 사람'],['나라','사람의 땅'],['도시','모인 곳'],['궁전','높은 집'],['제단','돌의 자리'],['탄원자','청하는 사람'],['시민','성 안의 사람']],
    [['재앙','나쁜 바람'],['역병','몸의 불'],['신탁','입에서 온 명령'],['예언자','먼저 보는 입'],['운명','묶인 길'],['구원','밖으로 꺼냄'],['저승','아래의 어둠']],
    [['아버지','먼저 남자'],['어머니','처음 여자'],['아들','나온 몸'],['딸','작은 몸'],['형제','같은 피'],['아내','집의 여자'],['남편','집의 남자']],
    [['눈','빛 구멍'],['손','잡는 끝'],['피','붉은 물'],['입','말 구멍'],['죄','검은 일'],['침묵','닫힌 말'],['이름','남은 말']],
    [['죽','아래로 가'],['낳','몸에서 꺼내'],['보','빛을 먹'],['말','입을 열'],['듣','귀에 넣'],['알','붙잡아 알'],['찾','길을 더듬']],
    [['행복','좋은 끝'],['고통','아픈 것'],['슬픔','젖은 마음'],['안식','마지막 쉼'],['명성','남은 이름'],['수치','얼굴의 얼룩']]
  ];
  const residues=['그 말은 다른 길로 돌아왔다','뜻은 물처럼 남아 있었다','이름만 늦게 도착했다','입은 그렇게 기억했다','문장은 자기 그림자를 데리고 왔다','먼 말이 다시 한국어가 되었다'];
  function rng(i,p){let x=((i+1)*2654435761+p*1597334677)>>>0;return()=>{x^=x<<13;x>>>=0;x^=x>>>17;x>>>=0;x^=x<<5;x>>>=0;return x/4294967296};}
  function splitSpeaker(text){const m=text.match(/^([^:]{1,18}: )(.*)$/);if(m&&speakers.some(s=>m[1].includes(s)))return[m[1],m[2]];return['',text];}
  function mapWords(text,level,r){for(let t=0;t<drift.length;t++){for(const [a,b] of drift[t]){if(r()<0.38+level*0.09)text=text.split(a).join(b)}}return text;}
  function grammar(text,level,r){
    text=text.replace(/(은|는|이|가|을|를|에|의|도|만|로|으로|와|과|에게|께서|에서|부터|까지)\b/g,m=>r()<0.07+level*0.035?'':m);
    text=text.replace(/(하였습니다|했습니다|합니다|하십시오|하소서|하리라|하오|하네|하라|했다|한다|이다|였다|겠소|겠느냐|습니다|습니까|입니다)/g,m=>r()<0.18+level*0.05?['했다','하라','되었다','라고 한다','말했다','였다고 입이 말했다'][Math.floor(r()*6)]:m);
    if(r()<0.12+level*0.04){const parts=text.split(/(?<=[,;.!?])\s*/).filter(Boolean);if(parts.length>2){const first=parts.shift();parts.splice(Math.floor(r()*parts.length),0,first);text=parts.join(' ')}}
    return text;
  }
  function metaphor(text,level,r){
    const clauses=[
      '그 말은 다른 이름으로 입혀졌다',
      '그 뜻은 아래쪽에서 다시 불렸다',
      '남은 것은 사건보다 늦게 온 이름이었다',
      '문장은 원래의 집을 조금 잃었다',
      '말의 뼈는 남고 얼굴은 바뀌었다',
      '뜻은 살아 있었지만 방향은 바뀌었다'
    ];
    if(level>=2&&r()<0.20+level*0.07) text += ' ' + clauses[Math.floor(r()*clauses.length)];
    if(level>=4&&r()<0.28){
      text=text.replace(/,\s*/g,' / ');
      text=text.replace(/\.\s*/g,' · ');
    }
    return text;
  }
  function softenLoss(text,level,r){
    const words=text.split(/(\s+)/);
    let changed=0;
    return words.map(w=>{
      if(/^\s+$/.test(w)||w.length<3||changed>level)return w;
      if(r()<0.015+level*0.018&&!speakers.some(s=>w.includes(s))){changed++;return ['그것','그 말','그 몸','그 자리','어떤 것','남은 것'][Math.floor(r()*6)]}
      if(r()<0.012+level*0.014&&w.length>5){changed++;return w.slice(0,Math.max(2,w.length-1-Math.floor(r()*2)))}
      return w;
    }).join('');
  }
  function degrade(text,index,level){const r=rng(index,level+11);const [speaker,body]=splitSpeaker(text);let out=body;out=mapWords(out,level,r);out=grammar(out,level,r);out=softenLoss(out,level,r);out=metaphor(out,level,r);out=out.replace(/\s+/g,' ').replace(/\s+([,.?!〉」’])/g,'$1').trim();return `${speaker}${out}`.trim()||text;}
  const rows=(window.BookText||[]).map((entry,index)=>{const row=[];let text=entry.text;for(let level=1;level<=6;level++){text=degrade(text,index,level);row.push(text)}return row;});
  window.BookGen={labels,route,rows};
})();
