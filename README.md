# orasometer

A Chrome extension for managing work time: one main countdown for the day, optional Pomodoro break prompts, and multiple stopwatch-style timers with accumulated time.

## Concept

**Window 1[main timer]**  
Set how long you plan to work. A circular progress ring shows time remaining. **+** / **−** adjust the planned session length by **15 seconds** per tap (when the main timer is **not** running). The same **±15s** also updates **Pomodoro focus** toward the next **25-minute** break reminder: **+** pushes the offer later (focus elapsed decreases), **−** pulls it sooner (focus elapsed increases; hitting the interval turns on the offer). While a **break countdown** is active, **±** still changes the main session numbers but **does not** change focus during that countdown. **Start** runs the countdown; **Reset** does a **full session restart** (main timer, tasks, Pomodoro/break state)—see **Stopwatches (task tracking)**. The small **stopwatch** control on the ring opens the **task list (Window 2)** so you can pick or edit **which task you are working on right now**. The **gear** icon next to the logo opens **Settings** (planned work **hours** for the main session and **break length** in minutes; persisted in `chrome.storage.local`). **Take a break** (and the automatic break **offer** after 25 minutes of focus) opens the **Pomodoro break screen inside the same extension popup**—not a separate browser window.

**Window 2[task list / “stopwatches”]**  
Each row is a **named task** (editable title), not an independent clock. **Only one task is active at a time.** Time accrues **only for the active task**, and **only while the main timer on Window 1 is running**. The active task stays **in sync with the main timer** (main paused >> no task time increases, main running >> active task’s total increases). Switching the active task is how you **log what you’re working on** during that slice of the work session. Each row can show that task’s **accumulated** time (sum of all past slices when it was active while the main timer was running). **Total** is the **sum of accumulated time across all tasks** for the current session (**Reset** clears tasks and totals, see below).

See **Stopwatches (task tracking)** below for precise rules.

**Break prompt[Pomodoro break]**  
When a break is offered or the user chooses **Take a break**, the popup switches to a **break** view (e.g. “Have a break” with Play / Dismiss / Skip). While the **Pomodoro break countdown is running**, the **main timer** is **paused** so break time does not eat the work budget. If the popup is closed, the user sees the break UI the next time they open the extension (state stays in `chrome.storage.local`). The **toolbar icon** also **blinks** (bright / dim) during an active break countdown and while a **break offer** is pending with the **main timer running**, so reminders are visible without opening the popup—see **Toolbar icon** below.

## Pomodoro and break rules

These defaults keep behavior predictable for alarms, storage, and edge cases.

| Question | Decision |
|----------|----------|
| **When does a break *offer* appear?** | **After a focus interval** of main-timer **running** time (not paused, not during an active break countdown). Default interval: **25 minutes**. Optionally also **manual** “Take a break”, which opens the **break view** in the popup. The day’s **total work duration** on Window 1 is separate. **Focus elapsed** resets to 0 when the focus interval resets (see rows below): e.g. session start, dismiss/skip, completed break, or break ended early. |
| **Do Window 1 +/− affect the 25-minute focus interval?** | **Yes**, when **no** break countdown is running: each **±15s** tap adjusts **focus elapsed** in the opposite sense of session length (**+** delays the next offer, **−** advances it), clamped to the interval. Crossing the threshold from **−** can turn the offer on; **+** can drop focus below the threshold and **clear** a pending offer. |
| **Default break length** | **5 minutes** default; user can change it in **Settings** (stored with session state). |
| **Is the break mandatory?** | **No.** User can **Skip** / **Dismiss** without starting the countdown. |
| **When is the main timer paused?** | **Only while the break countdown is running** (after user starts it, e.g. Play). Showing the break **view** before Play does **not** pause the main timer. |
| **User leaves the break view** (back) | Does **not** by itself end a running break countdown. **Dismiss** (when an interval offer is pending) or **Skip** (during countdown) applies the same rules as before: reset focus / resume main as documented. |
| **Break countdown reaches zero** | **End break**: **resume the main timer**, **reset the focus interval** (next offer after **25 minutes** of main running time). The popup returns to the main timer view when the break ends. |

**Skip / dismiss without pressing Play:** Same as closing before a countdown starts: clear the offer and **reset the focus interval** so the prompt does not immediately re-fire.

**Implementation note:** Track **focus elapsed** in the service worker (e.g. increment from alarms against `lastTick` while `mainPhase === 'running'` and no active break countdown), not only in the popup.

## Toolbar icon

The extension action icon alternates **normal** and **dim** green while:

1. the **Pomodoro break countdown** is running, or  
2. a **break offer** is pending and the **main timer is running** (after the focus interval).

Blinking is stepped on the same **~1 second** `chrome.alarms` tick as the rest of the timer logic (not a separate sub-minute alarm). One bright or dim **phase** lasts about **2 seconds** before toggling.

## Stopwatches (task tracking)

| Rule | Behavior |
|------|----------|
| **Purpose** | Rows are **task labels**. The active row answers: *what am I working on during this time?* |
| **Concurrency** | **At most one active task.** Starting or selecting another task **deactivates** the previous one (no parallel task timers). |
| **Sync with main timer** | Active task time advances **if and only if** the **main timer is in the running state** (same instants as the main work countdown). User pause, break countdown, or any other main pause **freezes** active task accumulation. |
| **UI (play / pause per row)** | Treat as **“this is my current task”** vs **“no task selected”** (or equivalent), not independent stopwatches. Only the active row should appear “running” while the main timer runs; others are idle totals. Exact control pattern (tap row vs explicit play) is up to UI; behavior must enforce **one active task** and **sync with main**. |
| **Window 1 stopwatch vs gear** | **Stopwatch** (on the ring) → **Window 2** (tasks). **Gear** (header) → **Settings** (main session hours + break minutes). |
| **Reset (Window 1)** | **Full restart:** main timer back to the **configured total duration**, **stopped**; **clear the entire task list** (no active task, all accumulated times gone); **reset Pomodoro focus elapsed**; **dismiss/close** any break window or pending break offer so nothing carries over from the previous session. |

## Tech stack (recommended)

| Layer | Choice | Why |
|--------|--------|-----|
| UI | **Vue 3** (Composition API) | Matches requirement, good fit for reactive timers and small popup UIs. |
| Build | **Vite** + **[@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)** | Fast HMR and a standard pipeline for Manifest V3 extensions (popup, background, assets). |
| Language | **TypeScript** | Safer message passing between popup, service worker, and optional offscreen/notifications code. |
| State | **Pinia** | Clear stores for: main session, **active task id + per-task accumulated time**, Pomodoro/break mode, and “main paused while break runs” rules. |
| Routing (popup) | **View switch** in Pinia (`main` / tasks / settings) | Router optional if the popup grows further. |
| Persistence | **`chrome.storage.local`** (primary) | Survives browser restarts; use `sync` only for small prefs if you need cross-device. |
| Background | **MV3 service worker** | Alarms and timer logic when the popup is closed (`chrome.alarms` + stored timestamps). |
| Styling | **Plain CSS in SFCs** or **Tailwind** | Mockups are simple; Tailwind speeds spacing/typography |

### Break prompt UI

The Pomodoro break flow uses a **dedicated view inside the extension action popup** (same HTML document as the main timer), styled like a compact prompt. No separate `chrome.windows` tab/window is required.

### Timer accuracy

Avoid relying only on `setInterval` in the popup (it throttles when inactive). Prefer **storing `endTimestamp` (or `startedAt` + `duration`)** and deriving remaining time in the UI; use **`chrome.alarms`** in the service worker for ticks while the popup is closed.

## Repository assets

Design mockups live under [`mockups/`](mockups/):

- [Window 1 - main timer + progress ring](mockups/v1.5.0/Window%201%20v1.5.png)  
- [Window 2 - task list + editable titles](mockups/v1.5.0/Window%202%20v1.5.png)  
- [Settings - Set main hour and break time length](mockups/v1.5.0/Settings%20v1.5.png)
- [Browser Notification — Pomodoro break prompt](mockups/v1.5.0/Pomodoro%20v1.5.png)
- [Toolbar icon — break countdown or break offer while main timer running](mockups/v1.5.0/Icon%20Notif.png)

## Development

**Setup:** `npm install` — **production build:** `npm run build` — **dev (HMR):** `npm run dev` (use the CRXJS / Vite dev flow for extensions on your machine).

**Load unpacked:** `chrome://extensions` → Developer mode → **Load unpacked** → choose the **`dist`** folder after `npm run build`.

## License

[MIT](LICENSE)
