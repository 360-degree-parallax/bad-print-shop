const fs = require('fs');
const vm = require('vm');

const root = process.cwd();
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(`${root}/content.js`, 'utf8'), context);
vm.runInContext(fs.readFileSync(`${root}/content-gen.js`, 'utf8'), context);

const bookText = context.window.BookText;
const previousRows = context.window.BookGen?.rows || [];

const routes = [
  ['1차', '태국어'],
  ['2차', '터키어'],
  ['3차', '아랍어'],
  ['4차', '스와힐리어'],
  ['5차', '몽골어'],
  ['6차', '조지아어'],
  ['7차', '크메르어'],
  ['8차', '라오어'],
  ['9차', '암하라어'],
  ['10차', '태국어']
];

const labels = routes.map(([turn, lang]) => `${turn} ${lang} 왕복`);

const speakerNames = [
  '오이디푸스', '제우스의 사제', '크레온', '테이레시아스', '합창대', '이오카스테',
  '사자', '목자', '시종', '둘째 사자', '코린토스 사자'
];

const dictionaries = [
  [['궁전', '왕의 집'], ['제단', '돌상'], ['탄원자', '빌러 온 자'], ['자녀', '아이'], ['도시', '성']],
  [['왕', '주인'], ['군주', '큰 주인'], ['나라', '땅'], ['재앙', '손상'], ['구원', '꺼냄']],
  [['신탁', '신의 말'], ['예언자', '앞말 사람'], ['역병', '불병'], ['저승', '어두운 아래'], ['운명', '정해진 길']],
  [['오이디푸스', '오이디푸스라는 자'], ['테바이', '그 도시'], ['라이오스', '죽은 주인'], ['이오카스테', '왕비 여자']],
  [['말해', '입에 내어'], ['보라', '눈으로 보라'], ['들으', '귀에 넣으'], ['죽', '사라지'], ['낳', '몸 밖에 내']],
  [['나의', '내가 가진'], ['그대', '너'], ['우리', '이쪽 사람'], ['그들', '저쪽 사람'], ['자신', '제 몸']],
  [['아폴론', '빛의 입'], ['제우스', '하늘 아버지'], ['스핑크스', '노래 짐승'], ['포이보스', '밝은 입']],
  [['아버지', '먼저의 남자'], ['어머니', '낳은 여자'], ['아들', '나온 남자'], ['딸', '나온 여자'], ['형제', '같은 집 사람']],
  [['눈', '보는 구멍'], ['손', '잡는 끝'], ['피', '붉은 물'], ['침묵', '닫힌 말'], ['죄', '검은 일']],
  [['행복', '좋은 끝'], ['고통', '아픈 것'], ['슬픔', '젖은 마음'], ['안식', '마지막 쉼'], ['명성', '남은 이름']]
];

function seeded(index, pass) {
  let x = ((index + 1) * 2654435761 + pass * 1597334677) >>> 0;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17; x >>>= 0;
    x ^= x << 5; x >>>= 0;
    return x / 0x100000000;
  };
}

function protectSpeaker(text) {
  const hit = text.match(/^([^:]{1,18}: )(.*)$/);
  if (!hit) return ['', text];
  if (speakerNames.some(name => hit[1].includes(name))) return [hit[1], hit[2]];
  return ['', text];
}

function replaceWords(text, pass, rand) {
  for (const [from, to] of dictionaries[(pass - 1) % dictionaries.length]) {
    text = text.split(from).join(rand() < 0.72 ? to : from);
  }
  return text;
}

function bruiseGrammar(text, pass, rand) {
  const particleRe = /(은|는|이|가|을|를|에|의|도|만|로|으로|와|과|에게|께서|에서|부터|까지)\b/g;
  const endingRe = /(하였습니다|했습니다|합니다|하십시오|하소서|하리라|하오|하네|하라|했다|한다|이다|였다|겠소|겠느냐)/g;
  text = text.replace(particleRe, m => rand() < 0.16 + pass * 0.012 ? '' : m);
  text = text.replace(endingRe, m => {
    if (rand() > 0.26 + pass * 0.018) return m;
    return ['했다', '한다', '하라', '되었다', '라고 한다'][Math.floor(rand() * 5)];
  });
  return text;
}

function shuffleSmall(text, pass, rand) {
  const clauses = text.split(/(?<=[,，;；.?!。！？])\s*/);
  if (clauses.length > 2 && rand() < 0.14 + pass * 0.012) {
    const first = clauses.shift();
    clauses.splice(Math.floor(rand() * clauses.length), 0, first);
    text = clauses.join(' ');
  }
  const tokens = text.split(/(\s+)/);
  let blanks = 0;
  text = tokens.map(token => {
    if (/^\s+$/.test(token) || token.length < 2) return token;
    if (blanks < 2 && rand() < 0.008 + pass * 0.006 && !speakerNames.some(name => token.includes(name))) {
      blanks++;
      return rand() < 0.65 ? '□' : '';
    }
    if (token.length > 6 && rand() < 0.012 + pass * 0.004) {
      return token.slice(0, Math.max(2, token.length - 1 - Math.floor(rand() * 3)));
    }
    return token;
  }).join('');
  return text;
}

function residue(text, pass, rand) {
  if (pass < 7 || rand() > 0.18) return text;
  const bits = ['라고 돌아왔다', '이 뜻은 남았다', '말은 접혔다', '다시 한국어가 되었다', '이름이 바뀌었다'];
  return `${text} ${bits[Math.floor(rand() * bits.length)]}`;
}

function pass(text, index, passNumber) {
  const rand = seeded(index, passNumber);
  const [speaker, body] = protectSpeaker(text);
  let out = replaceWords(body, passNumber, rand);
  out = bruiseGrammar(out, passNumber, rand);
  out = shuffleSmall(out, passNumber, rand);
  out = residue(out, passNumber, rand);
  out = out
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.?!〉」’])/g, '$1')
    .trim();
  return `${speaker}${out}`.trim();
}

function buildRow(entry, index) {
  const old = previousRows[index] || [];
  const row = [];
  row[0] = pass(entry.text, index, 1);
  for (let i = 1; i <= 6; i++) {
    row[i] = old[i - 1] || pass(row[i - 1], index, i + 1);
  }
  row[7] = pass(row[6], index, 8);
  row[8] = pass(row[7], index, 9);
  row[9] = pass(row[8], index, 10);
  return row;
}

const rows = bookText.map(buildRow);
const js = `/* 한국어 -> 경유 언어 -> 한국어 왕복 훼손 사슬. BookText 인덱스와 1:1 대응. */\nwindow.BookGen=${JSON.stringify({ labels, route: routes, rows }, null, 2)};\n`;
fs.writeFileSync(`${root}/content-gen.js`, js);
