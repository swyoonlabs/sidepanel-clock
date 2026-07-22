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

# (파일명, 뷰, 테마, 시계 페이스, 테마 색상) — 4종을 골고루 노출
PANELS = [
    ("spc-1-hero", "world", "light", "arabic", "indigo"),
    ("spc-2-world", "world", "dark", "minimal", "teal"),
    ("spc-3-timer", "timer", "light", "classic", "violet"),
    ("spc-4-pomodoro", "pomodoro", "dark", "roman", "rose"),
]

# 테마 색상별 히어로 그라데이션 (sidepanel.css와 동일한 값) — light, dark
GRADIENTS = {
    "indigo":  ("#4f46e5,#2563eb", "#312e81,#1e3a8a"),
    "teal":    ("#14b8a6,#0f766e", "#115e59,#134e4a"),
    "violet":  ("#8b5cf6,#6d28d9", "#5b21b6,#4c1d95"),
    "rose":    ("#f43f5e,#be123c", "#9f1239,#881337"),
}

# 합성 스토어 스크린샷 카피 (영어): 제목, 부제, 기능 3줄
COPY = {
    "spc-1-hero": ("Always by your side",
                   "A clock, world clock, timer and Pomodoro — right in your browser sidebar.",
                   ["World clock for 20 cities",
                    "4 clock faces · 8 accent colors",
                    "Auto light & dark by time of day"]),
    "spc-2-world": ("World clock at a glance",
                    "See the time anywhere in the world without leaving your tab.",
                    ["Meeting planner — one time, every city",
                     "20 cities with live UTC offsets",
                     "Day / night indicator per city"]),
    "spc-3-timer": ("Timer with a progress ring",
                    "A countdown you can actually see, from the sidebar.",
                    ["Quick presets or custom duration",
                     "Sound + desktop notification",
                     "Keeps running when the panel closes"]),
    "spc-4-pomodoro": ("Focus with Pomodoro",
                       "Build deep focus with automatic work and break cycles.",
                       ["Auto focus & break switching",
                        "Adjustable focus / break lengths",
                        "Daily completed-session count"]),
}
FOOTER = "Free · No sign-in · No tracking"


def chrome_shot(html_path, out_path, w, h, scale=1):
    subprocess.run([
        CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--allow-file-access-from-files", f"--force-device-scale-factor={scale}",
        f"--window-size={w},{h}", f"--screenshot={out_path}",
        "--virtual-time-budget=1800", f"file://{html_path}",
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def build_panel_html(view, theme, face="classic", accent="indigo", lang="en", ui_lang="en-US"):
    html = open(os.path.join(ROOT, "sidepanel.html"), encoding="utf-8").read()
    html = html.replace('href="sidepanel.css"', f'href="{ROOT}/sidepanel.css"')
    html = html.replace('src="sidepanel.js"', f'src="{ROOT}/sidepanel.js"')
    msgs = json.load(open(os.path.join(ROOT, "_locales", lang, "messages.json"), encoding="utf-8"))
    flat = {k: v["message"] for k, v in msgs.items()}
    stub = (
        "<script>\n"
        f"const _msgs={json.dumps(flat, ensure_ascii=False)};\n"
        f'const _mock={{theme:"{theme}",h24:false,seconds:true,analog:true,'
        f'face:"{face}",accent:"{accent}",'
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


def build_composite_html(panel_png, title, subtitle, bullets, dark=False, accent="indigo"):
    stops = GRADIENTS.get(accent, GRADIENTS["indigo"])[1 if dark else 0]
    bg = f"linear-gradient(135deg,{stops})"
    uri = data_uri(panel_png)
    feats = "".join(f'<li><span class="ck">✓</span>{b}</li>' for b in bullets)
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      html,body{{margin:0;width:1280px;height:800px;overflow:hidden;
        font-family:'Segoe UI',system-ui,-apple-system,'Malgun Gothic',sans-serif;}}
      .wrap{{width:1280px;height:800px;display:flex;align-items:center;
        background:{bg};color:#fff;box-sizing:border-box;padding:0 72px;gap:56px;}}
      .txt{{flex:1;max-width:600px;}}
      .brand{{font-size:20px;font-weight:700;opacity:.9;margin:0 0 26px;
        display:flex;align-items:center;gap:11px;}}
      .brand img{{width:38px;height:38px;border-radius:9px;}}
      h1{{font-size:50px;line-height:1.12;margin:0 0 18px;font-weight:800;letter-spacing:-0.5px;}}
      .lead{{font-size:22px;line-height:1.45;margin:0 0 32px;opacity:.9;max-width:540px;}}
      ul.feat{{list-style:none;padding:0;margin:0 0 34px;display:flex;flex-direction:column;gap:16px;}}
      ul.feat li{{display:flex;align-items:center;gap:14px;font-size:21px;font-weight:500;}}
      ul.feat .ck{{width:30px;height:30px;flex:0 0 30px;border-radius:50%;
        background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;
        font-size:17px;font-weight:800;}}
      .tag{{display:inline-block;font-size:15px;font-weight:600;letter-spacing:.02em;
        background:rgba(255,255,255,.16);padding:10px 18px;border-radius:999px;}}
      .shot{{height:720px;border-radius:24px;box-shadow:0 24px 60px rgba(0,0,0,.35);}}
    </style></head><body>
      <div class="wrap">
        <div class="txt">
          <div class="brand"><img src="{data_uri(os.path.join(ROOT,'icons','icon128.png'))}">Side Panel Clock</div>
          <h1>{title}</h1>
          <p class="lead">{subtitle}</p>
          <ul class="feat">{feats}</ul>
          <span class="tag">{FOOTER}</span>
        </div>
        <img class="shot" src="{uri}">
      </div>
    </body></html>"""
    p = os.path.join(TMP, "composite.html")
    open(p, "w", encoding="utf-8").write(html)
    return p


def build_promo_html():
    dots = "".join(
        f'<span style="background:{c}"></span>'
        for c in ("#4f46e5", "#0284c7", "#0d9488", "#059669",
                  "#7c3aed", "#e11d48", "#d97706", "#475569")
    )
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      html,body{{margin:0;width:880px;height:560px;overflow:hidden;
        font-family:'Segoe UI',system-ui,-apple-system,sans-serif;}}
      .wrap{{width:880px;height:560px;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:22px;color:#fff;
        background:linear-gradient(135deg,#4f46e5,#2563eb);}}
      img{{width:172px;height:172px;border-radius:36px;box-shadow:0 20px 50px rgba(0,0,0,.35);}}
      h1{{font-size:52px;margin:0;font-weight:800;}}
      p{{font-size:25px;margin:0;opacity:.9;}}
      .dots{{display:flex;gap:14px;margin-top:6px;}}
      .dots span{{width:26px;height:26px;border-radius:50%;
        border:2px solid rgba(255,255,255,.55);box-shadow:0 2px 6px rgba(0,0,0,.2);}}
    </style></head><body><div class="wrap">
      <img src="{data_uri(os.path.join(ROOT,'icons','icon128.png'))}">
      <h1>Side Panel Clock</h1>
      <p>Clock · World Clock · Timer · Pomodoro</p>
      <div class="dots">{dots}</div>
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

    for name, view, theme, face, accent in PANELS:
        # 1) 세로 패널 스크린샷 (고해상도)
        panel_html = build_panel_html(view, theme, face, accent)
        portrait = os.path.join(sshot, name + ".png")
        chrome_shot(panel_html, portrait, 500, 900, scale=2)
        print("wrote", os.path.relpath(portrait, ROOT))

        # 2) 1280×800 합성 스토어 스크린샷
        title, sub, bullets = COPY[name]
        comp_html = build_composite_html(portrait, title, sub, bullets, dark=(theme == "dark"), accent=accent)
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
