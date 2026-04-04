# Frontend Handoff: Live Call Transcript and Summary Dashboard

## 1) Objective
Build a web dashboard that shows call transcript updates during the live Twilio call, allows transcript download at any time, and displays a Fireflies-style conversation intelligence summary with next steps.

This document is intentionally sanitized and contains no secret values.

## 2) Functional Scope
The frontend should provide:

1. Call list panel
- Show active and recent calls.
- Show call status, language, turns, and last update time.

2. Live transcript panel
- Show per-turn timeline.
- Each turn should include:
  - Caller transcript
  - Assistant reply
  - Intent label
  - Timestamp

3. Summary report panel
- Show summary title and overview.
- Show key points.
- Show next steps.
- Show action items with owner and priority.
- Show risks or blockers.
- Show suggested follow-up message.

4. Transcript download
- Download full transcript text report for selected call.

5. Summary regeneration action
- Trigger fresh summary generation from current transcript.

## 3) Backend API Contract (already available)
Base URL:
- In local dev, use Vite proxy or VITE_API_BASE_URL.

Endpoints:

1. GET /api/calls
Response shape:
- calls: array of
  - call_sid: string
  - status: active or completed
  - language: en-IN or hi-IN or mr-IN
  - turns: number
  - started_at: ISO timestamp
  - updated_at: ISO timestamp
  - preview: short transcript snippet

2. GET /api/calls/{call_sid}
Response shape:
- call_sid
- language
- language_label
- status
- turns
- started_at
- updated_at
- from_number
- to_number
- segments: array of
  - timestamp
  - turn
  - language
  - recording_url
  - transcript
  - analysis (intent, sentiment, entities)
  - reply
  - error
- summary_report: object or null

3. GET /api/calls/{call_sid}/summary
Response shape:
- call_sid
- summary_report

4. POST /api/calls/{call_sid}/summary/regenerate
Response shape:
- call_sid
- summary_report

5. GET /api/calls/{call_sid}/transcript.txt
Response:
- Plain text downloadable file
- Includes transcript plus summary report block

## 4) Recommended Frontend State Model
Top-level state:

- calls: array
- selectedCallSid: string
- callDetail: object or null
- autoRefresh: boolean
- loadingCalls: boolean
- loadingDetail: boolean
- summaryBusy: boolean
- errorMessage: string

Derived data:

- selectedCall from calls by selectedCallSid
- segments from callDetail.segments
- summary from callDetail.summary_report

## 5) Polling and Refresh Strategy
Use lightweight polling:

1. Refresh call list every 2500 ms.
2. Refresh selected call details every 1800 ms.
3. Allow toggling auto-refresh on or off.
4. Keep manual refresh buttons for both list and detail.

## 6) UX Behavior Requirements
1. If no calls exist:
- Show empty-state message.

2. If call exists but no transcript turns yet:
- Show waiting message.

3. If summary is missing:
- Show placeholder text and regeneration button disabled until transcript exists.

4. Error handling:
- Non-blocking banner for API failures.
- Do not clear old data on transient fetch errors.

5. Mobile responsiveness:
- Stack left and right columns into one column under tablet width.

## 7) File-Level Implementation Plan
Main files:

1. src/App.jsx
- Build dashboard layout and data flow.
- Add fetch calls, fetch details, regenerate summary functions.
- Add polling useEffect hooks.
- Render transcript timeline and summary cards.

2. src/App.css
- Add dashboard styles, cards, badges, responsive breakpoints.

3. vite.config.js
- Add local proxy to backend:
  - /api -> http://127.0.0.1:8000
  - /health -> http://127.0.0.1:8000

## 8) Security and Env Rules
1. Frontend must not contain Twilio or Sarvam secrets.
2. Use only frontend-safe config variable:
- VITE_API_BASE_URL

3. Keep real secrets only in backend env files.
4. Do not paste any secret values in source code, markdown docs, or screenshots.

## 9) Acceptance Criteria
1. During an active call, transcript timeline updates without page reload.
2. User can select any call and inspect full turn-by-turn transcript.
3. User can download transcript report anytime for selected call.
4. User can regenerate summary and see updated report in UI.
5. Dashboard remains usable on desktop and mobile.

## 10) QA Checklist
1. Start backend and open dashboard.
2. Place a Twilio test call.
3. Confirm call appears in list.
4. Confirm each spoken turn appears in timeline.
5. Confirm summary is shown after turns are captured.
6. Click Regenerate Summary and verify updated timestamp.
7. Click Download Transcript and verify file content.
8. Verify no API keys appear in browser network payloads or source.

## 11) Known Runtime Note
Current frontend dependency versions in this repo may require newer Node versions than some local setups.

If frontend build fails with Node engine/version errors, either:
1. Upgrade Node to a compatible version, or
2. Use dependency versions compatible with your current Node runtime.

## 12) Future Extension (for DB integration)
When persistent storage is added later:
1. Replace polling with WebSocket or server-sent events for live transcript.
2. Add transcript search and filtering by date, language, status.
3. Add report history versions and export to PDF/CSV.
4. Add user auth and role-based access for counsellors.
