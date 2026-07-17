# Side Panel Clock 🕐

Chrome **사이드 패널(Side Panel)** 에 상주하는 시계 확장 프로그램입니다.
브라우징을 방해하지 않고 화면 오른쪽에 시계를 띄워 두고 쓸 수 있어요.

> **설계 원칙** — 사이드 패널의 강점은 "다른 작업을 하면서 계속 곁눈질로 볼 수 있다"는 점입니다.
> 그래서 *상시 지켜보게 되는* 기능만 담았습니다: **시계·세계시계·집중 타이머**.
> (알람은 알림이 대신 울려주므로 패널에 상주할 필요가 없고, 스톱워치는 니치 기능이라 제외했습니다.)

**🌐 8개 언어 지원** — 영어(기본)·한국어·일본어·중국어(간체)·스페인어·프랑스어·독일어·포르투갈어(BR).
브라우저 언어에 맞춰 UI·날짜·시각·도시명이 **자동 현지화**됩니다.

## 기능

세로로 긴 사이드 패널에 맞춰 **상단에는 큰 시계가 항상 고정**되어 있고,
하단은 **세계시계 / 타이머 / 뽀모도로**를 세그먼트로 전환합니다.

| 영역 | 설명 |
|------|------|
| 🕐 **시계** (상단 고정) | 큰 디지털 + 아날로그 시계, 12/24시간·초 표시·아날로그 on/off |
| 🌍 **세계시계** (하단 전환) | 주요 도시 20곳의 현재 시각, 현지 시차 표시, 추가/삭제 |
| ⏲️ **타이머** (하단 전환) | 원형 진행 링, 직접 입력 + 프리셋(1·3·5·10·25분), 종료 시 알림+소리 |
| 🍅 **뽀모도로** (하단 전환) | 집중/휴식 자동 순환, 진행 링, 오늘 세션 카운트, 시간 커스터마이즈 |

- 🌙 라이트/다크 테마 전환
- 모든 설정과 데이터는 `chrome.storage.local`에 저장되어 유지됩니다
- 타이머는 `chrome.alarms`를 사용해 패널을 닫아도 정확히 동작합니다

## 설치 (개발자 모드)

1. Chrome 주소창에 `chrome://extensions` 입력
2. 오른쪽 위 **개발자 모드** 켜기
3. **압축해제된 확장 프로그램을 로드합니다** 클릭
4. 이 프로젝트 폴더(`sidepanel_clock`) 선택
5. 툴바의 시계 아이콘을 클릭하면 사이드 패널이 열립니다

> 아이콘을 툴바에서 찾을 수 없으면 퍼즐(🧩) 아이콘 → 핀 고정하세요.

## 프로젝트 구조

```
sidepanel_clock/
├── manifest.json         # MV3 매니페스트 (side_panel, permissions, default_locale)
├── background.js         # 서비스 워커: 패널 열기, 알람/알림 처리
├── sidepanel.html        # 사이드 패널 UI (상단 고정 시계 + 세그먼트 전환)
├── sidepanel.css         # 스타일 (라이트/다크 테마)
├── sidepanel.js          # 시계·세계시계·타이머·뽀모도로 로직 + i18n
├── _locales/<lang>/messages.json  # 8개 언어 번역
├── privacy-policy.html   # 개인정보처리방침 (호스팅용 HTML)
├── CHANGELOG.md          # 버전별 변경 이력
├── icons/                # 16/32/48/128 PNG 아이콘
├── screenshots/          # 블로그/문서용 스크린샷
├── store-assets/         # 스토어 등록 자료 (리스팅·개인정보·릴리스노트·블로그·이미지)
└── tools/
    ├── make_icons.py         # 아이콘 생성 (의존성 없음)
    ├── make_locales.py       # 번역 표 → _locales/*/messages.json 생성
    └── make_store_assets.py  # 스토어/블로그 이미지 생성 (헤드리스 Chrome)
```

## 출시 자료 (Chrome Web Store · 블로그)

`store-assets/`에 스토어 등록·블로그 발행에 필요한 모든 자료가 있습니다.
자세한 체크리스트는 [store-assets/README.md](store-assets/README.md)를 참고하세요.

| 자료 | 파일 |
|------|------|
| 스토어 리스팅 카피 | [store-assets/LISTING.md](store-assets/LISTING.md) |
| 개인정보처리방침 | [store-assets/PRIVACY.md](store-assets/PRIVACY.md) · [privacy-policy.html](privacy-policy.html) |
| 릴리스 노트 | [store-assets/RELEASE_NOTES_v1.0.0.md](store-assets/RELEASE_NOTES_v1.0.0.md) |
| 블로그 포스트 (EN/KO) | [store-assets/blog-post-v1.0-en.html](store-assets/blog-post-v1.0-en.html) · [store-assets/blog-post-v1.0-ko.html](store-assets/blog-post-v1.0-ko.html) |
| 스토어 이미지 | `store-assets/store-*.png` (1280×800), `store-icon-128.png`, `promo-tile-440x280.png` |

## 다국어(i18n) 구조

- 모든 문구는 `_locales/<lang>/messages.json`의 키로 관리하고, UI는 `chrome.i18n` +
  `data-i18n` 속성으로 채웁니다. 날짜·시각·요일·오전/오후는 `Intl` + 브라우저 언어로 자동 포맷됩니다.
- **언어 추가**: [tools/make_locales.py](tools/make_locales.py)의 `LANGS`에 코드를 넣고
  각 항목에 번역을 추가한 뒤 실행하면 됩니다.

```bash
python3 tools/make_locales.py       # 번역 파일 재생성
python3 tools/make_icons.py         # 아이콘 재생성
python3 tools/make_store_assets.py  # 스토어/블로그 이미지 재생성
```

## 권한 설명

- `sidePanel` — 사이드 패널 UI 표시
- `storage` — 설정·타이머·뽀모도로 상태 저장
- `alarms` — 타이머·뽀모도로 예약 (패널이 닫혀 있어도 순환/동작)
- `notifications` — 타이머 종료·뽀모도로 단계 전환 알림
