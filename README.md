# orasometer

A Chrome extension for managing work time: one main countdown for the day, optional Pomodoro break prompts, and multiple stopwatch-style timers with accumulated time.

## Concept

**Window 1[main timer]**  
Set how long you plan to work. A circular progress ring shows time remaining. **+** / **−** adjust the target duration by **15 seconds** each tap. **Start** runs the countdown; **Reset** does a **full session restart** (main timer, tasks, Pomodoro/break state)—see **Stopwatches (task tracking)**. The small **stopwatch** control opens the **task list (Window 2)** so you can pick or edit **which task you are working on right now**. The **chart** icon next to the logo also opens **Window 2**.

**Window 2[task list / “stopwatches”]**  
Each row is a **named task** (editable title), not an independent clock. **Only one task is active at a time.** Time accrues **only for the active task**, and **only while the main timer on Window 1 is running**. The active task stays **in sync with the main timer** (main paused >> no task time increases, main running >> active task’s total increases). Switching the active task is how you **log what you’re working on** during that slice of the work session. Each row can show that task’s **accumulated** time (sum of all past slices when it was active while the main timer was running). **Total** is the **sum of accumulated time across all tasks** for the current session (**Reset** clears tasks and totals, see below).

See **Stopwatches (task tracking)** below for precise rules.

**Break prompt[Pomodoro break]**  
When a break is offered, a notification prompts the user (e.g. “Have a break” with a short countdown). While this **Pomodoro break timer is actively counting down**, the **main timer (Window 1) is paused** so break time does not eat the work budget.

## Pomodoro and break rules

These defaults keep behavior predictable for alarms, storage, and edge cases.

| Question | Decision |
|----------|----------|
| **When does a break *offer* appear?** | **After a focus interval** of main-timer **running** time (not paused, not during an active break countdown). Default interval: **25 minutes**. Optionally also **manual** “Take a break” that opens the same break window. The day’s **total work duration** on Window 1 is separate. **Focus elapsed** resets to 0 when the focus interval resets (see rows below): e.g. session start, dismiss/skip, completed break, or break ended early. |
| **Default break length** | **5 minutes**. Later: user setting in storage. |
| **Is the break mandatory?** | **No.** User can **Skip** / **Dismiss** without starting the countdown. |
| **When is the main timer paused?** | **Only while the break countdown is running** (after user starts it, e.g. Play). Merely showing the break window before Play does **not** pause the main timer. |
| **User closes the break window** | **Dismiss**: stop any active break countdown, clear the break offer, **resume the main timer** if it was paused, **reset the focus interval** (next offer after **25 minutes** of main running time again). |
| **Break countdown reaches zero** | **End break**: close or idle the break window, **resume the main timer**, **reset the focus interval** (next offer after **25 minutes** of main running time). |

**Skip / dismiss without pressing Play:** Same as closing before a countdown starts: clear the offer and **reset the focus interval** so the prompt does not immediately re-fire.

**Implementation note:** Track **focus elapsed** in the service worker (e.g. increment from alarms against `lastTick` while `mainPhase === 'running'` and no active break countdown), not only in the popup.

## Stopwatches (task tracking)

| Rule | Behavior |
|------|----------|
| **Purpose** | Rows are **task labels**. The active row answers: *what am I working on during this time?* |
| **Concurrency** | **At most one active task.** Starting or selecting another task **deactivates** the previous one (no parallel task timers). |
| **Sync with main timer** | Active task time advances **if and only if** the **main timer is in the running state** (same instants as the main work countdown). User pause, break countdown, or any other main pause **freezes** active task accumulation. |
| **UI (play / pause per row)** | Treat as **“this is my current task”** vs **“no task selected”** (or equivalent), not independent stopwatches. Only the active row should appear “running” while the main timer runs; others are idle totals. Exact control pattern (tap row vs explicit play) is up to UI; behavior must enforce **one active task** and **sync with main**. |
| **Window 1 stopwatch vs chart** | Both navigate to **Window 2**; optionally differentiate later (e.g. stopwatch focuses **create / pick active task**, chart opens **list**) if you want two entry points. |
| **Reset (Window 1)** | **Full restart:** main timer back to the **configured total duration**, **stopped**; **clear the entire task list** (no active task, all accumulated times gone); **reset Pomodoro focus elapsed**; **dismiss/close** any break window or pending break offer so nothing carries over from the previous session. |

## Tech stack (recommended)

| Layer | Choice | Why |
|--------|--------|-----|
| UI | **Vue 3** (Composition API) | Matches requirement, good fit for reactive timers and small popup UIs. |
| Build | **Vite** + **[@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)** | Fast HMR and a standard pipeline for Manifest V3 extensions (popup, background, assets). |
| Language | **TypeScript** | Safer message passing between popup, service worker, and optional offscreen/notifications code. |
| State | **Pinia** | Clear stores for: main session, **active task id + per-task accumulated time**, Pomodoro/break mode, and “main paused while break runs” rules. |
| Routing (popup) | **Vue Router** *or* a single **view switch** in Pinia | Two “windows” can be two routes in one popup, or one component with `currentView`. Router scales if you add more screens. |
| Persistence | **`chrome.storage.local`** (primary) | Survives browser restarts; use `sync` only for small prefs if you need cross-device. |
| Background | **MV3 service worker** | Alarms and timer logic when the popup is closed (`chrome.alarms` + stored timestamps). |
| Styling | **Plain CSS in SFCs** or **Tailwind** | Mockups are simple; Tailwind speeds spacing/typography |

### Break prompt UI (notification-style window)

The Pomodoro break UI can **look like a browser notification** but **does not need to use** `chrome.notifications`. Open a **small Chrome extension window** (e.g. `chrome.windows.create` with `type: 'popup'`, compact `width` / `height`, and `url` pointing to a dedicated extension page).

### Timer accuracy

Avoid relying only on `setInterval` in the popup (it throttles when inactive). Prefer **storing `endTimestamp` (or `startedAt` + `duration`)** and deriving remaining time in the UI; use **`chrome.alarms`** in the service worker for wake-ups and opening or updating the break window.

## Repository assets

Design mockups live under [`mockups/`](mockups/):

- [Window 1 — main timer + progress ring](mockups/v1/Window%201.png)  
- [Window 2 — task list + editable titles](mockups/v1/Window%202.png)  
- [Browser Notification — Pomodoro break prompt](mockups/v1/Browser%20Notification.png)  

## Development (outline)

1. Scaffold with Vite + Vue + CRXJS for Manifest V3.  
2. Implement popup views (Window 1 / Window 2) and Pinia stores.  
3. Move ticking, **task time (active task + main-running)**, and “pause main while Pomodoro runs” logic to a **single source of truth** (store + service worker sync).  
4. Persist timers and main session to `chrome.storage.local`.  
5. Add break flow + notification-style window and test with popup closed.

## License

TBD.
