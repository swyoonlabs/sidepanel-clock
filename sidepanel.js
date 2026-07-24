"use strict";

// ------------------------- 유틸 -------------------------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const pad = (n, w = 2) => String(n).padStart(w, "0");

// 전체화면(몰입) 모드: sidepanel.html?full=1 로 새 탭에서 열림
const FULL = new URLSearchParams(location.search).has("full");

const store = {
  get: (keys) => chrome.storage.local.get(keys),
  set: (obj) => chrome.storage.local.set(obj),
};

// ------------------------- 국제화(i18n) -------------------------
const UILANG =
  (chrome.i18n && chrome.i18n.getUILanguage && chrome.i18n.getUILanguage()) ||
  navigator.language ||
  "en";

function t(key, subs) {
  if (chrome.i18n && chrome.i18n.getMessage) {
    const m = chrome.i18n.getMessage(key, subs);
    if (m) return m;
  }
  return key;
}

function applyI18n() {
  document.documentElement.lang = UILANG;
  $$("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $$("[data-i18n-title]").forEach((el) => (el.title = t(el.dataset.i18nTitle)));
  $$("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  $$("[data-i18n-label]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nLabel)));
}

// 상태
let settings = {
  theme: "light",
  h24: false,
  seconds: true,
  analog: true,
  face: "classic",
  accent: "indigo",
  worldTz: [],
  lastView: "clock",
};

// ------------------------- 테마 -------------------------
const AUTO_LIGHT_START = 7;  // 07:00부터 light
const AUTO_LIGHT_END = 19;   // 19:00부터 dark
const THEME_CYCLE = ["light", "dark", "auto"];
const THEME_ICON = { light: "☀️", dark: "🌙", auto: "🌗" };

// 자동 모드에서 현재 시각 기준 낮/밤 판정
function autoTheme(now = new Date()) {
  const h = now.getHours();
  return h >= AUTO_LIGHT_START && h < AUTO_LIGHT_END ? "light" : "dark";
}
// 실제 적용될 테마(auto → light/dark로 해석)
function effectiveTheme() {
  return settings.theme === "auto" ? autoTheme() : settings.theme;
}
function applyTheme() {
  document.documentElement.setAttribute("data-theme", effectiveTheme());
  const btn = $("#themeToggle");
  btn.textContent = THEME_ICON[settings.theme] || "🌙";
  btn.title = t("theme_" + settings.theme);
}
$("#themeToggle").addEventListener("click", () => {
  const i = THEME_CYCLE.indexOf(settings.theme);
  settings.theme = THEME_CYCLE[(i + 1) % THEME_CYCLE.length];
  applyTheme();
  store.set({ theme: settings.theme });
});

// 전체화면 토글: 패널 → 큰 시계 탭 열고 패널 닫기 / 탭 → 패널 복귀 후 탭 닫기
const fullWin = FULL ? parseInt(new URLSearchParams(location.search).get("win")) : NaN;

function closeThisTab() {
  if (chrome.tabs && chrome.tabs.getCurrent) {
    chrome.tabs.getCurrent((t) => t && chrome.tabs.remove(t.id));
  } else {
    window.close();
  }
}

$("#expandBtn").addEventListener("click", () => {
  if (FULL) {
    // 이전 모드로 복귀: 같은 창의 사이드 패널을 다시 열고(제스처 유지 위해 먼저 동기 호출) 이 탭을 닫음
    if (!Number.isNaN(fullWin) && chrome.sidePanel && chrome.sidePanel.open) {
      chrome.sidePanel.open({ windowId: fullWin }).catch(() => {});
    }
    closeThisTab();
    return;
  }
  // 패널 → 큰 시계 탭 열고 패널 닫기 (탭에 창 id를 넘겨 나중에 패널 복귀에 사용)
  const openFull = (winId) => {
    const q = winId != null ? `?full=1&win=${winId}` : "?full=1";
    if (chrome.tabs && chrome.tabs.create) chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html" + q) });
    else window.open(chrome.runtime.getURL("sidepanel.html" + q), "_blank");
    window.close(); // 사이드 패널 닫기
  };
  if (chrome.windows && chrome.windows.getCurrent) {
    chrome.windows.getCurrent((w) => openFull(w && w.id));
  } else {
    openFull(null);
  }
});

// ------------------------- 테마 색상 -------------------------
// key = CSS data-accent 값(indigo는 기본이라 별도 블록 없음), color = 스와치 표시색(라이트 primary)
const ACCENTS = [
  { key: "indigo", color: "#4f46e5" },
  { key: "ocean", color: "#0284c7" },
  { key: "teal", color: "#0d9488" },
  { key: "emerald", color: "#059669" },
  { key: "violet", color: "#7c3aed" },
  { key: "rose", color: "#e11d48" },
  { key: "amber", color: "#d97706" },
  { key: "slate", color: "#475569" },
  // 밝은(파스텔) 테마
  { key: "sky", color: "#7dd3fc" },
  { key: "mint", color: "#6ee7b7" },
  { key: "peach", color: "#fdba74" },
  { key: "lavender", color: "#c4b5fd" },
];

function applyAccent() {
  document.documentElement.setAttribute("data-accent", settings.accent);
  $$("#swatches .swatch").forEach((b) =>
    b.setAttribute("aria-pressed", b.dataset.accent === settings.accent ? "true" : "false")
  );
}

function initSwatches() {
  const box = $("#swatches");
  box.innerHTML = "";
  ACCENTS.forEach(({ key, color }) => {
    const b = document.createElement("button");
    b.className = "swatch";
    b.dataset.accent = key;
    b.style.background = color;
    b.title = t("accent_" + key);
    b.setAttribute("aria-label", t("accent_" + key));
    b.addEventListener("click", () => {
      settings.accent = key;
      applyAccent();
      store.set({ accent: key });
    });
    box.appendChild(b);
  });
  applyAccent();
}

// ------------------------- 정보(About) 시트 -------------------------
// 크롬 웹스토어 정식 주소 (신 스토어 형식: detail/{슬러그}/{id})
const STORE_URL =
  "https://chromewebstore.google.com/detail/side-panel-clock/mmadibebkikbnpeanlhhaeanmnhdinie";

function setupAbout() {
  const overlay = $("#aboutOverlay");
  const close = () => (overlay.hidden = true);
  $("#aboutBtn").addEventListener("click", () => (overlay.hidden = false));
  $("#aboutClose").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) close();
  });

  // 버전 표시
  try {
    const v = chrome.runtime.getManifest().version;
    if (v) $("#aboutVer").textContent = "v" + v;
  } catch (e) {
    /* 미리보기 등에서는 매니페스트 없음 */
  }
  // 스토어 리뷰 링크 — 신 웹스토어는 detail/{슬러그}/{id} 형식이라 정식 주소를 사용
  $("#linkRate").href = STORE_URL + "/reviews";
}

// ------------------------- 세그먼트 전환 (하단 콘텐츠) -------------------------
const VIEWS = ["world", "timer", "pomodoro"];
function switchView(view) {
  if (!VIEWS.includes(view)) view = "world";
  $$(".view").forEach((v) => v.classList.remove("active"));
  $("#view-" + view).classList.add("active");
  $$(".seg").forEach((s) => s.classList.toggle("active", s.dataset.view === view));
  settings.lastView = view;
  store.set({ lastView: view });
}
$$(".seg").forEach((s) => s.addEventListener("click", () => switchView(s.dataset.view)));

// ------------------------- 시계 (디지털 + 아날로그) -------------------------
const analog = $("#analog");
const actx = analog.getContext("2d");
if (FULL) {
  document.body.classList.add("full");
  analog.width = analog.height = 560; // 큰 화면에서 선명하도록 버퍼 확대
}
const CLOCK_FACES = ["classic", "minimal", "roman", "arabic"];
const ROMAN = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

// 시계판을 ctx의 size×size 영역에 그림(중심 = 영역 중앙). 배경은 지우지 않으므로
// 호출부에서 필요 시 clear/배경을 먼저 그린다. (라이브 시계 · 이미지 캡처 공용)
function renderClockFace(ctx, size, now, opts) {
  const r = size / 2;
  const scale = size / 300; // 눈금·바늘 두께 기준(원본 300px 설계)
  const { faceBg, border, tick, dim, accent, seconds } = opts;
  const face = CLOCK_FACES.includes(opts.face) ? opts.face : "classic";
  const minimal = face === "minimal";

  ctx.save();
  ctx.translate(r, r);

  // 원판
  ctx.beginPath();
  ctx.arc(0, 0, r - 6 * scale, 0, Math.PI * 2);
  ctx.fillStyle = faceBg;
  ctx.fill();
  ctx.lineWidth = (minimal ? 2 : 4) * scale;
  ctx.strokeStyle = border;
  ctx.stroke();

  // 마커 (페이스별)
  if (face === "classic") {
    for (let i = 0; i < 60; i++) {
      const ang = (i * Math.PI) / 30;
      const isHour = i % 5 === 0;
      const len = (isHour ? 12 : 5) * scale;
      const outer = r - 14 * scale;
      ctx.beginPath();
      ctx.lineWidth = (isHour ? 3 : 1) * scale;
      ctx.strokeStyle = isHour ? tick : dim;
      ctx.moveTo((outer - len) * Math.sin(ang), -(outer - len) * Math.cos(ang));
      ctx.lineTo(outer * Math.sin(ang), -outer * Math.cos(ang));
      ctx.stroke();
    }
  } else if (minimal) {
    const rad = r - 18 * scale;
    for (let i = 0; i < 12; i++) {
      const ang = (i * Math.PI) / 6;
      const big = i % 3 === 0; // 12·3·6·9 강조
      ctx.beginPath();
      ctx.arc(Math.sin(ang) * rad, -Math.cos(ang) * rad, (big ? 3.5 : 2) * scale, 0, Math.PI * 2);
      ctx.fillStyle = big ? tick : dim;
      ctx.fill();
    }
  } else {
    // 로마 / 아라비아 숫자
    const serif = face === "roman";
    const rad = r - (serif ? 30 : 28) * scale;
    ctx.fillStyle = tick;
    ctx.font = `600 ${Math.round(r * (serif ? 0.17 : 0.2))}px ${
      serif ? "Georgia, 'Times New Roman', serif" : "system-ui, -apple-system, sans-serif"
    }`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < 12; i++) {
      const ang = (i * Math.PI) / 6;
      const label = serif ? ROMAN[i] : i === 0 ? "12" : String(i);
      ctx.fillText(label, Math.sin(ang) * rad, -Math.cos(ang) * rad);
    }
  }

  const h = now.getHours() % 12;
  const m = now.getMinutes();
  const s = now.getSeconds();
  const ms = now.getMilliseconds();

  const hand = (angle, length, width, color) => {
    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.moveTo(-Math.sin(angle) * (length * 0.18), Math.cos(angle) * (length * 0.18));
    ctx.lineTo(Math.sin(angle) * length, -Math.cos(angle) * length);
    ctx.stroke();
  };

  const secAngle = ((s + ms / 1000) * Math.PI) / 30;
  const minAngle = ((m + s / 60) * Math.PI) / 30;
  const hourAngle = ((h + m / 60) * Math.PI) / 6;

  hand(hourAngle, r * 0.5, (minimal ? 4 : 6) * scale, tick);
  hand(minAngle, r * 0.72, (minimal ? 2.5 : 4) * scale, tick);
  if (seconds) hand(secAngle, r * 0.78, (minimal ? 1.5 : 2) * scale, accent);

  ctx.beginPath();
  ctx.arc(0, 0, (minimal ? 3.5 : 5) * scale, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.restore();
}

// 현재 테마/색상에 맞는 시계판 색 옵션
function faceOpts() {
  const styles = getComputedStyle(document.documentElement);
  const isDark = effectiveTheme() === "dark";
  return {
    face: settings.face,
    faceBg: isDark ? "#1e293b" : "#ffffff",
    border: isDark ? "#334155" : "#e2e8f0",
    tick: styles.getPropertyValue("--text").trim() || "#1e293b",
    dim: styles.getPropertyValue("--text-dim").trim() || "#64748b",
    accent: styles.getPropertyValue("--accent").trim() || "#ef4444",
    seconds: settings.seconds,
  };
}

function drawAnalog(now) {
  const size = analog.width;
  actx.clearRect(0, 0, size, size);
  renderClockFace(actx, size, now, faceOpts());
}

const dateFmt = new Intl.DateTimeFormat(UILANG, {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
});
const ampmFmt = new Intl.DateTimeFormat(UILANG, { hour: "numeric", hour12: true });

function updateClock(now) {
  let h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  let html = "";
  if (!settings.h24) {
    const dp = ampmFmt.formatToParts(now).find((p) => p.type === "dayPeriod");
    html += `<span class="ampm">${dp ? dp.value : h < 12 ? "AM" : "PM"}</span>`;
    h = h % 12 || 12;
  }
  html += `${pad(h)}:${pad(m)}`;
  if (settings.seconds) html += `<span class="sec">:${pad(s)}</span>`;
  $("#digitalTime").innerHTML = html;
  $("#digitalDate").textContent = dateFmt.format(now);

  if (settings.analog) drawAnalog(now);
}

// 옵션 토글 버튼 (24시간 / 초 / 아날로그)
function setOpt(el, on) {
  el.dataset.on = on ? "true" : "false";
}
function bindClockOptions() {
  const optFace = $("#optFace");
  const updateFace = () => (optFace.textContent = t("face_" + settings.face));
  const showFace = () => (optFace.style.display = settings.analog ? "" : "none");

  setOpt($("#opt24h"), settings.h24);
  setOpt($("#optSeconds"), settings.seconds);
  setOpt($("#optAnalog"), settings.analog);
  $("#analog").style.display = settings.analog ? "" : "none";
  updateFace();
  showFace();

  $("#opt24h").addEventListener("click", () => {
    settings.h24 = !settings.h24;
    setOpt($("#opt24h"), settings.h24);
    store.set({ h24: settings.h24 });
  });
  $("#optSeconds").addEventListener("click", () => {
    settings.seconds = !settings.seconds;
    setOpt($("#optSeconds"), settings.seconds);
    store.set({ seconds: settings.seconds });
  });
  $("#optAnalog").addEventListener("click", () => {
    settings.analog = !settings.analog;
    setOpt($("#optAnalog"), settings.analog);
    $("#analog").style.display = settings.analog ? "" : "none";
    showFace();
    store.set({ analog: settings.analog });
  });
  optFace.addEventListener("click", () => {
    const i = CLOCK_FACES.indexOf(settings.face);
    settings.face = CLOCK_FACES[(i + 1) % CLOCK_FACES.length];
    updateFace();
    store.set({ face: settings.face });
  });
}

// ------------------------- 세계시계 -------------------------
const TIMEZONES = [
  ["seoul", "Asia/Seoul"],
  ["tokyo", "Asia/Tokyo"],
  ["beijing", "Asia/Shanghai"],
  ["hongkong", "Asia/Hong_Kong"],
  ["singapore", "Asia/Singapore"],
  ["bangkok", "Asia/Bangkok"],
  ["delhi", "Asia/Kolkata"],
  ["dubai", "Asia/Dubai"],
  ["moscow", "Europe/Moscow"],
  ["london", "Europe/London"],
  ["paris", "Europe/Paris"],
  ["berlin", "Europe/Berlin"],
  ["newyork", "America/New_York"],
  ["chicago", "America/Chicago"],
  ["losangeles", "America/Los_Angeles"],
  ["saopaulo", "America/Sao_Paulo"],
  ["sydney", "Australia/Sydney"],
  ["auckland", "Pacific/Auckland"],
  ["honolulu", "Pacific/Honolulu"],
  ["utc", "UTC"],
];
const TZ_KEY = Object.fromEntries(TIMEZONES.map(([k, z]) => [z, k]));
const cityName = (zone) => t("city_" + (TZ_KEY[zone] || "utc"));

// 도시 국기 (식별용)
const FLAG = {
  seoul: "🇰🇷", tokyo: "🇯🇵", beijing: "🇨🇳", hongkong: "🇭🇰", singapore: "🇸🇬",
  bangkok: "🇹🇭", delhi: "🇮🇳", dubai: "🇦🇪", moscow: "🇷🇺", london: "🇬🇧",
  paris: "🇫🇷", berlin: "🇩🇪", newyork: "🇺🇸", chicago: "🇺🇸", losangeles: "🇺🇸",
  saopaulo: "🇧🇷", sydney: "🇦🇺", auckland: "🇳🇿", honolulu: "🇺🇸", utc: "🌐",
};
const flagOf = (zone) => FLAG[TZ_KEY[zone]] || "🌐";

// 해당 시간대의 현재 '시(hour)'
function zoneHour(zone, now) {
  return (
    +new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "2-digit", hour12: false })
      .format(now) % 24
  );
}
// 그 도시가 지금 새벽/낮/해질녘/밤 중 무엇인지
function dayNightGlyph(zone, now) {
  const h = zoneHour(zone, now);
  if (h >= 5 && h < 8) return "🌅";
  if (h >= 8 && h < 18) return "☀️";
  if (h >= 18 && h < 20) return "🌆";
  return "🌙";
}

function initWorldSelect() {
  const sel = $("#tzSelect");
  sel.innerHTML = "";
  // 도시명 로케일 순으로 정렬
  const opts = TIMEZONES.map(([key, zone]) => [cityName(zone), zone]);
  opts.sort((a, b) => a[0].localeCompare(b[0], UILANG));
  opts.forEach(([name, zone]) => {
    const o = document.createElement("option");
    o.value = zone;
    o.textContent = name;
    sel.appendChild(o);
  });
}

$("#tzAdd").addEventListener("click", () => {
  const zone = $("#tzSelect").value;
  if (!settings.worldTz.includes(zone)) {
    settings.worldTz.push(zone);
    store.set({ worldTz: settings.worldTz });
    renderWorldList();
  }
});

// 특정 순간에 해당 시간대가 UTC 대비 몇 분 앞서는지 (DST·30/45분 오프셋 반영)
function zoneOffsetMinutes(zone, now) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  const hour = parts.hour === "24" ? 0 : +parts.hour; // 자정을 24로 주는 환경 대응
  const asUTC = Date.UTC(
    +parts.year, +parts.month - 1, +parts.day, hour, +parts.minute, +parts.second
  );
  return Math.round((asUTC - now.getTime()) / 60000);
}

function localOffsetLabel(zone, now) {
  // 로컬 대비 시차 (분 단위로 계산해 30/45분 시차도 정확히 표시)
  const diff = zoneOffsetMinutes(zone, now) + now.getTimezoneOffset();
  if (diff === 0) return t("offsetSame");
  const sign = diff > 0 ? "+" : "-";
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m
    ? t("offsetDiffMin", [sign + h, String(m)])
    : t("offsetDiff", [sign + h]);
}

function renderWorldList() {
  const ul = $("#worldList");
  ul.innerHTML = "";
  $("#worldEmpty").style.display = settings.worldTz.length ? "none" : "block";
  $("#planner").style.display = settings.worldTz.length ? "" : "none";
  settings.worldTz.forEach((zone) => {
    const li = document.createElement("li");
    li.className = "world-item";
    li.dataset.zone = zone;
    li.innerHTML = `
      <div class="wi-left">
        <span class="dn" aria-hidden="true"></span>
        <div>
          <div class="city">${flagOf(zone)} ${cityName(zone)}</div>
          <div class="sub"></div>
        </div>
      </div>
      <div class="right">
        <div class="wtime"></div>
        <button class="del">✕</button>
      </div>`;
    li.querySelector(".del").addEventListener("click", () => {
      settings.worldTz = settings.worldTz.filter((z) => z !== zone);
      store.set({ worldTz: settings.worldTz });
      renderWorldList();
    });
    ul.appendChild(li);
  });
  updateWorldTimes();
}

// ------------------------- 미팅 플래너 -------------------------
// 세계시계 목록의 기준 시각을 슬라이더로 조절 (로컬 시각 기준)
let plannerMode = "live"; // live | planned
let plannerMin = 0; // 계획 시각(로컬 자정 기준 분)
const PLAN_STEP = 15;

function plannerRef() {
  if (plannerMode === "live") return new Date();
  const d = new Date();
  d.setHours(Math.floor(plannerMin / 60), plannerMin % 60, 0, 0);
  return d;
}

function updatePlannerUI(ref) {
  const planner = $("#planner");
  const slider = $("#plannerSlider");
  if (plannerMode === "live") {
    // 라이브에선 슬라이더를 현재 시각에 맞춰 둠 (잡으면 지금부터 시작)
    const localMin = ref.getHours() * 60 + ref.getMinutes();
    slider.value = Math.round(localMin / PLAN_STEP) * PLAN_STEP;
  }
  $("#plannerDay").textContent = new Intl.DateTimeFormat(UILANG, { weekday: "short" }).format(ref);
  $("#plannerClock").textContent = new Intl.DateTimeFormat(UILANG, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: !settings.h24,
  }).format(ref);
  // 채움 트랙(슬라이더 값까지 accent로)
  slider.style.setProperty("--fill", (parseInt(slider.value) / parseInt(slider.max)) * 100 + "%");
  planner.classList.toggle("planned", plannerMode === "planned");
}

function setupPlanner() {
  $("#plannerSlider").addEventListener("input", (e) => {
    plannerMode = "planned";
    plannerMin = parseInt(e.target.value);
    updateWorldTimes();
  });
  $("#plannerNow").addEventListener("click", () => {
    plannerMode = "live";
    updateWorldTimes();
  });
}

function updateWorldTimes() {
  const now = plannerRef();
  updatePlannerUI(now);
  $$("#worldList .world-item").forEach((li) => {
    const zone = li.dataset.zone;
    const timeStr = new Intl.DateTimeFormat(UILANG, {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: !settings.h24,
    }).format(now);
    const dateStr = new Intl.DateTimeFormat(UILANG, {
      timeZone: zone,
      month: "short",
      day: "numeric",
      weekday: "short",
    }).format(now);
    li.querySelector(".wtime").textContent = timeStr;
    li.querySelector(".dn").textContent = dayNightGlyph(zone, now);
    li.querySelector(".sub").textContent = `${dateStr} · ${localOffsetLabel(zone, now)}`;
  });
}

// ------------------------- 원형 진행 링 (공용) -------------------------
const RING_C = 2 * Math.PI * 90; // r=90
function setRing(el, remaining, total) {
  el.style.strokeDasharray = RING_C;
  const frac = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 1;
  el.style.strokeDashoffset = RING_C * (1 - frac);
}

// ------------------------- 타이머 -------------------------
let timerState = { running: false, endAt: 0, remaining: 0, total: 0 };

function fmtTimer(ms) {
  const total = Math.ceil(ms / 1000);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function timerRemaining() {
  if (timerState.running) return Math.max(0, timerState.endAt - Date.now());
  return timerState.remaining;
}

function renderTimer() {
  const idle = !timerState.running && timerState.remaining <= 0;
  const rem = idle ? inputSeconds() * 1000 : timerRemaining();
  const total = idle ? rem : timerState.total;
  const disp = fmtTimer(rem);
  const td = $("#timerDisplay");
  td.textContent = disp;
  td.classList.toggle("long", disp.length > 5);
  setRing($("#timerRing"), rem, total);
  if (timerState.running && timerRemaining() <= 0) finishTimer();
}

function inputSeconds() {
  const h = parseInt($("#tHours").value) || 0;
  const m = parseInt($("#tMins").value) || 0;
  const s = parseInt($("#tSecs").value) || 0;
  return h * 3600 + m * 60 + s;
}

function setTimerButtons() {
  $("#timerStart").textContent = t(
    timerState.running ? "running" : timerState.remaining > 0 ? "resume" : "start"
  );
  $("#timerStart").disabled = timerState.running;
  $("#timerPause").disabled = !timerState.running;
  $("#timerReset").disabled = !(timerState.running || timerState.remaining > 0);
  $("#timerInputs").style.display = timerState.running || timerState.remaining > 0 ? "none" : "";
  $(".presets").style.display = timerState.running || timerState.remaining > 0 ? "none" : "";
}

function startTimer(seconds) {
  if (seconds <= 0) return;
  timerState.total = seconds * 1000;
  timerState.endAt = Date.now() + seconds * 1000;
  timerState.running = true;
  timerState.remaining = 0;
  chrome.alarms.create("timer", { when: timerState.endAt });
  store.set({ timerRunning: true, timerEndAt: timerState.endAt, timerTotal: timerState.total });
  setTimerButtons();
  renderTimer();
}

$("#timerStart").addEventListener("click", () => {
  const sec = timerState.remaining > 0 ? Math.ceil(timerState.remaining / 1000) : inputSeconds();
  startTimer(sec);
});
$("#timerPause").addEventListener("click", () => {
  timerState.remaining = timerRemaining();
  timerState.running = false;
  chrome.alarms.clear("timer");
  store.set({ timerRunning: false, timerEndAt: 0 });
  setTimerButtons();
  renderTimer();
});
$("#timerReset").addEventListener("click", () => {
  timerState = { running: false, endAt: 0, remaining: 0, total: 0 };
  chrome.alarms.clear("timer");
  store.set({ timerRunning: false, timerEndAt: 0, timerTotal: 0 });
  setTimerButtons();
  renderTimer();
});
$$(".chip[data-sec]").forEach((c) =>
  c.addEventListener("click", () => startTimer(parseInt(c.dataset.sec)))
);
["tHours", "tMins", "tSecs"].forEach((id) =>
  $("#" + id).addEventListener("input", () => renderTimer())
);

function finishTimer() {
  timerState = { running: false, endAt: 0, remaining: 0, total: 0 };
  store.set({ timerRunning: false, timerEndAt: 0 });
  setTimerButtons();
  renderTimer();
  playBeep();
}

// ------------------------- 뽀모도로 -------------------------
let pomo = {
  running: false,
  phase: "focus", // focus | short | long
  endAt: 0,
  remaining: 0,
  count: 0, // 오늘 완료한 집중 세션 수
  dayKey: "",
  cfg: { focus: 25, short: 5, long: 15, longEvery: 4 },
};

const phaseLabel = (p) =>
  t(p === "focus" ? "phaseFocus" : p === "short" ? "phaseShort" : "phaseLong");

// 저장된 구버전 데이터에 longEvery가 없을 수 있어 보정
function ensurePomoCfg() {
  if (!pomo.cfg) pomo.cfg = { focus: 25, short: 5, long: 15, longEvery: 4 };
  if (!pomo.cfg.longEvery) pomo.cfg.longEvery = 4;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function pomoPhaseMs(p) {
  return (pomo.cfg[p] || 1) * 60000;
}
function pomoRemaining() {
  if (pomo.running) return Math.max(0, pomo.endAt - Date.now());
  return pomo.remaining > 0 ? pomo.remaining : pomoPhaseMs(pomo.phase);
}
function savePomo() {
  store.set({ pomo });
}

function setPomoButtons() {
  $("#pomoStart").textContent = t(
    pomo.running ? "running" : pomo.remaining > 0 ? "resume" : "start"
  );
  $("#pomoStart").disabled = pomo.running;
  $("#pomoPause").disabled = !pomo.running;
  $(".pomo-cfg").style.display = pomo.running ? "none" : "flex";
}

function renderPomo() {
  const rem = pomoRemaining();
  const total = pomoPhaseMs(pomo.phase);
  const pd = $("#pomoDisplay");
  pd.textContent = fmtTimer(rem);
  pd.classList.toggle("long", pd.textContent.length > 5);
  const ring = $("#pomoRing");
  setRing(ring, rem, total);
  ring.classList.toggle("break", pomo.phase !== "focus");
  $("#pomoPhase").textContent = phaseLabel(pomo.phase);
  $("#pomoCount").textContent = t("pomoCount", [String(pomo.count)]);
  // 긴 휴식까지 남은 집중 세션 수 (긴 휴식 중에는 숨김)
  const every = pomo.cfg.longEvery || 4;
  const next = $("#pomoNext");
  if (pomo.phase === "long") {
    next.style.display = "none";
  } else {
    next.style.display = "";
    next.textContent = t("pomoUntilLong", [String(every - (pomo.count % every))]);
  }
  setPomoButtons();
}

function startPomo() {
  const rem = pomo.remaining > 0 ? pomo.remaining : pomoPhaseMs(pomo.phase);
  pomo.endAt = Date.now() + rem;
  pomo.running = true;
  pomo.remaining = 0;
  chrome.alarms.create("pomodoro", { when: pomo.endAt });
  savePomo();
  renderPomo();
}

$("#pomoStart").addEventListener("click", startPomo);
$("#pomoPause").addEventListener("click", () => {
  pomo.remaining = pomoRemaining();
  pomo.running = false;
  pomo.endAt = 0;
  chrome.alarms.clear("pomodoro");
  savePomo();
  renderPomo();
});
$("#pomoSkip").addEventListener("click", () => {
  // 수동 건너뛰기: 자동 순환과 같은 규칙 — 집중 세션을 끝낼 때마다 세고,
  // longEvery 배수마다 긴 휴식으로. 휴식에서는 집중으로.
  const every = pomo.cfg.longEvery || 4;
  if (pomo.phase === "focus") {
    pomo.count += 1;
    pomo.phase = pomo.count % every === 0 ? "long" : "short";
  } else {
    pomo.phase = "focus";
  }
  pomo.running = false;
  pomo.remaining = 0;
  pomo.endAt = 0;
  chrome.alarms.clear("pomodoro");
  savePomo();
  renderPomo();
});
$("#pomoReset").addEventListener("click", () => {
  chrome.alarms.clear("pomodoro");
  pomo.running = false;
  pomo.phase = "focus";
  pomo.remaining = 0;
  pomo.endAt = 0;
  pomo.count = 0;
  savePomo();
  renderPomo();
});

function bindPomoConfig() {
  const map = {
    pomoFocus: { key: "focus", min: 1 },
    pomoShort: { key: "short", min: 1 },
    pomoLong: { key: "long", min: 1 },
    pomoEvery: { key: "longEvery", min: 2 }, // 긴 휴식 주기(집중 n회마다)
  };
  Object.entries(map).forEach(([id, { key, min }]) => {
    const el = $("#" + id);
    el.value = pomo.cfg[key];
    el.addEventListener("change", () => {
      const v = Math.max(min, parseInt(el.value) || min);
      el.value = v;
      pomo.cfg[key] = v;
      savePomo();
      if (!pomo.running) renderPomo();
    });
  });
}

// ------------------------- 소리 (비프) -------------------------
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
      t += 0.5;
    }
    setTimeout(() => ctx.close(), 2000);
  } catch (e) {
    /* 사용자 상호작용 전에는 재생 불가할 수 있음 */
  }
}

// 알람 발생 시(타이머/뽀모도로 종료·전환) 저장소에서 최신 상태를 다시 읽어 반영
async function refreshFromStorage() {
  const s = await store.get(["timerRunning", "timerEndAt", "timerTotal", "pomo"]);
  if (s.timerRunning && s.timerEndAt > Date.now()) {
    timerState.running = true;
    timerState.endAt = s.timerEndAt;
    timerState.total = s.timerTotal || 0;
    timerState.remaining = 0;
  } else if (!s.timerRunning) {
    timerState.running = false;
    timerState.endAt = 0;
  }
  if (s.pomo) { pomo = s.pomo; ensurePomoCfg(); }
  setTimerButtons();
  renderTimer();
  renderPomo();
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "ALARM_FIRED") {
    playBeep();
    refreshFromStorage();
  }
});

// ------------------------- 메인 루프 -------------------------
function tickFast() {
  const now = new Date();
  updateClock(now); // 시계는 상단에 항상 표시
  // 자동 테마: 낮/밤 경계를 지나면 즉시 반영
  if (settings.theme === "auto" &&
      document.documentElement.getAttribute("data-theme") !== autoTheme(now)) {
    applyTheme();
  }
  if ($("#view-timer").classList.contains("active")) renderTimer();
  if ($("#view-pomodoro").classList.contains("active")) renderPomo();
  requestAnimationFrame(tickFast);
}

// ------------------------- 초기화 -------------------------
async function init() {
  const s = await store.get([
    "theme", "h24", "seconds", "analog", "face", "accent", "worldTz", "lastView",
    "timerRunning", "timerEndAt", "timerTotal", "pomo",
  ]);
  settings.theme = s.theme || "light";
  settings.h24 = !!s.h24;
  settings.seconds = s.seconds !== undefined ? s.seconds : true;
  settings.analog = s.analog !== undefined ? s.analog : true;
  settings.face = CLOCK_FACES.includes(s.face) ? s.face : "classic";
  settings.accent = ACCENTS.some((a) => a.key === s.accent) ? s.accent : "indigo";
  settings.worldTz = s.worldTz || [];
  settings.lastView = VIEWS.includes(s.lastView) ? s.lastView : "world";

  applyI18n();
  // 몰입 모드: 확장 버튼을 '패널로 돌아가기(✕)'로, 시계를 누르면 개발자 블로그를 새 창으로
  if (FULL) {
    const b = $("#expandBtn");
    b.textContent = "✕";
    b.title = t("exitFullTitle");
    b.setAttribute("aria-label", t("exitFullTitle"));

    const openBlog = () => {
      const u = ($("#linkBlog") && $("#linkBlog").href) || "https://swyoonlabs.blogspot.com/";
      if (chrome.windows && chrome.windows.create) chrome.windows.create({ url: u });
      else window.open(u, "_blank", "noopener");
    };
    ["#digitalTime", "#analog"].forEach((sel) => {
      const el = $(sel);
      if (!el) return;
      el.style.cursor = "pointer";
      el.title = t("aboutBlog");
      el.addEventListener("click", openBlog);
    });
  }
  // 타이머 프리셋 라벨(분) 로케일 처리
  $$(".chip[data-sec]").forEach((c) => {
    c.textContent = t("nMin", [String(Math.round(c.dataset.sec / 60))]);
  });

  applyTheme();
  initSwatches();
  setupAbout();
  bindClockOptions();
  initWorldSelect();
  setupPlanner();
  renderWorldList();

  // 타이머 상태 복원
  if (s.timerRunning && s.timerEndAt && s.timerEndAt > Date.now()) {
    timerState.running = true;
    timerState.endAt = s.timerEndAt;
    timerState.total = s.timerTotal || 0;
  } else if (s.timerEndAt && s.timerEndAt <= Date.now()) {
    store.set({ timerRunning: false, timerEndAt: 0 });
  }
  setTimerButtons();

  // 뽀모도로 상태 복원
  if (s.pomo && s.pomo.cfg) {
    pomo = s.pomo;
    ensurePomoCfg();
    if (pomo.running && (!pomo.endAt || pomo.endAt <= Date.now())) {
      // 패널이 닫힌 사이 이미 끝난 경우 → 정지 상태로 표시(백그라운드가 전환 처리)
      pomo.running = false;
      pomo.remaining = 0;
    }
  }
  // 날짜가 바뀌면 오늘 세션 수 초기화
  const tk = todayKey();
  if (pomo.dayKey !== tk) {
    pomo.dayKey = tk;
    pomo.count = 0;
  }
  savePomo();
  bindPomoConfig();
  renderPomo();

  switchView(settings.lastView);
  renderTimer();
  requestAnimationFrame(tickFast);
  setInterval(updateWorldTimes, 1000);
}

init();
