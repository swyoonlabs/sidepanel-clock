#!/usr/bin/env python3
"""Chrome Web Store 업로드용 확장 패키지(zip) 빌더.

확장 실행에 필요한 파일만 골라 `dist/sidepanel-clock-v<version>.zip` 으로 묶습니다.
manifest.json 이 zip 최상위에 오도록 구성합니다(스토어 요구사항).
의존성 없는 순수 파이썬.
사용법: python3 tools/build_zip.py
"""
import json
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")

# 패키지에 포함할 파일/폴더 (런타임에 필요한 것만)
FILES = ["manifest.json", "background.js", "sidepanel.html", "sidepanel.css", "sidepanel.js"]
DIRS = ["icons", "_locales"]


def add_dir(zf, rel):
    base = os.path.join(ROOT, rel)
    for dirpath, _dirnames, filenames in os.walk(base):
        for fn in sorted(filenames):
            if fn == ".DS_Store":
                continue
            full = os.path.join(dirpath, fn)
            arc = os.path.relpath(full, ROOT)
            zf.write(full, arc)


def main():
    version = json.load(open(os.path.join(ROOT, "manifest.json")))["version"]
    os.makedirs(DIST, exist_ok=True)
    out = os.path.join(DIST, f"sidepanel-clock-v{version}.zip")
    if os.path.exists(out):
        os.remove(out)

    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in FILES:
            zf.write(os.path.join(ROOT, f), f)
        for d in DIRS:
            add_dir(zf, d)

    size = os.path.getsize(out)
    with zipfile.ZipFile(out) as zf:
        n = len(zf.namelist())
    print(f"wrote {os.path.relpath(out, ROOT)}  ({n} files, {size/1024:.1f} KB)")


if __name__ == "__main__":
    main()
