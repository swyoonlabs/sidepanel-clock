"use strict";

// ------------------------- 유틸 -------------------------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const pad = (n, w = 2) => String(n).padStart(w, "0");

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
}

// 상태
let settings = {
  theme: "light",
  h24: false,
  seconds: true,
  analog: true,
  worldTz: [],
  lastView: "clock",
};

// ------------------------- 테마 -------------------------
function applyTheme() {
  document.documentElement.setAttribute("data-theme", settings.theme);
  $("#themeToggle").textContent = settings.theme === "dark" ? "☀️" : "🌙";
}
$("#themeToggle").addEventListener("click", () => {
  settings.theme = settings.theme === "dark" ? "light" : "dark";
  applyTheme();
  store.set({ theme: settings.theme });
});

// ------------------------- 정보(About) 시트 -------------------------
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
  // 스토어 리뷰 링크 (설치된 확장에서만 id 존재)
  try {
    if (chrome.runtime && chrome.runtime.id) {
      $("#linkRate").href =
        "https://chromewebstore.google.com/detail/" + chrome.runtime.id + "/reviews";
    }
  } catch (e) {
    /* noop */
  }
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

function drawAnalog(now) {
  const size = analog.width;
  const r = size / 2;
  const styles = getComputedStyle(document.documentElement);
  const faceBg = settings.theme === "dark" ? "#1e293b" : "#ffffff";
  const border = settings.theme === "dark" ? "#334155" : "#e2e8f0";
  const tick = styles.getPropertyValue("--text").trim() || "#1e293b";
  const dim = styles.getPropertyValue("--text-dim").trim() || "#64748b";
  const accent = styles.getPropertyValue("--accent").trim() || "#ef4444";

  actx.clearRect(0, 0, size, size);
  actx.save();
  actx.translate(r, r);

  // 원판
  actx.beginPath();
  actx.arc(0, 0, r - 6, 0, Math.PI * 2);
  actx.fillStyle = faceBg;
  actx.fill();
  actx.lineWidth = 4;
  actx.strokeStyle = border;
  actx.stroke();

  // 눈금
  for (let i = 0; i < 60; i++) {
    const ang = (i * Math.PI) / 30;
    const isHour = i % 5 === 0;
    const len = isHour ? 12 : 5;
    const outer = r - 14;
    actx.beginPath();
    actx.lineWidth = isHour ? 3 : 1;
    actx.strokeStyle = isHour ? tick : dim;
    actx.moveTo((outer - len) * Math.sin(ang), -(outer - len) * Math.cos(ang));
    actx.lineTo(outer * Math.sin(ang), -outer * Math.cos(ang));
    actx.stroke();
  }

  const h = now.getHours() % 12;
  const m = now.getMinutes();
  const s = now.getSeconds();
  const ms = now.getMilliseconds();

  const hand = (angle, length, width, color) => {
    actx.beginPath();
    actx.lineCap = "round";
    actx.lineWidth = width;
    actx.strokeStyle = color;
    actx.moveTo(-Math.sin(angle) * (length * 0.18), Math.cos(angle) * (length * 0.18));
    actx.lineTo(Math.sin(angle) * length, -Math.cos(angle) * length);
    actx.stroke();
  };

  const secAngle = ((s + ms / 1000) * Math.PI) / 30;
  const minAngle = ((m + s / 60) * Math.PI) / 30;
  const hourAngle = ((h + m / 60) * Math.PI) / 6;

  hand(hourAngle, r * 0.5, 6, tick);
  hand(minAngle, r * 0.72, 4, tick);
  if (settings.seconds) hand(secAngle, r * 0.78, 2, accent);

  actx.beginPath();
  actx.arc(0, 0, 5, 0, Math.PI * 2);
  actx.fillStyle = accent;
  actx.fill();
  actx.restore();
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
  setOpt($("#opt24h"), settings.h24);
  setOpt($("#optSeconds"), settings.seconds);
  setOpt($("#optAnalog"), settings.analog);
  $("#analog").style.display = settings.analog ? "" : "none";

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
    store.set({ analog: settings.analog });
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

function localOffsetLabel(zone, now) {
  // 로컬 대비 시차 계산
  const fmt = (tz) =>
    new Date(now.toLocaleString("en-US", { timeZone: tz })).getTime();
  const diffH = Math.round((fmt(zone) - fmt(Intl.DateTimeFormat().resolvedOptions().timeZone)) / 3600000);
  if (diffH === 0) return t("offsetSame");
  return t("offsetDiff", [(diffH > 0 ? "+" : "") + diffH]);
}

function renderWorldList() {
  const ul = $("#worldList");
  ul.innerHTML = "";
  $("#worldEmpty").style.display = settings.worldTz.length ? "none" : "block";
  settings.worldTz.forEach((zone) => {
    const li = document.createElement("li");
    li.className = "world-item";
    li.dataset.zone = zone;
    li.innerHTML = `
      <div>
        <div class="city">${cityName(zone)}</div>
        <div class="sub"></div>
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

function updateWorldTimes() {
  const now = new Date();
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
  $("#timerDisplay").textContent = fmtTimer(rem);
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
$$(".chip").forEach((c) =>
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
  $("#pomoDisplay").textContent = fmtTimer(rem);
  const ring = $("#pomoRing");
  setRing(ring, rem, total);
  ring.classList.toggle("break", pomo.phase !== "focus");
  $("#pomoPhase").textContent = phaseLabel(pomo.phase);
  $("#pomoCount").textContent = t("pomoCount", [String(pomo.count)]);
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
  // 수동 건너뛰기: 집중↔휴식만 전환 (세션 수는 증가시키지 않음)
  pomo.phase = pomo.phase === "focus" ? "short" : "focus";
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
  const map = { pomoFocus: "focus", pomoShort: "short", pomoLong: "long" };
  Object.entries(map).forEach(([id, key]) => {
    const el = $("#" + id);
    el.value = pomo.cfg[key];
    el.addEventListener("change", () => {
      const v = Math.max(1, parseInt(el.value) || 1);
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
  if (s.pomo) pomo = s.pomo;
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
  if ($("#view-timer").classList.contains("active")) renderTimer();
  if ($("#view-pomodoro").classList.contains("active")) renderPomo();
  requestAnimationFrame(tickFast);
}

// ------------------------- 초기화 -------------------------
async function init() {
  const s = await store.get([
    "theme", "h24", "seconds", "analog", "worldTz", "lastView",
    "timerRunning", "timerEndAt", "timerTotal", "pomo",
  ]);
  settings.theme = s.theme || "light";
  settings.h24 = !!s.h24;
  settings.seconds = s.seconds !== undefined ? s.seconds : true;
  settings.analog = s.analog !== undefined ? s.analog : true;
  settings.worldTz = s.worldTz || [];
  settings.lastView = VIEWS.includes(s.lastView) ? s.lastView : "world";

  applyI18n();
  // 타이머 프리셋 라벨(분) 로케일 처리
  $$(".chip").forEach((c) => {
    c.textContent = t("nMin", [String(Math.round(c.dataset.sec / 60))]);
  });

  applyTheme();
  setupAbout();
  bindClockOptions();
  initWorldSelect();
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
