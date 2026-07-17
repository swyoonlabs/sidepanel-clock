# dist

Chrome Web Store 업로드용 확장 패키지(zip)가 생성되는 폴더입니다.

- 빌드: `python3 tools/build_zip.py`
- 결과: `dist/sidepanel-clock-v<version>.zip` (manifest.json 이 zip 최상위, 런타임 파일만 포함)

> zip 파일 자체는 빌드 산출물이라 git에서 제외(`.gitignore`)됩니다.
> 배포용 zip은 [Releases](https://github.com/swyoonlabs/sidepanel-clock/releases)에 첨부됩니다.
