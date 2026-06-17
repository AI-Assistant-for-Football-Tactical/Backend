# Post-Match Analysis — API Documentation

> **Version:** 1.0  
> **Base URL:** `/post-match`  
> **Auth:** All endpoints require a valid JWT Bearer token.

---

## 1. Feature Overview

The Post-Match Analysis feature allows authenticated club members to generate AI-powered tactical analysis for completed football matches.

### How It Works

1. A user submits a match ID (`eventId`) and team ID (`teamId`)
2. The system verifies the user belongs to a club and that the requested team matches their club
3. If a cached report exists for this match + team, it is returned immediately
4. Otherwise, the system calls an external **AI microservice** to generate structured match analysis
5. The structured analysis is then passed to an **LLM** (Gemini / Groq) to generate a human-readable explanation
6. The report is saved to the database and returned

### Key Concepts

| Concept       | Description                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------- |
| **Report**    | A stored analysis result for a specific match and team                                       |
| **Cached**    | If a report already exists for a match + team pair, it is returned without re-running the AI |
| **COMPLETED** | Report has both raw AI analysis AND LLM explanation                                          |
| **PARTIAL**   | Report has raw AI analysis but the LLM explanation failed                                    |

---

## 2. API Endpoints

### 2.1 Trigger Post-Match Analysis

```
POST /post-match/analyze
```

Runs the full analysis pipeline for a match. Returns a cached report if one already exists.

#### Headers

| Header          | Value                | Required |
| --------------- | -------------------- | :------: |
| `Authorization` | `Bearer <jwt_token>` |    ✅    |
| `Content-Type`  | `application/json`   |    ✅    |

#### Request Body

| Field     | Type     | Required | Description                              |
| --------- | -------- | :------: | ---------------------------------------- |
| `eventId` | `string` |    ✅    | SofaScore event/match identifier         |
| `teamId`  | `string` |    ✅    | SofaScore team identifier to analyze for |

#### Request Example

```json
POST /post-match/analyze
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

{
  "eventId": "14023985",
  "teamId": "44"
}
```

#### Success Response (200)

```json
{
  "statusCode": 200,
  "timestamp": "2026-04-21T01:30:00.000Z",
  "success": true,
  "message": "Post-match analysis completed successfully.",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "eventId": "14023985",
    "teamId": "44",
    "status": "COMPLETED",
    "rawAnalysis": {
      "event_id": "14023985",
      "team_id": "44",
      "analysis_timestamp": "2026-04-14T22:00:00Z",
      "match_context": {
        "opponent_id": "team_3",
        "match_result": "Loss",
        "team_formation": "4-2-3-1"
      },
      "players_analysis": [
        {
          "player_id": "151545",
          "name": "Virgil van Dijk",
          "position": "D",
          "minutes_played": 90,
          "fatigue_and_risk": {
            "fatigue_index": 100.0,
            "injury_risk_level": "High"
          }
        }
      ],
      "trainingPlan": {
        "teamDrills": [...],
        "individualDrills": [...]
      }
    },
    "llmExplanation": "Based on the analysis, the team experienced...",
    "llmModel": "gemini-2.0-flash",
    "analysisTimestamp": "2026-04-14T22:00:00.000Z",
    "createdAt": "2026-04-21T01:30:00.000Z",
    "cached": false
  }
}
```

---

### 2.2 List Reports

```
GET /post-match/reports
```

Returns a paginated list of report summaries belonging to the user's club. Does NOT include `rawAnalysis` or `llmExplanation`.

#### Headers

| Header          | Value                | Required |
| --------------- | -------------------- | :------: |
| `Authorization` | `Bearer <jwt_token>` |    ✅    |

#### Query Parameters

| Param   | Type      | Default | Min | Max  | Description    |
| ------- | --------- | :-----: | :-: | :--: | -------------- |
| `page`  | `integer` |   `1`   | `1` |  —   | Page number    |
| `limit` | `integer` |  `10`   | `1` | `50` | Items per page |

#### Request Example

```
GET /post-match/reports?page=1&limit=10
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### Success Response (200)

```json
{
  "statusCode": 200,
  "timestamp": "2026-04-21T01:30:00.000Z",
  "success": true,
  "message": "Reports retrieved successfully.",
  "data": {
    "reports": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "eventId": "14023985",
        "teamId": "44",
        "status": "COMPLETED",
        "analysisTimestamp": "2026-04-14T22:00:00.000Z",
        "createdAt": "2026-04-21T01:30:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

---

### 2.3 Get Single Report

```
GET /post-match/reports/:id
```

Returns the full report including raw analysis and LLM explanation.

#### Headers

| Header          | Value                | Required |
| --------------- | -------------------- | :------: |
| `Authorization` | `Bearer <jwt_token>` |    ✅    |

#### Path Parameters

| Param | Type   | Description                              |
| ----- | ------ | ---------------------------------------- |
| `id`  | `UUID` | Report identifier (must be a valid UUID) |

#### Request Example

```
GET /post-match/reports/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### Success Response (200)

Same shape as the analyze response. The `cached` field is always `true` for this endpoint.

---

### 2.4 Retry LLM Explanation

```
POST /post-match/reports/:id/explain
```

Retries the LLM explanation step for a report that has status `PARTIAL`. Does NOT re-run the AI analysis.

#### Headers

| Header          | Value                | Required |
| --------------- | -------------------- | :------: |
| `Authorization` | `Bearer <jwt_token>` |    ✅    |

#### Path Parameters

| Param | Type   | Description                              |
| ----- | ------ | ---------------------------------------- |
| `id`  | `UUID` | Report identifier (must be a valid UUID) |

#### Request Example

```
POST /post-match/reports/a1b2c3d4-e5f6-7890-abcd-ef1234567890/explain
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

No request body required.

#### Success Response (200)

Same shape as the analyze response. The `cached` field is `false`. Status changes from `PARTIAL` to `COMPLETED`.

---

## 3. Response Field Reference

### Full Report Response

| Field               | Type             | Nullable | Description                                                                  |
| ------------------- | ---------------- | :------: | ---------------------------------------------------------------------------- |
| `id`                | `string (UUID)`  |    No    | Unique report identifier                                                     |
| `eventId`           | `string`         |    No    | SofaScore event/match ID                                                     |
| `teamId`            | `string`         |    No    | SofaScore team ID                                                            |
| `status`            | `string`         |    No    | `"COMPLETED"` or `"PARTIAL"`                                                 |
| `rawAnalysis`       | `object`         |    No    | Full structured AI analysis JSON                                             |
| `llmExplanation`    | `string \| null` |   Yes    | Human-readable analysis. `null` when status is `PARTIAL`                     |
| `llmModel`          | `string \| null` |   Yes    | LLM model used (e.g., `"gemini-2.0-flash"`). `null` when status is `PARTIAL` |
| `analysisTimestamp` | `string \| null` |   Yes    | ISO timestamp from the AI. May be `null` if AI omits it                      |
| `createdAt`         | `string`         |    No    | ISO timestamp when the report was created                                    |
| `cached`            | `boolean`        |    No    | `true` if returned from cache, `false` if freshly generated                  |

### Report Summary Response (List Endpoint)

| Field               | Type             | Nullable | Description                               |
| ------------------- | ---------------- | :------: | ----------------------------------------- |
| `id`                | `string (UUID)`  |    No    | Unique report identifier                  |
| `eventId`           | `string`         |    No    | SofaScore event/match ID                  |
| `teamId`            | `string`         |    No    | SofaScore team ID                         |
| `status`            | `string`         |    No    | `"COMPLETED"` or `"PARTIAL"`              |
| `analysisTimestamp` | `string \| null` |   Yes    | ISO timestamp from the AI                 |
| `createdAt`         | `string`         |    No    | ISO timestamp when the report was created |

---

## 4. Error Handling

All error responses follow this structure:

```json
{
  "statusCode": <number>,
  "timestamp": "<ISO string>",
  "success": false,
  "errorType": "<error type>",
  "messages": ["<error message>"],
  "path": "<request path>"
}
```

---

### 400 Bad Request — Invalid Input

**When:** Request body is missing required fields or has invalid types.

```json
{
  "statusCode": 400,
  "timestamp": "2026-04-21T01:30:00.000Z",
  "success": false,
  "errorType": "Bad Request",
  "messages": ["eventId is required.", "teamId is required."],
  "path": "/post-match/analyze"
}
```

**Also when:** Report ID in URL is not a valid UUID.

```json
{
  "statusCode": 400,
  "timestamp": "2026-04-21T01:30:00.000Z",
  "success": false,
  "errorType": "Bad Request",
  "messages": ["Validation failed (uuid is expected)"],
  "path": "/post-match/reports/not-a-uuid"
}
```

---

### 401 Unauthorized — Missing or Invalid Token

**When:** No `Authorization` header, expired token, or invalid JWT.

```json
{
  "statusCode": 401,
  "timestamp": "2026-04-21T01:30:00.000Z",
  "success": false,
  "errorType": "Unauthorized",
  "messages": ["Unauthorized"],
  "path": "/post-match/analyze"
}
```

---

### 403 Forbidden — Access Denied

**Scenario 1:** User does not belong to any club (`club_id` is null in JWT).

```json
{
  "statusCode": 403,
  "timestamp": "2026-04-21T01:30:00.000Z",
  "success": false,
  "errorType": "Forbidden",
  "messages": ["No club membership found."],
  "path": "/post-match/analyze"
}
```

**Scenario 2:** User's club team does not match the requested `teamId` (team-level access control).

```json
{
  "statusCode": 403,
  "timestamp": "2026-04-21T01:30:00.000Z",
  "success": false,
  "errorType": "Forbidden",
  "messages": ["You can only analyze your own team."],
  "path": "/post-match/analyze"
}
```

**Scenario 3:** User tries to access a report belonging to a different club.

```json
{
  "statusCode": 403,
  "timestamp": "2026-04-21T01:30:00.000Z",
  "success": false,
  "errorType": "Forbidden",
  "messages": ["You do not have access to this club's reports."],
  "path": "/post-match/reports/a1b2c3d4-..."
}
```

---

### 404 Not Found

**Scenario 1:** Report with the given ID does not exist.

```json
{
  "statusCode": 404,
  "timestamp": "2026-04-21T01:30:00.000Z",
  "success": false,
  "errorType": "Not Found",
  "messages": ["Report with id \"a1b2c3d4-...\" not found."],
  "path": "/post-match/reports/a1b2c3d4-..."
}
```

**Scenario 2:** User's club record was not found in the database (during analyze).

```json
{
  "statusCode": 404,
  "timestamp": "2026-04-21T01:30:00.000Z",
  "success": false,
  "errorType": "Not Found",
  "messages": ["Club not found."],
  "path": "/post-match/analyze"
}
```

---

### 409 Conflict — Already Completed

**When:** User tries to retry the LLM explanation on a report that already has status `COMPLETED`.

```json
{
  "statusCode": 409,
  "timestamp": "2026-04-21T01:30:00.000Z",
  "success": false,
  "errorType": "Conflict",
  "messages": ["This report already has a complete LLM explanation."],
  "path": "/post-match/reports/a1b2c3d4-.../explain"
}
```

---

### 502 Bad Gateway — AI/LLM Service Failure

**When:** The external AI analysis service is unreachable, timed out, or returned invalid data.

```json
{
  "statusCode": 502,
  "timestamp": "2026-04-21T01:30:00.000Z",
  "success": false,
  "errorType": "Bad Gateway",
  "messages": ["AI analysis service timed out. Please try again later."],
  "path": "/post-match/analyze"
}
```

Other possible 502 messages:

| Message                                                           | Cause                                       |
| ----------------------------------------------------------------- | ------------------------------------------- |
| `"Cannot connect to the AI analysis service."`                    | AI service is down                          |
| `"AI analysis service returned an error (HTTP 500)."`             | AI returned a server error                  |
| `"AI analysis service returned invalid data format."`             | Response was not a valid JSON object        |
| `"AI service returned invalid data: ..."`                         | Response failed validation (missing fields) |
| `"LLM service is currently unavailable. Please try again later."` | All LLM adapters failed during retry        |

---

## 5. Access Control Rules

### Rule 1: Club Membership Required

The user's JWT must contain a non-null `club_id`. Users without a club cannot use any Post-Match endpoint.

### Rule 2: Team-Level Restriction (Analyze Only)

When calling `POST /analyze`, the system verifies:

```
requested teamId === user's club sofa_score_club_id
```

The user's club has a `sofa_score_club_id` field (e.g., `"44"` for Liverpool). The requested `teamId` must exactly match this value. If not, the request is rejected with 403.

### Rule 3: Club-Level Report Access

- **List reports:** SQL filters by the user's `club_id` — users only see their own club's reports
- **Get report / Retry:** The system checks `report.club_id === user.club_id`

### Summary

| Endpoint                    | Checks Applied                                            |
| --------------------------- | --------------------------------------------------------- |
| `POST /analyze`             | Club membership → Team ownership → Club match (cache hit) |
| `GET /reports`              | Club membership → SQL WHERE filter                        |
| `GET /reports/:id`          | Club membership → Club ownership of report                |
| `POST /reports/:id/explain` | Same as GET report                                        |

---

## 6. Internal Flow (Simplified)

### Analyze Match Flow

```
1. Validate request body (eventId, teamId required)
2. Extract user from JWT
3. Check user has a club (403 if not)
4. Look up club's sofa_score_club_id from DB (404 if club missing)
5. Compare teamId with club's sofa_score_club_id (403 if mismatch)
6. Check cache: SELECT report WHERE event_id AND team_id
7. If cache hit → verify club ownership → return cached report
8. If cache miss:
   a. Call AI service (POST /post_match) — 60s timeout
   b. Validate AI response structure
   c. Call LLM (Gemini → Groq fallback) — 15s timeout per adapter
   d. Save report to DB
   e. Return new report
```

### Caching Behavior

- Reports are cached by `(event_id, team_id)` — compound unique index
- Once created, a report is never re-generated for the same match + team
- The `cached` flag in the response tells the frontend whether this was a fresh analysis or a cache hit

---

## 7. Report Lifecycle

```
┌─────────────────┐
│  POST /analyze   │
└────────┬────────┘
         │
    Cache exists?
    ┌────┴────┐
   Yes       No
    │         │
    │    ┌────┴────┐
    │    │ AI Call  │
    │    └────┬────┘
    │         │
    │    ┌────┴────────┐
    │    │  LLM Call    │
    │    └────┬────────┘
    │    ┌────┴────┐
    │   Yes       No (all adapters failed)
    │    │         │
    │    ▼         ▼
    │ COMPLETED  PARTIAL
    │    │         │
    │    └────┬────┘
    │         │
    │    Save to DB
    │         │
    ▼         ▼
  Return    Return
  (cached:  (cached:
   true)    false)
```

### Status Values

| Status      | Meaning                                | `llmExplanation` | `llmModel` | Can Retry? |
| ----------- | -------------------------------------- | :--------------: | :--------: | :--------: |
| `COMPLETED` | Has both AI data and LLM explanation   |     `string`     |  `string`  |  ❌ (409)  |
| `PARTIAL`   | Has AI data but LLM explanation failed |      `null`      |   `null`   |     ✅     |

---

## 8. AI + LLM Behavior

### AI Service

- Returns structured JSON with: `match_context`, `players_analysis`, `trainingPlan`
- The `trainingPlan` field may contain an error object from the AI's internal LLM:

```json
{
  "trainingPlan": {
    "error": "LLM API failed: 403 PERMISSION_DENIED."
  }
}
```

This is a known AI-side issue and is tolerated — the error object is stored as-is in `rawAnalysis`.

### LLM Service

- Uses a fallback chain: Gemini (up to 3 API keys) → Groq
- If ALL adapters fail, the report is saved with status `PARTIAL`
- The user can later call `POST /reports/:id/explain` to retry
- The LLM never throws to the caller — it returns `null` on total failure

### What the Frontend Should Know

- `rawAnalysis` always contains the AI data (even for PARTIAL reports)
- `llmExplanation` is the human-readable version of that data
- If `llmExplanation` is `null`, display the raw data or show a "retry" button

---

## 9. Important Notes for Frontend

### Response Timing

The `POST /analyze` endpoint may take **up to 60 seconds** on the first call for a match (AI service cold start on HuggingFace). Subsequent calls for the same match return instantly from cache. Show a loading indicator.

### The `cached` Flag

|  Value  | Meaning                                             |
| :-----: | --------------------------------------------------- |
| `true`  | Report was returned from cache (instant)            |
| `false` | Report was freshly generated (AI + LLM were called) |

### Partial Reports

If `status === "PARTIAL"`:

- `llmExplanation` and `llmModel` will be `null`
- The raw AI data is still available in `rawAnalysis`
- Show a "Retry Explanation" button that calls `POST /reports/:id/explain`

### Retry Behavior

- Can only retry `PARTIAL` reports → attempting on `COMPLETED` returns 409
- Retry only re-runs the LLM, NOT the AI analysis
- If the LLM fails again, the endpoint returns 502

### Pagination

- Default: page 1, 10 items per page
- Maximum: 50 items per page
- Reports are sorted by `createdAt` descending (newest first)

### IDs

- All report IDs are UUIDs
- `eventId` and `teamId` are SofaScore string identifiers (not UUIDs)

---

## 10. Quick Reference

| Action            | Method | Endpoint                          | Body |
| ----------------- | :----: | --------------------------------- | :--: |
| Analyze a match   | `POST` | `/post-match/analyze`             |  ✅  |
| List my reports   | `GET`  | `/post-match/reports`             |  ❌  |
| Get a report      | `GET`  | `/post-match/reports/:id`         |  ❌  |
| Retry explanation | `POST` | `/post-match/reports/:id/explain` |  ❌  |
