// 불량 인쇄소 — 압축 손실
// 문장을 "다시 저장할 때마다" 한글 자모 단위로 정보를 깎는다. 뜻을 바꾸려는 규칙은 없다.
// 이미지가 JPEG로 재저장될수록 세부 → 색 → 형태 순으로 무너지듯,
// 글자는 받침 → 거센소리 → 겹모음 → 띄어쓰기 → 모음 → 자음 → 블록 순으로 무너진다.
// 각 음절에는 문장 번호와 위치로 정해진 고정 난수가 있고, 단계마다 문턱이 올라가기만 한다.
// 그래서 한 번 깎인 정보는 다음 단계에서 돌아오지 않는다.  사용: node tools/compress.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const win = {};
new Function('window', fs.readFileSync(path.join(root, 'content.js'), 'utf8'))(win);
const TEXT = win.BookText;

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; }

/* 자모 */
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const split = ch => { if (!ch) return null; const c = ch.charCodeAt(0) - 0xAC00; return (c < 0 || c > 11171) ? null : [Math.floor(c / 588), Math.floor((c % 588) / 28), c % 28]; };
const join = (a, b, c) => String.fromCharCode(0xAC00 + a * 588 + b * 28 + c);

/* 양자화 표 */
// 받침: 겹받침·거센 받침은 먼저 홑받침으로, 그다음 사라진다
const JONG_SIMPLE = {'ㄲ': 'ㄱ', 'ㄳ': 'ㄱ', 'ㄵ': 'ㄴ', 'ㄶ': 'ㄴ', 'ㄺ': 'ㄱ', 'ㄻ': 'ㅁ', 'ㄼ': 'ㄹ', 'ㄽ': 'ㄹ', 'ㄾ': 'ㄹ', 'ㄿ': 'ㅂ', 'ㅀ': 'ㄹ', 'ㅄ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅊ': 'ㅈ', 'ㅋ': 'ㄱ', 'ㅌ': 'ㄷ', 'ㅍ': 'ㅂ', 'ㅎ': ''};
// 첫소리: 된소리·거센소리 → 예사소리
const CHO_PLAIN = {'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ', 'ㅊ': 'ㅈ', 'ㅋ': 'ㄱ', 'ㅌ': 'ㄷ', 'ㅍ': 'ㅂ'};
// 첫소리: 소리 나는 자리로 뭉갠다 (입술 → ㅁ, 혀끝 → ㄴ, 혀뿌리 → ㄱ, 그 밖 → ㅇ)
const CHO_PLACE = {'ㄱ': 'ㄱ', 'ㄴ': 'ㄴ', 'ㄷ': 'ㄴ', 'ㄹ': 'ㄴ', 'ㅁ': 'ㅁ', 'ㅂ': 'ㅁ', 'ㅅ': 'ㅇ', 'ㅇ': 'ㅇ', 'ㅈ': 'ㅇ', 'ㅎ': 'ㅇ'};
// 모음: 겹모음 → 홑모음
const JUNG_SIMPLE = {'ㅐ': 'ㅔ', 'ㅑ': 'ㅏ', 'ㅒ': 'ㅔ', 'ㅕ': 'ㅓ', 'ㅖ': 'ㅔ', 'ㅘ': 'ㅏ', 'ㅙ': 'ㅔ', 'ㅚ': 'ㅔ', 'ㅛ': 'ㅗ', 'ㅝ': 'ㅓ', 'ㅞ': 'ㅔ', 'ㅟ': 'ㅣ', 'ㅠ': 'ㅜ', 'ㅢ': 'ㅣ'};
// 모음: 셋만 남는다 (열린 ㅏ, 가운데 ㅡ, 닫힌 ㅣ)
const JUNG_THREE = {'ㅏ': 'ㅏ', 'ㅓ': 'ㅏ', 'ㅗ': 'ㅡ', 'ㅜ': 'ㅡ', 'ㅡ': 'ㅡ', 'ㅔ': 'ㅣ', 'ㅣ': 'ㅣ'};

/* 단계별 문턱 (1차 … 20차): 음절의 고정 난수가 문턱보다 작으면 그 손실이 일어난다.
   ramp(시작, 끝, 최대) — 시작 단계부터 끝 단계까지 곧게 올라가고, 그 뒤로는 최대에 머문다. */
const STAGES = 20;
const ramp = (from, to, max = 1) => Array.from({length: STAGES}, (_, k) => { const g = k + 1; return g < from ? 0 : g >= to ? max : max * (g - from + 1) / (to - from + 1); });
const T = {
  jongSimple: ramp(1, 4),          // 겹받침 → 홑받침
  jongDrop:   ramp(1, 10),         // 받침 탈락
  choPlain:   ramp(1, 8),          // 된소리·거센소리 → 예사소리
  jungSimple: ramp(3, 10),         // 겹모음 → 홑모음
  comma:      ramp(4, 7),          // 쉼표 탈락
  space:      ramp(5, 16, 0.95),   // 띄어쓰기 압축
  jungThree:  ramp(8, 15),         // 모음 셋으로
  choPlace:   ramp(9, 17, 0.9),    // 자음을 소리 자리로
  block:      ramp(10, 19, 0.5),   // 블록 현상: 네 칸이 첫 글자로 칠해진다
  drop:       ramp(9, 20, 0.7),    // 판독 불가
};

/* 판독 불가: 자리마다 망가지는 방식이 정해져 있다 (단계가 올라도 같은 자리는 같은 모양으로 남는다) */
const dec949 = new TextDecoder('euc-kr'), dec1252 = new TextDecoder('windows-1252');
function unreadable(ch, seed, i) {
  const r = hash(seed + 'kind' + i), code = ch.codePointAt(0);
  if (r < 0.18) return '?';                                              // 대체 문자
  if (r < 0.36) return '■';                                              // 검은 네모 (가림)
  if (r < 0.46) return '□';                                              // 글리프 없음 (두부)
  if (r < 0.56) return '\uFFFD';                                         // 깨진 바이트 (�)
  if (r < 0.72) {                                                        // UTF-8을 CP949로 읽음 (諛붾떎)
    const m = [...dec949.decode(Buffer.from(ch, 'utf8'))].filter(x => x !== '\uFFFD' && !/[\u0000-\u001f\u007f-\u009f]/.test(x)).join('');   // 제어 문자는 화면에 'IND' 같은 상자로 찍히므로 뺀다
    return m || '\uFFFD';
  }
  if (r < 0.82) return [...dec1252.decode(Buffer.from(ch, 'utf8'))].filter(x => x.codePointAt(0) > 0x9f || /[\x20-\x7e]/.test(x)).join('') || '\uFFFD';   // CP1252로 읽음 (ì™•)
  if (r < 0.97) {                                                        // 비트 하나 뒤집힘 (이웃 음절)
    const f = code ^ (1 << Math.floor(hash(seed + 'bit' + i) * 9));
    return f >= 0xAC00 && f <= 0xD7A3 ? String.fromCodePoint(f) : '■';
  }
  return '&#' + code + ';';                                              // 이스케이프된 채 남음
}

function compressAt(body, g, seed, boost) {
  const k = g - 1;
  // boost: 바뀐 것이 없을 때만, 이미 이 단계에서 시작된 손실을 조금 더 민다 (새 종류의 손실을 앞당기지 않는다)
  const on = (name, i) => hash(seed + name + i) < Math.min(1, T[name][k] + (T[name][k] > 0 ? boost * 0.05 : 0));
  const chars = [...body];
  const out = chars.map((ch, i) => {
    const s = split(ch);
    if (!s) {
      if (ch === ' ' && on('space', i)) return '';
      if (ch === ',' && on('comma', i)) return '';
      return ch;
    }
    let a = CHO[s[0]], b = JUNG[s[1]], c = JONG[s[2]];
    if (c && on('jongSimple', i) && c in JONG_SIMPLE) c = JONG_SIMPLE[c];
    if (c && on('jongDrop', i)) c = '';
    if (on('choPlain', i) && a in CHO_PLAIN) a = CHO_PLAIN[a];
    if (on('jungSimple', i) && b in JUNG_SIMPLE) b = JUNG_SIMPLE[b];
    if (on('jungThree', i)) b = JUNG_THREE[JUNG_SIMPLE[b] || b] || b;
    if (on('choPlace', i)) a = CHO_PLACE[CHO_PLAIN[a] || a] || a;
    if (on('drop', i)) return unreadable(ch, seed, i);
    return join(CHO.indexOf(a), JUNG.indexOf(b), JONG.indexOf(c));
  });
  // 블록: 원문 위치 기준 네 칸씩 묶어, 문턱 아래의 블록은 첫 한글로 칠한다 (공백·부호는 남긴다)
  for (let s = 0; s < out.length; s += 4) {
    if (!on('block', 'b' + s)) continue;
    const head = out.slice(s, s + 4).find(x => split(x));
    if (!head) continue;
    for (let i = s; i < Math.min(s + 4, out.length); i++) if (split(out[i])) out[i] = head;
  }
  return out.join('');
}

function chain(orig, index) {
  const seed = index + ':';
  const m = orig.match(/^([^:\s〈][^:]{0,11}): /);              // 화자 표시는 문서의 구조라서 남긴다
  let label = m ? m[0] : '', body = m ? orig.slice(label.length) : orig;
  const tag = body.match(/^〈[^〉]{1,14}〉 (?=\S)/);              // 〈첫째 정가〉 같은 합창 표지도
  if (tag) { label += tag[0]; body = body.slice(tag[0].length); }
  const res = [];
  // 저장할 때마다 반드시 무언가 잃는다.
  // 이번 단계에서 깎을 것이 없으면, 다음 단계의 손실을 앞당긴다 (adv, 되돌아가지 않음).
  // 20차의 손실까지 다 일어난 짧은 문장은 뒤에서부터 한 칸씩 판독 불가가 되고,
  // 그다음에는 길이가 줄어든다. 부호를 빼고 최소 한 칸은 남겨 누를 수 있게 한다.
  // 마지막 한 칸까지 남으면 그 칸도 � → □ → ■ 로 꺼진다.
  let prev = body, adv = 0, lost = 0, floor = 0;
  const FLOOR = ['\uFFFD', '□', '■'];
  const erode = s => {
    const a = [...s]; let n = lost;
    for (let i = a.length - 1; i >= 0 && n > 0; i--) if (split(a[i])) { a[i] = unreadable(a[i], seed, 'e' + i); n--; }
    const tail = /^[.?!〉]$/.test(a.at(-1) || '') ? 1 : 0;
    while (n-- > 0 && a.length > 1 + tail) a.splice(a.length - 1 - tail, 1);
    if (floor) a[Math.max(0, a.length - 1 - tail)] = FLOOR[floor - 1];
    return a.join('');
  };
  const at = g => erode(compressAt(body, Math.min(STAGES, g + adv), seed, 0));
  for (let g = 1; g <= STAGES; g++) {
    let s = at(g);
    while (s === prev && g + adv < STAGES) { adv++; s = at(g); }
    while (s === prev && lost < 400) { lost++; s = at(g); }
    while (s === prev && floor < FLOOR.length) { floor++; s = at(g); }
    res.push(label + s);
    prev = s;
  }
  return res;
}

// 본문 1,306문장 뒤에 개요 문장이 이어진다 (app.js의 overviewStart와 같은 순서). {n}은 손대지 않고 남겨 둔다.
const wikiWin = {};
new Function('window', fs.readFileSync(path.join(root, 'wiki.js'), 'utf8'))(wikiWin);
const OVERVIEW = wikiWin.WikiDoc.overview || [];
const rows = TEXT.map((e, i) => chain(e.text, i)).concat(OVERVIEW.map((t, k) => chain(t, TEXT.length + k)));
// 유통 중인 사본: 본문의 약 10%는 처음부터 5차·10차·15차 사본으로 열린다 (개요는 제외).
// 앞서 다녀간 누군가가 이미 가져갔던 문장이다. 이 문장들은 처음부터 원문 일치에서 빠진다.
const START = {};
TEXT.forEach((e, i) => { if (hash('start:' + i) < 0.10) START[i] = [5, 10, 15][Math.floor(hash('stage:' + i) * 3)]; });
const pick = process.argv.slice(3).map(Number);
if (process.argv[2] === '--dry') {
  for (const i of (pick.length ? pick : [0, 1, 13, 90, 400, 1305]))
    console.log('\n#' + i, (TEXT[i] ? TEXT[i].text : OVERVIEW[i - TEXT.length]) + '\n' + rows[i].map((x, k) => ' ' + String(k + 1).padStart(2) + ' ' + x).join('\n'));
} else {
  const out = '/* 압축 손실 1차–20차 (tools/compress.mjs, book/DEGRADATION.md). 번역도, 다시 쓰기도 아니다.\n   rows[i] = BookText[i]를 n번 다시 저장한 것. 한 번 잃은 정보는 돌아오지 않는다. */\n'
    + 'window.BookGen = {\n  labels: ' + JSON.stringify(Array.from({length: STAGES}, (_, k) => (k + 1) + '차')) + ',\n'
    + '  start: ' + JSON.stringify(START) + ',\n  rows: [\n'
    + rows.map(r => '  ' + JSON.stringify(r)).join(',\n') + '\n  ]\n};\n';
  fs.writeFileSync(path.join(root, 'content-gen.js'), out);
  console.log('wrote content-gen.js', rows.length, 'rows,', Object.keys(START).length, 'start degraded', JSON.stringify(Object.values(START).reduce((a, v) => (a[v] = (a[v] || 0) + 1, a), {})));
}
