# 픽셀 이미지 프롬프트 (미드저니)

결과물을 `00.png` ~ `20.png` 이름으로 이 폴더에 넣으면 본문의 회색 자리표시가 자동으로 교체됩니다. 비율은 4:5(세로)입니다. 본문 한 단 폭을 꽉 채웁니다.

모든 프롬프트 끝에 같은 꼬리를 붙입니다.

```
, 1-bit pixel art, strictly black and white, no gray, ordered Bayer dithering, low resolution 128x160 upscaled with hard square pixels, flat lighting, ancient Greek tragedy, no text --ar 4:5 --style raw --no color, grayscale gradient, text, letters, frame
```

| # | 장면 | 프롬프트 (꼬리 앞부분) |
|---|---|---|
| 00 | 정보 상자 대표 이미지 | a king standing alone before tall palace doors, holding a staff, suppliants kneeling small at his feet, frontal symmetrical portrait composition |
| 01 | 궁전 앞 제단에 모인 탄원자들 | crowd of kneeling suppliants of all ages holding olive branches wrapped in wool, gathered around a stone altar before palace columns, priest standing in front |
| 02 | 역병이 덮친 테바이 | ancient Thebes under plague, empty city street with smoke rising from altars, withered wheat field outside the walls, vultures circling, desolate wide shot |
| 03 | 월계관을 쓰고 돌아온 크레온 | a man in a long cloak returning on a dusty road toward the city gate, wearing a laurel wreath heavy with berries, seen from behind the waiting king |
| 04 | 신들을 부르는 원로들의 합창 | a chorus of old men in long robes standing in a semicircle, arms raised to the sky, praying, stone theatre orchestra floor, symmetrical composition |
| 05 | 범인을 저주하는 포고 | a king standing on palace steps with one arm stretched forward, proclaiming to a crowd below, strong silhouette against bright sky |
| 06 | 소년에게 이끌려 오는 테이레시아스 | an old blind prophet with a staff led by the hand by a small boy, walking slowly through a stone courtyard, long shadows |
| 07 | "그대가 찾는 자가 바로 여기 있소" | a blind old prophet pointing his finger directly at a king who recoils, close two-person composition, tense standoff |
| 08 | 델포이의 신탁 | the oracle of Delphi, a priestess seated on a tall bronze tripod above a crack in the rock, rising vapor, temple columns |
| 09 | 크레온과 오이디푸스의 다툼 | two men in robes arguing face to face in front of palace doors, one gesturing angrily, elders watching from the side |
| 10 | 궁전에서 나오는 이오카스테 | a queen in a long veil stepping out through tall palace doors into daylight, calm posture, columns framing her |
| 11 | 산에 버려진 아이 | an empty swaddling cloth and a coil of rope left on a rocky mountain slope, a shepherd's crook lying nearby, lonely landscape, no people |
| 12 | 세 갈래 길 | a lonely crossroads where three narrow mountain roads meet, a stone marker at the center, overturned chariot wheel in the dust, aerial view |
| 13 | 오만은 폭군을 낳는다 | a toppled marble statue of a king lying broken on temple steps, its crown rolled away, dramatic low angle |
| 14 | 코린토스에서 온 사자 | a travel-worn messenger with a walking stick and satchel bowing before a queen holding a wreath and incense at an altar |
| 15 | 키타이론 산 | Mount Cithaeron, steep wild mountain with pine trees and grazing sheep, clouds over the peak, wide landscape |
| 16 | 불려 온 늙은 목자 | a frightened old shepherd held by two guards, head lowered, standing before a seated king, courtroom-like composition |
| 17 | "빛이여, 다시는 너를 보지 않기를" | a king alone with his face turned up toward a blinding sun, hands covering his face, harsh contrast, empty courtyard |
| 18 | 닫힌 궁전의 문 | tall closed palace doors seen from outside, two golden brooch pins lying on the stone threshold, silent and empty, no figures |
| 19 | 두 딸을 더듬어 찾는 오이디푸스 | a blindfolded old man reaching out with both hands toward two young girls who hold his hands, tender, soft composition |
| 20 | 비어 있는 왕좌 | an empty stone throne at the top of steps in a deserted hall, a single fallen crown on the seat, light from a high window |

## 메모

- 피나 상처는 넣지 않았습니다. 18번은 눈을 찌른 장면을 직접 그리지 않고 문과 브로치로만 암시합니다.
- 회색이 섞여 나오면 `--no gray` 대신 꼬리의 `strictly black and white`를 앞쪽으로 옮기거나 `--stylize 50`으로 낮추세요.
- 미드저니 결과를 그대로 쓰기보다 한 번 더 축소(160px)했다가 nearest-neighbor로 확대하면 픽셀이 더 정확해집니다.
