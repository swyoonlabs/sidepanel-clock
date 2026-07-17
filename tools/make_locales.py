#!/usr/bin/env python3
"""_locales/<lang>/messages.json 생성기 (Chrome i18n).

번역을 한 곳에서 관리하려고 표(TABLE)로 정의하고 언어별 파일을 생성합니다.
언어 추가 = LANGS에 코드 추가 + 각 항목에 번역 추가.
사용법: python3 tools/make_locales.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGS = ["en", "ko", "ja", "zh_CN", "es", "fr", "de", "pt_BR"]

# key: [en, ko, ja, zh_CN, es, fr, de, pt_BR]
TABLE = {
    "appName": [
        "Side Panel Clock", "사이드 패널 시계", "サイドパネル時計", "侧边栏时钟",
        "Reloj en Panel Lateral", "Horloge Panneau Latéral", "Seitenleisten-Uhr",
        "Relógio no Painel Lateral"],
    "appDesc": [
        "Clock, world clock, timer and Pomodoro — always by your side in the panel.",
        "사이드 패널에 곁에 두고 보는 시계 — 시계, 세계시계, 타이머, 뽀모도로.",
        "サイドパネルにいつも表示 — 時計・世界時計・タイマー・ポモドーロ。",
        "常驻侧边栏的时钟 — 时钟、世界时钟、计时器和番茄钟。",
        "Reloj, reloj mundial, temporizador y Pomodoro, siempre a tu lado en el panel.",
        "Horloge, horloge mondiale, minuteur et Pomodoro, toujours à portée dans le panneau.",
        "Uhr, Weltuhr, Timer und Pomodoro – immer griffbereit in der Seitenleiste.",
        "Relógio, relógio mundial, timer e Pomodoro sempre ao seu lado no painel."],
    "themeToggle": [
        "Toggle theme", "테마 전환", "テーマ切替", "切换主题",
        "Cambiar tema", "Changer de thème", "Thema wechseln", "Alternar tema"],
    "opt24h": ["24-hour", "24시간", "24時間", "24小时", "24 horas", "24 h", "24-Std", "24 horas"],
    "optSeconds": ["Seconds", "초", "秒", "秒", "Segundos", "Secondes", "Sekunden", "Segundos"],
    "optAnalog": ["Analog", "아날로그", "アナログ", "模拟", "Analógico", "Analogique", "Analog", "Analógico"],
    "segWorld": ["World", "세계시계", "世界時計", "世界时钟", "Mundial", "Monde", "Weltuhr", "Mundial"],
    "segTimer": ["Timer", "타이머", "タイマー", "计时器", "Timer", "Minuteur", "Timer", "Timer"],
    "segPomodoro": ["Pomodoro", "뽀모도로", "ポモドーロ", "番茄钟", "Pomodoro", "Pomodoro", "Pomodoro", "Pomodoro"],
    "add": ["Add", "추가", "追加", "添加", "Añadir", "Ajouter", "Hinzuf.", "Adicionar"],
    "worldEmpty": [
        "Add a city to see its local time.",
        "도시를 추가해 세계 시간을 확인하세요.",
        "都市を追加して世界の時刻を確認しましょう。",
        "添加城市以查看当地时间。",
        "Añade una ciudad para ver su hora local.",
        "Ajoutez une ville pour voir son heure locale.",
        "Stadt hinzufügen, um die Ortszeit zu sehen.",
        "Adicione uma cidade para ver o horário local."],
    "unitHour": ["h", "시", "時", "时", "h", "h", "Std", "h"],
    "unitMin": ["m", "분", "分", "分", "min", "min", "Min", "min"],
    "unitSec": ["s", "초", "秒", "秒", "s", "s", "Sek", "s"],
    "nMin": ["$1 min", "$1분", "$1分", "$1分钟", "$1 min", "$1 min", "$1 Min", "$1 min"],
    "start": ["Start", "시작", "開始", "开始", "Iniciar", "Démarrer", "Start", "Iniciar"],
    "running": ["Running", "실행 중", "実行中", "运行中", "En curso", "En cours", "Läuft", "Em curso"],
    "resume": ["Resume", "계속", "再開", "继续", "Reanudar", "Reprendre", "Weiter", "Retomar"],
    "pause": ["Pause", "일시정지", "一時停止", "暂停", "Pausar", "Pause", "Pause", "Pausar"],
    "reset": ["Reset", "초기화", "リセット", "重置", "Reiniciar", "Réinit.", "Zurücks.", "Reiniciar"],
    "skip": ["Skip", "건너뛰기", "スキップ", "跳过", "Saltar", "Passer", "Überspr.", "Pular"],
    "resetSession": [
        "Reset sessions", "세션 초기화", "セッションをリセット", "重置会话",
        "Reiniciar sesiones", "Réinitialiser les sessions", "Sitzungen zurücksetzen",
        "Reiniciar sessões"],
    "phaseFocus": ["Focus", "집중", "集中", "专注", "Enfoque", "Focus", "Fokus", "Foco"],
    "phaseShort": ["Short break", "짧은 휴식", "小休憩", "短休息", "Descanso", "Pause", "Kurze Pause", "Pausa curta"],
    "phaseLong": ["Long break", "긴 휴식", "長い休憩", "长休息", "Descanso largo", "Longue pause", "Lange Pause", "Pausa longa"],
    "pomoCount": [
        "🍅 Today: $1", "🍅 오늘 $1회", "🍅 今日 $1回", "🍅 今天 $1 次",
        "🍅 Hoy: $1", "🍅 Aujourd'hui : $1", "🍅 Heute: $1", "🍅 Hoje: $1"],
    "offsetSame": [
        "Same as local", "현지와 동일", "現地と同じ", "与本地相同",
        "Igual que local", "Comme ici", "Wie lokal", "Igual ao local"],
    "offsetDiff": [
        "$1h vs local", "현지 $1시간", "現地 $1時間", "本地 $1 小时",
        "$1 h vs local", "$1 h vs ici", "$1 Std vs lokal", "$1 h vs local"],
    # 알림 (백그라운드)
    "timerDoneTitle": [
        "⏲️ Timer finished", "⏲️ 타이머 종료", "⏲️ タイマー終了", "⏲️ 计时结束",
        "⏲️ Temporizador terminado", "⏲️ Minuteur terminé", "⏲️ Timer beendet",
        "⏲️ Timer concluído"],
    "timerDoneMsg": [
        "Time's up!", "타이머가 끝났습니다!", "時間になりました！", "时间到！",
        "¡Se acabó el tiempo!", "Temps écoulé !", "Zeit ist um!", "Tempo esgotado!"],
    "pomoTitle": [
        "🍅 Pomodoro", "🍅 뽀모도로", "🍅 ポモドーロ", "🍅 番茄钟",
        "🍅 Pomodoro", "🍅 Pomodoro", "🍅 Pomodoro", "🍅 Pomodoro"],
    "pomoBreakMsg": [
        "Take a short break ☕", "잠깐 휴식하세요 ☕", "少し休憩しましょう ☕", "休息一下吧 ☕",
        "Tómate un descanso ☕", "Faites une pause ☕", "Kurze Pause ☕", "Faça uma pausa ☕"],
    "pomoLongBreakMsg": [
        "Time for a long break! 🎉", "길게 쉬어가세요! 🎉", "長めに休憩を！🎉", "好好休息一下！🎉",
        "¡Toca un descanso largo! 🎉", "C'est l'heure d'une longue pause ! 🎉",
        "Zeit für eine lange Pause! 🎉", "Hora de uma pausa longa! 🎉"],
    "pomoFocusMsg": [
        "Time to focus! 🍅", "다시 집중할 시간입니다! 🍅", "集中の時間です！🍅", "该专注了！🍅",
        "¡Hora de concentrarse! 🍅", "Au travail ! 🍅", "Zeit zu fokussieren! 🍅",
        "Hora de focar! 🍅"],
    # 정보(About) 시트
    "aboutTitle": ["About", "정보", "アプリについて", "关于", "Acerca de", "À propos", "Info", "Sobre"],
    "aboutBlog": [
        "Developer Blog", "개발자 블로그", "開発者ブログ", "开发者博客",
        "Blog del desarrollador", "Blog du développeur", "Entwickler-Blog",
        "Blog do desenvolvedor"],
    "aboutGithub": ["GitHub"] * 8,
    "aboutPrivacy": [
        "Privacy Policy", "개인정보처리방침", "プライバシーポリシー", "隐私政策",
        "Política de privacidad", "Politique de confidentialité", "Datenschutz",
        "Política de privacidade"],
    "aboutRate": [
        "Rate this extension", "별점 남기기", "評価する", "给个好评",
        "Valorar la extensión", "Noter l'extension", "Bewerten", "Avaliar a extensão"],
    "aboutMadeBy": [
        "Made by Swyoon Labs", "Swyoon Labs 제작", "Swyoon Labs 制作", "由 Swyoon Labs 制作",
        "Hecho por Swyoon Labs", "Créé par Swyoon Labs", "Von Swyoon Labs",
        "Feito por Swyoon Labs"],
    "close": ["Close", "닫기", "閉じる", "关闭", "Cerrar", "Fermer", "Schließen", "Fechar"],
    # 도시명
    "city_seoul": ["Seoul", "서울", "ソウル", "首尔", "Seúl", "Séoul", "Seoul", "Seul"],
    "city_tokyo": ["Tokyo", "도쿄", "東京", "东京", "Tokio", "Tokyo", "Tokio", "Tóquio"],
    "city_beijing": ["Beijing", "베이징", "北京", "北京", "Pekín", "Pékin", "Peking", "Pequim"],
    "city_hongkong": ["Hong Kong", "홍콩", "香港", "香港", "Hong Kong", "Hong Kong", "Hongkong", "Hong Kong"],
    "city_singapore": ["Singapore", "싱가포르", "シンガポール", "新加坡", "Singapur", "Singapour", "Singapur", "Singapura"],
    "city_bangkok": ["Bangkok", "방콕", "バンコク", "曼谷", "Bangkok", "Bangkok", "Bangkok", "Bangkok"],
    "city_delhi": ["Delhi", "델리", "デリー", "德里", "Delhi", "Delhi", "Delhi", "Déli"],
    "city_dubai": ["Dubai", "두바이", "ドバイ", "迪拜", "Dubái", "Dubaï", "Dubai", "Dubai"],
    "city_moscow": ["Moscow", "모스크바", "モスクワ", "莫斯科", "Moscú", "Moscou", "Moskau", "Moscou"],
    "city_london": ["London", "런던", "ロンドン", "伦敦", "Londres", "Londres", "London", "Londres"],
    "city_paris": ["Paris", "파리", "パリ", "巴黎", "París", "Paris", "Paris", "Paris"],
    "city_berlin": ["Berlin", "베를린", "ベルリン", "柏林", "Berlín", "Berlin", "Berlin", "Berlim"],
    "city_newyork": ["New York", "뉴욕", "ニューヨーク", "纽约", "Nueva York", "New York", "New York", "Nova York"],
    "city_chicago": ["Chicago", "시카고", "シカゴ", "芝加哥", "Chicago", "Chicago", "Chicago", "Chicago"],
    "city_losangeles": ["Los Angeles", "로스앤젤레스", "ロサンゼルス", "洛杉矶", "Los Ángeles", "Los Angeles", "Los Angeles", "Los Angeles"],
    "city_saopaulo": ["São Paulo", "상파울루", "サンパウロ", "圣保罗", "São Paulo", "São Paulo", "São Paulo", "São Paulo"],
    "city_sydney": ["Sydney", "시드니", "シドニー", "悉尼", "Sídney", "Sydney", "Sydney", "Sydney"],
    "city_auckland": ["Auckland", "오클랜드", "オークランド", "奥克兰", "Auckland", "Auckland", "Auckland", "Auckland"],
    "city_honolulu": ["Honolulu", "호놀룰루", "ホノルル", "檀香山", "Honolulú", "Honolulu", "Honolulu", "Honolulu"],
    "city_utc": ["UTC"] * 8,
}


def main():
    for i, lang in enumerate(LANGS):
        out = {}
        for key, vals in TABLE.items():
            v = vals[i] if i < len(vals) else vals[0]
            out[key] = {"message": v}
        d = os.path.join(ROOT, "_locales", lang)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "messages.json"), "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        print(f"wrote _locales/{lang}/messages.json ({len(out)} keys)")


if __name__ == "__main__":
    main()
