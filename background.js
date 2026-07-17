// Side Panel Clock — 백그라운드 서비스 워커
// 역할: 액션 클릭 시 사이드 패널 열기, 타이머/알람 알림 처리

// 툴바 아이콘 클릭 시 사이드 패널 열기
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.error(err));
});

// 서비스 워커가 재시작될 때도 동작 보장
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error(err));

// 알람 발생 처리 (타이머 종료 / 뽀모도로 단계 전환)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "timer") {
    await handleTimer();
  } else if (alarm.name === "pomodoro") {
    await handlePomodoro();
  } else {
    return;
  }
  // 사이드 패널이 열려 있으면 소리 재생 + 화면 갱신 요청
  chrome.runtime.sendMessage({ type: "ALARM_FIRED", name: alarm.name }).catch(() => {});
});

async function handleTimer() {
  const { timerLabel } = await chrome.storage.local.get("timerLabel");
  await chrome.storage.local.set({ timerRunning: false, timerEndAt: 0 });
  notify(msg("timerDoneTitle"), timerLabel ? timerLabel : msg("timerDoneMsg"));
}

// 뽀모도로 단계 자동 전환 (패널이 닫혀 있어도 계속 순환)
async function handlePomodoro() {
  const { pomo } = await chrome.storage.local.get("pomo");
  if (!pomo || !pomo.cfg) return;

  const finished = pomo.phase;
  let count = pomo.count || 0;
  let nextPhase;
  if (finished === "focus") {
    count += 1;
    const every = pomo.cfg.longEvery || 4;
    nextPhase = count % every === 0 ? "long" : "short";
  } else {
    nextPhase = "focus";
  }

  const dur = (pomo.cfg[nextPhase] || 1) * 60000;
  const endAt = Date.now() + dur;
  const next = { ...pomo, phase: nextPhase, count, running: true, endAt, remaining: 0 };
  await chrome.storage.local.set({ pomo: next });
  chrome.alarms.create("pomodoro", { when: endAt });

  let body;
  if (finished === "focus") {
    body = nextPhase === "long" ? msg("pomoLongBreakMsg") : msg("pomoBreakMsg");
  } else {
    body = msg("pomoFocusMsg");
  }
  notify(msg("pomoTitle"), body);
}

// chrome.i18n.getMessage 래퍼 (키가 없으면 키 그대로 반환)
function msg(key) {
  return (chrome.i18n && chrome.i18n.getMessage(key)) || key;
}

function notify(title, message) {
  chrome.notifications.create("n:" + Date.now(), {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title,
    message,
    priority: 2,
    requireInteraction: true,
  });
}

// 알림 클릭 시 닫기
chrome.notifications.onClicked.addListener((notifId) => {
  chrome.notifications.clear(notifId);
});
