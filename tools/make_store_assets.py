#!/usr/bin/env python3
"""스토어/블로그용 이미지 생성기.

헤드리스 Chrome으로 사이드 패널을 실제 렌더링해서
1) screenshots/spc-*.png  — 세로 패널 스크린샷(블로그용, 고해상도)
2) store-assets/store-*.png — 1280×800 스토어 스크린샷(패널 + 카피 합성)
3) store-assets/store-icon-128.png — 스토어 아이콘
4) store-assets/promo-tile-440x280.png — 프로모션 타일
을 만듭니다.

필요: Google Chrome, macOS `sips`(리사이즈). 의존성 없는 순수 파이썬.
사용법: python3 tools/make_store_assets.py
Chrome 경로 지정: CHROME=/path/to/chrome python3 tools/make_store_assets.py
"""
import base64
import json
import os
import shutil
import subprocess
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = os.environ.get(
    "CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
)
TMP = tempfile.mkdtemp(prefix="spc-assets-")

# (파일명, 뷰, 테마)
PANELS = [
    ("spc-1-hero", "world", "light"),
    ("spc-2-world", "world", "dark"),
    ("spc-3-timer", "timer", "light"),
    ("spc-4-pomodoro", "pomodoro", "dark"),
]

# 합성 스토어 스크린샷 카피 (영어)
COPY = {
    "spc-1-hero": ("Always by your side",
                   "A clock, world clock, timer & Pomodoro — right in your sidebar"),
    "spc-2-world": ("World clock at a glance",
                    "20 cities with local time and offset, auto-localized"),
    "spc-3-timer": ("Timer with a progress ring",
                    "Quick presets or custom — with sound & notification"),
    "spc-4-pomodoro": ("Focus with Pomodoro",
                       "Automatic focus/break cycles and a daily session count"),
}


def chrome_shot(html_path, out_path, w, h, scale=1):
    subprocess.run([
        CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--allow-file-access-from-files", f"--force-device-scale-factor={scale}",
        f"--window-size={w},{h}", f"--screenshot={out_path}",
        "--virtual-time-budget=1800", f"file://{html_path}",
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def build_panel_html(view, theme, lang="en", ui_lang="en-US"):
    html = open(os.path.join(ROOT, "sidepanel.html"), encoding="utf-8").read()
    html = html.replace('href="sidepanel.css"', f'href="{ROOT}/sidepanel.css"')
    html = html.replace('src="sidepanel.js"', f'src="{ROOT}/sidepanel.js"')
    msgs = json.load(open(os.path.join(ROOT, "_locales", lang, "messages.json"), encoding="utf-8"))
    flat = {k: v["message"] for k, v in msgs.items()}
    stub = (
        "<script>\n"
        f"const _msgs={json.dumps(flat, ensure_ascii=False)};\n"
        f'const _mock={{theme:"{theme}",h24:false,seconds:true,analog:true,'
        'worldTz:["America/New_York","Europe/London","Asia/Tokyo","Australia/Sydney"],'
        f'lastView:"{view}"}};\n'
        "window.chrome={"
        f'i18n:{{getUILanguage:()=>"{ui_lang}",getMessage:(k,s)=>{{let m=_msgs[k];'
        "if(m===undefined)return '';if(s){(Array.isArray(s)?s:[s]).forEach((x,i)=>{m=m.replace('$'+(i+1),x);});}return m;}},"
        "storage:{local:{get:()=>Promise.resolve(_mock),set:(o)=>{Object.assign(_mock,o);return Promise.resolve();}}},"
        "alarms:{create(){},clear(){},onAlarm:{addListener(){}}},"
        "runtime:{onMessage:{addListener(){}},sendMessage:()=>Promise.resolve()},"
        "notifications:{create(){}}};\n"
        "</script>\n"
    )
    inject = f'<script src="{ROOT}/sidepanel.js"></script>'
    html = html.replace(inject, stub + inject)
    p = os.path.join(TMP, f"panel-{view}-{theme}.html")
    open(p, "w", encoding="utf-8").write(html)
    return p


def data_uri(png_path):
    b = base64.b64encode(open(png_path, "rb").read()).decode()
    return "data:image/png;base64," + b


def build_composite_html(panel_png, title, subtitle, dark=False):
    bg = ("linear-gradient(135deg,#312e81,#1e3a8a)" if dark
          else "linear-gradient(135deg,#4f46e5,#2563eb)")
    uri = data_uri(panel_png)
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      html,body{{margin:0;width:1280px;height:800px;overflow:hidden;
        font-family:'Segoe UI',system-ui,-apple-system,'Malgun Gothic',sans-serif;}}
      .wrap{{width:1280px;height:800px;display:flex;align-items:center;
        background:{bg};color:#fff;box-sizing:border-box;padding:0 80px;gap:64px;}}
      .txt{{flex:1;}}
      .brand{{font-size:20px;font-weight:700;opacity:.85;margin:0 0 20px;
        display:flex;align-items:center;gap:10px;}}
      .brand img{{width:36px;height:36px;border-radius:8px;}}
      h1{{font-size:52px;line-height:1.15;margin:0 0 20px;font-weight:800;}}
      p{{font-size:24px;line-height:1.5;margin:0;opacity:.92;max-width:520px;}}
      .shot{{height:720px;border-radius:24px;box-shadow:0 24px 60px rgba(0,0,0,.35);}}
    </style></head><body>
      <div class="wrap">
        <div class="txt">
          <div class="brand"><img src="{data_uri(os.path.join(ROOT,'icons','icon128.png'))}">Side Panel Clock</div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <img class="shot" src="{uri}">
      </div>
    </body></html>"""
    p = os.path.join(TMP, "composite.html")
    open(p, "w", encoding="utf-8").write(html)
    return p


def build_promo_html():
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      html,body{{margin:0;width:880px;height:560px;overflow:hidden;
        font-family:'Segoe UI',system-ui,-apple-system,sans-serif;}}
      .wrap{{width:880px;height:560px;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:24px;color:#fff;
        background:linear-gradient(135deg,#4f46e5,#2563eb);}}
      img{{width:180px;height:180px;border-radius:36px;box-shadow:0 20px 50px rgba(0,0,0,.35);}}
      h1{{font-size:52px;margin:0;font-weight:800;}}
      p{{font-size:26px;margin:0;opacity:.9;}}
    </style></head><body><div class="wrap">
      <img src="{data_uri(os.path.join(ROOT,'icons','icon128.png'))}">
      <h1>Side Panel Clock</h1>
      <p>Clock · World Clock · Timer · Pomodoro</p>
    </div></body></html>"""
    p = os.path.join(TMP, "promo.html")
    open(p, "w", encoding="utf-8").write(html)
    return p


def main():
    if not os.path.exists(CHROME):
        raise SystemExit(f"Chrome not found at {CHROME} (set CHROME env var)")
    sshot = os.path.join(ROOT, "screenshots")
    sstore = os.path.join(ROOT, "store-assets")
    os.makedirs(sshot, exist_ok=True)
    os.makedirs(sstore, exist_ok=True)

    for name, view, theme in PANELS:
        # 1) 세로 패널 스크린샷 (고해상도)
        panel_html = build_panel_html(view, theme)
        portrait = os.path.join(sshot, name + ".png")
        chrome_shot(panel_html, portrait, 500, 900, scale=2)
        print("wrote", os.path.relpath(portrait, ROOT))

        # 2) 1280×800 합성 스토어 스크린샷
        title, sub = COPY[name]
        comp_html = build_composite_html(portrait, title, sub, dark=(theme == "dark"))
        store_png = os.path.join(sstore, name.replace("spc-", "store-") + ".png")
        chrome_shot(comp_html, store_png, 1280, 800, scale=1)
        print("wrote", os.path.relpath(store_png, ROOT))

    # 3) 스토어 아이콘
    shutil.copyfile(os.path.join(ROOT, "icons", "icon128.png"),
                    os.path.join(sstore, "store-icon-128.png"))
    print("wrote store-assets/store-icon-128.png")

    # 4) 프로모션 타일 440×280 (880×560 렌더 후 sips로 축소)
    promo_big = os.path.join(TMP, "promo-big.png")
    chrome_shot(build_promo_html(), promo_big, 880, 560, scale=1)
    promo_out = os.path.join(sstore, "promo-tile-440x280.png")
    subprocess.run(["sips", "-z", "280", "440", promo_big, "--out", promo_out],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("wrote store-assets/promo-tile-440x280.png")

    shutil.rmtree(TMP, ignore_errors=True)


if __name__ == "__main__":
    main()
