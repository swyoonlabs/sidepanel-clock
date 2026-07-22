# Changelog

## [1.2.0] - 2026-07-22

### Added
- **Meeting planner** — a time slider in the world clock: drag to a time and every city instantly shows what time it is there, so you can plan across time zones without any math. Tap "Now" to return to live.
- **Pomodoro long-break controls** — a "long break in N" indicator shows how many focus sessions remain until the next long break, and the long-break interval (every N sessions) is now configurable.

### Changed
- **Pomodoro Skip** — the Skip button now follows the real cycle, so skipping focus sessions also reaches the long break (previously it only alternated focus/short break).

### Removed
- **Save as image** — removed the clock-to-image capture feature, along with the `clipboardWrite` permission it required.

### Fixed
- **Timer & Pomodoro number inputs** — hide the native number spinner so the hour/minute/second values stay centered.
- **Timer display** — long durations (HH:MM:SS) now scale down to fit inside the progress ring instead of overflowing it.

## [1.1.0] - 2026-07-21

### Added
- **Clock faces** — choose from 4 analog designs: Classic (ticks), Minimal (dots), Roman numerals, and Numbers. Cycle with a single tap.
- **Theme colors** — 8 accent palettes (Indigo, Ocean, Teal, Emerald, Violet, Rose, Amber, Slate) that recolor the header, controls, and clock together.
- **Auto theme** — a third theme mode that switches between light and dark based on the time of day (light 07:00–19:00), alongside the existing light/dark toggle.
- **World clock at a glance** — each city now shows a country flag and a day/night indicator (dawn/day/dusk/night) for its local time.
- **Save as image** — capture the clock with an optional caption (e.g. "Meeting starts now") as a shareable PNG; download it or copy it to the clipboard.

### Improved
- **World clock offsets** — the "vs local" label is now computed in minutes, so half-hour and 45-minute zones (India +5:30, Nepal +5:45) display correctly. Daylight Saving Time is still handled automatically via IANA time-zone names.
- **World clock cards** — refreshed with a subtle hover lift and accent-aware styling.

### Fixed
- **"Rate this extension" link** — now points to the correct Chrome Web Store address (new store URL format).

## [1.0.0] - 2026-07-17

### Initial Release
- **Always-on clock** — a large digital + analog clock pinned to the top of the side panel, visible while you browse. Toggle 12/24-hour, seconds, and analog on/off.
- **World clock** — track 20 major cities at a glance with their local time, date, and offset from your local time. Add and remove cities freely.
- **Timer** — countdown with a circular progress ring, quick presets (1 / 3 / 5 / 10 / 25 min) or a custom hour/minute/second entry, and a sound + notification when it finishes.
- **Pomodoro** — automatic focus → break → long-break cycles with a progress ring, a daily session counter, and customizable focus/break lengths. Keeps cycling and notifies you even when the panel is closed.
- **8 languages** — English, Korean, Japanese, Simplified Chinese, Spanish, French, German, and Brazilian Portuguese. UI, dates, times, and city names localize automatically to the browser language.
- **Light & Dark themes** — with a one-tap toggle.
- **100% private & offline** — all settings and state are stored locally with Chrome's Storage API. Nothing is collected or sent to any server.
