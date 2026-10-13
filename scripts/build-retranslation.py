#!/usr/bin/env python3
"""
Build content-gen.js (2차–7차 재번역 사슬) with a real translation API.

Each cycle is ko -> <lang> -> ko. Six cycles produce 2차..7차.
Requires one of:
  DEEPL_API_KEY   (DeepL; set DEEPL_API_URL=https://api.deepl.com/v2/translate for Pro keys)
  GOOGLE_API_KEY  (Google Cloud Translation v2)

Usage:
  DEEPL_API_KEY=... python3 scripts/build-retranslation.py --lang pl
  GOOGLE_API_KEY=... python3 scripts/build-retranslation.py --lang pl --provider google

Progress is cached in .retranslation-cache.json next to the repo root, so an
interrupted run resumes without re-paying for finished cycles.
"""
import argparse
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content.js"
OUT = ROOT / "content-gen.js"
CACHE = ROOT / ".retranslation-cache.json"
CYCLES = 6
BATCH = 50  # sentences per API request


def load_source():
    src = CONTENT.read_text(encoding="utf-8")
    m = re.search(r"window\.BookText=\[(.*?)\];", src, re.S)
    if not m:
        sys.exit("BookText not found in content.js")
    book = json.loads("[" + m.group(1) + "]")
    return [b["text"] for b in book]


def post_json(url, headers, body):
    req = urllib.request.Request(
        url, data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers}, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


class DeepL:
    def __init__(self):
        self.key = os.environ["DEEPL_API_KEY"]
        self.url = os.environ.get("DEEPL_API_URL", "https://api-free.deepl.com/v2/translate")

    def translate(self, texts, src, tgt):
        res = post_json(self.url, {"Authorization": f"DeepL-Auth-Key {self.key}"},
                        {"text": texts, "source_lang": src.upper(), "target_lang": tgt.upper()})
        return [t["text"] for t in res["translations"]]


class Google:
    def __init__(self):
        self.key = os.environ["GOOGLE_API_KEY"]
        self.url = ("https://translation.googleapis.com/language/translate/v2?key="
                    + self.key)

    def translate(self, texts, src, tgt):
        res = post_json(self.url, {}, {"q": texts, "source": src, "target": tgt, "format": "text"})
        return [t["translatedText"] for t in res["data"]["translations"]]


def translate_all(client, texts, src, tgt, cache, tag):
    key_prefix = f"{tag}|{src}>{tgt}|"
    out = [None] * len(texts)
    todo = []
    for i, t in enumerate(texts):
        hit = cache.get(key_prefix + t)
        if hit is not None:
            out[i] = hit
        else:
            todo.append(i)
    for start in range(0, len(todo), BATCH):
        idxs = todo[start:start + BATCH]
        got = client.translate([texts[i] for i in idxs], src, tgt)
        for i, g in zip(idxs, got):
            out[i] = g
            cache[key_prefix + texts[i]] = g
        CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
        print(f"  {tag} {src}>{tgt}: {min(start + BATCH, len(todo))}/{len(todo)}", flush=True)
    return out


def write_output(gens, lang):
    labels = ["2차", "3차", "4차", "5차", "6차", "7차"]
    rows = [[gens[c][i] for c in range(CYCLES)] for i in range(len(gens[0]))]
    body = ",\n  ".join(json.dumps(r, ensure_ascii=False) for r in rows)
    OUT.write_text(
        "/* 2차–7차 재번역 사슬. BookText 인덱스와 1:1 대응 (rows[i] = [2차,3차,4차,5차,6차,7차]) */\n"
        "window.BookGen = {\n"
        f'  labels: {json.dumps(labels, ensure_ascii=False)},\n'
        f'  basis: "ko -> {lang} -> ko x {CYCLES} cycles (machine translation)",\n'
        '  "rows": [\n  ' + body + "\n  ]\n};\n",
        encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", default="pl", help="pivot language code (pl, ja, tr, yo, ...)")
    ap.add_argument("--provider", choices=["deepl", "google"], default=None)
    args = ap.parse_args()

    provider = args.provider or ("deepl" if os.environ.get("DEEPL_API_KEY") else "google")
    client = DeepL() if provider == "deepl" else Google()
    tag = f"{provider}"

    sources = load_source()
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}

    gens = []  # gens[c] = list of texts for cycle c+1 (2차 = gens[0])
    current = sources
    for c in range(CYCLES):
        print(f"cycle {c + 1}/{CYCLES} (-> {c + 2}차)", flush=True)
        pivot = translate_all(client, current, "ko", args.lang, cache, tag)
        back = translate_all(client, pivot, args.lang, "ko", cache, tag)
        gens.append(back)
        current = back

    write_output(gens, args.lang)
    print(f"wrote {OUT} ({len(sources)} rows x {CYCLES} generations)")


if __name__ == "__main__":
    main()
