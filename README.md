# 불량 인쇄소 · BAD PRINT SHOP

문장을 수집해 왜곡된 필사 포스터를 만드는 브라우저 작업실.

## 사용

왼쪽은 위키 문서 형식의 《오이디푸스 왕》입니다. 문장 위에 커서를 올리면 검게 선택되고, 누르면 오른쪽 '최근 인쇄' 포스터로 옮겨집니다. 길게 누르면 왜곡 형태가 바뀝니다. 상단 '특수 기능'에서 크기·너비·풍화 강도를 조정하고, '정산'에서 영수증과 포스터를 저장합니다. 화면은 모두 무채색입니다.

본문 사이의 픽셀 이미지 20장은 `images/01.png`~`images/20.png`에 넣으면 표시됩니다. 미드저니 프롬프트는 [images/PROMPTS.md](images/PROMPTS.md)에 있습니다. 문서 구조와 이미지 위치는 `wiki.js`에서 바꿉니다.

## 공개 페이지 설정

Settings → Pages → Source: Deploy from a branch → Branch: main → Folder: /(root) → Save.

배포 후 주소: https://360-degree-parallax.github.io/bad-print-shop/

## 실행

index.html을 브라우저에서 열면 실행됩니다. HTML/CSS/JavaScript/Canvas로 구성하며 빌드나 API 연결이 필요 없습니다. 새로고침하면 수집 내역이 초기화됩니다.

## 본문과 글꼴

본문은 소포클레스 《오이디푸스 왕》의 한국어 중역 전문입니다. 프랜시스 스토어의 1912년 공개 영문 완역을 대조해 이 사이트용으로 새로 옮겼습니다. 437개 대사와 첫 무대 지시를 포함하며 1,306개의 클릭 가능한 문장으로 구성했습니다. 고대 그리스어에서 직접 번역한 학술 정본은 아닙니다.

번역 출처와 표기 원칙: [book/TRANSLATION.md](book/TRANSLATION.md)
한국어 본문 전체: [book/oedipus-ko.txt](book/oedipus-ko.txt)

드림흐물체 파생 글꼴과 Pretendard의 저작권·라이선스는 assets의 문서를 참조하세요. 코드에는 별도의 오픈소스 라이선스를 부여하지 않았습니다.
