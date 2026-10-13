// 불량 인쇄소 — 언어 훼손기
// 번역이 아니다. 원문 한 문장에 일곱 번의 "기준 있는 손상"을 누적해서 적용한다.
// 규칙은 모두 결정적이다. 같은 입력은 언제나 같은 일곱 문장을 낳는다.
// 사용: node tools/degrade.mjs  → content-gen.js 를 다시 쓴다.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const win = {};
new Function('window', fs.readFileSync(path.join(root, 'content.js'), 'utf8'))(win);
const TEXT = win.BookText;

/* ───────── 결정적 난수 ───────── */
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ───────── 한글 조사 맞추기 ───────── */
function jong(ch) { const c = ch.charCodeAt(0) - 0xAC00; if (c < 0 || c > 11171) return 0; return c % 28; }
function fixJosa(josa, word) {
  const last = word.slice(-1), j = jong(last), has = j > 0;
  switch (josa) {
    case '은': case '는': return has ? '은' : '는';
    case '이': case '가': return has ? '이' : '가';
    case '을': case '를': return has ? '을' : '를';
    case '과': case '와': return has ? '과' : '와';
    case '으로': case '로': return (!has || j === 8) ? '로' : '으로';
    default: return josa;
  }
}

/* ───────── 기준 1: 어휘 사다리 ─────────
   한 단어가 단계마다 한 칸씩 내려간다. 올라가는 법은 없다.
   뜻이 가까운 말로 시작해서, 마지막에는 몇 개의 몸·물·상처로 모인다. */
const LADDERS = {
  // 권력
  '왕': ['주인', '명령하는 사람', '높은 사람', '보는 자', '높은 눈', '눈', '눈'],
  '임금': ['주인', '명령하는 사람', '높은 사람', '보는 자', '높은 눈', '눈', '눈'],
  '군주': ['주인', '명령하는 사람', '높은 사람', '보는 자', '높은 눈', '눈', '눈'],
  '통치자': ['명령하는 사람', '높은 사람', '보는 자', '높은 눈', '눈', '눈', '눈'],
  '폭군': ['세게 누르는 사람', '누르는 손', '붉은 손', '붉은 손', '손', '몸', '몸'],
  '왕비': ['주인의 여자', '곁의 사람', '곁의 몸', '곁의 몸', '몸', '그릇', '그릇'],
  '왕좌': ['높은 자리', '자리', '높은 곳', '위', '위', '구멍', '구멍'],
  '왕국': ['주인의 땅', '땅', '사람의 땅', '배', '배', '몸', '그릇'],
  '왕위': ['높은 자리', '자리', '높은 곳', '위', '위', '구멍', '구멍'],
  // 장소
  '나라': ['땅', '사람의 땅', '배', '배', '몸', '몸', '그릇'],
  '도시': ['땅', '사람의 땅', '배', '배', '몸', '몸', '그릇'],
  '고장': ['땅', '땅', '배', '배', '몸', '몸', '그릇'],
  '조국': ['아버지의 땅', '먼저 온 땅', '배', '배', '몸', '몸', '그릇'],
  '테바이': ['땅', '그 땅', '배', '배', '몸', '몸', '그릇'],
  '궁전': ['큰 집', '집', '그릇', '그릇', '몸', '몸', '구멍'],
  '집': ['방', '그릇', '그릇', '몸', '몸', '구멍', '구멍'],
  '성벽': ['벽', '벽', '몸', '몸', '피부', '피부', '상처'],
  '제단': ['돌', '낮은 돌', '돌', '그릇', '그릇', '몸', '몸'],
  '길': ['선', '선', '선', '상처', '상처', '구멍', '구멍'],
  '산': ['높은 땅', '높은 땅', '배', '몸', '몸', '그릇', '그릇'],
  '땅': ['흙', '흙', '몸', '몸', '배', '그릇', '그릇'],
  // 사람
  '백성': ['사람들', '사람', '무리', '몸들', '몸들', '몸', '상처'],
  '시민': ['사람들', '사람', '무리', '몸들', '몸들', '몸', '상처'],
  '자녀': ['작은 사람', '작은 몸', '작은 몸', '머리', '머리', '머리', '머리'],
  '아이': ['작은 사람', '작은 몸', '작은 몸', '머리', '머리', '머리', '머리'],
  '아들': ['남자 아이', '이어지는 사람', '이어지는 몸', '머리', '머리', '그릇', '그릇'],
  '딸': ['여자 아이', '이어지는 사람', '이어지는 몸', '머리', '머리', '그릇', '그릇'],
  '아버지': ['윗사람', '먼저 온 사람', '먼저 있던 몸', '뿌리', '뿌리', '상처', '상처'],
  '어머니': ['낳은 사람', '낳은 몸', '그릇', '그릇', '그릇', '구멍', '구멍'],
  '아내': ['곁의 사람', '곁의 몸', '곁의 몸', '그릇', '그릇', '구멍', '구멍'],
  '남편': ['곁의 사람', '곁의 몸', '곁의 몸', '몸', '몸', '몸', '상처'],
  '형제': ['같은 몸', '같은 몸', '같은 피', '같은 물', '같은 물', '물', '물'],
  '목자': ['따라가는 사람', '따라가는 사람', '아래의 사람', '아래의 눈', '눈', '눈', '눈'],
  '사제': ['말하는 사람', '말하는 사람', '입', '입', '입', '입', '구멍'],
  '예언자': ['보는 사람', '보는 자', '눈', '눈', '눈', '구멍', '구멍'],
  '노인': ['오래된 사람', '오래된 몸', '마른 몸', '마른 몸', '뼈', '뼈', '뼈'],
  '사자': ['오는 사람', '전하는 입', '입', '입', '입', '구멍', '구멍'],
  '시종': ['아래 사람', '아래 몸', '손', '손', '손', '몸', '몸'],
  '범인': ['붉은 손', '붉은 사람', '붉은 몸', '몸', '몸', '상처', '상처'],
  '살인자': ['손이 붉은 사람', '붉은 사람', '붉은 손', '붉은 몸', '몸', '상처', '상처'],
  '죄인': ['붉은 사람', '붉은 손', '붉은 몸', '몸', '상처', '상처', '상처'],
  '탄원자': ['엎드린 사람', '엎드린 몸', '낮은 몸', '낮은 몸', '몸', '그릇', '그릇'],
  '사람': ['몸', '몸', '그릇', '그릇', '몸', '그릇', '구멍'],
  // 신과 말
  '신들': ['위의 존재들', '높은 눈들', '보는 자들', '눈들', '눈들', '눈', '눈'],
  '신': ['위의 존재', '높은 눈', '보는 자', '눈', '눈', '눈', '눈'],
  '신탁': ['위의 말', '오래된 말', '붉은 말', '붉은 말', '붉은 소리', '소리', '구멍'],
  '예언': ['앞의 말', '오래된 말', '붉은 말', '붉은 말', '소리', '소리', '구멍'],
  '말씀': ['소리', '소리', '입김', '입김', '입김', '구멍', '구멍'],
  '이름': ['표시', '표시', '표', '상처', '상처', '상처', '상처'],
  '진실': ['사실', '사실', '말', '소리', '구멍', '구멍', '구멍'],
  '비밀': ['닫힌 것', '닫힌 구멍', '구멍', '구멍', '구멍', '구멍', '구멍'],
  '수수께끼': ['질문', '구멍', '구멍', '입', '입', '입', '구멍'],
  '운명': ['길', '선', '선', '상처', '상처', '구멍', '구멍'],
  '저주': ['붉은 말', '붉은 말', '붉은 물', '붉은 물', '상처', '상처', '상처'],
  '죄': ['얼룩', '붉은 얼룩', '붉은 얼룩', '붉음', '붉음', '상처', '상처'],
  // 병과 몸
  '역병': ['병', '붉은 병', '붉은 물', '상처', '상처', '상처', '구멍'],
  '재앙': ['나쁜 일', '붉은 일', '붉은 물', '상처', '상처', '상처', '구멍'],
  '재난': ['나쁜 일', '붉은 일', '붉은 물', '상처', '상처', '상처', '구멍'],
  '불행': ['나쁜 일', '붉은 일', '붉은 물', '상처', '상처', '상처', '구멍'],
  '고통': ['아픔', '아픔', '붉음', '상처', '상처', '상처', '구멍'],
  '고뇌': ['아픔', '아픔', '붉음', '상처', '상처', '상처', '구멍'],
  '슬픔': ['아픔', '아픔', '붉음', '상처', '상처', '상처', '구멍'],
  '죽음': ['끝', '끝', '구멍', '구멍', '구멍', '구멍', '구멍'],
  '피': ['붉은 물', '붉음', '붉은 물', '붉은 물', '붉은 물', '물', '물'],
  '바다': ['물', '붉은 물', '붉은 물', '붉은 물', '상처', '상처', '상처'],
  '파도': ['물결', '물', '붉은 물', '붉은 물', '붉은 물', '물', '상처'],
  '불': ['붉은 빛', '붉음', '붉음', '붉음', '붉은 물', '물', '물'],
  '빛': ['눈', '눈', '눈', '구멍', '구멍', '구멍', '구멍'],
  '어둠': ['구멍', '구멍', '구멍', '구멍', '구멍', '구멍', '구멍'],
  '얼굴': ['머리', '머리', '머리', '머리', '구멍', '구멍', '구멍'],
  '마음': ['머리', '머리', '머리', '배', '배', '배', '그릇'],
  '생각': ['머리', '머리', '머리', '구멍', '구멍', '구멍', '구멍'],
  '발': ['아래', '아래', '몸', '몸', '몸', '몸', '몸'],
  '손': ['몸', '몸', '몸', '몸', '몸', '몸', '몸'],
};
const KEYS = Object.keys(LADDERS).sort((a, b) => b.length - a.length);

/* 형용사·수식어: 훼손이 깊어질수록 모두 "붉은"으로 모인다 */
const ADJ = {
  '거센': ['거친', '붉은', '붉은', '붉은', '붉은', '붉은', '붉은'],
  '거친': ['붉은', '붉은', '붉은', '붉은', '붉은', '붉은', '붉은'],
  '큰': ['높은', '높은', '붉은', '붉은', '붉은', '붉은', '붉은'],
  '위대한': ['높은', '높은', '붉은', '붉은', '붉은', '붉은', '붉은'],
  '고귀한': ['높은', '높은', '높은', '붉은', '붉은', '붉은', '붉은'],
  '존귀한': ['높은', '높은', '높은', '붉은', '붉은', '붉은', '붉은'],
  '가련한': ['작은', '아픈', '붉은', '붉은', '붉은', '붉은', '붉은'],
  '불쌍한': ['작은', '아픈', '붉은', '붉은', '붉은', '붉은', '붉은'],
  '가엾은': ['작은', '아픈', '붉은', '붉은', '붉은', '붉은', '붉은'],
  '불행한': ['아픈', '아픈', '붉은', '붉은', '붉은', '붉은', '붉은'],
  '사랑하는': ['아는', '보는', '보는', '보는', '보는', '보는', '보는'],
  '늙은': ['오래된', '오래된', '마른', '마른', '마른', '마른', '마른'],
  '어린': ['작은', '작은', '작은', '작은', '작은', '작은', '작은'],
  '끔찍한': ['붉은', '붉은', '붉은', '붉은', '붉은', '붉은', '붉은'],
  '무서운': ['붉은', '붉은', '붉은', '붉은', '붉은', '붉은', '붉은'],
  '신성한': ['높은', '높은', '붉은', '붉은', '붉은', '붉은', '붉은'],
  '더러운': ['붉은', '붉은', '붉은', '붉은', '붉은', '붉은', '붉은'],
};

/* 대명사: 2인칭이 3인칭으로 물러나고, 마지막에는 누구의 것도 아니게 된다 */
const PRON_PL = ['너희', '너희', '그 사람들', '그 사람들', '그 몸들', '그 몸들', '머리들'];
const PRON = {
  '그대': ['너', '너', '그 사람', '그 사람', '그 몸', '그 몸', '머리'],
};

/* 기준 3: 이음말과 어림말은 가장 먼저 빠진다 */
const FILLER = ['그리고', '그러나', '그러므로', '그러니', '하지만', '또한', '정말', '참으로', '매우', '이미', '다만', '이제', '결코', '반드시', '진정', '오직', '모두'];

/* 기준 7: 끝에 남는 조각들 (모든 문장이 같은 곳으로 흘러간다) */
const FRAGMENTS = ['붉은 물속에서.', '그 아래에서.', '상처 안에서.', '머리 없이.', '눈 없이.', '배 위에서.', '그릇 속에서.', '물 아래에서.', '구멍 쪽으로.', '몸 안에서.'];

const CHAIN = '(?:께서|에게서|에게|에서|으로|로|은|는|이|가|을|를|의|에|도|만|와|과|께|까지|부터){0,2}';
const nounRe = new RegExp(`(?<![가-힣A-Za-z])(${KEYS.join('|')})(들)?(?:(${CHAIN})(?![가-힣]))`, 'g');
const adjRe = new RegExp(`(?<![가-힣])(${Object.keys(ADJ).join('|')})(?![가-힣])`, 'g');
const pronRe = new RegExp(`(?<![가-힣])(그대)(들)?(?!로)(${CHAIN})(?![가-힣])`, 'g');
const fillerRe = new RegExp(`(?<![가-힣])(?:${FILLER.join('|')}) `, 'g');

const splitJosa = (chain) => {
  if (!chain) return ['', ''];
  for (const j of ['께서', '에게서', '에게', '에서', '으로', '로', '은', '는', '이', '가', '을', '를', '의', '에', '도', '만', '와', '과', '께', '까지', '부터']) {
    if (chain.startsWith(j)) return [j, chain.slice(j.length)];
  }
  return [chain, ''];
};

function rung(ladder, stage, delay) {
  const k = stage - 1 - delay;
  if (k < 0) return null;
  return ladder[Math.min(k, ladder.length - 1)];
}

/* 단일 단계(stage)에서의 명사·대명사 교체. hits 에는 (원래 말 → 바뀐 말)을 기록한다 */
function swapNouns(s, stage, seed, hits) {
  const apply = (re, table, honorific) => s = s.replace(re, (m, key, pl, chain) => {
    const delay = hash(seed + key) % 2;
    const base = rung(table[key], stage, delay);
    if (base == null) return m;
    const word = (key === '그대' && pl) ? PRON_PL[Math.min(stage - 1 - delay, 6)] : base + (pl || '');
    let [j, rest] = splitJosa(chain || '');
    if (j === '께서' && honorific) j = stage >= 2 ? '이' : j;       // 높임 조사의 탈락
    j = fixJosa(j, word);
    if (hits && !hits.some(h => h[0] === key)) hits.push([key, base]);
    return word + j + rest;
  });
  apply(nounRe, LADDERS, true);
  apply(pronRe, PRON, false);
  return s;
}

function swapAdj(s, stage, seed) {
  return s.replace(adjRe, (m, key) => rung(ADJ[key], stage, hash(seed + key) % 2) ?? m);
}

/* 기준 2: 높임의 하강 (합쇼체 → 해라체, 하십시오 → 해라) */
function demoteTail(s, g) {
  s = s
    .replace(/입니다/g, '이다')
    .replace(/하십시오/g, '해라').replace(/마십시오/g, '마라')
    .replace(/하시오(?![가-힣])/g, '해라').replace(/마시오(?![가-힣])/g, '마라').replace(/(하소서)(?![가-힣])/g, '해라')
    .replace(/([가-힣])습니다/g, (m, c) => (jong(c) === 20 || '겠있없'.includes(c)) ? c + '다' : c + '는다')   // 했습니다 → 했다, 겪습니다 → 겪는다
    .replace(/([가-힣])니다/g, (m, c) => {
      const code = c.charCodeAt(0) - 0xAC00;
      if (code < 0 || code > 11171 || code % 28 !== 17) return m;
      return String.fromCharCode(0xAC00 + code - 17 + 4) + '다';          // ㅂ → ㄴ  (합니다 → 한다)
    });
  if (g >= 3) s = s.replace(/(있|없)소(?![가-힣])/g, '$1다').replace(/하오(?![가-힣])/g, '한다').replace(/이오(?![가-힣])/g, '이다').replace(/되오(?![가-힣])/g, '된다');
  return s;
}

/* 기준 5·6: 절의 압축 */
function compress(s, keep) {
  const parts = s.split(/,\s*/);
  if (parts.length < 3) return s;
  if (keep === 'ends') return parts[0] + ', ' + parts[parts.length - 1];
  return parts[parts.length - 1];
}

/* 기준 4: 가장 긴 어절부터 흐려진다 (구체적인 말이 먼저 사라진다)
   단계 g 에서 어절 g 개가 "몸·물·상처…" 같은 끌개 말로 바뀐다. 조사는 남기고, 이름·술어는 건드리지 않는다. */
const ATTRACTORS = ['몸', '물', '상처', '머리', '그릇', '구멍', '눈', '입'];
const JOSA_TAIL = ['께서', '에게서', '에게', '에서', '으로', '처럼', '보다', '까지', '부터', '마저', '조차', '로', '은', '는', '이', '가', '을', '를', '의', '에', '도', '만', '와', '과'];
const wikiWin = {};
new Function('window', fs.readFileSync(path.join(root, 'wiki.js'), 'utf8'))(wikiWin);
const NAMES = (wikiWin.WikiDoc.characters || []).map(c => c.name).concat(['오이디푸스', '이오카스테', '크레온', '테이레시아스', '라이오스', '스핑크스', '카드모스', '폴리보스', '메로페', '제우스', '아폴론', '코린토스', '테바이', '델포이', '포이보스']);
const PUNCT_L = /^[〈"“‘'(\[]+/, PUNCT_R = /[〉"”’'.,!?;:…)\]]+$/;

function blur(tokens, k, seed, capFrac) {
  const idx = [];
  tokens.forEach((t, i) => {
    if (i === tokens.length - 1) return;                                    // 술어는 남긴다
    const core = t.replace(PUNCT_L, '').replace(PUNCT_R, '');
    if (core.length < 3 || NAMES.some(n => core.includes(n)) || /[0-9A-Za-z]/.test(core)) return;
    const j = JOSA_TAIL.find(j => core.endsWith(j) && core.length - j.length >= 2);
    if (!j) return;                                                         // 조사가 붙은 체언만 흐린다
    if (/[는은이가로]/.test(j) && '하되있없같시보주받오가러려'.includes(core[core.length - j.length - 1])) return;   // 동사 어미(대표하는, 듯하니)는 제외
    idx.push([i, core.length - j.length]);
  });
  idx.sort((x, y) => y[1] - x[1] || x[0] - y[0]);
  const cap = Math.max(1, Math.ceil(idx.length * capFrac));
  const pick = new Set(idx.slice(0, Math.min(k, cap)).map(x => x[0]));
  return tokens.map((t, i) => {
    if (!pick.has(i)) return t;
    const l = (t.match(PUNCT_L) || [''])[0], r = (t.match(PUNCT_R) || [''])[0];
    let core = t.slice(l.length, t.length - r.length), josa = '';
    for (const j of JOSA_TAIL) if (core.endsWith(j) && core.length - j.length >= 2) { josa = j; core = core.slice(0, -j.length); break; }
    const word = ATTRACTORS[hash(seed + core) % ATTRACTORS.length];
    return l + word + fixJosa(josa, word) + r;
  });
}

/* 기준 5: 수식어의 탈락. 조사 없는 꾸밈말부터, 해시 순서대로 단계마다 더 많이 빠진다 (7차에는 술어 앞의 꾸밈말이 모두 사라진다) */
function dropModifiers(tokens, g, seed) {
  if (g < 3) return tokens;
  const cand = [];
  tokens.forEach((t, i) => {
    if (i === tokens.length - 1 || /[,.!?〉〈]/.test(t)) return;
    const core = t.replace(PUNCT_L, '').replace(PUNCT_R, '');
    if (core.length < 2 || NAMES.some(n => core.includes(n)) || /:/.test(t)) return;
    if (JOSA_TAIL.some(j => core.endsWith(j) && core.length - j.length >= 2)) return;
    cand.push([hash(seed + 'd' + core + i), i]);
  });
  cand.sort((a, b) => a[0] - b[0]);
  const n = Math.floor(cand.length * Math.min(1, (g - 2) / 5));
  const gone = new Set(cand.slice(0, n).map(x => x[1]));
  return tokens.filter((_, i) => !gone.has(i));
}

const copula = w => w + (jong(w.slice(-1)) ? '이었' : '였');
const addFrag = (s, frag, stagedir) => stagedir ? s.replace(/〉$/, ' ' + frag + '〉') : s.replace(/\s*$/, '') + ' ' + frag;

function damageChain(orig, index) {
  const seed = String(index) + ':';
  const m = orig.match(/^([^:\s〈][^:]{0,11}): /);
  let label = m ? m[0] : '';
  let body = m ? orig.slice(label.length) : orig;
  const tag = body.match(/^〈[^〉]{1,14}〉 (?=\S)/);                         // 〈첫째 정가〉 같은 합창 표지는 남긴다
  if (tag) { label += tag[0]; body = body.slice(tag[0].length); }
  const stagedir = body.startsWith('〈') && body.endsWith('〉');
  const out = [];
  let prev = body;
  const bonus = [];
  const fragOrder = FRAGMENTS.map(f => [hash(seed + f), f]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  for (let g = 1; g <= 7; g++) {
    const hits = [];
    // (4) 어절 흐리기 — 원문에서 직접 계산한다. 단계가 오를수록 더 많은 어절이 바뀌고, 7차에는 체언이 거의 남지 않는다
    let toks = blur(body.split(' '), Math.ceil(g * 1.3), seed, 0.5 + 0.08 * g);
    toks = dropModifiers(toks, g, seed);
    let s = toks.join(' ');
    // (1) 어휘 사다리
    s = swapNouns(s, g, seed, hits);
    s = swapAdj(s, g, seed);
    s = s.replace(/(?<![가-힣])너가/g, '네가');
    // (2) 높임의 하강
    s = demoteTail(s, g);
    // (3) 이음말 탈락, 문장부호 평탄화
    if (g >= 3) s = s.replace(fillerRe, '').replace(/!/g, '.');
    if (g >= 4) s = s.replace(/\?/g, '.').replace(/[;:]/g, ',');
    // (5) 절의 압축
    if (!stagedir && s.length > 36) {
      if (g === 5) s = compress(s, 'ends');
      if (g >= 6) s = compress(s, 'last');
    }
    const pairs = hits.filter(h => h[0] !== h[1]);
    // (5') 술어의 붕괴 (5차부터): 마지막 서술어가 "X였다"로 닳는다
    if (!stagedir && g >= 5) {
      const X = pairs.length ? pairs[hash(seed + 'p') % pairs.length][1] : ATTRACTORS[hash(seed + 'p') % ATTRACTORS.length];
      const sp = s.split(' ');
      if (sp.length > 2) {
        const w = X.split(' ').pop();
        sp[sp.length - 1] = copula(w) + '다.';
        if (sp[sp.length - 2] === w) sp.splice(sp.length - 2, 1);              // "눈 눈이었다" → "눈이었다"
        s = sp.join(' ');
      }
    }
    // (6) 이름 붙이기 틀
    if (!stagedir && pairs.length && g >= 6) {
      const [a, b] = pairs[hash(seed + g) % pairs.length];
      const strip = t => t.replace(/[.!?]+$/, '');
      if (g === 6) s = strip(s) + '. ' + b + fixJosa('은', b) + ' ' + a + '의 이름으로 남았다.';
    }
    // (7) 술어의 붕괴 (5차부터): 마지막 서술어가 "X였다"로 닳는다. 7차에는 "A는 B였고, B는 C였다"의 사슬이 붙는다
    if (!stagedir && g === 7) {
      const A = pairs.length ? pairs[0][1].split(' ').pop() : ATTRACTORS[hash(seed + 'A') % ATTRACTORS.length];
      let B = ATTRACTORS[hash(seed + 'B') % ATTRACTORS.length]; if (B === A) B = '상처';
      let C = ATTRACTORS[hash(seed + 'C') % ATTRACTORS.length]; if (C === B || C === A) C = '구멍';
      s = s.replace(/[.!?]+$/, '') + '. ' + A + fixJosa('은', A) + ' ' + copula(B) + '고, ' + B + fixJosa('은', B) + ' ' + copula(C) + '다.';
    }
    const lastWord = s.replace(/[.!?〉\s]+$/, '').split(' ').pop().replace(/[,.]$/, '');
    for (const f of bonus) s = addFrag(s, f, stagedir);
    // (8) 앞 세대와 같으면 안 된다. 바뀔 곳이 없는 문장은 끝이 닳아서라도 달라진다 (누적).
    //     홀수 번째는 끝 어절의 메아리, 짝수 번째는 조각.
    let guard = 0;
    while (s === prev && guard++ < 8) {
      const n = bonus.length;
      let f;
      if (n % 2 === 0) {
        const echo = n === 0 ? lastWord : lastWord.slice(-Math.max(1, 2 - n / 2));   // 메아리는 점점 짧아진다
        f = echo.length >= 1 && !/[〈〉:]/.test(echo) ? echo + '.' : ATTRACTORS[(n + 3) % ATTRACTORS.length] + '.';
      } else f = ATTRACTORS[hash(seed + n) % ATTRACTORS.length] + '.';
      bonus.push(f);
      s = addFrag(s, f, stagedir);
    }
    out.push(label + s);
    prev = s;
  }
  return out;
}

/* ───────── 손으로 쓴 표본 (13번 문장: 사제의 첫 호소) ───────── */
const OVERRIDE = {
  13: [
    '왕의 눈앞에서, 이 땅은 배가 되어 거친 물에 맞고 붉은 바다 아래에서 고개를 잃었습니다.',
    '보는 자의 왕 앞에서, 땅은 배의 몸이 되었고 붉은 바다가 그 머리를 아래로 잡았습니다.',
    '명령자의 시선 아래, 백성의 배는 바다가 아니라 상처 속에 잠겼고, 머리는 기억하지 못했습니다.',
    '명령하는 눈앞에서, 사람의 땅은 목 없는 배가 되어 끓는 붉음 속에서 방향을 잃었습니다.',
    '나라였던 것은 배로 번역되었고, 배였던 것은 몸으로 돌아왔으며, 몸은 붉은 물에서 일어나지 않았습니다.',
    '높은 눈 아래, 사람의 땅은 끓는 상처 속에 놓인 배였고, 그 배는 고개를 다시 배우지 못했습니다.',
    '마지막으로 남은 말은 이렇습니다. 높은 눈 아래, 사람의 땅은 배였고, 배는 상처였고, 상처는 붉은 물속에서 더는 위를 말하지 못했습니다.',
  ],
};

const rows = TEXT.map((e, i) => OVERRIDE[i] || damageChain(e.text, i));
const labels = ['1차', '2차', '3차', '4차', '5차', '6차', '7차'];
const body = '/* 훼손 1차–7차. 번역이 아니라 규칙에 따른 손상이다 (tools/degrade.mjs, book/DEGRADATION.md).\n   BookText 인덱스와 1:1 대응 (rows[i] = [1차,…,7차]), 각 차수는 앞 차수 위에 겹쳐진다. */\n'
  + 'window.BookGen = {\n  labels: ' + JSON.stringify(labels) + ',\n  rows: [\n'
  + rows.map(r => '  ' + JSON.stringify(r)).join(',\n') + '\n  ]\n};\n';
if (process.argv.includes('--dry')) { for (const i of [0, 1, 13, 14, 33, 200, 330, 1305]) console.log(i, TEXT[i].text, '\n', rows[i].join('\n ')); }
else { fs.writeFileSync(path.join(root, 'content-gen.js'), body); console.log('wrote content-gen.js', rows.length, 'rows'); }
