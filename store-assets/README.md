# Store Assets — Side Panel Clock

Chrome Web Store 등록에 필요한 자료를 한곳에 모아둔 폴더입니다.
Developer Console에 붙여넣을 텍스트와 업로드할 이미지가 함께 들어 있습니다.

## 파일 목록

| 파일 | 용도 |
|------|------|
| `LISTING.md` | 스토어 리스팅 카피 (Description / 짧은 설명 / 카테고리) — 콘솔에 복사·붙여넣기 |
| `PRIVACY.md` | 개인정보처리방침 (markdown 원본) |
| `RELEASE_NOTES_v1.0.0.md` | v1.0.0 릴리스 노트 |
| `blog-post-v1.0-en.html` / `blog-post-v1.0-ko.html` | 블로그(Blogspot) 발행용 포스트 (HTML 보기에 붙여넣기) |
| `store-icon-128.png` | 스토어 등록용 아이콘 (128×128) |
| `store-1-hero.png` ~ `store-4-pomodoro.png` | 스토어 스크린샷 (1280×800) |
| `promo-tile-440x280.png` | 작은 프로모션 타일 (440×280, 선택) |

## 업로드 체크리스트 (Chrome Web Store 콘솔)

- [ ] **Description** — `LISTING.md`의 본문 붙여넣기
- [ ] **짧은 설명(Summary)** — `LISTING.md`의 132자 요약
- [ ] **카테고리** — Productivity
- [ ] **아이콘** — `store-icon-128.png`
- [ ] **스크린샷** — `store-1-hero.png` ~ `store-4-pomodoro.png` (최소 1장, 1280×800 또는 640×400)
- [ ] **프로모션 타일** — `promo-tile-440x280.png` (선택)
- [ ] **개인정보처리방침 URL** — `privacy-policy.html`을 호스팅한 주소 (예: GitHub Pages)
- [ ] **언어** — 기본 English, 8개 언어 현지화됨(`_locales/`)

## 이미지 다시 만들기

스크린샷·아이콘·프로모션 타일은 스크립트로 재생성할 수 있습니다.

```bash
python3 tools/make_store_assets.py   # 스토어 이미지 생성 (헤드리스 Chrome 필요)
```

> 스토어 등록은 인증된 Google 계정으로만 가능하므로 콘솔 입력은 직접 진행해야 합니다.
> 이 폴더의 텍스트를 복사하고 이미지를 업로드하면 됩니다.

## 링크

- GitHub: https://github.com/swyoonlabs/sidepanel-clock
- Developer Blog: https://swyoonlabs.blogspot.com/
