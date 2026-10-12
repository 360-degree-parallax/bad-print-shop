# 장면 이미지 프롬프트 (미드저니)

흑백 사진 위에 **인물의 얼굴만** 모자이크·글리치로 지운 이미지입니다. 결과물을 `00.png` ~ `20.png`로 이 폴더에 넣으면 본문의 자리표시가 교체됩니다. 각 이미지의 비율은 `wiki.js`의 `ratio`와 맞춰져 있으니, 비율을 바꾸면 그쪽도 같이 바꾸세요.

모든 프롬프트 끝에 같은 꼬리를 붙이고, 마지막에 표의 `--ar` 값을 붙입니다.

```
, black and white analog film photograph, high contrast, coarse grain, dust and scratches, every person's face is censored with large square pixel mosaic blocks with slight digital glitch and offset, only the faces are pixelated, the rest of the image stays sharp, classical Greek costume, staged like a theatre still, no text --style raw --no color, sepia, tint, text, watermark, logo
```

| # | 장면 | 프롬프트 (꼬리 앞부분) | 비율 |
|---|---|---|---|
| 00 | 정보 상자 대표 이미지 | frontal portrait of a king in a long robe standing before tall palace doors, holding a staff, centered, half body | --ar 3:4 |
| 01 | 궁전 앞 제단에 모인 탄원자들 | crowd of suppliants of all ages kneeling around a stone altar with olive branches wrapped in wool, a priest standing among them, palace columns behind | --ar 16:9 |
| 02 | 역병이 덮친 테바이 | exhausted townspeople sitting on the steps of an empty ancient street, smoke rising from altars behind them, a woman holding her head in her hands | --ar 3:2 |
| 03 | 월계관을 쓰고 돌아온 크레온 | a man in a travel cloak wearing a laurel wreath heavy with berries, walking toward the camera on a dusty road, city gate behind | --ar 3:4 |
| 04 | 신들을 부르는 원로들의 합창 | a row of old men in long robes standing shoulder to shoulder, arms raised in prayer, stone theatre floor, symmetrical composition | --ar 16:9 |
| 05 | 범인을 저주하는 포고 | low angle of a king on palace steps with one arm stretched forward, proclaiming, bright overcast sky behind | --ar 2:3 |
| 06 | 소년에게 이끌려 오는 테이레시아스 | an old blind prophet with a long staff led by the hand by a small boy, both walking toward the camera through a courtyard | --ar 1:1 |
| 07 | "그대가 찾는 자가 바로 여기 있소" | close two-shot, an old blind prophet pointing directly at a king who leans back in shock, tense standoff | --ar 4:5 |
| 08 | 델포이의 신탁 | a priestess seated on a tall bronze tripod above a crack in the rock, vapor rising around her, temple columns | --ar 9:16 |
| 09 | 크레온과 오이디푸스의 다툼 | two men in robes arguing face to face in front of palace doors, elders watching at the edges of the frame | --ar 16:9 |
| 10 | 궁전에서 나오는 이오카스테 | a queen in a long veil stepping out through tall palace doors into daylight, calm posture, columns framing her | --ar 3:4 |
| 11 | 산에 버려진 아이 | an old shepherd seen from above holding a swaddled infant against his chest on a rocky slope, gentle and quiet | --ar 1:1 |
| 12 | 세 갈래 길 | a lone traveler with a walking stick standing at a crossroads where three mountain roads meet, a stone marker beside him, wide landscape | --ar 16:9 |
| 13 | 오만은 폭군을 낳는다 | a toppled marble statue of a king lying across temple steps, a crowd of small figures looking down at it | --ar 2:3 |
| 14 | 코린토스에서 온 사자 | a travel-worn messenger with a satchel bowing before a queen who holds a wreath and incense at an altar | --ar 4:5 |
| 15 | 키타이론 산 | a shepherd standing among grazing sheep on a steep wild mountain slope with pine trees, clouds over the peak | --ar 21:9 |
| 16 | 불려 온 늙은 목자 | a frightened old shepherd held by the arms by two guards, head lowered, standing before a seated king | --ar 3:4 |
| 17 | "빛이여, 다시는 너를 보지 않기를" | a king alone in an empty courtyard, face turned up toward a harsh sun, both hands raised near his face | --ar 1:1 |
| 18 | 닫힌 궁전의 문 | a palace messenger standing still before tall closed doors, two golden brooch pins lying on the stone threshold at his feet | --ar 9:16 |
| 19 | 두 딸을 더듬어 찾는 오이디푸스 | an old man with a cloth over his eyes reaching out with both hands toward two young girls who take his hands, tender | --ar 4:5 |
| 20 | 비어 있는 왕좌 | an empty stone throne in a deserted hall, a group of elders standing far behind it, light from a high window | --ar 16:9 |

## 메모

- 피와 상처는 넣지 않았습니다. 17번은 눈을 찌른 장면 대신 태양을 마주한 얼굴로, 18번은 문과 브로치로만 암시합니다.
- 모자이크가 얼굴 밖으로 번지면 `only the faces are pixelated`를 프롬프트 맨 앞으로 옮기거나, 얼굴 없이 생성한 뒤 편집 툴로 얼굴만 모자이크하는 편이 가장 정확합니다.
- 색이 섞여 나오면 꼬리에 `monochrome, grayscale only`를 추가하세요.
